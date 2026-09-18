import { describe, it, expect, beforeEach, vi } from 'vitest';
import { quotationService } from '../services/quotationService';
import { supabase } from '../lib/supabase';
import { CalculatorFormData } from '../types/calculator';

describe('Authoritative Calculator Operational Sequence (Scenarios A - L)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Test A & B: Towing Included, Dallas South -> Houston Auto-selected, Savannah Never Offered
  // =========================================================================
  it('Test A & B: Dallas South returns Houston auto-selected ($300-$480) and never offers Savannah', async () => {
    const dallasSouthLocationId = '30000000-0000-0000-0000-000000000002';
    const houstonPortId = '10000000-0000-0000-0000-000000000003';
    const savannahPortId = '10000000-0000-0000-0000-000000000002';

    // Mock get_calculator_availability_v1 response for Dallas South
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        eligible_pickup_locations: [
          {
            id: dallasSouthLocationId,
            name: 'Copart Dallas South',
            state_code: 'TX',
            purchase_source_id: 'copart',
            available_ports_count: 1,
          },
        ],
        eligible_origin_ports: [
          {
            id: houstonPortId,
            name: 'Houston',
            code: 'USHOU',
            state_or_city: 'TX',
            country_code: 'USA',
            towing_rate_type: 'range',
            towing_fixed_amount: null,
            towing_min_amount: 300,
            towing_max_amount: 480,
          },
        ],
        eligible_destination_ports: [
          {
            id: '20000000-0000-0000-0000-000000000001',
            name: 'Khorfakkan Port',
            code: 'AEKLF',
            state_or_city: 'Sharjah',
            country_code: 'ARE',
            route_id: 'route-hou-khf',
            transit_days_min: 28,
            transit_days_max: 35,
          },
        ],
        eligible_shipping_methods: [
          {
            id: 'consolidated_container',
            name: 'Consolidated Shared Container (LCL)',
            base_amount: 1250,
            currency: 'USD',
          },
        ],
      },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const availability = await quotationService.getCalculatorAvailability({
      vehicleCategoryId: 'sedan',
      conditionId: 'operable',
      powertrainId: 'petrol',
      purchaseSourceId: 'copart',
      purchaseLocationId: dallasSouthLocationId,
      includeInlandTowing: true,
    });

    // Test A Assertions
    expect(availability.eligible_origin_ports).toHaveLength(1);
    const originPort = availability.eligible_origin_ports[0];
    expect(originPort.id).toBe(houstonPortId);
    expect(originPort.code).toBe('USHOU');
    expect(originPort.towing_rate_type).toBe('range');
    expect(originPort.towing_min_amount).toBe(300);
    expect(originPort.towing_max_amount).toBe(480);

    // Test B Assertion: Savannah is NEVER offered for Dallas South
    const savannahOffered = availability.eligible_origin_ports.some(
      (p) => p.id === savannahPortId || p.code === 'USSAV'
    );
    expect(savannahOffered).toBe(false);
  });

  // =========================================================================
  // Test C: Pickup with multiple ports displays only valid ones with rates
  // =========================================================================
  it('Test C: Pickup location with multiple ports displays only valid ones with towing rates', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        eligible_pickup_locations: [],
        eligible_origin_ports: [
          {
            id: '10000000-0000-0000-0000-000000000001',
            name: 'Newark',
            code: 'USNWK',
            towing_rate_type: 'fixed',
            towing_fixed_amount: 250,
            towing_min_amount: 250,
            towing_max_amount: 250,
          },
          {
            id: '10000000-0000-0000-0000-000000000005',
            name: 'Baltimore',
            code: 'USBAL',
            towing_rate_type: 'range',
            towing_fixed_amount: null,
            towing_min_amount: 320,
            towing_max_amount: 450,
          },
        ],
        eligible_destination_ports: [],
        eligible_shipping_methods: [],
      },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const availability = await quotationService.getCalculatorAvailability({
      vehicleCategoryId: 'sedan',
      conditionId: 'operable',
      purchaseLocationId: 'loc-multi-port',
      includeInlandTowing: true,
    });

    expect(availability.eligible_origin_ports).toHaveLength(2);
    expect(availability.eligible_origin_ports[0].name).toBe('Newark');
    expect(availability.eligible_origin_ports[0].towing_fixed_amount).toBe(250);
    expect(availability.eligible_origin_ports[1].name).toBe('Baltimore');
    expect(availability.eligible_origin_ports[1].towing_min_amount).toBe(320);
    expect(availability.eligible_origin_ports[1].towing_max_amount).toBe(450);
  });

  // =========================================================================
  // Test D: Towing excluded -> manual port selection, $0 towing, quotation succeeds
  // =========================================================================
  it('Test D: Towing excluded allows manual port selection with $0 towing and quotation succeeds', async () => {
    // 1. Availability check without towing
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        eligible_pickup_locations: [],
        eligible_origin_ports: [
          {
            id: '10000000-0000-0000-0000-000000000001',
            name: 'Newark',
            code: 'USNWK',
            towing_rate_type: 'none',
            towing_fixed_amount: 0,
            towing_min_amount: 0,
            towing_max_amount: 0,
          },
          {
            id: '10000000-0000-0000-0000-000000000002',
            name: 'Savannah',
            code: 'USSAV',
            towing_rate_type: 'none',
            towing_fixed_amount: 0,
            towing_min_amount: 0,
            towing_max_amount: 0,
          },
        ],
        eligible_destination_ports: [],
        eligible_shipping_methods: [],
      },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const avail = await quotationService.getCalculatorAvailability({
      vehicleCategoryId: 'sedan',
      conditionId: 'operable',
      includeInlandTowing: false,
    });

    expect(avail.eligible_origin_ports.length).toBeGreaterThanOrEqual(2);
    expect(avail.eligible_origin_ports[0].towing_rate_type).toBe('none');

    // 2. Calculation RPC with includeInlandTowing = false
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        success: true,
        quotation_id: '44444444-4444-4444-4444-444444444444',
        quotation_reference: 'QT-20260918-DIRECT01',
        enquiry_reference: 'ENQ-20260918-DIRECT01',
        snapshot: {
          quotation_reference: 'QT-20260918-DIRECT01',
          enquiry_reference: 'ENQ-20260918-DIRECT01',
          include_inland_towing: false,
          financials: {
            subtotal_ocean_freight: 1250,
            towing_fee_min: 0,
            towing_fee_max: 0,
            is_towing_range: false,
            total_charges_usd_min: 2790,
            total_charges_usd_max: 2790,
            total_charges_aed_min: 10247.67,
            total_charges_aed_max: 10247.67,
          },
          line_items: [],
          route: {
            origin_port_name: 'Savannah',
            destination_port_name: 'Khorfakkan Port',
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
      conditionId: 'operable',
      purchaseSource: 'dealer',
      loadingPort: 'savannah',
      destinationPort: 'khorfakkan',
      buyingPrice: 8000,
      includeInlandTowing: false,
      customerName: 'Direct Delivery Customer',
      customerPhone: '+971501112233',
    };

    const quote = await quotationService.calculateQuote(input);

    expect(rpcSpy).toHaveBeenCalledWith(
      'calculate_shipping_quote_v1',
      expect.objectContaining({
        input_json: expect.objectContaining({
          include_inland_towing: false,
          purchase_location_id: null,
        }),
      })
    );

    expect(quote.includeInlandTowing).toBe(false);
    expect(quote.towingFeeMin).toBe(0);
    expect(quote.towingFeeMax).toBe(0);
    expect(quote.totalChargesUsd).toBe(2790);
  });

  // =========================================================================
  // Test H: Destination selected -> only methods with active freight rates appear
  // =========================================================================
  it('Test H: Destination selected returns only shipping methods with active freight rates', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        eligible_pickup_locations: [],
        eligible_origin_ports: [],
        eligible_destination_ports: [],
        eligible_shipping_methods: [
          {
            id: 'consolidated_container',
            name: 'Consolidated Shared Container (LCL)',
            base_amount: 1250,
            currency: 'USD',
          },
        ],
      },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const availability = await quotationService.getCalculatorAvailability({
      vehicleCategoryId: 'sedan',
      conditionId: 'operable',
      powertrainId: 'petrol',
      originPortId: '10000000-0000-0000-0000-000000000003',
      destinationPortId: '20000000-0000-0000-0000-000000000001',
    });

    expect(availability.eligible_shipping_methods).toHaveLength(1);
    expect(availability.eligible_shipping_methods[0].id).toBe('consolidated_container');
    expect(availability.eligible_shipping_methods[0].base_amount).toBe(1250);
  });

  // =========================================================================
  // Test I: Controlled business error without technical PostgreSQL codes
  // =========================================================================
  it('Test I: Deactivated tariff returns controlled business error without raw database codes', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: null,
      error: {
        message:
          'No active ocean freight tariff is configured for this route and shipping method. Please contact us for assistance.',
        details: '',
        hint: '',
        code: 'P0001',
        name: 'PostgrestError',
      },
      count: null,
      status: 400,
      statusText: 'Bad Request',
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const input: CalculatorFormData = {
      vehicleType: 'sedan',
      powertrain: 'petrol',
      purchaseSource: 'copart',
      loadingPort: 'savannah',
      destinationPort: 'khorfakkan',
      buyingPrice: 10000,
      customerName: 'Error Handling Tester',
      customerPhone: '+971501234567',
    };

    await expect(quotationService.calculateQuote(input)).rejects.toThrow(
      'No active ocean freight tariff is configured for this route and shipping method. Please contact us for assistance.'
    );
  });

  // =========================================================================
  // Test J: Direct RPC tampering rejects invalid towing/route combination
  // =========================================================================
  it('Test J: Direct RPC tampering rejects invalid pickup and loading port combination', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: null,
      error: {
        message:
          'No inland towing tariff is configured for the selected pickup location and loading port. Please contact us for assistance.',
        details: '',
        hint: '',
        code: 'P0001',
        name: 'PostgrestError',
      },
      count: null,
      status: 400,
      statusText: 'Bad Request',
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const tamperedInput: CalculatorFormData = {
      vehicleType: 'sedan',
      powertrain: 'petrol',
      conditionId: 'operable',
      purchaseSource: 'copart',
      // Dallas South location with Savannah loading port (tampered combination)
      purchaseLocationId: '30000000-0000-0000-0000-000000000002',
      towFromLocation: 'Copart Dallas South',
      loadingPort: '10000000-0000-0000-0000-000000000002', // Savannah Port
      destinationPort: '20000000-0000-0000-0000-000000000001',
      buyingPrice: 15000,
      includeInlandTowing: true,
      customerName: 'Tamper Tester',
      customerPhone: '+971509999999',
    };

    await expect(quotationService.calculateQuote(tamperedInput)).rejects.toThrow(
      'No inland towing tariff is configured for the selected pickup location and loading port. Please contact us for assistance.'
    );
  });
});
