import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const hasSupabaseConfig =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey);

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