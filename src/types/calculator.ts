export type VehicleType = 'sedan' | 'suv' | 'van' | 'pickup' | 'bike' | (string & {});
export type Powertrain = 'petrol' | 'hybrid' | 'electric' | (string & {});
export type PurchaseSource =
  | 'copart'
  | 'iaai'
  | 'manheim'
  | 'acv'
  | 'adesa'
  | 'dealer'
  | 'other'
  | (string & {});
export type UsLoadingPort =
  | 'newark'
  | 'savannah'
  | 'houston'
  | 'los_angeles'
  | 'baltimore'
  | (string & {});
export type UaeDestinationPort = 'khorfakkan' | 'jebel_ali' | (string & {});

export interface PortOption {
  id: string;
  name: string;
  nameAr?: string;
  stateOrCity: string;
  country: string;
  code: string;
}

export interface CalculatorFormData {
  vehicleType: VehicleType;
  powertrain: Powertrain;
  conditionId?: string;
  purchaseSource: PurchaseSource;
  loadingPort: UsLoadingPort;
  destinationPort: UaeDestinationPort;
  buyingPrice: number;
  includeInlandTowing?: boolean;
  stateCode?: string;
  towFromLocation?: string;
  purchaseLocationId?: string;
  shippingMethod?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  country?: string;
  city?: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  lotNumber?: string;
  listingUrl?: string;
  notes?: string;
  idempotencyKey?: string;
  isAnonymous?: boolean;
}

export interface QuotationLineItem {
  category: string;
  description: string;
  description_ar?: string;
  amount_usd?: number;
  amount_usd_min?: number;
  amount_usd_max?: number;
  is_range?: boolean;
  is_requested?: boolean;
  reason?: string;
  reason_ar?: string;
  is_included_in_cif?: boolean;
  is_included_in_vat_base?: boolean;
}

export interface QuotationRouteInfo {
  route_id?: string;
  origin_port_id?: string;
  origin_port_name?: string;
  origin_port_name_ar?: string;
  origin_port_state?: string;
  origin_port_code?: string;
  origin_country_code?: string;
  origin_country_name?: string;
  origin_country_name_ar?: string;
  destination_port_id?: string;
  destination_port_name?: string;
  destination_port_name_ar?: string;
  destination_port_state?: string;
  destination_port_code?: string;
  destination_country_code?: string;
  destination_country_name?: string;
  destination_country_name_ar?: string;
  shipping_method_id?: string;
  shipping_method_name?: string;
  transit_days_min?: number;
  transit_days_max?: number;
}

export interface QuotationRuleItem {
  id: string;
  ruleKey?: string;
  rule_key?: string;
  title?: string;
  title_en?: string;
  title_ar?: string;
  content?: string;
  content_en?: string;
  content_ar?: string;
  category?: string;
  display_order: number;
  version?: number;
}

export interface QuotationBreakdown {
  id: string;
  referenceNumber: string;
  enquiryReference?: string;
  createdAt: string;
  input: CalculatorFormData;
  estimatedTransitDays: number;
  estimatedTransitDaysMin?: number;
  estimatedTransitDaysMax?: number;
  oceanFreight: number;
  oceanFreightBase?: number;
  oceanFreightAdjustments?: number;
  powertrainSurcharge: number;
  vehicleTypeSurcharge: number;
  oceanFreightTotal: number;
  surchargesTotal?: number;
  customsClearance: number;
  destinationCharges: number;
  customsDuty: number;
  dutyMin?: number;
  dutyMax?: number;
  vat: number;
  vatMin?: number;
  vatMax?: number;
  cifMin?: number;
  cifMax?: number;
  towingFeeMin?: number;
  towingFeeMax?: number;
  towingFeeBaseMin?: number;
  towingFeeBaseMax?: number;
  towingAdjustments?: number;
  isTowingRange?: boolean;
  includeInlandTowing?: boolean;
  towingLocationName?: string;
  towingDescription?: string;
  oceanAndTowingSubtotalMin?: number;
  oceanAndTowingSubtotalMax?: number;
  transportSubtotalMin?: number;
  transportSubtotalMax?: number;
  destinationClearanceSubtotal?: number;
  uaeGovernmentChargesSubtotalMin?: number;
  uaeGovernmentChargesSubtotalMax?: number;
  totalChargesUsd: number;
  totalChargesUsdMin?: number;
  totalChargesUsdMax?: number;
  totalChargesAed: number;
  totalChargesAedMin?: number;
  totalChargesAedMax?: number;
  towChargeStatus: 'included' | 'quote_on_request' | 'range';
  isEstimate: boolean;
  disclaimer?: string;
  lineItems?: QuotationLineItem[];
  routeInfo?: QuotationRouteInfo;
  rules?: QuotationRuleItem[];
  snapshot?: Record<string, unknown>;
  isIdempotentReplay?: boolean;
  isAnonymous?: boolean;
}

export interface EligibleState {
  code: string;
  name: string;
  display_order: number;
  locations_count: number;
}

export interface EligiblePickupLocation {
  id: string;
  name: string;
  location_code?: string;
  state_code: string;
  city?: string;
  zip_code?: string;
  auction_company?: string;
  purchase_source_id?: string | null;
  available_ports_count: number;
}

export interface EligibleOriginPort {
  id: string;
  name: string;
  name_ar?: string;
  code: string;
  state_or_city: string;
  country_code: string;
  towing_rate_type?: 'fixed' | 'range' | 'none';
  towing_fixed_amount?: number | null;
  towing_min_amount?: number | null;
  towing_max_amount?: number | null;
}

export interface EligibleDestinationPort {
  id: string;
  name: string;
  name_ar?: string;
  code: string;
  state_or_city: string;
  country_code: string;
  route_id: string;
  transit_days_min: number;
  transit_days_max: number;
}

export interface EligibleShippingMethod {
  id: string;
  name: string;
  base_amount: number;
  currency: string;
}

export interface EligiblePowertrain {
  id: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  icon?: string | null;
  display_order: number;
}

export interface EligibleCondition {
  id: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  icon?: string | null;
  display_order: number;
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

export interface VehicleCategoryCompatibility {
  id: string;
  vehicle_category_id: string;
  target_type: 'powertrain' | 'condition';
  target_id: string;
  is_active: boolean;
  created_at?: string;
  created_by?: string | null;
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
  extraTowingCharge?: number;
  extraShippingCharge?: number;
  chargeReasonEn?: string;
  chargeReasonAr?: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminAdditionalChargeRuleExtended {
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
  destinationPortId?: string | null;
  destinationPortName?: string;
  countryCode?: string | null;
  shippingMethodId?: string | null;
  shippingMethodName?: string;
  vehicleCategoryId?: string | null;
  vehicleCategoryName?: string;
  powertrainId?: string | null;
  powertrainName?: string;
  conditionId?: string | null;
  conditionName?: string;
  displayOrder: number;
  isActive: boolean;
  isArchived: boolean;
  isMandatory: boolean;
  isIncludedInCif: boolean;
  isIncludedInVatBase: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface VinDecodeResult {
  success: boolean;
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  vehicleType?: string;
  bodyClass?: string;
  fuelType?: string;
  suggestedCategoryId?: string;
  suggestedPowertrainId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface CalculatorAvailabilityResponse {
  eligible_states?: EligibleState[];
  eligible_pickup_locations: EligiblePickupLocation[];
  eligible_origin_ports: EligibleOriginPort[];
  eligible_destination_ports: EligibleDestinationPort[];
  eligible_shipping_methods: EligibleShippingMethod[];
  eligible_powertrains?: EligiblePowertrain[];
  eligible_conditions?: EligibleCondition[];
  active_adjustments?: AttributePriceAdjustment[];
}


