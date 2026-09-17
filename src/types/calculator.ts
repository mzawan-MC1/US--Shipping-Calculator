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
}

export interface QuotationLineItem {
  category: string;
  description: string;
  amount_usd?: number;
  amount_usd_min?: number;
  amount_usd_max?: number;
  is_range?: boolean;
  is_requested?: boolean;
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
  powertrainSurcharge: number;
  vehicleTypeSurcharge: number;
  oceanFreightTotal: number;
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
  isTowingRange?: boolean;
  includeInlandTowing?: boolean;
  towingLocationName?: string;
  towingDescription?: string;
  oceanAndTowingSubtotalMin?: number;
  oceanAndTowingSubtotalMax?: number;
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
}

export interface EligiblePickupLocation {
  id: string;
  name: string;
  state_code: string;
  purchase_source_id: string;
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

export interface CalculatorAvailabilityResponse {
  eligible_pickup_locations: EligiblePickupLocation[];
  eligible_origin_ports: EligibleOriginPort[];
  eligible_destination_ports: EligibleDestinationPort[];
  eligible_shipping_methods: EligibleShippingMethod[];
}

