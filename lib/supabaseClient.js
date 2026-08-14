import { createClient } from '@supabase/supabase-js';

const PLACEHOLDER_URL = 'http://127.0.0.1:54321';
const PLACEHOLDER_KEY = 'public-anon-key';

// Client-side (browser) Supabase client (anon key only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side (API route) Supabase client factory (service role key)
export function createServerSupabaseClient(useAnon = false) {
  if (useAnon) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;
    return createClient(url, anonKey);
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_KEY;
  return createClient(url, serviceKey);
}

// Do NOT export a service role client for client-side use!
