import { inPeriod, monthlySeries, stockMap, sum, summarize, type MonthPoint, type Summary } from './calc';
import { addDays, daysBetween, monthKey, toISO } from './dates';
import type { Data, MonthGoal } from './types';

/* ---------- Meses ---------- */

export const monthRange = (mk: string) => {
  const [y, m] = mk.split('-').map(Number);
  return { from: toISO(new Date(y, m - 1, 1)), to: toISO(new Date(y, m, 0)) };
};

export const shiftMonth = (mk: string, n: number): string => {
  const [y, m] = mk.split('-').map(Number);
  return monthKey(toISO(new Date(y, m - 1 + n, 1)));
};

/* ---------- Metas ---------- */

export function goalsFor(data: Data, mk: string): MonthGoal & { custom: boolean } {
  const g = data.goals.find((x) => x.month === mk);
  if (g) return { ...g, custom: true };
  const s = data.settings;
  return { id: mk, month: mk, profit: s.monthlyProfitGoal, revenue: s.monthlyRevenueGoal, sales: s.monthlySalesGoal, salary: s.desiredSalary, custom: false };
}

/* ---------- Números médios do negócio ---------- */

export interface UnitEconomics {
  /** Lucro médio por venda (já tirando mercadoria, entrega e taxa). */
  profitPerSale: number;
  /** Vendas por mês no ritmo atual. */
  salesPerMonth: number;
  /** Gastos operacionais (sem retirada) por mês. */
  fixedPerMonth: number;
  /** Dias de histórico usados na média. */
  basisDays: number;
}

/** Médias dos últimos 90 dias (ou desde o início, se o negócio for mais novo). */
export function unitEconomics(data: Data, todayIso: string): UnitEconomics {
  const first = firstActivity(data);
  const span = first ? Math.max(1, Math.min(90, daysBetween(first, todayIso) + 1)) : 1;
  const from = addDays(todayIso, -(span - 1));
  const s = summarize(data, { from, to: todayIso });
  return {
    profitPerSale: s.salesCount ? s.grossProfit / s.salesCount : 0,
    salesPerMonth: (s.salesCount / span) * 30,
    fixedPerMonth: (s.opExpenses / span) * 30,
    basisDays: span,
  };
}

/** Vendas por mês para cobrir gastos fixos + salário. null se ainda não há lucro por venda. */
export function salesNeeded(econ: Pick<UnitEconomics, 'profitPerSale' | 'fixedPerMonth'>, salary: number): number | null {
  if (econ.profitPerSale <= 0) return null;
  return Math.ceil((econ.fixedPerMonth + salary) / econ.profitPerSale);
}

/* ---------- Projeção do mês atual ---------- */

export interface MonthProjection {
  month: string;
  daysInMonth: number;
  elapsed: number;
  daysLeft: number;
  actual: Summary;
  projected: { revenue: number; netProfit: number; sales: number };
  goals: MonthGoal & { custom: boolean };
  remainingProfit: number;
  salesToGoal: number | null;
  perDay: number;
  econ: UnitEconomics;
}

export function monthProjection(data: Data, todayIso: string): MonthProjection {
  const mk = monthKey(todayIso);
  const range = monthRange(mk);
  const daysInMonth = Number(range.to.slice(8));
  const elapsed = Number(todayIso.slice(8));
  const daysLeft = daysInMonth - elapsed;
  const actual = summarize(data, { from: range.from, to: todayIso });
  const econ = unitEconomics(data, todayIso);
  const f = daysInMonth / Math.max(1, elapsed);

  // Vendas seguem o ritmo; gastos fixos usam o maior entre o que já saiu e a média mensal.
  const projGross = actual.grossProfit * f;
  const projOp = Math.max(actual.opExpenses, econ.fixedPerMonth);
  const goals = goalsFor(data, mk);
  const remainingProfit = Math.max(0, goals.profit - actual.netProfit);

  return {
    month: mk,
    daysInMonth,
    elapsed,
    daysLeft,
    actual,
    projected: { revenue: actual.revenue * f, netProfit: projGross - projOp, sales: actual.salesCount * f },
    goals,
    remainingProfit,
    salesToGoal: econ.profitPerSale > 0 ? Math.ceil(remainingProfit / econ.profitPerSale) : null,
    perDay: daysLeft > 0 ? remainingProfit / daysLeft : remainingProfit,
    econ,
  };
}

/* ---------- Previsão dos próximos meses ---------- */

export interface ForecastPoint extends MonthPoint {
  projected?: boolean;
  partial?: boolean;
}

/**
 * Meses passados (reais) + próximos meses (projeção por tendência linear
 * dos meses completos desde a primeira venda, até 6 meses).
 */
export function forecast(data: Data, todayIso: string, back: number, ahead: number): ForecastPoint[] {
  const cur = monthKey(todayIso);
  const history: ForecastPoint[] = monthlySeries(data, todayIso, back).map((m) => ({ ...m, partial: m.month === cur }));

  const firstSale = data.sales.reduce<string | null>((a, s) => (a === null || s.date < a ? s.date : a), null);
  const complete: { x: number; revenue: number; netProfit: number }[] = [];
  if (firstSale) {
    for (let i = 6; i >= 1; i--) {
      const mk = shiftMonth(cur, -i);
      if (mk < monthKey(firstSale)) continue;
      const s = summarize(data, monthRange(mk));
      complete.push({ x: -i, revenue: s.revenue, netProfit: s.netProfit });
    }
  }

  let rev: (x: number) => number;
  let prof: (x: number) => number;
  if (complete.length >= 2) {
    rev = linear(complete.map((c) => [c.x, c.revenue]));
    prof = linear(complete.map((c) => [c.x, c.netProfit]));
  } else {
    const p = monthProjection(data, todayIso);
    const r0 = complete[0]?.revenue ?? p.projected.revenue;
    const p0 = complete[0]?.netProfit ?? p.projected.netProfit;
    rev = () => r0;
    prof = () => p0;
  }

  const future: ForecastPoint[] = [];
  for (let i = 1; i <= ahead; i++) {
    future.push({ month: shiftMonth(cur, i), revenue: Math.max(0, rev(i)), netProfit: prof(i), cashOut: 0, projected: true });
  }
  return [...history, ...future];
}

function linear(points: [number, number][]): (x: number) => number {
  const n = points.length;
  const mx = sum(points.map((p) => p[0])) / n;
  const my = sum(points.map((p) => p[1])) / n;
  const sxx = sum(points.map((p) => (p[0] - mx) ** 2));
  const sxy = sum(points.map((p) => (p[0] - mx) * (p[1] - my)));
  const slope = sxx ? sxy / sxx : 0;
  return (x) => my + slope * (x - mx);
}

/* ---------- Quando recomprar ---------- */

export interface RestockRow {
  id: string;
  name: string;
  stock: number;
  perDay: number;
  daysLeft: number;
  reorderBy: string;
  status: 'agora' | 'breve' | 'ok';
}

/** Ritmo de venda dos últimos 60 dias → quando o estoque acaba e até quando recomprar. */
export function restockPlan(data: Data, todayIso: string): RestockRow[] {
  const lead = data.settings.supplierLeadDays;
  const stock = stockMap(data.purchases, data.sales);
  const rows: RestockRow[] = [];
  for (const p of data.products) {
    if (p.archived) continue;
    const dates = [...data.purchases.filter((x) => x.productId === p.id), ...data.sales.filter((x) => x.productId === p.id)].map((x) => x.date);
    if (!dates.length) continue;
    const first = dates.reduce((a, b) => (a < b ? a : b));
    const span = Math.max(1, Math.min(60, daysBetween(first, todayIso) + 1));
    const window = { from: addDays(todayIso, -(span - 1)), to: todayIso };
    const sold = sum(data.sales.filter((s) => s.productId === p.id && inPeriod(s.date, window)).map((s) => s.qty));
    if (sold <= 0) continue;
    const perDay = sold / span;
    const st = Math.max(0, stock.get(p.id) ?? 0);
    const daysLeft = st / perDay;
    const untilReorder = Math.floor(daysLeft - lead);
    rows.push({
      id: p.id,
      name: p.name,
      stock: st,
      perDay,
      daysLeft,
      reorderBy: addDays(todayIso, untilReorder),
      status: untilReorder <= 0 ? 'agora' : untilReorder <= 14 ? 'breve' : 'ok',
    });
  }
  return rows.sort((a, b) => a.daysLeft - b.daysLeft);
}

/* ---------- util ---------- */

function firstActivity(data: Data): string | null {
  const all = [...data.purchases, ...data.sales, ...data.expenses].map((x) => x.date);
  return all.length ? all.reduce((a, b) => (a < b ? a : b)) : null;
}
