import { describe, it, expect } from 'vitest';
import { quotationService } from '../services/quotationService';
import { CalculatorFormData } from '../types/calculator';

describe('Quotation Service Prototype & Engine', () => {
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
