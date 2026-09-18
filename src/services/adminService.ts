import { supabase } from '../lib/supabase';
import { normalizePhone } from '../lib/utils';
import { sanitizeRuleContent } from '../utils/sanitizeHtml';
import type { Database, Json } from '../types/database';

type RouteUpdate = Database['public']['Tables']['shipping_routes']['Update'];
type PortUpdate = Database['public']['Tables']['ports']['Update'];
type CountryUpdate = Database['public']['Tables']['countries']['Update'];
type FreightRateUpdate = Database['public']['Tables']['route_freight_rates']['Update'];
type TowingRateUpdate = Database['public']['Tables']['towing_rates']['Update'];
type ShippingMethodUpdate = Database['public']['Tables']['shipping_methods']['Update'];
type AdditionalChargeRuleUpdate = Database['public']['Tables']['additional_charge_rules']['Update'];
type AttributeAdjustmentRow = Database['public']['Tables']['attribute_price_adjustments']['Row'];
type AttributeAdjustmentUpdate = Database['public']['Tables']['attribute_price_adjustments']['Update'];
type VehicleCategoryUpdate = Database['public']['Tables']['vehicle_categories']['Update'];
type PowertrainUpdate = Database['public']['Tables']['powertrains']['Update'];
type VehicleConditionUpdate = Database['public']['Tables']['vehicle_conditions']['Update'];

interface GenericAttributeRow {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  icon: string | null;
  display_order: number | null;
  is_active: boolean | null;
  is_archived: boolean | null;
  created_at: string;
  updated_at: string;
}

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
  vehicleCategoryId?: string | null;
  category?: string;
  powertrainId?: string | null;
  powertrain?: string;
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
  locationName?: string;
  locationCode?: string;
  stateCode?: string;
  city?: string;
  auctionCompany?: string;
  loadingPort: string;
  loadingPortCode?: string;
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

export interface AdminState {
  code: string;
  name: string;
  countryCode: string;
  displayOrder: number;
  isActive: boolean;
  isArchived: boolean;
  locationsCount?: number;
}

export interface AdminPurchaseLocation {
  id: string;
  name: string;
  locationCode?: string;
  stateCode: string;
  stateName?: string;
  city?: string;
  zipCode?: string;
  postalCode?: string;
  auctionCompany?: string;
  address?: string;
  internalNotes?: string;
  displayOrder: number;
  purchaseSourceId?: string | null;
  defaultLoadingPortId?: string;
  connectedPortsCount?: number;
  isActive: boolean;
  isArchived: boolean;
}

export interface BulkRateAdjustmentFilters {
  state_code?: string | null;
  purchase_location_id?: string | null;
  loading_port_id?: string | null;
  vehicle_category_id?: string | null;
  rate_type?: string | null;
  is_active?: boolean | null;
}

export interface BulkRateAdjustmentPayload {
  adjustment_type: 'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease';
  value: number;
  effective_from?: string;
  effective_to?: string | null;
}

export interface BulkRateAdjustmentPreviewItem {
  id: string;
  location_name: string;
  location_code: string | null;
  state_code: string;
  port_name: string;
  port_code: string;
  vehicle_category_id?: string | null;
  rate_type: 'fixed' | 'range';
  old_fixed: number | null;
  new_fixed: number | null;
  old_min: number | null;
  new_min: number | null;
  old_max: number | null;
  new_max: number | null;
}

export interface AdminAdditionalChargeRule {
  id: string;
  code?: string | null;
  name: string;
  nameAr?: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  category: string;
  chargeType: string;
  amount: number;
  currency: string;
  isMandatory: boolean;
  isIncludedInCif?: boolean;
  isIncludedInVatBase: boolean;
  countryCode?: string | null;
  destinationPortId?: string | null;
  shippingMethodId?: string | null;
  vehicleCategoryId?: string | null;
  powertrainId?: string | null;
  conditionId?: string | null;
  displayOrder?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive: boolean;
  isArchived?: boolean;
}

export interface AdminVehicleAttribute {
  id: string;
  type: 'category' | 'powertrain' | 'condition';
  name: string;
  nameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  icon?: string | null;
  displayOrder: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleCategoryCompatibility {
  id: string;
  vehicle_category_id: string;
  target_type: 'powertrain' | 'condition';
  target_id: string;
  is_active: boolean;
  created_at?: string;
  created_by?: string | null;
}

export interface AttributePriceAdjustment {
  id: string;
  attribute_type: 'vehicle_category' | 'powertrain' | 'vehicle_condition';
  attribute_id: string;
  context: 'towing' | 'shipping';
  amount_usd: number;
  reason_en: string;
  reason_ar?: string | null;
  display_order: number;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string;
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
        ),
        shipping_methods!route_freight_rates_shipping_method_id_fkey (
          id,
          name
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
      vehicle_category_id: string | null;
      powertrain_id: string | null;
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
      shipping_methods: {
        id: string;
        name: string;
      } | null;
    }

    const rows = (data || []) as unknown as RawFreight[];
    return rows.map((r) => {
      const originName = r.shipping_routes?.origin_port?.name || 'USA Port';
      const originCode = r.shipping_routes?.origin_port?.code || 'ORIGIN';
      const destName = r.shipping_routes?.dest_port?.name || 'UAE Port';
      const destCode = r.shipping_routes?.dest_port?.code || 'DEST';
      const methodName = r.shipping_methods?.name || r.shipping_method_id.replace(/_/g, ' ').toUpperCase();
      return {
        id: r.id,
        routeId: r.route_id,
        routeDesc: `${originName} (${originCode}) -> ${destName} (${destCode})`,
        originPortName: originName,
        originPortCode: originCode,
        destinationPortName: destName,
        destinationPortCode: destCode,
        vehicleCategoryId: r.vehicle_category_id || undefined,
        category: r.vehicle_category_id ? r.vehicle_category_id.toUpperCase() : undefined,
        powertrainId: r.powertrain_id || undefined,
        powertrain: r.powertrain_id ? r.powertrain_id.toUpperCase() : undefined,
        shippingMethodId: r.shipping_method_id,
        shippingMethod: methodName,
        amountUsd: Number(r.base_amount),
        currency: r.currency || 'USD',
        effectiveFrom: r.effective_from,
        effectiveTo: r.effective_to || undefined,
        isActive: Boolean(r.is_active),
      };
    });
  },

  async saveRouteFreightRates(
    routeId: string,
    configs: Array<{ shippingMethodId: string; isEnabled: boolean; baseAmount: number }>
  ): Promise<boolean> {
    if (!routeId) {
      throw new Error('Route ID is required.');
    }

    for (const item of configs) {
      const { data: existingRates, error: fetchErr } = await supabase
        .from('route_freight_rates')
        .select('id, is_active')
        .eq('route_id', routeId)
        .eq('shipping_method_id', item.shippingMethodId)
        .order('created_at', { ascending: false });

      if (fetchErr) throw new Error(fetchErr.message);

      const activeRecord = existingRates?.find((r) => r.is_active);
      const anyRecord = existingRates?.[0];

      if (item.isEnabled) {
        if (item.baseAmount <= 0) {
          throw new Error('Base rate amount must be greater than zero for enabled methods.');
        }

        if (activeRecord) {
          const { error: updErr } = await supabase
            .from('route_freight_rates')
            .update({
              base_amount: item.baseAmount,
              currency: 'USD',
              vehicle_category_id: null,
              powertrain_id: null,
              effective_to: null,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeRecord.id);

          if (updErr) throw new Error(updErr.message);
        } else if (anyRecord) {
          const { error: updErr } = await supabase
            .from('route_freight_rates')
            .update({
              base_amount: item.baseAmount,
              currency: 'USD',
              vehicle_category_id: null,
              powertrain_id: null,
              effective_to: null,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', anyRecord.id);

          if (updErr) throw new Error(updErr.message);
        } else {
          const { error: insErr } = await supabase
            .from('route_freight_rates')
            .insert({
              route_id: routeId,
              shipping_method_id: item.shippingMethodId,
              base_amount: item.baseAmount,
              currency: 'USD',
              vehicle_category_id: null,
              powertrain_id: null,
              effective_from: new Date().toISOString().split('T')[0],
              effective_to: null,
              is_active: true,
            });

          if (insErr) throw new Error(insErr.message);
        }
      } else {
        if (activeRecord) {
          const { error: deactErr } = await supabase
            .from('route_freight_rates')
            .update({
              is_active: false,
              effective_to: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeRecord.id);

          if (deactErr) throw new Error(deactErr.message);
        }
      }
    }

    return true;
  },

  async createFreightRate(rate: {
    routeId: string;
    vehicleCategoryId?: string | null;
    powertrainId?: string | null;
    shippingMethodId: string;
    baseAmount: number;
    currency?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
    isActive?: boolean;
  }): Promise<{ success: boolean; id?: string }> {
    if (rate.baseAmount <= 0) {
      throw new Error('Freight rate amount must be a positive number.');
    }

    // Prevent duplicate active rates
    const { data: existing } = await supabase
      .from('route_freight_rates')
      .select('id')
      .eq('route_id', rate.routeId)
      .eq('shipping_method_id', rate.shippingMethodId)
      .eq('is_active', true)
      .is('effective_to', null)
      .maybeSingle();

    if (existing) {
      throw new Error('An active freight rate already exists for this Route and Shipping Method.');
    }

    const { data, error } = await supabase
      .from('route_freight_rates')
      .insert({
        route_id: rate.routeId,
        vehicle_category_id: rate.vehicleCategoryId || null,
        powertrain_id: rate.powertrainId || null,
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
          location_code,
          city,
          auction_company,
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
      purchase_locations: {
        id: string;
        name: string;
        location_code: string | null;
        city: string | null;
        auction_company: string | null;
        state_code: string;
      } | null;
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
      locationName: t.purchase_locations?.name,
      locationCode: t.purchase_locations?.location_code || undefined,
      city: t.purchase_locations?.city || undefined,
      auctionCompany: t.purchase_locations?.auction_company || undefined,
      stateCode: t.purchase_locations?.state_code || undefined,
      loadingPort: t.ports?.name || 'Departure Port',
      loadingPortCode: t.ports?.code || undefined,
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

  async getStates(): Promise<AdminState[]> {
    const { data: states, error } = await supabase
      .from('states')
      .select('*')
      .eq('is_archived', false)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw new Error(error.message || 'Unable to load states.');

    // Count non-archived locations per state
    const { data: locs } = await supabase
      .from('purchase_locations')
      .select('state_code')
      .eq('is_archived', false);

    const locCountMap = new Map<string, number>();
    (locs || []).forEach((l) => {
      locCountMap.set(l.state_code, (locCountMap.get(l.state_code) || 0) + 1);
    });

    return (states || []).map((s) => ({
      code: s.code,
      name: s.name,
      countryCode: s.country_code,
      displayOrder: s.display_order,
      isActive: Boolean(s.is_active),
      isArchived: Boolean(s.is_archived),
      locationsCount: locCountMap.get(s.code) || 0,
    }));
  },

  async createState(state: {
    code: string;
    name: string;
    countryCode?: string;
    displayOrder?: number;
    isActive?: boolean;
  }): Promise<{ success: boolean; code: string }> {
    const code = state.code.trim().toUpperCase();
    if (!code || code.length > 5) {
      throw new Error('State code is required (up to 5 characters).');
    }
    if (!state.name.trim()) {
      throw new Error('State name is required.');
    }

    const { error } = await supabase.from('states').insert({
      code,
      name: state.name.trim(),
      country_code: state.countryCode || 'USA',
      display_order: state.displayOrder ?? 0,
      is_active: state.isActive ?? true,
      is_archived: false,
    });

    if (error) throw new Error(error.message || 'Unable to create state.');
    return { success: true, code };
  },

  async updateState(
    code: string,
    updates: Partial<{
      name: string;
      countryCode: string;
      displayOrder: number;
      isActive: boolean;
    }>
  ): Promise<boolean> {
    const payload: Database['public']['Tables']['states']['Update'] = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.countryCode !== undefined) payload.country_code = updates.countryCode;
    if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('states').update(payload).eq('code', code.toUpperCase());
    if (error) throw new Error(error.message || 'Unable to update state.');
    return true;
  },

  async deleteState(code: string, action: 'archive' | 'delete'): Promise<boolean> {
    const { error } = await supabase.rpc('delete_state', {
      p_code: code.toUpperCase(),
      p_action: action,
    });
    if (error) throw new Error(error.message || `Unable to ${action} state.`);
    return true;
  },

  async getPurchaseLocations(): Promise<AdminPurchaseLocation[]> {
    const { data: locations, error } = await supabase
      .from('purchase_locations')
      .select(`
        id,
        name,
        location_code,
        state_code,
        city,
        zip_code,
        postal_code,
        auction_company,
        address,
        internal_notes,
        display_order,
        purchase_source_id,
        default_loading_port_id,
        is_active,
        is_archived,
        states!fk_purchase_locations_state (
          name
        )
      `)
      .eq('is_archived', false)
      .order('state_code', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw new Error(error.message || 'Unable to load purchase locations.');

    // Count connected ports from active towing rates
    const { data: rates } = await supabase
      .from('towing_rates')
      .select('purchase_location_id, loading_port_id')
      .eq('is_active', true);

    const portCountMap = new Map<string, Set<string>>();
    (rates || []).forEach((r) => {
      if (!portCountMap.has(r.purchase_location_id)) {
        portCountMap.set(r.purchase_location_id, new Set());
      }
      portCountMap.get(r.purchase_location_id)!.add(r.loading_port_id);
    });

    return (locations || []).map((l) => {
      const stateObj = l.states as { name?: string } | null;
      return {
        id: l.id,
        name: l.name,
        locationCode: l.location_code || undefined,
        stateCode: l.state_code,
        stateName: stateObj?.name || l.state_code,
        city: l.city || undefined,
        zipCode: l.zip_code || l.postal_code || undefined,
        postalCode: l.postal_code || undefined,
        auctionCompany: l.auction_company || undefined,
        address: l.address || undefined,
        internalNotes: l.internal_notes || undefined,
        displayOrder: l.display_order ?? 0,
        purchaseSourceId: l.purchase_source_id,
        defaultLoadingPortId: l.default_loading_port_id || undefined,
        connectedPortsCount: portCountMap.get(l.id)?.size ?? 0,
        isActive: Boolean(l.is_active),
        isArchived: Boolean(l.is_archived),
      };
    });
  },

  async createPurchaseLocation(loc: {
    name: string;
    locationCode?: string;
    stateCode: string;
    city?: string;
    zipCode?: string;
    auctionCompany?: string;
    address?: string;
    internalNotes?: string;
    displayOrder?: number;
    purchaseSourceId?: string | null;
    defaultLoadingPortId?: string | null;
    isActive?: boolean;
  }): Promise<{ success: boolean; id?: string }> {
    if (!loc.name.trim()) throw new Error('Location name is required.');
    if (!loc.stateCode.trim()) throw new Error('State is required.');

    const locationCode =
      loc.locationCode?.trim().toUpperCase() ||
      `${loc.stateCode.trim().toUpperCase()}-${loc.name.trim().substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

    const { data, error } = await supabase
      .from('purchase_locations')
      .insert({
        name: loc.name.trim(),
        location_code: locationCode,
        state_code: loc.stateCode.trim().toUpperCase(),
        city: loc.city?.trim() || null,
        zip_code: loc.zipCode?.trim() || null,
        postal_code: loc.zipCode?.trim() || null,
        auction_company: loc.auctionCompany?.trim() || null,
        address: loc.address?.trim() || null,
        internal_notes: loc.internalNotes?.trim() || null,
        display_order: loc.displayOrder ?? 0,
        purchase_source_id: loc.purchaseSourceId || null,
        default_loading_port_id: loc.defaultLoadingPortId || null,
        is_active: loc.isActive ?? true,
        is_archived: false,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message || 'Unable to create purchase location.');
    return { success: true, id: data?.id };
  },

  async updatePurchaseLocation(
    id: string,
    updates: Partial<{
      name: string;
      locationCode: string;
      stateCode: string;
      city: string | null;
      zipCode: string | null;
      auctionCompany: string | null;
      address: string | null;
      internalNotes: string | null;
      displayOrder: number;
      purchaseSourceId: string | null;
      defaultLoadingPortId: string | null;
      isActive: boolean;
    }>
  ): Promise<boolean> {
    const payload: Database['public']['Tables']['purchase_locations']['Update'] = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.locationCode !== undefined) payload.location_code = updates.locationCode.trim().toUpperCase();
    if (updates.stateCode !== undefined) payload.state_code = updates.stateCode.trim().toUpperCase();
    if (updates.city !== undefined) payload.city = updates.city?.trim() || null;
    if (updates.zipCode !== undefined) {
      payload.zip_code = updates.zipCode?.trim() || null;
      payload.postal_code = updates.zipCode?.trim() || null;
    }
    if (updates.auctionCompany !== undefined) payload.auction_company = updates.auctionCompany?.trim() || null;
    if (updates.address !== undefined) payload.address = updates.address?.trim() || null;
    if (updates.internalNotes !== undefined) payload.internal_notes = updates.internalNotes?.trim() || null;
    if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;
    if (updates.purchaseSourceId !== undefined) payload.purchase_source_id = updates.purchaseSourceId;
    if (updates.defaultLoadingPortId !== undefined) payload.default_loading_port_id = updates.defaultLoadingPortId;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('purchase_locations').update(payload).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update purchase location.');
    return true;
  },

  async deletePurchaseLocation(id: string, action: 'archive' | 'delete'): Promise<boolean> {
    const { error } = await supabase.rpc('delete_purchase_location', {
      p_location_id: id,
      p_action: action,
    });
    if (error) throw new Error(error.message || `Unable to ${action} purchase location.`);
    return true;
  },

  async previewBulkRateAdjustment(
    filters: BulkRateAdjustmentFilters,
    adjustment: BulkRateAdjustmentPayload
  ): Promise<BulkRateAdjustmentPreviewItem[]> {
    const { data, error } = await supabase.rpc('preview_bulk_towing_adjustment', {
      p_filters: filters as unknown as Json,
      p_adjustment: adjustment as unknown as Json,
    });
    if (error) throw new Error(error.message || 'Unable to preview bulk rate adjustment.');
    return (data || []) as unknown as BulkRateAdjustmentPreviewItem[];
  },

  async applyBulkRateAdjustment(
    filters: BulkRateAdjustmentFilters,
    adjustment: BulkRateAdjustmentPayload
  ): Promise<{ success: boolean; updatedCount: number; message: string }> {
    const { data, error } = await supabase.rpc('apply_bulk_towing_adjustment', {
      p_filters: filters as unknown as Json,
      p_adjustment: adjustment as unknown as Json,
    });
    if (error) throw new Error(error.message || 'Unable to apply bulk rate adjustment.');
    const result = data as { success: boolean; updated_count: number; message: string };
    return {
      success: result.success,
      updatedCount: result.updated_count,
      message: result.message,
    };
  },

  async getAdditionalChargeRules(): Promise<AdminAdditionalChargeRule[]> {
    const { data, error } = await supabase
      .from('additional_charge_rules')
      .select('*')
      .eq('is_archived', false)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message || 'Unable to load additional charge rules.');
    return (data || []).map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      nameAr: c.name_ar,
      descriptionEn: c.description_en,
      descriptionAr: c.description_ar,
      category: c.category,
      chargeType: c.charge_type,
      amount: Number(c.amount),
      currency: c.currency || 'USD',
      isMandatory: Boolean(c.is_mandatory),
      isIncludedInCif: Boolean(c.is_included_in_cif),
      isIncludedInVatBase: Boolean(c.is_included_in_vat_base),
      countryCode: c.country_code || undefined,
      destinationPortId: c.destination_port_id || undefined,
      shippingMethodId: c.shipping_method_id || undefined,
      vehicleCategoryId: c.vehicle_category_id || undefined,
      powertrainId: c.powertrain_id || undefined,
      conditionId: c.condition_id || undefined,
      displayOrder: c.display_order,
      effectiveFrom: c.effective_from,
      effectiveTo: c.effective_to,
      isActive: Boolean(c.is_active),
      isArchived: Boolean(c.is_archived),
    }));
  },

  async createAdditionalChargeRule(
    rule: Omit<AdminAdditionalChargeRule, 'id'>
  ): Promise<AdminAdditionalChargeRule> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const payload = {
      name: rule.name.trim(),
      name_ar: rule.nameAr?.trim() || null,
      code: rule.code?.trim().toUpperCase() || null,
      description_en: rule.descriptionEn?.trim() || null,
      description_ar: rule.descriptionAr?.trim() || null,
      category: rule.category,
      charge_type: rule.chargeType || 'fixed',
      amount: rule.amount,
      currency: rule.currency || 'USD',
      is_mandatory: Boolean(rule.isMandatory),
      is_included_in_cif: Boolean(rule.isIncludedInCif),
      is_included_in_vat_base: Boolean(rule.isIncludedInVatBase),
      country_code: rule.countryCode || null,
      destination_port_id: rule.destinationPortId || null,
      shipping_method_id: rule.shippingMethodId || null,
      vehicle_category_id: rule.vehicleCategoryId || null,
      powertrain_id: rule.powertrainId || null,
      condition_id: rule.conditionId || null,
      display_order: rule.displayOrder || 0,
      effective_from: rule.effectiveFrom || new Date().toISOString().split('T')[0],
      effective_to: rule.effectiveTo || null,
      is_active: rule.isActive !== undefined ? rule.isActive : true,
      is_archived: false,
      created_by: userId,
      updated_by: userId,
    };

    const { data, error } = await supabase
      .from('additional_charge_rules')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw new Error(error.message || 'Failed to create additional charge rule.');
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      nameAr: data.name_ar,
      descriptionEn: data.description_en,
      descriptionAr: data.description_ar,
      category: data.category,
      chargeType: data.charge_type,
      amount: Number(data.amount),
      currency: data.currency,
      isMandatory: Boolean(data.is_mandatory),
      isIncludedInCif: Boolean(data.is_included_in_cif),
      isIncludedInVatBase: Boolean(data.is_included_in_vat_base),
      countryCode: data.country_code || undefined,
      destinationPortId: data.destination_port_id || undefined,
      shippingMethodId: data.shipping_method_id || undefined,
      vehicleCategoryId: data.vehicle_category_id || undefined,
      powertrainId: data.powertrain_id || undefined,
      conditionId: data.condition_id || undefined,
      displayOrder: data.display_order,
      effectiveFrom: data.effective_from,
      effectiveTo: data.effective_to,
      isActive: Boolean(data.is_active),
      isArchived: Boolean(data.is_archived),
    };
  },

  async updateAdditionalChargeRule(
    id: string,
    updates: Partial<AdminAdditionalChargeRule>
  ): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const payload: AdditionalChargeRuleUpdate = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.nameAr !== undefined) payload.name_ar = updates.nameAr;
    if (updates.code !== undefined) payload.code = updates.code ? updates.code.trim().toUpperCase() : null;
    if (updates.descriptionEn !== undefined) payload.description_en = updates.descriptionEn;
    if (updates.descriptionAr !== undefined) payload.description_ar = updates.descriptionAr;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.chargeType !== undefined) payload.charge_type = updates.chargeType;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.currency !== undefined) payload.currency = updates.currency;
    if (updates.isMandatory !== undefined) payload.is_mandatory = updates.isMandatory;
    if (updates.isIncludedInCif !== undefined) payload.is_included_in_cif = updates.isIncludedInCif;
    if (updates.isIncludedInVatBase !== undefined) payload.is_included_in_vat_base = updates.isIncludedInVatBase;
    if (updates.countryCode !== undefined) payload.country_code = updates.countryCode || null;
    if (updates.destinationPortId !== undefined) payload.destination_port_id = updates.destinationPortId || null;
    if (updates.shippingMethodId !== undefined) payload.shipping_method_id = updates.shippingMethodId || null;
    if (updates.vehicleCategoryId !== undefined) payload.vehicle_category_id = updates.vehicleCategoryId || null;
    if (updates.powertrainId !== undefined) payload.powertrain_id = updates.powertrainId || null;
    if (updates.conditionId !== undefined) payload.condition_id = updates.conditionId || null;
    if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;
    if (updates.effectiveFrom !== undefined) payload.effective_from = updates.effectiveFrom;
    if (updates.effectiveTo !== undefined) payload.effective_to = updates.effectiveTo || null;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.isArchived !== undefined) payload.is_archived = updates.isArchived;

    const { error } = await supabase.from('additional_charge_rules').update(payload).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update charge rule.');
    return true;
  },

  async deleteAdditionalChargeRule(id: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('delete_additional_charge_rule', { p_id: id });
    if (error) throw new Error(error.message || 'Unable to delete charge rule.');
    return Boolean(data);
  },

  async reorderAdditionalChargeRules(orders: { id: string; displayOrder: number }[]): Promise<boolean> {
    for (const item of orders) {
      const { error } = await supabase
        .from('additional_charge_rules')
        .update({ display_order: item.displayOrder, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw new Error(error.message || 'Failed to reorder surcharge rules.');
    }
    return true;
  },

  // -------------------------------------------------------------
  // Vehicle Attributes (Categories, Powertrains, Conditions)
  // -------------------------------------------------------------
  async getVehicleAttributes(type: 'category' | 'powertrain' | 'condition'): Promise<AdminVehicleAttribute[]> {
    const query =
      type === 'category'
        ? supabase.from('vehicle_categories').select('*')
        : type === 'powertrain'
        ? supabase.from('powertrains').select('*')
        : supabase.from('vehicle_conditions').select('*');

    const { data, error } = await query
      .eq('is_archived', false)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw new Error(error.message || `Unable to load ${type} attributes.`);
    const rows = (data || []) as unknown as GenericAttributeRow[];
    return rows.map((row) => ({
      id: row.id,
      type,
      name: row.name,
      nameAr: row.name_ar,
      description: row.description,
      descriptionAr: row.description_ar,
      icon: row.icon,
      displayOrder: row.display_order ?? 0,
      isActive: Boolean(row.is_active),
      isArchived: Boolean(row.is_archived),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async createVehicleAttribute(
    type: 'category' | 'powertrain' | 'condition',
    attr: {
      id: string;
      name: string;
      nameAr?: string | null;
      description?: string | null;
      descriptionAr?: string | null;
      icon?: string | null;
      displayOrder: number;
      isActive?: boolean;
    }
  ): Promise<AdminVehicleAttribute> {
    const cleanId = attr.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const payload = {
      id: cleanId,
      name: attr.name.trim(),
      name_ar: attr.nameAr?.trim() || null,
      description: attr.description?.trim() || null,
      description_ar: attr.descriptionAr?.trim() || null,
      icon: attr.icon?.trim() || null,
      display_order: attr.displayOrder,
      is_active: attr.isActive !== undefined ? attr.isActive : true,
      is_archived: false,
      created_by: userId,
      updated_by: userId,
    };

    const query =
      type === 'category'
        ? supabase.from('vehicle_categories').insert(payload).select('*').single()
        : type === 'powertrain'
        ? supabase.from('powertrains').insert(payload).select('*').single()
        : supabase.from('vehicle_conditions').insert(payload).select('*').single();

    const { data, error } = await query;
    if (error) throw new Error(error.message || `Unable to create ${type} attribute.`);
    const row = data as unknown as GenericAttributeRow;
    return {
      id: row.id,
      type,
      name: row.name,
      nameAr: row.name_ar,
      description: row.description,
      descriptionAr: row.description_ar,
      icon: row.icon,
      displayOrder: row.display_order ?? 0,
      isActive: Boolean(row.is_active),
      isArchived: Boolean(row.is_archived),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async updateVehicleAttribute(
    type: 'category' | 'powertrain' | 'condition',
    id: string,
    updates: Partial<{
      name: string;
      nameAr: string | null;
      description: string | null;
      descriptionAr: string | null;
      icon: string | null;
      displayOrder: number;
      isActive: boolean;
      isArchived: boolean;
    }>
  ): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const payload: VehicleCategoryUpdate = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.nameAr !== undefined) payload.name_ar = updates.nameAr?.trim() || null;
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
    if (updates.descriptionAr !== undefined) payload.description_ar = updates.descriptionAr?.trim() || null;
    if (updates.icon !== undefined) payload.icon = updates.icon?.trim() || null;
    if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.isArchived !== undefined) payload.is_archived = updates.isArchived;

    const query =
      type === 'category'
        ? supabase.from('vehicle_categories').update(payload).eq('id', id)
        : type === 'powertrain'
        ? supabase.from('powertrains').update(payload as PowertrainUpdate).eq('id', id)
        : supabase.from('vehicle_conditions').update(payload as VehicleConditionUpdate).eq('id', id);

    const { error } = await query;
    if (error) throw new Error(error.message || `Unable to update ${type} attribute.`);
    return true;
  },

  async deleteVehicleAttribute(type: 'category' | 'powertrain' | 'condition', id: string): Promise<boolean> {
    const typeKey = type === 'category' ? 'category' : type === 'powertrain' ? 'powertrain' : 'condition';
    const { data, error } = await supabase.rpc('delete_vehicle_attribute', {
      p_type: typeKey,
      p_id: id,
    });
    if (error) throw new Error(error.message || `Unable to delete ${type} attribute.`);
    return Boolean(data);
  },

  // -------------------------------------------------------------
  // Vehicle Category Compatibilities
  // -------------------------------------------------------------
  async getCategoryCompatibilities(categoryId?: string): Promise<VehicleCategoryCompatibility[]> {
    let query = supabase.from('vehicle_category_compatibilities').select('*');
    if (categoryId) {
      query = query.eq('vehicle_category_id', categoryId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Unable to load category compatibilities.');
    return (data || []).map((c) => ({
      id: c.id,
      vehicle_category_id: c.vehicle_category_id,
      target_type: c.target_type as 'powertrain' | 'condition',
      target_id: c.target_id,
      is_active: Boolean(c.is_active),
      created_at: c.created_at,
      created_by: c.created_by,
    }));
  },

  async setCategoryCompatibilities(
    categoryId: string,
    targetType: 'powertrain' | 'condition',
    targetIds: string[]
  ): Promise<boolean> {
    const { error: delError } = await supabase
      .from('vehicle_category_compatibilities')
      .delete()
      .eq('vehicle_category_id', categoryId)
      .eq('target_type', targetType);
    if (delError) throw new Error(delError.message || 'Unable to clear existing compatibilities.');

    if (targetIds.length === 0) return true;

    const inserts = targetIds.map((tid) => ({
      vehicle_category_id: categoryId,
      target_type: targetType,
      target_id: tid,
      is_active: true,
    }));

    const { error: insError } = await supabase.from('vehicle_category_compatibilities').insert(inserts);
    if (insError) throw new Error(insError.message || 'Unable to save category compatibilities.');
    return true;
  },

  // -------------------------------------------------------------
  // Attribute Price Adjustments (Towing & Shipping)
  // -------------------------------------------------------------
  async getAttributePriceAdjustments(context?: 'towing' | 'shipping'): Promise<AttributePriceAdjustment[]> {
    let query = supabase
      .from('attribute_price_adjustments')
      .select('*')
      .order('context', { ascending: true })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (context) {
      query = query.eq('context', context);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Unable to load price adjustments.');
    const rows = (data || []) as AttributeAdjustmentRow[];
    return rows.map((adj) => ({
      id: adj.id,
      attribute_type: adj.attribute_type as AttributePriceAdjustment['attribute_type'],
      attribute_id: adj.attribute_id,
      context: adj.context as AttributePriceAdjustment['context'],
      amount_usd: Number(adj.amount_usd),
      reason_en: adj.reason_en,
      reason_ar: adj.reason_ar,
      display_order: adj.display_order,
      effective_from: adj.effective_from,
      effective_to: adj.effective_to,
      is_active: Boolean(adj.is_active),
      admin_notes: adj.admin_notes,
      created_at: adj.created_at,
      updated_at: adj.updated_at,
    }));
  },

  async createAttributePriceAdjustment(
    adj: Omit<AttributePriceAdjustment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<AttributePriceAdjustment> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const payload = {
      attribute_type: adj.attribute_type,
      attribute_id: adj.attribute_id,
      context: adj.context,
      amount_usd: adj.amount_usd,
      reason_en: adj.reason_en.trim(),
      reason_ar: adj.reason_ar?.trim() || null,
      display_order: adj.display_order ?? 0,
      effective_from: adj.effective_from || new Date().toISOString().split('T')[0],
      effective_to: adj.effective_to || null,
      is_active: adj.is_active !== undefined ? adj.is_active : true,
      admin_notes: adj.admin_notes?.trim() || null,
      created_by: userId,
      updated_by: userId,
    };

    const { data, error } = await supabase
      .from('attribute_price_adjustments')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw new Error(error.message || 'Unable to create price adjustment.');
    const res = data as AttributeAdjustmentRow;
    return {
      id: res.id,
      attribute_type: res.attribute_type as AttributePriceAdjustment['attribute_type'],
      attribute_id: res.attribute_id,
      context: res.context as AttributePriceAdjustment['context'],
      amount_usd: Number(res.amount_usd),
      reason_en: res.reason_en,
      reason_ar: res.reason_ar,
      display_order: res.display_order,
      effective_from: res.effective_from,
      effective_to: res.effective_to,
      is_active: Boolean(res.is_active),
      admin_notes: res.admin_notes,
      created_at: res.created_at,
      updated_at: res.updated_at,
    };
  },

  async updateAttributePriceAdjustment(
    id: string,
    updates: Partial<AttributePriceAdjustment>
  ): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const payload: AttributeAdjustmentUpdate = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };
    if (updates.attribute_type !== undefined) payload.attribute_type = updates.attribute_type;
    if (updates.attribute_id !== undefined) payload.attribute_id = updates.attribute_id;
    if (updates.context !== undefined) payload.context = updates.context;
    if (updates.amount_usd !== undefined) payload.amount_usd = updates.amount_usd;
    if (updates.reason_en !== undefined) payload.reason_en = updates.reason_en.trim();
    if (updates.reason_ar !== undefined) payload.reason_ar = updates.reason_ar?.trim() || null;
    if (updates.display_order !== undefined) payload.display_order = updates.display_order;
    if (updates.effective_from !== undefined) payload.effective_from = updates.effective_from;
    if (updates.effective_to !== undefined) payload.effective_to = updates.effective_to || null;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    if (updates.admin_notes !== undefined) payload.admin_notes = updates.admin_notes?.trim() || null;

    const { error } = await supabase.from('attribute_price_adjustments').update(payload).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update price adjustment.');
    return true;
  },

  async deleteAttributePriceAdjustment(id: string): Promise<boolean> {
    const { error } = await supabase.from('attribute_price_adjustments').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Unable to delete price adjustment.');
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
      ruleKey?: string | null;
    }
  ): Promise<AdminQuotationRule> {
    const cleanContentEn = sanitizeRuleContent(rule.contentEn);
    const cleanContentAr = rule.contentAr ? sanitizeRuleContent(rule.contentAr) : null;
    const effFrom = rule.effectiveFrom || new Date().toISOString().split('T')[0];
    const effUntil = rule.effectiveUntil || null;

    // Use atomic database RPC
    const { data, error } = await supabase.rpc('create_quotation_rule_v1', {
      p_title_en: rule.titleEn.trim(),
      p_title_ar: rule.titleAr?.trim() || undefined,
      p_content_en: cleanContentEn,
      p_content_ar: cleanContentAr || undefined,
      p_display_order: rule.displayOrder,
      p_effective_from: effFrom,
      p_effective_until: effUntil || undefined,
      p_rule_key: rule.ruleKey || undefined,
    });

    if (error) throw error;

    const res = data as { success: boolean; rule_id: string; rule_key: string; version: number };

    // Fetch newly created rule
    const { data: newRow, error: fetchErr } = await supabase
      .from('quotation_rules')
      .select('*')
      .eq('id', res.rule_id)
      .single();

    if (fetchErr || !newRow) {
      throw new Error(fetchErr?.message || 'Failed to fetch newly created quotation rule');
    }

    return {
      id: newRow.id,
      titleEn: newRow.title_en,
      titleAr: newRow.title_ar,
      contentEn: newRow.content_en,
      contentAr: newRow.content_ar,
      displayOrder: newRow.display_order,
      isActive: newRow.is_active,
      isArchived: newRow.is_archived,
      effectiveFrom: newRow.effective_from,
      effectiveUntil: newRow.effective_until || newRow.effective_to,
      version: newRow.version,
      createdAt: newRow.created_at,
      updatedAt: newRow.updated_at,
      updatedBy: newRow.updated_by,
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
    // 1. Fetch current rule to populate defaults for any omitted fields
    const { data: existingRule, error: fetchError } = await supabase
      .from('quotation_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingRule) {
      throw new Error(fetchError?.message || 'Quotation rule not found');
    }

    const titleEn = updates.titleEn !== undefined ? updates.titleEn.trim() : existingRule.title_en;
    const titleAr = updates.titleAr !== undefined ? (updates.titleAr?.trim() || null) : existingRule.title_ar;
    const contentEn = updates.contentEn !== undefined ? sanitizeRuleContent(updates.contentEn) : existingRule.content_en;
    const contentAr = updates.contentAr !== undefined ? (updates.contentAr ? sanitizeRuleContent(updates.contentAr) : null) : existingRule.content_ar;
    const displayOrder = updates.displayOrder !== undefined ? updates.displayOrder : existingRule.display_order;
    const effFrom = updates.effectiveFrom || existingRule.effective_from || new Date().toISOString().split('T')[0];
    const effUntil = updates.effectiveUntil !== undefined ? updates.effectiveUntil : (existingRule.effective_until || existingRule.effective_to);

    // 2. Call atomic database RPC that locks the row, archives v1, and inserts v2 in one transaction
    const { error: rpcError } = await supabase.rpc('revise_quotation_rule_v1', {
      p_rule_id: id,
      p_title_en: titleEn,
      p_title_ar: titleAr || undefined,
      p_content_en: contentEn,
      p_content_ar: contentAr || undefined,
      p_display_order: displayOrder,
      p_effective_from: effFrom,
      p_effective_until: effUntil || undefined,
    });

    if (rpcError) throw rpcError;
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
