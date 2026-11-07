export type ID = string;

/** 'operacional' reduz o lucro; 'retirada' é dinheiro que você tira para viver (não reduz o lucro do negócio). */
export type ExpenseKind = 'operacional' | 'retirada';

export interface ExpenseCategory {
  id: ID;
  name: string;
  color: string;
  kind: ExpenseKind;
}

export interface Settings {
  businessName: string;
  /** ICMS sobre importação, em % (RS: 17). */
  icmsPct: number;
  /** Margem líquida desejada, em %. Usada para sugerir preço. */
  targetMarginPct: number;
  /** Dias sem vender para um produto ser considerado parado. */
  stalledDays: number;
  /** Metas padrão de cada mês (cada mês pode ter a sua em Data.goals). */
  monthlyProfitGoal: number;
  monthlyRevenueGoal: number;
  monthlySalesGoal: number;
  /** Quanto você quer tirar por mês para viver. */
  desiredSalary: number;
  /** Dias que uma compra leva para chegar do fornecedor. */
  supplierLeadDays: number;
  /** Custo médio de entrega por venda (combustível, embalagem), em R$. */
  defaultDeliveryCost: number;
  /** Taxa média por venda (maquininha, plataforma), em %. */
  defaultFeePct: number;
  categories: ExpenseCategory[];
  productCategories: string[];
  channels: string[];
}

export interface Product {
  id: ID;
  name: string;
  category: string;
  supplier: string;
  link: string;
  salePrice: number;
  notes: string;
  createdAt: string;
  archived: boolean;
}

/** Um lote comprado de um fornecedor. */
export interface Purchase {
  id: ID;
  productId: ID;
  date: string;
  qty: number;
  /** Preço pago por unidade, sem frete e sem imposto. */
  unitCost: number;
  /** Frete total do lote. */
  shipping: number;
  /** Impostos totais do lote (ICMS). */
  taxes: number;
  supplier: string;
  notes: string;
}

export interface Sale {
  id: ID;
  productId: ID;
  date: string;
  qty: number;
  unitPrice: number;
  /** Custo para entregar esta venda (combustível, embalagem). */
  deliveryCost: number;
  /** Taxas desta venda em R$ (maquininha, plataforma). */
  fee: number;
  channel: string;
  customer: string;
  notes: string;
}

export interface Expense {
  id: ID;
  date: string;
  categoryId: ID;
  description: string;
  amount: number;
  /** Gasto extra ligado a um produto (bateria extra, anúncio só dele...). */
  productId?: ID;
}

/** Meta específica de um mês. id = mês ('AAAA-MM'). */
export interface MonthGoal {
  id: string;
  month: string;
  profit: number;
  revenue: number;
  sales: number;
  salary: number;
}

export interface Data {
  version: 1;
  /** Momento (ms) da última alteração. Usado para sincronizar aparelhos. */
  updatedAt?: number;
  settings: Settings;
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  goals: MonthGoal[];
}

export type Collection = 'products' | 'purchases' | 'sales' | 'expenses' | 'goals';
