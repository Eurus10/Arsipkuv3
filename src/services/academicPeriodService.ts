import { supabase, isSupabaseConfigured } from './supabase';

export interface AcademicPeriod {
  id: string;
  school_year: string;
  semester: 'Ganjil' | 'Genap';
  label: string;
  is_active: boolean;
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAcademicPeriodPayload {
  school_year: string;
  semester: 'Ganjil' | 'Genap';
  label?: string;
}

const ensureConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi. Periksa konfigurasi environment.');
  }
};

/**
 * Fetch all academic periods from Supabase, sorted by school_year DESC, semester ASC.
 */
export async function fetchAcademicPeriods(): Promise<AcademicPeriod[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('academic_periods')
    .select('id, school_year, semester, label, is_active, is_archived, created_at, updated_at')
    .order('school_year', { ascending: false })
    .order('semester', { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat periode akademik: ${error.message}`);
  }

  return (data || []) as AcademicPeriod[];
}

/**
 * Create a new academic period in Supabase.
 * - Default is_active = false
 * - Default is_archived = false
 * - Validates school_year format (YYYY/YYYY)
 * - Prevents duplicates for (school_year, semester)
 */
export async function createAcademicPeriod(
  payload: CreateAcademicPeriodPayload
): Promise<AcademicPeriod> {
  ensureConfigured();

  const cleanYear = payload.school_year.trim();
  const cleanSem = payload.semester;

  if (!/^\d{4}\/\d{4}$/.test(cleanYear)) {
    throw new Error("Format Tahun Ajaran tidak valid. Gunakan format YYYY/YYYY (contoh: 2026/2027).");
  }

  const [y1, y2] = cleanYear.split('/').map((y) => parseInt(y, 10));
  if (y2 !== y1 + 1) {
    throw new Error(`Tahun Ajaran tidak valid: ${cleanYear}. Tahun kedua harus tepat 1 tahun setelah tahun pertama.`);
  }

  if (cleanSem !== 'Ganjil' && cleanSem !== 'Genap') {
    throw new Error("Semester harus berupa 'Ganjil' atau 'Genap'.");
  }

  // Check uniqueness
  const { data: existing, error: checkError } = await supabase
    .from('academic_periods')
    .select('id')
    .eq('school_year', cleanYear)
    .eq('semester', cleanSem)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Gagal memeriksa duplikasi periode: ${checkError.message}`);
  }

  if (existing) {
    throw new Error(`Periode untuk Tahun Ajaran ${cleanYear} - Semester ${cleanSem} sudah ada.`);
  }

  const label = payload.label?.trim() || `${cleanYear} - ${cleanSem}`;

  const { data, error } = await supabase
    .from('academic_periods')
    .insert({
      school_year: cleanYear,
      semester: cleanSem,
      label,
      is_active: false,
      is_archived: false,
    })
    .select('id, school_year, semester, label, is_active, is_archived, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(`Gagal membuat periode akademik: ${error.message}`);
  }

  return data as AcademicPeriod;
}

/**
 * Set an academic period as the ONLY active period in Supabase.
 * - Deactivates any currently active period
 * - Activates target period
 * - Automatically unarchives target period if it was archived
 */
export async function setActiveAcademicPeriod(periodId: string): Promise<void> {
  ensureConfigured();

  // 1. Verify target period exists
  const { data: target, error: targetError } = await supabase
    .from('academic_periods')
    .select('id, school_year, semester, label, is_active')
    .eq('id', periodId)
    .single();

  if (targetError || !target) {
    throw new Error('Periode akademik tidak ditemukan.');
  }

  if (target.is_active) {
    return; // Already active
  }

  // 2. Deactivate all other periods
  const { error: deactivateError } = await supabase
    .from('academic_periods')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .neq('id', periodId)
    .eq('is_active', true);

  if (deactivateError) {
    throw new Error(`Gagal menonaktifkan periode sebelumnya: ${deactivateError.message}`);
  }

  // 3. Activate target period
  const { error: activateError } = await supabase
    .from('academic_periods')
    .update({ is_active: true, is_archived: false, updated_at: new Date().toISOString() })
    .eq('id', periodId);

  if (activateError) {
    throw new Error(`Gagal mengaktifkan periode akademik: ${activateError.message}`);
  }
}

/**
 * Toggle archive status of an academic period.
 * - Cannot archive a currently active period
 */
export async function toggleArchiveAcademicPeriod(
  periodId: string,
  is_archived: boolean
): Promise<void> {
  ensureConfigured();

  const { data: target, error: targetError } = await supabase
    .from('academic_periods')
    .select('id, is_active')
    .eq('id', periodId)
    .single();

  if (targetError || !target) {
    throw new Error('Periode akademik tidak ditemukan.');
  }

  if (target.is_active && is_archived) {
    throw new Error('Periode yang sedang aktif tidak dapat diarsipkan. Silakan aktifkan periode lain terlebih dahulu.');
  }

  const { error } = await supabase
    .from('academic_periods')
    .update({ is_archived, updated_at: new Date().toISOString() })
    .eq('id', periodId);

  if (error) {
    throw new Error(`Gagal memperbarui status arsip: ${error.message}`);
  }
}

/**
 * Delete an academic period if safe:
 * - Cannot delete if period is active
 * - Cannot delete if referenced in student_enrollments, teacher_assignments, or student_subject_scores
 */
export async function deleteAcademicPeriod(periodId: string): Promise<void> {
  ensureConfigured();

  const { data: target, error: targetError } = await supabase
    .from('academic_periods')
    .select('id, is_active, label')
    .eq('id', periodId)
    .single();

  if (targetError || !target) {
    throw new Error('Periode akademik tidak ditemukan.');
  }

  if (target.is_active) {
    throw new Error('Periode yang sedang aktif tidak dapat dihapus.');
  }

  // Check enrollments
  const { count: enrollmentsCount, error: enrollError } = await supabase
    .from('student_enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('academic_period_id', periodId);

  if (!enrollError && enrollmentsCount && enrollmentsCount > 0) {
    throw new Error(`Periode '${target.label}' tidak dapat dihapus karena telah digunakan pada ${enrollmentsCount} data rombel siswa (student enrollments). Gunakan fitur arsip.`);
  }

  // Check teacher assignments
  const { count: assignmentsCount, error: assignError } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('academic_period_id', periodId);

  if (!assignError && assignmentsCount && assignmentsCount > 0) {
    throw new Error(`Periode '${target.label}' tidak dapat dihapus karena telah digunakan pada ${assignmentsCount} penugasan guru. Gunakan fitur arsip.`);
  }

  // Check student scores
  const { count: scoresCount, error: scoreError } = await supabase
    .from('student_subject_scores')
    .select('*', { count: 'exact', head: true })
    .eq('academic_period_id', periodId);

  if (!scoreError && scoresCount && scoresCount > 0) {
    throw new Error(`Periode '${target.label}' tidak dapat dihapus karena telah memiliki data nilai siswa. Gunakan fitur arsip.`);
  }

  const { error } = await supabase
    .from('academic_periods')
    .delete()
    .eq('id', periodId);

  if (error) {
    throw new Error(`Gagal menghapus periode akademik: ${error.message}`);
  }
}
