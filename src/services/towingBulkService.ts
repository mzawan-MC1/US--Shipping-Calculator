import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { AdminTowingRate, AdminPurchaseLocation, AdminState } from './adminService';

export interface TowingRateImportRow {
  rowNumber: number;
  stateCode: string;
  locationName: string;
  locationCode?: string;
  portCode: string;
  portName?: string;
  rateType: 'fixed' | 'range';
  fixedAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  isActive: boolean;
  status: 'new' | 'updated' | 'unchanged' | 'rejected' | 'duplicate';
  errors: string[];
  matchedLocationId?: string;
  matchedPortId?: string;
  matchedRateId?: string;
  isNewLocation?: boolean;
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
        Location_Name: 'Copart Newark',
        Port_Code: 'USNWK',
        Pricing_Mode: 'fixed',
        Fixed_Price: 120,
        Min_Price: '',
        Max_Price: '',
        Active: 'TRUE',
      },
      {
        State_Code: 'GA',
        Location_Name: 'IAAI Savannah North',
        Port_Code: 'USSAV',
        Pricing_Mode: 'range',
        Fixed_Price: '',
        Min_Price: 200,
        Max_Price: 250,
        Active: 'TRUE',
      },
      {
        State_Code: 'TX',
        Location_Name: 'Copart Dallas South',
        Port_Code: 'USHOU',
        Pricing_Mode: 'fixed',
        Fixed_Price: 180,
        Min_Price: '',
        Max_Price: '',
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
      Location_Name: r.locationName || (r.originLocation ? r.originLocation.split(',')[0].trim() : ''),
      Port_Code: r.loadingPortCode || '',
      Pricing_Mode: r.rateType,
      Fixed_Price: r.rateType === 'fixed' ? r.fixedAmount : '',
      Min_Price: r.rateType === 'range' ? r.minAmount : '',
      Max_Price: r.rateType === 'range' ? r.maxAmount : '',
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
    const locByNameState = new Map(
      locations.map((l) => [`${l.stateCode.toUpperCase()}|${l.name.trim().toUpperCase()}`, l])
    );
    const portByCode = new Map(ports.map((p) => [p.code.toUpperCase(), p]));
    const portByName = new Map(ports.map((p) => [p.name.toUpperCase(), p]));

    const existingRateKeyMap = new Map(
      existingRates.map((r) => [`${r.purchaseLocationId}|${r.loadingPortId}`, r])
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
      const locationName = getVal(['locationname', 'location', 'originlocation', 'name']);
      const portInput = getVal(['portcode', 'port', 'loadingport']).toUpperCase();
      const pricingModeInput = getVal(['pricingmode', 'ratetype', 'mode']).toLowerCase();
      const rateType: 'fixed' | 'range' = pricingModeInput === 'range' ? 'range' : 'fixed';

      const fixedPriceStr = getVal(['fixedprice', 'fixedamount', 'price', 'rate']);
      const minPriceStr = getVal(['minprice', 'minamount']);
      const maxPriceStr = getVal(['maxprice', 'maxamount']);

      const fixedAmount = fixedPriceStr ? parseFloat(fixedPriceStr) : undefined;
      const minAmount = minPriceStr ? parseFloat(minPriceStr) : undefined;
      const maxAmount = maxPriceStr ? parseFloat(maxPriceStr) : undefined;

      const activeStr = getVal(['active', 'isactive']).toLowerCase();
      const isActive = activeStr === 'false' || activeStr === '0' || activeStr === 'no' ? false : true;

      // Validations
      if (!stateCode) {
        errors.push('State code is required.');
      } else if (!stateMap.has(stateCode)) {
        errors.push(`State code "${stateCode}" does not exist in known states.`);
      }

      if (!locationName) {
        errors.push('Location name is required.');
      }

      // Match Location
      let matchedLocation: AdminPurchaseLocation | undefined;
      let isNewLocation = false;
      if (stateCode && locationName) {
        matchedLocation = locByNameState.get(`${stateCode}|${locationName.toUpperCase()}`);
        if (!matchedLocation) {
          isNewLocation = true;
        }
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

      // Check duplicates in file (deduplicate by State_Code | Location_Name | Port_Code)
      const dedupeKey = `${stateCode}|${locationName.toUpperCase()}|${matchedPort?.code || portInput}`;
      let status: TowingRateImportRow['status'] = 'new';
      let matchedRateId: string | undefined;

      if (errors.length > 0) {
        status = 'rejected';
      } else if (seenInFile.has(dedupeKey)) {
        status = 'duplicate';
        errors.push('Duplicate entry for this location and loading port within the uploaded file.');
      } else {
        seenInFile.add(dedupeKey);

        if (matchedLocation && matchedPort) {
          const existingRate = existingRateKeyMap.get(`${matchedLocation.id}|${matchedPort.id}`);
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
        } else {
          status = 'new';
        }
      }

      parsedRows.push({
        rowNumber,
        stateCode,
        locationName: matchedLocation?.name || locationName,
        locationCode: matchedLocation?.locationCode || undefined,
        portCode: matchedPort?.code || portInput,
        portName: matchedPort?.name,
        rateType,
        fixedAmount,
        minAmount,
        maxAmount,
        isActive,
        status,
        errors,
        matchedLocationId: matchedLocation?.id,
        matchedPortId: matchedPort?.id,
        matchedRateId,
        isNewLocation,
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
      Location_Name: r.locationName,
      Port_Code: r.portCode,
      Pricing_Mode: r.rateType,
      Fixed_Price: r.rateType === 'fixed' ? r.fixedAmount ?? '' : '',
      Min_Price: r.rateType === 'range' ? r.minAmount ?? '' : '',
      Max_Price: r.rateType === 'range' ? r.maxAmount ?? '' : '',
      Active: r.isActive ? 'TRUE' : 'FALSE',
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

    // Cache of newly created locations during this import batch
    const createdLocationMap = new Map<string, string>(); // "STATE|NAME" -> location_id

    for (const r of importable) {
      if (!r.matchedPortId) continue;

      let locationId = r.matchedLocationId;

      // Auto-create location if it does not exist
      if (!locationId) {
        const cacheKey = `${r.stateCode.toUpperCase()}|${r.locationName.trim().toUpperCase()}`;
        if (createdLocationMap.has(cacheKey)) {
          locationId = createdLocationMap.get(cacheKey)!;
        } else {
          // Auto-generate stable location_code (e.g. NJ-NEWARK-A1B2)
          const nameSlug =
            r.locationName
              .trim()
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .substring(0, 8) || 'LOC';
          const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
          const autoLocationCode = `${r.stateCode.toUpperCase()}-${nameSlug}-${randomSuffix}`;

          const { data: createdLoc, error: locErr } = await supabase
            .from('purchase_locations')
            .insert({
              name: r.locationName.trim(),
              state_code: r.stateCode.toUpperCase(),
              location_code: autoLocationCode,
              is_active: true,
            })
            .select('id')
            .single();

          if (locErr || !createdLoc) {
            console.error('Failed to auto-create location:', locErr);
            continue;
          }

          locationId = createdLoc.id;
          createdLocationMap.set(cacheKey, locationId);
        }
      }

      if (!locationId) continue;

      if (r.matchedRateId) {
        // Update existing rate
        const { error } = await supabase
          .from('towing_rates')
          .update({
            rate_type: r.rateType,
            fixed_amount: r.rateType === 'fixed' ? r.fixedAmount : null,
            min_amount: r.rateType === 'range' ? r.minAmount : null,
            max_amount: r.rateType === 'range' ? r.maxAmount : null,
            vehicle_category_id: null,
            vehicle_condition_id: null,
            is_active: r.isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', r.matchedRateId);

        if (!error) appliedCount++;
      } else {
        // Insert new rate
        const { error } = await supabase.from('towing_rates').insert({
          purchase_location_id: locationId,
          loading_port_id: r.matchedPortId,
          vehicle_category_id: null,
          vehicle_condition_id: null,
          rate_type: r.rateType,
          fixed_amount: r.rateType === 'fixed' ? r.fixedAmount : null,
          min_amount: r.rateType === 'range' ? r.minAmount : null,
          max_amount: r.rateType === 'range' ? r.maxAmount : null,
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
        State_Code: 'NJ',
        Name: 'Copart Northgate',
      },
      {
        State_Code: 'NJ',
        Name: 'IAA Trenton',
      },
      {
        State_Code: 'GA',
        Name: 'Copart Atlanta South',
      },
      {
        State_Code: 'TX',
        Name: 'Copart Dallas South',
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
      State_Code: l.stateCode,
      Name: l.name,
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

      if (!name) {
        errors.push('Location Name is required.');
      }
      if (!stateCode) {
        errors.push('State Code is required.');
      } else if (!stateMap.has(stateCode)) {
        errors.push(`State Code "${stateCode}" is not recognized.`);
      }

      const dedupeKey = `${stateCode}|${name.toUpperCase()}`;
      let status: LocationImportRow['status'] = 'new';
      let matchedLocationId: string | undefined;

      if (errors.length > 0) {
        status = 'rejected';
      } else if (seenInFile.has(dedupeKey)) {
        status = 'duplicate';
        errors.push('Duplicate location within the uploaded file.');
      } else {
        seenInFile.add(dedupeKey);
        const existing = locByNameState.get(dedupeKey);

        if (existing) {
          matchedLocationId = existing.id;
          status = 'duplicate';
          errors.push('Location already exists in this state (duplicate, skipped).');
        } else {
          status = 'new';
        }
      }

      parsedRows.push({
        rowNumber,
        name,
        stateCode,
        isActive: true,
        status,
        errors,
        matchedLocationId,
      });
    });

    return {
      total: parsedRows.length,
      newCount: parsedRows.filter((r) => r.status === 'new').length,
      duplicateCount: parsedRows.filter((r) => r.status === 'duplicate').length,
      rejectedCount: parsedRows.filter((r) => r.status === 'rejected').length,
      updatedCount: 0,
      unchangedCount: 0,
      rows: parsedRows,
    };
  },

  downloadErrorReport(rejectedRows: LocationImportRow[], format: 'csv' | 'xlsx'): void {
    const data = rejectedRows.map((r) => ({
      Row: r.rowNumber,
      State_Code: r.stateCode,
      Name: r.name,
      Errors: r.errors.join(' | '),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Location_Errors');

    const filename = `location_errors_${new Date().toISOString().split('T')[0]}.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  },

  async commitImport(validRows: LocationImportRow[]): Promise<{ success: boolean; appliedCount: number }> {
    const importable = validRows.filter((r) => r.status === 'new');
    let appliedCount = 0;

    for (const r of importable) {
      const cleanName = r.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const locationCode = `${r.stateCode}-${cleanName || 'LOC'}-${randomPart}`;

      const { error } = await supabase.from('purchase_locations').insert({
        name: r.name.trim(),
        location_code: locationCode,
        state_code: r.stateCode,
        city: null,
        zip_code: null,
        postal_code: null,
        auction_company: null,
        address: null,
        is_active: true,
        is_archived: false,
      });

      if (!error) appliedCount++;
    }

    return { success: true, appliedCount };
  },
};
