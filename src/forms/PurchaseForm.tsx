import { useState } from 'react';
import { Field, MoneyInput, NumberInput } from '../components/Fields';
import { icmsFor, priceOutcome, suggestPrice } from '../lib/calc';
import { todayISO } from '../lib/dates';
import { brl, numToField, parseNum, pct } from '../lib/format';
import { uid, useStore } from '../lib/store';
import type { Purchase } from '../lib/types';

export function PurchaseForm({ item, productId, onDone, onNewProduct }: { item?: Purchase; productId?: string; onDone: (msg?: string) => void; onNewProduct: () => void }) {
  const { data, upsert } = useStore();
  const s = data.settings;
  const products = data.products.filter((p) => !p.archived || p.id === item?.productId);
  const [pid, setPid] = useState(item?.productId ?? productId ?? products[0]?.id ?? '');
  const [date, setDate] = useState(item?.date ?? todayISO());
  const [qty, setQty] = useState(item ? String(item.qty) : '1');
  const [unitCost, setUnitCost] = useState(numToField(item?.unitCost ?? 0));
  const [shipping, setShipping] = useState(numToField(item?.shipping ?? 0));
  const [taxes, setTaxes] = useState(numToField(item?.taxes ?? 0));
  const [supplier, setSupplier] = useState(item?.supplier ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');

  if (!products.length) {
    return (
      <div className="empty">
        <b>Cadastre um produto primeiro</b>
        A compra dá entrada no estoque de um produto.
        <div><button className="btn btn-primary" onClick={onNewProduct}>Cadastrar produto</button></div>
      </div>
    );
  }

  const q = Math.max(0, Math.round(parseNum(qty)));
  const goods = q * parseNum(unitCost);
  const ship = parseNum(shipping);
  const tax = parseNum(taxes);
  const total = goods + ship + tax;
  const realUnit = q > 0 ? total / q : 0;
  const product = data.products.find((p) => p.id === pid);
  const suggested = realUnit > 0 ? suggestPrice({ unitCost: realUnit, perSaleCost: s.defaultDeliveryCost, feePct: s.defaultFeePct, marginPct: s.targetMarginPct }) : null;
  const atCurrent = product && product.salePrice > 0 && realUnit > 0
    ? priceOutcome({ price: product.salePrice, unitCost: realUnit, perSaleCost: s.defaultDeliveryCost, feePct: s.defaultFeePct })
    : null;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pid || q <= 0) return;
    upsert('purchases', { id: item?.id ?? uid(), productId: pid, date, qty: q, unitCost: parseNum(unitCost), shipping: ship, taxes: tax, supplier: supplier.trim(), notes: notes.trim() });
    onDone(item ? 'Compra atualizada' : `Entrada de ${q} un. no estoque`);
  };

  return (
    <form onSubmit={save}>
      <div className="form-grid">
        <Field label="Produto" full hint={<button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, height: 'auto', color: 'var(--tape)' }} onClick={onNewProduct}>Produto novo? Cadastre aqui</button>}>
          <select className="select" value={pid} onChange={(e) => setPid(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Data da compra">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Quantidade">
          <NumberInput value={qty} onChange={setQty} suffix="un." />
        </Field>
        <Field label="Preço por unidade" hint="Sem frete e sem imposto">
          <MoneyInput value={unitCost} onChange={setUnitCost} />
        </Field>
        <Field label="Frete do pedido (total)">
          <MoneyInput value={shipping} onChange={setShipping} />
        </Field>
        <Field
          label="Impostos do pedido (total)"
          full
          hint={
            <button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, height: 'auto', color: 'var(--tape)' }}
              onClick={() => setTaxes(numToField(icmsFor(goods + ship, s.icmsPct)))}>
              Calcular ICMS de importação ({s.icmsPct}%) sobre produto + frete
            </button>
          }
        >
          <MoneyInput value={taxes} onChange={setTaxes} />
        </Field>
        <Field label="Fornecedor / loja">
          <input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder={product?.supplier || 'Shopee, AliExpress...'} />
        </Field>
        <Field label="Observações">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nº do pedido, prazo..." />
        </Field>
      </div>

      <div className="preview">
        <div><div className="fig-label">Total do pedido</div><div className="fig-value num">{brl(total)}</div></div>
        <div><div className="fig-label">Custo real por unidade</div><div className="fig-value num">{brl(realUnit)}</div></div>
        {suggested && <div><div className="fig-label">Venda por pelo menos</div><div className="fig-value num">{brl(suggested)}</div></div>}
        {atCurrent && (
          <div>
            <div className="fig-label">Margem a {brl(product!.salePrice)}</div>
            <div className={`fig-value num ${atCurrent.profit < 0 ? 'neg' : 'pos'}`}>{pct(atCurrent.margin)}</div>
          </div>
        )}
      </div>
      {suggested && <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>"Venda por pelo menos" garante {s.targetMarginPct}% de margem líquida, já contando {brl(s.defaultDeliveryCost)} de entrega por venda.</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onDone()}>Cancelar</button>
        <button className="btn btn-primary">{item ? 'Salvar compra' : 'Registrar compra'}</button>
      </div>
    </form>
  );
}
