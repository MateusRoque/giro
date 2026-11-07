import { useMemo, useState } from 'react';
import { Field, MoneyInput, NumberInput } from '../components/Fields';
import { avgCostMap, icmsFor, priceOutcome, suggestPrice } from '../lib/calc';
import { brl, numToField, parseNum, pct } from '../lib/format';
import { useStore } from '../lib/store';

export function Precificar() {
  const { data } = useStore();
  const s = data.settings;
  const avg = useMemo(() => avgCostMap(data.purchases), [data.purchases]);

  const [productId, setProductId] = useState('');
  const [cost, setCost] = useState('');
  const [qty, setQty] = useState('1');
  const [shipping, setShipping] = useState('');
  const [imported, setImported] = useState(true);
  const [delivery, setDelivery] = useState(numToField(s.defaultDeliveryCost));
  const [feePct, setFeePct] = useState(numToField(s.defaultFeePct));
  const [margin, setMargin] = useState(s.targetMarginPct);
  const [rival, setRival] = useState('');

  const fromProduct = (id: string) => {
    setProductId(id);
    const c = avg.get(id);
    if (c) {
      setCost(numToField(c));
      setQty('1');
      setShipping('');
      setImported(false);
    }
    const p = data.products.find((x) => x.id === id);
    if (p?.salePrice) setRival(numToField(p.salePrice));
  };

  const q = Math.max(1, Math.round(parseNum(qty)));
  const goods = parseNum(cost) * q;
  const ship = parseNum(shipping);
  const tax = imported ? icmsFor(goods + ship, s.icmsPct) : 0;
  const unit = (goods + ship + tax) / q;
  const base = { unitCost: unit, perSaleCost: parseNum(delivery), feePct: parseNum(feePct) };
  const price = unit > 0 ? suggestPrice({ ...base, marginPct: margin }) : null;
  const out = price ? priceOutcome({ ...base, price }) : null;
  const rivalPrice = parseNum(rival);
  const atRival = rivalPrice > 0 && unit > 0 ? priceOutcome({ ...base, price: rivalPrice }) : null;

  const ladder = unit > 0
    ? [
        ...[25, 35, 45, 55].map((m) => ({ label: `${m}% de margem`, price: suggestPrice({ ...base, marginPct: m }), hl: false })),
        { label: 'Regra do 3x (custo × 3)', price: unit * 3, hl: false },
        ...(rivalPrice > 0 ? [{ label: 'Preço da concorrência', price: rivalPrice, hl: true }] : []),
      ]
        .filter((r): r is { label: string; price: number; hl: boolean } => r.price !== null)
        .sort((a, b) => a.price - b.price)
    : [];

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Precificar</h1>
          <p className="page-sub">Descubra por quanto vender antes de comprar.</p>
        </div>
      </header>

      <div className="grid grid-2-1">
        <section className="panel">
          <div className="form-grid">
            {data.products.length > 0 && (
              <Field label="Usar custo de um produto cadastrado" full>
                <select className="select" value={productId} onChange={(e) => fromProduct(e.target.value)}>
                  <option value="">Produto novo (digitar valores)</option>
                  {data.products.filter((p) => !p.archived).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Preço do produto no fornecedor" hint="Por unidade">
              <MoneyInput value={cost} onChange={setCost} />
            </Field>
            <Field label="Quantidade no pedido">
              <NumberInput value={qty} onChange={setQty} suffix="un." />
            </Field>
            <Field label="Frete do pedido (total)">
              <MoneyInput value={shipping} onChange={setShipping} />
            </Field>
            <Field label="Custo de entrega por venda" hint="Gasolina, embalagem">
              <MoneyInput value={delivery} onChange={setDelivery} />
            </Field>
            <Field label="Taxa por venda">
              <NumberInput value={feePct} onChange={setFeePct} suffix="%" />
            </Field>
            <Field label="Preço da concorrência" hint="Opcional: quanto vendem no Marketplace">
              <MoneyInput value={rival} onChange={setRival} />
            </Field>
            <label className="check full">
              <input type="checkbox" checked={imported} onChange={(e) => setImported(e.target.checked)} />
              Compra internacional: somar ICMS de {s.icmsPct}% ({brl(tax)})
            </label>
            <Field label={`Margem líquida desejada: ${margin}%`} full>
              <input type="range" min={5} max={80} step={1} value={margin} onChange={(e) => setMargin(Number(e.target.value))} style={{ accentColor: 'var(--tape)' }} />
            </Field>
          </div>
        </section>

        <div className="stack">
          <div className="price-hero" aria-live="polite">
            <div className="fig-label">Venda por</div>
            <div className="fig-value num">{price ? brl(price) : '–'}</div>
            <small>
              {out ? `Lucro de ${brl(out.profit)} por unidade, ${out.markup.toFixed(1).replace('.', ',')}× o custo` : unit > 0 ? 'Margem impossível com essa taxa' : 'Preencha o preço do fornecedor'}
            </small>
          </div>

          <section className="panel">
            <div className="list">
              <div className="list-row"><span className="ink2">Custo real por unidade</span><b className="num">{brl(unit)}</b></div>
              <div className="list-row"><span className="ink2">Produto + frete rateado</span><span className="num">{brl((goods + ship) / q)}</span></div>
              <div className="list-row"><span className="ink2">Imposto por unidade</span><span className="num">{brl(tax / q)}</span></div>
              {out && <div className="list-row"><span className="ink2">Taxa na venda</span><span className="num">{brl(out.fee)}</span></div>}
            </div>
          </section>

          {atRival && (
            <section className="panel">
              <div className="panel-head"><h2 className="panel-title">Vendendo pelo preço da concorrência</h2></div>
              <div className="list">
                <div className="list-row"><span className="ink2">Lucro por unidade</span><b className={`num ${atRival.profit < 0 ? 'neg' : 'pos'}`}>{brl(atRival.profit)}</b></div>
                <div className="list-row"><span className="ink2">Margem</span><b className="num">{pct(atRival.margin)}</b></div>
              </div>
              <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>
                {atRival.margin >= s.targetMarginPct / 100
                  ? 'Vale a pena: dá para competir no preço e manter sua margem.'
                  : atRival.profit > 0
                    ? 'Dá lucro, mas abaixo da sua meta. Procure fornecedor mais barato ou um diferencial (combo, entrega rápida).'
                    : 'Não compensa: nesse preço você perde dinheiro.'}
              </p>
            </section>
          )}
        </div>
      </div>

      {ladder.length > 0 && (
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="panel-head"><h2 className="panel-title">Comparar preços</h2></div>
          <div className="ladder">
            {ladder.map((r) => {
              const o = priceOutcome({ ...base, price: r.price });
              return (
                <div className={`ladder-row ${r.hl ? 'hl' : ''}`} key={r.label}>
                  <span>{r.label}</span>
                  <b className="num">{brl(r.price)}</b>
                  <span className={`num ${o.profit < 0 ? 'neg' : 'pos'}`} style={{ minWidth: 120, textAlign: 'right' }}>lucro {brl(o.profit)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
