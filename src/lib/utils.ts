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

export const USD_TO_AED_EXCHANGE_RATE = 3.6725;

export function convertUsdToAed(usd: number): number {
  return Math.round(usd * USD_TO_AED_EXCHANGE_RATE);
}
