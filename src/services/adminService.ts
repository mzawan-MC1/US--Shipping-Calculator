import { supabase } from '../lib/supabase';
import { normalizePhone } from '../lib/utils';
import type { Database, Json } from '../types/database';

type RouteUpdate = Database['public']['Tables']['shipping_routes']['Update'];
type PortUpdate = Database['public']['Tables']['ports']['Update'];
type CountryUpdate = Database['public']['Tables']['countries']['Update'];
type FreightRateUpdate = Database['public']['Tables']['route_freight_rates']['Update'];
type TowingRateUpdate = Database['public']['Tables']['towing_rates']['Update'];
type ShippingMethodUpdate = Database['public']['Tables']['shipping_methods']['Update'];
type AdditionalChargeRuleUpdate = Database['public']['Tables']['additional_charge_rules']['Update'];

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
  exchangeRate?: number;
  declaredValueUsd?: number;
  cifMin?: number;
  cifMax?: number;
  customsClearanceUsd?: number;
  portHandlingUsd?: number;
  surchargesUsd?: number;
  pricingSnapshot?: Record<string, unknown>;
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

export interface AdminCustomerProfile {
  customer: AdminCustomer;
  enquiries: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    source: string;
    notes?: string;
    createdAt: string;
  }>;
  quotations: Array<{
    id: string;
    referenceNumber: string;
    enquiryReference?: string;
    totalUsd: number;
    totalAed: number;
    route: string;
    vehicle: string;
    createdAt: string;
  }>;
  stats: {
    totalEnquiries: number;
    totalQuotations: number;
    firstEnquiryDate: string | null;
    lastActivityDate: string | null;
  };
}

export interface AdminRoute {
  id: string;
  originPortId: string;
  originPortName: string;
  originPortCode: string;
  destinationPortId: string;
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
  nameAr?: string;
  countryCode: string;
  stateOrCity?: string;
  isLoadingPort: boolean;
  isDestinationPort: boolean;
  isActive: boolean;
}

export interface AdminCountry {
  code: string;
  name: string;
  nameAr?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminFreightRate {
  id: string;
  routeId: string;
  routeDesc: string;
  originPortName: string;
  originPortCode: string;
  destinationPortName: string;
  destinationPortCode: string;
  vehicleCategoryId: string;
  category: string;
  powertrainId: string;
  powertrain: string;
  shippingMethodId: string;
  shippingMethod: string;
  amountUsd: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface AdminTowingRate {
  id: string;
  purchaseLocationId: string;
  loadingPortId: string;
  originLocation: string;
  stateCode?: string;
  loadingPort: string;
  vehicleCategoryId?: string;
  vehicleCategory: string;
  vehicleConditionId?: string;
  vehicleCondition: string;
  rateType: 'fixed' | 'range';
  fixedAmount: number;
  minAmount: number;
  maxAmount: number;
  currency: string;
  isRange: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface AdminVehicleCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AdminShippingMethod {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface AdminPowertrain {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AdminPurchaseLocation {
  id: string;
  name: string;
  stateCode: string;
  postalCode?: string;
  purchaseSourceId: string;
  defaultLoadingPortId?: string;
  isActive: boolean;
}

export interface AdminAdditionalChargeRule {
  id: string;
  name: string;
  category: string;
  chargeType: string;
  amount: number;
  currency: string;
  isMandatory: boolean;
  isIncludedInVatBase: boolean;
  countryCode?: string;
  destinationPortId?: string;
  isActive: boolean;
}

export interface BrandingSettings {
  companyName: string;
  companyNameAr: string;
  shortName: string;
  shortNameAr: string;
  tagline: string;
  taglineAr: string;
  logoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  browserTitle: string;
  browserTitleAr: string;
  metaDescription: string;
  metaDescriptionAr: string;
  supportPhone: string;
  supportEmail: string;
  whatsappNumber: string;
  headquartersAddress: string;
  headquartersAddressAr: string;
  businessHours: string;
  businessHoursAr: string;
  copyrightText: string;
  copyrightTextAr: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };

  // Hero CMS Settings
  heroEyebrowEn?: string;
  heroEyebrowAr?: string;
  heroHeadlineEn?: string;
  heroHeadlineAr?: string;
  heroDescriptionEn?: string;
  heroDescriptionAr?: string;
  heroImageUrl?: string;
  heroVideoUrl?: string;
  heroVideoPosterUrl?: string;
  heroMediaType?: 'image' | 'video';
  heroMotionEnabled?: boolean;
  heroPrimaryCtaLabel?: string;
  heroPrimaryCtaLabelAr?: string;
  heroPrimaryCtaDestination?: string;
  heroSecondaryCtaLabel?: string;
  heroSecondaryCtaLabelAr?: string;
  heroSecondaryCtaDestination?: string;

  // Location / Google Maps Settings
  locationSectionEnabled?: boolean;
  locationHeadingEn?: string;
  locationHeadingAr?: string;
  googleMapsLocationUrl?: string;
  googleMapsEmbedUrl?: string;
}

export const DEFAULT_BRANDING: BrandingSettings = {
  companyName: 'Fakher Alam Used Cars Shipping',
  companyNameAr: 'فاخر علم لشحن السيارات المستعملة',
  shortName: 'Fakher Alam',
  shortNameAr: 'فاخر علم',
  tagline: 'Premier Auto Logistics from US Auctions to UAE Ports',
  taglineAr: 'رواد الشحن البحري للسيارات من مزادات أمريكا إلى موانئ الإمارات',
  logoUrl: '',
  darkLogoUrl: '',
  faviconUrl: '',
  browserTitle: 'Fakher Alam Used Cars Shipping | US to UAE Auto Logistics',
  browserTitleAr: 'فاخر علم لشحن السيارات المستعملة | شحن السيارات من أمريكا إلى الإمارات',
  metaDescription:
    'Authoritative ocean container shipping, inland towing, customs clearance, and statutory duty calculation for vehicle imports into the UAE.',
  metaDescriptionAr:
    'خدمات الشحن البحري، القطر الداخلي، التخليص الجمركي، وحساب الرسوم بدقة لاستيراد المركبات إلى دولة الإمارات العربية المتحدة.',
  supportPhone: '+971508322799',
  supportEmail: 'info@mc1services.com',
  whatsappNumber: '+971508322799',
  headquartersAddress: 'Industrial Area 2, Sharjah, UAE',
  headquartersAddressAr: 'المنطقة الصناعية 2، الشارقة، الإمارات العربية المتحدة',
  businessHours: 'Saturday – Thursday: 9:00 AM – 8:00 PM (GST)',
  businessHoursAr: 'السبت – الخميس: 9:00 صباحاً – 8:00 مساءً (توقيت الإمارات)',
  copyrightText: 'Fakher Alam Used Cars Shipping. All rights reserved.',
  copyrightTextAr: 'فاخر علم لشحن السيارات المستعملة. جميع الحقوق محفوظة.',
  socialLinks: {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
  },

  heroEyebrowEn: 'Licensed Vehicle Shipping • USA to UAE',
  heroEyebrowAr: 'شحن مركبات مرخص • من أمريكا إلى الإمارات',
  heroHeadlineEn: 'Ship Your Vehicle from the USA to the UAE',
  heroHeadlineAr: 'اشحن مركبتك من الولايات المتحدة إلى الإمارات',
  heroDescriptionEn:
    'Reliable vehicle shipping from major US auctions and ports to the UAE—with transparent estimates, inland towing coordination and dedicated customer support.',
  heroDescriptionAr:
    'شحن موثوق للمركبات من كبرى مزادات وموانئ أمريكا إلى الإمارات—مع تقديرات شفافة، وتنسيق القطر الداخلي، ودعم عملاء مخصص.',
  heroImageUrl: '',
  heroVideoUrl: '',
  heroVideoPosterUrl: '',
  heroMediaType: 'image',
  heroMotionEnabled: true,
  heroPrimaryCtaLabel: 'Calculate Shipping',
  heroPrimaryCtaLabelAr: 'احسب تكلفة الشحن',
  heroPrimaryCtaDestination: '/calculator',
  heroSecondaryCtaLabel: 'Get a WhatsApp Quote',
  heroSecondaryCtaLabelAr: 'طلب عرض عبر واتساب',
  heroSecondaryCtaDestination: 'whatsapp',

  locationSectionEnabled: true,
  locationHeadingEn: 'Visit Our Office & Operations Yard',
  locationHeadingAr: 'تفضل بزيارة مكتبنا والساحة التشغيلية',
  googleMapsLocationUrl: 'https://maps.google.com/?q=Industrial+Area+2,+Sharjah,+UAE',
  googleMapsEmbedUrl:
    'https://maps.google.com/maps?q=Industrial+Area+2,+Sharjah,+UAE&t=&z=14&ie=UTF8&iwloc=&output=embed',
};

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
        exchange_rate,
        subtotal_ocean_freight,
        towing_fee_min,
        towing_fee_max,
        is_towing_range,
        customs_clearance_fee,
        port_additional_charges,
        cif_value,
        customs_duty,
        import_vat,
        total_charges_usd_min,
        total_charges_usd_max,
        total_charges_aed_min,
        total_charges_aed_max,
        disclaimer,
        created_at,
        enquiries (
          id,
          reference_number,
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
      throw new Error(error.message || 'Unable to load live quotations.');
    }

    interface RawQuote {
      id: string;
      reference_number: string;
      enquiry_id: string;
      version: number;
      pricing_snapshot: {
        customer?: { full_name?: string; phone?: string; email?: string };
        route?: { origin_port_name?: string; destination_port_name?: string };
        vehicle?: { category_name?: string; make?: string; model?: string; year?: number; declared_value_usd?: number };
        financials?: {
          declared_value_usd?: number;
          cif_value_min?: number;
          cif_value_max?: number;
          surcharges_total?: number;
          customs_clearance_fee?: number;
          port_additional_charges?: number;
          exchange_rate?: number;
        };
        line_items?: Array<{
          category: string;
          description: string;
          amount_usd?: number;
          amount_aed?: number;
        }>;
      } | null;
      exchange_rate?: number;
      subtotal_ocean_freight: number;
      towing_fee_min: number;
      towing_fee_max: number;
      is_towing_range: boolean;
      customs_clearance_fee?: number;
      port_additional_charges?: number;
      cif_value?: number;
      customs_duty: number;
      import_vat: number;
      total_charges_usd_min: number;
      total_charges_usd_max: number;
      total_charges_aed_min: number;
      total_charges_aed_max: number;
      disclaimer?: string;
      created_at: string;
      enquiries: {
        customers: {
          full_name: string;
          phone: string;
          email?: string;
        } | null;
      } | null;
    }

    const rows = (data || []) as unknown as RawQuote[];
    return rows.map((q) => {
      const snap = q.pricing_snapshot;
      const cust = q.enquiries?.customers;
      const customerName = cust?.full_name || snap?.customer?.full_name || 'Client';
      const customerPhone = cust?.phone || snap?.customer?.phone || 'No phone recorded';
      const route = snap?.route
        ? `${snap.route.origin_port_name || 'USA'} -> ${snap.route.destination_port_name || 'UAE'}`
        : 'US to UAE Route';
      const veh = snap?.vehicle
        ? `${snap.vehicle.year ? snap.vehicle.year + ' ' : ''}${snap.vehicle.make || ''} ${snap.vehicle.model || ''} (${snap.vehicle.category_name || 'Vehicle'})`
        : 'Standard Vehicle';

      const declaredValueUsd = Number(snap?.financials?.declared_value_usd || snap?.vehicle?.declared_value_usd || 0);
      const cifMin = Number(q.cif_value || snap?.financials?.cif_value_min || 0);
      const cifMax = Number(q.cif_value || snap?.financials?.cif_value_max || 0);
      const customsClearanceUsd = Number(q.customs_clearance_fee || snap?.financials?.customs_clearance_fee || 150);
      const portHandlingUsd = Number(q.port_additional_charges || snap?.financials?.port_additional_charges || 200);
      const surchargesUsd = Number(snap?.financials?.surcharges_total || 0);
      const exchangeRate = Number(q.exchange_rate || snap?.financials?.exchange_rate || 3.6725);

      return {
        id: q.id,
        referenceNumber: q.reference_number,
        enquiryId: q.enquiry_id,
        version: q.version,
        customerName,
        customerPhone,
        customerEmail: cust?.email || snap?.customer?.email,
        route,
        vehicleDetails: veh.trim() || 'Vehicle',
        oceanFreightUsd: Number(q.subtotal_ocean_freight),
        towingFeeMin: Number(q.towing_fee_min),
        towingFeeMax: Number(q.towing_fee_max),
        isTowingRange: Boolean(q.is_towing_range),
        customsDutyUsd: Number(q.customs_duty),
        importVatUsd: Number(q.import_vat),
        totalUsdMin: Number(q.total_charges_usd_min),
        totalUsdMax: Number(q.total_charges_usd_max),
        totalAedMin: Number(q.total_charges_aed_min),
        totalAedMax: Number(q.total_charges_aed_max),
        exchangeRate,
        declaredValueUsd,
        cifMin,
        cifMax,
        customsClearanceUsd,
        portHandlingUsd,
        surchargesUsd,
        pricingSnapshot: snap as Record<string, unknown>,
        disclaimer: q.disclaimer,
        createdAt: q.created_at,
        lineItems: snap?.line_items?.map((li) => ({
          category: li.category,
          description: li.description,
          amountUsd: Number(li.amount_usd || 0),
          amountAed: Number(li.amount_aed || 0),
          isEstimate: li.category === 'towing' && q.is_towing_range,
        })),
      };
    });
  },

  // Customers
  async getCustomers(): Promise<AdminCustomer[]> {
    const [custRes, vehRes, enqRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('customer_vehicles').select('customer_id'),
      supabase.from('enquiries').select('customer_id'),
    ]);

    if (custRes.error) {
      throw new Error(custRes.error.message || 'Unable to load customer database.');
    }

    const vehCounts = new Map<string, number>();
    if (vehRes.data) {
      for (const v of vehRes.data) {
        vehCounts.set(v.customer_id, (vehCounts.get(v.customer_id) || 0) + 1);
      }
    }

    const enqCounts = new Map<string, number>();
    if (enqRes.data) {
      for (const e of enqRes.data) {
        enqCounts.set(e.customer_id, (enqCounts.get(e.customer_id) || 0) + 1);
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
      enquiryCount: enqCounts.get(c.id) || 0,
    }));
  },

  async getCustomerProfile(customerId: string): Promise<AdminCustomerProfile> {
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (custError || !customer) {
      throw new Error(custError?.message || 'Customer not found.');
    }

    const [enqRes, quoteRes] = await Promise.all([
      supabase
        .from('enquiries')
        .select('id, reference_number, status, source, notes, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('quotations')
        .select(`
          id,
          reference_number,
          total_charges_usd_max,
          total_charges_aed_max,
          pricing_snapshot,
          created_at,
          enquiries!inner (
            id,
            reference_number,
            customer_id
          )
        `)
        .eq('enquiries.customer_id', customerId)
        .order('created_at', { ascending: false }),
    ]);

    if (enqRes.error) {
      throw new Error(enqRes.error.message || 'Unable to load customer enquiries.');
    }

    const rawQuotes = (quoteRes.data || []) as unknown as Array<{
      id: string;
      reference_number: string;
      total_charges_usd_max: number;
      total_charges_aed_max: number;
      pricing_snapshot: {
        route?: { origin_port_name?: string; destination_port_name?: string };
        vehicle?: { category_name?: string; make?: string; model?: string; year?: number };
      } | null;
      created_at: string;
      enquiries: {
        id: string;
        reference_number: string;
        customer_id: string;
      } | null;
    }>;

    const mappedQuotes = rawQuotes.map((q) => {
      const snap = q.pricing_snapshot;
      const originPort = snap?.route?.origin_port_name || 'USA';
      const destPort = snap?.route?.destination_port_name || 'UAE';
      const route = `${originPort} -> ${destPort}`;
      const veh = snap?.vehicle
        ? `${snap.vehicle.year ? snap.vehicle.year + ' ' : ''}${snap.vehicle.make || ''} ${snap.vehicle.model || ''} (${snap.vehicle.category_name || 'Vehicle'})`
        : 'Vehicle';

      return {
        id: q.id,
        referenceNumber: q.reference_number,
        enquiryReference: q.enquiries?.reference_number,
        totalUsd: Number(q.total_charges_usd_max),
        totalAed: Number(q.total_charges_aed_max),
        route,
        vehicle: veh.trim(),
        createdAt: q.created_at,
      };
    });

    const enquiries = (enqRes.data || []).map((e) => ({
      id: e.id,
      referenceNumber: e.reference_number,
      status: e.status,
      source: e.source,
      notes: e.notes || undefined,
      createdAt: e.created_at,
    }));

    const dates = [
      ...enquiries.map((e) => e.createdAt),
      ...mappedQuotes.map((q) => q.createdAt),
      customer.created_at,
    ].sort();

    const firstEnquiryDate = enquiries.length > 0 ? enquiries[enquiries.length - 1].createdAt : customer.created_at;
    const lastActivityDate = dates.length > 0 ? dates[dates.length - 1] : customer.created_at;

    return {
      customer: {
        id: customer.id,
        fullName: customer.full_name,
        phone: customer.phone,
        email: customer.email || undefined,
        country: customer.country || undefined,
        city: customer.city || undefined,
        notes: customer.notes || undefined,
        createdAt: customer.created_at,
      },
      enquiries,
      quotations: mappedQuotes,
      stats: {
        totalEnquiries: enquiries.length,
        totalQuotations: mappedQuotes.length,
        firstEnquiryDate,
        lastActivityDate,
      },
    };
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
        phone: normalizePhone(customer.phone, customer.country || 'ARE'),
        email: customer.email?.trim() || null,
        country: customer.country?.trim() || 'UAE',
        city: customer.city?.trim() || null,
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
        origin_port_id,
        destination_port_id,
        transit_days_min,
        transit_days_max,
        is_active,
        created_at,
        origin_port:ports!shipping_routes_origin_port_id_fkey (
          id,
          name,
          code
        ),
        dest_port:ports!shipping_routes_destination_port_id_fkey (
          id,
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
      origin_port_id: string;
      destination_port_id: string;
      transit_days_min: number;
      transit_days_max: number;
      is_active: boolean;
      created_at: string;
      origin_port: { id: string; name: string; code: string } | null;
      dest_port: { id: string; name: string; code: string } | null;
    }

    const rows = (data || []) as unknown as RawRoute[];
    return rows.map((r) => ({
      id: r.id,
      originPortId: r.origin_port_id,
      originPortName: r.origin_port?.name || 'Origin Port',
      originPortCode: r.origin_port?.code || 'ORIGIN',
      destinationPortId: r.destination_port_id,
      destinationPortName: r.dest_port?.name || 'Destination Port',
      destinationPortCode: r.dest_port?.code || 'DEST',
      transitDaysMin: r.transit_days_min,
      transitDaysMax: r.transit_days_max,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
    }));
  },

  async createRoute(route: {
    originPortId: string;
    destinationPortId: string;
    transitDaysMin: number;
    transitDaysMax: number;
    isActive?: boolean;
  }): Promise<{ success: boolean; id?: string }> {
    if (route.originPortId === route.destinationPortId) {
      throw new Error('Origin port and destination port must be different.');
    }
    if (route.transitDaysMin <= 0) {
      throw new Error('Minimum transit days must be greater than 0.');
    }
    if (route.transitDaysMax < route.transitDaysMin) {
      throw new Error('Maximum transit days must be greater than or equal to minimum transit days.');
    }

    const { data, error } = await supabase
      .from('shipping_routes')
      .insert({
        origin_port_id: route.originPortId,
        destination_port_id: route.destinationPortId,
        transit_days_min: route.transitDaysMin,
        transit_days_max: route.transitDaysMax,
        is_active: route.isActive ?? true,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message || 'Unable to create shipping route.');
    return { success: true, id: data?.id };
  },

  async updateRoute(
    id: string,
    updates: Partial<{
      originPortId: string;
      destinationPortId: string;
      transitDaysMin: number;
      transitDaysMax: number;
      isActive: boolean;
    }>
  ): Promise<boolean> {
    const payload: RouteUpdate = {};
    if (updates.originPortId) payload.origin_port_id = updates.originPortId;
    if (updates.destinationPortId) payload.destination_port_id = updates.destinationPortId;
    if (updates.transitDaysMin !== undefined) payload.transit_days_min = updates.transitDaysMin;
    if (updates.transitDaysMax !== undefined) payload.transit_days_max = updates.transitDaysMax;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    if (payload.origin_port_id && payload.destination_port_id && payload.origin_port_id === payload.destination_port_id) {
      throw new Error('Origin and destination ports cannot be the same.');
    }

    const { error } = await supabase.from('shipping_routes').update(payload).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update route.');
    return true;
  },

  async toggleRouteStatus(routeId: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('shipping_routes')
      .update({ is_active: isActive })
      .eq('id', routeId);
    if (error) throw new Error(error.message || 'Unable to update route status.');
    return true;
  },

  async deleteRoute(routeId: string): Promise<boolean> {
    const { error } = await supabase.from('shipping_routes').delete().eq('id', routeId);
    if (error) throw new Error(error.message || 'Unable to delete route (it may have active freight tariffs assigned).');
    return true;
  },

  async getPorts(): Promise<AdminPort[]> {
    const { data, error } = await supabase
      .from('ports')
      .select('*')
      .order('country_code', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Unable to load ports.');
    }

    return (data || []).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      nameAr: p.name_ar || undefined,
      countryCode: p.country_code,
      stateOrCity: p.state_or_city || undefined,
      isLoadingPort: Boolean(p.is_loading_port),
      isDestinationPort: Boolean(p.is_destination_port),
      isActive: Boolean(p.is_active),
    }));
  },

  async createPort(port: {
    code: string;
    name: string;
    nameAr?: string;
    countryCode: string;
    stateOrCity?: string;
    isLoadingPort: boolean;
    isDestinationPort: boolean;
    isActive?: boolean;
  }): Promise<{ success: boolean; id?: string }> {
    const { data, error } = await supabase
      .from('ports')
      .insert({
        code: port.code.trim().toUpperCase(),
        name: port.name.trim(),
        name_ar: port.nameAr?.trim() || null,
        country_code: port.countryCode.trim().toUpperCase(),
        state_or_city: port.stateOrCity?.trim() || '',
        is_loading_port: port.isLoadingPort,
        is_destination_port: port.isDestinationPort,
        is_active: port.isActive ?? true,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message || 'Unable to create port.');
    return { success: true, id: data?.id };
  },

  async updatePort(
    id: string,
    updates: Partial<{
      code: string;
      name: string;
      nameAr?: string;
      countryCode: string;
      stateOrCity?: string;
      isLoadingPort: boolean;
      isDestinationPort: boolean;
      isActive: boolean;
    }>
  ): Promise<boolean> {
    const payload: PortUpdate = {};
    if (updates.code) payload.code = updates.code.trim().toUpperCase();
    if (updates.name) payload.name = updates.name.trim();
    if (updates.nameAr !== undefined) payload.name_ar = updates.nameAr ? updates.nameAr.trim() : null;
    if (updates.countryCode) payload.country_code = updates.countryCode.trim().toUpperCase();
    if (updates.stateOrCity !== undefined) payload.state_or_city = updates.stateOrCity ? updates.stateOrCity.trim() : '';
    if (updates.isLoadingPort !== undefined) payload.is_loading_port = updates.isLoadingPort;
    if (updates.isDestinationPort !== undefined) payload.is_destination_port = updates.isDestinationPort;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    const { error } = await supabase.from('ports').update(payload).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update port.');
    return true;
  },

  async togglePortStatus(portId: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase.from('ports').update({ is_active: isActive }).eq('id', portId);
    if (error) throw new Error(error.message || 'Unable to update port status.');
    return true;
  },

  async deletePort(portId: string): Promise<boolean> {
    const { error } = await supabase.from('ports').delete().eq('id', portId);
    if (error) throw new Error(error.message || 'Unable to delete port (routes or towing rates reference this port).');
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
      nameAr: c.name_ar || undefined,
      isActive: Boolean(c.is_active),
      createdAt: c.created_at,
    }));
  },

  async createCountry(country: {
    code: string;
    name: string;
    nameAr?: string;
    isActive?: boolean;
  }): Promise<boolean> {
    const { error } = await supabase.from('countries').insert({
      code: country.code.trim().toUpperCase(),
      name: country.name.trim(),
      name_ar: country.nameAr?.trim() || null,
      is_active: country.isActive ?? true,
    });
    if (error) throw new Error(error.message || 'Unable to register country.');
    return true;
  },

  async updateCountry(
    code: string,
    updates: Partial<{ name: string; nameAr?: string; isActive: boolean }>
  ): Promise<boolean> {
    const payload: CountryUpdate = {};
    if (updates.name) payload.name = updates.name.trim();
    if (updates.nameAr !== undefined) payload.name_ar = updates.nameAr ? updates.nameAr.trim() : null;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    const { error } = await supabase.from('countries').update(payload).eq('code', code);
    if (error) throw new Error(error.message || 'Unable to update country.');
    return true;
  },

  async toggleCountryStatus(code: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase.from('countries').update({ is_active: isActive }).eq('code', code);
    if (error) throw new Error(error.message || 'Unable to update country status.');
    return true;
  },

  async deleteCountry(code: string): Promise<boolean> {
    const { error } = await supabase.from('countries').delete().eq('code', code);
    if (error) throw new Error(error.message || 'Unable to delete country (ports or rules reference this country).');
    return true;
  },

  // Tariffs & Freight Rates
  async getFreightRates(): Promise<AdminFreightRate[]> {
    const { data, error } = await supabase
      .from('route_freight_rates')
      .select(
        `
        id,
        route_id,
        vehicle_category_id,
        powertrain_id,
        shipping_method_id,
        base_amount,
        currency,
        effective_from,
        effective_to,
        is_active,
        shipping_routes!route_freight_rates_route_id_fkey (
          id,
          origin_port:ports!shipping_routes_origin_port_id_fkey ( name, code ),
          dest_port:ports!shipping_routes_destination_port_id_fkey ( name, code )
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load freight rates.');
    }

    interface RawFreight {
      id: string;
      route_id: string;
      vehicle_category_id: string;
      powertrain_id: string;
      shipping_method_id: string;
      base_amount: number;
      currency: string;
      effective_from: string;
      effective_to: string | null;
      is_active: boolean;
      shipping_routes: {
        id: string;
        origin_port: { name: string; code: string } | null;
        dest_port: { name: string; code: string } | null;
      } | null;
    }

    const rows = (data || []) as unknown as RawFreight[];
    return rows.map((r) => {
      const originName = r.shipping_routes?.origin_port?.name || 'USA Port';
      const originCode = r.shipping_routes?.origin_port?.code || 'ORIGIN';
      const destName = r.shipping_routes?.dest_port?.name || 'UAE Port';
      const destCode = r.shipping_routes?.dest_port?.code || 'DEST';
      return {
        id: r.id,
        routeId: r.route_id,
        routeDesc: `${originName} (${originCode}) -> ${destName} (${destCode})`,
        originPortName: originName,
        originPortCode: originCode,
        destinationPortName: destName,
        destinationPortCode: destCode,
        vehicleCategoryId: r.vehicle_category_id,
        category: r.vehicle_category_id.toUpperCase(),
        powertrainId: r.powertrain_id,
        powertrain: r.powertrain_id.toUpperCase(),
        shippingMethodId: r.shipping_method_id,
        shippingMethod: r.shipping_method_id.replace(/_/g, ' ').toUpperCase(),
        amountUsd: Number(r.base_amount),
        currency: r.currency || 'USD',
        effectiveFrom: r.effective_from,
        effectiveTo: r.effective_to || undefined,
        isActive: Boolean(r.is_active),
      };
    });
  },

  async createFreightRate(rate: {
    routeId: string;
    vehicleCategoryId: string;
    powertrainId?: string;
    shippingMethodId: string;
    baseAmount: number;
    currency?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    isActive?: boolean;
  }): Promise<{ success: boolean; id?: string }> {
    if (rate.baseAmount <= 0) {
      throw new Error('Freight rate amount must be a positive number.');
    }
    const ptId = rate.powertrainId || 'petrol';

    // Prevent duplicate active rates
    const { data: existing } = await supabase
      .from('route_freight_rates')
      .select('id')
      .eq('route_id', rate.routeId)
      .eq('shipping_method_id', rate.shippingMethodId)
      .eq('vehicle_category_id', rate.vehicleCategoryId)
      .eq('powertrain_id', ptId)
      .eq('is_active', true)
      .is('effective_to', null)
      .maybeSingle();

    if (existing) {
      throw new Error('An active freight rate already exists for this Route, Method, Category, and Powertrain combination.');
    }

    const { data, error } = await supabase
      .from('route_freight_rates')
      .insert({
        route_id: rate.routeId,
        vehicle_category_id: rate.vehicleCategoryId,
        powertrain_id: ptId,
        shipping_method_id: rate.shippingMethodId,
        base_amount: rate.baseAmount,
        currency: rate.currency || 'USD',
        effective_from: rate.effectiveFrom || new Date().toISOString().split('T')[0],
        effective_to: rate.effectiveTo || null,
        is_active: rate.isActive ?? true,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message || 'Unable to create freight rate.');
    return { success: true, id: data?.id };
  },

  async updateFreightRate(
    id: string,
    updates: Partial<{
      baseAmount: number;
      effectiveFrom: string;
      effectiveTo?: string | null;
      isActive: boolean;
      shippingMethodId: string;
      vehicleCategoryId: string;
      powertrainId: string;
    }>
  ): Promise<boolean> {
    const payload: FreightRateUpdate = {};
    if (updates.baseAmount !== undefined) {
      if (updates.baseAmount <= 0) throw new Error('Freight rate amount must be positive.');
      payload.base_amount = updates.baseAmount;
    }
    if (updates.effectiveFrom) payload.effective_from = updates.effectiveFrom;
    if (updates.effectiveTo !== undefined) payload.effective_to = updates.effectiveTo;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.shippingMethodId) payload.shipping_method_id = updates.shippingMethodId;
    if (updates.vehicleCategoryId) payload.vehicle_category_id = updates.vehicleCategoryId;
    if (updates.powertrainId) payload.powertrain_id = updates.powertrainId;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('route_freight_rates').update(payload).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update freight rate.');
    return true;
  },

  async toggleFreightRateStatus(id: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('route_freight_rates')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update freight rate status.');
    return true;
  },

  async deleteFreightRate(id: string): Promise<boolean> {
    const { error } = await supabase.from('route_freight_rates').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Unable to delete freight rate.');
    return true;
  },

  // Inland Towing Rates
  async getTowingRates(): Promise<AdminTowingRate[]> {
    const { data, error } = await supabase
      .from('towing_rates')
      .select(
        `
        id,
        purchase_location_id,
        loading_port_id,
        vehicle_category_id,
        vehicle_condition_id,
        rate_type,
        currency,
        fixed_amount,
        min_amount,
        max_amount,
        effective_from,
        effective_to,
        is_active,
        purchase_locations!towing_rates_purchase_location_id_fkey (
          id,
          name,
          state_code
        ),
        ports!towing_rates_loading_port_id_fkey (
          id,
          name,
          code
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load towing rates.');
    }

    interface RawTowing {
      id: string;
      purchase_location_id: string;
      loading_port_id: string;
      vehicle_category_id: string | null;
      vehicle_condition_id: string | null;
      rate_type: string;
      currency: string;
      fixed_amount: number | null;
      min_amount: number | null;
      max_amount: number | null;
      effective_from: string;
      effective_to: string | null;
      is_active: boolean;
      purchase_locations: { id: string; name: string; state_code: string } | null;
      ports: { id: string; name: string; code: string } | null;
    }

    const rows = (data || []) as unknown as RawTowing[];
    return rows.map((t) => ({
      id: t.id,
      purchaseLocationId: t.purchase_location_id,
      loadingPortId: t.loading_port_id,
      originLocation: t.purchase_locations?.name
        ? `${t.purchase_locations.name}, ${t.purchase_locations.state_code}`
        : 'State/Auction',
      stateCode: t.purchase_locations?.state_code || undefined,
      loadingPort: t.ports?.name || 'Departure Port',
      vehicleCategoryId: t.vehicle_category_id || undefined,
      vehicleCategory: t.vehicle_category_id ? t.vehicle_category_id.toUpperCase() : 'ALL CATEGORIES',
      vehicleConditionId: t.vehicle_condition_id || undefined,
      vehicleCondition: t.vehicle_condition_id ? t.vehicle_condition_id.toUpperCase() : 'ALL CONDITIONS',
      rateType: t.rate_type as 'fixed' | 'range',
      fixedAmount: Number(t.fixed_amount || 0),
      minAmount: Number(t.min_amount || 0),
      maxAmount: Number(t.max_amount || 0),
      currency: t.currency || 'USD',
      isRange: t.rate_type === 'range',
      effectiveFrom: t.effective_from,
      effectiveTo: t.effective_to || undefined,
      isActive: Boolean(t.is_active),
    }));
  },

  async createTowingRate(rate: {
    purchaseLocationId: string;
    loadingPortId: string;
    vehicleCategoryId?: string | null;
    vehicleConditionId?: string | null;
    rateType: 'fixed' | 'range';
    fixedAmount?: number;
    minAmount?: number;
    maxAmount?: number;
    currency?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    isActive?: boolean;
  }): Promise<{ success: boolean; id?: string }> {
    if (rate.rateType === 'fixed') {
      if (!rate.fixedAmount || rate.fixedAmount <= 0) {
        throw new Error('Fixed towing rate must have a positive fixed amount.');
      }
    } else {
      if (!rate.minAmount || rate.minAmount <= 0) {
        throw new Error('Range towing rate must have a positive minimum amount.');
      }
      if (!rate.maxAmount || rate.maxAmount < rate.minAmount) {
        throw new Error('Maximum towing rate must be greater than or equal to minimum amount.');
      }
    }

    const { data, error } = await supabase
      .from('towing_rates')
      .insert({
        purchase_location_id: rate.purchaseLocationId,
        loading_port_id: rate.loadingPortId,
        vehicle_category_id: rate.vehicleCategoryId || null,
        vehicle_condition_id: rate.vehicleConditionId || null,
        rate_type: rate.rateType,
        fixed_amount: rate.rateType === 'fixed' ? rate.fixedAmount : null,
        min_amount: rate.rateType === 'range' ? rate.minAmount : null,
        max_amount: rate.rateType === 'range' ? rate.maxAmount : null,
        currency: rate.currency || 'USD',
        effective_from: rate.effectiveFrom || new Date().toISOString().split('T')[0],
        effective_to: rate.effectiveTo || null,
        is_active: rate.isActive ?? true,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message || 'Unable to create inland towing rate.');
    return { success: true, id: data?.id };
  },

  async updateTowingRate(
    id: string,
    updates: Partial<{
      purchaseLocationId: string;
      loadingPortId: string;
      vehicleCategoryId: string | null;
      vehicleConditionId: string | null;
      rateType: 'fixed' | 'range';
      fixedAmount: number | null;
      minAmount: number | null;
      maxAmount: number | null;
      effectiveFrom: string;
      effectiveTo: string | null;
      isActive: boolean;
    }>
  ): Promise<boolean> {
    const payload: TowingRateUpdate = {};
    if (updates.purchaseLocationId) payload.purchase_location_id = updates.purchaseLocationId;
    if (updates.loadingPortId) payload.loading_port_id = updates.loadingPortId;
    if (updates.vehicleCategoryId !== undefined) payload.vehicle_category_id = updates.vehicleCategoryId;
    if (updates.vehicleConditionId !== undefined) payload.vehicle_condition_id = updates.vehicleConditionId;
    if (updates.rateType) payload.rate_type = updates.rateType;
    if (updates.fixedAmount !== undefined) payload.fixed_amount = updates.fixedAmount;
    if (updates.minAmount !== undefined) payload.min_amount = updates.minAmount;
    if (updates.maxAmount !== undefined) payload.max_amount = updates.maxAmount;
    if (updates.effectiveFrom) payload.effective_from = updates.effectiveFrom;
    if (updates.effectiveTo !== undefined) payload.effective_to = updates.effectiveTo;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('towing_rates').update(payload).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update towing rate.');
    return true;
  },

  async toggleTowingRateStatus(id: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('towing_rates')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update towing rate status.');
    return true;
  },

  async deleteTowingRate(id: string): Promise<boolean> {
    const { error } = await supabase.from('towing_rates').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Unable to delete inland towing rate.');
    return true;
  },

  // Related Pricing Configurations
  async getVehicleCategories(): Promise<AdminVehicleCategory[]> {
    const { data, error } = await supabase
      .from('vehicle_categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw new Error(error.message || 'Unable to load vehicle categories.');
    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      displayOrder: c.display_order,
      isActive: Boolean(c.is_active),
    }));
  },

  async getShippingMethods(): Promise<AdminShippingMethod[]> {
    const { data, error } = await supabase
      .from('shipping_methods')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw new Error(error.message || 'Unable to load shipping methods.');
    return (data || []).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description || undefined,
      isActive: Boolean(m.is_active),
    }));
  },

  async createShippingMethod(method: {
    id: string;
    name: string;
    description?: string;
    isActive?: boolean;
  }): Promise<boolean> {
    const { error } = await supabase.from('shipping_methods').insert({
      id: method.id.trim().toLowerCase().replace(/\s+/g, '_'),
      name: method.name.trim(),
      description: method.description?.trim() || null,
      is_active: method.isActive ?? true,
    });
    if (error) throw new Error(error.message || 'Unable to create shipping method.');
    return true;
  },

  async updateShippingMethod(
    id: string,
    updates: Partial<{ name: string; description?: string; isActive: boolean }>
  ): Promise<boolean> {
    const payload: ShippingMethodUpdate = {};
    if (updates.name) payload.name = updates.name.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    const { error } = await supabase.from('shipping_methods').update(payload).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update shipping method.');
    return true;
  },

  async toggleShippingMethodStatus(id: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase.from('shipping_methods').update({ is_active: isActive }).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update shipping method status.');
    return true;
  },

  async deleteShippingMethod(id: string): Promise<boolean> {
    const { error } = await supabase.from('shipping_methods').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Unable to delete shipping method (tariffs may depend on it).');
    return true;
  },

  async getPowertrains(): Promise<AdminPowertrain[]> {
    const { data, error } = await supabase
      .from('powertrains')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw new Error(error.message || 'Unable to load powertrains.');
    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      displayOrder: p.display_order,
      isActive: Boolean(p.is_active),
    }));
  },

  async getPurchaseLocations(): Promise<AdminPurchaseLocation[]> {
    const { data, error } = await supabase
      .from('purchase_locations')
      .select('*')
      .order('state_code', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw new Error(error.message || 'Unable to load purchase locations.');
    return (data || []).map((l) => ({
      id: l.id,
      name: l.name,
      stateCode: l.state_code,
      postalCode: l.postal_code || undefined,
      purchaseSourceId: l.purchase_source_id,
      defaultLoadingPortId: l.default_loading_port_id || undefined,
      isActive: Boolean(l.is_active),
    }));
  },

  async getAdditionalChargeRules(): Promise<AdminAdditionalChargeRule[]> {
    const { data, error } = await supabase
      .from('additional_charge_rules')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message || 'Unable to load additional charge rules.');
    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      chargeType: c.charge_type,
      amount: Number(c.amount),
      currency: c.currency || 'USD',
      isMandatory: Boolean(c.is_mandatory),
      isIncludedInVatBase: Boolean(c.is_included_in_vat_base),
      countryCode: c.country_code || undefined,
      destinationPortId: c.destination_port_id || undefined,
      isActive: Boolean(c.is_active),
    }));
  },

  async updateAdditionalChargeRule(
    id: string,
    updates: Partial<{ amount: number; isMandatory: boolean; isIncludedInVatBase: boolean; isActive: boolean }>
  ): Promise<boolean> {
    const payload: AdditionalChargeRuleUpdate = {};
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.isMandatory !== undefined) payload.is_mandatory = updates.isMandatory;
    if (updates.isIncludedInVatBase !== undefined) payload.is_included_in_vat_base = updates.isIncludedInVatBase;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    const { error } = await supabase.from('additional_charge_rules').update(payload).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update charge rule.');
    return true;
  },

  // Exchange Rates
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

  // CMS Notices
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

  // Settings & Branding
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

  async getBrandingSettings(): Promise<BrandingSettings> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['company_profile', 'branding_settings']);

    if (error) {
      console.warn('Failed to fetch branding settings, returning default baseline', error);
      return DEFAULT_BRANDING;
    }

    const settingsMap: Record<string, Record<string, unknown>> = {};
    for (const item of data || []) {
      if (item.value && typeof item.value === 'object') {
        settingsMap[item.key] = item.value as Record<string, unknown>;
      }
    }

    const cp = settingsMap['company_profile'] || {};
    const bs = settingsMap['branding_settings'] || {};

    return {
      companyName: String(bs.company_name || cp.company_name || DEFAULT_BRANDING.companyName),
      companyNameAr: String(bs.company_name_ar || cp.company_name_ar || DEFAULT_BRANDING.companyNameAr),
      shortName: String(bs.short_name || DEFAULT_BRANDING.shortName),
      shortNameAr: String(bs.short_name_ar || DEFAULT_BRANDING.shortNameAr),
      tagline: String(bs.tagline || DEFAULT_BRANDING.tagline),
      taglineAr: String(bs.tagline_ar || DEFAULT_BRANDING.taglineAr),
      logoUrl: String(bs.logo_url || ''),
      darkLogoUrl: String(bs.dark_logo_url || ''),
      faviconUrl: String(bs.favicon_url || ''),
      browserTitle: String(bs.browser_title || DEFAULT_BRANDING.browserTitle),
      browserTitleAr: String(bs.browser_title_ar || DEFAULT_BRANDING.browserTitleAr),
      metaDescription: String(bs.meta_description || DEFAULT_BRANDING.metaDescription),
      metaDescriptionAr: String(bs.meta_description_ar || DEFAULT_BRANDING.metaDescriptionAr),
      supportPhone: String(cp.support_phone || bs.support_phone || DEFAULT_BRANDING.supportPhone),
      supportEmail: String(cp.support_email || bs.support_email || DEFAULT_BRANDING.supportEmail),
      whatsappNumber: String(cp.whatsapp_number || bs.whatsapp_number || DEFAULT_BRANDING.whatsappNumber),
      headquartersAddress: String(cp.headquarters_address || bs.headquarters_address || DEFAULT_BRANDING.headquartersAddress),
      headquartersAddressAr: String(cp.headquarters_address_ar || bs.headquarters_address_ar || DEFAULT_BRANDING.headquartersAddressAr),
      businessHours: String(bs.business_hours || DEFAULT_BRANDING.businessHours),
      businessHoursAr: String(bs.business_hours_ar || DEFAULT_BRANDING.businessHoursAr),
      copyrightText: String(bs.copyright_text || DEFAULT_BRANDING.copyrightText),
      copyrightTextAr: String(bs.copyright_text_ar || DEFAULT_BRANDING.copyrightTextAr),
      socialLinks: (bs.social_links as BrandingSettings['socialLinks']) || DEFAULT_BRANDING.socialLinks,

      // Hero Settings
      heroEyebrowEn: String(bs.hero_eyebrow_en || DEFAULT_BRANDING.heroEyebrowEn),
      heroEyebrowAr: String(bs.hero_eyebrow_ar || DEFAULT_BRANDING.heroEyebrowAr),
      heroHeadlineEn: String(bs.hero_headline_en || DEFAULT_BRANDING.heroHeadlineEn),
      heroHeadlineAr: String(bs.hero_headline_ar || DEFAULT_BRANDING.heroHeadlineAr),
      heroDescriptionEn: String(bs.hero_description_en || DEFAULT_BRANDING.heroDescriptionEn),
      heroDescriptionAr: String(bs.hero_description_ar || DEFAULT_BRANDING.heroDescriptionAr),
      heroImageUrl: String(bs.hero_image_url || DEFAULT_BRANDING.heroImageUrl),
      heroVideoUrl: String(bs.hero_video_url || DEFAULT_BRANDING.heroVideoUrl),
      heroVideoPosterUrl: String(bs.hero_video_poster_url || DEFAULT_BRANDING.heroVideoPosterUrl),
      heroMediaType: (bs.hero_media_type as 'image' | 'video') || DEFAULT_BRANDING.heroMediaType,
      heroMotionEnabled: bs.hero_motion_enabled !== undefined ? Boolean(bs.hero_motion_enabled) : DEFAULT_BRANDING.heroMotionEnabled,
      heroPrimaryCtaLabel: String(bs.hero_primary_cta_label || DEFAULT_BRANDING.heroPrimaryCtaLabel),
      heroPrimaryCtaLabelAr: String(bs.hero_primary_cta_label_ar || DEFAULT_BRANDING.heroPrimaryCtaLabelAr),
      heroPrimaryCtaDestination: String(bs.hero_primary_cta_destination || DEFAULT_BRANDING.heroPrimaryCtaDestination),
      heroSecondaryCtaLabel: String(bs.hero_secondary_cta_label || DEFAULT_BRANDING.heroSecondaryCtaLabel),
      heroSecondaryCtaLabelAr: String(bs.hero_secondary_cta_label_ar || DEFAULT_BRANDING.heroSecondaryCtaLabelAr),
      heroSecondaryCtaDestination: String(bs.hero_secondary_cta_destination || DEFAULT_BRANDING.heroSecondaryCtaDestination),

      // Location / Google Maps Settings
      locationSectionEnabled: bs.location_section_enabled !== undefined ? Boolean(bs.location_section_enabled) : DEFAULT_BRANDING.locationSectionEnabled,
      locationHeadingEn: String(bs.location_heading_en || DEFAULT_BRANDING.locationHeadingEn),
      locationHeadingAr: String(bs.location_heading_ar || DEFAULT_BRANDING.locationHeadingAr),
      googleMapsLocationUrl: String(bs.google_maps_location_url || DEFAULT_BRANDING.googleMapsLocationUrl),
      googleMapsEmbedUrl: String(bs.google_maps_embed_url || DEFAULT_BRANDING.googleMapsEmbedUrl),
    };
  },

  async updateBrandingSettings(settings: Partial<BrandingSettings>): Promise<boolean> {
    const current = await this.getBrandingSettings();
    const updated = { ...current, ...settings };

    // Update company_profile in system_settings
    const companyProfileUpdate = {
      company_name: updated.companyName,
      company_name_ar: updated.companyNameAr,
      support_phone: updated.supportPhone,
      support_email: updated.supportEmail,
      whatsapp_number: updated.whatsappNumber,
      headquarters_address: updated.headquartersAddress,
      headquarters_address_ar: updated.headquartersAddressAr,
    };

    // Update branding_settings in system_settings
    const brandingSettingsUpdate = {
      company_name: updated.companyName,
      company_name_ar: updated.companyNameAr,
      short_name: updated.shortName,
      short_name_ar: updated.shortNameAr,
      tagline: updated.tagline,
      taglineAr: updated.taglineAr,
      logo_url: updated.logoUrl,
      dark_logo_url: updated.darkLogoUrl,
      favicon_url: updated.faviconUrl,
      browser_title: updated.browserTitle,
      browser_title_ar: updated.browserTitleAr,
      meta_description: updated.metaDescription,
      meta_description_ar: updated.metaDescriptionAr,
      business_hours: updated.businessHours,
      business_hours_ar: updated.businessHoursAr,
      copyright_text: updated.copyrightText,
      copyright_text_ar: updated.copyrightTextAr,
      social_links: updated.socialLinks,
      support_phone: updated.supportPhone,
      support_email: updated.supportEmail,
      whatsapp_number: updated.whatsappNumber,
      headquarters_address: updated.headquartersAddress,
      headquarters_address_ar: updated.headquartersAddressAr,

      // Hero settings
      hero_eyebrow_en: updated.heroEyebrowEn,
      hero_eyebrow_ar: updated.heroEyebrowAr,
      hero_headline_en: updated.heroHeadlineEn,
      hero_headline_ar: updated.heroHeadlineAr,
      hero_description_en: updated.heroDescriptionEn,
      hero_description_ar: updated.heroDescriptionAr,
      hero_image_url: updated.heroImageUrl,
      hero_video_url: updated.heroVideoUrl,
      hero_video_poster_url: updated.heroVideoPosterUrl,
      hero_media_type: updated.heroMediaType,
      hero_motion_enabled: updated.heroMotionEnabled,
      hero_primary_cta_label: updated.heroPrimaryCtaLabel,
      hero_primary_cta_label_ar: updated.heroPrimaryCtaLabelAr,
      hero_primary_cta_destination: updated.heroPrimaryCtaDestination,
      hero_secondary_cta_label: updated.heroSecondaryCtaLabel,
      hero_secondary_cta_label_ar: updated.heroSecondaryCtaLabelAr,
      hero_secondary_cta_destination: updated.heroSecondaryCtaDestination,

      // Location settings
      location_section_enabled: updated.locationSectionEnabled,
      location_heading_en: updated.locationHeadingEn,
      location_heading_ar: updated.locationHeadingAr,
      google_maps_location_url: updated.googleMapsLocationUrl,
      google_maps_embed_url: updated.googleMapsEmbedUrl,
    };

    await Promise.all([
      this.updateSystemSetting('company_profile', companyProfileUpdate),
      this.updateSystemSetting('branding_settings', brandingSettingsUpdate),
    ]);

    return true;
  },

  async uploadBrandingAsset(file: File, prefix: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${prefix}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
    return data.publicUrl;
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

  async getQuotationRules(): Promise<AdminQuotationRule[]> {
    const { data, error } = await supabase
      .from('quotation_rules')
      .select('*')
      .eq('is_archived', false)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((r) => ({
      id: r.id,
      titleEn: r.title_en,
      titleAr: r.title_ar,
      contentEn: r.content_en,
      contentAr: r.content_ar,
      displayOrder: r.display_order,
      isActive: r.is_active,
      isArchived: r.is_archived,
      effectiveFrom: r.effective_from,
      effectiveUntil: r.effective_until || r.effective_to,
      version: r.version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      updatedBy: r.updated_by,
    }));
  },

  async createQuotationRule(
    rule: {
      titleEn: string;
      titleAr?: string | null;
      contentEn: string;
      contentAr?: string | null;
      displayOrder: number;
      isActive?: boolean;
      effectiveFrom?: string;
      effectiveUntil?: string | null;
    }
  ): Promise<AdminQuotationRule> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const effFrom = rule.effectiveFrom || new Date().toISOString().split('T')[0];
    const effUntil = rule.effectiveUntil || null;

    const { data, error } = await supabase
      .from('quotation_rules')
      .insert({
        title_en: rule.titleEn,
        title_ar: rule.titleAr || null,
        content_en: rule.contentEn,
        content_ar: rule.contentAr || null,
        display_order: rule.displayOrder,
        is_active: rule.isActive ?? true,
        is_archived: false,
        effective_from: effFrom,
        effective_to: effUntil,
        effective_until: effUntil,
        version: 1,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      titleEn: data.title_en,
      titleAr: data.title_ar,
      contentEn: data.content_en,
      contentAr: data.content_ar,
      displayOrder: data.display_order,
      isActive: data.is_active,
      isArchived: data.is_archived,
      effectiveFrom: data.effective_from,
      effectiveUntil: data.effective_until || data.effective_to,
      version: data.version,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    };
  },

  async updateQuotationRule(
    id: string,
    updates: {
      titleEn?: string;
      titleAr?: string | null;
      contentEn?: string;
      contentAr?: string | null;
      displayOrder?: number;
      isActive?: boolean;
      effectiveFrom?: string;
      effectiveUntil?: string | null;
      currentVersion?: number;
    }
  ): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    // Fetch existing rule to preserve unchanged fields and version
    const { data: existingRule, error: fetchError } = await supabase
      .from('quotation_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingRule) {
      throw new Error(fetchError?.message || 'Quotation rule not found');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newVersion = (existingRule.version || updates.currentVersion || 1) + 1;

    // 1. Archive the existing rule row
    const { error: archiveError } = await supabase
      .from('quotation_rules')
      .update({
        is_active: false,
        is_archived: true,
        effective_to: todayStr,
        effective_until: todayStr,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', id);

    if (archiveError) throw archiveError;

    // 2. Insert new incremented version row
    const newTitleEn = updates.titleEn !== undefined ? updates.titleEn : existingRule.title_en;
    const newTitleAr = updates.titleAr !== undefined ? updates.titleAr : existingRule.title_ar;
    const newContentEn = updates.contentEn !== undefined ? updates.contentEn : existingRule.content_en;
    const newContentAr = updates.contentAr !== undefined ? updates.contentAr : existingRule.content_ar;
    const newDisplayOrder = updates.displayOrder !== undefined ? updates.displayOrder : existingRule.display_order;
    const newIsActive = updates.isActive !== undefined ? updates.isActive : existingRule.is_active;
    const newEffectiveFrom = updates.effectiveFrom !== undefined ? updates.effectiveFrom : todayStr;
    const newEffectiveUntil = updates.effectiveUntil !== undefined ? updates.effectiveUntil : existingRule.effective_until;

    const { error: insertError } = await supabase
      .from('quotation_rules')
      .insert({
        title_en: newTitleEn,
        title_ar: newTitleAr,
        content_en: newContentEn,
        content_ar: newContentAr,
        display_order: newDisplayOrder,
        is_active: newIsActive,
        is_archived: false,
        effective_from: newEffectiveFrom,
        effective_to: newEffectiveUntil,
        effective_until: newEffectiveUntil,
        version: newVersion,
        updated_by: userId,
      });

    if (insertError) throw insertError;
  },

  async toggleQuotationRuleStatus(id: string, isActive: boolean): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const { error } = await supabase
      .from('quotation_rules')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteQuotationRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('quotation_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async reorderQuotationRules(
    ruleOrders: Array<{ id: string; displayOrder: number }>
  ): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    for (const item of ruleOrders) {
      const { error } = await supabase
        .from('quotation_rules')
        .update({
          display_order: item.displayOrder,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', item.id);
      if (error) throw error;
    }
  },
};

export interface AdminQuotationRule {
  id: string;
  titleEn: string;
  titleAr: string | null;
  contentEn: string;
  contentAr: string | null;
  displayOrder: number;
  isActive: boolean;
  isArchived: boolean;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
}
