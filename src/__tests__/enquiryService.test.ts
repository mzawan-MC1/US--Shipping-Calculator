import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enquiryService, formatContactSubject } from '../services/enquiryService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('Enquiry Service & Security Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats contact enquiry subject keys into human-readable labels', () => {
    expect(formatContactSubject('shipping_quote_assistance')).toBe('Shipping Quote Assistance');
    expect(formatContactSubject('vehicle_pickup_towing')).toBe('Vehicle Pickup & Towing');
    expect(formatContactSubject('port_route_information')).toBe('Port & Route Information');
    expect(formatContactSubject('existing_quotation')).toBe('Existing Quotation Inquiry');
    expect(formatContactSubject('general_enquiry')).toBe('General Inquiry');
    expect(formatContactSubject('other')).toBe('Other');
    expect(formatContactSubject(null)).toBe('Direct Contact Inquiry');
    expect(formatContactSubject(undefined)).toBe('Direct Contact Inquiry');
  });

  it('successfully invokes submit_contact_enquiry RPC and returns reference number', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: true, reference_number: 'ENQ-20260917-001001' },
      error: null,
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockRpc);

    const res = await enquiryService.submitContactEnquiry({
      full_name: 'Test Customer',
      phone: '+971501234567',
      email: 'customer@example.com',
      subject: 'shipping_quote_assistance',
      message: 'Need a quote for shipping a sedan from NJ to Sharjah.',
      preferred_contact_method: 'whatsapp',
      consent: true,
    });

    expect(mockRpc).toHaveBeenCalledWith('submit_contact_enquiry', {
      input_json: {
        full_name: 'Test Customer',
        phone: '+971501234567',
        email: 'customer@example.com',
        subject: 'shipping_quote_assistance',
        message: 'Need a quote for shipping a sedan from NJ to Sharjah.',
        preferred_contact_method: 'whatsapp',
        consent: true,
      },
    });
    expect(res).toEqual({ success: true, reference_number: 'ENQ-20260917-001001' });
    expect((res as Record<string, unknown>).enquiry_id).toBeUndefined();
    expect((res as Record<string, unknown>).customer_id).toBeUndefined();
  });

  it('throws an error when RPC fails with server-side validation error', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Consent is required to submit an inquiry' },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockRpc);

    await expect(
      enquiryService.submitContactEnquiry({
        full_name: 'Test Customer',
        phone: '+971501234567',
        email: 'customer@example.com',
        subject: 'shipping_quote_assistance',
        message: 'Need a quote.',
        preferred_contact_method: 'whatsapp',
        consent: false,
      })
    ).rejects.toThrow('Consent is required to submit an inquiry');
  });

  it('throws an error when RPC fails with rate limit error', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Too many inquiries received. Please wait a few minutes before trying again or reach out on WhatsApp.' },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockRpc);

    await expect(
      enquiryService.submitContactEnquiry({
        full_name: 'Test Customer',
        phone: '+971501234567',
        email: 'customer@example.com',
        subject: 'general_enquiry',
        message: 'Another inquiry within 10 minutes.',
        preferred_contact_method: 'phone',
        consent: true,
      })
    ).rejects.toThrow('Too many inquiries received');
  });
});
