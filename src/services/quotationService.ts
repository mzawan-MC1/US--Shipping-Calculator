import { CalculatorFormData, QuotationBreakdown, QuotationLineItem, QuotationRuleItem } from '../types/calculator';
import { supabase } from '../lib/supabase';
import { PORT_SLUG_TO_UUID } from './referenceDataService';

const STORAGE_KEY = 'fakher_alam_active_quote';

/**
 * Quotation Service
 *
 * All pricing, tariffs, port fees, and statutory duties are calculated
 * authoritatively via database RPC functions (calculate_shipping_quote_v1).
 */
export const quotationService = {
  async calculateQuote(input: CalculatorFormData): Promise<QuotationBreakdown> {
    try {
      // Map loading port & destination port (supports direct UUIDs, standard slugs, or port codes)
      const isUUID = (val?: string) =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

      const originPortId = isUUID(input.loadingPort)
        ? input.loadingPort
        : (PORT_SLUG_TO_UUID[input.loadingPort] ||
           '10000000-0000-0000-0000-000000000002');
      const destPortId = isUUID(input.destinationPort)
        ? input.destinationPort
        : (PORT_SLUG_TO_UUID[input.destinationPort] ||
           '20000000-0000-0000-0000-000000000001');

      // Map vehicle category (handle 'bike' -> 'motorcycle' if needed)
      const categoryId = input.vehicleType === 'bike' ? 'motorcycle' : input.vehicleType;

      // Map purchase location if known
      let purchaseLocationId = input.purchaseLocationId;
      if (!purchaseLocationId && input.towFromLocation) {
        const locLower = input.towFromLocation.toLowerCase();
        if (locLower.includes('dallas') || locLower.includes('texas')) {
          purchaseLocationId = '30000000-0000-0000-0000-000000000002';
        } else if (locLower.includes('atlanta') || locLower.includes('georgia')) {
          purchaseLocationId = '30000000-0000-0000-0000-000000000001';
        } else if (
          locLower.includes('los angeles') ||
          locLower.includes('anaheim') ||
          locLower.includes('california')
        ) {
          purchaseLocationId = '30000000-0000-0000-0000-000000000003';
        } else if (
          locLower.includes('newark') ||
          locLower.includes('northgate') ||
          locLower.includes('new jersey')
        ) {
          purchaseLocationId = '30000000-0000-0000-0000-000000000004';
        }
      }

      const idempotencyKey =
        input.idempotencyKey || `quote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const rpcPayload = {
        customer_name: input.customerName || 'Online Inquirer',
        phone: input.customerPhone,
        email: input.customerEmail || null,
        country: input.country || null,
        city: input.city || null,
        make: input.make || null,
        model: input.model || null,
        year: input.year || null,
        vin: input.vin || null,
        lot_number: input.lotNumber || null,
        listing_url: input.listingUrl || null,
        origin_port_id: originPortId,
        destination_port_id: destPortId,
        vehicle_category_id: categoryId,
        powertrain_id: input.powertrain,
        condition_id: 'operable',
        shipping_method_id: input.shippingMethod || 'consolidated_container',
        purchase_source_id: input.purchaseSource,
        include_inland_towing: input.includeInlandTowing !== false,
        purchase_location_id: input.includeInlandTowing !== false ? (purchaseLocationId || null) : null,
        declared_value_usd: input.buyingPrice,
        notes: input.notes || null,
        idempotency_key: idempotencyKey,
      };

      const { data, error } = await supabase.rpc('calculate_shipping_quote_v1', {
        input_json: rpcPayload,
      });

      if (error) {
        console.error('[QuotationService] Live RPC calculation error:', error);
        const msg = error.message || '';
        if (
          msg.includes('Please contact us for assistance') ||
          msg.includes('Purchase location is required') ||
          msg.includes('Selected pickup location does not exist') ||
          msg.includes('Customer full name is required') ||
          msg.includes('Customer phone number is required')
        ) {
          throw new Error(msg);
        }
        throw new Error('We could not complete your quotation right now. Please try again or contact us on WhatsApp.');
      }

      // Parse the returned response
      const res = data as unknown as {
        success: boolean;
        is_idempotent_replay?: boolean;
        quotation_id: string;
        quotation_reference: string;
        enquiry_reference: string;
        snapshot: {
          quotation_reference: string;
          enquiry_reference: string;
          calculation_timestamp: string;
          financials: {
            subtotal_ocean_freight: number;
            towing_fee_min: number;
            towing_fee_max: number;
            is_towing_range: boolean;
            include_inland_towing?: boolean;
            surcharges_total: number;
            ocean_and_towing_subtotal_min?: number;
            ocean_and_towing_subtotal_max?: number;
            customs_clearance_fee: number;
            port_additional_charges: number;
            destination_clearance_subtotal?: number;
            cif_value_min: number;
            cif_value_max: number;
            customs_duty_min: number;
            customs_duty_max: number;
            vat_taxable_value_min: number;
            vat_taxable_value_max: number;
            import_vat_min: number;
            import_vat_max: number;
            uae_government_charges_subtotal_min?: number;
            uae_government_charges_subtotal_max?: number;
            total_charges_usd_min: number;
            total_charges_usd_max: number;
            total_charges_aed_min: number;
            total_charges_aed_max: number;
          };
          towing?: {
            is_requested?: boolean;
            location_id?: string | null;
            location_name?: string;
            city?: string | null;
            state_code?: string | null;
            fee_min?: number;
            fee_max?: number;
            is_range?: boolean;
            description?: string;
          };
          route: {
            route_id?: string;
            origin_port_id?: string;
            origin_port_name?: string;
            origin_port_name_ar?: string;
            origin_port_state?: string;
            origin_port_code?: string;
            origin_country_code?: string;
            origin_country_name?: string;
            origin_country_name_ar?: string;
            destination_port_id?: string;
            destination_port_name?: string;
            destination_port_name_ar?: string;
            destination_port_state?: string;
            destination_port_code?: string;
            destination_country_code?: string;
            destination_country_name?: string;
            destination_country_name_ar?: string;
            shipping_method_id?: string;
            shipping_method_name?: string;
            transit_days_min?: number;
            transit_days_max?: number;
          };
          disclaimer: string;
          line_items: QuotationLineItem[];
          rules?: QuotationRuleItem[];
        };
      };

      const fin = res.snapshot.financials;
      const isRange = fin.is_towing_range;
      const towingRequested = fin.include_inland_towing ?? (input.includeInlandTowing !== false);

      const liveQuote: QuotationBreakdown = {
        id: res.quotation_id,
        referenceNumber: res.quotation_reference,
        enquiryReference: res.enquiry_reference,
        createdAt: res.snapshot.calculation_timestamp || new Date().toISOString(),
        input: { ...input, includeInlandTowing: towingRequested, idempotencyKey },
        estimatedTransitDays: res.snapshot.route.transit_days_max || 60,
        estimatedTransitDaysMin: res.snapshot.route.transit_days_min,
        estimatedTransitDaysMax: res.snapshot.route.transit_days_max,
        oceanFreight: fin.subtotal_ocean_freight,
        powertrainSurcharge: fin.surcharges_total,
        vehicleTypeSurcharge: 0,
        oceanFreightTotal: fin.subtotal_ocean_freight + fin.surcharges_total,
        customsClearance: fin.customs_clearance_fee,
        destinationCharges: fin.port_additional_charges,
        customsDuty: fin.customs_duty_max,
        dutyMin: fin.customs_duty_min,
        dutyMax: fin.customs_duty_max,
        vat: fin.import_vat_max,
        vatMin: fin.import_vat_min,
        vatMax: fin.import_vat_max,
        cifMin: fin.cif_value_min,
        cifMax: fin.cif_value_max,
        towingFeeMin: fin.towing_fee_min,
        towingFeeMax: fin.towing_fee_max,
        isTowingRange: isRange,
        includeInlandTowing: towingRequested,
        towingLocationName: res.snapshot.towing?.location_name,
        towingDescription: res.snapshot.towing?.description,
        oceanAndTowingSubtotalMin: fin.ocean_and_towing_subtotal_min ?? (fin.subtotal_ocean_freight + fin.towing_fee_min),
        oceanAndTowingSubtotalMax: fin.ocean_and_towing_subtotal_max ?? (fin.subtotal_ocean_freight + fin.towing_fee_max),
        destinationClearanceSubtotal: fin.destination_clearance_subtotal ?? (fin.customs_clearance_fee + fin.port_additional_charges),
        uaeGovernmentChargesSubtotalMin: fin.uae_government_charges_subtotal_min ?? (fin.customs_duty_min + fin.import_vat_min),
        uaeGovernmentChargesSubtotalMax: fin.uae_government_charges_subtotal_max ?? (fin.customs_duty_max + fin.import_vat_max),
        totalChargesUsd: fin.total_charges_usd_max,
        totalChargesUsdMin: fin.total_charges_usd_min,
        totalChargesUsdMax: fin.total_charges_usd_max,
        totalChargesAed: fin.total_charges_aed_max,
        totalChargesAedMin: fin.total_charges_aed_min,
        totalChargesAedMax: fin.total_charges_aed_max,
        towChargeStatus: isRange
          ? 'range'
          : fin.towing_fee_min > 0
            ? 'included'
            : 'quote_on_request',
        isEstimate: true,
        disclaimer: res.snapshot.disclaimer,
        lineItems: res.snapshot.line_items,
        routeInfo: res.snapshot.route,
        rules: res.snapshot.rules || [],
        snapshot: res.snapshot as unknown as Record<string, unknown>,
        isIdempotentReplay: res.is_idempotent_replay || false,
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(liveQuote));
      return liveQuote;
    } catch (err: unknown) {
      console.error('[QuotationService] Calculation error:', err);
      // Safe, non-technical customer message
      const message = 'We could not complete your quotation right now. Please try again or contact us on WhatsApp.';
      throw new Error(message);
    }
  },

  getActiveQuote(): QuotationBreakdown | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse active quote from session', e);
    }
    return null;
  },
};
