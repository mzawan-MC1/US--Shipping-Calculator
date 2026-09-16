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
  purchaseSource: PurchaseSource;
  loadingPort: UsLoadingPort;
  destinationPort: UaeDestinationPort;
  buyingPrice: number;
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
  snapshot?: Record<string, unknown>;
  isIdempotentReplay?: boolean;
}
