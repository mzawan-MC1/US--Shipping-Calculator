import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  VITE_SUPABASE_ANON_KEY: z.string().min(10).optional().or(z.literal('')),
  VITE_APP_MODE: z.enum(['demo', 'production']).default('demo'),
  VITE_WHATSAPP_NUMBER: z.string().default('971521234567'),
  VITE_COMPANY_PHONE: z.string().default('+971 52 123 4567'),
  VITE_COMPANY_EMAIL: z.string().email().default('info@fakheralamshipping.com'),
  VITE_COMPANY_ADDRESS: z.string().default('Industrial Area 2, Sharjah, UAE'),
});

const rawEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  VITE_APP_MODE: import.meta.env.VITE_APP_MODE || 'demo',
  VITE_WHATSAPP_NUMBER: import.meta.env.VITE_WHATSAPP_NUMBER || '971521234567',
  VITE_COMPANY_PHONE: import.meta.env.VITE_COMPANY_PHONE || '+971 52 123 4567',
  VITE_COMPANY_EMAIL: import.meta.env.VITE_COMPANY_EMAIL || 'info@fakheralamshipping.com',
  VITE_COMPANY_ADDRESS: import.meta.env.VITE_COMPANY_ADDRESS || 'Industrial Area 2, Sharjah, UAE',
};

export const env = envSchema.parse(rawEnv);

export const isSupabaseConfigured = Boolean(
  env.VITE_SUPABASE_URL &&
  env.VITE_SUPABASE_ANON_KEY &&
  !env.VITE_SUPABASE_URL.includes('placeholder') &&
  !env.VITE_SUPABASE_ANON_KEY.includes('placeholder')
);

export const isDemoMode = env.VITE_APP_MODE === 'demo' || !isSupabaseConfigured;
