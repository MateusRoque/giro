import { describe, expect, it } from 'vitest';
import { productLedger } from './calc';
import { defaultSettings } from './defaults';
import { forecast, goalsFor, monthProjection, restockPlan, salesNeeded, unitEconomics } from './projections';
import type { Data, Expense, Purchase, Sale } from './types';

const settings = { ...defaultSettings(), monthlyProfitGoal: 1000, supplierLeadDays: 20 };

const buy = (date: string, qty: number, unitCost: number, productId = 'p1'): Purchase => ({
  id: `c-${date}-${productId}-${qty}`, productId, date, qty, unitCost, shipping: 0, taxes: 0, supplier: '', notes: '',
});
const sell = (date: string, unitPrice: number, productId = 'p1'): Sale => ({
  id: `v-${date}-${unitPrice}-${Math.random()}`, productId, date, qty: 1, unitPrice, deliveryCost: 0, fee: 0, channel: '', customer: '', notes: '',
});
const exp = (date: string, amount: number, productId?: string): Expense => ({
  id: `g-${date}-${amount}`, date, categoryId: 'cat-anuncios', description: '', amount, productId,
});

const base = (patch: Partial<Data>): Data => ({
  version: 1,
  settings,
  products: [{ id: 'p1', name: 'Furadeira', category: '', supplier: '', link: '', salePrice: 100, notes: '', createdAt: '2026-08-01', archived: false }],
  purchases: [],
  sales: [],
  expenses: [],
  goals: [],
  ...patch,
});

describe('metas', () => {
  it('usa a meta do mês quando existe, senão o padrão', () => {
    const d = base({ goals: [{ id: '2026-11', month: '2026-11', profit: 3000, revenue: 0, sales: 0, salary: 0 }] });
    expect(goalsFor(d, '2026-11').profit).toBe(3000);
    expect(goalsFor(d, '2026-11').custom).toBe(true);
    expect(goalsFor(d, '2026-12').profit).toBe(1000);
  });
});

describe('projeção do mês', () => {
  // custo 40, venda 100 => lucro 60 por venda
  const d = base({
    purchases: [buy('2026-10-01', 20, 40)],
    sales: [sell('2026-11-02', 100), sell('2026-11-04', 100), sell('2026-11-09', 100)],
  });
  const p = monthProjection(d, '2026-11-10');

  it('projeta pelo ritmo dos dias passados', () => {
    expect(p.daysInMonth).toBe(30);
    expect(p.daysLeft).toBe(20);
    expect(p.actual.netProfit).toBe(180);
    expect(p.projected.netProfit).toBeCloseTo(540, 5); // 180 / 10 * 30
    expect(p.projected.sales).toBeCloseTo(9, 5);
  });

  it('diz quanto falta e quantas vendas', () => {
    expect(p.remainingProfit).toBe(820);
    expect(p.econ.profitPerSale).toBe(60);
    expect(p.salesToGoal).toBe(14); // 820 / 60 = 13,7
    expect(p.perDay).toBeCloseTo(41, 5);
  });
});

describe('viver da revenda', () => {
  it('calcula vendas por mês para cobrir gastos fixos e salário', () => {
    const d = base({
      purchases: [buy('2026-08-01', 50, 40)],
      sales: [sell('2026-10-15', 100)],
      expenses: [exp('2026-10-01', 300)],
    });
    const econ = unitEconomics(d, '2026-10-30');
    expect(econ.profitPerSale).toBe(60);
    expect(econ.fixedPerMonth).toBeGreaterThan(0);
    expect(salesNeeded({ ...econ, fixedPerMonth: 300 }, 1500)).toBe(30); // 1800 / 60
    expect(salesNeeded({ ...econ, profitPerSale: 0 }, 1500)).toBeNull();
  });
});

describe('previsão dos próximos meses', () => {
  it('marca meses futuros como projeção e segue a tendência', () => {
    const d = base({
      purchases: [buy('2026-07-01', 100, 40)],
      sales: [
        sell('2026-08-10', 100),
        sell('2026-09-10', 100), sell('2026-09-11', 100),
        sell('2026-10-10', 100), sell('2026-10-11', 100), sell('2026-10-12', 100),
      ],
    });
    const f = forecast(d, '2026-11-01', 3, 3);
    expect(f.filter((m) => m.projected).map((m) => m.month)).toEqual(['2026-12', '2027-01', '2027-02']);
    const dec = f.find((m) => m.month === '2026-12')!;
    const jan = f.find((m) => m.month === '2027-01')!;
    expect(jan.revenue).toBeGreaterThan(dec.revenue);
    expect(dec.revenue).toBeGreaterThan(0);
  });
});

describe('quando recomprar', () => {
  it('avisa para recomprar quando o estoque acaba antes do prazo de entrega', () => {
    const d = base({
      purchases: [buy('2026-10-01', 12, 40)],
      // 6 vendas em 30 dias => 0,2/dia; estoque 6 => acaba em 30 dias
      sales: ['2026-10-05', '2026-10-10', '2026-10-15', '2026-10-20', '2026-10-25', '2026-10-30'].map((x) => sell(x, 100)),
    });
    const [r] = restockPlan(d, '2026-10-30');
    expect(r.stock).toBe(6);
    expect(r.perDay).toBeCloseTo(0.2, 5);
    expect(r.daysLeft).toBeCloseTo(30, 5);
    expect(r.reorderBy).toBe('2026-11-09'); // 30 dias - 20 de prazo
    expect(r.status).toBe('breve');
  });

  it('ignora produto que nunca vendeu', () => {
    expect(restockPlan(base({ purchases: [buy('2026-10-01', 5, 40)] }), '2026-10-30')).toEqual([]);
  });
});

describe('histórico do produto', () => {
  it('soma investido (compras + gastos extras) e recuperado', () => {
    const d = base({
      purchases: [buy('2026-10-01', 3, 40)],
      sales: [sell('2026-10-05', 100), { ...sell('2026-10-06', 100), deliveryCost: 5 }],
      expenses: [exp('2026-10-02', 15, 'p1'), exp('2026-10-03', 50)],
    });
    const l = productLedger(d, 'p1');
    expect(l.invested).toBe(135);
    expect(l.recovered).toBe(195);
    expect(l.balance).toBe(60);
    expect(l.profit).toBe(200 - 5 - 80 - 15);
    expect(l.stock).toBe(1);
    expect(l.extras.length).toBe(1);
  });
});
