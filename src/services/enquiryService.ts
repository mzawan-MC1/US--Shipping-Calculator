import { CustomerEnquiry } from '../types/admin';
import { MOCK_ENQUIRIES } from './mockData';
import { isDemoMode, supabase } from '../lib/supabase';

export const enquiryService = {
  async getRecentEnquiries(): Promise<CustomerEnquiry[]> {
    if (isDemoMode) {
      return MOCK_ENQUIRIES;
    }

    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[EnquiryService] Error fetching enquiries:', error);
      return MOCK_ENQUIRIES;
    }

    return data as CustomerEnquiry[];
  },

  async createEnquiry(
    enquiry: Omit<CustomerEnquiry, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; id: string }> {
    if (isDemoMode) {
      console.info('[EnquiryService] Demo mode enquiry created:', enquiry);
      return { success: true, id: `demo-enq-${Date.now()}` };
    }

    const { data, error } = await supabase
      .from('enquiries')
      .insert([enquiry])
      .select('id')
      .single();
    if (error) {
      throw new Error(`Failed to record enquiry: ${error.message}`);
    }
    return { success: true, id: data.id };
  },
};
