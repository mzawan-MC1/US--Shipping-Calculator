import { CalculatorFormData, QuotationBreakdown, QuotationLineItem } from '../types/calculator';
import { SAMPLE_QUOTATION_BREAKDOWN } from './mockData';
import { isDemoMode, supabase } from '../lib/supabase';
import { USD_TO_AED_EXCHANGE_RATE } from '../lib/utils';
import { PORT_SLUG_TO_UUID } from './referenceDataService';

const STORAGE_KEY = 'fakher_alam_active_quote';

/**
 * Quotation Service
 *
 * NOTE (CTO Architecture Rule): Authoritative pricing, tariffs, port fees,
 * and surcharge business logic are strictly encapsulated in PostgreSQL / Supabase
 * RPC functions (`calculate_shipping_quote_v1`). Frontend components never perform
 * authoritative financial calculations.
 */
export const quotationService = {
  async calculateQuote(input: CalculatorFormData): Promise<QuotationBreakdown> {
    if (isDemoMode) {
      return this.calculateDemoQuote(input);
    }

    try {
      // Map loading port & destination port slugs to UUIDs
      const originPortId =
        PORT_SLUG_TO_UUID[input.loadingPort] || '10000000-0000-0000-0000-000000000002';
      const destPortId =
        PORT_SLUG_TO_UUID[input.destinationPort] || '20000000-0000-0000-0000-000000000001';

      // Map vehicle category (handle 'bike' -> 'motorcycle')
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
        origin_port_id: originPortId,
        destination_port_id: destPortId,
        vehicle_category_id: categoryId,
        powertrain_id: input.powertrain,
        condition_id: 'operable',
        shipping_method_id: input.shippingMethod || 'consolidated_container',
        purchase_source_id: input.purchaseSource,
        purchase_location_id: purchaseLocationId || null,
        declared_value_usd: input.buyingPrice,
        notes: input.notes || null,
        idempotency_key: idempotencyKey,
      };

      const { data, error } = await supabase.rpc('calculate_shipping_quote_v1', {
        input_json: rpcPayload,
      });

      if (error) {
        console.error('[QuotationService] Live RPC calculation error:', error);
        throw new Error(`Failed to calculate quote from secure server: ${error.message}`);
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
            surcharges_total: number;
            customs_clearance_fee: number;
            port_additional_charges: number;
            cif_value_min: number;
            cif_value_max: number;
            customs_duty_min: number;
            customs_duty_max: number;
            vat_taxable_value_min: number;
            vat_taxable_value_max: number;
            import_vat_min: number;
            import_vat_max: number;
            total_charges_usd_min: number;
            total_charges_usd_max: number;
            total_charges_aed_min: number;
            total_charges_aed_max: number;
          };
          route: {
            transit_days_min: number;
            transit_days_max: number;
          };
          disclaimer: string;
          line_items: QuotationLineItem[];
        };
      };

      const fin = res.snapshot.financials;
      const isRange = fin.is_towing_range;

      const liveQuote: QuotationBreakdown = {
        id: res.quotation_id,
        referenceNumber: res.quotation_reference,
        enquiryReference: res.enquiry_reference,
        createdAt: res.snapshot.calculation_timestamp || new Date().toISOString(),
        input: { ...input, idempotencyKey },
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
        snapshot: res.snapshot as unknown as Record<string, unknown>,
        isIdempotentReplay: res.is_idempotent_replay || false,
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(liveQuote));
      return liveQuote;
    } catch (err) {
      console.warn(
        '[QuotationService] Error invoking live RPC, falling back to prototype engine',
        err
      );
      return this.calculateDemoQuote(input);
    }
  },

  calculateDemoQuote(input: CalculatorFormData): QuotationBreakdown {
    const baseFreightMap: Record<string, number> = {
      savannah: 1050,
      houston: 1100,
      newark: 980,
      baltimore: 1020,
      los_angeles: 1350,
    };

    const oceanFreight = baseFreightMap[input.loadingPort] || 1050;
    const powertrainSurcharge =
      input.powertrain === 'electric' ? 200 : input.powertrain === 'hybrid' ? 100 : 0;
    const vehicleTypeSurcharge =
      input.vehicleType === 'pickup'
        ? 200
        : input.vehicleType === 'van'
          ? 150
          : input.vehicleType === 'suv'
            ? 100
            : 0;
    const oceanFreightTotal = oceanFreight + powertrainSurcharge + vehicleTypeSurcharge;

    const customsClearance = 150;
    const destinationCharges = 200;

    // Towing check
    let towingMin = 0;
    let towingMax = 0;
    let isTowingRange = false;
    if (input.towFromLocation && input.towFromLocation.trim() !== '') {
      towingMin = 300;
      towingMax = 480;
      isTowingRange = true;
    }

    // CIF = declared value + ocean freight + surcharges + towing
    const cifMin = input.buyingPrice + oceanFreightTotal + towingMin;
    const cifMax = input.buyingPrice + oceanFreightTotal + towingMax;

    // Customs Duty = 5% CIF
    const customsDutyMin = Math.round(cifMin * 0.05 * 100) / 100;
    const customsDutyMax = Math.round(cifMax * 0.05 * 100) / 100;

    // VAT Base = CIF + Duty + vatable port charges (200)
    const vatBaseMin = cifMin + customsDutyMin + 200;
    const vatBaseMax = cifMax + customsDutyMax + 200;

    // Import VAT = 5% VAT base
    const vatMin = Math.round(vatBaseMin * 0.05 * 100) / 100;
    const vatMax = Math.round(vatBaseMax * 0.05 * 100) / 100;

    const totalChargesUsdMin =
      Math.round(
        (oceanFreightTotal +
          towingMin +
          customsClearance +
          destinationCharges +
          customsDutyMin +
          vatMin) *
          100
      ) / 100;
    const totalChargesUsdMax =
      Math.round(
        (oceanFreightTotal +
          towingMax +
          customsClearance +
          destinationCharges +
          customsDutyMax +
          vatMax) *
          100
      ) / 100;

    const totalChargesAedMin =
      Math.round(totalChargesUsdMin * USD_TO_AED_EXCHANGE_RATE * 100) / 100;
    const totalChargesAedMax =
      Math.round(totalChargesUsdMax * USD_TO_AED_EXCHANGE_RATE * 100) / 100;

    const transitDaysMap: Record<string, number> = {
      savannah: 60,
      houston: 55,
      newark: 50,
      baltimore: 52,
      los_angeles: 68,
    };

    const quote: QuotationBreakdown = {
      id: `quote-${Date.now()}`,
      referenceNumber: `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      enquiryReference: `ENQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      input,
      estimatedTransitDays: transitDaysMap[input.loadingPort] || 55,
      estimatedTransitDaysMin: (transitDaysMap[input.loadingPort] || 55) - 5,
      estimatedTransitDaysMax: transitDaysMap[input.loadingPort] || 55,
      oceanFreight,
      powertrainSurcharge,
      vehicleTypeSurcharge,
      oceanFreightTotal,
      customsClearance,
      destinationCharges,
      customsDuty: customsDutyMax,
      dutyMin: customsDutyMin,
      dutyMax: customsDutyMax,
      vat: vatMax,
      vatMin,
      vatMax,
      cifMin,
      cifMax,
      towingFeeMin: towingMin,
      towingFeeMax: towingMax,
      isTowingRange,
      totalChargesUsd: totalChargesUsdMax,
      totalChargesUsdMin,
      totalChargesUsdMax,
      totalChargesAed: totalChargesAedMax,
      totalChargesAedMin,
      totalChargesAedMax,
      towChargeStatus: isTowingRange ? 'range' : towingMin > 0 ? 'included' : 'quote_on_request',
      isEstimate: true,
      disclaimer: isTowingRange
        ? 'Final quotation includes estimated inland towing range. Exact towing amount is confirmed upon auction dispatch. Customs duty (5%) and Import VAT (5%) are statutory government charges calculated on CIF valuation.'
        : 'Statutory UAE Customs Duty (5%) and Import VAT (5%) are calculated on CIF valuation. Quotation is valid for 14 days and subject to carrier bunker adjustments.',
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(quote));
    return quote;
  },

  getActiveQuote(): QuotationBreakdown {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse active quote from session, returning default', e);
    }
    return SAMPLE_QUOTATION_BREAKDOWN;
  },
};
