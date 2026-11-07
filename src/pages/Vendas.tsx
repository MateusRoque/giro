import { useMemo, useState } from 'react';
import { IconEdit, IconTrash } from '../components/Icons';
import { PeriodPicker } from '../components/PeriodPicker';
import { avgCostMap, getPeriod, inPeriod, saleProfit, saleRevenue, sum, type PeriodKey } from '../lib/calc';
import { brl, dateBR, int, pct } from '../lib/format';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';

export function Vendas({ periodKey, setPeriodKey }: { periodKey: PeriodKey; setPeriodKey: (k: PeriodKey) => void }) {
  const { data, remove } = useStore();
  const { open, toast } = useUI();
  const [q, setQ] = useState('');
  const [channel, setChannel] = useState('');
  const period = getPeriod(periodKey);

  const avg = useMemo(() => avgCostMap(data.purchases), [data.purchases]);
  const names = useMemo(() => new Map(data.products.map((p) => [p.id, p.name])), [data.products]);

  const rows = data.sales
    .filter((s) => inPeriod(s.date, period))
    .filter((s) => !channel || s.channel === channel)
    .filter((s) => !q || `${names.get(s.productId) ?? ''} ${s.customer} ${s.notes}`.toLowerCase().includes(q.toLowerCase()))
    .map((s) => ({ s, revenue: saleRevenue(s), profit: saleProfit(s, avg.get(s.productId) ?? 0) }))
    .sort((a, b) => (a.s.date < b.s.date ? 1 : -1));

  const revenue = sum(rows.map((r) => r.revenue));
  const profit = sum(rows.map((r) => r.profit));

  const del = (id: string) => {
    if (confirm('Apagar esta venda? O produto volta para o estoque.')) {
      remove('sales', id);
      toast('Venda apagada');
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Vendas</h1>
          <p className="page-sub">Cada venda com o lucro real, já descontado o custo da mercadoria.</p>
        </div>
        <button className="btn btn-primary" onClick={() => open({ kind: 'venda' })}>Registrar venda</button>
      </header>

      <section className="panel">
        <div className="toolbar">
          <PeriodPicker value={periodKey} onChange={setPeriodKey} />
          <input className="input search" placeholder="Buscar produto ou cliente" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
          <select className="select" style={{ width: 170 }} value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Canal">
            <option value="">Todos os canais</option>
            {data.settings.channels.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="totals">
          <div><div className="fig-label">Vendas</div><div className="fig-value num">{int(rows.length)}</div></div>
          <div><div className="fig-label">Faturamento</div><div className="fig-value num">{brl(revenue)}</div></div>
          <div><div className="fig-label">Lucro das vendas</div><div className={`fig-value num ${profit < 0 ? 'neg' : 'pos'}`}>{brl(profit)}</div></div>
          <div><div className="fig-label">Margem</div><div className="fig-value num">{pct(revenue ? profit / revenue : 0)}</div></div>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Data</th><th>Produto</th><th>Canal</th><th className="r">Qtd</th><th className="r">Recebido</th><th className="r">Lucro</th><th className="r">Margem</th><th /></tr>
              </thead>
              <tbody>
                {rows.map(({ s, revenue, profit }) => (
                  <tr key={s.id}>
                    <td className="num">{dateBR(s.date)}</td>
                    <td className="name-cell">{names.get(s.productId) ?? 'Produto apagado'}{s.customer && <span className="sub">{s.customer}</span>}</td>
                    <td><span className="badge">{s.channel}</span></td>
                    <td className="r">{s.qty}</td>
                    <td className="r">{brl(revenue)}</td>
                    <td className={`r ${profit < 0 ? 'neg' : 'pos'}`}><b>{brl(profit)}</b></td>
                    <td className="r">{pct(revenue ? profit / revenue : 0)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm icon-btn" aria-label="Editar venda" onClick={() => open({ kind: 'venda', item: s })}><IconEdit /></button>
                        <button className="btn btn-ghost btn-sm icon-btn btn-danger" aria-label="Apagar venda" onClick={() => del(s.id)}><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>Nenhuma venda encontrada</b>
            {q || channel ? 'Mude a busca ou o filtro de canal.' : 'Registre a primeira venda deste período.'}
          </div>
        )}
      </section>
    </>
  );
}
