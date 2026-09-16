import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '../services/adminService';
import { supabase } from '../lib/supabase';

describe('Admin Dashboard Empty State & Live Queries (Phase 2B Baseline)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly handles zero data state across all administrative tables post-cleanup', async () => {
    vi.spyOn(supabase, 'from').mockImplementation((_table: string) => {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const [quotations, routes] = await Promise.all([
      adminService.getQuotations(),
      adminService.getRoutes(),
    ]);

    expect(quotations).toEqual([]);
    expect(routes).toEqual([]);
  });

  it('throws retryable error when quotations query fails instead of returning fake empty data', async () => {
    vi.spyOn(supabase, 'from').mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Network connection lost' },
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    });

    await expect(adminService.getQuotations()).rejects.toThrow(/Network connection lost/i);
  });

  it('throws retryable error when customers query fails', async () => {
    vi.spyOn(supabase, 'from').mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database query failure' },
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    });

    await expect(adminService.getCustomers()).rejects.toThrow(/Database query failure/i);
  });

  it('loads exchange rate cleanly without demo fallback', async () => {
    vi.spyOn(supabase, 'from').mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { rate: 3.6725, effective_from: '2026-09-16T00:00:00Z' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const exchangeRate = await adminService.getExchangeRate();
    expect(exchangeRate.rate).toBe(3.6725);
    expect(exchangeRate.updatedAt).toBe('2026-09-16T00:00:00Z');
  });
});
