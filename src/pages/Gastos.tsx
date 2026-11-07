import { useMemo, useState } from 'react';
import { IconEdit, IconTrash } from '../components/Icons';
import { PeriodPicker } from '../components/PeriodPicker';
import { getPeriod, inPeriod, sum, type PeriodKey } from '../lib/calc';
import { brl, dateBR, pct } from '../lib/format';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';

export function Gastos({ periodKey, setPeriodKey }: { periodKey: PeriodKey; setPeriodKey: (k: PeriodKey) => void }) {
  const { data, remove } = useStore();
  const { open, toast, go } = useUI();
  const [catFilter, setCatFilter] = useState('');
  const period = getPeriod(periodKey);
  const cats = data.settings.categories;
  const catMap = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const productNames = useMemo(() => new Map(data.products.map((p) => [p.id, p.name])), [data.products]);

  const inP = data.expenses.filter((e) => inPeriod(e.date, period));
  const rows = inP.filter((e) => !catFilter || e.categoryId === catFilter).sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = sum(inP.map((e) => e.amount));
  const byCat = cats
    .map((c) => ({ c, amount: sum(inP.filter((e) => e.categoryId === c.id).map((e) => e.amount)) }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const max = Math.max(1, ...byCat.map((x) => x.amount));

  const del = (id: string) => {
    if (confirm('Apagar este gasto?')) {
      remove('expenses', id);
      toast('Gasto apagado');
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Gastos</h1>
          <p className="page-sub">Tudo que sai do caixa além da mercadoria: combustível, anúncios, embalagem, contas e retiradas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => open({ kind: 'gasto' })}>Registrar gasto</button>
      </header>

      <div className="toolbar"><PeriodPicker value={periodKey} onChange={setPeriodKey} /></div>

      <div className="grid grid-2-1">
        <section className="panel">
          <div className="toolbar">
            <select className="select" style={{ maxWidth: 260 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {rows.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th className="r">Valor</th><th /></tr></thead>
                <tbody>
                  {rows.map((e) => {
                    const c = catMap.get(e.categoryId);
                    return (
                      <tr key={e.id}>
                        <td className="num">{dateBR(e.date)}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <i style={{ width: 10, height: 10, borderRadius: 3, background: c?.color ?? '#555', display: 'inline-block' }} />
                            {c?.name ?? 'Sem categoria'}
                          </span>
                        </td>
                        <td className="ink2">
                          {e.description || '–'}
                          {e.productId && <span className="sub">Produto: {productNames.get(e.productId) ?? 'apagado'}</span>}
                        </td>
                        <td className="r"><b>{brl(e.amount)}</b></td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-ghost btn-sm icon-btn" aria-label="Editar gasto" onClick={() => open({ kind: 'gasto', item: e })}><IconEdit /></button>
                            <button className="btn btn-ghost btn-sm icon-btn btn-danger" aria-label="Apagar gasto" onClick={() => del(e.id)}><IconTrash /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><b>Nenhum gasto neste período</b>Registre combustível, anúncios, embalagens e contas.</div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Por categoria</h2>
            <span className="num" style={{ fontWeight: 700 }}>{brl(total)}</span>
          </div>
          {byCat.length ? (
            <div className="list">
              {byCat.map(({ c, amount }) => (
                <button key={c.id} className="list-row" onClick={() => setCatFilter(catFilter === c.id ? '' : c.id)}
                  style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', display: 'block', width: '100%', padding: '10px 0' }}
                  aria-pressed={catFilter === c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
                    <span style={{ fontWeight: catFilter === c.id ? 700 : 500 }}>{c.name}{c.kind === 'retirada' && <span className="muted" style={{ fontSize: 12 }}> (retirada)</span>}</span>
                    <span className="num"><b>{brl(amount)}</b> <span className="muted" style={{ fontSize: 12 }}>{pct(amount / total)}</span></span>
                  </div>
                  <div style={{ height: 6, background: 'var(--sunken)', borderRadius: 3, marginTop: 6 }}>
                    <div style={{ width: `${(amount / max) * 100}%`, height: '100%', background: c.color, borderRadius: 3 }} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">Sem gastos para mostrar.</p>
          )}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => go('ajustes')}>Editar categorias</button>
        </section>
      </div>
    </>
  );
}
