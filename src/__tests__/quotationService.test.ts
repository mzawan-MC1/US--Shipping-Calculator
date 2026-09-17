import { describe, it, expect, beforeEach, vi } from 'vitest';
import { quotationService } from '../services/quotationService';
import { CalculatorFormData } from '../types/calculator';
import { supabase } from '../lib/supabase';

describe('QuotationService (Phase 2A)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('generates a complete quotation with valid references and range towing', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        success: true,
        is_idempotent_replay: false,
        quotation_id: '11111111-1111-1111-1111-111111111111',
        quotation_reference: 'QT-20260917-ABCDEF',
        enquiry_reference: 'ENQ-20260917-123456',
        snapshot: {
          quotation_reference: 'QT-20260917-ABCDEF',
          enquiry_reference: 'ENQ-20260917-123456',
          disclaimer: 'Statutory UAE Customs Duty (5%) and Import VAT (5%) are calculated on CIF valuation.',
          financials: {
            subtotal_ocean_freight: 1250,
            towing_fee_min: 350,
            towing_fee_max: 550,
            is_towing_range: true,
            customs_duty_min: 680,
            customs_duty_max: 690,
            import_vat_min: 714,
            import_vat_max: 724.5,
            total_charges_usd_min: 3494,
            total_charges_usd_max: 3714.5,
            total_charges_aed_min: 12831.72,
            total_charges_aed_max: 13641.5,
          },
          line_items: [],
          route: {
            origin_port_name: 'Port of Savannah',
            destination_port_name: 'Port of Khor Fakkan',
          },
          rules: [],
        },
      },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const input: CalculatorFormData = {
      vehicleType: 'sedan',
      powertrain: 'petrol',
      purchaseSource: 'copart',
      loadingPort: 'savannah',
      destinationPort: 'khorfakkan',
      buyingPrice: 12000,
      towFromLocation: 'Copart Atlanta South',
      customerName: 'Ahmad Al Mansoori',
      customerPhone: '+971501234567',
      customerEmail: 'ahmad@example.com',
    };

    const quote = await quotationService.calculateQuote(input);

    expect(quote).toBeDefined();
    expect(quote.referenceNumber).toMatch(/^QT-/);
    expect(quote.enquiryReference).toMatch(/^ENQ-/);
    expect(quote.oceanFreight).toBeGreaterThan(0);
    expect(quote.customsDuty).toBeGreaterThan(0);
    expect(quote.vat).toBeGreaterThan(0);
    expect(quote.totalChargesUsd).toBeGreaterThan(0);
    expect(quote.totalChargesAed).toBeGreaterThan(0);
    expect(quote.disclaimer).toBeDefined();

    // Verify session persistence
    const active = quotationService.getActiveQuote();
    expect(active?.referenceNumber).toBe(quote.referenceNumber);
  });

  it('handles vehicle without towing gracefully', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        success: true,
        is_idempotent_replay: false,
        quotation_id: '22222222-2222-2222-2222-222222222222',
        quotation_reference: 'QT-20260917-RASHID',
        enquiry_reference: 'ENQ-20260917-RASHID',
        snapshot: {
          quotation_reference: 'QT-20260917-RASHID',
          enquiry_reference: 'ENQ-20260917-RASHID',
          disclaimer: 'Statutory UAE Customs Duty (5%) and Import VAT (5%) are calculated on CIF valuation.',
          financials: {
            subtotal_ocean_freight: 1250,
            towing_fee_min: 0,
            towing_fee_max: 0,
            is_towing_range: false,
            customs_duty_min: 1062.5,
            customs_duty_max: 1062.5,
            import_vat_min: 1115.63,
            import_vat_max: 1115.63,
            total_charges_usd_min: 3778.13,
            total_charges_usd_max: 3778.13,
            total_charges_aed_min: 13875.18,
            total_charges_aed_max: 13875.18,
          },
          line_items: [],
          route: {
            origin_port_name: 'Port of Houston',
            destination_port_name: 'Port of Jebel Ali',
          },
          rules: [],
        },
      },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const input: CalculatorFormData = {
      vehicleType: 'suv',
      powertrain: 'hybrid',
      purchaseSource: 'manheim',
      loadingPort: 'houston',
      destinationPort: 'jebel_ali',
      buyingPrice: 20000,
      customerName: 'Rashid Khan',
      customerPhone: '+971559876543',
    };

    const quote = await quotationService.calculateQuote(input);
    expect(quote.referenceNumber).toBeDefined();
    expect(quote.totalChargesUsd).toBeGreaterThan(0);
  });

  it('throws a clean error and never falls back to mock data when RPC fails', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Database calculation timeout',
        details: '',
        hint: '',
        code: 'P0001',
        name: 'PostgrestError',
      },
      count: null,
      status: 500,
      statusText: 'Internal Server Error',
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const input: CalculatorFormData = {
      vehicleType: 'sedan',
      powertrain: 'petrol',
      purchaseSource: 'copart',
      loadingPort: 'savannah',
      destinationPort: 'khorfakkan',
      buyingPrice: 10000,
      customerName: 'Test Customer',
      customerPhone: '+971500000000',
    };

    await expect(quotationService.calculateQuote(input)).rejects.toThrow(
      /We could not complete your quotation right now\. Please try again or contact us on WhatsApp\./i
    );

    // Verify no fallback quote was cached in session
    expect(quotationService.getActiveQuote()).toBeNull();
  });

  it('returns null when no active quotation exists in session', () => {
    sessionStorage.clear();
    expect(quotationService.getActiveQuote()).toBeNull();
  });
});
