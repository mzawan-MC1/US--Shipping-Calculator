import type { VinDecodeResult } from '../types/calculator';

// ISO 3779 VIN: 17 characters, letters A-Z (excluding I, O, Q) and digits 0-9
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

export const vinService = {
  /**
   * Validates whether a VIN conforms to standard 17-character format without invalid chars (I, O, Q)
   */
  isValidVin(vin: string): boolean {
    if (!vin) return false;
    const clean = vin.trim().toUpperCase();
    return VIN_REGEX.test(clean);
  },

  /**
   * Sanitizes input into valid uppercase VIN candidate characters
   */
  sanitizeVin(rawVin: string): string {
    return rawVin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
  },

  /**
   * Decodes a 17-character VIN using the official NHTSA vPIC API
   */
  async decodeVin(rawVin: string): Promise<VinDecodeResult> {
    const vin = rawVin.trim().toUpperCase();

    if (!vin) {
      return {
        success: false,
        vin,
        errorMessage: 'VIN is required.',
      };
    }

    if (vin.length !== 17) {
      return {
        success: false,
        vin,
        errorMessage: `VIN must be exactly 17 characters (currently ${vin.length}).`,
      };
    }

    if (/[IOQ]/.test(vin)) {
      return {
        success: false,
        vin,
        errorMessage: 'VIN contains invalid letters (I, O, and Q are never used in standard 17-digit VINs).',
      };
    }

    if (!VIN_REGEX.test(vin)) {
      return {
        success: false,
        vin,
        errorMessage: 'VIN contains invalid characters. Only uppercase letters and numbers are allowed.',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          vin,
          errorMessage: `NHTSA service returned status ${response.status}. Please enter vehicle details manually.`,
        };
      }

      const json = await response.json();
      const results = json?.Results?.[0];

      if (!results) {
        return {
          success: false,
          vin,
          errorMessage: 'No decoding results returned for this VIN. Please enter details manually.',
        };
      }

      const errorCode = results.ErrorCode || '';
      const errorText = results.ErrorText || '';

      const make = results.Make?.trim() || undefined;
      const model = results.Model?.trim() || undefined;
      const rawYear = results.ModelYear?.trim();
      const parsedYear = rawYear ? parseInt(rawYear, 10) : undefined;
      const year =
        parsedYear && !isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 2
          ? parsedYear
          : undefined;

      const vehicleType = results.VehicleType?.trim() || undefined;
      const bodyClass = results.BodyClass?.trim() || undefined;
      const fuelType = results.FuelTypePrimary?.trim() || results.FuelTypeSecondary?.trim() || undefined;

      // Map vehicle category
      let suggestedCategoryId: string | undefined;
      const combinedType = `${vehicleType || ''} ${bodyClass || ''}`.toUpperCase();

      if (combinedType.includes('TRUCK') || combinedType.includes('PICKUP')) {
        suggestedCategoryId = 'pickup';
      } else if (
        combinedType.includes('SUV') ||
        combinedType.includes('SPORT UTILITY') ||
        combinedType.includes('MULTIPURPOSE')
      ) {
        suggestedCategoryId = 'suv';
      } else if (combinedType.includes('VAN') || combinedType.includes('MINIVAN')) {
        suggestedCategoryId = 'van';
      } else if (combinedType.includes('MOTORCYCLE') || combinedType.includes('BIKE')) {
        suggestedCategoryId = 'bike';
      } else if (
        combinedType.includes('PASSENGER CAR') ||
        combinedType.includes('SEDAN') ||
        combinedType.includes('COUPE')
      ) {
        suggestedCategoryId = 'sedan';
      }

      // Map powertrain
      let suggestedPowertrainId: string | undefined;
      const upperFuel = (fuelType || '').toUpperCase();
      if (upperFuel.includes('ELECTRIC') && !upperFuel.includes('HYBRID')) {
        suggestedPowertrainId = 'electric';
      } else if (upperFuel.includes('HYBRID') || upperFuel.includes('PLUG-IN')) {
        suggestedPowertrainId = 'hybrid';
      } else if (
        upperFuel.includes('GASOLINE') ||
        upperFuel.includes('PETROL') ||
        upperFuel.includes('DIESEL')
      ) {
        suggestedPowertrainId = 'petrol';
      }

      const hasUsableData = Boolean(make || model || year);

      if (!hasUsableData && errorCode && errorCode !== '0') {
        return {
          success: false,
          vin,
          errorCode,
          errorMessage: errorText || 'Unable to decode vehicle details from this VIN. Please enter details manually.',
          rawDetails: results,
        };
      }

      return {
        success: true,
        vin,
        year,
        make,
        model,
        vehicleType,
        bodyClass,
        fuelType,
        suggestedCategoryId,
        suggestedPowertrainId,
        errorCode,
        errorMessage: errorCode && errorCode !== '0' ? errorText : undefined,
        rawDetails: results,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.name === 'AbortError') {
        return {
          success: false,
          vin,
          errorMessage: 'VIN lookup timed out after 8 seconds. Please enter vehicle details manually.',
        };
      }

      return {
        success: false,
        vin,
        errorMessage: `Unable to reach vehicle decoding service (${error.message || 'Network error'}). Please enter vehicle details manually.`,
      };
    }
  },
};
