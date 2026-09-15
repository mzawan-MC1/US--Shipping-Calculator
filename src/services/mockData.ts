import {
  PortOption,
  QuotationBreakdown,
  VehicleType,
  Powertrain,
  PurchaseSource,
} from '../types/calculator';
import { CustomerEnquiry, AdminKpiMetrics } from '../types/admin';

export const US_LOADING_PORTS: PortOption[] = [
  { id: 'newark', name: 'Newark', stateOrCity: 'NJ', country: 'USA', code: 'USNWK' },
  { id: 'savannah', name: 'Savannah', stateOrCity: 'GA', country: 'USA', code: 'USSAV' },
  { id: 'houston', name: 'Houston', stateOrCity: 'TX', country: 'USA', code: 'USHOU' },
  { id: 'los_angeles', name: 'Los Angeles', stateOrCity: 'CA', country: 'USA', code: 'USLAX' },
  { id: 'baltimore', name: 'Baltimore', stateOrCity: 'MD', country: 'USA', code: 'USBAL' },
];

export const UAE_DESTINATION_PORTS: PortOption[] = [
  {
    id: 'khorfakkan',
    name: 'Khorfakkan Port',
    stateOrCity: 'Sharjah',
    country: 'UAE',
    code: 'AEKLF',
  },
  { id: 'jebel_ali', name: 'Jebel Ali Port', stateOrCity: 'Dubai', country: 'UAE', code: 'AEJEA' },
];

export const VEHICLE_TYPES_CONFIG: { id: VehicleType; labelKey: string }[] = [
  { id: 'sedan', labelKey: 'vehicleTypeSedan' },
  { id: 'suv', labelKey: 'vehicleTypeSuv' },
  { id: 'van', labelKey: 'vehicleTypeVan' },
  { id: 'pickup', labelKey: 'vehicleTypePickup' },
  { id: 'bike', labelKey: 'vehicleTypeBike' },
];

export const POWERTRAINS_CONFIG: { id: Powertrain; labelKey: string }[] = [
  { id: 'petrol', labelKey: 'powertrainPetrol' },
  { id: 'hybrid', labelKey: 'powertrainHybrid' },
  { id: 'electric', labelKey: 'powertrainElectric' },
];

export const PURCHASE_SOURCES_CONFIG: { id: PurchaseSource; labelKey: string }[] = [
  { id: 'copart', labelKey: 'sourceCopart' },
  { id: 'iaai', labelKey: 'sourceIaai' },
  { id: 'manheim', labelKey: 'sourceManheim' },
  { id: 'acv', labelKey: 'sourceAcv' },
  { id: 'adesa', labelKey: 'sourceAdesa' },
  { id: 'dealer', labelKey: 'sourceDealer' },
  { id: 'other', labelKey: 'sourceOther' },
];

/**
 * Standard baseline fixture matching client reference design for demonstration
 */
export const SAMPLE_QUOTATION_BREAKDOWN: QuotationBreakdown = {
  id: 'quote-demo-84920',
  referenceNumber: 'FAK-2026-84920',
  createdAt: new Date().toISOString(),
  input: {
    vehicleType: 'sedan',
    powertrain: 'petrol',
    purchaseSource: 'copart',
    loadingPort: 'savannah',
    destinationPort: 'khorfakkan',
    buyingPrice: 5000,
    towFromLocation: 'Houston, TX (Copart Houston)',
    customerName: 'Ahmed Al Mansoori',
    customerPhone: '+971 50 123 4567',
  },
  estimatedTransitDays: 65,
  oceanFreight: 1930,
  powertrainSurcharge: 0,
  vehicleTypeSurcharge: 0,
  oceanFreightTotal: 1930,
  customsClearance: 400,
  destinationCharges: 800,
  customsDuty: 250, // 5% of $5,000
  vat: 260, // 5.2% / 5% calculated
  totalChargesUsd: 3640,
  totalChargesAed: Math.round(3640 * 3.6725),
  towChargeStatus: 'quote_on_request',
  isEstimate: true,
};

export const MOCK_ADMIN_KPIS: AdminKpiMetrics = {
  totalEnquiriesThisMonth: 142,
  activeQuotationsCount: 88,
  averageTransitDays: 58,
  pendingFollowUps: 19,
};

export const MOCK_ENQUIRIES: CustomerEnquiry[] = [
  {
    id: 'enq-101',
    referenceNumber: 'FAK-ENQ-2026-101',
    customerName: 'Mohammed Tariq',
    phone: '+971 55 987 6543',
    vehicleDetails: '2022 Toyota Camry (Sedan - Petrol)',
    route: 'Savannah, GA -> Khorfakkan, Sharjah',
    estimatedTotalUsd: 3640,
    status: 'new',
    createdAt: '2026-09-15T09:30:00Z',
    source: 'web_calculator',
  },
  {
    id: 'enq-102',
    referenceNumber: 'FAK-ENQ-2026-102',
    customerName: 'Rashid Khalifa',
    phone: '+971 50 443 2211',
    vehicleDetails: '2021 Ford F-150 (Pickup - Petrol)',
    route: 'Houston, TX -> Jebel Ali, Dubai',
    estimatedTotalUsd: 4180,
    status: 'contacted',
    createdAt: '2026-09-14T15:15:00Z',
    source: 'whatsapp',
  },
  {
    id: 'enq-103',
    referenceNumber: 'FAK-ENQ-2026-103',
    customerName: 'Sultan Al Nuaimi',
    phone: '+971 52 778 9900',
    vehicleDetails: '2023 Tesla Model Y (SUV - Electric)',
    route: 'Newark, NJ -> Khorfakkan, Sharjah',
    estimatedTotalUsd: 4520,
    status: 'quoted',
    createdAt: '2026-09-14T11:00:00Z',
    source: 'web_calculator',
  },
  {
    id: 'enq-104',
    referenceNumber: 'FAK-ENQ-2026-104',
    customerName: 'Hamad Bin Saeed',
    phone: '+971 54 332 1199',
    vehicleDetails: '2020 Lexus RX350 (SUV - Hybrid)',
    route: 'Los Angeles, CA -> Jebel Ali, Dubai',
    estimatedTotalUsd: 4890,
    status: 'in_transit',
    createdAt: '2026-09-12T08:45:00Z',
    source: 'web_calculator',
  },
];
