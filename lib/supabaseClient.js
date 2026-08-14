import { createClient } from '@supabase/supabase-js';

// Client-side (browser) Supabase client (anon key only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side (API route) Supabase client factory (service role key)
// Pass 'true' to use anon key for user session operations, otherwise use service role key for privileged ops
export function createServerSupabaseClient(useAnon = false) {
  if (useAnon) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return createClient(url, anonKey);
  } else {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return createClient(url, serviceKey);
  }
}

// Do NOT export a service role client for client-side use!