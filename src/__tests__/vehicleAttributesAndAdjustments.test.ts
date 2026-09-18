import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vinService } from '../services/vinService';
import { quotationService } from '../services/quotationService';
import { supabase } from '../lib/supabase';
import { CalculatorFormData } from '../types/calculator';

describe('Vehicle Attributes, Adjustments, and VIN Decoder Suite', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. VIN Service Validation & Formatting (ISO 3779)
  // =========================================================================
  describe('VIN Service Validation & Sanitization', () => {
    it('validates standard 17-character alphanumeric VINs', () => {
      expect(vinService.isValidVin('1HGCR2F83HA123456')).toBe(true);
      expect(vinService.isValidVin('WAUZZZ8V1GA123456')).toBe(true);
    });

    it('rejects VINs with illegal letters (I, O, Q) per ISO 3779', () => {
      // Contains 'I'
      expect(vinService.isValidVin('1HGCR2F83HI123456')).toBe(false);
      // Contains 'O'
      expect(vinService.isValidVin('1HGCR2F83HO123456')).toBe(false);
      // Contains 'Q'
      expect(vinService.isValidVin('1HGCR2F83HQ123456')).toBe(false);
    });

    it('rejects VINs with invalid length or special characters', () => {
      expect(vinService.isValidVin('1HGCR2F83HA12345')).toBe(false); // 16 chars
      expect(vinService.isValidVin('1HGCR2F83HA1234567')).toBe(false); // 18 chars
      expect(vinService.isValidVin('1HGCR2F83HA12345-')).toBe(false); // special char
      expect(vinService.isValidVin('')).toBe(false);
    });

    it('sanitizes VIN input to uppercase alphanumeric excluding I, O, Q up to 17 chars', () => {
      const sanitized = vinService.sanitizeVin('1hg-cr2f-83ha-ioq-123456xyz');
      expect(sanitized).not.toContain('I');
      expect(sanitized).not.toContain('O');
      expect(sanitized).not.toContain('Q');
      expect(sanitized).not.toContain('-');
      expect(sanitized.length).toBeLessThanOrEqual(17);
      expect(sanitized).toBe('1HGCR2F83HA123456');
    });
  });

  // =========================================================================
  // 2. NHTSA VIN Decoding Logic & Fallbacks
  // =========================================================================
  describe('NHTSA vPIC Decoding & Attribute Mapping', () => {
    it('successfully decodes valid vehicle details and maps category/powertrain', async () => {
      const mockNhtsaResponse = {
        Results: [
          {
            Make: 'HONDA',
            Model: 'Accord',
            ModelYear: '2021',
            VehicleType: 'PASSENGER CAR',
            BodyClass: 'Sedan/Saloon',
            FuelTypePrimary: 'Gasoline',
            ErrorCode: '0',
            ErrorText: '0 - VIN decoded clean.',
          },
        ],
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockNhtsaResponse,
      } as Response);

      const result = await vinService.decodeVin('1HGCR2F83HA123456');

      expect(fetchSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.make).toBe('HONDA');
      expect(result.model).toBe('Accord');
      expect(result.year).toBe(2021);
      expect(result.suggestedCategoryId).toBe('sedan');
      expect(result.suggestedPowertrainId).toBe('petrol');
    });

    it('maps Electric and SUV vehicles correctly', async () => {
      const mockNhtsaResponse = {
        Results: [
          {
            Make: 'TESLA',
            Model: 'Model Y',
            ModelYear: '2023',
            VehicleType: 'MULTIPURPOSE PASSENGER VEHICLE (MPV)',
            BodyClass: 'Sport Utility Vehicle (SUV)',
            FuelTypePrimary: 'Electric',
            ErrorCode: '0',
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockNhtsaResponse,
      } as Response);

      const result = await vinService.decodeVin('5YJYGDEE8PF123456');

      expect(result.success).toBe(true);
      expect(result.make).toBe('TESLA');
      expect(result.model).toBe('Model Y');
      expect(result.year).toBe(2023);
      expect(result.suggestedCategoryId).toBe('suv');
      expect(result.suggestedPowertrainId).toBe('electric');
    });

    it('handles offline or HTTP errors gracefully with safe fallback', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

      const result = await vinService.decodeVin('1HGCR2F83HA123456');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Unable to reach vehicle decoding service');
    });
  });

  // =========================================================================
  // 3. Dynamic Availability with Eligible Powertrains and Conditions
  // =========================================================================
  describe('Dynamic Vehicle Attribute Availability', () => {
    it('returns eligible powertrains, conditions, and active adjustments for a vehicle category', async () => {
      const mockAvailability = {
        eligible_pickup_locations: [],
        eligible_origin_ports: [],
        eligible_destination_ports: [],
        eligible_shipping_methods: [],
        eligible_powertrains: [
          { id: 'petrol', name: 'Petrol / Gasoline', name_ar: 'بنزين', display_order: 1 },
          { id: 'hybrid', name: 'Hybrid Electric (HEV/PHEV)', name_ar: 'هايبرد', display_order: 2 },
          { id: 'electric', name: 'Battery Electric (EV)', name_ar: 'كهربائي', display_order: 3 },
        ],
        eligible_conditions: [
          { id: 'operable', name: 'Operable & Running', name_ar: 'سليمة وتعمل', display_order: 1 },
          { id: 'non_runner', name: 'Non-Runner / Inoperable', name_ar: 'معطلة / لا تعمل', display_order: 2 },
        ],
        active_adjustments: [
          {
            id: 'adj-1',
            attribute_type: 'vehicle_condition',
            attribute_id: 'non_runner',
            context: 'towing',
            amount_usd: 150,
            reason_en: 'Non-Runner Winching Surcharge',
            is_active: true,
          },
        ],
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockAvailability,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

      const res = await quotationService.getCalculatorAvailability({
        vehicleCategoryId: 'sedan',
        conditionId: 'operable',
        powertrainId: 'petrol',
      });

      expect(res.eligible_powertrains).toHaveLength(3);
      expect(res.eligible_conditions).toHaveLength(2);
      expect(res.active_adjustments).toHaveLength(1);
      expect(res.active_adjustments?.[0].amount_usd).toBe(150);
    });
  });

  // =========================================================================
  // 4. Authoritative Calculation with Distinct Towing & Shipping Adjustments
  // =========================================================================
  describe('Authoritative Calculation Line Items', () => {
    it('maps granular towing base, towing adjustment, ocean freight base, and shipping adjustments', async () => {
      const mockQuoteResult = {
        success: true,
        quotation_id: 'quote-test-uuid',
        quotation_reference: 'MC1-2026-TEST01',
        enquiry_reference: 'ENQ-2026-TEST01',
        snapshot: {
          quotation_reference: 'MC1-2026-TEST01',
          enquiry_reference: 'ENQ-2026-TEST01',
          calculation_timestamp: '2026-09-18T12:00:00Z',
          financials: {
            ocean_freight_base: 1250,
            ocean_freight_adjustments: 200,
            subtotal_ocean_freight: 1450,
            towing_fee_base_min: 300,
            towing_fee_base_max: 480,
            towing_adjustments: 150,
            towing_fee_min: 450,
            towing_fee_max: 630,
            is_towing_range: true,
            include_inland_towing: true,
            surcharges_total: 0,
            ocean_and_towing_subtotal_min: 1900,
            ocean_and_towing_subtotal_max: 2080,
            customs_clearance_fee: 150,
            port_additional_charges: 200,
            destination_clearance_subtotal: 350,
            cif_value_min: 6900,
            cif_value_max: 7080,
            customs_duty_min: 345,
            customs_duty_max: 354,
            vat_taxable_value_min: 7245,
            vat_taxable_value_max: 7434,
            import_vat_min: 362.25,
            import_vat_max: 371.7,
            uae_government_charges_subtotal_min: 707.25,
            uae_government_charges_subtotal_max: 725.7,
            total_charges_usd_min: 2957.25,
            total_charges_usd_max: 3155.7,
            total_charges_aed_min: 10860.5,
            total_charges_aed_max: 11589.3,
          },
          route: {
            origin_port_name: 'Houston',
            destination_port_name: 'Khorfakkan Port',
            transit_days_min: 28,
            transit_days_max: 35,
          },
          line_items: [
            {
              category: 'base_ocean_freight',
              description: 'Base Ocean Freight (Houston -> Khorfakkan Port)',
              amount_usd: 1250,
            },
            {
              category: 'shipping_adjustment',
              description: 'Battery Electric Specialized Vessel Surcharge',
              amount_usd: 200,
              reason: 'Hazardous materials / high-voltage battery handling',
            },
            {
              category: 'base_inland_towing',
              description: 'Inland Towing (Copart Dallas South -> Houston)',
              amount_usd_min: 300,
              amount_usd_max: 480,
              is_range: true,
            },
            {
              category: 'towing_adjustment',
              description: 'Non-Runner / Inoperable Winching Surcharge',
              amount_usd: 150,
              reason: 'Required winch and rollback equipment for inoperable vehicle',
            },
            {
              category: 'customs_clearance_fee',
              description: 'Customs Clearance & Documentation',
              amount_usd: 150,
            },
            {
              category: 'port_handling_fee',
              description: 'Port & Terminal Handling Charges',
              amount_usd: 200,
            },
          ],
          disclaimer: 'Authoritative Quotation snapshot valid for 14 days.',
        },
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: mockQuoteResult,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

      const input: CalculatorFormData = {
        vehicleType: 'suv',
        powertrain: 'electric',
        conditionId: 'non_runner',
        purchaseSource: 'copart',
        loadingPort: '10000000-0000-0000-0000-000000000003',
        destinationPort: '20000000-0000-0000-0000-000000000001',
        shippingMethod: 'consolidated_container',
        buyingPrice: 5000,
        includeInlandTowing: true,
        purchaseLocationId: '30000000-0000-0000-0000-000000000002',
        towFromLocation: 'Copart Dallas South',
        customerName: 'Ahmad Al Nuaimi',
        customerPhone: '+971501234567',
      };

      const quote = await quotationService.calculateQuote(input);

      expect(quote.referenceNumber).toBe('MC1-2026-TEST01');
      expect(quote.oceanFreightBase).toBe(1250);
      expect(quote.oceanFreightAdjustments).toBe(200);
      expect(quote.towingFeeBaseMin).toBe(300);
      expect(quote.towingFeeBaseMax).toBe(480);
      expect(quote.towingAdjustments).toBe(150);
      expect(quote.lineItems).toHaveLength(6);

      // Verify line item specifics
      const shipAdj = quote.lineItems?.find((i) => i.category === 'shipping_adjustment');
      expect(shipAdj).toBeDefined();
      expect(shipAdj?.amount_usd).toBe(200);
      expect(shipAdj?.reason).toBe('Hazardous materials / high-voltage battery handling');

      const towAdj = quote.lineItems?.find((i) => i.category === 'towing_adjustment');
      expect(towAdj).toBeDefined();
      expect(towAdj?.amount_usd).toBe(150);
      expect(towAdj?.reason).toBe('Required winch and rollback equipment for inoperable vehicle');
    });
  });
});
