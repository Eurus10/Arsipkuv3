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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let classUuidCache = new Map<string, string>();
let subjectUuidCache = new Map<string, string>();
let studentUuidCache = new Map<string, string>();
let loUuidCache = new Map<string, string>();

async function resolveClassIdToUuid(classId: string): Promise<string> {
  if (!classId) return classId;
  if (UUID_REGEX.test(classId)) return classId;
  if (classUuidCache.has(classId)) return classUuidCache.get(classId)!;

  try {
    const { data } = await supabase.from('school_classes').select('id, name');
    if (data) {
      for (const cls of data) {
        classUuidCache.set(cls.id, cls.id);
        classUuidCache.set(cls.name, cls.id);
        classUuidCache.set(cls.name.toLowerCase().replace(/[^a-z0-9]/g, ''), cls.id);
      }
    }
  } catch (e) {
    // ignore
  }

  const clean = classId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (classUuidCache.has(classId)) return classUuidCache.get(classId)!;
  if (classUuidCache.has(clean)) return classUuidCache.get(clean)!;

  for (const [key, uuid] of classUuidCache.entries()) {
    if (key.includes(clean) || clean.includes(key)) {
      return uuid;
    }
  }

  return classId;
}

async function resolveSubjectIdToUuid(subjectId: string): Promise<string> {
  if (!subjectId) return subjectId;
  if (UUID_REGEX.test(subjectId)) return subjectId;
  if (subjectUuidCache.has(subjectId)) return subjectUuidCache.get(subjectId)!;

  try {
    const { data } = await supabase.from('academic_subjects').select('id, name, code');
    if (data) {
      for (const subj of data) {
        subjectUuidCache.set(subj.id, subj.id);
        if (subj.code) {
          subjectUuidCache.set(subj.code, subj.id);
          subjectUuidCache.set(subj.code.toLowerCase().replace(/[^a-z0-9]/g, ''), subj.id);
        }
        subjectUuidCache.set(subj.name, subj.id);
        subjectUuidCache.set(subj.name.toLowerCase().replace(/[^a-z0-9]/g, ''), subj.id);
      }
    }
  } catch (e) {
    // ignore
  }

  const clean = subjectId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (subjectUuidCache.has(subjectId)) return subjectUuidCache.get(subjectId)!;
  if (subjectUuidCache.has(clean)) return subjectUuidCache.get(clean)!;

  for (const [key, uuid] of subjectUuidCache.entries()) {
    if (clean.includes(key) || key.includes(clean)) {
      return uuid;
    }
  }

  return subjectId;
}

async function resolveStudentIdToUuid(studentId: string): Promise<string> {
  if (!studentId) return studentId;
  if (UUID_REGEX.test(studentId)) return studentId;
  if (studentUuidCache.has(studentId)) return studentUuidCache.get(studentId)!;

  try {
    const { data } = await supabase.from('students').select('id, name, nisn, nim');
    if (data) {
      for (const st of data) {
        studentUuidCache.set(st.id, st.id);
        studentUuidCache.set(st.name, st.id);
        if (st.nisn) studentUuidCache.set(st.nisn, st.id);
        if (st.nim) studentUuidCache.set(st.nim, st.id);
      }
    }
  } catch (e) {
    // ignore
  }

  if (studentUuidCache.has(studentId)) return studentUuidCache.get(studentId)!;
  return studentId;
}

async function resolveLoIdToUuid(loId: string): Promise<string> {
  if (!loId) return loId;
  if (UUID_REGEX.test(loId)) return loId;
  if (loUuidCache.has(loId)) return loUuidCache.get(loId)!;

  try {
    const { data } = await supabase.from('learning_objectives').select('id, code');
    if (data) {
      for (const lo of data) {
        loUuidCache.set(lo.id, lo.id);
        if (lo.code) loUuidCache.set(lo.code, lo.id);
      }
    }
  } catch (e) {
    // ignore
  }

  if (loUuidCache.has(loId)) return loUuidCache.get(loId)!;
  return loId;
}

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

async function sanitizeSubjectScorePayload(input: UpsertSubjectScoreInput) {
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

  const classUuid = await resolveClassIdToUuid(input.class_id.trim());
  const studentUuid = await resolveStudentIdToUuid(input.student_id.trim());
  const subjectUuid = await resolveSubjectIdToUuid(input.subject_id.trim());
  const teacherUuid = input.teacher_id && input.teacher_id.trim() ? await resolveStudentIdToUuid(input.teacher_id.trim()) : null;

  const stsScore = validateAndSanitizeScore(input.sts_score, 'sts_score');
  const finalScore = validateAndSanitizeScore(input.final_score, 'final_score');

  return {
    ...(input.id && UUID_REGEX.test(input.id) ? { id: input.id } : {}),
    academic_period_id: input.academic_period_id.trim(),
    class_id: classUuid,
    student_id: studentUuid,
    subject_id: subjectUuid,
    teacher_id: teacherUuid,
    sts_score: stsScore,
    final_score: finalScore !== null ? finalScore : stsScore,
    auto_description: input.auto_description !== undefined ? input.auto_description : null,
    custom_description: input.custom_description !== undefined ? input.custom_description : null,
    teacher_note: input.teacher_note !== undefined ? input.teacher_note : null,
    updated_at: new Date().toISOString(),
  };
}

async function sanitizeLearningObjectiveScorePayload(input: UpsertLearningObjectiveScoreInput) {
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

  const classUuid = await resolveClassIdToUuid(input.class_id.trim());
  const studentUuid = await resolveStudentIdToUuid(input.student_id.trim());
  const loUuid = await resolveLoIdToUuid(input.learning_objective_id.trim());

  const score = validateAndSanitizeScore(input.score, 'learning_objective score');

  return {
    ...(input.id && UUID_REGEX.test(input.id) ? { id: input.id } : {}),
    academic_period_id: input.academic_period_id.trim(),
    class_id: classUuid,
    student_id: studentUuid,
    learning_objective_id: loUuid,
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

  const resolvedClassId = await resolveClassIdToUuid(classId);
  const resolvedSubjectId = await resolveSubjectIdToUuid(subjectId);
  const resolvedStudentIds = studentIds && studentIds.length > 0
    ? await Promise.all(studentIds.map(resolveStudentIdToUuid))
    : undefined;

  let query = supabase
    .from('student_subject_scores')
    .select('*')
    .eq('academic_period_id', academicPeriodId)
    .eq('class_id', resolvedClassId)
    .eq('subject_id', resolvedSubjectId);

  if (resolvedStudentIds && resolvedStudentIds.length > 0) {
    query = query.in('student_id', resolvedStudentIds);
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

  const resolvedClassId = await resolveClassIdToUuid(classId);
  const resolvedSubjectIds = subjectIds && subjectIds.length > 0
    ? await Promise.all(subjectIds.map(resolveSubjectIdToUuid))
    : undefined;
  const resolvedStudentIds = studentIds && studentIds.length > 0
    ? await Promise.all(studentIds.map(resolveStudentIdToUuid))
    : undefined;

  let query = supabase
    .from('student_subject_scores')
    .select('*')
    .eq('academic_period_id', academicPeriodId)
    .eq('class_id', resolvedClassId);

  if (resolvedSubjectIds && resolvedSubjectIds.length > 0) {
    query = query.in('subject_id', resolvedSubjectIds);
  }

  if (resolvedStudentIds && resolvedStudentIds.length > 0) {
    query = query.in('student_id', resolvedStudentIds);
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

  const resolvedClassId = await resolveClassIdToUuid(classId);
  const resolvedStudentIds = studentIds && studentIds.length > 0
    ? await Promise.all(studentIds.map(resolveStudentIdToUuid))
    : undefined;
  const resolvedLoIds = learningObjectiveIds && learningObjectiveIds.length > 0
    ? await Promise.all(learningObjectiveIds.map(resolveLoIdToUuid))
    : undefined;

  let query = supabase
    .from('student_learning_objective_scores')
    .select('*')
    .eq('academic_period_id', academicPeriodId)
    .eq('class_id', resolvedClassId);

  if (resolvedStudentIds && resolvedStudentIds.length > 0) {
    query = query.in('student_id', resolvedStudentIds);
  }

  if (resolvedLoIds && resolvedLoIds.length > 0) {
    query = query.in('learning_objective_id', resolvedLoIds);
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

  const payload = await sanitizeSubjectScorePayload(input);

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

  const payloads = await Promise.all(inputs.map(sanitizeSubjectScorePayload));

  // Deduplicate payloads by unique conflict key (academic_period_id, class_id, student_id, subject_id)
  const uniqueMap = new Map<string, any>();
  for (const p of payloads) {
    const key = `${p.academic_period_id}_${p.class_id}_${p.student_id}_${p.subject_id}`;
    uniqueMap.set(key, p);
  }
  const deduplicatedPayloads = Array.from(uniqueMap.values());

  const { data, error } = await supabase
    .from('student_subject_scores')
    .upsert(deduplicatedPayloads, {
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

  const payload = await sanitizeLearningObjectiveScorePayload(input);

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

  const payloads = await Promise.all(inputs.map(sanitizeLearningObjectiveScorePayload));

  // Deduplicate payloads by unique conflict key (academic_period_id, class_id, student_id, learning_objective_id)
  const uniqueMap = new Map<string, any>();
  for (const p of payloads) {
    const key = `${p.academic_period_id}_${p.class_id}_${p.student_id}_${p.learning_objective_id}`;
    uniqueMap.set(key, p);
  }
  const deduplicatedPayloads = Array.from(uniqueMap.values());

  const { data, error } = await supabase
    .from('student_learning_objective_scores')
    .upsert(deduplicatedPayloads, {
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

  const resolvedClassId = await resolveClassIdToUuid(classId);
  const resolvedStudentId = await resolveStudentIdToUuid(studentId);
  const resolvedSubjectId = await resolveSubjectIdToUuid(subjectId);

  const { error } = await supabase
    .from('student_subject_scores')
    .delete()
    .eq('academic_period_id', academicPeriodId)
    .eq('class_id', resolvedClassId)
    .eq('student_id', resolvedStudentId)
    .eq('subject_id', resolvedSubjectId);

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

  const resolvedClassId = await resolveClassIdToUuid(classId);
  const resolvedStudentId = await resolveStudentIdToUuid(studentId);
  const resolvedLoId = await resolveLoIdToUuid(learningObjectiveId);

  const { error } = await supabase
    .from('student_learning_objective_scores')
    .delete()
    .eq('academic_period_id', academicPeriodId)
    .eq('class_id', resolvedClassId)
    .eq('student_id', resolvedStudentId)
    .eq('learning_objective_id', resolvedLoId);

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

  // 4. Konfigurasi Rapor (Sinkron Otomatis dari Pengaturan Admin Terpusat)
  let globalAdminConfig: Partial<RaporStsConfig> = {};
  let gradeRangePref: { passingGrade?: number } = {};

  if (typeof window !== 'undefined') {
    try {
      const rawGlobal = localStorage.getItem('sdit_rapor_sts_global_config');
      if (rawGlobal) {
        globalAdminConfig = JSON.parse(rawGlobal);
      }
    } catch {
      // Abaikan jika parsing gagal
    }

    try {
      const rawPref = localStorage.getItem('sdit_rapor_sts_config_pref');
      if (rawPref) {
        globalAdminConfig = { ...JSON.parse(rawPref), ...globalAdminConfig };
      }
    } catch {
      // Abaikan
    }

    try {
      const rawGrade = localStorage.getItem('sdit_academic_grade_range_config');
      if (rawGrade) {
        gradeRangePref = JSON.parse(rawGrade);
      }
    } catch {
      // Abaikan
    }
  }

  const gradeLevel = getGradeLevel(className);
  const classWalas = globalAdminConfig.classTeachers?.[className];

  const config: RaporStsConfig = {
    schoolName: globalAdminConfig.schoolName || 'SDIT AL FIKRI',
    npsn: globalAdminConfig.npsn || '69978648',
    schoolAddress: globalAdminConfig.schoolAddress || 'Jl. Raden Saleh No. 42, Sukmajaya, Depok',
    classLevel: className,
    fase: getFaseFromGrade(gradeLevel),
    semester,
    schoolYear,
    teacherName: teacherName || classWalas?.name || globalAdminConfig.teacherName || 'Guru Kelas',
    teacherNip: teacherNip || classWalas?.nip || globalAdminConfig.teacherNip || '-',
    headmasterName: globalAdminConfig.headmasterName || 'Muhamad Rusdi, S.Pd.',
    headmasterNip: globalAdminConfig.headmasterNip || '-',
    reportDatePlace: globalAdminConfig.reportDatePlace || 'Depok, 20 Maret 2025',
    tpWeight: globalAdminConfig.tpWeight ?? 50,
    stsWeight: globalAdminConfig.stsWeight ?? 50,
    passingGrade: gradeRangePref.passingGrade ?? globalAdminConfig.passingGrade ?? 75,
    classTeachers: globalAdminConfig.classTeachers,
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

  interface SubjectBatchTask {
    subjectId: string;
    subjectInputs: UpsertSubjectScoreInput[];
    loInputs: UpsertLearningObjectiveScoreInput[];
  }

  const tasks: SubjectBatchTask[] = [];
  const allSubjectScoreInputs: UpsertSubjectScoreInput[] = [];
  const allLoScoreInputs: UpsertLearningObjectiveScoreInput[] = [];

  const subjectRecordEntries = Object.entries(classData.subjectRecords || {});

  for (const [subjectId, subjectRecord] of subjectRecordEntries) {
    if (subjectIdFilter && subjectId !== subjectIdFilter) {
      continue;
    }

    const scoreDetails = Object.values(subjectRecord.scores || {});
    if (scoreDetails.length === 0) continue;

    // Identifikasi seluruh ID TP yang dimiliki oleh mapel ini
    const subjMaster = (classData.subjects || []).find((s) => s.id === subjectId);
    const subjectTpIds = new Set<string>();
    (subjMaster?.tpList || []).forEach((tp) => subjectTpIds.add(tp.id));
    scoreDetails.forEach((sc) => {
      Object.keys(sc.tpScores || {}).forEach((id) => subjectTpIds.add(id));
      Object.keys(sc.tpAchieved || {}).forEach((id) => subjectTpIds.add(id));
    });

    const inputsForSubject: UpsertSubjectScoreInput[] = [];
    const loInputsForSubject: UpsertLearningObjectiveScoreInput[] = [];

    for (const scoreDetail of scoreDetails) {
      // Selalu sertakan setiap siswa dalam subjectScoreInputs agar perubahan nilai ke null/kosong
      // benar-benar ter-update di database Supabase (memperbaiki bug nilai lama 85 tertinggal saat di-clear).
      inputsForSubject.push({
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
        loInputsForSubject.push({
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

    if (inputsForSubject.length > 0 || loInputsForSubject.length > 0) {
      tasks.push({
        subjectId,
        subjectInputs: inputsForSubject,
        loInputs: loInputsForSubject,
      });
      allSubjectScoreInputs.push(...inputsForSubject);
      allLoScoreInputs.push(...loInputsForSubject);
    }
  }

  // Eksekusi batch upsert ke Supabase
  const session = getActiveEraporSession();
  const sessionToken = session?.sessionToken;

  if (sessionToken && isSupabaseConfigured() && tasks.length > 0) {
    try {
      // 1. Eksekusi penyimpanan nilai mapel via RPC terpercaya secara concurrent (paralel per batch)
      const saveTaskViaRpc = async (task: SubjectBatchTask) => {
        const promises: Promise<void>[] = [];

        if (task.subjectInputs.length > 0) {
          promises.push((async () => {
            const { error: rpcSubErr } = await supabase.rpc('erapor_save_subject_scores', {
              p_session_token: sessionToken,
              p_academic_period_id: academicPeriodId,
              p_class_id: classId,
              p_subject_id: task.subjectId,
              p_scores: task.subjectInputs,
            });
            if (rpcSubErr) {
              console.error('RPC erapor_save_subject_scores error:', rpcSubErr);
              throw new Error(`Gagal menyimpan nilai: ${rpcSubErr.message || 'Izin ditolak oleh database.'}`);
            }
          })());
        }

        if (task.loInputs.length > 0) {
          promises.push((async () => {
            const { error: rpcLoErr } = await supabase.rpc('erapor_save_lo_scores', {
              p_session_token: sessionToken,
              p_academic_period_id: academicPeriodId,
              p_class_id: classId,
              p_subject_id: task.subjectId,
              p_scores: task.loInputs,
            });
            if (rpcLoErr) {
              console.error('RPC erapor_save_lo_scores error:', rpcLoErr);
              throw new Error(`Gagal menyimpan capaian TP: ${rpcLoErr.message || 'Izin ditolak oleh database.'}`);
            }
          })());
        }

        await Promise.all(promises);
      };

      // Jalankan batch tasks secara terkelola (4 mapel paralel sekaligus) agar cepat dan efisien tanpa over-saturating koneksi
      const BATCH_CONCURRENCY = 4;
      for (let i = 0; i < tasks.length; i += BATCH_CONCURRENCY) {
        const chunk = tasks.slice(i, i + BATCH_CONCURRENCY);
        await Promise.all(chunk.map((task) => saveTaskViaRpc(task)));
      }

      return {
        success: true,
        savedSubjectCount: allSubjectScoreInputs.length,
        savedLoCount: allLoScoreInputs.length,
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
  if (allSubjectScoreInputs.length > 0 || allLoScoreInputs.length > 0) {
    await Promise.all([
      allSubjectScoreInputs.length > 0 ? upsertSubjectScores(allSubjectScoreInputs) : Promise.resolve(),
      allLoScoreInputs.length > 0 ? upsertLearningObjectiveScores(allLoScoreInputs) : Promise.resolve(),
    ]);
  }

  return {
    success: true,
    savedSubjectCount: allSubjectScoreInputs.length,
    savedLoCount: allLoScoreInputs.length,
  };
}

/**
 * Mengambil ringkasan ID mapel yang sudah selesai dinilai 100% pada periode aktif
 * untuk rombel-rombel tertentu menggunakan Canonical Progress Source.
 */
export async function fetchClassScoredSubjectSummary(params: {
  academicPeriodId: string;
  classIds: string[];
}): Promise<Record<string, Set<string>>> {
  if (!isSupabaseConfigured()) return {};
  const { academicPeriodId, classIds } = params;
  if (!academicPeriodId || !classIds.length) return {};

  const result: Record<string, Set<string>> = {};
  for (const cid of classIds) {
    result[cid] = new Set<string>();
  }

  try {
    const { fetchCanonicalEraporProgress } = await import('./eraporProgressService');
    const canonicalProgress = await fetchCanonicalEraporProgress(academicPeriodId);

    for (const classProgress of canonicalProgress.classes) {
      const completedSubjectIds = new Set<string>();
      for (const subj of classProgress.subjects) {
        if (subj.status === 'completed') {
          completedSubjectIds.add(subj.subjectId);
          if (subj.subjectCode) completedSubjectIds.add(subj.subjectCode);
        }
      }

      // Map to classId and className keys
      result[classProgress.classId] = completedSubjectIds;
      result[classProgress.className] = completedSubjectIds;
    }
  } catch (err) {
    console.warn('Error fetching canonical class scored subject summary:', err);
  }

  return result;
}
