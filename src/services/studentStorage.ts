import { supabase, isSupabaseConfigured } from './supabase';

export interface Student {
  id: string;
  name: string;
  classId: string;
  schoolName?: string;
  nim?: string;
  nisn?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  gender?: 'L' | 'P';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentInput {
  name: string;
  classId: string;
  schoolName?: string;
  nim?: string;
  nisn?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  gender?: 'L' | 'P';
}

export const DEFAULT_SCHOOL_NAME = 'SDIT Al Fikri';
const SCHOOLS_STORAGE_KEY = 'sdit_registered_schools_list';
const STUDENTS_LOCAL_CACHE_KEY = 'sdit_students_local_cache';

export const getStoredStudentsLocal = (): Student[] => {
  try {
    const raw = localStorage.getItem(STUDENTS_LOCAL_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read local student cache:', e);
    return [];
  }
};

export const saveStoredStudentsLocal = (students: Student[]): void => {
  try {
    localStorage.setItem(STUDENTS_LOCAL_CACHE_KEY, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to write local student cache:', e);
  }
};

/**
 * Mendapatkan daftar seluruh sekolah yang terdaftar (SDIT Al Fikri + custom schools)
 */
export const getStoredSchools = (): string[] => {
  try {
    const raw = localStorage.getItem(SCHOOLS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    if (!list.includes(DEFAULT_SCHOOL_NAME)) {
      list.unshift(DEFAULT_SCHOOL_NAME);
    }
    return list;
  } catch (err) {
    return [DEFAULT_SCHOOL_NAME];
  }
};

/**
 * Normalisasi nama sekolah agar variasi seperti "Al Fikri", "AL FIKRI", atau "SDIT Al Fikri"
 * disatukan dengan penulisan baku yang sudah ada, mencegah duplikasi sekolah.
 */
export const normalizeSchoolName = (rawSchoolName: string, existingList?: string[]): string => {
  const clean = (rawSchoolName || '').trim();
  if (!clean) return DEFAULT_SCHOOL_NAME;

  const currentList = existingList && existingList.length > 0 ? existingList : getStoredSchools();

  // 1. Exact case-insensitive match
  const exactMatch = currentList.find((s) => s.trim().toLowerCase() === clean.toLowerCase());
  if (exactMatch) return exactMatch;

  // 2. Match ignoring common school prefixes like "SDIT ", "SD ", "SMP ", etc.
  const stripPrefix = (str: string) => str.trim().toLowerCase().replace(/^(sdit|sd|smp|sma|mi|mts)\s+/i, '');
  const cleanStripped = stripPrefix(clean);
  if (cleanStripped) {
    const strippedMatch = currentList.find((s) => stripPrefix(s) === cleanStripped);
    if (strippedMatch) return strippedMatch;
  }

  return clean;
};

/**
 * Menyimpan nama sekolah baru ke dalam daftar sekolah
 */
export const saveStoredSchool = (schoolName: string): string[] => {
  const cleanName = schoolName.trim();
  if (!cleanName) return getStoredSchools();
  const current = getStoredSchools();
  const normalized = normalizeSchoolName(cleanName, current);
  if (!current.some((s) => s.toLowerCase() === normalized.toLowerCase())) {
    current.push(normalized);
    try {
      localStorage.setItem(SCHOOLS_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save school to local storage', e);
    }
  }
  return current;
};

/**
 * Menghapus nama sekolah dari daftar sekolah lokal
 */
export const removeStoredSchool = (schoolName: string): string[] => {
  const cleanName = schoolName.trim().toLowerCase();
  const current = getStoredSchools();
  const filtered = current.filter((s) => s.toLowerCase() !== cleanName);
  if (!filtered.includes(DEFAULT_SCHOOL_NAME)) {
    filtered.unshift(DEFAULT_SCHOOL_NAME);
  }
  try {
    localStorage.setItem(SCHOOLS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to remove school from local storage', e);
  }
  return filtered;
};

/**
 * Membersihkan nilai NISN dari teks jenis kelamin (L/P/Laki-laki/Perempuan) atau teks non-valid
 */
export const cleanNisn = (val: any): string | undefined => {
  if (!val) return undefined;
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper === 'L' ||
    upper === 'P' ||
    upper === 'LAKI-LAKI' ||
    upper === 'PEREMPUAN' ||
    upper === 'LAKI' ||
    upper === 'JK' ||
    upper === 'L/P' ||
    upper === 'L / P' ||
    upper.includes('KELAMIN') ||
    upper.includes('GENDER') ||
    upper.includes('LAKI') ||
    upper.includes('PEREMPUAN')
  ) {
    return undefined;
  }
  return str;
};

/**
 * Normalisasi objek baris dari tabel public.students Supabase ke interface Student
 */
const normalizeStudentFromRow = (row: any): Student => {
  const school =
    typeof row.school_name === 'string' && row.school_name.trim()
      ? row.school_name.trim()
      : typeof row.schoolName === 'string' && row.schoolName.trim()
      ? row.schoolName.trim()
      : DEFAULT_SCHOOL_NAME;

  if (school && school !== DEFAULT_SCHOOL_NAME) {
    saveStoredSchool(school);
  }

  const rawGender = row.gender ? String(row.gender).trim().toUpperCase() : undefined;
  const cleanGender: 'L' | 'P' | undefined = rawGender === 'L' || rawGender === 'P' ? rawGender : undefined;

  return {
    id: String(row.id),
    name: typeof row.name === 'string' ? row.name.trim() : '',
    classId: typeof row.class_id === 'string' ? row.class_id.trim() : typeof row.classId === 'string' ? row.classId.trim() : '',
    schoolName: school,
    nim: typeof row.nim === 'string' && row.nim.trim() ? row.nim.trim() : undefined,
    nisn: cleanNisn(row.nisn),
    tempatLahir: typeof row.tempat_lahir === 'string' && row.tempat_lahir.trim() ? row.tempat_lahir.trim() : typeof row.tempatLahir === 'string' && row.tempatLahir.trim() ? row.tempatLahir.trim() : undefined,
    tanggalLahir: typeof row.tanggal_lahir === 'string' && row.tanggal_lahir.trim() ? row.tanggal_lahir.trim() : typeof row.tanggalLahir === 'string' && row.tanggalLahir.trim() ? row.tanggalLahir.trim() : undefined,
    gender: cleanGender,
    createdAt: row.created_at || row.createdAt || undefined,
    updatedAt: row.updated_at || row.updatedAt || undefined,
  };
};

/**
 * Normalisasi classId agar cocok dengan foreign key public.school_classes(id).
 * Jika kelas belum terdaftar di school_classes, fungsi ini memastikan rombel diinsert otomatis
 * agar constraint foreign key tidak gagal.
 */
const ensureSchoolClassExists = async (rawClassId: string): Promise<string> => {
  const cleanClassId = (rawClassId || '').trim().toUpperCase();
  if (!cleanClassId || !isSupabaseConfigured()) return cleanClassId;

  const matchGrade = cleanClassId.match(/^([1-6])/);
  const grade = matchGrade ? parseInt(matchGrade[1], 10) : 1;
  const phase = grade <= 2 ? 'Fase A' : grade <= 4 ? 'Fase B' : 'Fase C';

  try {
    const { error } = await supabase
      .from('school_classes')
      .upsert(
        {
          id: cleanClassId,
          name: cleanClassId,
          grade,
          phase,
          academic_level_id: `grade_${grade}`,
          active: true,
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn(`[Supabase] ensureSchoolClassExists warning for class "${cleanClassId}":`, error.message);
    }
  } catch (err) {
    console.warn(`[Supabase] Error ensuring class "${cleanClassId}":`, err);
  }

  return cleanClassId;
};

/**
 * Mengubah objek input student menjadi format kolom snake_case tabel public.students
 */
const toStudentRow = (input: StudentInput | BulkImportItem, id?: string) => {
  const cleanGender = input.gender === 'L' || input.gender === 'P' ? input.gender : null;
  const cleanClassId = (input.classId || '').trim().toUpperCase();

  const payload: Record<string, any> = {
    name: input.name.trim(),
    class_id: cleanClassId,
    school_name: input.schoolName?.trim() || DEFAULT_SCHOOL_NAME,
    nim: input.nim?.trim() || null,
    nisn: cleanNisn(input.nisn) || null,
    tempat_lahir: input.tempatLahir?.trim() || null,
    tanggal_lahir: input.tanggalLahir?.trim() || null,
    gender: cleanGender,
    status: 'Aktif',
    updated_at: new Date().toISOString(),
  };

  if (id) {
    payload.id = id;
  }

  return payload;
};

/**
 * ============================================================
 * REALTIME SUBSCRIPTION
 * ============================================================
 */
export const subscribeToStudents = (
  callback: (students: Student[]) => void,
  onError?: (error: Error) => void
) => {
  // 1. Langsung sediakan data dari cache lokal terlebih dahulu untuk kecepatan UI
  const localCache = getStoredStudentsLocal();
  if (localCache.length > 0) {
    callback(localCache);
  }

  // Jika Supabase belum dikonfigurasi, gunakan data lokal
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  let isSubscribed = true;

  // Fungsi helper untuk mengambil seluruh data siswa terbaru dari Supabase
  const fetchAllStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });

          if (error) {
        throw new Error(error.message);
      }

      if (isSubscribed && data) {
        const students = data.map(normalizeStudentFromRow);
        saveStoredStudentsLocal(students);
        callback(students);
      }
    } catch (err: any) {
      console.warn('[Supabase] Gagal mengambil data siswa, fallback ke cache lokal:', err);
      const cached = getStoredStudentsLocal();
      if (cached.length > 0) {
        callback(cached);
      }
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // Panggil fetch awal
  fetchAllStudents();

  // Buat langganan Supabase Realtime channel pada tabel students
  const channelName = `students_realtime_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'students',
      },
      () => {
        // Ambil data terbaru secara konsisten saat ada event INSERT, UPDATE, atau DELETE
        fetchAllStudents();
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('[Supabase Realtime] Channel error on students, refetching...');
        fetchAllStudents();
      }
    });

  // Return function unsubscribe yang kompatibel dengan format pemanggil
  return () => {
    isSubscribed = false;
    supabase.removeChannel(channel);
  };
};

/**
 * ============================================================
 * ADD STUDENT
 * ============================================================
 */
export const addStudent = async (
  input: StudentInput
): Promise<string> => {
  const name = input.name.trim();
  const rawClassId = input.classId.trim();
  const schoolName = input.schoolName?.trim() || DEFAULT_SCHOOL_NAME;

  if (!name) {
    throw new Error('Nama peserta didik wajib diisi.');
  }

  if (!rawClassId) {
    throw new Error('Kelas peserta didik wajib dipilih.');
  }

  if (!isSupabaseConfigured()) {
    // Mode offline / fallback lokal
    const local = getStoredStudentsLocal();
    const newId = `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newStudent: Student = {
      id: newId,
      name,
      classId: rawClassId.toUpperCase(),
      schoolName,
      nim: input.nim?.trim() || undefined,
      nisn: cleanNisn(input.nisn),
      tempatLahir: input.tempatLahir?.trim() || undefined,
      tanggalLahir: input.tanggalLahir?.trim() || undefined,
      gender: input.gender,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveStoredStudentsLocal([...local, newStudent]);
    saveStoredSchool(schoolName);
    return newId;
  }

  // Pastikan relasi rombel tersedia di public.school_classes
  const classId = await ensureSchoolClassExists(rawClassId);

  // Cek duplikasi siswa di kelas & sekolah yang sama
  const { data: existing, error: checkError } = await supabase
    .from('students')
    .select('id, name, class_id, school_name')
    .ilike('name', name)
    .eq('class_id', classId);

  if (checkError) {
    console.warn('[Supabase] Warning saat memeriksa duplikasi siswa:', checkError.message);
  }

  const isDuplicate = (existing || []).some((item) => {
    const itemSchool = item.school_name || DEFAULT_SCHOOL_NAME;
    return itemSchool.toLowerCase() === schoolName.toLowerCase();
  });

  if (isDuplicate) {
    throw new Error(
      `Peserta didik "${name}" di Kelas ${classId} (${schoolName}) sudah terdaftar.`
    );
  }

  saveStoredSchool(schoolName);

  const payload = toStudentRow({
    ...input,
    classId,
    schoolName,
  });

  const { data, error } = await supabase
    .from('students')
    .insert([payload])
    .select('id')
    .single();

  if (error) {
    console.error('[Supabase] Gagal menambahkan siswa:', error);
    throw new Error(`Gagal menambahkan siswa ke Supabase: ${error.message}`);
  }

  // Perbarui cache lokal
  const currentLocal = getStoredStudentsLocal();
  const createdStudent: Student = normalizeStudentFromRow({
    ...payload,
    id: data.id,
    created_at: new Date().toISOString(),
  });
  saveStoredStudentsLocal([...currentLocal, createdStudent]);

  return data.id;
};

/**
 * ============================================================
 * UPDATE STUDENT
 * ============================================================
 */
export const updateStudent = async (
  id: string,
  input: StudentInput
): Promise<void> => {
  const name = input.name.trim();
  const rawClassId = input.classId.trim();
  const schoolName = input.schoolName?.trim() || DEFAULT_SCHOOL_NAME;

  if (!id) {
    throw new Error('ID peserta didik tidak ditemukan.');
  }

  if (!name) {
    throw new Error('Nama peserta didik wajib diisi.');
  }

  if (!rawClassId) {
    throw new Error('Kelas peserta didik wajib dipilih.');
  }

  saveStoredSchool(schoolName);

  if (!isSupabaseConfigured()) {
    // Fallback lokal jika supabase belum terhubung
    const local = getStoredStudentsLocal();
    const updated = local.map((st) => {
      if (st.id !== id) return st;
      return {
        ...st,
        name,
        classId: rawClassId.toUpperCase(),
        schoolName,
        nim: input.nim?.trim() || undefined,
        nisn: cleanNisn(input.nisn),
        tempatLahir: input.tempatLahir?.trim() || undefined,
        tanggalLahir: input.tanggalLahir?.trim() || undefined,
        gender: input.gender,
        updatedAt: new Date().toISOString(),
      };
    });
    saveStoredStudentsLocal(updated);
    return;
  }

  const classId = await ensureSchoolClassExists(rawClassId);

  const payload = toStudentRow({
    ...input,
    classId,
    schoolName,
  });

  const { error } = await supabase
    .from('students')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Gagal mengupdate data siswa:', error);
    throw new Error(`Gagal memperbarui data siswa di Supabase: ${error.message}`);
  }

  // Update cache lokal
  const local = getStoredStudentsLocal();
  const updated = local.map((st) => {
    if (st.id !== id) return st;
    return normalizeStudentFromRow({
      ...payload,
      id,
      created_at: st.createdAt,
      updated_at: new Date().toISOString(),
    });
  });
  saveStoredStudentsLocal(updated);
};

/**
 * ============================================================
 * DELETE STUDENT
 * ============================================================
 */
export const deleteStudent = async (
  id: string
): Promise<void> => {
  if (!id) {
    throw new Error('ID peserta didik tidak ditemukan.');
  }

  if (!isSupabaseConfigured()) {
    const local = getStoredStudentsLocal();
    saveStoredStudentsLocal(local.filter((st) => st.id !== id));
    return;
  }

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Gagal menghapus siswa:', error);
    throw new Error(`Gagal menghapus siswa di Supabase: ${error.message}`);
  }

  const local = getStoredStudentsLocal();
  saveStoredStudentsLocal(local.filter((st) => st.id !== id));
};

/**
 * ============================================================
 * BULK SAVE / IMPORT
 * ============================================================
 */
export interface BulkImportItem {
  id?: string;
  name: string;
  classId: string;
  schoolName?: string;
  nim?: string;
  nisn?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  gender?: 'L' | 'P';
}

export const bulkUpsertStudents = async (
  items: BulkImportItem[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ createdCount: number; updatedCount: number }> => {
  if (!items || items.length === 0) return { createdCount: 0, updatedCount: 0 };

  let createdCount = 0;
  let updatedCount = 0;

  // Kumpulkan seluruh rombel unik yang ada pada data import untuk dijamin ada di school_classes
  const uniqueClasses = Array.from(new Set(items.map((i) => (i.classId || '').trim().toUpperCase()))).filter(Boolean);
  await Promise.all(uniqueClasses.map((cls) => ensureSchoolClassExists(cls)));

  items.forEach((item) => {
    if (item.schoolName) {
      saveStoredSchool(item.schoolName);
    }
  });

  if (!isSupabaseConfigured()) {
    // Mode fallback offline
    const local = getStoredStudentsLocal();
    const localMap = new Map(local.map((st) => [st.id, st]));

    items.forEach((item) => {
      const classId = item.classId.trim().toUpperCase();
      const schoolName = item.schoolName?.trim() || DEFAULT_SCHOOL_NAME;
      if (item.id && localMap.has(item.id)) {
        const existing = localMap.get(item.id)!;
        localMap.set(item.id, {
          ...existing,
          name: item.name.trim(),
          classId,
          schoolName,
          nim: item.nim?.trim() || undefined,
          nisn: cleanNisn(item.nisn),
          tempatLahir: item.tempatLahir?.trim() || undefined,
          tanggalLahir: item.tanggalLahir?.trim() || undefined,
          gender: item.gender,
          updatedAt: new Date().toISOString(),
        });
        updatedCount++;
      } else {
        const newId = item.id || `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        localMap.set(newId, {
          id: newId,
          name: item.name.trim(),
          classId,
          schoolName,
          nim: item.nim?.trim() || undefined,
          nisn: cleanNisn(item.nisn),
          tempatLahir: item.tempatLahir?.trim() || undefined,
          tanggalLahir: item.tanggalLahir?.trim() || undefined,
          gender: item.gender,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        createdCount++;
      }
    });

    saveStoredStudentsLocal(Array.from(localMap.values()));
    onProgress?.(items.length, items.length);
    return { createdCount, updatedCount };
  }

  // Pisahkan item yang memiliki ID (update/upsert) dan yang belum memiliki ID (insert baru)
  const itemsToUpdate = items.filter((item) => Boolean(item.id));
  const itemsToInsert = items.filter((item) => !item.id);

  const BATCH_SIZE = 150;
  let processedCount = 0;

  // 1. Eksekusi Upsert untuk item dengan ID
  if (itemsToUpdate.length > 0) {
    for (let i = 0; i < itemsToUpdate.length; i += BATCH_SIZE) {
      const chunk = itemsToUpdate.slice(i, i + BATCH_SIZE);
      const rows = chunk.map((item) => toStudentRow(item, item.id));

      const { error } = await supabase
        .from('students')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        console.error('[Supabase] Error saat bulk upsert students:', error);
        throw new Error(`Gagal menyimpan sebagian data siswa ke Supabase: ${error.message}`);
      }

      updatedCount += chunk.length;
      processedCount += chunk.length;
      onProgress?.(processedCount, items.length);
    }
  }

  // 2. Eksekusi Insert untuk siswa baru
  if (itemsToInsert.length > 0) {
    for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
      const chunk = itemsToInsert.slice(i, i + BATCH_SIZE);
      const rows = chunk.map((item) => toStudentRow(item));

      const { error } = await supabase
        .from('students')
        .insert(rows);

      if (error) {
        console.error('[Supabase] Error saat bulk insert new students:', error);
        throw new Error(`Gagal menambahkan siswa baru ke Supabase: ${error.message}`);
      }

      createdCount += chunk.length;
      processedCount += chunk.length;
      onProgress?.(processedCount, items.length);
    }
  }

  // Refresh cache lokal dari server
  try {
    const { data: freshStudents } = await supabase
      .from('students')
      .select('*')
      .order('name', { ascending: true });

    if (freshStudents) {
      saveStoredStudentsLocal(freshStudents.map(normalizeStudentFromRow));
    }
  } catch (err) {
    console.warn('[Supabase] Gagal menyegarkan cache lokal setelah bulk save:', err);
  }

  return { createdCount, updatedCount };
};

export const saveStudents = async (
  students: StudentInput[],
  defaultSchool?: string
): Promise<number> => {
  const fallbackSchool = defaultSchool?.trim() || DEFAULT_SCHOOL_NAME;

  const validStudents = students
    .map((student) => ({
      name: student.name.trim(),
      classId: student.classId.trim().toUpperCase(),
      schoolName: student.schoolName?.trim() || fallbackSchool,
      nim: student.nim?.trim() || '',
      nisn: cleanNisn(student.nisn) || '',
      tempatLahir: student.tempatLahir?.trim() || '',
      tanggalLahir: student.tanggalLahir?.trim() || '',
      gender: student.gender,
    }))
    .filter((student) => student.name && student.classId);

  if (validStudents.length === 0) {
    throw new Error('Tidak ada data peserta didik yang valid untuk disimpan.');
  }

  const result = await bulkUpsertStudents(validStudents);
  return result.createdCount + result.updatedCount;
};

/**
 * ============================================================
 * DELETE ALL / BULK
 * ============================================================
 */

/**
 * Menghapus seluruh peserta didik milik sekolah tertentu dan menghapus sekolah dari daftar
 */
export const deleteStudentsBySchool = async (schoolName: string): Promise<number> => {
  const targetSchool = schoolName.trim();
  if (!targetSchool) return 0;

  if (!isSupabaseConfigured()) {
    const local = getStoredStudentsLocal();
    const remaining = local.filter((st) => (st.schoolName || DEFAULT_SCHOOL_NAME).toLowerCase() !== targetSchool.toLowerCase());
    const count = local.length - remaining.length;
    saveStoredStudentsLocal(remaining);
    removeStoredSchool(targetSchool);
    return count;
  }

  const { data, error } = await supabase
    .from('students')
    .delete()
    .ilike('school_name', targetSchool)
    .select('id');

  if (error) {
    console.error('[Supabase] Gagal menghapus siswa berdasarkan sekolah:', error);
    throw new Error(`Gagal menghapus data siswa dari Supabase: ${error.message}`);
  }

  const count = data?.length || 0;
  removeStoredSchool(targetSchool);

  // Update local cache
  const local = getStoredStudentsLocal();
  saveStoredStudentsLocal(local.filter((st) => (st.schoolName || DEFAULT_SCHOOL_NAME).toLowerCase() !== targetSchool.toLowerCase()));

  return count;
};

export const deleteBatchStudents = async (studentIds: string[]): Promise<number> => {
  if (!studentIds || studentIds.length === 0) return 0;

  if (!isSupabaseConfigured()) {
    const set = new Set(studentIds);
    const local = getStoredStudentsLocal();
    const remaining = local.filter((st) => !set.has(st.id));
    const count = local.length - remaining.length;
    saveStoredStudentsLocal(remaining);
    return count;
  }

  const BATCH_SIZE = 200;
  let totalDeleted = 0;

  for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
    const chunk = studentIds.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('students')
      .delete()
      .in('id', chunk);

    if (error) {
      console.error('[Supabase] Gagal menghapus batch siswa:', error);
      throw new Error(`Gagal menghapus batch siswa di Supabase: ${error.message}`);
    }
    totalDeleted += chunk.length;
  }

  const set = new Set(studentIds);
  const local = getStoredStudentsLocal();
  saveStoredStudentsLocal(local.filter((st) => !set.has(st.id)));

  return totalDeleted;
};

export const deleteAllStudents = async (): Promise<number> => {
  if (!isSupabaseConfigured()) {
    const local = getStoredStudentsLocal();
    const count = local.length;
    saveStoredStudentsLocal([]);
    return count;
  }

  // Ambil semua id siswa
  const { data: allIds, error: selectError } = await supabase
    .from('students')
    .select('id');

  if (selectError) {
    console.error('[Supabase] Gagal membaca data siswa untuk dihapus:', selectError);
    throw new Error(`Gagal membaca siswa: ${selectError.message}`);
  }

  if (!allIds || allIds.length === 0) {
    saveStoredStudentsLocal([]);
    return 0;
  }

  const ids = allIds.map((item) => item.id);
  return await deleteBatchStudents(ids);
};
