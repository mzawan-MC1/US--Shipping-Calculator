import { describe, it, expect } from 'vitest';
import { formatCurrency, convertUsdToAed } from '../lib/utils';

describe('Utility Functions', () => {
  it('correctly converts USD to AED based on fixed rate 3.6725', () => {
    expect(convertUsdToAed(1000)).toBe(3673);
    expect(convertUsdToAed(3640)).toBe(13368);
  });

  it('formats currency correctly in USD', () => {
    const formatted = formatCurrency(5000, 'USD');
    expect(formatted).toContain('5,000');
    expect(formatted).toContain('$');
  });

  it('formats currency correctly in AED', () => {
    const formatted = formatCurrency(18363, 'AED');
    expect(formatted).toContain('18,363');
  });
});
