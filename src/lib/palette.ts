/**
 * Paleta categórica validada para o fundo escuro (#171B22): ordem fixa,
 * passa nos testes de daltonismo e contraste. Nunca gere cores novas:
 * o que passar de 8 vira "Outros" (cinza).
 */
export const SERIES = [
  '#3987e5', // azul
  '#d95926', // laranja
  '#199e70', // água
  '#c98500', // amarelo
  '#d55181', // magenta
  '#008300', // verde
  '#9085e9', // violeta
  '#e66767', // vermelho
] as const;

export const NEUTRAL = '#6b7385';

export const SWATCHES = [...SERIES, NEUTRAL];
