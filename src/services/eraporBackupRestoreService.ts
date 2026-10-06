import { supabase, isSupabaseConfigured } from './supabase';
import { AcademicPeriod } from './academicPeriodService';
import { fetchCharacterDescriptors, loadClassCharacterRecords, saveCharacterDescriptors, saveClassCharacterRecords } from './raporCharacterService';

export const BACKUP_VERSION = 1;
export const BACKUP_APP_NAME = 'e-Rapor SDIT AL FIKRI';
export const LOCAL_BACKUP_HISTORY_KEY = 'sdit_erapor_backup_history_v1';

export interface BackupHistoryItem {
  id: string;
  filename: string;
  createdAt: string;
  academicPeriodId: string;
  academicPeriodLabel: string;
  statistics: {
    students: number;
    teachers: number;
    classes: number;
    subjects: number;
    scores: number;
    loScores: number;
    assignments: number;
  };
  sizeBytes: number;
  dataSnapshot?: string; // Optional cached JSON for fast redownload
}

export interface EraporBackupMetadata {
  backup_version: number;
  created_at: string;
  application: string;
  academic_period: {
    id: string;
    school_year: string;
    semester: 'Ganjil' | 'Genap';
    label: string;
  };
  statistics: {
    students: number;
    teachers: number;
    classes: number;
    subjects: number;
    learning_objectives: number;
    enrollments: number;
    teacher_assignments: number;
    subject_scores: number;
    lo_scores: number;
  };
}

export interface EraporBackupPayload {
  metadata: EraporBackupMetadata;
  master_data: {
    academic_levels: any[];
    school_classes: any[];
    academic_subjects: any[];
    learning_objectives: any[];
    teachers: any[];
    students: any[];
  };
  period_data: {
    academic_period: any;
    student_enrollments: any[];
    teacher_assignments: any[];
    student_subject_scores: any[];
    student_learning_objective_scores: any[];
    character_descriptors?: any[];
    class_character_records?: Record<string, any>;
    global_config?: any;
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  payload?: EraporBackupPayload;
  summary?: {
    schoolYear: string;
    semester: string;
    periodLabel: string;
    createdAt: string;
    studentCount: number;
    teacherCount: number;
    classCount: number;
    subjectCount: number;
    scoreCount: number;
    loScoreCount: number;
    assignmentCount: number;
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restoredRecords: Record<string, number>;
  errors?: string[];
}

const ensureConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }
};

/**
 * Fetch a Supabase table in deterministic pages to handle large datasets safely
 */
async function fetchAllPaged<T>(
  tableName: string,
  filterFn?: (query: any) => any,
  pageSize = 500
): Promise<T[]> {
  const records: T[] = [];
  let page = 0;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from(tableName).select('*');
    if (filterFn) {
      query = filterFn(query);
    }

    const { data, error } = await query.range(from, to);

    if (error) {
      throw new Error(`Gagal membaca tabel ${tableName}: ${error.message}`);
    }

    const rows = (data || []) as T[];
    records.push(...rows);

    if (rows.length < pageSize) break;
    page++;
  }

  return records;
}

/**
 * Perform Read-Only Export of e-Rapor data for a specific Academic Period
 */
export async function createEraporPeriodBackup(
  periodId: string
): Promise<{ payload: EraporBackupPayload; filename: string; jsonString: string }> {
  ensureConfigured();

  if (!periodId) {
    throw new Error('Pilih Tahun Pelajaran & Semester yang valid untuk melakukan backup.');
  }

  // 1. Fetch Target Academic Period
  const { data: periodRaw, error: periodErr } = await supabase
    .from('academic_periods')
    .select('*')
    .eq('id', periodId)
    .maybeSingle();

  if (periodErr || !periodRaw) {
    throw new Error(`Periode akademik tidak ditemukan: ${periodErr?.message || 'ID tidak valid'}`);
  }

  // 2. Fetch Master Data (Read-Only)
  const [
    levels,
    classes,
    subjects,
    learningObjectives,
    teachers,
    students,
  ] = await Promise.all([
    fetchAllPaged('academic_levels', (q) => q.order('grade', { ascending: true })),
    fetchAllPaged('school_classes', (q) => q.order('grade', { ascending: true }).order('name', { ascending: true })),
    fetchAllPaged('academic_subjects', (q) => q.order('display_order', { ascending: true }).order('name', { ascending: true })),
    fetchAllPaged('learning_objectives', (q) => q.order('display_order', { ascending: true })),
    fetchAllPaged('teachers', (q) => q.order('name', { ascending: true })),
    fetchAllPaged('students', (q) => q.order('name', { ascending: true })),
  ]);

  // 3. Fetch Period-Specific Data (Read-Only, filtered by academic_period_id)
  const [
    enrollments,
    assignments,
    subjectScores,
    loScores,
  ] = await Promise.all([
    fetchAllPaged('student_enrollments', (q) => q.eq('academic_period_id', periodId)),
    fetchAllPaged('teacher_assignments', (q) => q.eq('academic_period_id', periodId)),
    fetchAllPaged('student_subject_scores', (q) => q.eq('academic_period_id', periodId)),
    fetchAllPaged('student_learning_objective_scores', (q) => q.eq('academic_period_id', periodId)),
  ]);

  // 4. Fetch Character Descriptors & Class Character Records
  let characterDescriptors: any[] = [];
  try {
    characterDescriptors = await fetchCharacterDescriptors();
  } catch (err) {
    console.warn('Could not export character descriptors:', err);
  }

  const classCharacterRecords: Record<string, any> = {};
  for (const cls of classes as any[]) {
    try {
      const cleanClass = (cls.name || '1A').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanYear = (periodRaw.school_year || '2026-2027').replace(/[^a-zA-Z0-9]/g, '-');
      const semesterNum = periodRaw.semester === 'Genap' ? '2' : '1';
      const classKey = `${cleanClass}_sem${semesterNum}_${cleanYear}`.toLowerCase();

      const charRecord = await loadClassCharacterRecords(classKey);
      if (charRecord && Object.keys(charRecord).length > 0) {
        classCharacterRecords[classKey] = charRecord;
      }
    } catch {
      // Ignore individual character load errors
    }
  }

  // 5. Global Config Snapshot
  let globalConfig: any = null;
  if (typeof window !== 'undefined') {
    try {
      const rawConfig = localStorage.getItem('sdit_rapor_sts_global_config');
      if (rawConfig) globalConfig = JSON.parse(rawConfig);
    } catch {
      // Ignore
    }
  }

  // 6. Build Metadata & Payload
  const now = new Date();
  const timestampStr = now.toISOString();
  const cleanSchoolYear = periodRaw.school_year.replace(/[/\\:\s]/g, '-');
  const cleanSemester = periodRaw.semester.toLowerCase();
  const dateSuffix = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeSuffix = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const filename = `backup_erapor_${cleanSchoolYear}_${cleanSemester}_${dateSuffix}_${timeSuffix}.json`;

  const metadata: EraporBackupMetadata = {
    backup_version: BACKUP_VERSION,
    created_at: timestampStr,
    application: BACKUP_APP_NAME,
    academic_period: {
      id: periodRaw.id,
      school_year: periodRaw.school_year,
      semester: periodRaw.semester,
      label: periodRaw.label || `${periodRaw.school_year} - Semester ${periodRaw.semester}`,
    },
    statistics: {
      students: students.length,
      teachers: teachers.length,
      classes: classes.length,
      subjects: subjects.length,
      learning_objectives: learningObjectives.length,
      enrollments: enrollments.length,
      teacher_assignments: assignments.length,
      subject_scores: subjectScores.length,
      lo_scores: loScores.length,
    },
  };

  const payload: EraporBackupPayload = {
    metadata,
    master_data: {
      academic_levels: levels,
      school_classes: classes,
      academic_subjects: subjects,
      learning_objectives: learningObjectives,
      teachers,
      students,
    },
    period_data: {
      academic_period: periodRaw,
      student_enrollments: enrollments,
      teacher_assignments: assignments,
      student_subject_scores: subjectScores,
      student_learning_objective_scores: loScores,
      character_descriptors: characterDescriptors,
      class_character_records: classCharacterRecords,
      global_config: globalConfig,
    },
  };

  const jsonString = JSON.stringify(payload, null, 2);

  // 7. Store in Local Backup History
  saveToLocalBackupHistory({
    id: `backup_${Date.now()}`,
    filename,
    createdAt: timestampStr,
    academicPeriodId: periodRaw.id,
    academicPeriodLabel: metadata.academic_period.label,
    statistics: {
      students: metadata.statistics.students,
      teachers: metadata.statistics.teachers,
      classes: metadata.statistics.classes,
      subjects: metadata.statistics.subjects,
      scores: metadata.statistics.subject_scores,
      loScores: metadata.statistics.lo_scores,
      assignments: metadata.statistics.teacher_assignments,
    },
    sizeBytes: new Blob([jsonString]).size,
  });

  return { payload, filename, jsonString };
}

/**
 * Save history item to localStorage
 */
export function saveToLocalBackupHistory(item: BackupHistoryItem): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_HISTORY_KEY);
    const list: BackupHistoryItem[] = raw ? JSON.parse(raw) : [];
    // Prepend new item and limit history to 15 items
    const updated = [item, ...list.filter((x) => x.id !== item.id)].slice(0, 15);
    localStorage.setItem(LOCAL_BACKUP_HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not save local backup history:', err);
  }
}

/**
 * Get local backup history list
 */
export function getLocalBackupHistory(): BackupHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Download a JSON string to user device
 */
export function downloadJsonFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate backup file content before attempting restore
 */
export function validateEraporBackupFile(jsonString: string): BackupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!jsonString || !jsonString.trim()) {
    return { isValid: false, errors: ['File backup kosong atau tidak dapat dibaca.'], warnings };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    return { isValid: false, errors: [`Format JSON tidak valid: ${err?.message}`], warnings };
  }

  // 1. Structure check
  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, errors: ['Struktur backup tidak valid (harus berupa objek JSON).'], warnings };
  }

  if (!parsed.metadata) {
    errors.push('Metadata backup tidak ditemukan.');
  } else {
    if (parsed.metadata.backup_version !== BACKUP_VERSION) {
      errors.push(
        `Versi backup (${parsed.metadata.backup_version || 'unknown'}) tidak kompatibel dengan sistem ini (v${BACKUP_VERSION}).`
      );
    }
    if (!parsed.metadata.application || !parsed.metadata.application.includes('e-Rapor')) {
      errors.push('File backup ini bukan berasal dari aplikasi e-Rapor SDIT AL FIKRI.');
    }
    if (!parsed.metadata.academic_period?.id) {
      errors.push('Informasi Tahun Pelajaran (academic_period_id) tidak ditemukan pada metadata backup.');
    }
  }

  if (!parsed.master_data || typeof parsed.master_data !== 'object') {
    errors.push('Master data (classes, subjects, students, teachers) tidak ditemukan.');
  }

  if (!parsed.period_data || typeof parsed.period_data !== 'object') {
    errors.push('Period data (scores, enrollments, assignments) tidak ditemukan.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  const meta = parsed.metadata as EraporBackupMetadata;
  const period = meta.academic_period;

  // 2. Referential integrity check
  const scores = parsed.period_data.student_subject_scores || [];
  const invalidScorePeriods = scores.filter((s: any) => s.academic_period_id !== period.id);
  if (invalidScorePeriods.length > 0) {
    warnings.push(
      `Terdapat ${invalidScorePeriods.length} baris nilai dengan ID periode yang tidak sesuai dengan metadata backup.`
    );
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    payload: parsed as EraporBackupPayload,
    summary: {
      schoolYear: period.school_year,
      semester: period.semester,
      periodLabel: period.label || `${period.school_year} - Semester ${period.semester}`,
      createdAt: meta.created_at,
      studentCount: parsed.master_data.students?.length || 0,
      teacherCount: parsed.master_data.teachers?.length || 0,
      classCount: parsed.master_data.school_classes?.length || 0,
      subjectCount: parsed.master_data.academic_subjects?.length || 0,
      scoreCount: scores.length,
      loScoreCount: parsed.period_data.student_learning_objective_scores?.length || 0,
      assignmentCount: parsed.period_data.teacher_assignments?.length || 0,
    },
  };
}

/**
 * Upsert records in safe batches to prevent hitting Supabase request payload limits
 */
async function upsertBatch<T extends Record<string, any>>(
  tableName: string,
  records: T[],
  onConflictColumn = 'id',
  batchSize = 100
): Promise<number> {
  if (!records || records.length === 0) return 0;

  let insertedCount = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);
    const { error } = await supabase.from(tableName).upsert(chunk as any, {
      onConflict: onConflictColumn,
    });

    if (error) {
      throw new Error(`Gagal menyimpan ke tabel ${tableName}: ${error.message}`);
    }
    insertedCount += chunk.length;
  }

  return insertedCount;
}

/**
 * Restore e-Rapor data with safe UPSERTs and strictly scoped to the target academic_period.
 * Zero overwrite on other academic periods.
 */
export async function restoreEraporPeriodBackup(
  payload: EraporBackupPayload
): Promise<RestoreResult> {
  ensureConfigured();

  const validation = validateEraporBackupFile(JSON.stringify(payload));
  if (!validation.isValid || !validation.payload) {
    return {
      success: false,
      message: 'Validasi backup gagal. Data tidak dapat dipulihkan.',
      restoredRecords: {},
      errors: validation.errors,
    };
  }

  const { master_data, period_data, metadata } = validation.payload;
  const targetPeriodId = metadata.academic_period.id;

  const restoredCounts: Record<string, number> = {};

  try {
    // 1. Restore Master Data in strict Foreign Key dependency order
    if (master_data.academic_levels?.length > 0) {
      restoredCounts.academic_levels = await upsertBatch('academic_levels', master_data.academic_levels);
    }

    if (master_data.school_classes?.length > 0) {
      restoredCounts.school_classes = await upsertBatch('school_classes', master_data.school_classes);
    }

    if (master_data.academic_subjects?.length > 0) {
      restoredCounts.academic_subjects = await upsertBatch('academic_subjects', master_data.academic_subjects);
    }

    if (master_data.learning_objectives?.length > 0) {
      restoredCounts.learning_objectives = await upsertBatch('learning_objectives', master_data.learning_objectives);
    }

    if (master_data.teachers?.length > 0) {
      restoredCounts.teachers = await upsertBatch('teachers', master_data.teachers);
    }

    if (master_data.students?.length > 0) {
      restoredCounts.students = await upsertBatch('students', master_data.students);
    }

    // 2. Restore Academic Period record
    if (period_data.academic_period) {
      restoredCounts.academic_periods = await upsertBatch('academic_periods', [period_data.academic_period]);
    }

    // 3. Restore Period Data (Strictly scoped with academic_period_id = targetPeriodId)
    if (period_data.student_enrollments?.length > 0) {
      const sanitizedEnrollments = period_data.student_enrollments.map((e) => ({
        ...e,
        academic_period_id: targetPeriodId,
      }));
      restoredCounts.student_enrollments = await upsertBatch('student_enrollments', sanitizedEnrollments);
    }

    if (period_data.teacher_assignments?.length > 0) {
      const sanitizedAssignments = period_data.teacher_assignments.map((a) => ({
        ...a,
        academic_period_id: targetPeriodId,
      }));
      restoredCounts.teacher_assignments = await upsertBatch('teacher_assignments', sanitizedAssignments);
    }

    if (period_data.student_subject_scores?.length > 0) {
      const sanitizedScores = period_data.student_subject_scores.map((s) => ({
        ...s,
        academic_period_id: targetPeriodId,
      }));
      restoredCounts.student_subject_scores = await upsertBatch('student_subject_scores', sanitizedScores);
    }

    if (period_data.student_learning_objective_scores?.length > 0) {
      const sanitizedLoScores = period_data.student_learning_objective_scores.map((lo) => ({
        ...lo,
        academic_period_id: targetPeriodId,
      }));
      restoredCounts.student_learning_objective_scores = await upsertBatch(
        'student_learning_objective_scores',
        sanitizedLoScores
      );
    }

    // 4. Restore Character Descriptors & Records
    if (period_data.character_descriptors && period_data.character_descriptors.length > 0) {
      try {
        await saveCharacterDescriptors(period_data.character_descriptors);
        restoredCounts.character_descriptors = period_data.character_descriptors.length;
      } catch (err) {
        console.warn('Could not restore character descriptors:', err);
      }
    }

    if (period_data.class_character_records) {
      let charClassCount = 0;
      for (const [classKey, rec] of Object.entries(period_data.class_character_records)) {
        try {
          await saveClassCharacterRecords(classKey, rec);
          charClassCount++;
        } catch {
          // Ignore
        }
      }
      restoredCounts.class_character_records = charClassCount;
    }

    // 5. Restore Global Config if present
    if (period_data.global_config && typeof window !== 'undefined') {
      try {
        localStorage.setItem('sdit_rapor_sts_global_config', JSON.stringify(period_data.global_config));
      } catch {
        // Ignore
      }
    }

    return {
      success: true,
      message: `Data e-Rapor untuk ${metadata.academic_period.label} berhasil dipulihkan secara aman.`,
      restoredRecords: restoredCounts,
    };
  } catch (err: any) {
    console.error('Error during e-Rapor restore:', err);
    return {
      success: false,
      message: `Proses restore gagal: ${err?.message || 'Terjadi kesalahan sistem'}`,
      restoredRecords: restoredCounts,
      errors: [err?.message || 'Database error'],
    };
  }
}
