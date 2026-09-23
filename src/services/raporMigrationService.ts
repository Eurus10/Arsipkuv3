import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { supabase, isSupabaseConfigured } from './supabase';
import { RaporStsClassData } from '../types/raporSts';

const LOCAL_STORAGE_PREFIX = 'sdit_rapor_sts_class_';

// ============================================================
// TYPE DEFINITIONS FOR MIGRATION AUDIT
// ============================================================

export type MigrationIssueType =
  | 'missing_student'
  | 'ambiguous_student'
  | 'missing_subject'
  | 'ambiguous_subject'
  | 'missing_learning_objective'
  | 'ambiguous_learning_objective'
  | 'missing_period'
  | 'ambiguous_period'
  | 'skipped_legacy_period'
  | 'missing_class'
  | 'ambiguous_class'
  | 'invalid_score'
  | 'invalid_data';

export type MigrationSeverity = 'warning' | 'error' | 'info';

export interface MigrationIssue {
  type: MigrationIssueType;
  severity: MigrationSeverity;
  legacyIdentifier: string;
  message: string;
  candidates?: string[];
}

export interface CandidateSubjectScore {
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
}

export interface CandidateLearningObjectiveScore {
  academic_period_id: string;
  class_id: string;
  student_id: string;
  learning_objective_id: string;
  is_achieved: boolean;
  score: number | null;
}

export interface MigrationSummary {
  totalClasses: number;
  totalStudents: number;
  totalSubjects: number;
  totalLearningObjectives: number;
  totalSubjectScores: number;
  totalLearningObjectiveScores: number;
  readyToMigrate: {
    subjectScoresCount: number;
    learningObjectiveScoresCount: number;
    previewSubjectScores: CandidateSubjectScore[];
    previewLearningObjectiveScores: CandidateLearningObjectiveScore[];
    allSubjectScores?: CandidateSubjectScore[];
    allLearningObjectiveScores?: CandidateLearningObjectiveScore[];
  };
  skipped: number;
  ambiguous: number;
  errors: number;
  issues: MigrationIssue[];
}

// ============================================================
// HELPER FUNCTIONS & MIGRATION ALIASES
// ============================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeString(val: string | null | undefined): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeCode(val: string | null | undefined): string {
  return String(val || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Explicit code aliases for legacy subjects mapping to standard Supabase codes.
 * Ensures deterministic resolution without uncontrolled fuzzy matching.
 */
const LEGACY_SUBJECT_CODE_ALIASES: Record<string, string> = {
  // PAI
  'PAI': 'PAI',
  'PAIBP': 'PAI',
  'PAI_BP': 'PAI',
  'P_A_I': 'PAI',

  // Bahasa Arab
  'BA': 'BA',
  'BAHASAARAB': 'BA',
  'BAHASA_ARAB': 'BA',

  // Other Common Subjects
  'MTK': 'MTK',
  'MATEMATIKA': 'MTK',
  'BIND': 'BIND',
  'BI': 'BIND',
  'BAHASAINDONESIA': 'BIND',
  'BAHASA_INDONESIA': 'BIND',
  'PP': 'PP',
  'PPKN': 'PP',
  'PANCASILA': 'PP',
  'PJOK': 'PJOK',
  'PENJAS': 'PJOK',
  'BING': 'BING',
  'BAHASAINGGRIS': 'BING',
  'BAHASA_INGGRIS': 'BING',
  'IPAS': 'IPAS',
  'SKI': 'SKI',
};

function normalizeSubjectCodeAlias(rawCode: string | null | undefined): string | null {
  if (!rawCode) return null;
  const clean = normalizeCode(rawCode);
  if (!clean) return null;
  return LEGACY_SUBJECT_CODE_ALIASES[clean] || clean;
}

/**
 * Explicit migration-only aliases for legacy subject typos / synonyms.
 * Strictly avoids uncontrolled fuzzy matching.
 */
const LEGACY_SUBJECT_NAME_ALIASES: Record<string, string> = {
  // PAI
  'pai': 'pendidikan agama islam dan budi pekerti',
  'paibp': 'pendidikan agama islam dan budi pekerti',
  'pendidikan agama islam': 'pendidikan agama islam dan budi pekerti',
  'pendidikan agama islam dan budi pekerti': 'pendidikan agama islam dan budi pekerti',
  'pendidikan agama dan budi pekerti': 'pendidikan agama islam dan budi pekerti',

  // Bahasa Arab
  'bahasa arab': 'bahasa arab',
  'bahasa arab / mulok': 'bahasa arab',
  'bahasa arab mulok': 'bahasa arab',
  'bahasa_arab': 'bahasa arab',
  'ba': 'bahasa arab',

  // SKI
  'sejarah kebudyaan islam': 'sejarah kebudayaan islam',
  'sejarah kebudayaan islam (ski)': 'sejarah kebudayaan islam',
  'ski': 'sejarah kebudayaan islam',

  // Pancasila / PPKn
  'pendidikan pancasila dan kewarganegaraan': 'pendidikan pancasila',
  'ppkn': 'pendidikan pancasila',
  'pancasila': 'pendidikan pancasila',

  // Bahasa Indonesia
  'bahasa indonesia': 'bahasa indonesia',

  // Matematika
  'matematika': 'matematika',
  'mtk': 'matematika',
};

function normalizeSubjectName(val: string | null | undefined): string {
  const norm = normalizeString(val);
  return LEGACY_SUBJECT_NAME_ALIASES[norm] || norm;
}

function mapSemesterStringToStandard(sem: string | null | undefined): 'Ganjil' | 'Genap' | null {
  const s = normalizeString(sem);
  if (s === '1' || s === 'ganjil' || s === 'sem1' || s === 'semester 1' || s === 'semester ganjil') {
    return 'Ganjil';
  }
  if (s === '2' || s === 'genap' || s === 'sem2' || s === 'semester 2' || s === 'semester genap') {
    return 'Genap';
  }
  return null;
}

function mapSchoolYearStringToStandard(year: string | null | undefined): string | null {
  const s = String(year || '').trim();
  const match = s.match(/(\d{4})[^\d](\d{4})/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  return null;
}

// ============================================================
// MASTER DATA FETCHERS (BATCH IN-MEMORY LOADING)
// ============================================================

export interface SupabaseMasterData {
  /**
   * Catatan Penting Schema:
   * Kolom 'nim' pada tabel public.students digunakan untuk menyimpan Nomor Induk Siswa (NIS).
   * Kolom 'nisn' digunakan untuk NISN.
   */
  students: Array<{ id: string; name: string; nisn: string | null; nim: string | null; class_id: string | null }>;
  enrollments: Array<{ id: string; student_id: string; academic_period_id: string; class_id: string; status: string }>;
  classes: Array<{ id: string; name: string; academic_level_id: string | null }>;
  periods: Array<{ id: string; school_year: string; semester: string; label: string; is_active: boolean }>;
  subjects: Array<{ id: string; name: string; code: string; academic_level_id: string | null; category: string | null }>;
  learningObjectives: Array<{ id: string; subject_id: string; code: string; description: string; active?: boolean }>;
  teachers: Array<{ id: string; name: string }>;
}

export async function fetchAllSupabaseMasterData(): Promise<SupabaseMasterData> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured.');
  }

  const [
    studentsRes,
    enrollmentsRes,
    classesRes,
    periodsRes,
    subjectsRes,
    loRes,
    teachersRes,
  ] = await Promise.all([
    supabase.from('students').select('id, name, nisn, nim, class_id'),
    supabase.from('student_enrollments').select('id, student_id, academic_period_id, class_id, status'),
    supabase.from('school_classes').select('id, name, academic_level_id'),
    supabase.from('academic_periods').select('id, school_year, semester, label, is_active'),
    supabase.from('academic_subjects').select('id, name, code, academic_level_id, category'),
    supabase.from('learning_objectives').select('id, subject_id, code, description, active'),
    supabase.from('teachers').select('id, name'),
  ]);

  if (studentsRes.error) throw new Error(`Failed to load students: ${studentsRes.error.message}`);
  if (enrollmentsRes.error) throw new Error(`Failed to load enrollments: ${enrollmentsRes.error.message}`);
  if (classesRes.error) throw new Error(`Failed to load classes: ${classesRes.error.message}`);
  if (periodsRes.error) throw new Error(`Failed to load periods: ${periodsRes.error.message}`);
  if (subjectsRes.error) throw new Error(`Failed to load subjects: ${subjectsRes.error.message}`);
  if (loRes.error) throw new Error(`Failed to load learning objectives: ${loRes.error.message}`);
  if (teachersRes.error) throw new Error(`Failed to load teachers: ${teachersRes.error.message}`);

  return {
    students: studentsRes.data || [],
    enrollments: enrollmentsRes.data || [],
    classes: classesRes.data || [],
    periods: periodsRes.data || [],
    subjects: subjectsRes.data || [],
    learningObjectives: loRes.data || [],
    teachers: teachersRes.data || [],
  };
}

/**
 * Load all legacy classes from Firestore collection `rapor_sts_classes` and LocalStorage fallback.
 */
export async function fetchLegacyClassDocuments(): Promise<RaporStsClassData[]> {
  const classDataMap = new Map<string, RaporStsClassData>();

  // 1. Fetch from Firestore
  try {
    const colRef = collection(db, 'rapor_sts_classes');
    const snapshot = await getDocs(colRef);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as RaporStsClassData;
      if (data && data.id) {
        classDataMap.set(data.id, data);
      }
    });
  } catch (err) {
    console.warn('Could not read legacy classes from Firestore:', err);
  }

  // 2. Supplement with any local offline classes in localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const data = JSON.parse(raw) as RaporStsClassData;
              if (data && data.id && !classDataMap.has(data.id)) {
                classDataMap.set(data.id, data);
              }
            } catch {
              // ignore invalid JSON
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error checking localStorage for legacy classes:', err);
  }

  return Array.from(classDataMap.values());
}

// ============================================================
// CORE DRY-RUN AUDIT FUNCTION (STRICT & READ-ONLY)
// ============================================================

/**
 * Perform a comprehensive dry-run migration audit of all legacy e-Rapor data from Firestore against Supabase academic core.
 *
 * GUARANTEES:
 * 1. STRICT NO-WRITE: Does NOT perform any INSERT, UPDATE, or DELETE on Supabase or Firestore.
 * 2. STRICT MAPPING: Avoids fuzzy/ambiguous choices; records all discrepancies as MigrationIssue.
 * 3. STRICT ENROLLMENT: If a student is not officially enrolled in the (period, class), they are NOT migrated.
 * 4. UNIQUE DEDUPLICATION: Ensures candidate keys are unique per (period, class, student, subject) and (period, class, student, TP).
 */
export async function dryRunRaporMigration(options?: {
  specificClassKeys?: string[];
}): Promise<MigrationSummary> {
  const issues: MigrationIssue[] = [];

  // 1. Load legacy documents and Supabase master data in parallel
  const [legacyClasses, masterData] = await Promise.all([
    fetchLegacyClassDocuments(),
    fetchAllSupabaseMasterData(),
  ]);

  // Filter if specific class keys requested
  const targetClasses = options?.specificClassKeys && options.specificClassKeys.length > 0
    ? legacyClasses.filter((c) => options.specificClassKeys!.includes(c.id))
    : legacyClasses;

  // 2. Build In-Memory Index Maps for Deterministic Fast Lookup

  // Students Maps
  const studentById = new Map<string, typeof masterData.students[0]>();
  const studentsByNisn = new Map<string, typeof masterData.students>();
  const studentsByNis = new Map<string, typeof masterData.students>();
  const studentsByName = new Map<string, typeof masterData.students>();

  masterData.students.forEach((st) => {
    studentById.set(st.id, st);

    if (st.nisn && st.nisn.trim()) {
      const cleanNisn = st.nisn.trim();
      const list = studentsByNisn.get(cleanNisn) || [];
      list.push(st);
      studentsByNisn.set(cleanNisn, list);
    }

    // Menggunakan kolom 'nim' sebagai representasi NIS di public.students
    if (st.nim && st.nim.trim()) {
      const cleanNis = st.nim.trim();
      const list = studentsByNis.get(cleanNis) || [];
      list.push(st);
      studentsByNis.set(cleanNis, list);
    }

    const normName = normalizeString(st.name);
    if (normName) {
      const list = studentsByName.get(normName) || [];
      list.push(st);
      studentsByName.set(normName, list);
    }
  });

  // Enrollments Set (`${academic_period_id}::${class_id}::${student_id}`)
  const enrollmentSet = new Set<string>();
  masterData.enrollments.forEach((en) => {
    enrollmentSet.add(`${en.academic_period_id}::${en.class_id}::${en.student_id}`);
  });

  // School Classes Maps
  const classById = new Map<string, typeof masterData.classes[0]>();
  const classesByName = new Map<string, typeof masterData.classes>();

  masterData.classes.forEach((cl) => {
    classById.set(cl.id, cl);
    const normClassName = normalizeString(cl.name);
    const list = classesByName.get(normClassName) || [];
    list.push(cl);
    classesByName.set(normClassName, list);
  });

  // Academic Periods Maps (`${school_year}::${semester}`)
  const periodsByYearSem = new Map<string, typeof masterData.periods>();
  masterData.periods.forEach((p) => {
    const stdYear = mapSchoolYearStringToStandard(p.school_year);
    const stdSem = mapSemesterStringToStandard(p.semester);
    if (stdYear && stdSem) {
      const key = `${stdYear}::${stdSem}`;
      const list = periodsByYearSem.get(key) || [];
      list.push(p);
      periodsByYearSem.set(key, list);
    }
  });

  // Academic Subjects Maps (Scoped by Academic Level ID)
  const subjectById = new Map<string, typeof masterData.subjects[0]>();
  const subjectsByLevelAndCode = new Map<string, typeof masterData.subjects>();
  const subjectsByLevelAndName = new Map<string, typeof masterData.subjects>();

  masterData.subjects.forEach((subj) => {
    subjectById.set(subj.id, subj);
    const levelId = subj.academic_level_id || '';

    const normCode = normalizeCode(subj.code);
    if (normCode && levelId) {
      const key = `${levelId}::${normCode}`;
      const list = subjectsByLevelAndCode.get(key) || [];
      list.push(subj);
      subjectsByLevelAndCode.set(key, list);

      // Also register alias code if different
      const aliasCode = normalizeSubjectCodeAlias(subj.code);
      if (aliasCode && aliasCode !== normCode) {
        const aliasKey = `${levelId}::${aliasCode}`;
        const aliasList = subjectsByLevelAndCode.get(aliasKey) || [];
        aliasList.push(subj);
        subjectsByLevelAndCode.set(aliasKey, aliasList);
      }
    }

    const normName = normalizeSubjectName(subj.name);
    if (normName && levelId) {
      const key = `${levelId}::${normName}`;
      const list = subjectsByLevelAndName.get(key) || [];
      list.push(subj);
      subjectsByLevelAndName.set(key, list);
    }
  });

  // Learning Objectives Maps
  const loById = new Map<string, typeof masterData.learningObjectives[0]>();
  const loBySubjectAndCode = new Map<string, typeof masterData.learningObjectives>();
  const loBySubjectAndDesc = new Map<string, typeof masterData.learningObjectives>();

  masterData.learningObjectives.forEach((lo) => {
    loById.set(lo.id, lo);

    const normCode = normalizeCode(lo.code);
    if (normCode) {
      const key = `${lo.subject_id}::${normCode}`;
      const list = loBySubjectAndCode.get(key) || [];
      list.push(lo);
      loBySubjectAndCode.set(key, list);
    }

    const normDesc = normalizeString(lo.description);
    if (normDesc) {
      const key = `${lo.subject_id}::${normDesc}`;
      const list = loBySubjectAndDesc.get(key) || [];
      list.push(lo);
      loBySubjectAndDesc.set(key, list);
    }
  });

  // Teachers Maps
  const teacherById = new Map<string, typeof masterData.teachers[0]>();
  const teachersByName = new Map<string, typeof masterData.teachers>();

  masterData.teachers.forEach((t) => {
    teacherById.set(t.id, t);
    const normName = normalizeString(t.name);
    if (normName) {
      const list = teachersByName.get(normName) || [];
      list.push(t);
      teachersByName.set(normName, list);
    }
  });

  // 3. Process Migration Mapping Iteration

  const readySubjectScores: CandidateSubjectScore[] = [];
  const readyLearningObjectiveScores: CandidateLearningObjectiveScore[] = [];

  const uniqueSubjectScoreKeys = new Set<string>();
  const uniqueLoScoreKeys = new Set<string>();

  let totalStudentsCount = 0;
  let totalSubjectsCount = 0;
  let totalLoCount = 0;
  let totalSubjectScoresCount = 0;
  let totalLoScoresCount = 0;

  let skippedCount = 0;
  let ambiguousCount = 0;
  let errorsCount = 0;

  for (const legacyClass of targetClasses) {
    const classContext = `classKey: ${legacyClass.id}`;

    // A. Map Academic Period
    const rawYear = legacyClass.config?.schoolYear;
    const rawSem = legacyClass.config?.semester;
    const stdYear = mapSchoolYearStringToStandard(rawYear);
    const stdSem = mapSemesterStringToStandard(rawSem);

    if (!stdYear || !stdSem) {
      issues.push({
        type: 'missing_period',
        severity: 'error',
        legacyIdentifier: classContext,
        message: `Tidak dapat memetakan periode akademik dari tahun ajaran '${rawYear}' dan semester '${rawSem}'.`,
      });
      errorsCount++;
      skippedCount++;
      continue;
    }

    const periodCandidates = periodsByYearSem.get(`${stdYear}::${stdSem}`) || [];
    if (periodCandidates.length === 0) {
      // e-Rapor baru dimulai dari 2026/2027 Ganjil.
      // Periode historis sebelum 2026/2027 (seperti 2024/2025) adalah data arsip legacy,
      // BUKAN error migrasi ke Supabase.
      const matchYear = stdYear.match(/^(\d{4})/);
      const startYearNum = matchYear ? parseInt(matchYear[1], 10) : 0;

      if (startYearNum < 2026) {
        issues.push({
          type: 'skipped_legacy_period',
          severity: 'info',
          legacyIdentifier: classContext,
          message: `Periode '${stdYear} ${stdSem}' merupakan data arsip sebelum era e-Rapor Supabase (mulai 2026/2027 Ganjil). Data legacy ini dilewati (skipped) dan tidak dianggap error.`,
        });
        skippedCount++;
        continue;
      }

      issues.push({
        type: 'missing_period',
        severity: 'error',
        legacyIdentifier: classContext,
        message: `Periode akademik untuk '${stdYear}' semester '${stdSem}' tidak ditemukan di tabel academic_periods.`,
      });
      errorsCount++;
      skippedCount++;
      continue;
    }

    if (periodCandidates.length > 1) {
      issues.push({
        type: 'ambiguous_period',
        severity: 'error',
        legacyIdentifier: classContext,
        message: `Ditemukan lebih dari 1 periode akademik untuk '${stdYear}' semester '${stdSem}'.`,
        candidates: periodCandidates.map((p) => `${p.id} (${p.label})`),
      });
      ambiguousCount++;
      skippedCount++;
      continue;
    }

    const matchedPeriod = periodCandidates[0];
    const academicPeriodId = matchedPeriod.id;

    // B. Map School Class
    const rawClassLevel = legacyClass.config?.classLevel || legacyClass.id.split('_')[0];
    const cleanClassId = rawClassLevel.replace(/kelas\s*/i, '').trim().toUpperCase();

    let matchedClassId: string | null = null;
    if (classById.has(cleanClassId)) {
      matchedClassId = cleanClassId;
    } else {
      const classCandidates = classesByName.get(normalizeString(rawClassLevel)) || [];
      if (classCandidates.length === 1) {
        matchedClassId = classCandidates[0].id;
      } else if (classCandidates.length > 1) {
        issues.push({
          type: 'ambiguous_class',
          severity: 'error',
          legacyIdentifier: classContext,
          message: `Ditemukan lebih dari 1 rombel yang cocok untuk '${rawClassLevel}'.`,
          candidates: classCandidates.map((c) => c.id),
        });
        ambiguousCount++;
        skippedCount++;
        continue;
      }
    }

    if (!matchedClassId) {
      issues.push({
        type: 'missing_class',
        severity: 'error',
        legacyIdentifier: classContext,
        message: `Rombel '${rawClassLevel}' tidak ditemukan di tabel school_classes.`,
      });
      errorsCount++;
      skippedCount++;
      continue;
    }

    // Determine Academic Level ID for this Class
    const matchedClassObj = classById.get(matchedClassId);
    let matchedAcademicLevelId = matchedClassObj?.academic_level_id || null;
    if (!matchedAcademicLevelId) {
      const matchDigit = matchedClassId.match(/^([1-6])/);
      if (matchDigit) {
        matchedAcademicLevelId = `grade_${matchDigit[1]}`;
      }
    }

    // C. Map Teacher (Optional metadata)
    let resolvedTeacherId: string | null = null;
    const rawTeacherName = legacyClass.config?.teacherName;
    if (rawTeacherName) {
      const teacherCandidates = teachersByName.get(normalizeString(rawTeacherName)) || [];
      if (teacherCandidates.length === 1) {
        resolvedTeacherId = teacherCandidates[0].id;
      }
    }

    // D. Process Subjects in Class (Scoped Strictly to Academic Level)
    const subjectRecords = legacyClass.subjectRecords || {};
    const subjectList = legacyClass.subjects || [];

    // Map subject metadata list
    const legacySubjectMetaMap = new Map<string, typeof subjectList[0]>();
    subjectList.forEach((s) => {
      legacySubjectMetaMap.set(s.id, s);
    });

    const processedStudentIdsInClass = new Set<string>();

    for (const [legacySubjectId, subjectRecord] of Object.entries(subjectRecords)) {
      totalSubjectsCount++;
      const subjectMeta = legacySubjectMetaMap.get(legacySubjectId);
      const subjectName = subjectMeta?.name || legacySubjectId;
      const subjectCode = subjectMeta?.code || '';
      const subjectContext = `${classContext} | Jenjang: ${matchedAcademicLevelId || 'unknown'} | Mapel: ${subjectName} (${legacySubjectId})`;

      // Resolve Subject strictly within the class's academic level:
      // Priority 1: Exact Supabase subject ID if already available in legacy mapping and matches academic level
      let matchedSubjectId: string | null = null;

      if (UUID_REGEX.test(legacySubjectId) && subjectById.has(legacySubjectId)) {
        const subj = subjectById.get(legacySubjectId)!;
        if (!matchedAcademicLevelId || subj.academic_level_id === matchedAcademicLevelId) {
          matchedSubjectId = legacySubjectId;
        }
      }

      // Priority 2: Normalized code alias within the same academic level (jenjang)
      if (!matchedSubjectId && matchedAcademicLevelId) {
        const candidateCodes: string[] = [];
        if (subjectCode) {
          const c = normalizeSubjectCodeAlias(subjectCode);
          if (c && !candidateCodes.includes(c)) candidateCodes.push(c);
          const raw = normalizeCode(subjectCode);
          if (raw && !candidateCodes.includes(raw)) candidateCodes.push(raw);
        }
        if (!UUID_REGEX.test(legacySubjectId)) {
          const cFromId = normalizeSubjectCodeAlias(legacySubjectId);
          if (cFromId && !candidateCodes.includes(cFromId)) candidateCodes.push(cFromId);
          const rawId = normalizeCode(legacySubjectId);
          if (rawId && !candidateCodes.includes(rawId)) candidateCodes.push(rawId);
        }

        for (const codeToTest of candidateCodes) {
          const codeKey = `${matchedAcademicLevelId}::${codeToTest}`;
          const candidates = subjectsByLevelAndCode.get(codeKey) || [];
          if (candidates.length === 1) {
            matchedSubjectId = candidates[0].id;
            break;
          } else if (candidates.length > 1) {
            issues.push({
              type: 'ambiguous_subject',
              severity: 'error',
              legacyIdentifier: subjectContext,
              message: `Kode mapel '${codeToTest}' pada jenjang '${matchedAcademicLevelId}' ambigu (ditemukan ${candidates.length} kandidat).`,
              candidates: candidates.map((c) => `${c.id} (${c.name})`),
            });
            ambiguousCount++;
            break;
          }
        }
      }

      // Priority 3: Normalized name alias within the same academic level (jenjang)
      if (!matchedSubjectId && matchedAcademicLevelId) {
        const candidateNames: string[] = [];
        if (subjectName) {
          const n = normalizeSubjectName(subjectName);
          if (n && !candidateNames.includes(n)) candidateNames.push(n);
          const raw = normalizeString(subjectName);
          if (raw && !candidateNames.includes(raw)) candidateNames.push(raw);
        }
        if (!UUID_REGEX.test(legacySubjectId)) {
          const nFromId = normalizeSubjectName(legacySubjectId);
          if (nFromId && !candidateNames.includes(nFromId)) candidateNames.push(nFromId);
        }

        for (const nameToTest of candidateNames) {
          const nameKey = `${matchedAcademicLevelId}::${nameToTest}`;
          const candidates = subjectsByLevelAndName.get(nameKey) || [];
          if (candidates.length === 1) {
            matchedSubjectId = candidates[0].id;
            break;
          } else if (candidates.length > 1) {
            issues.push({
              type: 'ambiguous_subject',
              severity: 'error',
              legacyIdentifier: subjectContext,
              message: `Nama mapel '${nameToTest}' pada jenjang '${matchedAcademicLevelId}' ambigu (ditemukan ${candidates.length} kandidat).`,
              candidates: candidates.map((c) => `${c.id} (${c.name})`),
            });
            ambiguousCount++;
            break;
          }
        }
      }

      // Priority 4: If not matched -> missing_subject (strictly NO auto create)
      if (!matchedSubjectId) {
        issues.push({
          type: 'missing_subject',
          severity: 'error',
          legacyIdentifier: subjectContext,
          message: `Mata pelajaran '${subjectName}' (${legacySubjectId}) tidak ditemukan di academic_subjects untuk jenjang '${matchedAcademicLevelId || 'unknown'}'.`,
        });
        errorsCount++;
        skippedCount++;
        continue;
      }

      // Map TP metadata within this subject
      const subjectTpList = subjectMeta?.tpList || [];
      const tpMapping = new Map<string, string>(); // legacyTpId -> supabaseLoId

      for (const legacyTp of subjectTpList) {
        totalLoCount++;
        const tpContext = `${subjectContext} | TP: ${legacyTp.code} - ${legacyTp.desc.slice(0, 30)}...`;

        let matchedLoId: string | null = null;
        if (UUID_REGEX.test(legacyTp.id) && loById.has(legacyTp.id)) {
          matchedLoId = legacyTp.id;
        } else {
          const codeKey = `${matchedSubjectId}::${normalizeCode(legacyTp.code)}`;
          const codeCandidates = loBySubjectAndCode.get(codeKey) || [];

          if (codeCandidates.length === 1) {
            matchedLoId = codeCandidates[0].id;
          } else {
            const descKey = `${matchedSubjectId}::${normalizeString(legacyTp.desc)}`;
            const descCandidates = loBySubjectAndDesc.get(descKey) || [];
            if (descCandidates.length === 1) {
              matchedLoId = descCandidates[0].id;
            } else if (descCandidates.length > 1) {
              issues.push({
                type: 'ambiguous_learning_objective',
                severity: 'warning',
                legacyIdentifier: tpContext,
                message: `TP '${legacyTp.code}' ambigu dalam mapel '${subjectName}'.`,
                candidates: descCandidates.map((lo) => `${lo.id} (${lo.code})`),
              });
              ambiguousCount++;
            }
          }
        }

        if (matchedLoId) {
          tpMapping.set(legacyTp.id, matchedLoId);
        } else {
          issues.push({
            type: 'missing_learning_objective',
            severity: 'warning',
            legacyIdentifier: tpContext,
            message: `Tujuan Pembelajaran '${legacyTp.code}' tidak ditemukan di tabel learning_objectives untuk mapel ini.`,
          });
        }
      }

      // E. Process Student Scores in this Subject
      const scores = subjectRecord?.scores || {};

      for (const [legacyStudentKey, scoreDetail] of Object.entries(scores)) {
        totalSubjectScoresCount++;
        const studentRawName = scoreDetail.studentName || '';
        const studentNisn = scoreDetail.nisn || '';
        const studentNis = scoreDetail.nis || '';
        const studentContext = `${subjectContext} | Siswa: ${studentRawName} (Key: ${legacyStudentKey}, NISN: ${studentNisn}, NIS: ${studentNis})`;

        // Resolve Student strictly
        let matchedStudent: typeof masterData.students[0] | null = null;

        if (UUID_REGEX.test(legacyStudentKey) && studentById.has(legacyStudentKey)) {
          matchedStudent = studentById.get(legacyStudentKey)!;
        } else if (scoreDetail.studentId && UUID_REGEX.test(scoreDetail.studentId) && studentById.has(scoreDetail.studentId)) {
          matchedStudent = studentById.get(scoreDetail.studentId)!;
        } else if (studentNisn.trim() && studentsByNisn.has(studentNisn.trim())) {
          const candidates = studentsByNisn.get(studentNisn.trim())!;
          if (candidates.length === 1) {
            matchedStudent = candidates[0];
          } else {
            issues.push({
              type: 'ambiguous_student',
              severity: 'error',
              legacyIdentifier: studentContext,
              message: `NISN '${studentNisn}' ambigu (ditemukan ${candidates.length} siswa).`,
              candidates: candidates.map((s) => `${s.id} (${s.name})`),
            });
            ambiguousCount++;
          }
        } else if (studentNis.trim() && studentsByNis.has(studentNis.trim())) {
          const candidates = studentsByNis.get(studentNis.trim())!;
          if (candidates.length === 1) {
            matchedStudent = candidates[0];
          } else {
            issues.push({
              type: 'ambiguous_student',
              severity: 'error',
              legacyIdentifier: studentContext,
              message: `NIS '${studentNis}' ambigu (ditemukan ${candidates.length} siswa di kolom nim).`,
              candidates: candidates.map((s) => `${s.id} (${s.name})`),
            });
            ambiguousCount++;
          }
        } else if (studentRawName.trim()) {
          const candidates = studentsByName.get(normalizeString(studentRawName)) || [];
          if (candidates.length === 1) {
            matchedStudent = candidates[0];
          } else if (candidates.length > 1) {
            issues.push({
              type: 'ambiguous_student',
              severity: 'error',
              legacyIdentifier: studentContext,
              message: `Nama siswa '${studentRawName}' ambigu (ditemukan ${candidates.length} siswa).`,
              candidates: candidates.map((s) => `${s.id} (${s.name}, Kelas: ${s.class_id})`),
            });
            ambiguousCount++;
          }
        }

        if (!matchedStudent) {
          issues.push({
            type: 'missing_student',
            severity: 'error',
            legacyIdentifier: studentContext,
            message: `Identitas siswa '${studentRawName}' tidak ditemukan di tabel students.`,
          });
          errorsCount++;
          skippedCount++;
          continue;
        }

        // ============================================================
        // STRICT STUDENT ENROLLMENT VALIDATION:
        // NO ENROLLMENT = NO MIGRATION CANDIDATE
        // ============================================================
        const enrollmentKey = `${academicPeriodId}::${matchedClassId}::${matchedStudent.id}`;
        if (!enrollmentSet.has(enrollmentKey)) {
          issues.push({
            type: 'invalid_data',
            severity: 'error',
            legacyIdentifier: studentContext,
            message: `Siswa '${matchedStudent.name}' (${matchedStudent.id}) TIDAK terdaftar di tabel student_enrollments untuk rombel ${matchedClassId} pada periode ${stdYear} ${stdSem}. Data nilai dilewati (skipped).`,
          });
          errorsCount++;
          skippedCount++;
          continue; // Strict: Do NOT migrate score for non-enrolled students
        }

        processedStudentIdsInClass.add(matchedStudent.id);

        // Validate Scores
        let stsScoreVal: number | null = null;
        if (scoreDetail.stsScore !== undefined && scoreDetail.stsScore !== null) {
          const num = Number(scoreDetail.stsScore);
          if (isNaN(num) || num < 0 || num > 100) {
            issues.push({
              type: 'invalid_score',
              severity: 'warning',
              legacyIdentifier: studentContext,
              message: `Nilai STS '${scoreDetail.stsScore}' berada di luar rentang valid 0 - 100.`,
            });
          } else {
            stsScoreVal = Math.round(num * 100) / 100;
          }
        }

        let finalScoreVal: number | null = null;
        if (scoreDetail.finalScore !== undefined && scoreDetail.finalScore !== null) {
          const num = Number(scoreDetail.finalScore);
          if (isNaN(num) || num < 0 || num > 100) {
            issues.push({
              type: 'invalid_score',
              severity: 'warning',
              legacyIdentifier: studentContext,
              message: `Nilai Akhir '${scoreDetail.finalScore}' berada di luar rentang valid 0 - 100.`,
            });
          } else {
            finalScoreVal = Math.round(num * 100) / 100;
          }
        } else {
          finalScoreVal = stsScoreVal;
        }

        // Prepare Subject Score Candidate
        const subjectScoreUniqueKey = `${academicPeriodId}::${matchedClassId}::${matchedStudent.id}::${matchedSubjectId}`;
        if (!uniqueSubjectScoreKeys.has(subjectScoreUniqueKey)) {
          uniqueSubjectScoreKeys.add(subjectScoreUniqueKey);
          readySubjectScores.push({
            academic_period_id: academicPeriodId,
            class_id: matchedClassId,
            student_id: matchedStudent.id,
            subject_id: matchedSubjectId,
            teacher_id: resolvedTeacherId,
            sts_score: stsScoreVal,
            final_score: finalScoreVal,
            auto_description: scoreDetail.autoDescription || null,
            custom_description: scoreDetail.customDescription || null,
            teacher_note: scoreDetail.teacherNote || null,
          });
        }

        // Process Learning Objective (TP) Scores for this student
        const tpScoresMap = scoreDetail.tpScores || {};
        const tpAchievedMap = scoreDetail.tpAchieved || {};

        const allReferencedTpKeys = Array.from(
          new Set([...Object.keys(tpScoresMap), ...Object.keys(tpAchievedMap)])
        );

        for (const rawTpKey of allReferencedTpKeys) {
          totalLoScoresCount++;
          const resolvedLoId = tpMapping.get(rawTpKey);

          if (!resolvedLoId) {
            continue; // already reported in subject TP mapping issues
          }

          const rawScore = tpScoresMap[rawTpKey];
          const rawAchieved = tpAchievedMap[rawTpKey];

          // Strictly preserve legacy achievement state without hardcoding any numeric thresholds
          let isAchieved = false;
          if (rawAchieved === true || rawAchieved === ('L' as unknown) || rawAchieved === ('l' as unknown)) {
            isAchieved = true;
          } else if (rawAchieved === false || rawAchieved === ('TL' as unknown) || rawAchieved === ('tl' as unknown)) {
            isAchieved = false;
          }

          let numericScore: number | null = null;
          if (rawScore !== undefined && rawScore !== null && rawScore !== ('' as unknown)) {
            const num = Number(rawScore);
            if (!isNaN(num) && num >= 0 && num <= 100) {
              numericScore = Math.round(num * 100) / 100;
            } else if (!isNaN(num) && (num < 0 || num > 100)) {
              issues.push({
                type: 'invalid_score',
                severity: 'warning',
                legacyIdentifier: `${studentContext} | TP ID: ${rawTpKey}`,
                message: `Skor TP '${rawScore}' berada di luar rentang valid 0 - 100.`,
              });
            }
          }

          const loScoreUniqueKey = `${academicPeriodId}::${matchedClassId}::${matchedStudent.id}::${resolvedLoId}`;
          if (!uniqueLoScoreKeys.has(loScoreUniqueKey)) {
            uniqueLoScoreKeys.add(loScoreUniqueKey);
            readyLearningObjectiveScores.push({
              academic_period_id: academicPeriodId,
              class_id: matchedClassId,
              student_id: matchedStudent.id,
              learning_objective_id: resolvedLoId,
              is_achieved: isAchieved,
              score: numericScore,
            });
          }
        }
      }
    }

    totalStudentsCount += processedStudentIdsInClass.size;
  }

  return {
    totalClasses: targetClasses.length,
    totalStudents: totalStudentsCount,
    totalSubjects: totalSubjectsCount,
    totalLearningObjectives: totalLoCount,
    totalSubjectScores: totalSubjectScoresCount,
    totalLearningObjectiveScores: totalLoScoresCount,
    readyToMigrate: {
      subjectScoresCount: readySubjectScores.length,
      learningObjectiveScoresCount: readyLearningObjectiveScores.length,
      previewSubjectScores: readySubjectScores.slice(0, 10),
      previewLearningObjectiveScores: readyLearningObjectiveScores.slice(0, 10),
      allSubjectScores: readySubjectScores,
      allLearningObjectiveScores: readyLearningObjectiveScores,
    },
    skipped: skippedCount,
    ambiguous: ambiguousCount,
    errors: errorsCount,
    issues,
  };
}
