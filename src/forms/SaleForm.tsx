import { useState } from 'react';
import { Field, MoneyInput, NumberInput } from '../components/Fields';
import { avgCostMap, stockMap } from '../lib/calc';
import { todayISO } from '../lib/dates';
import { brl, numToField, parseNum, pct } from '../lib/format';
import { uid, useStore } from '../lib/store';
import type { Sale } from '../lib/types';

export function SaleForm({ item, productId, onDone, onNewProduct }: { item?: Sale; productId?: string; onDone: (msg?: string) => void; onNewProduct: () => void }) {
  const { data, upsert } = useStore();
  const s = data.settings;
  const stock = stockMap(data.purchases, data.sales);
  const avg = avgCostMap(data.purchases);
  const products = data.products
    .filter((p) => !p.archived || p.id === item?.productId)
    .sort((a, b) => (stock.get(b.id) ?? 0) - (stock.get(a.id) ?? 0));

  const firstId = item?.productId ?? productId ?? products[0]?.id ?? '';
  const first = data.products.find((p) => p.id === firstId);
  const [pid, setPid] = useState(firstId);
  const [date, setDate] = useState(item?.date ?? todayISO());
  const [qty, setQty] = useState(item ? String(item.qty) : '1');
  const [price, setPrice] = useState(numToField(item?.unitPrice ?? first?.salePrice ?? 0));
  const [delivery, setDelivery] = useState(numToField(item?.deliveryCost ?? s.defaultDeliveryCost));
  const [fee, setFee] = useState(numToField(item?.fee ?? ((first?.salePrice ?? 0) * s.defaultFeePct) / 100));
  const [channel, setChannel] = useState(item?.channel ?? s.channels[0] ?? 'Marketplace');
  const [customer, setCustomer] = useState(item?.customer ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');

  if (!products.length) {
    return (
      <div className="empty">
        <b>Cadastre um produto primeiro</b>
        Toda venda é de um produto do seu estoque.
        <div><button className="btn btn-primary" onClick={onNewProduct}>Cadastrar produto</button></div>
      </div>
    );
  }

  const pick = (id: string) => {
    setPid(id);
    const p = data.products.find((x) => x.id === id);
    if (p && !item) {
      setPrice(numToField(p.salePrice));
      setFee(numToField((p.salePrice * s.defaultFeePct) / 100));
    }
  };

  const q = Math.max(0, Math.round(parseNum(qty)));
  const revenue = q * parseNum(price);
  const cost = q * (avg.get(pid) ?? 0);
  const profit = revenue - parseNum(fee) - parseNum(delivery) - cost;
  const available = (stock.get(pid) ?? 0) + (item && item.productId === pid ? item.qty : 0);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pid || q <= 0) return;
    upsert('sales', {
      id: item?.id ?? uid(), productId: pid, date, qty: q, unitPrice: parseNum(price),
      deliveryCost: parseNum(delivery), fee: parseNum(fee), channel, customer: customer.trim(), notes: notes.trim(),
    });
    onDone(item ? 'Venda atualizada' : `Venda registrada: lucro de ${brl(profit)}`);
  };

  return (
    <form onSubmit={save}>
      <div className="form-grid">
        <Field label="Produto" full>
          <select className="select" value={pid} onChange={(e) => pick(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({stock.get(p.id) ?? 0} em estoque)</option>
            ))}
          </select>
        </Field>
        <Field label="Data da venda">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Quantidade">
          <NumberInput value={qty} onChange={setQty} suffix="un." />
        </Field>
        <Field label="Preço vendido (por unidade)" hint="O valor que o cliente pagou, depois do desconto">
          <MoneyInput value={price} onChange={setPrice} />
        </Field>
        <Field label="Canal">
          <select className="select" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {s.channels.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Custo da entrega" hint="Gasolina, embalagem desta venda">
          <MoneyInput value={delivery} onChange={setDelivery} />
        </Field>
        <Field label="Taxas" hint="Maquininha, Pix com taxa...">
          <MoneyInput value={fee} onChange={setFee} />
        </Field>
        <Field label="Cliente">
          <input className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Opcional" />
        </Field>
        <Field label="Observações">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
        </Field>
      </div>

      {q > available && (
        <div className="alert">Você tem só {available} un. no estoque. Se comprou mais, registre a compra para o custo ficar certo.</div>
      )}

      <div className="preview">
        <div><div className="fig-label">Recebido</div><div className="fig-value num">{brl(revenue)}</div></div>
        <div><div className="fig-label">Custo da mercadoria</div><div className="fig-value num">{brl(cost)}</div></div>
        <div><div className="fig-label">Lucro desta venda</div><div className={`fig-value num ${profit < 0 ? 'neg' : 'pos'}`}>{brl(profit)}</div></div>
        <div><div className="fig-label">Margem</div><div className="fig-value num">{pct(revenue > 0 ? profit / revenue : 0)}</div></div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onDone()}>Cancelar</button>
        <button className="btn btn-primary">{item ? 'Salvar venda' : 'Registrar venda'}</button>
      </div>
    </form>
  );
}
