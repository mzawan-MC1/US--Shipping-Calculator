import { CustomerEnquiry, EnquiryStatus } from '../types/admin';
import { supabase } from '../lib/supabase';

interface EnquiryRowCustomer {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface EnquiryRowQuotation {
  reference_number: string;
  total_charges_usd_max: number;
  pricing_snapshot: {
    vehicle?: {
      category_id?: string;
      make?: string;
      model?: string;
      year?: number;
    };
    route?: {
      origin_port_name?: string;
      destination_port_name?: string;
    };
  } | null;
}

interface EnquiryQueryResult {
  id: string;
  reference_number: string;
  status: string;
  source: string;
  created_at: string;
  customers: EnquiryRowCustomer | null;
  quotations: EnquiryRowQuotation[] | null;
}

export const enquiryService = {
  async getRecentEnquiries(): Promise<CustomerEnquiry[]> {
    const { data, error } = await supabase
      .from('enquiries')
      .select(
        `
        id,
        reference_number,
        status,
        source,
        created_at,
        customers (
          full_name,
          phone,
          email
        ),
        quotations (
          reference_number,
          total_charges_usd_max,
          pricing_snapshot
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[EnquiryService] Error fetching enquiries:', error);
      throw new Error(error.message || 'Unable to retrieve customer enquiries.');
    }

    if (!data || data.length === 0) {
      return [];
    }

    const rows = data as unknown as EnquiryQueryResult[];

    return rows.map((item) => {
      const cust = item.customers;
      const quote = item.quotations?.[0];
      const snapshot = quote?.pricing_snapshot;

      const vehicleDesc = snapshot?.vehicle
        ? `${snapshot.vehicle.year || ''} ${snapshot.vehicle.make || ''} ${snapshot.vehicle.model || ''} (${snapshot.vehicle.category_id || 'sedan'})`.trim()
        : 'Vehicle Shipping';

      const originPort = snapshot?.route?.origin_port_name || 'USA Origin';
      const destPort = snapshot?.route?.destination_port_name || 'UAE Destination';
      const routeDesc = `${originPort} -> ${destPort}`;

      return {
        id: item.id,
        referenceNumber: item.reference_number,
        customerName: cust?.full_name || 'Customer',
        phone: cust?.phone || 'N/A',
        email: cust?.email || undefined,
        vehicleDetails: vehicleDesc,
        route: routeDesc,
        estimatedTotalUsd: quote?.total_charges_usd_max || 0,
        status: (item.status as EnquiryStatus) || 'new',
        createdAt: item.created_at,
        source: (item.source as 'web_calculator' | 'whatsapp' | 'manual') || 'web_calculator',
      };
    });
  },

  async updateEnquiryStatus(
    enquiryId: string,
    newStatus: EnquiryStatus,
    notes?: string
  ): Promise<boolean> {
    const { error } = await supabase.rpc('admin_update_enquiry_status', {
      p_enquiry_id: enquiryId,
      p_new_status: newStatus,
      p_notes: notes || `Status updated to ${newStatus} by staff`,
    });

    if (error) {
      // Fallback to direct update if permitted by RLS
      const { error: directError } = await supabase
        .from('enquiries')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', enquiryId);

      if (directError) {
        throw new Error(directError.message || 'Unable to update enquiry status.');
      }
    }

    return true;
  },

  async createEnquiry(
    enquiry: Omit<CustomerEnquiry, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; id: string }> {
    const enquiryTable = supabase.from('enquiries') as unknown as {
      insert: (rows: unknown[]) => {
        select: (col: string) => {
          single: () => Promise<{ data: { id: string } | null; error: Error | null }>;
        };
      };
    };

    const { data, error } = await enquiryTable
      .insert([
        {
          reference_number: enquiry.referenceNumber,
          status: enquiry.status,
          source: enquiry.source,
        },
      ])
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message || 'Unable to save enquiry.');
    }

    if (!data?.id) {
      throw new Error('Enquiry was not created.');
    }

    return { success: true, id: data.id };
  },
};
