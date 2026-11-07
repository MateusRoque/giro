import { productLedger, purchaseTotal, purchaseUnitCost, saleRevenue } from '../lib/calc';
import { brl, dateBR, int } from '../lib/format';
import { useStore } from '../lib/store';
import { useUI, type Dialog } from '../lib/ui';
import { IconEdit } from './Icons';

/** Tudo sobre um produto: quanto gastou, quanto voltou, compras, vendas e gastos extras. */
export function ProductHistory({ productId }: { productId: string }) {
  const { data } = useStore();
  const { open } = useUI();
  const product = data.products.find((p) => p.id === productId);
  if (!product) return <p className="muted">Produto não encontrado.</p>;

  const l = productLedger(data, productId);
  const back: Dialog = { kind: 'historico', productId };
  const cats = new Map(data.settings.categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <p className="ink2" style={{ margin: '-8px 0 16px', fontSize: 14 }}>
        {product.category}{product.supplier ? `, ${product.supplier}` : ''}. Preço anunciado {brl(product.salePrice)}.
      </p>

      <div className="preview" style={{ marginTop: 0 }}>
        <div><div className="fig-label">Total investido</div><div className="fig-value num">{brl(l.invested)}</div></div>
        <div><div className="fig-label">Já recuperado</div><div className="fig-value num">{brl(l.recovered)}</div></div>
        <div>
          <div className="fig-label">{l.balance >= 0 ? 'Saldo (já se pagou)' : 'Falta recuperar'}</div>
          <div className={`fig-value num ${l.balance >= 0 ? 'pos' : 'neg'}`}>{brl(Math.abs(l.balance))}</div>
        </div>
        <div><div className="fig-label">Lucro das vendas</div><div className={`fig-value num ${l.profit < 0 ? 'neg' : 'pos'}`}>{brl(l.profit)}</div></div>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
        {int(l.unitsSold)} vendidas, {int(Math.max(0, l.stock))} em estoque ({brl(l.stockValue)} em mercadoria). Custo real médio {brl(l.avgCost)} por unidade.
        {l.balance < 0 && l.stock > 0 && product.salePrice > 0 && ` Vendendo o estoque a ${brl(product.salePrice)}, faltam ${Math.max(0, Math.ceil(-l.balance / product.salePrice))} un. para o produto se pagar.`}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0 4px' }}>
        <button className="btn btn-sm btn-primary" onClick={() => open({ kind: 'compra', productId, back })}>Registrar compra</button>
        <button className="btn btn-sm" onClick={() => open({ kind: 'venda', productId, back })}>Registrar venda</button>
        <button className="btn btn-sm" onClick={() => open({ kind: 'gasto', productId, back })}>Gasto extra</button>
        <button className="btn btn-sm btn-ghost" onClick={() => open({ kind: 'produto', item: product, back })}>Editar produto</button>
      </div>

      <Section title="Compras" empty="Nenhuma compra registrada.">
        {l.purchases.map((p) => (
          <Row key={p.id} date={p.date} label={`${p.qty} un. a ${brl(p.unitCost)}${p.shipping ? ` + frete ${brl(p.shipping)}` : ''}${p.taxes ? ` + imposto ${brl(p.taxes)}` : ''}`}
            sub={`Custo real ${brl(purchaseUnitCost(p))}/un.${p.supplier ? `, ${p.supplier}` : ''}`}
            value={`-${brl(purchaseTotal(p))}`} tone="neg" onEdit={() => open({ kind: 'compra', item: p, back })} />
        ))}
      </Section>

      <Section title="Gastos extras" empty="Nenhum gasto extra. Use para bateria extra, anúncio só deste produto etc.">
        {l.extras.map((e) => (
          <Row key={e.id} date={e.date} label={e.description || (cats.get(e.categoryId) ?? 'Gasto')} sub={cats.get(e.categoryId)}
            value={`-${brl(e.amount)}`} tone="neg" onEdit={() => open({ kind: 'gasto', item: e, back })} />
        ))}
      </Section>

      <Section title="Vendas" empty="Nenhuma venda ainda.">
        {l.sales.map((s) => (
          <Row key={s.id} date={s.date} label={`${s.qty} un. a ${brl(s.unitPrice)}`}
            sub={[s.channel, s.customer, s.deliveryCost ? `entrega ${brl(s.deliveryCost)}` : ''].filter(Boolean).join(', ')}
            value={`+${brl(saleRevenue(s) - s.fee - s.deliveryCost)}`} tone="pos" onEdit={() => open({ kind: 'venda', item: s, back })} />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section style={{ marginTop: 20 }}>
      <h3 className="panel-title" style={{ fontSize: 16, marginBottom: 6 }}>{title}</h3>
      {children.length ? <div className="list">{children}</div> : <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>{empty}</p>}
    </section>
  );
}

function Row({ date, label, sub, value, tone, onEdit }: { date: string; label: string; sub?: string; value: string; tone: 'pos' | 'neg'; onEdit: () => void }) {
  return (
    <div className="list-row">
      <div style={{ display: 'flex', gap: 14, minWidth: 0 }}>
        <span className="muted num" style={{ fontSize: 13, paddingTop: 1, flex: 'none' }}>{dateBR(date)}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14 }}>{label}</div>
          {sub && <div className="muted" style={{ fontSize: 12.5 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
        <b className={`num ${tone}`} style={{ fontSize: 14 }}>{value}</b>
        <button className="btn btn-ghost btn-sm icon-btn" aria-label="Editar" onClick={onEdit}><IconEdit /></button>
      </div>
    </div>
  );
}
