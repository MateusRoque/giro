import { fromISO } from './dates';

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompactFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

export const brl = (n: number): string => brlFmt.format(Number.isFinite(n) ? n : 0);
export const brlCompact = (n: number): string =>
  Math.abs(n) < 1000 ? brlFmt.format(Math.round(n)).replace(/,00$/, '') : brlCompactFmt.format(n);
export const int = (n: number): string => intFmt.format(n);
export const pct = (ratio: number): string => pctFmt.format(Number.isFinite(ratio) ? ratio : 0);

export const dateBR = (iso: string): string =>
  fromISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

export const monthShort = (monthKey: string): string => {
  const d = fromISO(`${monthKey}-01`);
  return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
};

export const monthLong = (iso: string): string => {
  const s = fromISO(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Lê números digitados no padrão brasileiro: "1.234,56", "39,9", "39.90". */
export const parseNum = (raw: string): number => {
  let s = raw.trim().replace(/[R$\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** Número → texto para campos de formulário ("39,9"). */
export const numToField = (n: number): string => (n ? String(Math.round(n * 100) / 100).replace('.', ',') : '');
