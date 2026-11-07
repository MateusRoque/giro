import { useMemo } from 'react';
import { MoneyTape } from '../components/MoneyTape';
import { MonthlyChart } from '../components/MonthlyChart';
import { PeriodPicker } from '../components/PeriodPicker';
import { getPeriod, moneyFlow, monthlySeries, productRows, summarize, type PeriodKey } from '../lib/calc';
import { todayISO } from '../lib/dates';
import { brl, int, monthLong, pct } from '../lib/format';
import { monthProjection } from '../lib/projections';
import { exampleData } from '../lib/seed';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';

export function Painel({ periodKey, setPeriodKey }: { periodKey: PeriodKey; setPeriodKey: (k: PeriodKey) => void }) {
  const { data, replaceAll } = useStore();
  const { open, go } = useUI();
  const today = todayISO();
  const period = getPeriod(periodKey);

  const s = useMemo(() => summarize(data, period), [data, period.from, period.to]);
  const flow = useMemo(() => moneyFlow(data, period), [data, period.from, period.to]);
  const series = useMemo(() => monthlySeries(data, today, 6), [data, today]);
  const rows = useMemo(() => productRows(data, period, today), [data, period.from, period.to, today]);
  const proj = useMemo(() => monthProjection(data, today), [data, today]);
  const thisMonth = proj.actual;

  const stockValue = rows.reduce((a, r) => a + r.stockValue, 0);
  const stockSale = rows.reduce((a, r) => a + r.stockSaleValue, 0);
  const units = rows.reduce((a, r) => a + Math.max(0, r.stock), 0);
  const top = rows.filter((r) => r.soldQty > 0).sort((a, b) => b.profit - a.profit).slice(0, 6);
  const stalled = rows.filter((r) => r.stalled && !r.archived).sort((a, b) => b.stockValue - a.stockValue);
  const goal = proj.goals.profit;
  const goalRatio = goal > 0 ? Math.max(0, Math.min(1, thisMonth.netProfit / goal)) : 0;
  const balance = s.cashIn - s.cashOut;

  const isEmpty = !data.products.length && !data.sales.length && !data.expenses.length;

  if (isEmpty) {
    return (
      <>
        <header className="topbar">
          <div>
            <h1 className="page-title">Bem-vindo ao Giro</h1>
            <p className="page-sub">Seu controle de compras, estoque, vendas e lucro.</p>
          </div>
        </header>
        <section className="panel">
          <div className="empty">
            <b>Comece cadastrando seu primeiro produto</b>
            Depois registre a compra (entrada no estoque) e cada venda. O painel calcula lucro, margem e para onde vai seu dinheiro.
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => open({ kind: 'produto' })}>Cadastrar produto</button>
              <button className="btn" onClick={() => replaceAll(exampleData())}>Explorar com dados de exemplo</button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">{periodKey === 'mes' ? monthLong(today) : period.label}</h1>
          <p className="page-sub">
            {s.salesCount ? `${int(s.salesCount)} ${s.salesCount === 1 ? 'venda' : 'vendas'}, ${int(s.unitsSold)} ${s.unitsSold === 1 ? 'unidade' : 'unidades'}` : 'Nenhuma venda no período'}
          </p>
        </div>
        <PeriodPicker value={periodKey} onChange={setPeriodKey} />
      </header>

      <section className="hero" aria-labelledby="flow-title">
        <h2 className="panel-title" id="flow-title">Para onde foi o dinheiro</h2>
        <div className="hero-figures">
          <div><div className="fig-label">Entrou</div><div className="fig-value num">{brl(s.cashIn)}</div></div>
          <div><div className="fig-label">Saiu</div><div className="fig-value num">{brl(s.cashOut)}</div></div>
          <div>
            <div className="fig-label">{balance >= 0 ? 'Sobrou no caixa' : 'Faltou no caixa'}</div>
            <div className={`fig-value num ${balance >= 0 ? 'pos' : 'neg'}`}>{brl(balance)}</div>
          </div>
        </div>
        <MoneyTape items={flow} />
      </section>

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Faturamento</div>
          <div className="kpi-value num">{brl(s.revenue)}</div>
          <div className="kpi-foot">Ticket médio {brl(s.avgTicket)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Lucro líquido</div>
          <div className={`kpi-value num ${s.netProfit < 0 ? 'neg' : ''}`}>{brl(s.netProfit)}</div>
          <div className="kpi-foot">Lucro das vendas {brl(s.grossProfit)} menos gastos {brl(s.opExpenses)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Margem líquida</div>
          <div className={`kpi-value num ${s.margin < 0 ? 'neg' : ''}`}>{pct(s.margin)}</div>
          <div className="kpi-foot">Meta de margem: {data.settings.targetMarginPct}%</div>
        </div>
        <button className="kpi kpi-link" onClick={() => go('metas')} aria-label="Abrir metas e projeções">
          <div className="kpi-label">Meta de lucro do mês</div>
          <div className="kpi-value num">{pct(goal > 0 ? thisMonth.netProfit / goal : 0)}</div>
          <div className="goal-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(goalRatio * 100)} aria-label="Progresso da meta">
            <span style={{ width: `${goalRatio * 100}%` }} />
            {goal > 0 && <i style={{ left: `${Math.max(0, Math.min(1, proj.projected.netProfit / goal)) * 100}%` }} />}
          </div>
          <div className="kpi-foot">{brl(thisMonth.netProfit)} de {brl(goal)}. Projeção {brl(proj.projected.netProfit)}</div>
        </button>
      </div>

      <div className="grid grid-2-1" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Últimos 6 meses</h2>
          </div>
          <MonthlyChart data={series} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Estoque agora</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => go('estoque')}>Abrir estoque</button>
          </div>
          <div className="stack" style={{ gap: 14 }}>
            <div><div className="fig-label">Dinheiro parado em mercadoria</div><div className="fig-value small num">{brl(stockValue)}</div></div>
            <div><div className="fig-label">Se vender tudo pelo preço anunciado</div><div className="fig-value small num">{brl(stockSale)}</div></div>
            <div><div className="fig-label">Lucro esperado nesse estoque</div><div className="fig-value small num pos">{brl(stockSale - stockValue)}</div></div>
            <div className="muted" style={{ fontSize: 13 }}>{int(units)} unidades em {rows.filter((r) => r.stock > 0).length} produtos</div>
          </div>
        </section>
      </div>

      <div className="grid grid-2-1">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Produtos que mais lucraram</h2>
            <span className="panel-note">{period.label}</span>
          </div>
          {top.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Produto</th><th className="r">Vendidos</th><th className="r">Faturou</th><th className="r">Lucro</th><th className="r">Margem</th></tr>
                </thead>
                <tbody>
                  {top.map((r) => (
                    <tr key={r.id}>
                      <td className="name-cell">
                        <button className="link-btn" onClick={() => open({ kind: 'historico', productId: r.id })}>{r.name}</button>
                        <span className="sub">{r.category}</span>
                      </td>
                      <td className="r">{int(r.soldQty)}</td>
                      <td className="r">{brl(r.revenue)}</td>
                      <td className={`r ${r.profit < 0 ? 'neg' : ''}`}><b>{brl(r.profit)}</b></td>
                      <td className="r">{pct(r.revenue ? r.profit / r.revenue : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <b>Nenhuma venda neste período</b>
              <button className="btn btn-primary" onClick={() => open({ kind: 'venda' })}>Registrar venda</button>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Parados no estoque</h2>
            <span className="panel-note">{data.settings.stalledDays}+ dias sem vender</span>
          </div>
          {stalled.length ? (
            <div className="list">
              {stalled.slice(0, 6).map((r) => (
                <div className="list-row" key={r.id}>
                  <div style={{ minWidth: 0 }}>
                    <button className="link-btn" onClick={() => open({ kind: 'historico', productId: r.id })}>{r.name}</button>
                    <div className="muted" style={{ fontSize: 12.5 }}>{r.stock} un. paradas há {r.daysStalled} dias</div>
                  </div>
                  <span className="badge badge-warn num">{brl(r.stockValue)}</span>
                </div>
              ))}
              <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>Ideias: baixar o preço, montar um combo com um item que vende bem ou impulsionar o anúncio.</p>
            </div>
          ) : (
            <div className="empty" style={{ padding: '20px 8px' }}>
              <b>Nada parado</b>
              Todo produto em estoque vendeu nos últimos {data.settings.stalledDays} dias.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
