import { supabase, isSupabaseConfigured } from './supabase';
import { TeacherUser, TeacherDeviceSession } from '../types';
import {
  getOrGenerateDeviceId,
  getDeviceFriendlyName,
} from './tokenAuthService';

const TEACHERS_TABLE = 'teachers';
const TEACHER_ALIASES_TABLE = 'teacher_login_aliases';
const CURRENT_TEACHER_KEY = 'sdit_active_teacher_session_v1';
const LOCAL_TEACHERS_CACHE_KEY = 'sdit_local_teachers_whitelist_v1';

/**
 * ============================================================
 * TYPES / HELPERS
 * ============================================================
 */

type TeacherRow = {
  id: string;
  name: string;
  normalized_name: string;
  role_title: string;
  status: 'active' | 'blocked' | string;
  max_devices: number;
  active_sessions: unknown;
  last_login_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type TeacherLoginAliasRow = {
  id?: string;
  teacher_id: string;
  alias: string;
  normalized_alias: string;
  is_primary?: boolean;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function saveTeacherCache(list: TeacherUser[]): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(
      LOCAL_TEACHERS_CACHE_KEY,
      JSON.stringify(list)
    );
  } catch {
    // Cache bukan sumber kebenaran.
  }
}

function readTeacherCache(): TeacherUser[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(LOCAL_TEACHERS_CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapTeacherRow(row: TeacherRow): TeacherUser {
  const sessions: TeacherDeviceSession[] = Array.isArray(row.active_sessions)
    ? (row.active_sessions as TeacherDeviceSession[])
    : [];

  return {
    id: row.id,
    name: row.name || 'Guru',
    normalizedName:
      row.normalized_name || normalizeTeacherName(row.name || ''),
    roleTitle: row.role_title || '',
    status: row.status === 'blocked' ? 'blocked' : 'active',
    maxDevices:
      typeof row.max_devices === 'number' && row.max_devices > 0
        ? row.max_devices
        : 2,
    activeSessions: sessions,
    lastLoginAt: row.last_login_at || '',
    createdAt: row.created_at || new Date().toISOString(),
    note: row.note || '',
    loginAliases: [],
  };
}

function normalizeLoginAlias(rawAlias: string): string {
  return normalizeTeacherName(rawAlias);
}

function sanitizeLoginAliases(aliases: unknown): string[] {
  if (!Array.isArray(aliases)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of aliases) {
    if (typeof raw !== 'string') continue;

    const alias = raw.trim().replace(/\\s+/g, ' ');
    const normalized = normalizeLoginAlias(alias);

    if (!alias || !normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(alias);
  }

  return result;
}

async function fetchTeacherAliases(
  teacherIds: string[]
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const ids = Array.from(new Set(teacherIds.filter(Boolean)));

  if (!isSupabaseConfigured() || ids.length === 0) {
    return result;
  }

  try {
    const { data, error } = await supabase
      .from(TEACHER_ALIASES_TABLE)
      .select(
        'teacher_id, alias, normalized_alias, is_primary, active'
      )
      .in('teacher_id', ids)
      .eq('active', true)
      .order('is_primary', { ascending: false })
      .order('alias', { ascending: true });

    if (error) throw error;

    for (const row of (data || []) as TeacherLoginAliasRow[]) {
      if (!row.teacher_id || !row.alias) continue;

      const current = result.get(row.teacher_id) || [];
      const normalized =
        row.normalized_alias || normalizeLoginAlias(row.alias);

      if (
        !normalized ||
        current.some(
          (alias) => normalizeLoginAlias(alias) === normalized
        )
      ) {
        continue;
      }

      current.push(row.alias.trim());
      result.set(row.teacher_id, current);
    }
  } catch (error) {
    console.warn(
      '[Supabase] Gagal memuat alias login guru:',
      error
    );
  }

  return result;
}

async function attachLoginAliases(
  teachers: TeacherUser[]
): Promise<TeacherUser[]> {
  if (teachers.length === 0) return teachers;

  const aliasesByTeacher = await fetchTeacherAliases(
    teachers.map((teacher) => teacher.id)
  );

  return teachers.map((teacher) => ({
    ...teacher,
    loginAliases: aliasesByTeacher.get(teacher.id) || teacher.loginAliases || [],
  }));
}

/**
 * Menyimpan alias login untuk satu guru.
 * normalized_alias harus UNIQUE secara global di Supabase.
 */
export async function setTeacherLoginAliases(
  teacherId: string,
  aliases: string[]
): Promise<string[]> {
  if (!teacherId) {
    throw new Error('Teacher ID wajib diisi.');
  }

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase belum dikonfigurasi. Alias login tidak dapat disimpan.'
    );
  }

  const cleanAliases = sanitizeLoginAliases(aliases);
  const normalizedAliases = cleanAliases.map(normalizeLoginAlias);

  if (normalizedAliases.length > 0) {
    const { data: conflicts, error: conflictError } = await supabase
      .from(TEACHER_ALIASES_TABLE)
      .select('teacher_id, alias, normalized_alias, active')
      .in('normalized_alias', normalizedAliases)
      .eq('active', true);

    if (conflictError) {
      throw new Error(
        `Gagal memeriksa alias login: ${conflictError.message}`
      );
    }

    const foreignConflict = ((conflicts || []) as TeacherLoginAliasRow[]).find(
      (row) => row.teacher_id !== teacherId
    );

    if (foreignConflict) {
      throw new Error(
        `Alias "${foreignConflict.alias}" sudah digunakan oleh guru lain.`
      );
    }
  }

  const { error: deactivateError } = await supabase
    .from(TEACHER_ALIASES_TABLE)
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('teacher_id', teacherId);

  if (deactivateError) {
    throw new Error(
      `Gagal memperbarui alias lama: ${deactivateError.message}`
    );
  }

  if (cleanAliases.length > 0) {
    const rows = cleanAliases.map((alias, index) => ({
      teacher_id: teacherId,
      alias,
      normalized_alias: normalizedAliases[index],
      is_primary: index === 0,
      active: true,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from(TEACHER_ALIASES_TABLE)
      .upsert(rows, { onConflict: 'normalized_alias' });

    if (upsertError) {
      throw new Error(
        `Gagal menyimpan alias login: ${upsertError.message}`
      );
    }
  }

  const currentList = await fetchAllTeachers();
  const updatedList = currentList.map((teacher) =>
    teacher.id === teacherId
      ? { ...teacher, loginAliases: cleanAliases }
      : teacher
  );
  saveTeacherCache(updatedList);

  const activeSession = getActiveTeacherSession();
  if (activeSession?.id === teacherId) {
    saveActiveTeacherSession({
      ...activeSession,
      loginAliases: cleanAliases,
    });
  }

  return cleanAliases;
}

function teacherToRow(teacher: TeacherUser): TeacherRow {
  return {
    id: teacher.id,
    name: teacher.name,
    normalized_name:
      teacher.normalizedName || normalizeTeacherName(teacher.name),
    role_title: teacher.roleTitle || 'Guru SDIT AL FIKRI',
    status: teacher.status === 'blocked' ? 'blocked' : 'active',
    max_devices: teacher.maxDevices || 2,
    active_sessions: Array.isArray(teacher.activeSessions)
      ? teacher.activeSessions
      : [],
    last_login_at: teacher.lastLoginAt || null,
    note: teacher.note || '',
    created_at: teacher.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function isCurrentDeviceAuthorized(
  serverSessions: TeacherDeviceSession[]
): boolean {
  const myDeviceId = getOrGenerateDeviceId();

  return serverSessions.some(
    (session) => session?.deviceId === myDeviceId
  );
}

function clearLocalTeacherSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(CURRENT_TEACHER_KEY);
}

function revokeLocalTeacherSession(message: string): {
  isValid: false;
  message: string;
} {
  clearLocalTeacherSession();

  return {
    isValid: false,
    message,
  };
}

/**
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

export function normalizeTeacherName(rawName: string): string {
  if (!rawName) return '';

  let clean = rawName
    .toLowerCase()
    .replace(/[.,\-_/\\()]/g, ' ')
    .trim();

  const prefixes = [
    /^ibu\s+/,
    /^bu\s+/,
    /^bapak\s+/,
    /^bpk\s+/,
    /^pak\s+/,
    /^ms\s+/,
    /^miss\s+/,
    /^mr\s+/,
    /^mister\s+/,
    /^ustadz\s+/,
    /^ustadzah\s+/,
    /^ustz\s+/,
    /^ust\s+/,
    /^hj\s+/,
    /^hajah\s+/,
    /^haji\s+/,
    /^guru\s+/,
  ];

  let changed = true;

  while (changed) {
    changed = false;

    for (const prefix of prefixes) {
      if (prefix.test(clean)) {
        clean = clean.replace(prefix, '').trim();
        changed = true;
      }
    }
  }

  return clean.replace(/\s+/g, ' ');
}

export function generateTeacherId(name: string): string {
  const norm = normalizeTeacherName(name);
  const slug = norm.replace(/[^a-z0-9]/g, '-');

  return `TCH-${slug || Date.now().toString(36)}`;
}

/**
 * ============================================================
 * DEFAULT TEACHERS
 * ============================================================
 */

export const DEFAULT_TEACHERS_DATA: Omit<
  TeacherUser,
  'id' | 'createdAt'
>[] = [
  {
    name: 'Bu Yeni',
    normalizedName: 'yeni',
    roleTitle: 'Wali Kelas 1A',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Okta',
    normalizedName: 'okta',
    roleTitle: 'Wali Kelas 1B',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Tati',
    normalizedName: 'tati',
    roleTitle: 'Wali Kelas 2A',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Ana',
    normalizedName: 'ana',
    roleTitle: 'Wali Kelas 2B',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Fida',
    normalizedName: 'fida',
    roleTitle: 'Wali Kelas 2C',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Siti',
    normalizedName: 'siti',
    roleTitle: 'Wali Kelas 3A',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Tri',
    normalizedName: 'tri',
    roleTitle: 'Wali Kelas 3B',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Andin',
    normalizedName: 'andin',
    roleTitle: 'Wali Kelas 3C',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Teti',
    normalizedName: 'teti',
    roleTitle: 'Wali Kelas 4A',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Ifah',
    normalizedName: 'ifah',
    roleTitle: 'Wali Kelas 4B',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Itoh',
    normalizedName: 'itoh',
    roleTitle: 'Wali Kelas 5A',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Nadiya',
    normalizedName: 'nadiya',
    roleTitle: 'Wali Kelas 5B',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Mae',
    normalizedName: 'mae',
    roleTitle: 'Wali Kelas 6A',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Rini',
    normalizedName: 'rini',
    roleTitle: 'Wali Kelas 6B',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu Hj. Nedya',
    normalizedName: 'nedya',
    roleTitle: 'Guru B. Arab / SKI',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Ms. Wiwit',
    normalizedName: 'wiwit',
    roleTitle: 'Guru B. Inggris',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Pak Megi',
    normalizedName: 'megi',
    roleTitle: 'Guru PJOK',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Pak Ikhlas',
    normalizedName: 'ikhlas',
    roleTitle: 'Guru B. Arab',
    status: 'active',
    maxDevices: 2,
  },
  {
    name: 'Bu May',
    normalizedName: 'may',
    roleTitle: 'Guru PAI',
    status: 'active',
    maxDevices: 2,
  },
];

function getDefaultTeachers(): TeacherUser[] {
  return DEFAULT_TEACHERS_DATA.map((teacher) => ({
    ...teacher,
    id: generateTeacherId(teacher.name),
    createdAt: new Date().toISOString(),
    activeSessions: [],
    lastLoginAt: '',
    note: '',
  }));
}

/**
 * ============================================================
 * FETCH TEACHERS
 * ============================================================
 */

export async function fetchAllTeachers(): Promise<TeacherUser[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from(TEACHERS_TABLE)
        .select('*')
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);

      const list = ((data || []) as TeacherRow[]).map(mapTeacherRow);
      const listWithAliases = await attachLoginAliases(list);

      if (listWithAliases.length > 0) {
        saveTeacherCache(listWithAliases);
        return listWithAliases;
      }
    } catch (error) {
      console.warn(
        '[Supabase] Gagal memuat guru, menggunakan cache lokal sebagai fallback:',
        error
      );
    }
  }

  const cached = readTeacherCache();
  if (cached.length > 0) return cached;

  const defaults = getDefaultTeachers();
  saveTeacherCache(defaults);
  return defaults;
}

/**
 * ============================================================
 * BOOTSTRAP / SEED
 * ============================================================
 */

export async function bootstrapTeachersToSupabase(): Promise<TeacherUser[]> {
  if (!isSupabaseConfigured()) {
    return fetchAllTeachers();
  }

  const current = readTeacherCache();
  const teachers = current.length > 0 ? current : getDefaultTeachers();

  const rows = teachers.map(teacherToRow);

  const { data, error } = await supabase
    .from(TEACHERS_TABLE)
    .upsert(rows, { onConflict: 'id' })
    .select('*');

  if (error) {
    console.error('[Supabase] Gagal bootstrap guru:', error);
    throw new Error(
      `Gagal menyimpan data guru ke Supabase: ${error.message}`
    );
  }

  const list = ((data || []) as TeacherRow[]).map(mapTeacherRow);
  const finalList = list.length > 0 ? await attachLoginAliases(list) : teachers;
  saveTeacherCache(finalList);
  return finalList;
}

/**
 * Kompatibilitas nama fungsi lama.
 * Tidak lagi menulis ke Firestore.
 */
export async function bootstrapTeachersToFirestore(): Promise<TeacherUser[]> {
  return bootstrapTeachersToSupabase();
}

/**
 * ============================================================
 * REALTIME TEACHER LISTENER
 * ============================================================
 */

export function subscribeToTeachers(
  callback: (teachers: TeacherUser[]) => void,
  onError?: (error: Error) => void
): () => void {
  let active = true;

  const fetch = async () => {
    try {
      const list = await fetchAllTeachers();
      if (active) callback(list);
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error(String(error));
      if (active) onError?.(normalized);
    }
  };

  void fetch();

  if (!isSupabaseConfigured()) {
    return () => {
      active = false;
    };
  }

  const channel = supabase
    .channel(`teachers_realtime_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TEACHERS_TABLE,
      },
      () => {
        void fetch();
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('[Supabase Realtime] Channel error pada teachers.');
      }
    });

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

/**
 * ============================================================
 * ADD TEACHER
 * ============================================================
 */

export async function addTeacher(params: {
  name: string;
  roleTitle?: string;
  maxDevices?: number;
  note?: string;
  loginAliases?: string[];
}): Promise<TeacherUser> {
  const cleanName = params.name.trim();

  if (!cleanName) {
    throw new Error('Nama guru tidak boleh kosong.');
  }

  const normalized = normalizeTeacherName(cleanName);

  if (!normalized) {
    throw new Error('Nama guru tidak valid.');
  }

  const existing = await fetchAllTeachers();
  const match = existing.find(
    (teacher) =>
      teacher.normalizedName === normalized ||
      teacher.name.toLowerCase() === cleanName.toLowerCase()
  );

  if (match) {
    throw new Error(
      `Guru dengan nama "${cleanName}" (${match.name}) sudah terdaftar dalam sistem.`
    );
  }

  const newTeacher: TeacherUser = {
    id:
      generateTeacherId(cleanName) +
      '-' +
      Math.random().toString(36).substring(2, 6),
    name: cleanName,
    normalizedName: normalized,
    roleTitle: params.roleTitle?.trim() || 'Guru SDIT AL FIKRI',
    status: 'active',
    maxDevices:
      params.maxDevices && params.maxDevices > 0 ? params.maxDevices : 2,
    activeSessions: [],
    lastLoginAt: '',
    createdAt: new Date().toISOString(),
    note: params.note?.trim() || '',
    loginAliases: sanitizeLoginAliases(params.loginAliases || []),
  };

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase belum dikonfigurasi. Guru tidak dapat disimpan ke server.'
    );
  }

  const { error } = await supabase
    .from(TEACHERS_TABLE)
    .insert(teacherToRow(newTeacher));

  if (error) {
    console.error('[Supabase] Gagal menyimpan guru:', error);
    throw new Error(
      `Guru gagal disimpan ke server: ${error.message}`
    );
  }

  if (newTeacher.loginAliases && newTeacher.loginAliases.length > 0) {
    await setTeacherLoginAliases(newTeacher.id, newTeacher.loginAliases);
    newTeacher.loginAliases = sanitizeLoginAliases(newTeacher.loginAliases);
  }

  saveTeacherCache([newTeacher, ...existing]);
  return newTeacher;
}

/**
 * ============================================================
 * UPDATE TEACHER
 * ============================================================
 */

export async function updateTeacher(
  id: string,
  updates: Partial<Omit<TeacherUser, 'id' | 'createdAt'>>
): Promise<void> {
  const currentList = await fetchAllTeachers();
  const target = currentList.find((teacher) => teacher.id === id);

  if (!target) return;

  const next: TeacherUser = {
    ...target,
    ...updates,
    id: target.id,
    createdAt: target.createdAt,
  };

  if (updates.name) {
    next.name = updates.name.trim();
    next.normalizedName = normalizeTeacherName(next.name);
  }

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase belum dikonfigurasi. Perubahan guru tidak dapat disimpan.'
    );
  }

  const payload = {
    name: next.name,
    normalized_name: next.normalizedName,
    role_title: next.roleTitle || 'Guru SDIT AL FIKRI',
    status: next.status === 'blocked' ? 'blocked' : 'active',
    max_devices: next.maxDevices || 2,
    active_sessions: Array.isArray(next.activeSessions)
      ? next.activeSessions
      : [],
    last_login_at: next.lastLoginAt || null,
    note: next.note || '',
  };

  const { error } = await supabase
    .from(TEACHERS_TABLE)
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Gagal update guru:', error);
    throw new Error(`Perubahan guru gagal disimpan: ${error.message}`);
  }

  const updatedList = currentList.map((teacher) =>
    teacher.id === id ? next : teacher
  );

  if (Object.prototype.hasOwnProperty.call(updates, 'loginAliases')) {
    next.loginAliases = await setTeacherLoginAliases(
      id,
      sanitizeLoginAliases(updates.loginAliases || [])
    );
  }

  saveTeacherCache(updatedList);

  const activeSession = getActiveTeacherSession();
  if (activeSession && activeSession.id === id) {
    saveActiveTeacherSession(next);
  }
}

/**
 * ============================================================
 * BLOCK / ACTIVATE TEACHER
 * ============================================================
 */

export async function toggleTeacherStatus(
  id: string,
  status: 'active' | 'blocked'
): Promise<void> {
  await updateTeacher(id, { status });

  const activeSession = getActiveTeacherSession();

  if (
    activeSession &&
    activeSession.id === id &&
    status === 'blocked'
  ) {
    logoutTeacher();
  }
}

/**
 * ============================================================
 * KICK DEVICE
 * ============================================================
 */

export async function kickTeacherDevice(
  teacherId: string,
  deviceId: string
): Promise<void> {
  const list = await fetchAllTeachers();
  const teacher = list.find((item) => item.id === teacherId);

  if (!teacher) return;

  const updatedSessions = (teacher.activeSessions || []).filter(
    (session) => session.deviceId !== deviceId
  );

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase belum dikonfigurasi. Perangkat belum dapat dicabut.'
    );
  }

  const { error } = await supabase
    .from(TEACHERS_TABLE)
    .update({ active_sessions: updatedSessions })
    .eq('id', teacherId);

  if (error) {
    console.error('[Supabase] Gagal kick device guru:', error);
    throw new Error(
      `Gagal mencabut perangkat: ${error.message}`
    );
  }

  const updatedList = list.map((item) =>
    item.id === teacherId
      ? { ...item, activeSessions: updatedSessions }
      : item
  );

  saveTeacherCache(updatedList);

  const myDeviceId = getOrGenerateDeviceId();
  const active = getActiveTeacherSession();

  if (
    active &&
    active.id === teacherId &&
    myDeviceId === deviceId
  ) {
    logoutTeacher();
  }
}

/**
 * ============================================================
 * RESET ALL TEACHER SESSIONS
 * ============================================================
 */

export async function resetAllTeacherSessions(
  teacherId: string
): Promise<void> {
  const list = await fetchAllTeachers();
  const teacher = list.find((item) => item.id === teacherId);

  if (!teacher) return;

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase belum dikonfigurasi. Sesi perangkat belum dapat direset.'
    );
  }

  const { error } = await supabase
    .from(TEACHERS_TABLE)
    .update({ active_sessions: [] })
    .eq('id', teacherId);

  if (error) {
    console.error('[Supabase] Gagal reset semua sesi guru:', error);
    throw new Error(
      `Gagal mereset seluruh sesi perangkat: ${error.message}`
    );
  }

  const updatedList = list.map((item) =>
    item.id === teacherId
      ? { ...item, activeSessions: [] }
      : item
  );

  saveTeacherCache(updatedList);

  const active = getActiveTeacherSession();
  if (active && active.id === teacherId) {
    logoutTeacher();
  }
}

/**
 * ============================================================
 * DELETE TEACHER
 * ============================================================
 */

export async function deleteTeacher(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase belum dikonfigurasi. Guru tidak dapat dihapus dari server.'
    );
  }

  const { error: aliasDeleteError } = await supabase
    .from(TEACHER_ALIASES_TABLE)
    .delete()
    .eq('teacher_id', id);

  if (aliasDeleteError) {
    console.warn(
      '[Supabase] Alias guru tidak dapat dihapus sebelum menghapus guru:',
      aliasDeleteError
    );
  }

  const { error } = await supabase
    .from(TEACHERS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Gagal menghapus guru:', error);
    throw new Error(`Guru gagal dihapus dari server: ${error.message}`);
  }

  const list = await fetchAllTeachers();
  const updatedList = list.filter((teacher) => teacher.id !== id);
  saveTeacherCache(updatedList);

  const active = getActiveTeacherSession();
  if (active && active.id === id) {
    logoutTeacher();
  }
}

/**
 * ============================================================
 * LOCAL SESSION
 * ============================================================
 */

function saveActiveTeacherSession(teacher: TeacherUser): void {
  if (!isBrowser()) return;

  localStorage.setItem(
    CURRENT_TEACHER_KEY,
    JSON.stringify(teacher)
  );
}

export function getActiveTeacherSession(): TeacherUser | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(CURRENT_TEACHER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as TeacherUser;

    if (parsed && parsed.id && parsed.name) {
      if (parsed.status === 'blocked') {
        logoutTeacher();
        return null;
      }

      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export function logoutTeacher(): void {
  clearLocalTeacherSession();
}

/**
 * ============================================================
 * LOGIN
 * ============================================================
 */

export async function loginTeacherByName(
  inputName: string
): Promise<{
  success: boolean;
  teacher?: TeacherUser;
  message: string;
}> {
  const cleanInput = inputName.trim();

  if (!cleanInput) {
    return {
      success: false,
      message: 'Harap masukkan nama Anda terlebih dahulu.',
    };
  }

  const inputNormalized = normalizeTeacherName(cleanInput);

  if (!inputNormalized) {
    return {
      success: false,
      message: 'Format nama yang dimasukkan tidak valid.',
    };
  }

  let teachers = await fetchAllTeachers();

  if (teachers.length === 0) {
    try {
      teachers = await bootstrapTeachersToSupabase();
    } catch {
      // fetchAllTeachers sudah menyediakan fallback lokal.
    }
  }

  const inputTokens = inputNormalized.split(/\s+/).filter(Boolean);

  let matchedTeacher = teachers.find(
    (teacher) =>
      teacher.normalizedName === inputNormalized ||
      teacher.name.toLowerCase().trim() === cleanInput.toLowerCase().trim() ||
      normalizeTeacherName(teacher.name) === inputNormalized
  );

  if (!matchedTeacher) {
    matchedTeacher = teachers.find((teacher) =>
      (teacher.loginAliases || []).some(
        (alias) => normalizeLoginAlias(alias) === inputNormalized
      )
    );
  }

  if (!matchedTeacher) {
    matchedTeacher = teachers.find((teacher) => {
      const teacherNorm =
        teacher.normalizedName || normalizeTeacherName(teacher.name);
      const teacherTokens = teacherNorm.split(/\s+/).filter(Boolean);

      if (inputTokens.length === 1 && teacherTokens.length >= 1) {
        return teacherTokens.some((token) => token === inputTokens[0]);
      }

      if (
        inputTokens.length > 1 &&
        teacherTokens.length >= inputTokens.length
      ) {
        return inputTokens.every((token) => teacherTokens.includes(token));
      }

      return false;
    });
  }

  if (!matchedTeacher) {
    return {
      success: false,
      message: `Nama "${cleanInput}" belum terdaftar di whitelist guru. Pastikan penulisan nama sesuai daftar guru atau hubungi Administrator.`,
    };
  }

  if (matchedTeacher.status === 'blocked') {
    return {
      success: false,
      message: `Akses untuk ${matchedTeacher.name} sedang dinonaktifkan / diblokir oleh Administrator.`,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message:
        'Database Supabase belum siap. Login guru belum dapat diverifikasi ke server.',
    };
  }

  const deviceId = getOrGenerateDeviceId();
  const { deviceName, browser, deviceType } = getDeviceFriendlyName();
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const maxAllowed = matchedTeacher.maxDevices || 2;

  let currentSessions = [...(matchedTeacher.activeSessions || [])];

  currentSessions = currentSessions.filter((session) => {
    if (!session.lastActiveAt) return false;
    const time = new Date(session.lastActiveAt).getTime();
    return !isNaN(time) && nowMs - time < SEVEN_DAYS_MS;
  });

  let existingSessionIndex = currentSessions.findIndex(
    (session) => session.deviceId === deviceId
  );

  if (
    existingSessionIndex === -1 &&
    currentSessions.length >= maxAllowed
  ) {
    currentSessions.sort((a, b) => {
      const timeA = a.lastActiveAt
        ? new Date(a.lastActiveAt).getTime()
        : 0;
      const timeB = b.lastActiveAt
        ? new Date(b.lastActiveAt).getTime()
        : 0;
      return timeA - timeB;
    });

    currentSessions.shift();

    existingSessionIndex = currentSessions.findIndex(
      (session) => session.deviceId === deviceId
    );
  }

  const updatedSessions: TeacherDeviceSession[] = [...currentSessions];

  if (existingSessionIndex >= 0) {
    updatedSessions[existingSessionIndex] = {
      ...updatedSessions[existingSessionIndex],
      deviceName,
      browser,
      deviceType,
      lastActiveAt: nowIso,
    };
  } else {
    updatedSessions.push({
      deviceId,
      deviceName,
      browser,
      deviceType,
      lastActiveAt: nowIso,
    });
  }

  const updatedTeacher: TeacherUser = {
    ...matchedTeacher,
    activeSessions: updatedSessions,
    lastLoginAt: nowIso,
  };

  const { data, error } = await supabase
    .from(TEACHERS_TABLE)
    .update({
      active_sessions: updatedSessions,
      last_login_at: nowIso,
    })
    .eq('id', matchedTeacher.id)
    .select('*')
    .single();

  if (error) {
    console.error('[Supabase] Gagal memperbarui sesi guru:', error);

    return {
      success: false,
      message:
        error.message ||
        'Login gagal karena sesi perangkat tidak dapat diverifikasi ke server. Periksa koneksi internet lalu coba lagi.',
    };
  }

  const serverTeacher = data
    ? {
        ...mapTeacherRow(data as TeacherRow),
        loginAliases: matchedTeacher.loginAliases || [],
      }
    : updatedTeacher;

  const cachedTeachers = await fetchAllTeachers();
  saveTeacherCache(
    cachedTeachers.map((teacher) =>
      teacher.id === serverTeacher.id ? serverTeacher : teacher
    )
  );

  saveActiveTeacherSession(serverTeacher);

  return {
    success: true,
    teacher: serverTeacher,
    message: `Selamat datang, ${serverTeacher.name}! Akses arsip berhasil dibuka.`,
  };
}

/**
 * ============================================================
 * JIT SERVER VERIFICATION
 * ============================================================
 */

export async function verifyActiveTeacherSessionRealtime(): Promise<{
  isValid: boolean;
  message?: string;
}> {
  if (
    isBrowser() &&
    localStorage.getItem('sdit_admin_logged_in') === 'true'
  ) {
    return { isValid: true };
  }

  const active = getActiveTeacherSession();

  if (!active) {
    return {
      isValid: false,
      message: 'Belum ada sesi guru yang aktif.',
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      isValid: false,
      message:
        'Sesi tidak dapat diverifikasi karena Supabase belum dikonfigurasi.',
    };
  }

  try {
    const { data, error } = await supabase
      .from(TEACHERS_TABLE)
      .select('*')
      .eq('id', active.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      return revokeLocalTeacherSession(
        'Data guru Anda tidak ditemukan di server atau telah dihapus oleh Administrator.'
      );
    }

    const teacher = {
      ...mapTeacherRow(data as TeacherRow),
      loginAliases: active.loginAliases || [],
    };

    if (teacher.status === 'blocked') {
      return revokeLocalTeacherSession(
        'Akses guru Anda telah dinonaktifkan / diblokir oleh Administrator.'
      );
    }

    const serverSessions = teacher.activeSessions || [];
    const isDeviceAllowed = isCurrentDeviceAuthorized(serverSessions);

    if (!isDeviceAllowed) {
      return revokeLocalTeacherSession(
        'Sesi perangkat ini telah dicabut oleh Administrator.'
      );
    }

    saveActiveTeacherSession(teacher);

    return { isValid: true };
  } catch (error) {
    console.error('[Supabase] Gagal melakukan verifikasi sesi guru:', error);

    return {
      isValid: false,
      message:
        'Sesi tidak dapat diverifikasi ke server. Periksa koneksi internet Anda lalu coba lagi.',
    };
  }
}

/**
 * ============================================================
 * REALTIME SESSION LISTENER
 * ============================================================
 */

export function subscribeToCurrentTeacherSession(
  teacherId: string,
  onRevoked: (reason: string) => void,
  onUpdated?: (teacher: TeacherUser) => void
): () => void {
  if (!teacherId || !isSupabaseConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel(
      `teacher_session_${teacherId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TEACHERS_TABLE,
        filter: `id=eq.${teacherId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          logoutTeacher();
          onRevoked(
            'Data guru Anda telah dihapus dari sistem oleh Administrator.'
          );
          return;
        }

        const row = payload.new as TeacherRow;
        if (!row) return;

        const teacher = {
          ...mapTeacherRow(row),
          loginAliases: getActiveTeacherSession()?.loginAliases || [],
        };

        if (teacher.status === 'blocked') {
          logoutTeacher();
          onRevoked('Akses Anda telah diblokir oleh Administrator.');
          return;
        }

        const isDeviceActive = isCurrentDeviceAuthorized(
          teacher.activeSessions || []
        );

        if (!isDeviceActive) {
          logoutTeacher();
          onRevoked(
            'Sesi perangkat Anda telah dicabut oleh Administrator.'
          );
          return;
        }

        saveActiveTeacherSession(teacher);
        onUpdated?.(teacher);
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn(
          '[Supabase Realtime] Gagal memasang listener sesi guru.'
        );
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
