import { supabase } from '../lib/supabase';
import type { Json } from '../types/database';

export interface AdminQuotation {
  id: string;
  referenceNumber: string;
  enquiryId: string;
  version: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  route: string;
  vehicleDetails: string;
  oceanFreightUsd: number;
  towingFeeMin: number;
  towingFeeMax: number;
  isTowingRange: boolean;
  customsDutyUsd: number;
  importVatUsd: number;
  totalUsdMin: number;
  totalUsdMax: number;
  totalAedMin: number;
  totalAedMax: number;
  disclaimer?: string;
  createdAt: string;
  lineItems?: Array<{
    category: string;
    description: string;
    amountUsd: number;
    amountAed: number;
    isEstimate: boolean;
  }>;
}

export interface AdminCustomer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  country?: string;
  city?: string;
  notes?: string;
  createdAt: string;
  vehicleCount?: number;
  enquiryCount?: number;
}

export interface AdminRoute {
  id: string;
  originPortName: string;
  originPortCode: string;
  destinationPortName: string;
  destinationPortCode: string;
  transitDaysMin: number;
  transitDaysMax: number;
  isActive: boolean;
  createdAt: string;
}

export interface AdminPort {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  stateOrCity?: string;
  isLoadingPort: boolean;
  isDestinationPort: boolean;
  isActive: boolean;
}

export interface AdminCountry {
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminFreightRate {
  id: string;
  routeDesc: string;
  category: string;
  shippingMethod: string;
  amountUsd: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface AdminTowingRate {
  id: string;
  originLocation: string;
  loadingPort: string;
  vehicleCategory: string;
  rateType: string;
  fixedAmount: number;
  minAmount: number;
  maxAmount: number;
  isRange: boolean;
  isActive: boolean;
}

export interface AdminCmsNotice {
  id: string;
  title: string;
  titleAr?: string;
  content: string;
  contentAr?: string;
  bannerType: 'info' | 'warning' | 'success' | 'announcement';
  displayLocation: 'all' | 'calculator' | 'home' | 'portal';
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface AdminAuditEvent {
  id: string;
  entityTable: string;
  entityId: string;
  action: string;
  performedByEmail?: string;
  performedByName?: string;
  performedAt: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export const adminService = {
  // Quotations
  async getQuotations(): Promise<AdminQuotation[]> {
    const { data, error } = await supabase
      .from('quotations')
      .select(
        `
        id,
        reference_number,
        enquiry_id,
        version,
        pricing_snapshot,
        subtotal_ocean_freight,
        towing_fee_min,
        towing_fee_max,
        is_towing_range,
        customs_duty,
        import_vat,
        total_charges_usd_min,
        total_charges_usd_max,
        total_charges_aed_min,
        total_charges_aed_max,
        disclaimer,
        created_at,
        enquiries (
          customers (
            full_name,
            phone,
            email
          )
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load quotations.');
    }

    interface RawQuoteRow {
      id: string;
      reference_number: string;
      enquiry_id: string;
      version: number;
      pricing_snapshot: {
        vehicle?: { category_id?: string; make?: string; model?: string; year?: number };
        route?: { origin_port_name?: string; destination_port_name?: string };
      } | null;
      subtotal_ocean_freight: number;
      towing_fee_min: number;
      towing_fee_max: number;
      is_towing_range: boolean;
      customs_duty: number;
      import_vat: number;
      total_charges_usd_min: number;
      total_charges_usd_max: number;
      total_charges_aed_min: number;
      total_charges_aed_max: number;
      disclaimer: string | null;
      created_at: string;
      enquiries: {
        customers: {
          full_name: string | null;
          phone: string | null;
          email: string | null;
        } | null;
      } | null;
    }

    const rows = data as unknown as RawQuoteRow[];

    return rows.map((q) => {
      const cust = q.enquiries?.customers;
      const snap = q.pricing_snapshot;
      const vehicleDesc = snap?.vehicle
        ? `${snap.vehicle.year || ''} ${snap.vehicle.make || ''} ${snap.vehicle.model || ''}`.trim()
        : 'Standard Vehicle';
      const originPort = snap?.route?.origin_port_name || 'USA';
      const destPort = snap?.route?.destination_port_name || 'UAE';

      return {
        id: q.id,
        referenceNumber: q.reference_number,
        enquiryId: q.enquiry_id,
        version: q.version || 1,
        customerName: cust?.full_name || 'Direct Customer',
        customerPhone: cust?.phone || 'N/A',
        customerEmail: cust?.email || undefined,
        route: `${originPort} -> ${destPort}`,
        vehicleDetails: vehicleDesc,
        oceanFreightUsd: Number(q.subtotal_ocean_freight || 0),
        towingFeeMin: Number(q.towing_fee_min || 0),
        towingFeeMax: Number(q.towing_fee_max || 0),
        isTowingRange: Boolean(q.is_towing_range),
        customsDutyUsd: Number(q.customs_duty || 0),
        importVatUsd: Number(q.import_vat || 0),
        totalUsdMin: Number(q.total_charges_usd_min || 0),
        totalUsdMax: Number(q.total_charges_usd_max || 0),
        totalAedMin: Number(q.total_charges_aed_min || 0),
        totalAedMax: Number(q.total_charges_aed_max || 0),
        disclaimer: q.disclaimer || undefined,
        createdAt: q.created_at,
      };
    });
  },

  // Customers
  async getCustomers(): Promise<AdminCustomer[]> {
    const [custRes, vehRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('customer_vehicles').select('customer_id'),
    ]);

    if (custRes.error) {
      throw new Error(custRes.error.message || 'Unable to load customers.');
    }
    if (vehRes.error) {
      throw new Error(vehRes.error.message || 'Unable to load customer vehicle counts.');
    }

    const vehCounts = new Map<string, number>();
    if (vehRes.data) {
      for (const v of vehRes.data) {
        vehCounts.set(v.customer_id, (vehCounts.get(v.customer_id) || 0) + 1);
      }
    }

    return (custRes.data || []).map((c) => ({
      id: c.id,
      fullName: c.full_name || 'Valued Customer',
      phone: c.phone || '',
      email: c.email || undefined,
      country: c.country || undefined,
      city: c.city || undefined,
      notes: c.notes || undefined,
      createdAt: c.created_at,
      vehicleCount: vehCounts.get(c.id) || 0,
    }));
  },

  async createCustomer(customer: {
    fullName: string;
    phone: string;
    email?: string;
    city?: string;
    country?: string;
    notes?: string;
  }): Promise<{ success: boolean; id?: string }> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        full_name: customer.fullName.trim(),
        phone: customer.phone.trim(),
        email: customer.email?.trim() || null,
        city: customer.city?.trim() || null,
        country: customer.country?.trim() || 'UAE',
        notes: customer.notes?.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message || 'Unable to register customer.');
    }

    return { success: true, id: data?.id };
  },

  // Routes, Ports & Countries
  async getRoutes(): Promise<AdminRoute[]> {
    const { data, error } = await supabase
      .from('shipping_routes')
      .select(
        `
        id,
        transit_days_min,
        transit_days_max,
        is_active,
        created_at,
        origin_port:ports!shipping_routes_origin_port_id_fkey (
          name,
          code
        ),
        dest_port:ports!shipping_routes_destination_port_id_fkey (
          name,
          code
        )
      `
      )
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Unable to load shipping routes.');
    }

    interface RawRoute {
      id: string;
      transit_days_min: number;
      transit_days_max: number;
      is_active: boolean;
      created_at: string;
      origin_port: { name: string; code: string } | null;
      dest_port: { name: string; code: string } | null;
    }

    const rows = (data || []) as unknown as RawRoute[];
    return rows.map((r) => ({
      id: r.id,
      originPortName: r.origin_port?.name || 'Origin Port',
      originPortCode: r.origin_port?.code || 'ORIGIN',
      destinationPortName: r.dest_port?.name || 'Destination Port',
      destinationPortCode: r.dest_port?.code || 'DEST',
      transitDaysMin: r.transit_days_min,
      transitDaysMax: r.transit_days_max,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
    }));
  },

  async toggleRouteStatus(routeId: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('shipping_routes')
      .update({ is_active: isActive })
      .eq('id', routeId);
    if (error) throw new Error(error.message || 'Unable to update route status.');
    return true;
  },

  async getPorts(): Promise<AdminPort[]> {
    const { data, error } = await supabase
      .from('ports')
      .select('*')
      .order('country_code', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Unable to load ports.');
    }

    return (data || []).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      countryCode: p.country_code,
      stateOrCity: p.state_or_city || undefined,
      isLoadingPort: Boolean(p.is_loading_port),
      isDestinationPort: Boolean(p.is_destination_port),
      isActive: Boolean(p.is_active),
    }));
  },

  async togglePortStatus(portId: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase.from('ports').update({ is_active: isActive }).eq('id', portId);
    if (error) throw new Error(error.message || 'Unable to update port status.');
    return true;
  },

  async getCountries(): Promise<AdminCountry[]> {
    const { data, error } = await supabase.from('countries').select('*').order('code');
    if (error) {
      throw new Error(error.message || 'Unable to load countries.');
    }
    return (data || []).map((c) => ({
      code: c.code,
      name: c.name,
      isActive: Boolean(c.is_active),
      createdAt: c.created_at,
    }));
  },

  // Tariffs & Towing
  async getFreightRates(): Promise<AdminFreightRate[]> {
    const { data, error } = await supabase
      .from('route_freight_rates')
      .select(
        `
        id,
        vehicle_category_id,
        shipping_method_id,
        rate_amount,
        effective_from,
        effective_to,
        is_active,
        shipping_routes (
          origin_port:ports!shipping_routes_origin_port_id_fkey ( name ),
          dest_port:ports!shipping_routes_destination_port_id_fkey ( name )
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load freight rates.');
    }

    interface RawFreight {
      id: string;
      vehicle_category_id: string;
      shipping_method_id: string;
      rate_amount: number;
      effective_from: string;
      effective_to: string | null;
      is_active: boolean;
      shipping_routes: {
        origin_port: { name: string } | null;
        dest_port: { name: string } | null;
      } | null;
    }

    const rows = (data || []) as unknown as RawFreight[];
    return rows.map((r) => {
      const origin = r.shipping_routes?.origin_port?.name || 'USA Port';
      const dest = r.shipping_routes?.dest_port?.name || 'UAE Port';
      return {
        id: r.id,
        routeDesc: `${origin} -> ${dest}`,
        category: r.vehicle_category_id.toUpperCase(),
        shippingMethod: r.shipping_method_id.toUpperCase(),
        amountUsd: Number(r.rate_amount),
        effectiveFrom: r.effective_from,
        effectiveTo: r.effective_to || undefined,
        isActive: Boolean(r.is_active),
      };
    });
  },

  async getTowingRates(): Promise<AdminTowingRate[]> {
    const { data, error } = await supabase
      .from('towing_rates')
      .select(
        `
        id,
        vehicle_category_id,
        rate_type,
        fixed_amount,
        min_amount,
        max_amount,
        is_active,
        purchase_locations (
          state_or_city,
          source_type
        ),
        ports:loading_port_id (
          name
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load towing rates.');
    }

    interface RawTowing {
      id: string;
      vehicle_category_id: string;
      rate_type: string;
      fixed_amount: number | null;
      min_amount: number | null;
      max_amount: number | null;
      is_active: boolean;
      purchase_locations: { state_or_city: string; source_type: string } | null;
      ports: { name: string } | null;
    }

    const rows = (data || []) as unknown as RawTowing[];
    return rows.map((t) => ({
      id: t.id,
      originLocation: t.purchase_locations?.state_or_city || 'State/Auction',
      loadingPort: t.ports?.name || 'Departure Port',
      vehicleCategory: t.vehicle_category_id.toUpperCase(),
      rateType: t.rate_type,
      fixedAmount: Number(t.fixed_amount || 0),
      minAmount: Number(t.min_amount || 0),
      maxAmount: Number(t.max_amount || 0),
      isRange: t.rate_type === 'range',
      isActive: Boolean(t.is_active),
    }));
  },

  async getExchangeRate(): Promise<{ rate: number; updatedAt: string }> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('to_currency', 'AED')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Unable to load exchange rate.');
    }

    return {
      rate: Number(data?.rate || 3.6725),
      updatedAt: data?.effective_from || new Date().toISOString(),
    };
  },

  async updateExchangeRate(newRate: number): Promise<boolean> {
    const { error } = await supabase.from('exchange_rates').insert({
      from_currency: 'USD',
      to_currency: 'AED',
      rate: newRate,
      effective_from: new Date().toISOString(),
    });
    if (error) throw new Error(error.message || 'Failed to record updated exchange rate.');
    return true;
  },

  // CMS
  async getCmsNotices(): Promise<AdminCmsNotice[]> {
    const { data, error } = await supabase
      .from('cms_notices')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Unable to load CMS notices.');
    }

    return (data || []).map((n) => ({
      id: n.id,
      title: n.title,
      titleAr: n.title_ar || undefined,
      content: n.content,
      contentAr: n.content_ar || undefined,
      bannerType: n.banner_type as 'info' | 'warning' | 'success' | 'announcement',
      displayLocation: n.display_location as 'all' | 'calculator' | 'home' | 'portal',
      isActive: Boolean(n.is_active),
      displayOrder: n.display_order,
      createdAt: n.created_at || new Date().toISOString(),
    }));
  },

  async saveCmsNotice(notice: {
    id?: string;
    title: string;
    titleAr?: string;
    content: string;
    contentAr?: string;
    bannerType: string;
    displayLocation: string;
    isActive: boolean;
  }): Promise<boolean> {
    if (notice.id) {
      const { error } = await supabase
        .from('cms_notices')
        .update({
          title: notice.title.trim(),
          title_ar: notice.titleAr?.trim() || null,
          content: notice.content.trim(),
          content_ar: notice.contentAr?.trim() || null,
          banner_type: notice.bannerType,
          display_location: notice.displayLocation,
          is_active: notice.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notice.id);
      if (error) throw new Error(error.message || 'Failed to update CMS notice.');
    } else {
      const { error } = await supabase.from('cms_notices').insert({
        title: notice.title.trim(),
        title_ar: notice.titleAr?.trim() || null,
        content: notice.content.trim(),
        content_ar: notice.contentAr?.trim() || null,
        banner_type: notice.bannerType,
        display_location: notice.displayLocation,
        is_active: notice.isActive,
      });
      if (error) throw new Error(error.message || 'Failed to create CMS notice.');
    }
    return true;
  },

  async deleteCmsNotice(noticeId: string): Promise<boolean> {
    const { error } = await supabase.from('cms_notices').delete().eq('id', noticeId);
    if (error) throw new Error(error.message || 'Failed to delete CMS notice.');
    return true;
  },

  // Settings
  async getSystemSettings(): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from('system_settings').select('*');
    if (error) {
      throw new Error(error.message || 'Unable to load system settings.');
    }
    const map: Record<string, unknown> = {};
    if (data) {
      for (const item of data) {
        map[item.key] = item.value;
      }
    }
    return map;
  },

  async updateSystemSetting(key: string, value: Record<string, unknown>): Promise<boolean> {
    const { error } = await supabase.from('system_settings').upsert({
      key,
      value: value as unknown as Json,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message || 'Failed to save settings.');
    return true;
  },

  // Audit Events
  async getAuditEvents(): Promise<AdminAuditEvent[]> {
    const { data, error } = await supabase
      .from('audit_events')
      .select(
        `
        id,
        entity_table,
        entity_id,
        action,
        old_data,
        new_data,
        performed_at,
        staff_profiles:performed_by (
          full_name,
          email
        )
      `
      )
      .order('performed_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message || 'Unable to load audit events.');
    }

    interface RawAudit {
      id: string;
      entity_table: string;
      entity_id: string;
      action: string;
      old_data: Record<string, unknown> | null;
      new_data: Record<string, unknown> | null;
      performed_at: string;
      staff_profiles: { full_name: string | null; email: string | null } | null;
    }

    const rows = (data || []) as unknown as RawAudit[];
    return rows.map((a) => ({
      id: a.id,
      entityTable: a.entity_table,
      entityId: a.entity_id,
      action: a.action,
      performedByEmail: a.staff_profiles?.email || 'System Operation',
      performedByName: a.staff_profiles?.full_name || 'System Automated',
      performedAt: a.performed_at,
      oldData: a.old_data || undefined,
      newData: a.new_data || undefined,
    }));
  },
};
