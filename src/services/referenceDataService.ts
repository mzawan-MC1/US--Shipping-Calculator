import { supabase } from '../lib/supabase';
import { PortOption } from '../types/calculator';

export interface CountryOption {
  code: string;
  name: string;
  nameAr?: string;
  isActive: boolean;
}

export interface ManagedPortOption extends PortOption {
  nameAr?: string;
  countryCode: string;
  isLoadingPort: boolean;
  isDestinationPort: boolean;
}

export interface RouteOption {
  id: string;
  originPortId: string;
  destinationPortId: string;
  transitDaysMin: number;
  transitDaysMax: number;
  isActive: boolean;
}

export interface ShippingMethodOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface VehicleCategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface PowertrainOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface PurchaseSourceOption {
  id: string;
  name: string;
  isActive: boolean;
}

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
  async getCountries(): Promise<CountryOption[]> {
    const { data, error } = await supabase
      .from('countries')
      .select('code, name, name_ar, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[ReferenceDataService] Failed to load countries:', error);
      throw new Error(error.message || 'Unable to load countries.');
    }

    return (data || []).map((c) => ({
      code: c.code,
      name: c.name,
      nameAr: c.name_ar || undefined,
      isActive: c.is_active,
    }));
  },

  async getLoadingPorts(countryCode?: string): Promise<ManagedPortOption[]> {
    let query = supabase
      .from('ports')
      .select('*')
      .eq('is_active', true)
      .eq('is_loading_port', true)
      .order('name');

    if (countryCode) {
      query = query.eq('country_code', countryCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ReferenceDataService] Failed to load loading ports:', error);
      throw new Error(error.message || 'Unable to load loading ports from database.');
    }

    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.name_ar || undefined,
      stateOrCity: p.state_or_city || '',
      country: p.country_code,
      countryCode: p.country_code,
      code: p.code,
      isLoadingPort: p.is_loading_port,
      isDestinationPort: p.is_destination_port,
    }));
  },

  async getDestinationPorts(countryCode?: string): Promise<ManagedPortOption[]> {
    let query = supabase
      .from('ports')
      .select('*')
      .eq('is_active', true)
      .eq('is_destination_port', true)
      .order('name');

    if (countryCode) {
      query = query.eq('country_code', countryCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ReferenceDataService] Failed to load destination ports:', error);
      throw new Error(error.message || 'Unable to load destination ports from database.');
    }

    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.name_ar || undefined,
      stateOrCity: p.state_or_city || '',
      country: p.country_code,
      countryCode: p.country_code,
      code: p.code,
      isLoadingPort: p.is_loading_port,
      isDestinationPort: p.is_destination_port,
    }));
  },

  async getActiveRoutes(): Promise<RouteOption[]> {
    const { data, error } = await supabase
      .from('shipping_routes')
      .select('id, origin_port_id, destination_port_id, transit_days_min, transit_days_max, is_active')
      .eq('is_active', true);

    if (error) {
      console.error('[ReferenceDataService] Failed to load shipping routes:', error);
      throw new Error(error.message || 'Unable to load shipping routes.');
    }

    return (data || []).map((r) => ({
      id: r.id,
      originPortId: r.origin_port_id,
      destinationPortId: r.destination_port_id,
      transitDaysMin: r.transit_days_min,
      transitDaysMax: r.transit_days_max,
      isActive: r.is_active,
    }));
  },

  async getShippingMethods(): Promise<ShippingMethodOption[]> {
    const { data, error } = await supabase
      .from('shipping_methods')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[ReferenceDataService] Failed to load shipping methods:', error);
      throw new Error(error.message || 'Unable to load shipping methods.');
    }

    return (data || []).map((s) => ({
      id: s.id,
      name: s.name,
      isActive: s.is_active,
    }));
  },

  async getVehicleCategories(): Promise<VehicleCategoryOption[]> {
    const { data, error } = await supabase
      .from('vehicle_categories')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[ReferenceDataService] Failed to load vehicle categories:', error);
      throw new Error(error.message || 'Unable to load vehicle categories.');
    }

    return (data || []).map((v) => ({
      id: v.id,
      name: v.name,
      isActive: v.is_active,
    }));
  },

  async getPowertrains(): Promise<PowertrainOption[]> {
    const { data, error } = await supabase
      .from('powertrains')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[ReferenceDataService] Failed to load powertrains:', error);
      throw new Error(error.message || 'Unable to load powertrains.');
    }

    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      isActive: p.is_active,
    }));
  },

  async getPurchaseSources(): Promise<PurchaseSourceOption[]> {
    const { data, error } = await supabase
      .from('purchase_sources')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[ReferenceDataService] Failed to load purchase sources:', error);
      throw new Error(error.message || 'Unable to load purchase sources.');
    }

    return (data || []).map((s) => ({
      id: s.id,
      name: s.name,
      isActive: s.is_active,
    }));
  },

  async getPurchaseLocations(purchaseSourceId?: string): Promise<PurchaseLocationOption[]> {
    let query = supabase
      .from('purchase_locations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (purchaseSourceId) {
      query = query.eq('purchase_source_id', purchaseSourceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ReferenceDataService] Failed to load purchase locations:', error);
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
