import type { SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const IconPainel = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 19V10M10 19V5M16 19v-6M22 19H2" /></svg>
);
export const IconVendas = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 7h18l-2 11H5L3 7Z" /><path d="M8 7a4 4 0 0 1 8 0" /></svg>
);
export const IconEstoque = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></svg>
);
export const IconCompras = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 4h2l2.4 11h11L21 7H6.3" /><circle cx="9" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></svg>
);
export const IconGastos = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></svg>
);
export const IconPreco = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="8" cy="8" r="1.5" /></svg>
);
export const IconAjustes = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
);
export const IconMetas = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></svg>
);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2.2, ...p })}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconEdit = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 15, height: 15, ...p })}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /></svg>
);
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 15, height: 15, ...p })}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconLink = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 14, height: 14, ...p })}><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" /></svg>
);
