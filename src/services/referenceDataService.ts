import { supabase } from '../lib/supabase';
import { PortOption } from '../types/calculator';

export interface PurchaseLocationOption {
  id: string;
  name: string;
  stateCode: string;
  postalCode?: string;
  defaultLoadingPortId: string | null;
  purchaseSourceId: string;
}

// Baseline port mappings for ID reference
export const PORT_CODE_TO_UUID: Record<string, string> = {
  USNWK: '10000000-0000-0000-0000-000000000001',
  USSAV: '10000000-0000-0000-0000-000000000002',
  USHOU: '10000000-0000-0000-0000-000000000003',
  USLAX: '10000000-0000-0000-0000-000000000004',
  AEKLF: '20000000-0000-0000-0000-000000000001',
  AEJEA: '20000000-0000-0000-0000-000000000002',
};

export const PORT_SLUG_TO_UUID: Record<string, string> = {
  newark: '10000000-0000-0000-0000-000000000001',
  savannah: '10000000-0000-0000-0000-000000000002',
  houston: '10000000-0000-0000-0000-000000000003',
  los_angeles: '10000000-0000-0000-0000-000000000004',
  khorfakkan: '20000000-0000-0000-0000-000000000001',
  jebel_ali: '20000000-0000-0000-0000-000000000002',
};

export const referenceDataService = {
  async getLoadingPorts(): Promise<PortOption[]> {
    const { data, error } = await supabase
      .from('ports')
      .select('*')
      .eq('is_active', true)
      .eq('is_loading_port', true)
      .order('name');

    if (error) {
      throw new Error(error.message || 'Unable to load loading ports from database.');
    }

    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      stateOrCity: p.state_or_city || '',
      country: p.country_code,
      code: p.code,
    }));
  },

  async getDestinationPorts(): Promise<PortOption[]> {
    const { data, error } = await supabase
      .from('ports')
      .select('*')
      .eq('is_active', true)
      .eq('is_destination_port', true)
      .order('name');

    if (error) {
      throw new Error(error.message || 'Unable to load destination ports from database.');
    }

    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      stateOrCity: p.state_or_city || '',
      country: p.country_code,
      code: p.code,
    }));
  },

  async getPurchaseLocations(): Promise<PurchaseLocationOption[]> {
    const { data, error } = await supabase
      .from('purchase_locations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(error.message || 'Unable to load purchase locations from database.');
    }

    return (data || []).map((l) => ({
      id: l.id,
      name: l.name,
      stateCode: l.state_code,
      postalCode: l.postal_code || undefined,
      defaultLoadingPortId: l.default_loading_port_id,
      purchaseSourceId: l.purchase_source_id,
    }));
  },
};
