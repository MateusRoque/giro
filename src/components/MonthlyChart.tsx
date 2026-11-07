import { useLayoutEffect, useRef, useState } from 'react';
import type { MonthPoint } from '../lib/calc';
import { brl, brlCompact, monthShort } from '../lib/format';
import { SERIES } from '../lib/palette';
import { Tooltip, type TipState } from './Tooltip';

const C_REV = SERIES[0];
const C_PROFIT = SERIES[2];
const H = 240;
const PAD = { top: 12, right: 8, bottom: 26, left: 58 };

type Point = MonthPoint & { projected?: boolean; partial?: boolean };

/** Barras agrupadas por mês: faturamento e lucro líquido, num único eixo. Meses projetados ficam tracejados. */
export function MonthlyChart({ data }: { data: Point[] }) {
  const hasProjection = data.some((d) => d.projected);
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [tip, setTip] = useState<TipState | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [asTable]);

  const values = data.flatMap((d) => [d.revenue, d.netProfit]);
  const rawMax = Math.max(0, ...values);
  const rawMin = Math.min(0, ...values);
  const { ticks, min, max } = niceScale(rawMin, rawMax);
  const innerW = w - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + ((max - v) / (max - min || 1)) * innerH;
  const band = innerW / data.length;
  const barW = Math.max(6, Math.min(26, band * 0.26));
  const gap = 2;

  const bar = (x: number, v: number, color: string, key: string, projected?: boolean) => {
    const y0 = y(0);
    const y1 = y(v);
    const h = Math.abs(y1 - y0);
    if (h < 0.5) return <rect key={key} x={x} y={y0 - 1} width={barW} height={1} fill={color} opacity={0.5} />;
    const paint = projected
      ? { fill: color, fillOpacity: 0.16, stroke: color, strokeWidth: 1.5, strokeDasharray: '4 3' }
      : { fill: color };
    const r = Math.min(4, h, barW / 2);
    const top = Math.min(y0, y1);
    // ponta arredondada só no lado do dado, base reta no eixo
    const d =
      v >= 0
        ? `M${x},${y0} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${y0} Z`
        : `M${x},${y0} V${top + h - r} Q${x},${top + h} ${x + r},${top + h} H${x + barW - r} Q${x + barW},${top + h} ${x + barW},${top + h - r} V${y0} Z`;
    return <path key={key} d={d} {...paint} />;
  };

  const showTip = (i: number, cx: number, cy: number) => {
    const d = data[i];
    setHover(i);
    setTip({
      x: cx,
      y: cy,
      content: (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            <span style={{ textTransform: 'capitalize' }}>{monthShort(d.month)} {d.month.slice(0, 4)}</span>
            {d.projected && <span className="muted"> (projeção)</span>}
            {d.partial && <span className="muted"> (até hoje)</span>}
          </div>
          <div className="t-row"><i style={{ background: C_REV }} />Faturamento <b className="num" style={{ marginLeft: 'auto' }}>{brl(d.revenue)}</b></div>
          <div className="t-row"><i style={{ background: C_PROFIT }} />Lucro líquido <b className="num" style={{ marginLeft: 'auto' }}>{brl(d.netProfit)}</b></div>
          {!d.projected && <div className="t-row muted">Saídas totais <span className="num" style={{ marginLeft: 'auto' }}>{brl(d.cashOut)}</span></div>}
        </div>
      ),
    });
  };

  return (
    <div className="chart">
      <div className="panel-head">
        <div className="chart-legend">
          <span><i style={{ background: C_REV }} />Faturamento</span>
          <span><i style={{ background: C_PROFIT }} />Lucro líquido</span>
          {hasProjection && <span><i style={{ border: '1.5px dashed var(--ink-2)', background: 'transparent' }} />Projeção</span>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable}>
          {asTable ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>

      {asTable ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Mês</th><th className="r">Faturamento</th><th className="r">Lucro líquido</th><th className="r">Saídas</th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.month}>
                  <td><span style={{ textTransform: 'capitalize' }}>{monthShort(d.month)} {d.month.slice(0, 4)}</span>{d.projected && <span className="muted"> (projeção)</span>}</td>
                  <td className="r">{brl(d.revenue)}</td>
                  <td className={`r ${d.netProfit < 0 ? 'neg' : ''}`}>{brl(d.netProfit)}</td>
                  <td className="r">{d.projected ? '–' : brl(d.cashOut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrap} onMouseLeave={() => { setTip(null); setHover(null); }}>
          <svg width={w} height={H} role="img" aria-label="Faturamento e lucro líquido por mês">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#3a4150' : '#222833'} strokeWidth={1} />
                <text x={PAD.left - 10} y={y(t) + 4} textAnchor="end">{brlCompact(t)}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = PAD.left + band * i + band / 2;
              return (
                <g key={d.month}>
                  {hover === i && <rect x={cx - band / 2 + 2} y={PAD.top} width={band - 4} height={innerH} fill="rgba(255,255,255,0.035)" rx={6} />}
                  {bar(cx - barW - gap / 2, d.revenue, C_REV, 'r', d.projected)}
                  {bar(cx + gap / 2, d.netProfit, C_PROFIT, 'p', d.projected)}
                  <text x={cx} y={H - 6} textAnchor="middle" style={{ textTransform: 'capitalize' }}>{monthShort(d.month)}</text>
                  <rect
                    x={cx - band / 2}
                    y={PAD.top}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${monthShort(d.month)}: faturamento ${brl(d.revenue)}, lucro ${brl(d.netProfit)}`}
                    onMouseMove={(e) => showTip(i, e.clientX, e.clientY)}
                    onFocus={(e) => {
                      const r = (e.target as SVGRectElement).getBoundingClientRect();
                      showTip(i, r.left + r.width / 2, r.top + 20);
                    }}
                    onBlur={() => { setTip(null); setHover(null); }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

function niceScale(min: number, max: number) {
  if (max === min) max = min + 100;
  const span = max - min;
  const rough = span / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
  return { ticks, min: lo, max: hi };
}
