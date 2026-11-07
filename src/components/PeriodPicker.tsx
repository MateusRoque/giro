import { PERIOD_OPTIONS, type PeriodKey } from '../lib/calc';

export function PeriodPicker({ value, onChange }: { value: PeriodKey; onChange: (k: PeriodKey) => void }) {
  return (
    <div className="seg" role="group" aria-label="Período">
      {PERIOD_OPTIONS.map((o) => (
        <button key={o.key} aria-pressed={value === o.key} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
