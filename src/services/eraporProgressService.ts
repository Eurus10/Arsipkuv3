import { supabase, isSupabaseConfigured } from './supabase';
import { AcademicPeriod } from './academicPeriodService';
import { AcademicClass } from './teacherAssignmentStorage';
import { AcademicSubject } from './academicSubjectStorage';

export type SubjectProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface StudentScoreStatus {
  studentId: string;
  hasValidScore: boolean;
  stsScore: number | null;
  finalScore: number | null;
}

export interface EraporSubjectProgress {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  displayOrder: number;
  category?: string;
  teacherId: string | null;
  teacherName: string;
  assignmentType: 'subject_teacher' | 'homeroom_teacher' | 'unassigned';
  totalStudents: number;
  scoredStudents: number;
  unscoredStudents: number;
  progressPercentage: number; // 0 - 100 (floating or integer accurate)
  status: SubjectProgressStatus;
  scoredStudentIds: string[];
}

export interface EraporClassProgress {
  classId: string;
  className: string;
  grade: number | null;
  phase: string | null;
  academicLevelId: string | null;
  homeroomTeacherId?: string | null;
  homeroomTeacherName?: string;
  totalStudents: number;
  totalSubjects: number;
  completedSubjects: number;
  inProgressSubjects: number;
  notStartedSubjects: number;
  overallProgress: number; // Rata-rata persentase progress seluruh mapel (0 - 100)
  status: SubjectProgressStatus;
  subjects: EraporSubjectProgress[];
}

export interface EraporOverallMonitoringProgress {
  periodId: string;
  periodLabel: string;
  totalClasses: number;
  totalSubjects: number;
  totalTeacherAssignments: number;
  totalTargetScoredEntries: number; // totalStudents across all subjects
  totalActualScoredEntries: number; // total scored students across all subjects
  overallProgress: number; // 0 - 100%
  completedSubjectCount: number;
  inProgressSubjectCount: number;
  notStartedSubjectCount: number;
  classes: EraporClassProgress[];
}


/**
 * Normalisasi identifier kelas/mapel untuk monitoring.
 * Menyamakan variasi seperti `Kelas 3B`, `3-B`, `3B`, dan perbedaan kapital.
 * Hanya dipakai saat MEMBACA progress; tidak mengubah data Supabase.
 */
function normalizeProgressKey(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/^kelas\s*/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

const ensureConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }
};

/**
 * Validates if a score value is valid numeric score (0 - 100).
 * CRITICAL: 0 is a valid score and must NOT be treated as null/falsy.
 */
export function isValidScore(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return false;
  const num = Number(val);
  return !isNaN(num) && num >= 0 && num <= 100;
}

/**
 * Fetches the canonical e-Rapor progress for a given academic period.
 * This is the SINGLE SOURCE OF TRUTH used by:
 * 1. EraporAdminDashboard
 * 2. Teacher Workspace (Guru Bidang & Wali Kelas)
 * 3. Class Monitoring & Reports
 */
export async function fetchCanonicalEraporProgress(
  periodId: string
): Promise<EraporOverallMonitoringProgress> {
  ensureConfigured();

  if (!periodId) {
    throw new Error('academic_period_id wajib disertakan untuk mengambil data progress.');
  }

  // 1. Fetch Academic Period
  const { data: periodRaw, error: periodErr } = await supabase
    .from('academic_periods')
    .select('id, school_year, semester, label, is_active, is_archived')
    .eq('id', periodId)
    .maybeSingle();

  if (periodErr) throw new Error(`Gagal memuat periode akademik: ${periodErr.message}`);

  const periodLabel = periodRaw
    ? `${periodRaw.school_year} - Semester ${periodRaw.semester}`
    : 'Periode Tidak Dikenal';

  // 2. Fetch Active Classes (Canonical Classes)
  const { data: classesRaw, error: classErr } = await supabase
    .from('school_classes')
    .select('id, name, grade, phase, academic_level_id, active')
    .eq('active', true)
    .order('grade', { ascending: true })
    .order('name', { ascending: true });

  if (classErr) throw new Error(`Gagal memuat daftar rombel: ${classErr.message}`);
  const classes = (classesRaw || []) as AcademicClass[];

  // 3. Fetch Academic Levels to map level ID / grade correctly
  const { data: levelsRaw } = await supabase
    .from('academic_levels')
    .select('id, name, grade, phase, active')
    .eq('active', true);

  const levelMap = new Map<string, { id: string; grade: number; name: string }>();
  const levelByGrade = new Map<number, string>(); // grade number -> level UUID
  for (const lvl of levelsRaw || []) {
    levelMap.set(lvl.id, lvl);
    if (lvl.grade) {
      levelByGrade.set(lvl.grade, lvl.id);
    }
  }

  // 4. Fetch Active Subjects (Canonical Master Subjects)
  const { data: subjectsRaw, error: subjErr } = await supabase
    .from('academic_subjects')
    .select('id, academic_level_id, name, code, display_order, category, active')
    .eq('active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (subjErr) throw new Error(`Gagal memuat master mata pelajaran: ${subjErr.message}`);
  const allSubjects = (subjectsRaw || []) as AcademicSubject[];

  // 5. Fetch Teachers for names
  const { data: teachersRaw } = await supabase
    .from('teachers')
    .select('id, name, status');

  const teacherMap = new Map<string, string>();
  for (const t of teachersRaw || []) {
    teacherMap.set(t.id, t.name);
  }

  // 6. Fetch Teacher Assignments for this period
  const { data: assignmentsRaw, error: assignErr } = await supabase
    .from('teacher_assignments')
    .select('id, teacher_id, academic_period_id, academic_level_id, class_id, subject_id, assignment_type, active')
    .eq('academic_period_id', periodId)
    .eq('active', true);

  if (assignErr) throw new Error(`Gagal memuat penugasan guru: ${assignErr.message}`);
  const assignments = assignmentsRaw || [];

  // Group assignments by class_id
  const classAssignmentsMap = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = classAssignmentsMap.get(a.class_id) || [];
    list.push(a);
    classAssignmentsMap.set(a.class_id, list);
  }

  // 7. Canonical Student Count per Class
  // Priority 1: student_enrollments for this academic period
  const { data: enrollmentsRaw } = await supabase
    .from('student_enrollments')
    .select('student_id, class_id')
    .eq('academic_period_id', periodId);

  const enrolledStudentIdsByClass = new Map<string, Set<string>>();
  if (enrollmentsRaw && enrollmentsRaw.length > 0) {
    for (const e of enrollmentsRaw) {
      if (!e.class_id || !e.student_id) continue;
      let set = enrolledStudentIdsByClass.get(e.class_id);
      if (!set) {
        set = new Set<string>();
        enrolledStudentIdsByClass.set(e.class_id, set);
      }
      set.add(e.student_id);
    }
  }

  // Priority 2: Fallback to active students table if enrollments are not populated
  const { data: studentsRaw } = await supabase
    .from('students')
    .select('id, class_id, class_level, active')
    .eq('active', true);

  const directStudentIdsByClass = new Map<string, Set<string>>();
  if (studentsRaw) {
    for (const st of studentsRaw) {
      const cId = st.class_id || st.class_level || '';
      if (cId) {
        const cleanKey = cId.trim();
        const upperKey = cleanKey.toUpperCase();
        const shortKey = cleanKey.replace(/^kelas\s+/i, '').trim().toUpperCase();

        const keysToIndex = Array.from(new Set([cleanKey, upperKey, shortKey].filter(Boolean)));
        for (const k of keysToIndex) {
          let set = directStudentIdsByClass.get(k);
          if (!set) {
            set = new Set<string>();
            directStudentIdsByClass.set(k, set);
          }
          set.add(st.id);
        }
      }
    }
  }

  // Function to get distinct registered student IDs for a class
  const getRegisteredStudentIdsForClass = (cls: AcademicClass): Set<string> => {
    // 1. By exact class.id in student_enrollments
    const enrolled = enrolledStudentIdsByClass.get(cls.id);
    if (enrolled && enrolled.size > 0) {
      return enrolled;
    }

    // 2. Fallback: by class.id in students table
    const directById =
      directStudentIdsByClass.get(cls.id) ||
      directStudentIdsByClass.get(cls.id.toUpperCase()) ||
      directStudentIdsByClass.get(cls.id.replace(/^kelas\s+/i, '').trim().toUpperCase());
    if (directById && directById.size > 0) {
      return directById;
    }

    // 3. Fallback: by class.name in students table (e.g., "3B", "Kelas 3B")
    const directByName =
      directStudentIdsByClass.get(cls.name) ||
      directStudentIdsByClass.get(cls.name.toUpperCase()) ||
      directStudentIdsByClass.get(cls.name.replace(/^kelas\s+/i, '').trim().toUpperCase());
    if (directByName && directByName.size > 0) {
      return directByName;
    }

    return new Set<string>();
  };

  // 8. Fetch ALL student_subject_scores for this academic period
  // Canonical Score Source
  //
  // IMPORTANT:
  // Supabase/PostgREST can cap a normal SELECT response (commonly at 1,000 rows).
  // Because one period can contain thousands of score rows, using one SELECT here
  // can make the admin progress bar look incomplete even though the e-Rapor data
  // is actually present in Supabase.
  //
  // We therefore fetch the score table in deterministic pages and merge all pages
  // before calculating progress. This is READ-ONLY and does not modify any data.
  const SCORE_PAGE_SIZE = 500;
  const scoresRaw: Array<{
    class_id: string | null;
    subject_id: string | null;
    student_id: string | null;
    sts_score: number | null;
    final_score: number | null;
  }> = [];

  let scorePage = 0;
  while (true) {
    const from = scorePage * SCORE_PAGE_SIZE;
    const to = from + SCORE_PAGE_SIZE - 1;

    const { data: pageData, error: scoresErr } = await supabase
      .from('student_subject_scores')
      .select('class_id, subject_id, student_id, sts_score, final_score')
      .eq('academic_period_id', periodId)
      .order('class_id', { ascending: true })
      .order('subject_id', { ascending: true })
      .order('student_id', { ascending: true })
      .range(from, to);

    if (scoresErr) {
      throw new Error(`Gagal memuat nilai siswa: ${scoresErr.message}`);
    }

    const page = pageData || [];
    scoresRaw.push(...page);

    if (page.length < SCORE_PAGE_SIZE) break;
    scorePage++;
  }

  // Distinct scored students map: Map<`classId::subjectId`, Set<studentId>>
  // Supporting multiple classId alias keys (UUID and class name) for bulletproof matching
  const scoredStudentsMap = new Map<string, Set<string>>();

  for (const s of scoresRaw || []) {
    // Check if student has valid score (STS score or Final score)
    const hasSts = isValidScore(s.sts_score);
    const hasFinal = isValidScore(s.final_score);

    if (hasSts || hasFinal) {
      const studentId = s.student_id;
      const classKey = s.class_id;
      const subjectKey = s.subject_id;

      if (!classKey || !subjectKey || !studentId) continue;

      const normalizedClassKey = normalizeProgressKey(classKey);
      const normalizedSubjectKey = normalizeProgressKey(subjectKey);
      if (!normalizedClassKey || !normalizedSubjectKey) continue;

      const keysToRegister = [
        `${normalizedClassKey}::${normalizedSubjectKey}`,
      ];

      for (const k of keysToRegister) {
        let set = scoredStudentsMap.get(k);
        if (!set) {
          set = new Set<string>();
          scoredStudentsMap.set(k, set);
        }
        set.add(studentId);
      }
    }
  }

  // 9. Process Each Class and Subject to build Canonical Progress
  const classProgressList: EraporClassProgress[] = [];

  let globalTargetScored = 0;
  let globalActualScored = 0;
  let globalCompletedSubjects = 0;
  let globalInProgressSubjects = 0;
  let globalNotStartedSubjects = 0;

  for (const cls of classes) {
    const registeredStudentIds = getRegisteredStudentIdsForClass(cls);
    const totalStudents = registeredStudentIds.size;

    // Resolve Academic Level for this class
    // Match either:
    // 1. cls.academic_level_id directly
    // 2. Level UUID resolved via cls.grade
    // 3. String literal 'grade_' + cls.grade
    const levelIdFromGrade = cls.grade ? levelByGrade.get(cls.grade) : null;
    const directLevelId = cls.academic_level_id;
    const gradeStringLevel = cls.grade ? `grade_${cls.grade}` : null;

    // Find Canonical Subjects for this Class
    const classSubjects = allSubjects.filter((s) => {
      if (directLevelId && s.academic_level_id === directLevelId) return true;
      if (levelIdFromGrade && s.academic_level_id === levelIdFromGrade) return true;
      if (gradeStringLevel && s.academic_level_id === gradeStringLevel) return true;
      return false;
    });

    const classAssigns = classAssignmentsMap.get(cls.id) || [];
    const homeroomAssign = classAssigns.find((a) => a.assignment_type === 'homeroom_teacher');
    const homeroomTeacherId = homeroomAssign?.teacher_id || null;
    const homeroomTeacherName = homeroomTeacherId ? teacherMap.get(homeroomTeacherId) || 'Wali Kelas' : undefined;

    const subjectProgressList: EraporSubjectProgress[] = [];

    let completedInClass = 0;
    let inProgressInClass = 0;
    let notStartedInClass = 0;
    let sumPercentageInClass = 0;

    for (const subj of classSubjects) {
      // Find Teacher Assignment for this Subject
      const subjectAssign = classAssigns.find(
        (a) => a.subject_id === subj.id && a.assignment_type === 'subject_teacher'
      );

      let teacherId: string | null = null;
      let teacherName = 'Belum Ditugaskan';
      let assignmentType: 'subject_teacher' | 'homeroom_teacher' | 'unassigned' = 'unassigned';

      if (subjectAssign) {
        teacherId = subjectAssign.teacher_id;
        teacherName = teacherMap.get(subjectAssign.teacher_id) || 'Guru Mapel';
        assignmentType = 'subject_teacher';
      } else if (homeroomAssign) {
        teacherId = homeroomAssign.teacher_id;
        teacherName = `${homeroomTeacherName} (Wali Kelas)`;
        assignmentType = 'homeroom_teacher';
      }

      // Find scored students for this subject in this class
      // Check keys: cls.id, cls.name, uppercase variants
      // Buat index normalisasi agar progress tetap terbaca jika data score
      // menyimpan UUID, kode, atau nama kelas/mapel dengan format berbeda.
      const classKeys = Array.from(
        new Set(
          [
            cls.id,
            cls.name,
            cls.name?.replace(/^kelas\s+/i, '').trim(),
          ]
            .map(normalizeProgressKey)
            .filter(Boolean)
        )
      );

      const subjectKeys = Array.from(
        new Set(
          [
            subj.id,
            subj.code,
            subj.name,
            `subj_${subj.name || ''}`,
          ]
            .map(normalizeProgressKey)
            .filter(Boolean)
        )
      );

      const candidateKeys: string[] = [];
      for (const cKey of classKeys) {
        for (const sKey of subjectKeys) {
          candidateKeys.push(`${cKey}::${sKey}`);
        }
      }

      const matchedStudentIds = new Set<string>();
      for (const k of candidateKeys) {
        const foundSet = scoredStudentsMap.get(k);
        if (foundSet) {
          for (const sId of foundSet) {
            matchedStudentIds.add(sId);
          }
        }
      }

      const effectiveTotalStudents = Math.max(totalStudents, matchedStudentIds.size);
      const scoredCount = matchedStudentIds.size;
      const unscoredCount = Math.max(0, effectiveTotalStudents - scoredCount);

      // Level 2: Subject Progress Percentage
      const progressPercentage =
        effectiveTotalStudents > 0
          ? Math.min(100, Math.round((scoredCount / effectiveTotalStudents) * 100))
          : 0;

      // Status: 100% -> completed, 1-99% -> in_progress, 0% -> not_started
      let status: SubjectProgressStatus = 'not_started';
      if (progressPercentage === 100 && effectiveTotalStudents > 0) {
        status = 'completed';
        completedInClass++;
        globalCompletedSubjects++;
      } else if (progressPercentage > 0) {
        status = 'in_progress';
        inProgressInClass++;
        globalInProgressSubjects++;
      } else {
        notStartedInClass++;
        globalNotStartedSubjects++;
      }

      sumPercentageInClass += progressPercentage;
      globalTargetScored += effectiveTotalStudents;
      globalActualScored += scoredCount;

      subjectProgressList.push({
        subjectId: subj.id,
        subjectName: subj.name,
        subjectCode: subj.code,
        displayOrder: subj.display_order,
        category: subj.category,
        teacherId,
        teacherName,
        assignmentType,
        totalStudents: effectiveTotalStudents,
        scoredStudents: scoredCount,
        unscoredStudents: unscoredCount,
        progressPercentage,
        status,
        scoredStudentIds: Array.from(matchedStudentIds),
      });
    }

    // Level 3: Class Progress
    const totalSubjects = classSubjects.length;
    const overallClassProgress =
      totalSubjects > 0 ? Math.round(sumPercentageInClass / totalSubjects) : 0;

    let classStatus: SubjectProgressStatus = 'not_started';
    if (totalSubjects > 0 && completedInClass === totalSubjects) {
      classStatus = 'completed';
    } else if (completedInClass > 0 || inProgressInClass > 0) {
      classStatus = 'in_progress';
    }

    classProgressList.push({
      classId: cls.id,
      className: cls.name,
      grade: cls.grade,
      phase: cls.phase,
      academicLevelId: cls.academic_level_id,
      homeroomTeacherId,
      homeroomTeacherName,
      totalStudents,
      totalSubjects,
      completedSubjects: completedInClass,
      inProgressSubjects: inProgressInClass,
      notStartedSubjects: notStartedInClass,
      overallProgress: overallClassProgress,
      status: classStatus,
      subjects: subjectProgressList,
    });
  }

  const globalOverallProgress =
    globalTargetScored > 0 ? Math.round((globalActualScored / globalTargetScored) * 100) : 0;

  return {
    periodId,
    periodLabel,
    totalClasses: classes.length,
    totalSubjects: allSubjects.length,
    totalTeacherAssignments: assignments.length,
    totalTargetScoredEntries: globalTargetScored,
    totalActualScoredEntries: globalActualScored,
    overallProgress: globalOverallProgress,
    completedSubjectCount: globalCompletedSubjects,
    inProgressSubjectCount: globalInProgressSubjects,
    notStartedSubjectCount: globalNotStartedSubjects,
    classes: classProgressList,
  };
}

/**
 * Fetches canonical progress specifically for a single class.
 * Useful for fast refresh in Teacher Workspace after saving scores.
 */
export async function fetchCanonicalClassProgress(
  periodId: string,
  classId: string
): Promise<EraporClassProgress | null> {
  const fullProgress = await fetchCanonicalEraporProgress(periodId);
  const cleanId = classId.trim().toUpperCase();
  return (
    fullProgress.classes.find(
      (c) => c.classId.toUpperCase() === cleanId || c.className.toUpperCase() === cleanId
    ) || null
  );
}
