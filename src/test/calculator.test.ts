import { describe, it, expect } from 'vitest';
import { quotationService } from '../services/quotationService';
import { CalculatorFormData } from '../types/calculator';

describe('Quotation Service Prototype', () => {
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

  it('calculates expected breakdown values in prototype demo mode', async () => {
    const quote = await quotationService.calculateQuote(sampleInput);

    expect(quote).toBeDefined();
    expect(quote.referenceNumber).toMatch(/^FAK-\d+$/);
    expect(quote.estimatedTransitDays).toBe(65);
    expect(quote.oceanFreight).toBe(1930);
    expect(quote.customsDuty).toBe(250); // 5% of 5000
    expect(quote.totalChargesUsd).toBe(3640);
    expect(quote.isEstimate).toBe(true);
  });

  it('retrieves active quote from session or returns sample default', () => {
    const active = quotationService.getActiveQuote();
    expect(active).toBeDefined();
    expect(active.oceanFreightTotal).toBeGreaterThan(0);
  });
});
