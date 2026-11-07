export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayISO = (): string => toISO(new Date());

/** Converte 'AAAA-MM-DD' em data local (sem fuso). */
export const fromISO = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso: string, days: number): string => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
};

export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.UTC(...ymd(toIso)) - Date.UTC(...ymd(fromIso))) / 86_400_000);

const ymd = (iso: string): [number, number, number] => {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m - 1, d];
};

/** 'AAAA-MM' */
export const monthKey = (iso: string): string => iso.slice(0, 7);
