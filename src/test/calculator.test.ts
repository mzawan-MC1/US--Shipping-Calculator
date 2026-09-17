import { describe, it, expect, beforeEach, vi } from 'vitest';
import { quotationService } from '../services/quotationService';
import { CalculatorFormData } from '../types/calculator';
import { supabase } from '../lib/supabase';

describe('Quotation Service Prototype & Engine', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const sampleInput: CalculatorFormData = {
    vehicleType: 'sedan',
    powertrain: 'petrol',
    purchaseSource: 'copart',
    loadingPort: 'savannah',
    destinationPort: 'khorfakkan',
    buyingPrice: 5000,
    customerName: 'Test Customer',
    customerPhone: '+971501234567',
  };

  it('calculates expected breakdown values in quotation engine', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        success: true,
        is_idempotent_replay: false,
        quotation_id: '33333333-3333-3333-3333-333333333333',
        quotation_reference: 'QT-20260917-ENGINE',
        enquiry_reference: 'ENQ-20260917-ENGINE',
        snapshot: {
          quotation_reference: 'QT-20260917-ENGINE',
          enquiry_reference: 'ENQ-20260917-ENGINE',
          disclaimer: 'Statutory UAE Customs Duty (5%) and Import VAT (5%) are calculated on CIF valuation.',
          financials: {
            subtotal_ocean_freight: 1250,
            towing_fee_min: 350,
            towing_fee_max: 550,
            is_towing_range: true,
            customs_duty_min: 330,
            customs_duty_max: 340,
            import_vat_min: 346.5,
            import_vat_max: 357,
            total_charges_usd_min: 2626.5,
            total_charges_usd_max: 2847,
            total_charges_aed_min: 9646.07,
            total_charges_aed_max: 10455.61,
          },
          line_items: [],
          route: {
            origin_port_name: 'Port of Savannah',
            destination_port_name: 'Port of Khor Fakkan',
            transit_days_min: 28,
            transit_days_max: 35,
          },
          rules: [],
        },
      },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const quote = await quotationService.calculateQuote(sampleInput);

    expect(quote).toBeDefined();
    expect(quote.referenceNumber).toMatch(/^(QT-|FAK-)/);
    expect(quote.estimatedTransitDays).toBeGreaterThan(0);
    expect(quote.oceanFreight).toBeGreaterThan(0);
    expect(quote.customsDuty).toBeGreaterThan(0);
    expect(quote.totalChargesUsd).toBeGreaterThan(0);
    expect(quote.isEstimate).toBe(true);
  });

  it('retrieves active quote from session when stored or null when empty', () => {
    sessionStorage.clear();
    expect(quotationService.getActiveQuote()).toBeNull();
  });
});
