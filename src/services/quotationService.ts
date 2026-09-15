import { CalculatorFormData, QuotationBreakdown } from '../types/calculator';
import { SAMPLE_QUOTATION_BREAKDOWN } from './mockData';
import { isDemoMode, supabase } from '../lib/supabase';
import { USD_TO_AED_EXCHANGE_RATE } from '../lib/utils';

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
      // Deterministic prototype simulation for Phase 1 demo shell
      // Base ocean freight by port (demo baseline)
      const baseFreightMap: Record<string, number> = {
        savannah: 1930,
        houston: 1980,
        newark: 1890,
        baltimore: 1910,
        los_angeles: 2250,
      };

      const oceanFreight = baseFreightMap[input.loadingPort] || 1930;
      const powertrainSurcharge =
        input.powertrain === 'electric' ? 250 : input.powertrain === 'hybrid' ? 100 : 0;
      const vehicleTypeSurcharge =
        input.vehicleType === 'pickup'
          ? 300
          : input.vehicleType === 'van'
            ? 200
            : input.vehicleType === 'suv'
              ? 150
              : 0;
      const oceanFreightTotal = oceanFreight + powertrainSurcharge + vehicleTypeSurcharge;

      const customsClearance = 400;
      const destinationCharges = input.destinationPort === 'jebel_ali' ? 850 : 800;

      // Customs duty (5% of declared buying price)
      const customsDuty = Math.round(input.buyingPrice * 0.05);
      // UAE VAT (5% on value + duty)
      const vat = Math.round(input.buyingPrice * 0.052);

      const totalChargesUsd =
        oceanFreightTotal + customsClearance + destinationCharges + customsDuty + vat;
      const totalChargesAed = Math.round(totalChargesUsd * USD_TO_AED_EXCHANGE_RATE);

      const transitDaysMap: Record<string, number> = {
        savannah: 65,
        houston: 60,
        newark: 55,
        baltimore: 58,
        los_angeles: 72,
      };

      const quote: QuotationBreakdown = {
        id: `quote-${Date.now()}`,
        referenceNumber: `FAK-${Math.floor(10000 + Math.random() * 90000)}`,
        createdAt: new Date().toISOString(),
        input,
        estimatedTransitDays: transitDaysMap[input.loadingPort] || 60,
        oceanFreight,
        powertrainSurcharge,
        vehicleTypeSurcharge,
        oceanFreightTotal,
        customsClearance,
        destinationCharges,
        customsDuty,
        vat,
        totalChargesUsd,
        totalChargesAed,
        towChargeStatus: 'quote_on_request',
        isEstimate: true,
      };

      // Persist in session for /results view
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(quote));
      return quote;
    }

    // Live Supabase RPC Integration boundary
    const { data, error } = await supabase.rpc('calculate_shipping_quote_v1', {
      p_vehicle_type: input.vehicleType,
      p_powertrain: input.powertrain,
      p_purchase_source: input.purchaseSource,
      p_loading_port: input.loadingPort,
      p_destination_port: input.destinationPort,
      p_buying_price: input.buyingPrice,
      p_tow_origin: input.towFromLocation,
    });

    if (error) {
      console.error('[QuotationService] Live RPC calculation error:', error);
      throw new Error(`Failed to calculate quote from secure server: ${error.message}`);
    }

    const liveQuote = data as QuotationBreakdown;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(liveQuote));
    return liveQuote;
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
