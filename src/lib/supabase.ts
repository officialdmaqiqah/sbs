import { createClient } from '@supabase/supabase-js';
import { environment } from '../config/environment';

export function getSupabaseClient() {
  if (environment.dataProvider === 'supabase') {
    if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
      throw new Error(
        'Supabase configuration is missing. Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
      );
    }
  }

  // Create a dummy client or actual client depending on env, but we shouldn't fail 
  // on init if provider is local. We'll provide dummy values if env is empty to avoid 
  // createClient throwing an error immediately, but we won't use this client anyway.
  const url = environment.supabaseUrl || 'http://localhost:54321';
  const key = environment.supabaseAnonKey || 'dummy-key';

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = getSupabaseClient();
