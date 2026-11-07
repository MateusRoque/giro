import { describe, expect, it } from 'vitest';
import { emptyData } from './defaults';
import { decide } from './sync';

const at = (updatedAt: number) => ({ ...emptyData(), updatedAt });

describe('sincronização', () => {
  it('baixa quando a nuvem é mais nova', () => {
    expect(decide(at(100), at(200))).toBe('pull');
  });
  it('envia quando este aparelho é mais novo', () => {
    expect(decide(at(300), at(200))).toBe('push');
  });
  it('envia quando ainda não existe nada na nuvem', () => {
    expect(decide(at(1), null)).toBe('push');
  });
  it('não faz nada quando são iguais', () => {
    expect(decide(at(5), at(5))).toBe('none');
  });
});
