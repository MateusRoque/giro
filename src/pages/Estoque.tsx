import { useMemo, useState } from 'react';
import { IconEdit, IconLink, IconTrash } from '../components/Icons';
import { getPeriod, productRows, type ProductRow } from '../lib/calc';
import { todayISO } from '../lib/dates';
import { brl, int, pct } from '../lib/format';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';

type Sort = 'nome' | 'estoque' | 'margem' | 'parado' | 'capital' | 'investido';

export function Estoque() {
  const { data, remove } = useStore();
  const { open, toast } = useUI();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState<Sort>('estoque');
  const [showArchived, setShowArchived] = useState(false);

  const all = useMemo(() => productRows(data, getPeriod('tudo'), todayISO()), [data]);
  const products = useMemo(() => new Map(data.products.map((p) => [p.id, p])), [data.products]);

  const rows = all
    .filter((r) => showArchived || !r.archived)
    .filter((r) => !cat || r.category === cat)
    .filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()))
    .sort(sorter(sort));

  const capital = rows.reduce((a, r) => a + r.stockValue, 0);
  const potential = rows.reduce((a, r) => a + r.stockSaleValue, 0);
  const units = rows.reduce((a, r) => a + Math.max(0, r.stock), 0);
  const invested = rows.reduce((a, r) => a + r.invested, 0);
  const recovered = rows.reduce((a, r) => a + r.recovered, 0);
  const lowMargin = data.settings.targetMarginPct / 100;

  const del = (r: ProductRow) => {
    const used = data.purchases.some((p) => p.productId === r.id) || data.sales.some((s) => s.productId === r.id);
    if (used) {
      alert('Este produto tem compras ou vendas registradas. Para não perder o histórico, edite e marque "Arquivar".');
      return;
    }
    if (confirm(`Apagar "${r.name}"?`)) {
      remove('products', r.id);
      toast('Produto apagado');
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Estoque e produtos</h1>
          <p className="page-sub">Quanto você gastou e quanto já voltou em cada produto. Clique no nome para ver o histórico.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={() => open({ kind: 'compra' })}>Registrar compra</button>
          <button className="btn btn-primary" onClick={() => open({ kind: 'produto' })}>Novo produto</button>
        </div>
      </header>

      <section className="panel">
        <div className="totals">
          <div><div className="fig-label">Total investido</div><div className="fig-value num">{brl(invested)}</div></div>
          <div><div className="fig-label">Já recuperado</div><div className="fig-value num">{brl(recovered)}</div></div>
          <div><div className="fig-label">Unidades</div><div className="fig-value num">{int(units)}</div></div>
          <div><div className="fig-label">Capital parado</div><div className="fig-value num">{brl(capital)}</div></div>
          <div><div className="fig-label">Valor de venda</div><div className="fig-value num">{brl(potential)}</div></div>
          <div><div className="fig-label">Lucro esperado</div><div className="fig-value num pos">{brl(potential - capital)}</div></div>
        </div>

        <div className="toolbar">
          <input className="input search" placeholder="Buscar produto" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar produto" />
          <select className="select" style={{ width: 190 }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {data.settings.productCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="select" style={{ width: 200 }} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
            <option value="estoque">Mais estoque primeiro</option>
            <option value="capital">Mais dinheiro parado</option>
            <option value="investido">Mais investido</option>
            <option value="parado">Parado há mais tempo</option>
            <option value="margem">Maior margem</option>
            <option value="nome">Nome (A-Z)</option>
          </select>
          <label className="check">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Mostrar arquivados
          </label>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th><th className="r">Estoque</th><th className="r">Custo real</th><th className="r">Preço</th>
                  <th className="r">Margem</th><th className="r">Investido</th><th className="r">Recuperado</th><th>Situação</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = products.get(r.id);
                  return (
                    <tr key={r.id}>
                      <td className="name-cell">
                        <button className="link-btn" onClick={() => open({ kind: 'historico', productId: r.id })} title="Ver histórico do produto">{r.name}</button>
                        {p?.link && <a href={p.link} target="_blank" rel="noreferrer" aria-label="Abrir link do fornecedor" style={{ marginLeft: 6 }}><IconLink /></a>}
                        <span className="sub">{r.category}{p?.supplier ? `, ${p.supplier}` : ''}</span>
                      </td>
                      <td className={`r ${r.stock < 0 ? 'neg' : ''}`}><b>{r.stock}</b></td>
                      <td className="r">{r.avgCost ? brl(r.avgCost) : <span className="muted">sem compra</span>}</td>
                      <td className="r">{brl(r.salePrice)}</td>
                      <td className={`r ${r.avgCost && r.unitMargin < 0 ? 'neg' : ''}`}>{r.avgCost ? pct(r.unitMargin) : '–'}</td>
                      <td className="r">{brl(r.invested)}</td>
                      <td className="r">
                        {brl(r.recovered)}
                        {r.invested > 0 && (
                          <span className="sub" style={{ color: r.recovered >= r.invested ? 'var(--pos)' : undefined }}>
                            {r.recovered >= r.invested ? 'já se pagou' : `${pct(r.recovered / r.invested)} de volta`}
                          </span>
                        )}
                      </td>
                      <td>{status(r, lowMargin)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-sm" onClick={() => open({ kind: 'venda', productId: r.id })} disabled={r.archived}>Vender</button>
                          <button className="btn btn-sm" onClick={() => open({ kind: 'compra', productId: r.id })} disabled={r.archived}>Comprar</button>
                          <button className="btn btn-ghost btn-sm icon-btn" aria-label="Editar produto" onClick={() => p && open({ kind: 'produto', item: p })}><IconEdit /></button>
                          <button className="btn btn-ghost btn-sm icon-btn btn-danger" aria-label="Apagar produto" onClick={() => del(r)}><IconTrash /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>{data.products.length ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}</b>
            {data.products.length ? 'Mude a busca ou o filtro.' : 'Cadastre o primeiro produto que você revende.'}
            {!data.products.length && <div><button className="btn btn-primary" onClick={() => open({ kind: 'produto' })}>Novo produto</button></div>}
          </div>
        )}
      </section>
    </>
  );
}

function status(r: ProductRow, lowMargin: number) {
  if (r.archived) return <span className="badge">Arquivado</span>;
  if (r.stock < 0) return <span className="badge badge-neg">Vendeu sem compra</span>;
  if (r.stock === 0) return <span className="badge">Sem estoque</span>;
  if (r.stalled) return <span className="badge badge-warn">Parado {r.daysStalled}d</span>;
  if (r.avgCost && r.unitMargin < lowMargin) return <span className="badge badge-warn">Margem baixa</span>;
  return <span className="badge badge-pos">Girando</span>;
}

function sorter(s: Sort) {
  return (a: ProductRow, b: ProductRow): number => {
    switch (s) {
      case 'nome': return a.name.localeCompare(b.name, 'pt-BR');
      case 'estoque': return b.stock - a.stock;
      case 'margem': return b.unitMargin - a.unitMargin;
      case 'parado': return (b.daysStalled ?? -1) - (a.daysStalled ?? -1);
      case 'capital': return b.stockValue - a.stockValue;
      case 'investido': return b.invested - a.invested;
    }
  };
}
