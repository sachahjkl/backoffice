import { describe, expect, it } from 'vitest';

import {
  calculateLineTotalCents,
  calculateLineSummary,
  formatDecimal,
  formatFixedDecimal,
  parseFixedDecimal,
} from './quote-input';

describe('quote input conversion', () => {
  it('parses localized fixed decimals without floating-point arithmetic', () => {
    expect(parseFixedDecimal('1,500', 3)).toBe(1_500);
    expect(parseFixedDecimal('19.99', 2)).toBe(1_999);
    expect(parseFixedDecimal('20', 2)).toBe(2_000);
  });

  it('rejects ambiguous or excessive precision', () => {
    expect(parseFixedDecimal('1e3', 3)).toBeUndefined();
    expect(parseFixedDecimal('-1', 3)).toBeUndefined();
    expect(parseFixedDecimal('1.0001', 3)).toBeUndefined();
    expect(parseFixedDecimal('1,2.3', 3)).toBeUndefined();
  });

  it('formats stored units for editing', () => {
    expect(formatFixedDecimal(1_500, 3)).toBe('1.500');
    expect(formatFixedDecimal(1_999, 2)).toBe('19.99');
    expect(formatFixedDecimal(1_999, 2, ',')).toBe('19,99');
  });

  it('removes insignificant zeroes from quantities', () => {
    expect(formatDecimal(1_000, 3)).toBe('1');
    expect(formatDecimal(1_500, 3, ',')).toBe('1,5');
    expect(formatDecimal(10_000, 3)).toBe('10');
  });

  it('calculates a line total from editable decimal values', () => {
    expect(calculateLineTotalCents('1,5', '100.00', '20')).toBe(18_000);
    expect(calculateLineTotalCents('1', '10.01', '5.5')).toBe(1_056);
    expect(calculateLineTotalCents('', '100.00', '20')).toBeUndefined();
  });

  it('calculates the document summary from editable lines', () => {
    expect(
      calculateLineSummary([
        { quantity: '1', unitPrice: '100', vatRate: '20' },
        { quantity: '2', unitPrice: '25', vatRate: '10' },
      ]),
    ).toEqual({ netTotalCents: 15_000, vatTotalCents: 2_500, totalCents: 17_500 });
  });
});
