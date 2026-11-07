import type { ReactNode } from 'react';

export function Field({ label, hint, full, children }: { label: string; hint?: ReactNode; full?: boolean; children: ReactNode }) {
  return (
    <label className={`field${full ? ' full' : ''}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/** Campo de dinheiro que aceita vírgula ("39,90"). */
export function MoneyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="input-money">
      <input
        className="input num"
        inputMode="decimal"
        value={value}
        placeholder={placeholder ?? '0,00'}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function NumberInput({ value, onChange, suffix, placeholder }: { value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string }) {
  const input = (
    <input className="input num" inputMode="decimal" value={value} placeholder={placeholder ?? '0'} onChange={(e) => onChange(e.target.value)} />
  );
  return suffix ? (
    <div className="input-suffix">
      {input}
      <em>{suffix}</em>
    </div>
  ) : (
    input
  );
}

export function Figure({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' | '' }) {
  return (
    <div>
      <div className="fig-label">{label}</div>
      <div className={`fig-value num ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

export const toneOf = (n: number): 'pos' | 'neg' | '' => (n > 0.004 ? 'pos' : n < -0.004 ? 'neg' : '');
