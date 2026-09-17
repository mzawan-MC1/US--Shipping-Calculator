import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: 'USD' | 'AED' = 'USD'): string {
  if (currency === 'AED') {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return formatCurrency(amount, 'USD');
}

export function formatAED(amount: number): string {
  return formatCurrency(amount, 'AED');
}

export const USD_TO_AED_EXCHANGE_RATE = 3.6725;

export function convertUsdToAed(usd: number): number {
  return Math.round(usd * USD_TO_AED_EXCHANGE_RATE);
}

export function normalizePhone(rawPhone?: string, countryCode: string = 'ARE'): string {
  if (!rawPhone || !rawPhone.trim()) {
    return '';
  }

  // Strip all non-digits
  let digits = rawPhone.replace(/\D/g, '');

  // Strip international prefix '00'
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  const country = (countryCode || 'ARE').trim().toUpperCase();

  // UAE Normalization: covers 05XXXXXXXX, 5XXXXXXXX, 009715..., +9715..., 97105...
  if (
    ['ARE', 'AE', 'UAE'].includes(country) ||
    /^05\d{8}$/.test(digits) ||
    /^97105\d{8}$/.test(digits) ||
    /^5\d{8}$/.test(digits)
  ) {
    if (/^97105\d{8}$/.test(digits)) {
      // 971 + 05XXXXXXXX -> 9715XXXXXXXX
      digits = '971' + digits.substring(4);
    } else if (/^05\d{8}$/.test(digits)) {
      // 05XXXXXXXX (10 digits) -> 9715XXXXXXXX (12 digits)
      digits = '971' + digits.substring(1);
    } else if (/^5\d{8}$/.test(digits)) {
      // 5XXXXXXXX (9 digits) -> 9715XXXXXXXX (12 digits)
      digits = '971' + digits;
    } else if (/^0[234679]\d{7}$/.test(digits)) {
      // UAE landlines (02, 04, 06...) -> 971XXXXXXXX
      digits = '971' + digits.substring(1);
    }
  } else if (['USA', 'US', 'CAN', 'CA'].includes(country)) {
    if (digits.length === 10) {
      digits = '1' + digits;
    }
  }

  return digits;
}
