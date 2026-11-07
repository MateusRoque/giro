import { createContext, useContext } from 'react';
import type { Expense, Product, Purchase, Sale } from './types';

/** `back`: janela para onde voltar depois de salvar (ex.: o histórico do produto). */
export type Dialog =
  | { kind: 'venda'; item?: Sale; productId?: string; back?: Dialog }
  | { kind: 'compra'; item?: Purchase; productId?: string; back?: Dialog }
  | { kind: 'gasto'; item?: Expense; productId?: string; back?: Dialog }
  | { kind: 'produto'; item?: Product; back?: Dialog }
  | { kind: 'historico'; productId: string };

export type PageKey = 'painel' | 'metas' | 'vendas' | 'estoque' | 'compras' | 'gastos' | 'precificar' | 'ajustes';

interface UI {
  open: (d: Dialog) => void;
  go: (p: PageKey) => void;
  toast: (msg: string) => void;
}

export const UICtx = createContext<UI | null>(null);

export function useUI(): UI {
  const u = useContext(UICtx);
  if (!u) throw new Error('useUI fora do App');
  return u;
}
