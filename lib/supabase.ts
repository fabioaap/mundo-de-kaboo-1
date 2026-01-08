import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------

// Get environment variables (Vite uses import.meta.env, not process.env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// Create a dummy client if not configured to prevent errors
// Use placeholder values that won't cause runtime errors
const safeUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
const safeKey = SUPABASE_ANON_KEY || 'placeholder-key';

if (!isSupabaseConfigured) {
  if (import.meta.env.DEV) {
    console.warn('⚠️ Supabase credentials are missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
    console.warn('⚠️ The app will run in fallback mode without Supabase functionality.');
  }
}

export const supabase = createClient(safeUrl, safeKey);