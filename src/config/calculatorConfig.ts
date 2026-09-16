import { PortOption, VehicleType, Powertrain, PurchaseSource } from '../types/calculator';

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
