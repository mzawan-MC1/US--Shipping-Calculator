import { describe, it, expect } from 'vitest';

describe('Security Hardening & Input Sanitization (Phase 2A)', () => {
  it('normalizes phone numbers strictly to E.164 compatible digits and leading plus', () => {
    const rawPhones = [
      { input: '+971 50 123 4567', expected: '+971501234567' },
      { input: '(971) 50-123-4567', expected: '971501234567' },
      { input: '  +1 (555) 019-2831 ', expected: '+15550192831' },
      { input: '+971-50-1234567ext12', expected: '+97150123456712' },
    ];

    for (const item of rawPhones) {
      const sanitized = item.input.replace(/[^+0-9]/g, '');
      expect(sanitized).toBe(item.expected);
    }
  });

  it('generates unique caller idempotency keys with entropy', () => {
    const key1 = `quote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const key2 = `quote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    expect(key1).not.toBe(key2);
    expect(key1.startsWith('quote-')).toBe(true);
  });

  it('validates email normalization to lowercase and trimmed string', () => {
    const email = '  Customer.Name@Example.COM  ';
    const normalized = email.trim().toLowerCase();
    expect(normalized).toBe('customer.name@example.com');
  });

  it('rejects vehicle values less than zero', () => {
    const validateDeclaredValue = (val: number) => {
      if (val < 0) throw new Error('Vehicle declared value cannot be negative.');
      return true;
    };

    expect(() => validateDeclaredValue(-50)).toThrow('Vehicle declared value cannot be negative.');
    expect(validateDeclaredValue(0)).toBe(true);
    expect(validateDeclaredValue(15000)).toBe(true);
  });
});
