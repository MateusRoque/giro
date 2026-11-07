import { useRef, useState } from 'react';
import { Field, MoneyInput, NumberInput } from '../components/Fields';
import { IconTrash } from '../components/Icons';
import { SyncPanel } from '../components/SyncPanel';
import { todayISO } from '../lib/dates';
import { emptyData } from '../lib/defaults';
import { numToField, parseNum } from '../lib/format';
import { NEUTRAL, SWATCHES } from '../lib/palette';
import { exampleData } from '../lib/seed';
import { normalize, uid, useStore } from '../lib/store';
import type { ExpenseCategory, Settings } from '../lib/types';
import { useUI } from '../lib/ui';

export function Ajustes() {
  const { data, setSettings, replaceAll, saveError } = useStore();
  const { toast } = useUI();
  const s = data.settings;

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Ajustes</h1>
          <p className="page-sub">Os parâmetros que o Giro usa para calcular custo, preço e alertas.</p>
        </div>
      </header>

      <div className="grid grid-1-1">
        <SyncPanel />
        <Params
          key={[s.businessName, s.icmsPct, s.targetMarginPct, s.monthlyProfitGoal, s.stalledDays, s.defaultDeliveryCost, s.defaultFeePct, s.supplierLeadDays].join('|')}
          s={s}
          onSave={(p) => { setSettings(p); toast('Ajustes salvos'); }} />
        <Categories cats={s.categories} usedIds={new Set(data.expenses.map((e) => e.categoryId))} onChange={(categories) => setSettings({ categories })} />
        <TextList title="Categorias de produto" items={s.productCategories} placeholder="Nova categoria" onChange={(productCategories) => setSettings({ productCategories })} />
        <TextList title="Canais de venda" items={s.channels} placeholder="Novo canal" onChange={(channels) => setSettings({ channels })} />
        <Backup onImport={(d) => { replaceAll(d); toast('Backup restaurado'); }} saveError={saveError} replaceAll={replaceAll} toast={toast} />
      </div>
    </>
  );
}

function Params({ s, onSave }: { s: Settings; onSave: (p: Partial<Settings>) => void }) {
  const [name, setName] = useState(s.businessName);
  const [icms, setIcms] = useState(numToField(s.icmsPct));
  const [margin, setMargin] = useState(numToField(s.targetMarginPct));
  const [goal, setGoal] = useState(numToField(s.monthlyProfitGoal));
  const [stalled, setStalled] = useState(String(s.stalledDays));
  const [delivery, setDelivery] = useState(numToField(s.defaultDeliveryCost));
  const [fee, setFee] = useState(numToField(s.defaultFeePct));
  const [lead, setLead] = useState(String(s.supplierLeadDays));

  return (
    <section className="panel">
      <div className="panel-head"><h2 className="panel-title">Parâmetros do negócio</h2></div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            businessName: name.trim() || 'Minha revenda',
            icmsPct: parseNum(icms),
            targetMarginPct: Math.min(90, parseNum(margin)),
            monthlyProfitGoal: parseNum(goal),
            stalledDays: Math.max(1, Math.round(parseNum(stalled))),
            defaultDeliveryCost: parseNum(delivery),
            defaultFeePct: parseNum(fee),
            supplierLeadDays: Math.max(0, Math.round(parseNum(lead))),
          });
        }}
      >
        <div className="form-grid">
          <Field label="Nome do negócio" full><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Meta de lucro por mês" hint="As outras metas ficam na tela Metas"><MoneyInput value={goal} onChange={setGoal} /></Field>
          <Field label="Margem líquida desejada" hint="Base do preço sugerido"><NumberInput value={margin} onChange={setMargin} suffix="%" /></Field>
          <Field label="ICMS de importação" hint="RS: 17%. Confira se a regra mudar."><NumberInput value={icms} onChange={setIcms} suffix="%" /></Field>
          <Field label="Produto parado após" hint="Dias sem vender"><NumberInput value={stalled} onChange={setStalled} suffix="dias" /></Field>
          <Field label="Custo de entrega padrão" hint="Sugerido em cada venda"><MoneyInput value={delivery} onChange={setDelivery} /></Field>
          <Field label="Taxa padrão por venda"><NumberInput value={fee} onChange={setFee} suffix="%" /></Field>
          <Field label="Prazo de entrega do fornecedor" hint="Usado para avisar quando recomprar"><NumberInput value={lead} onChange={setLead} suffix="dias" /></Field>
        </div>
        <div className="form-actions"><button className="btn btn-primary">Salvar parâmetros</button></div>
      </form>
    </section>
  );
}

function Categories({ cats, usedIds, onChange }: { cats: ExpenseCategory[]; usedIds: Set<string>; onChange: (c: ExpenseCategory[]) => void }) {
  const [newName, setNewName] = useState('');
  const [picking, setPicking] = useState<string | null>(null);
  const update = (id: string, patch: Partial<ExpenseCategory>) => onChange(cats.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const usedColors = new Set(cats.map((c) => c.color));

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    const color = SWATCHES.find((c) => !usedColors.has(c)) ?? NEUTRAL;
    onChange([...cats, { id: uid(), name, color, kind: 'operacional' }]);
    setNewName('');
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Categorias de gasto</h2>
        <span className="panel-note">A cor aparece na fita do dinheiro</span>
      </div>
      {cats.map((c) => (
        <div key={c.id}>
          <div className="cat-row">
            <button className="color-dot" style={{ background: c.color }} aria-label={`Mudar cor de ${c.name}`} onClick={() => setPicking(picking === c.id ? null : c.id)} />
            <input className="input" value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} aria-label="Nome da categoria" />
            <select className="select" value={c.kind} onChange={(e) => update(c.id, { kind: e.target.value as ExpenseCategory['kind'] })} aria-label="Tipo">
              <option value="operacional">Custo do negócio</option>
              <option value="retirada">Retirada pessoal</option>
            </select>
            <button
              className="btn btn-ghost btn-sm icon-btn btn-danger"
              aria-label={`Apagar ${c.name}`}
              disabled={usedIds.has(c.id)}
              title={usedIds.has(c.id) ? 'Tem gastos nesta categoria' : undefined}
              onClick={() => onChange(cats.filter((x) => x.id !== c.id))}
            >
              <IconTrash />
            </button>
          </div>
          {picking === c.id && (
            <div className="swatches" style={{ padding: '8px 0 4px 32px' }}>
              {SWATCHES.map((sw) => (
                <button key={sw} className="swatch" style={{ background: sw }} aria-pressed={c.color === sw} aria-label={`Cor ${sw}`} onClick={() => { update(c.id, { color: sw }); setPicking(null); }} />
              ))}
            </div>
          )}
        </div>
      ))}
      <form style={{ display: 'flex', gap: 8, marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className="input" placeholder="Nova categoria, ex.: Aluguel do depósito" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn">Adicionar</button>
      </form>
      <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
        "Custo do negócio" diminui o lucro. "Retirada pessoal" é o seu salário: sai do caixa, mas não é custo da revenda.
      </p>
    </section>
  );
}

function TextList({ title, items, placeholder, onChange }: { title: string; items: string[]; placeholder: string; onChange: (x: string[]) => void }) {
  const [v, setV] = useState('');
  return (
    <section className="panel">
      <div className="panel-head"><h2 className="panel-title">{title}</h2></div>
      <div className="chips">
        {items.map((i) => (
          <span className="chip" key={i}>
            {i}
            <button aria-label={`Remover ${i}`} onClick={() => onChange(items.filter((x) => x !== i))}>×</button>
          </span>
        ))}
      </div>
      <form style={{ display: 'flex', gap: 8, marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (t && !items.includes(t)) onChange([...items, t]); setV(''); }}>
        <input className="input" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
        <button className="btn">Adicionar</button>
      </form>
    </section>
  );
}

function Backup({ onImport, saveError, replaceAll, toast }: { onImport: (d: ReturnType<typeof normalize>) => void; saveError: boolean; replaceAll: (d: ReturnType<typeof emptyData>) => void; toast: (m: string) => void }) {
  const { data } = useStore();
  const file = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `giro-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text());
      if (!parsed || typeof parsed !== 'object' || !('settings' in parsed)) throw new Error();
      if (confirm('Substituir todos os dados atuais por este backup?')) onImport(normalize(parsed));
    } catch {
      alert('Este arquivo não é um backup do Giro. Escolha o arquivo .json gerado em "Baixar backup".');
    }
  };

  return (
    <section className="panel">
      <div className="panel-head"><h2 className="panel-title">Seus dados</h2></div>
      <p className="ink2" style={{ fontSize: 14, marginTop: 0 }}>
        Os dados ficam salvos neste aparelho e, se a sincronização estiver ligada, também na sua conta do GitHub. Um backup de vez em quando no Drive ou no WhatsApp é uma segurança extra.
      </p>
      {saveError && <div className="alert">Não foi possível salvar no navegador. Baixe um backup agora para não perder dados.</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <button className="btn btn-primary" onClick={exportJson}>Baixar backup</button>
        <button className="btn" onClick={() => file.current?.click()}>Restaurar backup</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <button className="btn btn-ghost" onClick={() => { if (confirm('Carregar dados de exemplo? Isso substitui seus dados atuais.')) { replaceAll(exampleData()); toast('Dados de exemplo carregados'); } }}>
          Carregar dados de exemplo
        </button>
        <button className="btn btn-ghost btn-danger" onClick={() => { if (confirm('Apagar TODOS os dados? Baixe um backup antes se quiser guardar.')) { replaceAll({ ...emptyData(), settings: data.settings, goals: [] }); toast('Dados apagados'); } }}>
          Apagar todos os dados
        </button>
      </div>
    </section>
  );
}
