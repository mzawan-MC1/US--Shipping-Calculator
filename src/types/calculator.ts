export type VehicleType = 'sedan' | 'suv' | 'van' | 'pickup' | 'bike';
export type Powertrain = 'petrol' | 'hybrid' | 'electric';
export type PurchaseSource = 'copart' | 'iaai' | 'manheim' | 'acv' | 'adesa' | 'dealer' | 'other';
export type UsLoadingPort = 'newark' | 'savannah' | 'houston' | 'los_angeles' | 'baltimore';
export type UaeDestinationPort = 'khorfakkan' | 'jebel_ali';

export interface PortOption {
  id: string;
  name: string;
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
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}

export interface QuotationBreakdown {
  id: string;
  referenceNumber: string;
  createdAt: string;
  input: CalculatorFormData;
  estimatedTransitDays: number;
  oceanFreight: number;
  powertrainSurcharge: number;
  vehicleTypeSurcharge: number;
  oceanFreightTotal: number;
  customsClearance: number;
  destinationCharges: number;
  customsDuty: number;
  vat: number;
  totalChargesUsd: number;
  totalChargesAed: number;
  towChargeStatus: 'included' | 'quote_on_request';
  isEstimate: boolean;
}
