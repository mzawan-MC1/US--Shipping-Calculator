import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { AdminTowingRate, AdminPurchaseLocation, AdminState } from './adminService';

export interface TowingRateImportRow {
  rowNumber: number;
  stateCode: string;
  locationCode?: string;
  locationName: string;
  portCode: string;
  portName?: string;
  vehicleCategoryId?: string;
  rateType: 'fixed' | 'range';
  fixedAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
  status: 'new' | 'updated' | 'unchanged' | 'rejected' | 'duplicate';
  errors: string[];
  matchedLocationId?: string;
  matchedPortId?: string;
  matchedRateId?: string;
}

export interface TowingRateImportSummary {
  total: number;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  rows: TowingRateImportRow[];
}

export interface LocationImportRow {
  rowNumber: number;
  locationCode?: string;
  name: string;
  stateCode: string;
  city?: string;
  zipCode?: string;
  auctionCompany?: string;
  address?: string;
  isActive: boolean;
  status: 'new' | 'updated' | 'unchanged' | 'rejected' | 'duplicate';
  errors: string[];
  matchedLocationId?: string;
}

export interface LocationImportSummary {
  total: number;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  rows: LocationImportRow[];
}

// ==========================================
// Towing Rates Bulk Service
// ==========================================

export const towingRatesBulkService = {
  getTemplateRows(): Record<string, unknown>[] {
    return [
      {
        State_Code: 'NJ',
        Location_Code: 'CP-NORTHGATE',
        Location_Name: 'Copart Northgate',
        Port_Code: 'USNWK',
        Vehicle_Category: 'sedan',
        Pricing_Mode: 'fixed',
        Fixed_Price: 120,
        Min_Price: '',
        Max_Price: '',
        Effective_From: new Date().toISOString().split('T')[0],
        Effective_To: '',
        Active: 'TRUE',
      },
      {
        State_Code: 'GA',
        Location_Code: 'CP-ATL-S',
        Location_Name: 'Copart Atlanta South',
        Port_Code: 'USSAV',
        Vehicle_Category: 'suv',
        Pricing_Mode: 'range',
        Fixed_Price: '',
        Min_Price: 200,
        Max_Price: 250,
        Effective_From: new Date().toISOString().split('T')[0],
        Effective_To: '',
        Active: 'TRUE',
      },
      {
        State_Code: 'TX',
        Location_Code: 'CP-DAL-S',
        Location_Name: 'Copart Dallas South',
        Port_Code: 'USHOU',
        Vehicle_Category: '',
        Pricing_Mode: 'fixed',
        Fixed_Price: 180,
        Min_Price: '',
        Max_Price: '',
        Effective_From: new Date().toISOString().split('T')[0],
        Effective_To: '',
        Active: 'TRUE',
      },
    ];
  },

  downloadTemplate(format: 'csv' | 'xlsx'): void {
    const data = this.getTemplateRows();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Towing_Rates_Template');

    const filename = `towing_rates_template.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  },

  exportRates(rates: AdminTowingRate[], format: 'csv' | 'xlsx'): void {
    const data = rates.map((r) => ({
      State_Code: r.stateCode || '',
      Location_Code: r.locationCode || '',
      Location_Name: r.locationName || r.originLocation.split(',')[0] || '',
      City: r.city || '',
      Auction_Company: r.auctionCompany || '',
      Port_Code: r.loadingPortCode || '',
      Port_Name: r.loadingPort,
      Vehicle_Category: r.vehicleCategoryId || 'ALL',
      Pricing_Mode: r.rateType,
      Fixed_Price: r.rateType === 'fixed' ? r.fixedAmount : '',
      Min_Price: r.rateType === 'range' ? r.minAmount : '',
      Max_Price: r.rateType === 'range' ? r.maxAmount : '',
      Currency: r.currency || 'USD',
      Effective_From: r.effectiveFrom,
      Effective_To: r.effectiveTo || '',
      Active: r.isActive ? 'TRUE' : 'FALSE',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Towing_Rates');

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `towing_rates_export_${timestamp}.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  },

  async parseFile(
    file: File,
    existingRates: AdminTowingRate[],
    locations: AdminPurchaseLocation[],
    ports: Array<{ id: string; name: string; code: string }>,
    states: AdminState[]
  ): Promise<TowingRateImportSummary> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    const stateMap = new Map(states.map((s) => [s.code.toUpperCase(), s]));
    const locByCode = new Map(locations.map((l) => [l.locationCode?.toUpperCase() || '', l]));
    const locByNameState = new Map(
      locations.map((l) => [`${l.stateCode.toUpperCase()}|${l.name.trim().toUpperCase()}`, l])
    );
    const portByCode = new Map(ports.map((p) => [p.code.toUpperCase(), p]));
    const portByName = new Map(ports.map((p) => [p.name.toUpperCase(), p]));

    const existingRateKeyMap = new Map(
      existingRates.map((r) => [
        `${r.purchaseLocationId}|${r.loadingPortId}|${(r.vehicleCategoryId || '').toLowerCase()}`,
        r,
      ])
    );

    const seenInFile = new Set<string>();
    const parsedRows: TowingRateImportRow[] = [];

    rawData.forEach((row, idx) => {
      const rowNumber = idx + 2; // header is row 1
      const errors: string[] = [];

      // Extract raw properties (case-insensitive keys)
      const getVal = (patterns: string[]): string => {
        for (const p of patterns) {
          const key = Object.keys(row).find((k) => k.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === p);
          if (key && row[key] !== undefined && row[key] !== null) {
            return String(row[key]).trim();
          }
        }
        return '';
      };

      const stateCode = getVal(['statecode', 'state']).toUpperCase();
      const locationCode = getVal(['locationcode']).toUpperCase();
      const locationName = getVal(['locationname', 'location', 'originlocation']);
      const portInput = getVal(['portcode', 'port', 'loadingport']).toUpperCase();
      const vehicleCategory = getVal(['vehiclecategory', 'category']).toLowerCase();
      const categoryClean = vehicleCategory === 'all' || !vehicleCategory ? undefined : vehicleCategory;
      const pricingModeInput = getVal(['pricingmode', 'ratetype', 'mode']).toLowerCase();
      const rateType: 'fixed' | 'range' = pricingModeInput === 'range' ? 'range' : 'fixed';

      const fixedPriceStr = getVal(['fixedprice', 'fixedamount', 'price', 'rate']);
      const minPriceStr = getVal(['minprice', 'minamount']);
      const maxPriceStr = getVal(['maxprice', 'maxamount']);

      const fixedAmount = fixedPriceStr ? parseFloat(fixedPriceStr) : undefined;
      const minAmount = minPriceStr ? parseFloat(minPriceStr) : undefined;
      const maxAmount = maxPriceStr ? parseFloat(maxPriceStr) : undefined;

      const effectiveFromInput = getVal(['effectivefrom', 'startdate']);
      const effectiveToInput = getVal(['effectiveto', 'enddate']);
      const activeStr = getVal(['active', 'isactive']).toLowerCase();
      const isActive = activeStr === 'false' || activeStr === '0' || activeStr === 'no' ? false : true;

      // Validations
      if (!stateCode) {
        errors.push('State code is required.');
      } else if (!stateMap.has(stateCode)) {
        errors.push(`State code "${stateCode}" does not exist in known states.`);
      }

      // Match Location
      let matchedLocation: AdminPurchaseLocation | undefined;
      if (locationCode && locByCode.has(locationCode)) {
        matchedLocation = locByCode.get(locationCode);
      } else if (locationName && stateCode) {
        matchedLocation = locByNameState.get(`${stateCode}|${locationName.toUpperCase()}`);
      }

      if (!matchedLocation) {
        errors.push(
          `Location could not be matched by code "${locationCode}" or name "${locationName}" in state "${stateCode}". Please create the location first or verify the location code.`
        );
      }

      // Match Port
      let matchedPort: { id: string; name: string; code: string } | undefined;
      if (portInput) {
        matchedPort = portByCode.get(portInput) || portByName.get(portInput);
      }
      if (!matchedPort) {
        errors.push(`Loading port "${portInput}" does not match any known loading port.`);
      }

      // Price validations
      if (rateType === 'fixed') {
        if (fixedAmount === undefined || isNaN(fixedAmount) || fixedAmount <= 0) {
          errors.push('Fixed pricing mode requires a positive Fixed_Price.');
        }
      } else {
        if (minAmount === undefined || isNaN(minAmount) || minAmount <= 0) {
          errors.push('Range pricing mode requires a positive Min_Price.');
        }
        if (maxAmount === undefined || isNaN(maxAmount) || maxAmount <= 0) {
          errors.push('Range pricing mode requires a positive Max_Price.');
        }
        if (minAmount !== undefined && maxAmount !== undefined && maxAmount < minAmount) {
          errors.push('Max_Price must be greater than or equal to Min_Price.');
        }
      }

      // Check duplicates in file
      const dedupeKey = `${matchedLocation?.id || locationCode || locationName}|${matchedPort?.id || portInput}|${categoryClean || ''}`;
      let status: TowingRateImportRow['status'] = 'new';
      let matchedRateId: string | undefined;

      if (errors.length > 0) {
        status = 'rejected';
      } else if (seenInFile.has(dedupeKey)) {
        status = 'duplicate';
        errors.push('Duplicate entry for this location, port, and vehicle category within the uploaded file.');
      } else {
        seenInFile.add(dedupeKey);
        // Check if existing rate matches
        const existingRate = existingRateKeyMap.get(
          `${matchedLocation!.id}|${matchedPort!.id}|${(categoryClean || '').toLowerCase()}`
        );

        if (existingRate) {
          matchedRateId = existingRate.id;
          const isSamePrice =
            existingRate.rateType === rateType &&
            (rateType === 'fixed'
              ? existingRate.fixedAmount === fixedAmount
              : existingRate.minAmount === minAmount && existingRate.maxAmount === maxAmount) &&
            existingRate.isActive === isActive;

          status = isSamePrice ? 'unchanged' : 'updated';
        } else {
          status = 'new';
        }
      }

      parsedRows.push({
        rowNumber,
        stateCode,
        locationCode: matchedLocation?.locationCode || locationCode || undefined,
        locationName: matchedLocation?.name || locationName,
        portCode: matchedPort?.code || portInput,
        portName: matchedPort?.name,
        vehicleCategoryId: categoryClean,
        rateType,
        fixedAmount,
        minAmount,
        maxAmount,
        effectiveFrom: effectiveFromInput || new Date().toISOString().split('T')[0],
        effectiveTo: effectiveToInput || undefined,
        isActive,
        status,
        errors,
        matchedLocationId: matchedLocation?.id,
        matchedPortId: matchedPort?.id,
        matchedRateId,
      });
    });

    return {
      total: parsedRows.length,
      newCount: parsedRows.filter((r) => r.status === 'new').length,
      updatedCount: parsedRows.filter((r) => r.status === 'updated').length,
      unchangedCount: parsedRows.filter((r) => r.status === 'unchanged').length,
      rejectedCount: parsedRows.filter((r) => r.status === 'rejected').length,
      duplicateCount: parsedRows.filter((r) => r.status === 'duplicate').length,
      rows: parsedRows,
    };
  },

  downloadErrorReport(rejectedRows: TowingRateImportRow[], format: 'csv' | 'xlsx'): void {
    const data = rejectedRows.map((r) => ({
      Row: r.rowNumber,
      State_Code: r.stateCode,
      Location_Code: r.locationCode || '',
      Location_Name: r.locationName,
      Port_Code: r.portCode,
      Category: r.vehicleCategoryId || 'ALL',
      Rate_Type: r.rateType,
      Price: r.rateType === 'fixed' ? r.fixedAmount : `${r.minAmount}-${r.maxAmount}`,
      Errors: r.errors.join(' | '),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import_Errors');

    const filename = `towing_rate_errors_${new Date().toISOString().split('T')[0]}.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  },

  async commitImport(validRows: TowingRateImportRow[]): Promise<{ success: boolean; appliedCount: number }> {
    const importable = validRows.filter((r) => r.status === 'new' || r.status === 'updated');
    let appliedCount = 0;

    for (const r of importable) {
      if (!r.matchedLocationId || !r.matchedPortId) continue;

      if (r.matchedRateId) {
        // Update existing rate
        const { error } = await supabase
          .from('towing_rates')
          .update({
            rate_type: r.rateType,
            fixed_amount: r.rateType === 'fixed' ? r.fixedAmount : null,
            min_amount: r.rateType === 'range' ? r.minAmount : null,
            max_amount: r.rateType === 'range' ? r.maxAmount : null,
            effective_from: r.effectiveFrom || new Date().toISOString().split('T')[0],
            effective_to: r.effectiveTo || null,
            is_active: r.isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', r.matchedRateId);

        if (!error) appliedCount++;
      } else {
        // Insert new rate
        const { error } = await supabase.from('towing_rates').insert({
          purchase_location_id: r.matchedLocationId,
          loading_port_id: r.matchedPortId,
          vehicle_category_id: r.vehicleCategoryId || null,
          rate_type: r.rateType,
          fixed_amount: r.rateType === 'fixed' ? r.fixedAmount : null,
          min_amount: r.rateType === 'range' ? r.minAmount : null,
          max_amount: r.rateType === 'range' ? r.maxAmount : null,
          effective_from: r.effectiveFrom || new Date().toISOString().split('T')[0],
          effective_to: r.effectiveTo || null,
          is_active: r.isActive,
          currency: 'USD',
        });

        if (!error) appliedCount++;
      }
    }

    return { success: true, appliedCount };
  },
};

// ==========================================
// Pickup Locations Bulk Service
// ==========================================

export const locationsBulkService = {
  getTemplateRows(): Record<string, unknown>[] {
    return [
      {
        Location_Code: 'CP-NEWARK',
        Name: 'Copart Newark',
        State_Code: 'NJ',
        City: 'Newark',
        Zip_Code: '07114',
        Auction_Company: 'Copart',
        Address: '200 Doremus Ave',
        Active: 'TRUE',
      },
      {
        Location_Code: 'IAAI-SAV-N',
        Name: 'IAAI Savannah North',
        State_Code: 'GA',
        City: 'Savannah',
        Zip_Code: '31408',
        Auction_Company: 'IAAI',
        Address: '150 Crossroads Pkwy',
        Active: 'TRUE',
      },
      {
        Location_Code: 'MAN-HOU',
        Name: 'Manheim Houston',
        State_Code: 'TX',
        City: 'Houston',
        Zip_Code: '77067',
        Auction_Company: 'Manheim',
        Address: '14450 Imperial Valley Dr',
        Active: 'TRUE',
      },
    ];
  },

  downloadTemplate(format: 'csv' | 'xlsx'): void {
    const data = this.getTemplateRows();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Locations_Template');

    const filename = `pickup_locations_template.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  },

  exportLocations(locations: AdminPurchaseLocation[], format: 'csv' | 'xlsx'): void {
    const data = locations.map((l) => ({
      Location_Code: l.locationCode || '',
      Name: l.name,
      State_Code: l.stateCode,
      State_Name: l.stateName || l.stateCode,
      City: l.city || '',
      Zip_Code: l.zipCode || l.postalCode || '',
      Auction_Company: l.auctionCompany || '',
      Address: l.address || '',
      Connected_Ports_Count: l.connectedPortsCount || 0,
      Active: l.isActive ? 'TRUE' : 'FALSE',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pickup_Locations');

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `pickup_locations_export_${timestamp}.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  },

  async parseFile(
    file: File,
    existingLocations: AdminPurchaseLocation[],
    states: AdminState[]
  ): Promise<LocationImportSummary> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    const stateMap = new Map(states.map((s) => [s.code.toUpperCase(), s]));
    const locByCode = new Map(existingLocations.map((l) => [l.locationCode?.toUpperCase() || '', l]));
    const locByNameState = new Map(
      existingLocations.map((l) => [`${l.stateCode.toUpperCase()}|${l.name.trim().toUpperCase()}`, l])
    );

    const seenInFile = new Set<string>();
    const parsedRows: LocationImportRow[] = [];

    rawData.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const errors: string[] = [];

      const getVal = (patterns: string[]): string => {
        for (const p of patterns) {
          const key = Object.keys(row).find((k) => k.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === p);
          if (key && row[key] !== undefined && row[key] !== null) {
            return String(row[key]).trim();
          }
        }
        return '';
      };

      const name = getVal(['name', 'locationname', 'location']);
      const stateCode = getVal(['statecode', 'state']).toUpperCase();
      let locationCode = getVal(['locationcode']).toUpperCase();
      const city = getVal(['city']);
      const zipCode = getVal(['zipcode', 'zip', 'postalcode']);
      const auctionCompany = getVal(['auctioncompany', 'auction', 'company']);
      const address = getVal(['address', 'streetaddress']);
      const activeStr = getVal(['active', 'isactive']).toLowerCase();
      const isActive = activeStr === 'false' || activeStr === '0' || activeStr === 'no' ? false : true;

      if (!name) {
        errors.push('Location Name is required.');
      }
      if (!stateCode) {
        errors.push('State Code is required.');
      } else if (!stateMap.has(stateCode)) {
        errors.push(`State Code "${stateCode}" is not recognized.`);
      }

      if (!locationCode && name && stateCode) {
        locationCode = `${stateCode}-${name.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
      }

      const dedupeKey = locationCode || `${stateCode}|${name.toUpperCase()}`;
      let status: LocationImportRow['status'] = 'new';
      let matchedLocationId: string | undefined;

      if (errors.length > 0) {
        status = 'rejected';
      } else if (seenInFile.has(dedupeKey)) {
        status = 'duplicate';
        errors.push('Duplicate location within the uploaded file.');
      } else {
        seenInFile.add(dedupeKey);
        const existing =
          (locationCode ? locByCode.get(locationCode) : undefined) ||
          locByNameState.get(`${stateCode}|${name.toUpperCase()}`);

        if (existing) {
          matchedLocationId = existing.id;
          const isSame =
            existing.name === name &&
            existing.stateCode === stateCode &&
            (existing.city || '') === (city || '') &&
            (existing.zipCode || '') === (zipCode || '') &&
            (existing.auctionCompany || '') === (auctionCompany || '') &&
            existing.isActive === isActive;

          status = isSame ? 'unchanged' : 'updated';
        } else {
          status = 'new';
        }
      }

      parsedRows.push({
        rowNumber,
        locationCode: locationCode || undefined,
        name,
        stateCode,
        city: city || undefined,
        zipCode: zipCode || undefined,
        auctionCompany: auctionCompany || undefined,
        address: address || undefined,
        isActive,
        status,
        errors,
        matchedLocationId,
      });
    });

    return {
      total: parsedRows.length,
      newCount: parsedRows.filter((r) => r.status === 'new').length,
      updatedCount: parsedRows.filter((r) => r.status === 'updated').length,
      unchangedCount: parsedRows.filter((r) => r.status === 'unchanged').length,
      rejectedCount: parsedRows.filter((r) => r.status === 'rejected').length,
      duplicateCount: parsedRows.filter((r) => r.status === 'duplicate').length,
      rows: parsedRows,
    };
  },

  downloadErrorReport(rejectedRows: LocationImportRow[], format: 'csv' | 'xlsx'): void {
    const data = rejectedRows.map((r) => ({
      Row: r.rowNumber,
      Location_Code: r.locationCode || '',
      Name: r.name,
      State_Code: r.stateCode,
      City: r.city || '',
      Auction_Company: r.auctionCompany || '',
      Errors: r.errors.join(' | '),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Location_Errors');

    const filename = `location_errors_${new Date().toISOString().split('T')[0]}.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  },

  async commitImport(validRows: LocationImportRow[]): Promise<{ success: boolean; appliedCount: number }> {
    const importable = validRows.filter((r) => r.status === 'new' || r.status === 'updated');
    let appliedCount = 0;

    for (const r of importable) {
      if (r.matchedLocationId) {
        // Update existing location
        const { error } = await supabase
          .from('purchase_locations')
          .update({
            name: r.name,
            location_code: r.locationCode,
            state_code: r.stateCode,
            city: r.city || null,
            zip_code: r.zipCode || null,
            postal_code: r.zipCode || null,
            auction_company: r.auctionCompany || null,
            address: r.address || null,
            is_active: r.isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', r.matchedLocationId);

        if (!error) appliedCount++;
      } else {
        // Insert new location
        const { error } = await supabase.from('purchase_locations').insert({
          name: r.name,
          location_code: r.locationCode,
          state_code: r.stateCode,
          city: r.city || null,
          zip_code: r.zipCode || null,
          postal_code: r.zipCode || null,
          auction_company: r.auctionCompany || null,
          address: r.address || null,
          is_active: r.isActive,
          is_archived: false,
        });

        if (!error) appliedCount++;
      }
    }

    return { success: true, appliedCount };
  },
};
