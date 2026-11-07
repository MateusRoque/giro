import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconAjustes, IconCompras, IconEstoque, IconGastos, IconMetas, IconPainel, IconPlus, IconPreco, IconVendas } from './components/Icons';
import { Modal } from './components/Modal';
import { ProductHistory } from './components/ProductHistory';
import { SyncBadge } from './components/SyncPanel';
import { ExpenseForm } from './forms/ExpenseForm';
import { ProductForm } from './forms/ProductForm';
import { PurchaseForm } from './forms/PurchaseForm';
import { SaleForm } from './forms/SaleForm';
import type { PeriodKey } from './lib/calc';
import { useStore } from './lib/store';
import { UICtx, type Dialog, type PageKey } from './lib/ui';
import { Ajustes } from './pages/Ajustes';
import { Compras } from './pages/Compras';
import { Estoque } from './pages/Estoque';
import { Gastos } from './pages/Gastos';
import { Metas } from './pages/Metas';
import { Painel } from './pages/Painel';
import { Precificar } from './pages/Precificar';
import { Vendas } from './pages/Vendas';

const NAV: { key: PageKey; label: string; Icon: typeof IconPainel }[] = [
  { key: 'painel', label: 'Painel', Icon: IconPainel },
  { key: 'metas', label: 'Metas', Icon: IconMetas },
  { key: 'vendas', label: 'Vendas', Icon: IconVendas },
  { key: 'estoque', label: 'Estoque', Icon: IconEstoque },
  { key: 'compras', label: 'Compras', Icon: IconCompras },
  { key: 'gastos', label: 'Gastos', Icon: IconGastos },
  { key: 'precificar', label: 'Precificar', Icon: IconPreco },
  { key: 'ajustes', label: 'Ajustes', Icon: IconAjustes },
];

const pageFromHash = (): PageKey => {
  const h = window.location.hash.replace('#', '') as PageKey;
  return NAV.some((n) => n.key === h) ? h : 'painel';
};

const TITLES: Record<Exclude<Dialog['kind'], 'historico'>, [string, string]> = {
  venda: ['Registrar venda', 'Editar venda'],
  compra: ['Registrar compra', 'Editar compra'],
  gasto: ['Registrar gasto', 'Editar gasto'],
  produto: ['Novo produto', 'Editar produto'],
};

export function App() {
  const { data } = useStore();
  const [page, setPage] = useState<PageKey>(pageFromHash);
  const [periodKey, setPeriodKey] = useState<PeriodKey>('mes');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const toastTimer = useRef<number>();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  // Atalhos: V = venda, C = compra, G = gasto (fora de campos de texto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (dialog || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'v') setDialog({ kind: 'venda' });
      if (k === 'c') setDialog({ kind: 'compra' });
      if (k === 'g') setDialog({ kind: 'gasto' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  const go = useCallback((p: PageKey) => {
    window.location.hash = p;
    setPage(p);
    window.scrollTo({ top: 0 });
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const open = useCallback((d: Dialog) => {
    setMenu(false);
    setDialog(d);
  }, []);

  const ui = useMemo(() => ({ open, go, toast }), [open, go, toast]);

  // Ao salvar ou cancelar, volta para a janela de origem (ex.: histórico do produto)
  const done = (msg?: string) => {
    setDialog((d) => (d && 'back' in d && d.back ? d.back : null));
    if (msg) toast(msg);
  };
  const toNewProduct = () => setDialog({ kind: 'produto' });
  const closeDialog = useCallback(() => setDialog((d) => (d && 'back' in d && d.back ? d.back : null)), []);
  const historyName = dialog?.kind === 'historico' ? data.products.find((p) => p.id === dialog.productId)?.name ?? 'Produto' : '';

  const periodProps = { periodKey, setPeriodKey };

  return (
    <UICtx.Provider value={ui}>
      <div className="app">
        <nav className="side" aria-label="Menu principal">
          <div className="brand">
            <div className="brand-mark" aria-hidden><span /></div>
            <div>
              <div className="brand-name">Giro</div>
              <div className="brand-sub">{data.settings.businessName}</div>
            </div>
          </div>
          <div className="launch side-launch" ref={menuRef}>
            <button className="btn btn-primary" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} aria-label="Lançar venda, compra, gasto ou produto">
              <IconPlus /> <span className="launch-label">Lançar</span>
            </button>
            {menu && (
              <div className="launch-menu" role="menu">
                <button role="menuitem" onClick={() => open({ kind: 'venda' })}><b>Venda</b><small>Vendi um produto</small></button>
                <button role="menuitem" onClick={() => open({ kind: 'compra' })}><b>Compra</b><small>Chegou mercadoria do fornecedor</small></button>
                <button role="menuitem" onClick={() => open({ kind: 'gasto' })}><b>Gasto</b><small>Gasolina, anúncio, embalagem...</small></button>
                <button role="menuitem" onClick={() => open({ kind: 'produto' })}><b>Produto</b><small>Cadastrar item novo</small></button>
              </div>
            )}
          </div>
          {NAV.map(({ key, label, Icon }) => (
            <button key={key} className="nav-btn" aria-current={page === key ? 'page' : undefined} onClick={() => go(key)}>
              <Icon />
              {label}
            </button>
          ))}
          <div className="side-foot">
            <button className="link-btn" style={{ fontSize: 12, fontWeight: 500, textDecoration: 'none', display: 'block', marginBottom: 10 }} onClick={() => go('ajustes')}>
              <SyncBadge />
            </button>
            Atalhos: V venda, C compra, G gasto
          </div>
        </nav>

        <main className="main">
          {page === 'painel' && <Painel {...periodProps} />}
          {page === 'metas' && <Metas />}
          {page === 'vendas' && <Vendas {...periodProps} />}
          {page === 'estoque' && <Estoque />}
          {page === 'compras' && <Compras {...periodProps} />}
          {page === 'gastos' && <Gastos {...periodProps} />}
          {page === 'precificar' && <Precificar />}
          {page === 'ajustes' && <Ajustes />}
        </main>
      </div>

      {dialog && dialog.kind === 'historico' && (
        <Modal key={`h-${dialog.productId}`} title={historyName} onClose={closeDialog} wide>
          <ProductHistory productId={dialog.productId} />
        </Modal>
      )}
      {dialog && dialog.kind !== 'historico' && (
        <Modal key={dialog.kind} title={TITLES[dialog.kind][dialog.item ? 1 : 0]} onClose={closeDialog}>
          {dialog.kind === 'venda' && <SaleForm item={dialog.item} productId={dialog.productId} onDone={done} onNewProduct={toNewProduct} />}
          {dialog.kind === 'compra' && <PurchaseForm item={dialog.item} productId={dialog.productId} onDone={done} onNewProduct={toNewProduct} />}
          {dialog.kind === 'gasto' && <ExpenseForm item={dialog.item} productId={dialog.productId} onDone={done} />}
          {dialog.kind === 'produto' && <ProductForm item={dialog.item} onDone={done} />}
        </Modal>
      )}

      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </UICtx.Provider>
  );
}
