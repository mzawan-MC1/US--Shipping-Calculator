import { describe, it, expect } from 'vitest';
import { dictionaries } from '../i18n/translations';

describe('Bilingual i18n Dictionaries', () => {
  it('contains complete dictionary keys for English and Arabic', () => {
    const enKeys = Object.keys(dictionaries.en);
    const arKeys = Object.keys(dictionaries.ar);

    expect(enKeys.length).toBeGreaterThan(30);
    expect(arKeys.length).toBe(enKeys.length);
  });

  it('provides sensible Arabic placeholder values for essential labels', () => {
    expect(dictionaries.ar.brandName).toBe('فاخر علم');
    expect(dictionaries.ar.calculateShipping).toContain('الشحن');
    expect(dictionaries.ar.whatsappQuote).toContain('واتساب');
    expect(dictionaries.ar.calcStep1Title).toBe('نوع المركبة');
  });
});
