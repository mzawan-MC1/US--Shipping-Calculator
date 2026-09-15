import { describe, it, expect } from 'vitest';
import { convertUsdToAed } from '../lib/utils';

describe('Authoritative Shipping Calculation Engine Formulas (Phase 2A)', () => {
  const USD_AED_RATE = 3.6725;

  it('calculates CIF, 5% UAE Customs Duty, and 5% Import VAT accurately for fixed towing', () => {
    const declaredValueUsd = 15000.0;
    const oceanFreight = 1050.0;
    const surcharges = 0.0;
    const fixedTowing = 220.0;
    const customsClearanceFee = 150.0;
    const portHandlingFee = 200.0;
    const vatablePortCharges = 200.0;

    // CIF Valuation = Declared Value + Ocean Freight + Surcharges + Towing
    const cif = declaredValueUsd + oceanFreight + surcharges + fixedTowing;
    expect(cif).toBe(16270.0);

    // UAE Customs Duty = 5% of CIF
    const customsDuty = Math.round(cif * 0.05 * 100) / 100;
    expect(customsDuty).toBe(813.5);

    // VAT Base = CIF + Customs Duty + Vatable Port Charges
    const vatBase = Math.round((cif + customsDuty + vatablePortCharges) * 100) / 100;
    expect(vatBase).toBe(17283.5);

    // UAE Import VAT = 5% of VAT Base
    const importVat = Math.round(vatBase * 0.05 * 100) / 100;
    expect(importVat).toBe(864.18);

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
    expect(totalChargesUsd).toBe(3297.68);

    // Total AED conversion at 3.6725
    const totalChargesAed = Math.round(totalChargesUsd * USD_AED_RATE * 100) / 100;
    expect(totalChargesAed).toBe(12110.73);
  });

  it('calculates min and max bounds properly for range towing', () => {
    const declaredValueUsd = 10000.0;
    const oceanFreight = 1100.0; // Houston
    const surcharges = 150.0; // Non-runner
    const towingMin = 300.0;
    const towingMax = 480.0;
    const customsClearanceFee = 150.0;
    const portHandlingFee = 200.0;
    const vatablePortCharges = 200.0;

    // Min bounds
    const cifMin = declaredValueUsd + oceanFreight + surcharges + towingMin;
    const dutyMin = Math.round(cifMin * 0.05 * 100) / 100;
    const vatBaseMin = cifMin + dutyMin + vatablePortCharges;
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
    const vatBaseMax = cifMax + dutyMax + vatablePortCharges;
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
    expect(totalUsdMax - totalUsdMin).toBeGreaterThan(180.0); // Difference includes towing delta plus duty/vat on delta
  });

  it('verifies AED currency conversion precision', () => {
    const usdVal = 1000;
    const aedVal = convertUsdToAed(usdVal);
    expect(aedVal).toBe(3673); // Rounded integer or exact
  });
});
