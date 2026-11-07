import { daysBetween, fromISO, monthKey, toISO } from './dates';
import { SERIES } from './palette';
import type { Data, Purchase, Sale } from './types';

/* ---------- Períodos ---------- */

export type PeriodKey = 'mes' | 'mes-passado' | '3m' | '6m' | 'ano' | 'tudo';

export interface Period {
  key: PeriodKey;
  from: string;
  to: string;
  label: string;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'mes', label: 'Este mês' },
  { key: 'mes-passado', label: 'Mês passado' },
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
  { key: 'ano', label: 'Este ano' },
  { key: 'tudo', label: 'Tudo' },
];

export function getPeriod(key: PeriodKey, today = new Date()): Period {
  const y = today.getFullYear();
  const m = today.getMonth();
  const first = (yy: number, mm: number) => toISO(new Date(yy, mm, 1));
  const last = (yy: number, mm: number) => toISO(new Date(yy, mm + 1, 0));
  const label = PERIOD_OPTIONS.find((o) => o.key === key)!.label;
  switch (key) {
    case 'mes':
      return { key, label, from: first(y, m), to: last(y, m) };
    case 'mes-passado':
      return { key, label, from: first(y, m - 1), to: last(y, m - 1) };
    case '3m':
      return { key, label, from: first(y, m - 2), to: last(y, m) };
    case '6m':
      return { key, label, from: first(y, m - 5), to: last(y, m) };
    case 'ano':
      return { key, label, from: `${y}-01-01`, to: `${y}-12-31` };
    case 'tudo':
      return { key, label, from: '0000-01-01', to: '9999-12-31' };
  }
}

export const inPeriod = (date: string, p: { from: string; to: string }): boolean => date >= p.from && date <= p.to;

/* ---------- Custos, estoque e vendas ---------- */

export const purchaseGoods = (p: Purchase): number => p.qty * p.unitCost;
export const purchaseTotal = (p: Purchase): number => purchaseGoods(p) + p.shipping + p.taxes;
export const purchaseUnitCost = (p: Purchase): number => (p.qty > 0 ? purchaseTotal(p) / p.qty : 0);

/** Custo real médio por unidade (produto + frete + imposto), ponderado por todos os lotes. */
export function avgCostMap(purchases: Purchase[]): Map<string, number> {
  const acc = new Map<string, { total: number; qty: number }>();
  for (const p of purchases) {
    const a = acc.get(p.productId) ?? { total: 0, qty: 0 };
    a.total += purchaseTotal(p);
    a.qty += p.qty;
    acc.set(p.productId, a);
  }
  const out = new Map<string, number>();
  for (const [id, a] of acc) out.set(id, a.qty > 0 ? a.total / a.qty : 0);
  return out;
}

export function stockMap(purchases: Purchase[], sales: Sale[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of purchases) out.set(p.productId, (out.get(p.productId) ?? 0) + p.qty);
  for (const s of sales) out.set(s.productId, (out.get(s.productId) ?? 0) - s.qty);
  return out;
}

export const saleRevenue = (s: Sale): number => s.qty * s.unitPrice;
export const saleProfit = (s: Sale, avgCost: number): number =>
  saleRevenue(s) - s.fee - s.deliveryCost - s.qty * avgCost;

/** ICMS "por dentro": imposto que, somado à base, resulta na alíquota sobre o total. */
export const icmsFor = (base: number, pct: number): number =>
  pct <= 0 || pct >= 100 ? 0 : (base * (pct / 100)) / (1 - pct / 100);

/* ---------- Resumo do período ---------- */

export interface Summary {
  revenue: number;
  cogs: number;
  saleCosts: number;
  grossProfit: number;
  opExpenses: number;
  withdrawals: number;
  netProfit: number;
  margin: number;
  salesCount: number;
  unitsSold: number;
  avgTicket: number;
  purchaseGoods: number;
  purchaseShipping: number;
  purchaseTaxes: number;
  cashIn: number;
  cashOut: number;
}

export function summarize(data: Data, period: { from: string; to: string }): Summary {
  const avg = avgCostMap(data.purchases);
  const sales = data.sales.filter((s) => inPeriod(s.date, period));
  const revenue = sum(sales.map(saleRevenue));
  const cogs = sum(sales.map((s) => s.qty * (avg.get(s.productId) ?? 0)));
  const saleCosts = sum(sales.map((s) => s.fee + s.deliveryCost));

  const withdrawIds = new Set(data.settings.categories.filter((c) => c.kind === 'retirada').map((c) => c.id));
  const expenses = data.expenses.filter((e) => inPeriod(e.date, period));
  const withdrawals = sum(expenses.filter((e) => withdrawIds.has(e.categoryId)).map((e) => e.amount));
  const opExpenses = sum(expenses.filter((e) => !withdrawIds.has(e.categoryId)).map((e) => e.amount));

  const purchases = data.purchases.filter((p) => inPeriod(p.date, period));
  const goods = sum(purchases.map(purchaseGoods));
  const shipping = sum(purchases.map((p) => p.shipping));
  const taxes = sum(purchases.map((p) => p.taxes));

  const grossProfit = revenue - cogs - saleCosts;
  const netProfit = grossProfit - opExpenses;
  const unitsSold = sum(sales.map((s) => s.qty));

  return {
    revenue,
    cogs,
    saleCosts,
    grossProfit,
    opExpenses,
    withdrawals,
    netProfit,
    margin: revenue > 0 ? netProfit / revenue : 0,
    salesCount: sales.length,
    unitsSold,
    avgTicket: sales.length ? revenue / sales.length : 0,
    purchaseGoods: goods,
    purchaseShipping: shipping,
    purchaseTaxes: taxes,
    cashIn: revenue,
    cashOut: goods + shipping + taxes + saleCosts + opExpenses + withdrawals,
  };
}

/* ---------- Para onde foi o dinheiro ---------- */

export interface FlowItem {
  key: string;
  label: string;
  amount: number;
  color: string;
}

/** Todas as saídas de caixa do período, em ordem fixa (a cor segue a categoria, nunca a posição). */
export function moneyFlow(data: Data, period: { from: string; to: string }): FlowItem[] {
  const s = summarize(data, period);
  const expenses = data.expenses.filter((e) => inPeriod(e.date, period));
  const items: FlowItem[] = [
    { key: 'mercadoria', label: 'Mercadoria', amount: s.purchaseGoods, color: SERIES[0] },
    { key: 'frete', label: 'Frete das compras', amount: s.purchaseShipping, color: SERIES[1] },
    { key: 'venda', label: 'Entregas e taxas de venda', amount: s.saleCosts, color: SERIES[2] },
    { key: 'impostos', label: 'Impostos (ICMS)', amount: s.purchaseTaxes, color: SERIES[3] },
    ...data.settings.categories.map((c) => ({
      key: c.id,
      label: c.name,
      color: c.color,
      amount: sum(expenses.filter((e) => e.categoryId === c.id).map((e) => e.amount)),
    })),
  ];
  return items.filter((i) => i.amount > 0.004);
}

/* ---------- Série mensal ---------- */

export interface MonthPoint {
  month: string;
  revenue: number;
  netProfit: number;
  cashOut: number;
}

export function monthlySeries(data: Data, refISO: string, months: number): MonthPoint[] {
  const ref = fromISO(refISO);
  const out: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const from = toISO(new Date(ref.getFullYear(), ref.getMonth() - i, 1));
    const to = toISO(new Date(ref.getFullYear(), ref.getMonth() - i + 1, 0));
    const s = summarize(data, { from, to });
    out.push({ month: monthKey(from), revenue: s.revenue, netProfit: s.netProfit, cashOut: s.cashOut });
  }
  return out;
}

/* ---------- Visão por produto ---------- */

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  salePrice: number;
  archived: boolean;
  stock: number;
  avgCost: number;
  unitProfit: number;
  unitMargin: number;
  stockValue: number;
  stockSaleValue: number;
  soldQty: number;
  revenue: number;
  profit: number;
  lastSale: string | null;
  daysStalled: number | null;
  stalled: boolean;
  /** Desde sempre: compras + gastos extras do produto. */
  invested: number;
  /** Desde sempre: vendas menos entrega e taxas. */
  recovered: number;
}

export function productRows(data: Data, period: { from: string; to: string }, todayIso: string): ProductRow[] {
  const avg = avgCostMap(data.purchases);
  const stock = stockMap(data.purchases, data.sales);
  return data.products.map((p) => {
    const cost = avg.get(p.id) ?? 0;
    const st = stock.get(p.id) ?? 0;
    const allSales = data.sales.filter((s) => s.productId === p.id);
    const periodSales = allSales.filter((s) => inPeriod(s.date, period));
    const lastSale = maxDate(allSales.map((s) => s.date));
    const lastPurchase = maxDate(data.purchases.filter((x) => x.productId === p.id).map((x) => x.date));
    const since = lastSale ?? lastPurchase;
    const daysStalled = st > 0 && since ? Math.max(0, daysBetween(since, todayIso)) : null;
    const unitProfit = p.salePrice - cost;
    const invested =
      sum(data.purchases.filter((x) => x.productId === p.id).map(purchaseTotal)) +
      sum(data.expenses.filter((e) => e.productId === p.id).map((e) => e.amount));
    const recovered = sum(allSales.map((s) => saleRevenue(s) - s.fee - s.deliveryCost));
    return {
      invested,
      recovered,
      id: p.id,
      name: p.name,
      category: p.category,
      salePrice: p.salePrice,
      archived: p.archived,
      stock: st,
      avgCost: cost,
      unitProfit,
      unitMargin: p.salePrice > 0 ? unitProfit / p.salePrice : 0,
      stockValue: Math.max(0, st) * cost,
      stockSaleValue: Math.max(0, st) * p.salePrice,
      soldQty: sum(periodSales.map((s) => s.qty)),
      revenue: sum(periodSales.map(saleRevenue)),
      profit: sum(periodSales.map((s) => saleProfit(s, cost))),
      lastSale,
      daysStalled,
      stalled: daysStalled !== null && daysStalled >= data.settings.stalledDays,
    };
  });
}

/* ---------- Histórico de um produto ---------- */

/** Tudo que entrou e saiu por causa de um produto, desde sempre. */
export function productLedger(data: Data, productId: string) {
  const avg = avgCostMap(data.purchases).get(productId) ?? 0;
  const byDateDesc = <T extends { date: string }>(a: T, b: T) => (a.date < b.date ? 1 : -1);
  const purchases = data.purchases.filter((p) => p.productId === productId).sort(byDateDesc);
  const sales = data.sales.filter((s) => s.productId === productId).sort(byDateDesc);
  const extras = data.expenses.filter((e) => e.productId === productId).sort(byDateDesc);

  const bought = sum(purchases.map(purchaseTotal));
  const extrasTotal = sum(extras.map((e) => e.amount));
  const revenue = sum(sales.map(saleRevenue));
  const saleCosts = sum(sales.map((s) => s.fee + s.deliveryCost));
  const cogs = sum(sales.map((s) => s.qty * avg));
  const stock = sum(purchases.map((p) => p.qty)) - sum(sales.map((s) => s.qty));
  const invested = bought + extrasTotal;
  const recovered = revenue - saleCosts;

  return {
    purchases,
    sales,
    extras,
    avgCost: avg,
    bought,
    extrasTotal,
    invested,
    revenue,
    recovered,
    /** Dinheiro que já voltou menos tudo que você colocou no produto. */
    balance: recovered - invested,
    /** Lucro das unidades vendidas, já descontando os gastos extras do produto. */
    profit: revenue - saleCosts - cogs - extrasTotal,
    stock,
    stockValue: Math.max(0, stock) * avg,
    unitsSold: sum(sales.map((s) => s.qty)),
  };
}

/* ---------- Preço ---------- */

export interface PriceInput {
  unitCost: number;
  perSaleCost: number;
  feePct: number;
}

/** Preço que entrega a margem líquida desejada depois de taxa, entrega e custo. */
export function suggestPrice(i: PriceInput & { marginPct: number }): number | null {
  const d = 1 - i.feePct / 100 - i.marginPct / 100;
  if (d <= 0) return null;
  return (i.unitCost + i.perSaleCost) / d;
}

export function priceOutcome(i: PriceInput & { price: number }) {
  const fee = (i.price * i.feePct) / 100;
  const profit = i.price - fee - i.unitCost - i.perSaleCost;
  return {
    fee,
    profit,
    margin: i.price > 0 ? profit / i.price : 0,
    markup: i.unitCost > 0 ? i.price / i.unitCost : 0,
  };
}

/* ---------- util ---------- */

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const maxDate = (xs: string[]): string | null => (xs.length ? xs.reduce((a, b) => (a > b ? a : b)) : null);
