import { addDays, todayISO } from './dates';
import { defaultSettings } from './defaults';
import type { Data, Expense, Product, Purchase, Sale } from './types';

/** Dados de exemplo, com datas relativas a hoje, para explorar o sistema. */
export function exampleData(): Data {
  const today = todayISO();
  const d = (offset: number) => addDays(today, -offset);
  const settings = defaultSettings();

  const products: Product[] = [
    p('ex-furadeira', 'Parafusadeira de impacto 2 baterias', 'Ferramentas', 'Shopee', 119),
    p('ex-brocas', 'Kit brocas e bits 65 peças', 'Ferramentas', 'AliExpress', 49),
    p('ex-led', 'Fita LED 5 m com controle', 'Iluminação', 'AliExpress', 59),
    p('ex-pisca', 'Pisca-pisca 100 LEDs', 'Natal', 'Shopee', 35),
    p('ex-ventilador', 'Ventilador portátil recarregável', 'Verão', 'Shopee', 69),
    p('ex-organizador', 'Kit 6 organizadores de geladeira', 'Casa e organização', 'AliExpress', 55),
  ];

  const purchases: Purchase[] = [
    buy('ex-furadeira', d(80), 1, 39, 12, 0, 'Teste'),
    buy('ex-furadeira', d(55), 5, 39, 25, 0, ''),
    buy('ex-brocas', d(54), 6, 14, 0, 17.2, 'Pedido abaixo de US$ 50'),
    buy('ex-led', d(60), 8, 13, 0, 21.3, ''),
    buy('ex-organizador', d(70), 4, 15, 0, 12.3, ''),
    buy('ex-pisca', d(20), 15, 7.5, 18, 0, 'Para o Natal'),
    buy('ex-ventilador', d(12), 6, 21, 20, 0, 'Verão'),
  ];

  const sales: Sale[] = [
    sell('ex-furadeira', d(74), 119, 'Marketplace'),
    sell('ex-furadeira', d(48), 119, 'Marketplace'),
    sell('ex-furadeira', d(41), 109, 'WhatsApp'),
    sell('ex-brocas', d(41), 39, 'WhatsApp', 0),
    sell('ex-furadeira', d(30), 119, 'Marketplace'),
    sell('ex-led', d(52), 59, 'Marketplace'),
    sell('ex-led', d(44), 59, 'Marketplace'),
    sell('ex-led', d(33), 55, 'Instagram'),
    sell('ex-brocas', d(25), 49, 'Marketplace'),
    sell('ex-organizador', d(62), 55, 'Marketplace'),
    sell('ex-furadeira', d(15), 119, 'Marketplace'),
    sell('ex-brocas', d(15), 39, 'Marketplace', 0),
    sell('ex-pisca', d(9), 35, 'Marketplace'),
    sell('ex-pisca', d(6), 35, 'Marketplace'),
    sell('ex-pisca', d(4), 30, 'Indicação'),
    sell('ex-ventilador', d(5), 69, 'Marketplace'),
    sell('ex-ventilador', d(2), 69, 'Marketplace'),
    sell('ex-led', d(3), 59, 'Marketplace'),
    sell('ex-furadeira', d(1), 119, 'Marketplace'),
  ];

  const expenses: Expense[] = [];
  for (const back of [0, 30, 60]) {
    expenses.push(
      exp(d(back + 2), 'cat-fixos', 'Plano de celular', 60),
      exp(d(back + 3), 'cat-transporte', 'Gasolina das entregas', 70),
      exp(d(back + 8), 'cat-embalagem', 'Sacos e fita', 22),
      exp(d(back + 10), 'cat-anuncios', 'Impulsionar anúncio', 25),
      exp(d(back + 1), 'cat-retirada', 'Retirada do mês', 300),
    );
  }

  expenses.push({ id: 'ex-g-bateria', date: d(50), categoryId: 'cat-outros', description: 'Bateria extra para teste', amount: 35, productId: 'ex-furadeira' });

  return { version: 1, settings, products, purchases, sales, expenses, goals: [] };

  function p(id: string, name: string, category: string, supplier: string, salePrice: number): Product {
    return { id, name, category, supplier, link: '', salePrice, notes: '', createdAt: d(90), archived: false };
  }
  function buy(productId: string, date: string, qty: number, unitCost: number, shipping: number, taxes: number, notes: string): Purchase {
    return { id: `ex-c-${productId}-${date}`, productId, date, qty, unitCost, shipping, taxes, supplier: '', notes };
  }
  function sell(productId: string, date: string, unitPrice: number, channel: string, deliveryCost = 5): Sale {
    return { id: `ex-v-${productId}-${date}-${unitPrice}`, productId, date, qty: 1, unitPrice, deliveryCost, fee: 0, channel, customer: '', notes: '' };
  }
  function exp(date: string, categoryId: string, description: string, amount: number): Expense {
    return { id: `ex-g-${categoryId}-${date}`, date, categoryId, description, amount };
  }
}
