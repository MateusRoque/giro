import { useMemo, useState } from 'react';
import { Field, MoneyInput, NumberInput } from '../components/Fields';
import { Modal } from '../components/Modal';
import { MonthlyChart } from '../components/MonthlyChart';
import { todayISO } from '../lib/dates';
import { brl, dateBR, int, monthLong, numToField, parseNum, pct } from '../lib/format';
import { forecast, monthProjection, restockPlan, salesNeeded } from '../lib/projections';
import { useStore } from '../lib/store';
import type { MonthGoal } from '../lib/types';
import { useUI } from '../lib/ui';

export function Metas() {
  const { data, remove } = useStore();
  const { open, go } = useUI();
  const today = todayISO();
  const p = useMemo(() => monthProjection(data, today), [data, today]);
  const series = useMemo(() => forecast(data, today, 4, 3), [data, today]);
  const restock = useMemo(() => restockPlan(data, today), [data, today]);
  const [editing, setEditing] = useState(false);
  const [salaryField, setSalaryField] = useState<string | null>(null);

  const g = p.goals;
  const salary = salaryField === null ? g.salary : parseNum(salaryField);
  const need = salesNeeded(p.econ, salary);
  const pace = p.econ.salesPerMonth;
  const early = p.elapsed < 7;

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Metas de {monthLong(today).split(' de ')[0].toLowerCase()}</h1>
          <p className="page-sub">
            Dia {p.elapsed} de {p.daysInMonth}. {p.daysLeft ? `Faltam ${p.daysLeft} dias.` : 'Último dia do mês.'}
            {g.custom ? ' Metas próprias deste mês.' : ' Usando as metas padrão.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {g.custom && <button className="btn btn-ghost" onClick={() => remove('goals', g.id)}>Voltar ao padrão</button>}
          <button className="btn btn-primary" onClick={() => setEditing(true)}>Definir metas</button>
        </div>
      </header>

      <div className="kpis">
        <GoalCard label="Lucro líquido" actual={p.actual.netProfit} goal={g.profit} projected={p.projected.netProfit} money />
        <GoalCard label="Faturamento" actual={p.actual.revenue} goal={g.revenue} projected={p.projected.revenue} money />
        <GoalCard label="Vendas" actual={p.actual.salesCount} goal={g.sales} projected={p.projected.sales} />
        <GoalCard label="Seu salário (retiradas)" actual={p.actual.withdrawals} goal={g.salary} projected={null} money
          foot={p.projected.netProfit > 0 ? `O lucro projetado cobre ${pct(g.salary > 0 ? p.projected.netProfit / g.salary : 0)} do salário` : 'Ainda sem lucro para retirar'} />
      </div>
      {early && <p className="muted" style={{ fontSize: 13, margin: '-6px 0 16px' }}>Início de mês: a projeção ainda varia bastante. Ela fica mais confiável a partir da segunda semana.</p>}

      <div className="grid grid-1-1" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">Para bater a meta de lucro</h2></div>
          {p.remainingProfit <= 0 ? (
            <div className="empty" style={{ padding: '18px 8px' }}>
              <b className="pos">Meta do mês batida</b>
              Você já lucrou {brl(p.actual.netProfit)}. Tudo que vender daqui em diante é extra.
            </div>
          ) : (
            <>
              <div className="hero-figures" style={{ margin: '4px 0 14px', gap: 28 }}>
                <div><div className="fig-label">Faltam</div><div className="fig-value small num">{brl(p.remainingProfit)}</div></div>
                <div><div className="fig-label">Cerca de</div><div className="fig-value small num">{p.salesToGoal !== null ? `${int(p.salesToGoal)} vendas` : '–'}</div></div>
                <div><div className="fig-label">Por dia</div><div className="fig-value small num">{brl(p.perDay)}</div></div>
              </div>
              <p className="ink2" style={{ fontSize: 14, margin: 0 }}>
                {p.projected.netProfit >= g.profit
                  ? `No ritmo atual você fecha o mês com ${brl(p.projected.netProfit)}: dá para bater a meta.`
                  : `No ritmo atual você fecha o mês com ${brl(p.projected.netProfit)}, ${brl(g.profit - p.projected.netProfit)} abaixo da meta.`}
                {p.econ.profitPerSale > 0 && ` Cada venda deixa em média ${brl(p.econ.profitPerSale)} de lucro.`}
              </p>
              {p.projected.netProfit < g.profit && (
                <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>
                  Para acelerar: anuncie de novo os produtos que mais giram, impulsione o anúncio no fim de semana e ofereça combos para subir o valor de cada venda.
                </p>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">Quanto vender para viver disso</h2></div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <Field label="Salário que você quer por mês">
              <MoneyInput value={salaryField ?? numToField(g.salary)} onChange={setSalaryField} />
            </Field>
            <div className="field">
              <span>Seus gastos fixos por mês</span>
              <div className="input num" style={{ display: 'flex', alignItems: 'center', background: 'transparent' }}>{brl(p.econ.fixedPerMonth)}</div>
            </div>
          </div>
          {need !== null ? (
            <>
              <div className="hero-figures" style={{ margin: '0 0 12px', gap: 28 }}>
                <div><div className="fig-label">Vendas por mês</div><div className="fig-value small num">{int(need)}</div></div>
                <div><div className="fig-label">Por semana</div><div className="fig-value small num">{int(Math.ceil(need / 4.3))}</div></div>
                <div><div className="fig-label">Seu ritmo hoje</div><div className="fig-value small num">{int(Math.round(pace))}/mês</div></div>
              </div>
              <div className="meter" aria-hidden><span style={{ width: `${Math.min(100, (pace / need) * 100)}%` }} /></div>
              <p className="ink2" style={{ fontSize: 14, margin: '10px 0 0' }}>
                {pace >= need
                  ? 'Seu ritmo atual já paga esse salário e os gastos fixos.'
                  : `Você está em ${pct(pace / need)} do caminho. Faltam cerca de ${int(Math.ceil(need - pace))} vendas por mês.`}
              </p>
              <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
                Conta: (gastos fixos {brl(p.econ.fixedPerMonth)} + salário {brl(salary)}) ÷ lucro médio por venda {brl(p.econ.profitPerSale)}. Médias dos últimos {p.econ.basisDays} dias.
              </p>
            </>
          ) : (
            <p className="muted">Registre algumas vendas para o Giro calcular o seu lucro médio por venda.</p>
          )}
        </section>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <h2 className="panel-title">Próximos 3 meses</h2>
          <span className="panel-note">Tendência dos seus meses completos</span>
        </div>
        <MonthlyChart data={series} />
        <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
          A projeção segue a tendência dos últimos meses. Datas como Natal e Black Friday costumam vender acima disso.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Quando recomprar</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => go('ajustes')}>Prazo do fornecedor: {data.settings.supplierLeadDays} dias</button>
        </div>
        {restock.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Produto</th><th className="r">Estoque</th><th className="r">Vende por semana</th><th className="r">Acaba em</th><th>Recomprar até</th><th /></tr></thead>
              <tbody>
                {restock.map((r) => (
                  <tr key={r.id}>
                    <td className="name-cell">
                      <button className="link-btn" onClick={() => open({ kind: 'historico', productId: r.id })}>{r.name}</button>
                    </td>
                    <td className="r">{r.stock}</td>
                    <td className="r">{(r.perDay * 7).toFixed(1).replace('.', ',')}</td>
                    <td className="r">{r.stock === 0 ? 'acabou' : `${Math.round(r.daysLeft)} dias`}</td>
                    <td>
                      {r.status === 'agora' && <span className="badge badge-neg">Recomprar já</span>}
                      {r.status === 'breve' && <span className="badge badge-warn">{dateBR(r.reorderBy)}</span>}
                      {r.status === 'ok' && <span className="badge">{dateBR(r.reorderBy)}</span>}
                    </td>
                    <td><div className="row-actions"><button className="btn btn-sm" onClick={() => open({ kind: 'compra', productId: r.id })}>Comprar</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty" style={{ padding: '20px 8px' }}><b>Sem dados de venda ainda</b>Quando os produtos começarem a vender, o Giro avisa quando recomprar.</div>
        )}
      </section>

      {editing && <GoalForm goal={g} onClose={() => setEditing(false)} />}
    </>
  );
}

function GoalCard({ label, actual, goal, projected, money, foot }: { label: string; actual: number; goal: number; projected: number | null; money?: boolean; foot?: string }) {
  const f = (n: number) => (money ? brl(n) : int(Math.round(n)));
  const ratio = goal > 0 ? actual / goal : 0;
  const projRatio = projected !== null && goal > 0 ? projected / goal : null;
  const onTrack = projRatio !== null && projRatio >= 1;
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value num">{f(actual)}</div>
      <div className="goal-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, ratio) * 100)} aria-label={`${label}: ${pct(ratio)} da meta`}>
        <span style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }} />
        {projRatio !== null && <i style={{ left: `${Math.max(0, Math.min(1, projRatio)) * 100}%` }} title="Projeção" />}
      </div>
      <div className="kpi-foot">{pct(ratio)} de {f(goal)}</div>
      {projected !== null ? (
        <div className="kpi-foot" style={{ marginTop: 2 }}>
          Projeção {f(projected)} <span className={`badge ${onTrack ? 'badge-pos' : 'badge-warn'}`} style={{ marginLeft: 4 }}>{onTrack ? 'no ritmo' : 'abaixo'}</span>
        </div>
      ) : (
        foot && <div className="kpi-foot" style={{ marginTop: 2 }}>{foot}</div>
      )}
    </div>
  );
}

function GoalForm({ goal, onClose }: { goal: MonthGoal & { custom: boolean }; onClose: () => void }) {
  const { upsert, remove, setSettings } = useStore();
  const { toast } = useUI();
  const [profit, setProfit] = useState(numToField(goal.profit));
  const [revenue, setRevenue] = useState(numToField(goal.revenue));
  const [sales, setSales] = useState(String(goal.sales));
  const [salary, setSalary] = useState(numToField(goal.salary));
  const [asDefault, setAsDefault] = useState(!goal.custom);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const v = { profit: parseNum(profit), revenue: parseNum(revenue), sales: Math.round(parseNum(sales)), salary: parseNum(salary) };
    if (asDefault) {
      // vira o padrão: este mês deixa de ter meta própria e segue o padrão
      setSettings({ monthlyProfitGoal: v.profit, monthlyRevenueGoal: v.revenue, monthlySalesGoal: v.sales, desiredSalary: v.salary });
      remove('goals', goal.month);
    } else {
      upsert('goals', { id: goal.month, month: goal.month, ...v });
    }
    toast('Metas salvas');
    onClose();
  };

  return (
    <Modal title="Metas do mês" onClose={onClose}>
      <form onSubmit={save}>
        <div className="form-grid">
          <Field label="Lucro líquido"><MoneyInput value={profit} onChange={setProfit} /></Field>
          <Field label="Faturamento"><MoneyInput value={revenue} onChange={setRevenue} /></Field>
          <Field label="Número de vendas"><NumberInput value={sales} onChange={setSales} suffix="vendas" /></Field>
          <Field label="Seu salário (retirada)"><MoneyInput value={salary} onChange={setSalary} /></Field>
          <label className="check full">
            <input type="checkbox" checked={asDefault} onChange={(e) => setAsDefault(e.target.checked)} />
            Usar também como meta padrão dos próximos meses
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary">Salvar metas</button>
        </div>
      </form>
    </Modal>
  );
}
