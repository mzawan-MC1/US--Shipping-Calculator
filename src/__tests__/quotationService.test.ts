import { describe, it, expect, beforeEach } from 'vitest';
import { quotationService } from '../services/quotationService';
import { CalculatorFormData } from '../types/calculator';

describe('QuotationService (Phase 2A)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('generates a complete quotation with valid references and range towing', async () => {
    const input: CalculatorFormData = {
      vehicleType: 'sedan',
      powertrain: 'petrol',
      purchaseSource: 'copart',
      loadingPort: 'savannah',
      destinationPort: 'khorfakkan',
      buyingPrice: 12000,
      towFromLocation: 'Copart Atlanta South',
      customerName: 'Ahmad Al Mansoori',
      customerPhone: '+971501234567',
      customerEmail: 'ahmad@example.com',
    };

    const quote = await quotationService.calculateQuote(input);

    expect(quote).toBeDefined();
    expect(quote.referenceNumber).toMatch(/^QT-/);
    expect(quote.enquiryReference).toMatch(/^ENQ-/);
    expect(quote.oceanFreight).toBeGreaterThan(0);
    expect(quote.customsDuty).toBeGreaterThan(0);
    expect(quote.vat).toBeGreaterThan(0);
    expect(quote.totalChargesUsd).toBeGreaterThan(0);
    expect(quote.totalChargesAed).toBeGreaterThan(0);
    expect(quote.disclaimer).toBeDefined();

    // Verify session persistence
    const active = quotationService.getActiveQuote();
    expect(active.referenceNumber).toBe(quote.referenceNumber);
  });

  it('handles vehicle without towing gracefully', async () => {
    const input: CalculatorFormData = {
      vehicleType: 'suv',
      powertrain: 'hybrid',
      purchaseSource: 'manheim',
      loadingPort: 'houston',
      destinationPort: 'jebel_ali',
      buyingPrice: 20000,
      customerName: 'Rashid Khan',
      customerPhone: '+971559876543',
    };

    const quote = await quotationService.calculateQuote(input);
    expect(quote.referenceNumber).toBeDefined();
    expect(quote.totalChargesUsd).toBeGreaterThan(0);
  });
});
