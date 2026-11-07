import { useMemo, useState } from 'react';
import { IconEdit, IconTrash } from '../components/Icons';
import { PeriodPicker } from '../components/PeriodPicker';
import { getPeriod, inPeriod, purchaseTotal, purchaseUnitCost, sum, type PeriodKey } from '../lib/calc';
import { brl, dateBR, int } from '../lib/format';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';

export function Compras({ periodKey, setPeriodKey }: { periodKey: PeriodKey; setPeriodKey: (k: PeriodKey) => void }) {
  const { data, remove } = useStore();
  const { open, toast } = useUI();
  const [q, setQ] = useState('');
  const period = getPeriod(periodKey);
  const names = useMemo(() => new Map(data.products.map((p) => [p.id, p.name])), [data.products]);

  const rows = data.purchases
    .filter((p) => inPeriod(p.date, period))
    .filter((p) => !q || `${names.get(p.productId) ?? ''} ${p.supplier} ${p.notes}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const goods = sum(rows.map((p) => p.qty * p.unitCost));
  const ship = sum(rows.map((p) => p.shipping));
  const taxes = sum(rows.map((p) => p.taxes));

  const del = (id: string) => {
    if (confirm('Apagar esta compra? As unidades saem do estoque e o custo médio é recalculado.')) {
      remove('purchases', id);
      toast('Compra apagada');
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-sub">Cada pedido nos fornecedores dá entrada no estoque e define o custo real.</p>
        </div>
        <button className="btn btn-primary" onClick={() => open({ kind: 'compra' })}>Registrar compra</button>
      </header>

      <section className="panel">
        <div className="toolbar">
          <PeriodPicker value={periodKey} onChange={setPeriodKey} />
          <input className="input search" placeholder="Buscar produto ou fornecedor" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>

        <div className="totals">
          <div><div className="fig-label">Total investido</div><div className="fig-value num">{brl(goods + ship + taxes)}</div></div>
          <div><div className="fig-label">Mercadoria</div><div className="fig-value num">{brl(goods)}</div></div>
          <div><div className="fig-label">Fretes</div><div className="fig-value num">{brl(ship)}</div></div>
          <div><div className="fig-label">Impostos</div><div className="fig-value num">{brl(taxes)}</div></div>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Data</th><th>Produto</th><th className="r">Qtd</th><th className="r">Preço un.</th><th className="r">Frete</th><th className="r">Imposto</th><th className="r">Total</th><th className="r">Custo real un.</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="num">{dateBR(p.date)}</td>
                    <td className="name-cell">{names.get(p.productId) ?? 'Produto apagado'}{(p.supplier || p.notes) && <span className="sub">{[p.supplier, p.notes].filter(Boolean).join(', ')}</span>}</td>
                    <td className="r">{int(p.qty)}</td>
                    <td className="r">{brl(p.unitCost)}</td>
                    <td className="r">{brl(p.shipping)}</td>
                    <td className="r">{brl(p.taxes)}</td>
                    <td className="r">{brl(purchaseTotal(p))}</td>
                    <td className="r"><b>{brl(purchaseUnitCost(p))}</b></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm icon-btn" aria-label="Editar compra" onClick={() => open({ kind: 'compra', item: p })}><IconEdit /></button>
                        <button className="btn btn-ghost btn-sm icon-btn btn-danger" aria-label="Apagar compra" onClick={() => del(p.id)}><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>Nenhuma compra neste período</b>
            Registre os pedidos da Shopee, AliExpress e outras lojas.
          </div>
        )}
      </section>
    </>
  );
}
