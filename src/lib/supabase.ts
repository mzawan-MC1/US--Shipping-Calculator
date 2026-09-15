import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured, isDemoMode } from './env';

if (!isSupabaseConfigured) {
  console.info(
    '[Supabase] Operating in DEMO MODE with typed mock services. To connect a live backend, provide valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.'
  );
}

// Single public browser client instance
export const supabase = isSupabaseConfigured
  ? createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!)
  : (null as unknown as ReturnType<typeof createClient>);

export { isDemoMode, isSupabaseConfigured };
