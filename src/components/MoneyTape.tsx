import { useState } from 'react';
import type { FlowItem } from '../lib/calc';
import { brl, pct } from '../lib/format';
import { Tooltip, type TipState } from './Tooltip';

/** A "fita do dinheiro": cada real que saiu no período, dividido por destino. */
export function MoneyTape({ items }: { items: FlowItem[] }) {
  const [tip, setTip] = useState<TipState | null>(null);
  const total = items.reduce((a, i) => a + i.amount, 0);

  if (total <= 0) {
    return <div className="tape-empty">Nenhuma saída de dinheiro neste período</div>;
  }

  const show = (i: FlowItem, x: number, y: number) =>
    setTip({
      x,
      y,
      content: (
        <div className="t-row">
          <i style={{ background: i.color }} />
          <span>{i.label}</span>
          <b className="num">{brl(i.amount)}</b>
          <span className="muted num">{pct(i.amount / total)}</span>
        </div>
      ),
    });

  const ranked = [...items].sort((a, b) => b.amount - a.amount);

  return (
    <>
      <div className="tape" role="img" aria-label={`Saídas do período: ${ranked.map((i) => `${i.label} ${brl(i.amount)}`).join(', ')}`}>
        {items.map((i) => (
          <button
            key={i.key}
            className="tape-seg"
            style={{ flexGrow: i.amount, flexBasis: 0, background: i.color }}
            aria-label={`${i.label}: ${brl(i.amount)} (${pct(i.amount / total)})`}
            onMouseMove={(e) => show(i, e.clientX, e.clientY)}
            onMouseLeave={() => setTip(null)}
            onFocus={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              show(i, r.left + r.width / 2, r.top);
            }}
            onBlur={() => setTip(null)}
          />
        ))}
      </div>
      <div className="flow-legend">
        {ranked.map((i) => (
          <div className="flow-item" key={i.key}>
            <i style={{ background: i.color }} />
            <span>{i.label}</span>
            <span className="num">
              <b>{brl(i.amount)}</b>
              <span className="share">{pct(i.amount / total)}</span>
            </span>
          </div>
        ))}
      </div>
      <Tooltip tip={tip} />
    </>
  );
}
