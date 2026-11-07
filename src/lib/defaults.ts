import { NEUTRAL, SERIES } from './palette';
import type { Data, Settings } from './types';

export const defaultSettings = (): Settings => ({
  businessName: 'Minha revenda',
  icmsPct: 17,
  targetMarginPct: 45,
  stalledDays: 30,
  monthlyProfitGoal: 2000,
  monthlyRevenueGoal: 4000,
  monthlySalesGoal: 40,
  desiredSalary: 1500,
  supplierLeadDays: 20,
  defaultDeliveryCost: 5,
  defaultFeePct: 0,
  categories: [
    { id: 'cat-anuncios', name: 'Anúncios impulsionados', color: SERIES[4], kind: 'operacional' },
    { id: 'cat-transporte', name: 'Combustível e transporte', color: SERIES[5], kind: 'operacional' },
    { id: 'cat-embalagem', name: 'Embalagens', color: SERIES[6], kind: 'operacional' },
    { id: 'cat-fixos', name: 'Internet, celular e apps', color: SERIES[7], kind: 'operacional' },
    { id: 'cat-outros', name: 'Outros gastos', color: NEUTRAL, kind: 'operacional' },
    { id: 'cat-retirada', name: 'Retirada pessoal', color: NEUTRAL, kind: 'retirada' },
  ],
  productCategories: ['Ferramentas', 'Casa e organização', 'Cozinha', 'Iluminação', 'Pet', 'Automotivo', 'Infantil', 'Natal', 'Verão', 'Outros'],
  channels: ['Marketplace', 'WhatsApp', 'Instagram', 'Indicação', 'Outro'],
});

export const emptyData = (): Data => ({
  version: 1,
  settings: defaultSettings(),
  products: [],
  purchases: [],
  sales: [],
  expenses: [],
  goals: [],
});
