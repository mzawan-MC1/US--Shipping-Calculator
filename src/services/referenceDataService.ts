import { supabase, isDemoMode } from '../lib/supabase';
import { PortOption } from '../types/calculator';

export interface PurchaseLocationOption {
  id: string;
  name: string;
  stateCode: string;
  postalCode?: string;
  defaultLoadingPortId: string | null;
  purchaseSourceId: string;
}

// Baseline port mappings
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

// Purchase locations baseline
export const BASELINE_PURCHASE_LOCATIONS: PurchaseLocationOption[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    name: 'Copart Atlanta South',
    stateCode: 'GA',
    postalCode: '30260',
    defaultLoadingPortId: '10000000-0000-0000-0000-000000000002',
    purchaseSourceId: 'copart',
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    name: 'Copart Dallas South',
    stateCode: 'TX',
    postalCode: '75241',
    defaultLoadingPortId: '10000000-0000-0000-0000-000000000003',
    purchaseSourceId: 'copart',
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    name: 'IAAI Los Angeles / Anaheim',
    stateCode: 'CA',
    postalCode: '92806',
    defaultLoadingPortId: '10000000-0000-0000-0000-000000000004',
    purchaseSourceId: 'iaai',
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    name: 'Copart Northgate (New Jersey)',
    stateCode: 'NJ',
    postalCode: '07001',
    defaultLoadingPortId: '10000000-0000-0000-0000-000000000001',
    purchaseSourceId: 'copart',
  },
];

export const referenceDataService = {
  async getLoadingPorts(): Promise<PortOption[]> {
    if (isDemoMode) {
      return [
        {
          id: '10000000-0000-0000-0000-000000000001',
          name: 'Port of New York / Newark',
          stateOrCity: 'New Jersey',
          country: 'USA',
          code: 'USNWK',
        },
        {
          id: '10000000-0000-0000-0000-000000000002',
          name: 'Port of Savannah',
          stateOrCity: 'Georgia',
          country: 'USA',
          code: 'USSAV',
        },
        {
          id: '10000000-0000-0000-0000-000000000003',
          name: 'Port of Houston',
          stateOrCity: 'Texas',
          country: 'USA',
          code: 'USHOU',
        },
        {
          id: '10000000-0000-0000-0000-000000000004',
          name: 'Port of Los Angeles / Long Beach',
          stateOrCity: 'California',
          country: 'USA',
          code: 'USLAX',
        },
      ];
    }

    try {
      const { data, error } = await supabase
        .from('ports')
        .select('*')
        .eq('is_active', true)
        .eq('is_loading_port', true)
        .order('name');

      if (error || !data || data.length === 0) {
        throw error || new Error('No ports returned');
      }

      return data.map((p) => ({
        id: p.id,
        name: p.name,
        stateOrCity: p.state_or_city || '',
        country: p.country_code,
        code: p.code,
      }));
    } catch (e) {
      console.warn(
        '[ReferenceDataService] Failed to fetch loading ports from DB, using baseline',
        e
      );
      return [
        {
          id: '10000000-0000-0000-0000-000000000001',
          name: 'Port of New York / Newark',
          stateOrCity: 'New Jersey',
          country: 'USA',
          code: 'USNWK',
        },
        {
          id: '10000000-0000-0000-0000-000000000002',
          name: 'Port of Savannah',
          stateOrCity: 'Georgia',
          country: 'USA',
          code: 'USSAV',
        },
        {
          id: '10000000-0000-0000-0000-000000000003',
          name: 'Port of Houston',
          stateOrCity: 'Texas',
          country: 'USA',
          code: 'USHOU',
        },
        {
          id: '10000000-0000-0000-0000-000000000004',
          name: 'Port of Los Angeles / Long Beach',
          stateOrCity: 'California',
          country: 'USA',
          code: 'USLAX',
        },
      ];
    }
  },

  async getDestinationPorts(): Promise<PortOption[]> {
    if (isDemoMode) {
      return [
        {
          id: '20000000-0000-0000-0000-000000000001',
          name: 'Port of Khor Fakkan',
          stateOrCity: 'Sharjah',
          country: 'UAE',
          code: 'AEKLF',
        },
        {
          id: '20000000-0000-0000-0000-000000000002',
          name: 'Port of Jebel Ali',
          stateOrCity: 'Dubai',
          country: 'UAE',
          code: 'AEJEA',
        },
      ];
    }

    try {
      const { data, error } = await supabase
        .from('ports')
        .select('*')
        .eq('is_active', true)
        .eq('is_destination_port', true)
        .order('name');

      if (error || !data || data.length === 0) {
        throw error || new Error('No destination ports returned');
      }

      return data.map((p) => ({
        id: p.id,
        name: p.name,
        stateOrCity: p.state_or_city || '',
        country: p.country_code,
        code: p.code,
      }));
    } catch (e) {
      console.warn(
        '[ReferenceDataService] Failed to fetch destination ports from DB, using baseline',
        e
      );
      return [
        {
          id: '20000000-0000-0000-0000-000000000001',
          name: 'Port of Khor Fakkan',
          stateOrCity: 'Sharjah',
          country: 'UAE',
          code: 'AEKLF',
        },
        {
          id: '20000000-0000-0000-0000-000000000002',
          name: 'Port of Jebel Ali',
          stateOrCity: 'Dubai',
          country: 'UAE',
          code: 'AEJEA',
        },
      ];
    }
  },

  async getPurchaseLocations(): Promise<PurchaseLocationOption[]> {
    if (isDemoMode) {
      return BASELINE_PURCHASE_LOCATIONS;
    }

    try {
      const { data, error } = await supabase
        .from('purchase_locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error || !data || data.length === 0) {
        return BASELINE_PURCHASE_LOCATIONS;
      }

      return data.map((l) => ({
        id: l.id,
        name: l.name,
        stateCode: l.state_code,
        postalCode: l.postal_code || undefined,
        defaultLoadingPortId: l.default_loading_port_id,
        purchaseSourceId: l.purchase_source_id,
      }));
    } catch (e) {
      console.warn('[ReferenceDataService] Failed to fetch locations from DB, using baseline', e);
      return BASELINE_PURCHASE_LOCATIONS;
    }
  },
};
