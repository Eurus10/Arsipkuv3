import { supabase, isSupabaseConfigured } from './supabase';
import {
  RaporStsClassData,
  RaporStsConfig,
  RaporSubject,
  StudentSubjectRecord,
  StudentScoreDetail,
  StudentAdditionalInfo,
} from '../types/raporSts';
import { Student } from './studentStorage';
import { fetchRaporSubjectsFromSupabase } from './academicRaporSubjectService';
import { getActiveEraporSession } from './teacherEraporAuthService';

/**
 * Extract numeric grade level (1-6) from class string (e.g., "1A" -> "1", "Kelas 4B" -> "4")
 */
export function getGradeLevel(classLevel: string): string {
  const match = (classLevel || '').match(/\d+/);
  return match ? match[0] : '1';
}

/**
 * Get Merdeka Curriculum Fase based on grade level
 */
export function getFaseFromGrade(grade: string | number): 'Fase A' | 'Fase B' | 'Fase C' {
  const num = typeof grade === 'number' ? grade : parseInt(String(grade).replace(/\D/g, ''), 10) || 1;
  if (num <= 2) return 'Fase A';
  if (num <= 4) return 'Fase B';
  return 'Fase C';
}

// ============================================================
// TYPE DEFINITIONS (SUPABASE DATABASE ROW ENTITIES)
// ============================================================

export interface StudentSubjectScore {
  id: string;
  academic_period_id: string;
  class_id: string;
  student_id: string;
  subject_id: string;
  teacher_id: string | null;
  sts_score: number | null;
  final_score: number | null;
  auto_description: string | null;
  custom_description: string | null;
  teacher_note: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StudentLearningObjectiveScore {
  id: string;
  academic_period_id: string;
  class_id: string;
  student_id: string;
  learning_objective_id: string;
  is_achieved: boolean;
  score: number | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// INPUT PAYLOADS FOR UPSERT
// ============================================================

export interface UpsertSubjectScoreInput {
  id?: string;
  academic_period_id: string;
  class_id: string;
  student_id: string;
  subject_id: string;
  teacher_id?: string | null;
  sts_score?: number | null;
  final_score?: number | null;
  auto_description?: string | null;
  custom_description?: string | null;
  teacher_note?: string | null;
}

export interface UpsertLearningObjectiveScoreInput {
  id?: string;
  academic_period_id: string;
  class_id: string;
  student_id: string;
  learning_objective_id: string;
  is_achieved?: boolean;
  score?: number | null;
}

// ============================================================
// QUERY PARAMETERS
// ============================================================

export interface GetSubjectScoresParams {
  academicPeriodId: string;
  classId: string;
  subjectId: string;
  studentIds?: string[];
}

export interface GetClassSubjectScoresParams {
  academicPeriodId: string;
  classId: string;
  subjectIds?: string[];
  studentIds?: string[];
}

export interface GetLearningObjectiveScoresParams {
  academicPeriodId: string;
  classId: string;
  studentIds?: string[];
  learningObjectiveIds?: string[];
}

export interface DeleteSubjectScoreParams {
  academicPeriodId: string;
  classId: string;
  studentId: string;
  subjectId: string;
}

export interface DeleteLearningObjectiveScoreParams {
  academicPeriodId: string;
  classId: string;
  studentId: string;
  learningObjectiveId: string;
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured or SUPABASE_URL / ANON_KEY is missing.');
  }
}

/**
 * Validates and normalizes numerical score (0 - 100 or null).
 * Throws Error if score is outside valid 0 - 100 range.
 */
export function validateAndSanitizeScore(
  val: number | null | undefined,
  fieldName: string = 'score'
): number | null {
  if (val === null || val === undefined || val === ('' as unknown)) {
    return null;
  }
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) {
    return null;
  }
  if (num < 0 || num > 100) {
    throw new Error(`Invalid ${fieldName}: ${val}. Nilai harus berada dalam rentang 0 sampai 100.`);
  }
  return Math.round(num * 100) / 100;
}

function sanitizeSubjectScorePayload(input: UpsertSubjectScoreInput) {
  if (!input.academic_period_id || !input.academic_period_id.trim()) {
    throw new Error('academic_period_id is required for saving subject score.');
  }
  if (!input.class_id || !input.class_id.trim()) {
    throw new Error('class_id is required for saving subject score.');
  }
  if (!input.student_id || !input.student_id.trim()) {
    throw new Error('student_id is required for saving subject score.');
  }
  if (!input.subject_id || !input.subject_id.trim()) {
    throw new Error('subject_id is required for saving subject score.');
  }

  const stsScore = validateAndSanitizeScore(input.sts_score, 'sts_score');
  const finalScore = validateAndSanitizeScore(input.final_score, 'final_score');

  return {
    ...(input.id ? { id: input.id } : {}),
    academic_period_id: input.academic_period_id.trim(),
    class_id: input.class_id.trim(),
    student_id: input.student_id.trim(),
    subject_id: input.subject_id.trim(),
    teacher_id: input.teacher_id && input.teacher_id.trim() ? input.teacher_id.trim() : null,
    sts_score: stsScore,
    final_score: finalScore !== null ? finalScore : stsScore,
    auto_description: input.auto_description !== undefined ? input.auto_description : null,
    custom_description: input.custom_description !== undefined ? input.custom_description : null,
    teacher_note: input.teacher_note !== undefined ? input.teacher_note : null,
    updated_at: new Date().toISOString(),
  };
}

function sanitizeLearningObjectiveScorePayload(input: UpsertLearningObjectiveScoreInput) {
  if (!input.academic_period_id || !input.academic_period_id.trim()) {
    throw new Error('academic_period_id is required for saving learning objective score.');
  }
  if (!input.class_id || !input.class_id.trim()) {
    throw new Error('class_id is required for saving learning objective score.');
  }
  if (!input.student_id || !input.student_id.trim()) {
    throw new Error('student_id is required for saving learning objective score.');
  }
  if (!input.learning_objective_id || !input.learning_objective_id.trim()) {
    throw new Error('learning_objective_id is required for saving learning objective score.');
  }

  const score = validateAndSanitizeScore(input.score, 'learning_objective score');

  return {
    ...(input.id ? { id: input.id } : {}),
    academic_period_id: input.academic_period_id.trim(),
    class_id: input.class_id.trim(),
    student_id: input.student_id.trim(),
    learning_objective_id: input.learning_objective_id.trim(),
    is_achieved: Boolean(input.is_achieved),
    score: score,
    updated_at: new Date().toISOString(),
  };
}

// ============================================================
// READ METHODS (LOAD SCORES)
// ============================================================

/**
 * Load subject scores for a specific academic period, class, and subject.
 */
export async function getSubjectScores(
  params: GetSubjectScoresParams
): Promise<StudentSubjectScore[]> {
  ensureSupabaseConfigured();

  const { academicPeriodId, classId, subjectId, studentIds } = params;

  if (!academicPeriodId || !classId || !subjectId) {
    throw new Error('academicPeriodId, classId, and subjectId are required to get subject scores.');
  }

  let query = supabase
    .from('student_subject_scores')
    .select('*')
    .eq('academic_period_id', academicPeriodId)
    .eq('class_id', classId)
    .eq('subject_id', subjectId);

  if (studentIds && studentIds.length > 0) {
    query = query.in('student_id', studentIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error in getSubjectScores from Supabase:', error);
    throw new Error(`Failed to load subject scores: ${error.message} (${error.code || 'UNKNOWN'})`);
  }

  return (data || []) as StudentSubjectScore[];
}

/**
 * Load all subject scores for a whole class in an academic period (e.g. for Leger or multi-subject views).
 */
export async function getClassSubjectScores(
  params: GetClassSubjectScoresParams
): Promise<StudentSubjectScore[]> {
  ensureSupabaseConfigured();

  const { academicPeriodId, classId, subjectIds, studentIds } = params;

  if (!academicPeriodId || !classId) {
    throw new Error('academicPeriodId and classId are required to get class subject scores.');
  }

  let query = supabase
    .from('student_subject_scores')
    .select('*')
    .eq('academic_period_id', academicPeriodId)
    .eq('class_id', classId);

  if (subjectIds && subjectIds.length > 0) {
    query = query.in('subject_id', subjectIds);
  }

  if (studentIds && studentIds.length > 0) {
    query = query.in('student_id', studentIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error in getClassSubjectScores from Supabase:', error);
    throw new Error(`Failed to load class subject scores: ${error.message} (${error.code || 'UNKNOWN'})`);
  }

  return (data || []) as StudentSubjectScore[];
}

/**
 * Load learning objective (TP) scores / achievements for an academic period and class.
 */
export async function getLearningObjectiveScores(
  params: GetLearningObjectiveScoresParams
): Promise<StudentLearningObjectiveScore[]> {
  ensureSupabaseConfigured();

  const { academicPeriodId, classId, studentIds, learningObjectiveIds } = params;

  if (!academicPeriodId || !classId) {
    throw new Error('academicPeriodId and classId are required to get learning objective scores.');
  }

  let query = supabase
    .from('student_learning_objective_scores')
    .select('*')
    .eq('academic_period_id', academicPeriodId)
    .eq('class_id', classId);

  if (studentIds && studentIds.length > 0) {
    query = query.in('student_id', studentIds);
  }

  if (learningObjectiveIds && learningObjectiveIds.length > 0) {
    query = query.in('learning_objective_id', learningObjectiveIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error in getLearningObjectiveScores from Supabase:', error);
    throw new Error(
      `Failed to load learning objective scores: ${error.message} (${error.code || 'UNKNOWN'})`
    );
  }

  return (data || []) as StudentLearningObjectiveScore[];
}

// ============================================================
// WRITE METHODS (UPSERT SCORES)
// ============================================================

/**
 * Save / Upsert a single student's subject score.
 * Uses unique conflict target: (academic_period_id, class_id, student_id, subject_id).
 */
export async function upsertSubjectScore(
  input: UpsertSubjectScoreInput
): Promise<StudentSubjectScore> {
  ensureSupabaseConfigured();

  const payload = sanitizeSubjectScorePayload(input);

  const { data, error } = await supabase
    .from('student_subject_scores')
    .upsert(payload, {
      onConflict: 'academic_period_id,class_id,student_id,subject_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error in upsertSubjectScore to Supabase:', error, { payload });
    throw new Error(`Failed to save subject score: ${error.message} (${error.code || 'UNKNOWN'})`);
  }

  return data as StudentSubjectScore;
}

/**
 * Batch Upsert multiple subject scores in a single database request.
 * Uses unique conflict target: (academic_period_id, class_id, student_id, subject_id).
 */
export async function upsertSubjectScores(
  inputs: UpsertSubjectScoreInput[]
): Promise<StudentSubjectScore[]> {
  ensureSupabaseConfigured();

  if (!inputs || inputs.length === 0) {
    return [];
  }

  const payloads = inputs.map(sanitizeSubjectScorePayload);

  const { data, error } = await supabase
    .from('student_subject_scores')
    .upsert(payloads, {
      onConflict: 'academic_period_id,class_id,student_id,subject_id',
    })
    .select();

  if (error) {
    console.error('Error in upsertSubjectScores batch to Supabase:', error, { count: inputs.length });
    throw new Error(`Failed to batch save subject scores: ${error.message} (${error.code || 'UNKNOWN'})`);
  }

  return (data || []) as StudentSubjectScore[];
}

/**
 * Save / Upsert a single student's Learning Objective (TP) score.
 * Uses unique conflict target: (academic_period_id, class_id, student_id, learning_objective_id).
 */
export async function upsertLearningObjectiveScore(
  input: UpsertLearningObjectiveScoreInput
): Promise<StudentLearningObjectiveScore> {
  ensureSupabaseConfigured();

  const payload = sanitizeLearningObjectiveScorePayload(input);

  const { data, error } = await supabase
    .from('student_learning_objective_scores')
    .upsert(payload, {
      onConflict: 'academic_period_id,class_id,student_id,learning_objective_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error in upsertLearningObjectiveScore to Supabase:', error, { payload });
    throw new Error(
      `Failed to save learning objective score: ${error.message} (${error.code || 'UNKNOWN'})`
    );
  }

  return data as StudentLearningObjectiveScore;
}

/**
 * Batch Upsert multiple Learning Objective (TP) scores in a single database request.
 * Uses unique conflict target: (academic_period_id, class_id, student_id, learning_objective_id).
 */
export async function upsertLearningObjectiveScores(
  inputs: UpsertLearningObjectiveScoreInput[]
): Promise<StudentLearningObjectiveScore[]> {
  ensureSupabaseConfigured();

  if (!inputs || inputs.length === 0) {
    return [];
  }

  const payloads = inputs.map(sanitizeLearningObjectiveScorePayload);

  const { data, error } = await supabase
    .from('student_learning_objective_scores')
    .upsert(payloads, {
      onConflict: 'academic_period_id,class_id,student_id,learning_objective_id',
    })
    .select();

  if (error) {
    console.error('Error in upsertLearningObjectiveScores batch to Supabase:', error, {
      count: inputs.length,
    });
    throw new Error(
      `Failed to batch save learning objective scores: ${error.message} (${error.code || 'UNKNOWN'})`
    );
  }

  return (data || []) as StudentLearningObjectiveScore[];
}

// ============================================================
// DELETE METHODS
// ============================================================

/**
 * Delete a specific student subject score with precise context.
 */
export async function deleteSubjectScore(params: DeleteSubjectScoreParams): Promise<void> {
  ensureSupabaseConfigured();

  const { academicPeriodId, classId, studentId, subjectId } = params;

  if (!academicPeriodId || !classId || !studentId || !subjectId) {
    throw new Error('All context parameters are required to delete a subject score.');
  }

  const { error } = await supabase
    .from('student_subject_scores')
    .delete()
    .eq('academic_period_id', academicPeriodId)
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .eq('subject_id', subjectId);

  if (error) {
    console.error('Error in deleteSubjectScore from Supabase:', error);
    throw new Error(`Failed to delete subject score: ${error.message} (${error.code || 'UNKNOWN'})`);
  }
}

/**
 * Delete a specific student learning objective score with precise context.
 */
export async function deleteLearningObjectiveScore(
  params: DeleteLearningObjectiveScoreParams
): Promise<void> {
  ensureSupabaseConfigured();

  const { academicPeriodId, classId, studentId, learningObjectiveId } = params;

  if (!academicPeriodId || !classId || !studentId || !learningObjectiveId) {
    throw new Error('All context parameters are required to delete a learning objective score.');
  }

  const { error } = await supabase
    .from('student_learning_objective_scores')
    .delete()
    .eq('academic_period_id', academicPeriodId)
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .eq('learning_objective_id', learningObjectiveId);

  if (error) {
    console.error('Error in deleteLearningObjectiveScore from Supabase:', error);
    throw new Error(
      `Failed to delete learning objective score: ${error.message} (${error.code || 'UNKNOWN'})`
    );
  }
}

// ============================================================
// WORKSPACE INTEGRATION METHODS (CLEAN SUPABASE ARCHITECTURE)
// ============================================================

export interface LoadRaporWorkspaceParams {
  academicPeriodId: string;
  classId: string;
  className: string;
  semester: '1' | '2';
  schoolYear: string;
  academicLevelId: string;
  students: Student[];
  teacherName?: string | null;
  teacherNip?: string | null;
}

/**
 * Loads entire class dataset for e-Rapor directly from Supabase.
 * - Subjects & TPs: from academic_subjects & learning_objectives (via fetchRaporSubjectsFromSupabase)
 * - Subject Scores: from student_subject_scores
 * - TP Scores: from student_learning_objective_scores
 *
 * ZERO dependencies on Cloud Firestore or legacy local caches.
 * Clean start: If Supabase has no data, returns a clean empty state without fallback.
 */
export async function loadRaporWorkspaceFromSupabase(
  params: LoadRaporWorkspaceParams
): Promise<RaporStsClassData> {
  ensureSupabaseConfigured();

  const {
    academicPeriodId,
    classId,
    className,
    semester,
    schoolYear,
    academicLevelId,
    students,
    teacherName,
    teacherNip,
  } = params;

  if (!academicPeriodId || !classId) {
    throw new Error('academicPeriodId dan classId wajib diisi untuk memuat data e-Rapor.');
  }

  // 1. Ambil Master Mapel dan TP aktif dari Supabase
  const subjects = await fetchRaporSubjectsFromSupabase(academicLevelId);

  // 2. Ambil seluruh nilai mapel dan nilai TP rombel ini pada periode aktif
  const [subjectScores, loScores] = await Promise.all([
    getClassSubjectScores({ academicPeriodId, classId }),
    getLearningObjectiveScores({ academicPeriodId, classId }),
  ]);

  // Index untuk pencarian O(1)
  const subjectScoreMap = new Map<string, StudentSubjectScore>();
  for (const score of subjectScores) {
    subjectScoreMap.set(`${score.subject_id}___${score.student_id}`, score);
  }

  const loScoreMap = new Map<string, StudentLearningObjectiveScore>();
  for (const loScore of loScores) {
    loScoreMap.set(`${loScore.learning_objective_id}___${loScore.student_id}`, loScore);
  }

  // 3. Susun subjectRecords
  const subjectRecords: Record<string, StudentSubjectRecord> = {};

  for (const subject of subjects) {
    const scores: Record<string, StudentScoreDetail> = {};

    for (const student of students) {
      const subScore = subjectScoreMap.get(`${subject.id}___${student.id}`);
      const tpScores: Record<string, number | null> = {};
      const tpAchieved: Record<string, boolean> = {};

      for (const tp of subject.tpList) {
        const loScore = loScoreMap.get(`${tp.id}___${student.id}`);
        if (loScore) {
          tpScores[tp.id] = loScore.score;
          tpAchieved[tp.id] = loScore.is_achieved;
        } else {
          tpScores[tp.id] = null;
          tpAchieved[tp.id] = false;
        }
      }

      scores[student.id] = {
        studentId: student.id,
        studentName: student.name,
        nisn: student.nisn || '',
        nis: student.nim || '',
        tpScores,
        tpAchieved,
        stsScore: subScore?.sts_score ?? null,
        finalScore: subScore?.final_score ?? null,
        autoDescription: subScore?.auto_description || '',
        customDescription: subScore?.custom_description || '',
        teacherNote: subScore?.teacher_note || '',
      };
    }

    subjectRecords[subject.id] = {
      subjectId: subject.id,
      scores,
    };
  }

  // 4. Konfigurasi Rapor (Kop Sekolah, Titimangsa, Kepala Sekolah)
  let storedPref: Partial<RaporStsConfig> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('sdit_rapor_sts_config_pref');
      if (raw) {
        storedPref = JSON.parse(raw);
      }
    } catch {
      // Abaikan jika tidak ada cache UI
    }
  }

  const gradeLevel = getGradeLevel(className);
  const config: RaporStsConfig = {
    schoolName: storedPref.schoolName || 'SDIT AL FIKRI',
    npsn: storedPref.npsn || '20276221',
    schoolAddress: storedPref.schoolAddress || 'Jl. Raden Saleh No. 56, Sukmajaya, Kota Depok',
    classLevel: className,
    fase: getFaseFromGrade(gradeLevel),
    semester,
    schoolYear,
    teacherName: teacherName || storedPref.teacherName || '',
    teacherNip: teacherNip || storedPref.teacherNip || '-',
    headmasterName: storedPref.headmasterName || 'Muhamad Rusdi, S.Pd.',
    headmasterNip: storedPref.headmasterNip || '-',
    reportDatePlace: storedPref.reportDatePlace || 'Depok, 20 Maret 2025',
    tpWeight: storedPref.tpWeight ?? 60,
    stsWeight: storedPref.stsWeight ?? 40,
    passingGrade: storedPref.passingGrade ?? 75,
    classTeachers: storedPref.classTeachers,
  };

  // 5. Additional Info (Kehadiran & Catatan)
  const additionalInfo: Record<string, StudentAdditionalInfo> = {};
  for (const student of students) {
    additionalInfo[student.id] = {
      studentId: student.id,
      attendance: { sakit: 0, izin: 0, alpha: 0 },
      extracurriculars: [],
      teacherNotes: '',
    };
  }

  const safeYear = schoolYear.replace('/', '-');
  const classKey = `${className.toUpperCase()}_${safeYear}_sem${semester}`;

  return {
    id: classKey,
    config,
    subjects,
    subjectRecords,
    additionalInfo,
    lastModified: new Date().toISOString(),
  };
}

export interface SaveRaporWorkspaceParams {
  academicPeriodId: string;
  classId: string;
  teacherId?: string | null;
  classData: RaporStsClassData;
  subjectIdFilter?: string;
}

export interface SaveRaporWorkspaceResult {
  success: boolean;
  savedSubjectCount: number;
  savedLoCount: number;
  error?: string;
}

/**
 * Saves e-Rapor class data directly to Supabase via batch upserts.
 * - Writes to student_subject_scores
 * - Writes to student_learning_objective_scores
 *
 * ZERO writes to Cloud Firestore.
 */
export async function saveRaporWorkspaceToSupabase(
  params: SaveRaporWorkspaceParams
): Promise<SaveRaporWorkspaceResult> {
  ensureSupabaseConfigured();

  const { academicPeriodId, classId, teacherId, classData, subjectIdFilter } = params;

  if (!academicPeriodId || !classId) {
    throw new Error('academicPeriodId dan classId wajib diisi untuk menyimpan nilai ke Supabase.');
  }

  const subjectScoreInputs: UpsertSubjectScoreInput[] = [];
  const loScoreInputs: UpsertLearningObjectiveScoreInput[] = [];

  const subjectRecordEntries = Object.entries(classData.subjectRecords || {});

  for (const [subjectId, subjectRecord] of subjectRecordEntries) {
    if (subjectIdFilter && subjectId !== subjectIdFilter) {
      continue;
    }

    const scoreDetails = Object.values(subjectRecord.scores || {});

    // Identifikasi seluruh ID TP yang dimiliki oleh mapel ini
    const subjMaster = (classData.subjects || []).find((s) => s.id === subjectId);
    const subjectTpIds = new Set<string>();
    (subjMaster?.tpList || []).forEach((tp) => subjectTpIds.add(tp.id));
    scoreDetails.forEach((sc) => {
      Object.keys(sc.tpScores || {}).forEach((id) => subjectTpIds.add(id));
      Object.keys(sc.tpAchieved || {}).forEach((id) => subjectTpIds.add(id));
    });

    for (const scoreDetail of scoreDetails) {
      // Selalu sertakan setiap siswa dalam subjectScoreInputs agar perubahan nilai ke null/kosong
      // benar-benar ter-update di database Supabase (memperbaiki bug nilai lama 85 tertinggal saat di-clear).
      subjectScoreInputs.push({
        academic_period_id: academicPeriodId,
        class_id: classId,
        student_id: scoreDetail.studentId,
        subject_id: subjectId,
        teacher_id: teacherId || null,
        sts_score: scoreDetail.stsScore !== undefined ? scoreDetail.stsScore : null,
        final_score: scoreDetail.finalScore !== undefined ? scoreDetail.finalScore : null,
        auto_description: scoreDetail.autoDescription ? scoreDetail.autoDescription.trim() || null : null,
        custom_description: scoreDetail.customDescription ? scoreDetail.customDescription.trim() || null : null,
        teacher_note: scoreDetail.teacherNote ? scoreDetail.teacherNote.trim() || null : null,
      });

      // Simpan capaian per TP untuk setiap butir TP aktif maupun historis
      for (const tpId of subjectTpIds) {
        const achieved = scoreDetail.tpAchieved?.[tpId];
        const tpScore = scoreDetail.tpScores?.[tpId];
        loScoreInputs.push({
          academic_period_id: academicPeriodId,
          class_id: classId,
          student_id: scoreDetail.studentId,
          learning_objective_id: tpId,
          is_achieved:
            achieved !== undefined
              ? Boolean(achieved)
              : tpScore !== null && tpScore !== undefined
              ? tpScore >= (classData.config.passingGrade || 75)
              : false,
          score: tpScore !== undefined ? tpScore : null,
        });
      }
    }
  }

  // Eksekusi batch upsert ke Supabase
  const session = getActiveEraporSession();
  const sessionToken = session?.sessionToken;

  if (sessionToken && isSupabaseConfigured()) {
    try {
      // 1. Eksekusi penyimpanan nilai mapel via RPC terpercaya
      for (const [subjectId, subjectRecord] of subjectRecordEntries) {
        if (subjectIdFilter && subjectId !== subjectIdFilter) continue;

        const inputsForSubject = subjectScoreInputs.filter((s) => s.subject_id === subjectId);
        if (inputsForSubject.length > 0) {
          const { error: rpcSubErr } = await supabase.rpc('erapor_save_subject_scores', {
            p_session_token: sessionToken,
            p_academic_period_id: academicPeriodId,
            p_class_id: classId,
            p_subject_id: subjectId,
            p_scores: inputsForSubject,
          });

          if (rpcSubErr) {
            console.error('RPC erapor_save_subject_scores error:', rpcSubErr);
            throw new Error(`Gagal menyimpan nilai: ${rpcSubErr.message || 'Izin ditolak oleh database.'}`);
          }
        }

        // Ambil seluruh LO score input yang ditujukan untuk TP pada mapel ini
        const subjMaster = (classData.subjects || []).find((s) => s.id === subjectId);
        const subjectTpIds = new Set<string>();
        (subjMaster?.tpList || []).forEach((tp) => subjectTpIds.add(tp.id));
        const tpObj = subjectRecord.scores;
        Object.values(tpObj || {}).forEach((sc) => {
          Object.keys(sc.tpScores || {}).forEach((id) => subjectTpIds.add(id));
          Object.keys(sc.tpAchieved || {}).forEach((id) => subjectTpIds.add(id));
        });

        const loInputsForSubject = loScoreInputs.filter((lo) => subjectTpIds.has(lo.learning_objective_id));

        if (loInputsForSubject.length > 0) {
          const { error: rpcLoErr } = await supabase.rpc('erapor_save_lo_scores', {
            p_session_token: sessionToken,
            p_academic_period_id: academicPeriodId,
            p_class_id: classId,
            p_subject_id: subjectId,
            p_scores: loInputsForSubject,
          });

          if (rpcLoErr) {
            console.error('RPC erapor_save_lo_scores error:', rpcLoErr);
            throw new Error(`Gagal menyimpan capaian TP: ${rpcLoErr.message || 'Izin ditolak oleh database.'}`);
          }
        }
      }

      return {
        success: true,
        savedSubjectCount: subjectScoreInputs.length,
        savedLoCount: loScoreInputs.length,
      };
    } catch (rpcExecutionErr: any) {
      // Jika error adalah error otorisasi (42501 / Forbidden / Unauthorized), lemparkan langsung
      if (
        rpcExecutionErr?.message?.includes('Unauthorized') ||
        rpcExecutionErr?.message?.includes('Forbidden') ||
        rpcExecutionErr?.message?.includes('Izin ditolak')
      ) {
        throw rpcExecutionErr;
      }
      console.warn('RPC unavailable or fallback needed:', rpcExecutionErr);
    }
  }

  // Fallback direct batch upsert jika RPC belum ter-apply di Supabase environment
  if (subjectScoreInputs.length > 0) {
    await upsertSubjectScores(subjectScoreInputs);
  }

  if (loScoreInputs.length > 0) {
    await upsertLearningObjectiveScores(loScoreInputs);
  }

  return {
    success: true,
    savedSubjectCount: subjectScoreInputs.length,
    savedLoCount: loScoreInputs.length,
  };
}
