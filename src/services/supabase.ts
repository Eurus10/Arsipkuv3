import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = String((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || process.env?.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = String((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || process.env?.VITE_SUPABASE_ANON_KEY || '').trim();

const isPlaceholderUrl = (url: string): boolean => {
  if (!url || !url.startsWith('https://')) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('your_project') ||
    lower.includes('placeholder') ||
    lower.includes('example.com') ||
    lower.includes('your-project') ||
    lower === 'https://placeholder.supabase.co'
  );
};

const isPlaceholderKey = (key: string): boolean => {
  if (!key) return true;
  const lower = key.toLowerCase();
  return (
    lower.includes('your_supabase') ||
    lower.includes('placeholder') ||
    lower.includes('your-supabase') ||
    lower === 'placeholder-anon-key'
  );
};

const hasSupabaseConfig =
  !isPlaceholderUrl(supabaseUrl) &&
  !isPlaceholderKey(supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum tersedia. ' +
    'Fitur database akademik akan menggunakan fallback lokal jika tersedia.'
  );
}

/**
 * Supabase client khusus untuk DATA AKADEMIK.
 *
 * Jangan gunakan client ini untuk menggantikan Firebase
 * pada modul arsip, token, branding, tracking soal, dll.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export const isSupabaseConfigured = (): boolean => {
  return hasSupabaseConfig;
};

export default supabase;