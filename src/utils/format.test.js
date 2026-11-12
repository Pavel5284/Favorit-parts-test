import { describe, expect, it } from 'vitest';
import { formatPrice, formatShipment } from './format';

describe('formatPrice', () => {
  it('без цены показывает прочерк, а не 0', () => {
    expect(formatPrice(null)).toBe('—');
  });
  it('форматирует рубли по-русски', () => {
    expect(formatPrice(1250)).toMatch(/1\s?250/);
    expect(formatPrice(1250)).toContain('₽');
  });
});

describe('formatShipment', () => {
  it('пустая дата 1С и мусор не показываются', () => {
    expect(formatShipment('')).toBe('');
    expect(formatShipment('0001-01-01T00:00:00')).toBe('');
    expect(formatShipment('не дата')).toBe('');
  });
  it('показывает дату и время, до которого нужно заказать', () => {
    const text = formatShipment('2026-11-12T16:00:00');
    expect(text).toMatch(/12/);
    expect(text).toContain('16:00');
  });
});
