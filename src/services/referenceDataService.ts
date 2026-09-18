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
  nameAr?: string | null;
  extraTowingCharge?: number;
  extraShippingCharge?: number;
  chargeReasonEn?: string | null;
  chargeReasonAr?: string | null;
  isActive: boolean;
}

export interface PowertrainOption {
  id: string;
  name: string;
  nameAr?: string | null;
  extraTowingCharge?: number;
  extraShippingCharge?: number;
  chargeReasonEn?: string | null;
  chargeReasonAr?: string | null;
  isActive: boolean;
}

export interface VehicleConditionOption {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string;
  extraTowingCharge?: number;
  extraShippingCharge?: number;
  chargeReasonEn?: string | null;
  chargeReasonAr?: string | null;
  isActive: boolean;
}

export interface PurchaseSourceOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface StateOption {
  code: string;
  name: string;
  countryCode: string;
  displayOrder: number;
  isActive: boolean;
}

export interface PurchaseLocationOption {
  id: string;
  name: string;
  locationCode?: string;
  stateCode: string;
  city?: string;
  zipCode?: string;
  postalCode?: string;
  auctionCompany?: string;
  defaultLoadingPortId: string | null;
  purchaseSourceId: string | null;
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
      .select('id, name, name_ar, extra_towing_charge, extra_shipping_charge, charge_reason_en, charge_reason_ar, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[ReferenceDataService] Failed to load vehicle categories:', error);
      throw new Error(error.message || 'Unable to load vehicle categories.');
    }

    return (data || []).map((v) => ({
      id: v.id,
      name: v.name,
      nameAr: v.name_ar,
      extraTowingCharge: Number(v.extra_towing_charge || 0),
      extraShippingCharge: Number(v.extra_shipping_charge || 0),
      chargeReasonEn: v.charge_reason_en,
      chargeReasonAr: v.charge_reason_ar,
      isActive: v.is_active,
    }));
  },

  async getPowertrains(): Promise<PowertrainOption[]> {
    const { data, error } = await supabase
      .from('powertrains')
      .select('id, name, name_ar, extra_towing_charge, extra_shipping_charge, charge_reason_en, charge_reason_ar, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[ReferenceDataService] Failed to load powertrains:', error);
      throw new Error(error.message || 'Unable to load powertrains.');
    }

    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.name_ar,
      extraTowingCharge: Number(p.extra_towing_charge || 0),
      extraShippingCharge: Number(p.extra_shipping_charge || 0),
      chargeReasonEn: p.charge_reason_en,
      chargeReasonAr: p.charge_reason_ar,
      isActive: p.is_active,
    }));
  },

  async getVehicleConditions(): Promise<VehicleConditionOption[]> {
    const { data, error } = await supabase
      .from('vehicle_conditions')
      .select('id, name, name_ar, description, extra_towing_charge, extra_shipping_charge, charge_reason_en, charge_reason_ar, is_active')
      .eq('is_active', true)
      .order('id');

    if (error) {
      console.error('[ReferenceDataService] Failed to load vehicle conditions:', error);
      throw new Error(error.message || 'Unable to load vehicle conditions.');
    }

    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      nameAr: c.name_ar,
      description: c.description || undefined,
      extraTowingCharge: Number(c.extra_towing_charge || 0),
      extraShippingCharge: Number(c.extra_shipping_charge || 0),
      chargeReasonEn: c.charge_reason_en,
      chargeReasonAr: c.charge_reason_ar,
      isActive: c.is_active,
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

  async getStates(countryCode = 'USA'): Promise<StateOption[]> {
    const { data, error } = await supabase
      .from('states')
      .select('code, name, country_code, display_order, is_active, is_archived')
      .eq('is_active', true)
      .eq('is_archived', false)
      .eq('country_code', countryCode)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('[ReferenceDataService] Failed to load states:', error);
      throw new Error(error.message || 'Unable to load states.');
    }

    return (data || []).map((s) => ({
      code: s.code,
      name: s.name,
      countryCode: s.country_code,
      displayOrder: s.display_order,
      isActive: s.is_active,
    }));
  },

  async getPurchaseLocations(purchaseSourceId?: string, stateCode?: string): Promise<PurchaseLocationOption[]> {
    let query = supabase
      .from('purchase_locations')
      .select('*')
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('name');

    if (purchaseSourceId) {
      query = query.eq('purchase_source_id', purchaseSourceId);
    }
    if (stateCode) {
      query = query.eq('state_code', stateCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ReferenceDataService] Failed to load purchase locations:', error);
      throw new Error(error.message || 'Unable to load purchase locations from database.');
    }

    return (data || []).map((l) => ({
      id: l.id,
      name: l.name,
      locationCode: l.location_code || undefined,
      stateCode: l.state_code,
      city: l.city || undefined,
      zipCode: l.zip_code || l.postal_code || undefined,
      postalCode: l.postal_code || undefined,
      auctionCompany: l.auction_company || undefined,
      defaultLoadingPortId: l.default_loading_port_id,
      purchaseSourceId: l.purchase_source_id,
    }));
  },
};
