import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'sdit_supabase_custom_url_v1';
const STORAGE_KEY_KEY = 'sdit_supabase_custom_anon_key_v1';

export const isPlaceholderUrl = (url: string): boolean => {
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

export const isPlaceholderKey = (key: string): boolean => {
  if (!key) return true;
  const lower = key.toLowerCase();
  return (
    lower.includes('your_supabase') ||
    lower.includes('placeholder') ||
    lower.includes('your-supabase') ||
    lower === 'placeholder-anon-key'
  );
};

/**
 * Mendapatkan konfigurasi Supabase saat ini (dari environment atau localStorage)
 */
export function getStoredSupabaseConfig(): { url: string; anonKey: string; source: 'env' | 'storage' | 'none' } {
  const envUrl = String((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || process.env?.VITE_SUPABASE_URL || '').trim();
  const envKey = String((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || process.env?.VITE_SUPABASE_ANON_KEY || '').trim();

  let localUrl = '';
  let localKey = '';
  try {
    localUrl = (localStorage.getItem(STORAGE_URL_KEY) || '').trim();
    localKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();
  } catch (e) {
    // ignore
  }

  // Prioritas 1: localStorage yang diinputkan pengguna via UI
  if (!isPlaceholderUrl(localUrl) && !isPlaceholderKey(localKey)) {
    return { url: localUrl, anonKey: localKey, source: 'storage' };
  }

  // Prioritas 2: Environment variables dari .env
  if (!isPlaceholderUrl(envUrl) && !isPlaceholderKey(envKey)) {
    return { url: envUrl, anonKey: envKey, source: 'env' };
  }

  // Fallback
  return {
    url: localUrl || envUrl || '',
    anonKey: localKey || envKey || '',
    source: 'none',
  };
}

/**
 * Menyimpan konfigurasi Supabase langsung dari UI aplikasi
 */
export function saveStoredSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  } catch (e) {
    console.error('Failed to save supabase config to storage:', e);
  }
  reinitSupabaseClient();
}

/**
 * Menghapus konfigurasi custom Supabase dari localStorage
 */
export function clearStoredSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_KEY_KEY);
  } catch (e) {
    // ignore
  }
  reinitSupabaseClient();
}

export const isSupabaseConfigured = (): boolean => {
  const cfg = getStoredSupabaseConfig();
  return !isPlaceholderUrl(cfg.url) && !isPlaceholderKey(cfg.anonKey);
};

function createInternalClient(): SupabaseClient {
  const { url, anonKey } = getStoredSupabaseConfig();
  return createClient(
    url || 'https://placeholder.supabase.co',
    anonKey || 'placeholder-anon-key',
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
}

let activeClientInstance: SupabaseClient = createInternalClient();

export function reinitSupabaseClient(): SupabaseClient {
  activeClientInstance = createInternalClient();
  return activeClientInstance;
}

/**
 * Dynamic Proxy Supabase Client
 * Memastikan setiap pemanggilan supabase.from(...) selalu merujuk ke instance client aktif
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (activeClientInstance as any)[prop];
  },
});

/**
 * Menguji koneksi langsung ke Supabase dan memverifikasi tabel analysis_submissions
 */
export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{ success: boolean; message: string; tableFound?: boolean; latencyMs?: number }> {
  const start = Date.now();
  try {
    const cfg = getStoredSupabaseConfig();
    const url = (customUrl !== undefined ? customUrl : cfg.url).trim();
    const anonKey = (customKey !== undefined ? customKey : cfg.anonKey).trim();

    if (!url || isPlaceholderUrl(url)) {
      return {
        success: false,
        message: 'URL Project Supabase belum diisi atau format tidak valid (harus diawali https://xxxx.supabase.co).',
      };
    }

    if (!anonKey || isPlaceholderKey(anonKey)) {
      return {
        success: false,
        message: 'API Key (Anon Key) Supabase belum diisi atau masih berupa placeholder.',
      };
    }

    const testClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Uji koneksi ke tabel analysis_submissions
    const { data: _data, error } = await testClient
      .from('analysis_submissions')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Date.now() - start;

    if (error) {
      const errMsg = error.message.toLowerCase();
      // Error jika tabel belum dibuat di SQL Editor
      if (
        error.code === '42P01' ||
        errMsg.includes('relation') ||
        errMsg.includes('not exist') ||
        errMsg.includes('does not exist')
      ) {
        return {
          success: true,
          tableFound: false,
          latencyMs,
          message: 'Koneksi ke Supabase BERHASIL! Namun tabel "analysis_submissions" belum dibuat di SQL Editor.',
        };
      }
      return {
        success: false,
        latencyMs,
        message: `Gagal terhubung ke Supabase (${error.code || 'ERR'}): ${error.message}`,
      };
    }

    return {
      success: true,
      tableFound: true,
      latencyMs,
      message: `Koneksi Supabase BERHASIL & Siap Digunakan! Respon server: ${latencyMs}ms.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Kesalahan koneksi jaringan: ${err?.message || 'Server Supabase tidak dapat dijangkau.'}`,
    };
  }
}

export default supabase;
