import { describe, it, expect } from 'vitest';
import { convertUsdToAed, normalizePhone } from '../lib/utils';

describe('Authoritative Shipping Calculation Engine Formulas (Phase 2B Final)', () => {
  const USD_AED_RATE = 3.6725;

  it('verifies UAE VAT benchmark case (CIF $6,530 -> Customs Duty $326.50, VAT $342.83, Total $2,549.33)', () => {
    // Benchmark requested by owner:
    // CIF = $6,530 (e.g. Vehicle $5,000 + Ocean Freight $1,250 + Towing $280)
    const vehiclePrice = 5000.0;
    const oceanFreight = 1250.0;
    const inlandTowing = 280.0;
    const clearanceFee = 150.0;
    const portHandlingFee = 200.0;

    // CIF = vehicle purchase price + eligible shipping/freight + insurance
    const cif = vehiclePrice + oceanFreight + inlandTowing;
    expect(cif).toBe(6530.0);

    // Customs duty = 5% x CIF
    const customsDuty = Math.round(cif * 0.05 * 100) / 100;
    expect(customsDuty).toBe(326.5);

    // VAT taxable value = CIF + customs duty
    // Clearance ($150), port handling ($200), documentation, etc., remain separate and NOT in VAT base
    const vatBase = Math.round((cif + customsDuty) * 100) / 100;
    expect(vatBase).toBe(6856.5);

    // UAE import VAT = 5% x VAT taxable value
    const importVat = Math.round(vatBase * 0.05 * 100) / 100;
    expect(importVat).toBe(342.83);

    // Shipping & logistics charges payable:
    // Ocean freight ($1,250) + Towing ($280) + Clearance ($150) + Port handling ($200) + Duty ($326.50) + VAT ($342.83)
    const totalShippingCharges =
      Math.round(
        (oceanFreight + inlandTowing + clearanceFee + portHandlingFee + customsDuty + importVat) *
          100
      ) / 100;
    expect(totalShippingCharges).toBe(2549.33);
    expect(Math.round(totalShippingCharges)).toBe(2549);
  });

  it('calculates CIF, 5% UAE Customs Duty, and 5% Import VAT accurately without port charges in VAT base', () => {
    const declaredValueUsd = 15000.0;
    const oceanFreight = 1050.0;
    const surcharges = 0.0;
    const fixedTowing = 220.0;
    const customsClearanceFee = 150.0;
    const portHandlingFee = 200.0;

    // CIF Valuation = Declared Value + Ocean Freight + Surcharges + Towing
    const cif = declaredValueUsd + oceanFreight + surcharges + fixedTowing;
    expect(cif).toBe(16270.0);

    // UAE Customs Duty = 5% of CIF
    const customsDuty = Math.round(cif * 0.05 * 100) / 100;
    expect(customsDuty).toBe(813.5);

    // VAT Base = CIF + Customs Duty (Port charges remain separate and excluded from VAT base)
    const vatBase = Math.round((cif + customsDuty) * 100) / 100;
    expect(vatBase).toBe(17083.5);

    // UAE Import VAT = 5% of VAT Base
    const importVat = Math.round(vatBase * 0.05 * 100) / 100;
    expect(importVat).toBe(854.18);

    // Total Shipping & Logistics Charges Payable (Excluding vehicle purchase price)
    const totalChargesUsd =
      Math.round(
        (oceanFreight +
          fixedTowing +
          surcharges +
          customsClearanceFee +
          portHandlingFee +
          customsDuty +
          importVat) *
          100
      ) / 100;
    expect(totalChargesUsd).toBe(3287.68);

    // Total AED conversion at 3.6725
    const totalChargesAed = Math.round(totalChargesUsd * USD_AED_RATE * 100) / 100;
    expect(totalChargesAed).toBe(12074);
  });

  it('calculates min and max bounds properly for range towing', () => {
    const declaredValueUsd = 10000.0;
    const oceanFreight = 1100.0; // Houston
    const surcharges = 150.0; // Non-runner
    const towingMin = 300.0;
    const towingMax = 480.0;
    const customsClearanceFee = 150.0;
    const portHandlingFee = 200.0;

    // Min bounds
    const cifMin = declaredValueUsd + oceanFreight + surcharges + towingMin;
    const dutyMin = Math.round(cifMin * 0.05 * 100) / 100;
    const vatBaseMin = cifMin + dutyMin;
    const vatMin = Math.round(vatBaseMin * 0.05 * 100) / 100;
    const totalUsdMin =
      Math.round(
        (oceanFreight +
          towingMin +
          surcharges +
          customsClearanceFee +
          portHandlingFee +
          dutyMin +
          vatMin) *
          100
      ) / 100;

    // Max bounds
    const cifMax = declaredValueUsd + oceanFreight + surcharges + towingMax;
    const dutyMax = Math.round(cifMax * 0.05 * 100) / 100;
    const vatBaseMax = cifMax + dutyMax;
    const vatMax = Math.round(vatBaseMax * 0.05 * 100) / 100;
    const totalUsdMax =
      Math.round(
        (oceanFreight +
          towingMax +
          surcharges +
          customsClearanceFee +
          portHandlingFee +
          dutyMax +
          vatMax) *
          100
      ) / 100;

    expect(cifMin).toBeLessThan(cifMax);
    expect(dutyMin).toBeLessThan(dutyMax);
    expect(vatMin).toBeLessThan(vatMax);
    expect(totalUsdMin).toBeLessThan(totalUsdMax);
    expect(totalUsdMax - totalUsdMin).toBeGreaterThan(180.0);
  });

  it('verifies AED currency conversion precision', () => {
    const usdVal = 1000;
    const aedVal = convertUsdToAed(usdVal);
    expect(aedVal).toBe(3673); // Math.round(1000 * 3.6725)
  });

  it('normalizes all four UAE phone formats to the exact same canonical digits format 971508322799', () => {
    const formats = [
      '0508322799',
      '050 832 2799',
      '00971508322799',
      '+971508322799',
    ];

    const expectedCanonical = '971508322799';

    for (const raw of formats) {
      expect(normalizePhone(raw, 'ARE')).toBe(expectedCanonical);
      // Default countryCode is 'ARE'
      expect(normalizePhone(raw)).toBe(expectedCanonical);
    }
  });

  it('normalizes international numbers appropriately and preserves country differentiation', () => {
    // US number
    expect(normalizePhone('+1 (555) 234-5678', 'USA')).toBe('15552345678');
    expect(normalizePhone('5552345678', 'USA')).toBe('15552345678');
    
    // Empty / whitespace
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone(undefined)).toBe('');
  });
});
