import { describe, expect, it } from 'vitest';
import {
  avgCostMap,
  getPeriod,
  icmsFor,
  moneyFlow,
  monthlySeries,
  priceOutcome,
  productRows,
  purchaseUnitCost,
  stockMap,
  suggestPrice,
  summarize,
} from './calc';
import { defaultSettings } from './defaults';
import type { Data, Purchase, Sale } from './types';

const settings = defaultSettings();
const retiradaId = settings.categories.find((c) => c.kind === 'retirada')!.id;
const anunciosId = settings.categories.find((c) => c.kind === 'operacional')!.id;

const purchase = (p: Partial<Purchase>): Purchase => ({
  id: Math.random().toString(),
  productId: 'p1',
  date: '2026-11-01',
  qty: 1,
  unitCost: 0,
  shipping: 0,
  taxes: 0,
  supplier: '',
  notes: '',
  ...p,
});

const sale = (s: Partial<Sale>): Sale => ({
  id: Math.random().toString(),
  productId: 'p1',
  date: '2026-11-10',
  qty: 1,
  unitPrice: 0,
  deliveryCost: 0,
  fee: 0,
  channel: 'Marketplace',
  customer: '',
  notes: '',
  ...s,
});

const data = (patch: Partial<Data>): Data => ({
  version: 1,
  settings,
  products: [
    {
      id: 'p1',
      name: 'Parafusadeira',
      category: 'Ferramentas',
      supplier: '',
      link: '',
      salePrice: 119,
      notes: '',
      createdAt: '2026-09-01',
      archived: false,
    },
  ],
  purchases: [],
  sales: [],
  expenses: [],
  goals: [],
  ...patch,
});

const nov = getPeriod('mes', new Date(2026, 10, 15));

describe('custo real', () => {
  it('rateia frete e imposto pelo lote', () => {
    expect(purchaseUnitCost(purchase({ qty: 4, unitCost: 39, shipping: 20, taxes: 16 }))).toBe(48);
  });

  it('faz média ponderada entre lotes', () => {
    const avg = avgCostMap([
      purchase({ qty: 2, unitCost: 40 }), // 80
      purchase({ qty: 3, unitCost: 50 }), // 150
    ]);
    expect(avg.get('p1')).toBe(46);
  });

  it('calcula estoque como comprado menos vendido', () => {
    const stock = stockMap([purchase({ qty: 5 })], [sale({ qty: 2 })]);
    expect(stock.get('p1')).toBe(3);
  });
});

describe('ICMS por dentro', () => {
  it('17% sobre R$ 83 vira R$ 17', () => {
    expect(icmsFor(83, 17)).toBeCloseTo(17, 5);
  });
  it('não quebra com alíquota inválida', () => {
    expect(icmsFor(100, 100)).toBe(0);
  });
});

describe('resumo do período', () => {
  const d = data({
    purchases: [purchase({ qty: 2, unitCost: 39, shipping: 12, taxes: 0, date: '2026-11-01' })], // custo real 45
    sales: [
      sale({ unitPrice: 119, deliveryCost: 5, fee: 0, date: '2026-11-10' }),
      sale({ unitPrice: 119, date: '2026-10-10' }), // fora do período
    ],
    expenses: [
      { id: 'e1', date: '2026-11-05', categoryId: anunciosId, description: '', amount: 20 },
      { id: 'e2', date: '2026-11-06', categoryId: retiradaId, description: '', amount: 300 },
    ],
  });
  const s = summarize(d, nov);

  it('separa faturamento, custo da mercadoria e lucro', () => {
    expect(s.revenue).toBe(119);
    expect(s.cogs).toBe(45);
    expect(s.grossProfit).toBe(119 - 45 - 5);
    expect(s.netProfit).toBe(119 - 45 - 5 - 20);
    expect(s.margin).toBeCloseTo(49 / 119, 6);
  });

  it('retirada não reduz o lucro, mas sai do caixa', () => {
    expect(s.withdrawals).toBe(300);
    // mercadoria 78 + frete 12 + entrega 5 + anúncio 20 + retirada 300
    expect(s.cashOut).toBe(415);
    expect(s.cashIn - s.cashOut).toBe(119 - 415);
  });

  it('mostra para onde foi o dinheiro, sem itens zerados', () => {
    const flow = moneyFlow(d, nov);
    const labels = flow.map((f) => f.label);
    expect(labels).toContain('Mercadoria');
    expect(labels).toContain('Frete das compras');
    expect(labels).not.toContain('Impostos (ICMS)');
    expect(flow.reduce((a, f) => a + f.amount, 0)).toBe(s.cashOut);
  });
});

describe('série mensal', () => {
  it('devolve N meses terminando no mês de referência', () => {
    const series = monthlySeries(data({ sales: [sale({ unitPrice: 50, date: '2026-11-03' })] }), '2026-11-20', 3);
    expect(series.map((m) => m.month)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(series[2].revenue).toBe(50);
  });
});

describe('produtos', () => {
  it('marca como parado quem tem estoque e não vende há X dias', () => {
    const rows = productRows(
      data({ purchases: [purchase({ qty: 3, unitCost: 10, date: '2026-09-01' })] }),
      nov,
      '2026-11-15',
    );
    expect(rows[0].stock).toBe(3);
    expect(rows[0].daysStalled).toBe(75);
    expect(rows[0].stalled).toBe(true);
    expect(rows[0].stockValue).toBe(30);
  });
});

describe('preço', () => {
  it('sugere preço que garante a margem desejada', () => {
    const price = suggestPrice({ unitCost: 45, perSaleCost: 5, feePct: 0, marginPct: 50 })!;
    expect(price).toBe(100);
    const out = priceOutcome({ price, unitCost: 45, perSaleCost: 5, feePct: 0 });
    expect(out.profit).toBe(50);
    expect(out.margin).toBe(0.5);
  });

  it('recusa margem impossível', () => {
    expect(suggestPrice({ unitCost: 10, perSaleCost: 0, feePct: 10, marginPct: 95 })).toBeNull();
  });
});
