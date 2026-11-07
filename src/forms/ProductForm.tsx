import { useState } from 'react';
import { Field, MoneyInput } from '../components/Fields';
import { avgCostMap, priceOutcome, suggestPrice } from '../lib/calc';
import { todayISO } from '../lib/dates';
import { brl, numToField, parseNum, pct } from '../lib/format';
import { uid, useStore } from '../lib/store';
import type { Product } from '../lib/types';

export function ProductForm({ item, onDone }: { item?: Product; onDone: (msg?: string) => void }) {
  const { data, upsert } = useStore();
  const s = data.settings;
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? s.productCategories[0] ?? '');
  const [supplier, setSupplier] = useState(item?.supplier ?? '');
  const [link, setLink] = useState(item?.link ?? '');
  const [price, setPrice] = useState(numToField(item?.salePrice ?? 0));
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [archived, setArchived] = useState(item?.archived ?? false);

  const cost = item ? avgCostMap(data.purchases).get(item.id) ?? 0 : 0;
  const salePrice = parseNum(price);
  const suggested = cost > 0 ? suggestPrice({ unitCost: cost, perSaleCost: s.defaultDeliveryCost, feePct: s.defaultFeePct, marginPct: s.targetMarginPct }) : null;
  const outcome = cost > 0 && salePrice > 0 ? priceOutcome({ price: salePrice, unitCost: cost, perSaleCost: s.defaultDeliveryCost, feePct: s.defaultFeePct }) : null;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    upsert('products', {
      id: item?.id ?? uid(),
      name: name.trim(),
      category,
      supplier: supplier.trim(),
      link: link.trim(),
      salePrice,
      notes: notes.trim(),
      createdAt: item?.createdAt ?? todayISO(),
      archived,
    });
    onDone(item ? 'Produto atualizado' : 'Produto cadastrado');
  };

  return (
    <form onSubmit={save}>
      <div className="form-grid">
        <Field label="Nome do produto" full>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Parafusadeira de impacto 2 baterias" required />
        </Field>
        <Field label="Categoria">
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {s.productCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Preço de venda" hint="Quanto você anuncia. Pode mudar depois.">
          <MoneyInput value={price} onChange={setPrice} />
        </Field>
        <Field label="Fornecedor">
          <input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Shopee, AliExpress, loja..." />
        </Field>
        <Field label="Link do fornecedor">
          <input className="input" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Observações" full>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Variação, cor, cuidados, ideias de combo..." />
        </Field>
        {item && (
          <label className="check full">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            Arquivar (não vendo mais este produto)
          </label>
        )}
      </div>

      {cost > 0 && (
        <div className="preview">
          <div><div className="fig-label">Custo real médio</div><div className="fig-value num">{brl(cost)}</div></div>
          {outcome && (
            <div><div className="fig-label">Lucro por unidade</div><div className={`fig-value num ${outcome.profit < 0 ? 'neg' : 'pos'}`}>{brl(outcome.profit)}</div></div>
          )}
          {outcome && (
            <div><div className="fig-label">Margem</div><div className="fig-value num">{pct(outcome.margin)}</div></div>
          )}
          {suggested && (
            <div>
              <div className="fig-label">Preço para {s.targetMarginPct}% de margem</div>
              <div className="fig-value num">{brl(suggested)}</div>
            </div>
          )}
        </div>
      )}
      {!item && <p className="muted" style={{ fontSize: 13, margin: '14px 0 0' }}>Depois de cadastrar, registre uma compra para dar entrada no estoque.</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onDone()}>Cancelar</button>
        <button className="btn btn-primary">{item ? 'Salvar produto' : 'Cadastrar produto'}</button>
      </div>
    </form>
  );
}
