import { useState } from 'react';
import { Field, MoneyInput } from '../components/Fields';
import { todayISO } from '../lib/dates';
import { numToField, parseNum } from '../lib/format';
import { uid, useStore } from '../lib/store';
import type { Expense } from '../lib/types';

export function ExpenseForm({ item, productId, onDone }: { item?: Expense; productId?: string; onDone: (msg?: string) => void }) {
  const { data, upsert } = useStore();
  const cats = data.settings.categories;
  const [pid, setPid] = useState(item?.productId ?? productId ?? '');
  const [date, setDate] = useState(item?.date ?? todayISO());
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? cats[0]?.id ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [amount, setAmount] = useState(numToField(item?.amount ?? 0));
  const cat = cats.find((c) => c.id === categoryId);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseNum(amount);
    if (value <= 0 || !categoryId) return;
    upsert('expenses', { id: item?.id ?? uid(), date, categoryId, description: description.trim(), amount: value, productId: pid || undefined });
    onDone(item ? 'Gasto atualizado' : 'Gasto registrado');
  };

  return (
    <form onSubmit={save}>
      <div className="form-grid">
        <Field label="Valor">
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Data">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field
          label="Categoria"
          full
          hint={cat?.kind === 'retirada' ? 'Retirada pessoal sai do caixa, mas não diminui o lucro do negócio.' : 'Você cria e edita categorias em Ajustes.'}
        >
          <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Descrição" full>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Gasolina das entregas da semana" />
        </Field>
        {data.products.length > 0 && (
          <Field label="Ligado a um produto (opcional)" full hint="Ex.: bateria extra ou anúncio só deste produto. Entra no total investido e no lucro dele.">
            <select className="select" value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">Não, é um gasto geral do negócio</option>
              {data.products.filter((p) => !p.archived || p.id === pid).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
      </div>
      <p className="muted" style={{ fontSize: 13, margin: '14px 0 0' }}>
        Compras de mercadoria não entram aqui: registre-as em Compras, para o custo ir para o produto certo.
      </p>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onDone()}>Cancelar</button>
        <button className="btn btn-primary">{item ? 'Salvar gasto' : 'Registrar gasto'}</button>
      </div>
    </form>
  );
}
