import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured, isDemoMode, supabasePublishableKey } from './env';
import type { Database } from '../types/database';

if (!isSupabaseConfigured) {
  console.info(
    '[Supabase] Operating in DEMO MODE with typed fallback mock services. Provide valid VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local to use the live backend.'
  );
}

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(env.VITE_SUPABASE_URL!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (null as unknown as SupabaseClient<Database>);

export { isDemoMode, isSupabaseConfigured };
