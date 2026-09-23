import { supabase, isSupabaseConfigured } from './supabase';

const ERAPOR_SESSION_KEY = 'sdit_erapor_teacher_session_v1';

export interface EraporTeacherSession {
  teacherId: string;
  teacherName: string;
  sessionToken?: string;
  authenticatedAt: number;
  expiresAt?: string;
}

interface TeacherPinRow {
  id: string;
  name: string;
  status: string;
  erapor_pin_hash: string | null;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function saveSession(session: EraporTeacherSession): void {
  if (!isBrowser()) return;

  try {
    sessionStorage.setItem(ERAPOR_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('[e-Rapor Auth] Gagal menyimpan session:', error);
  }
}

export function getActiveEraporSession(): EraporTeacherSession | null {
  if (!isBrowser()) return null;

  try {
    const raw = sessionStorage.getItem(ERAPOR_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed.teacherId !== 'string' || !parsed.teacherId.trim()) {
      return null;
    }

    return parsed as EraporTeacherSession;
  } catch (error) {
    console.warn('[e-Rapor Auth] Session tidak valid:', error);
    return null;
  }
}

export function clearEraporSession(): void {
  if (!isBrowser()) return;

  try {
    sessionStorage.removeItem(ERAPOR_SESSION_KEY);
  } catch (error) {
    console.warn('[e-Rapor Auth] Gagal menghapus session:', error);
  }
}

export async function getEraporPinStatus(teacherId: string): Promise<{
  success: boolean;
  hasPin: boolean;
  teacherName?: string;
  message?: string;
}> {
  if (!teacherId) {
    return {
      success: false,
      hasPin: false,
      message: 'Identitas guru tidak ditemukan.',
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      hasPin: false,
      message: 'Supabase belum dikonfigurasi. Tidak dapat memeriksa PIN e-Rapor.',
    };
  }

  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, status, erapor_pin_hash')
    .eq('id', teacherId)
    .maybeSingle<TeacherPinRow>();

  if (error) {
    console.error('[e-Rapor Auth] Gagal mengambil status PIN:', error);
    return {
      success: false,
      hasPin: false,
      message: error.message || 'Gagal memeriksa data PIN e-Rapor.',
    };
  }

  if (!data) {
    return {
      success: false,
      hasPin: false,
      message: 'Data guru tidak ditemukan.',
    };
  }

  if (data.status === 'blocked') {
    return {
      success: false,
      hasPin: false,
      teacherName: data.name,
      message: 'Akun guru ini sedang diblokir oleh Administrator.',
    };
  }

  return {
    success: true,
    hasPin: Boolean(data.erapor_pin_hash),
    teacherName: data.name,
  };
}

export async function setEraporPin(
  teacherId: string,
  pin: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  const cleanPin = String(pin || '').trim();

  if (!teacherId) {
    return {
      success: false,
      message: 'Identitas guru tidak ditemukan.',
    };
  }

  if (!cleanPin) {
    return {
      success: false,
      message: 'PIN wajib diisi.',
    };
  }

  if (cleanPin.length < 4) {
    return {
      success: false,
      message: 'PIN minimal 4 karakter.',
    };
  }

  if (cleanPin.length > 20) {
    return {
      success: false,
      message: 'PIN maksimal 20 karakter.',
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase belum dikonfigurasi. PIN tidak dapat disimpan.',
    };
  }

  const pinHash = await hashPin(cleanPin);

  // 1. Coba via Security Definer RPC erapor_set_teacher_pin
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('erapor_set_teacher_pin', {
      p_teacher_id: teacherId,
      p_pin_hash: pinHash,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object') {
      const res = rpcData as { success: boolean; message: string };
      if (res.success) {
        return {
          success: true,
          message: res.message || 'PIN e-Rapor berhasil disimpan.',
        };
      }
    }
  } catch {
    // Fallback jika RPC belum di-apply
  }

  // 2. Direct update fallback
  const { error } = await supabase
    .from('teachers')
    .update({
      erapor_pin_hash: pinHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', teacherId);

  if (error) {
    console.error('[e-Rapor Auth] Gagal menyimpan PIN:', error);
    return {
      success: false,
      message: error.message || 'Gagal menyimpan PIN e-Rapor.',
    };
  }

  return {
    success: true,
    message: 'PIN e-Rapor berhasil disimpan.',
  };
}

export async function loginErapor(
  teacherId: string,
  inputPin: string,
): Promise<{
  success: boolean;
  message: string;
  session?: EraporTeacherSession;
}> {
  const cleanPin = String(inputPin || '').trim();

  if (!teacherId) {
    return {
      success: false,
      message: 'Identitas guru tidak ditemukan.',
    };
  }

  if (!cleanPin) {
    return {
      success: false,
      message: 'Masukkan PIN e-Rapor terlebih dahulu.',
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase belum dikonfigurasi. Tidak dapat login e-Rapor.',
    };
  }

  const inputHash = await hashPin(cleanPin);

  // 1. Coba login melalui Server-Side RPC (Trusted Session Generator)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('erapor_teacher_login', {
      p_teacher_id: teacherId,
      p_pin_hash: inputHash,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object') {
      const res = rpcData as {
        success: boolean;
        message: string;
        session_token?: string;
        teacher_id?: string;
        teacher_name?: string;
        expires_at?: string;
      };

      if (res.success && res.session_token) {
        const session: EraporTeacherSession = {
          teacherId: res.teacher_id || teacherId,
          teacherName: res.teacher_name || 'Guru',
          sessionToken: res.session_token,
          authenticatedAt: Date.now(),
          expiresAt: res.expires_at,
        };

        saveSession(session);

        return {
          success: true,
          message: res.message || 'Login e-Rapor berhasil.',
          session,
        };
      } else if (!res.success) {
        return {
          success: false,
          message: res.message || 'PIN e-Rapor tidak sesuai.',
        };
      }
    }
  } catch (rpcErr) {
    console.warn('[e-Rapor Auth] RPC login notice:', rpcErr);
  }

  // 2. Direct validation fallback
  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, status, erapor_pin_hash')
    .eq('id', teacherId)
    .maybeSingle<TeacherPinRow>();

  if (error) {
    console.error('[e-Rapor Auth] Gagal mengambil data guru:', error);
    return {
      success: false,
      message: error.message || 'Gagal memeriksa akun guru.',
    };
  }

  if (!data) {
    return {
      success: false,
      message: 'Data guru tidak ditemukan.',
    };
  }

  if (data.status === 'blocked') {
    return {
      success: false,
      message: 'Akun guru ini sedang diblokir oleh Administrator.',
    };
  }

  if (!data.erapor_pin_hash) {
    return {
      success: false,
      message: 'Guru ini belum memiliki PIN e-Rapor. Silakan buat PIN pribadi terlebih dahulu.',
    };
  }

  if (inputHash !== data.erapor_pin_hash) {
    return {
      success: false,
      message: 'PIN e-Rapor tidak sesuai.',
    };
  }

  const session: EraporTeacherSession = {
    teacherId: data.id,
    teacherName: data.name,
    authenticatedAt: Date.now(),
  };

  saveSession(session);

  return {
    success: true,
    message: 'Login e-Rapor berhasil.',
    session,
  };
}

export async function resetTeacherEraporPin(
  teacherId: string
): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Koneksi database Supabase belum terkonfigurasi.',
    };
  }

  try {
    // 1. Invalidate active sessions in erapor_teacher_sessions
    await supabase
      .from('erapor_teacher_sessions')
      .update({ is_active: false })
      .eq('teacher_id', teacherId);

    // 2. Clear erapor_pin_hash in teachers table
    const { error } = await supabase
      .from('teachers')
      .update({
        erapor_pin_hash: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teacherId);

    if (error) {
      console.error('[e-Rapor Admin] Error resetting PIN:', error);
      return {
        success: false,
        message: `Gagal mereset PIN e-Rapor: ${error.message}`,
      };
    }

    return {
      success: true,
      message: 'PIN e-Rapor berhasil di-reset. Guru akan diminta membuat PIN baru saat membuka e-Rapor berikutnya.',
    };
  } catch (err: any) {
    console.error('[e-Rapor Admin] Exception resetting PIN:', err);
    return {
      success: false,
      message: err?.message || 'Terjadi kesalahan saat mereset PIN e-Rapor.',
    };
  }
}

export async function logoutErapor(): Promise<void> {
  const current = getActiveEraporSession();
  if (current?.sessionToken && isSupabaseConfigured()) {
    try {
      await supabase.rpc('erapor_teacher_logout', {
        p_session_token: current.sessionToken,
      });
    } catch {
      // Abaikan error saat network offline
    }
  }
  clearEraporSession();
}
