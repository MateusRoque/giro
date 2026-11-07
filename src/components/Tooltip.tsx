import type { ReactNode } from 'react';

export interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

/** Tooltip que segue o ponteiro e não sai da tela. */
export function Tooltip({ tip }: { tip: TipState | null }) {
  if (!tip) return null;
  const left = Math.min(tip.x + 14, window.innerWidth - 240);
  const top = Math.max(8, tip.y - 12);
  return (
    <div className="tooltip" role="status" style={{ left, top, transform: 'translateY(-100%)' }}>
      {tip.content}
    </div>
  );
}
