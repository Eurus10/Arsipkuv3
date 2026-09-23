import { supabase, isSupabaseConfigured } from './supabase';
import { AcademicPeriod } from './academicPeriodService';
import { AcademicClass } from './teacherAssignmentStorage';
import { AcademicSubject } from './academicSubjectStorage';
import { TeacherUser } from '../types';

export interface EraporPeriodSummary {
  period: AcademicPeriod | null;
  allPeriods: AcademicPeriod[];
  totalClasses: number;
  totalTeacherAssignments: number;
  totalSubjects: number;
  overallProgress: number; // 0 - 100
  totalTargets: number;
  totalScored: number;
}

export type MonitoringStatus = 'completed' | 'in_progress' | 'not_started';

export interface EraporMonitoringRow {
  id: string; // classId::subjectId
  classId: string;
  className: string;
  classGrade: number | null;
  academicLevelId: string | null;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  teacherId: string | null;
  teacherName: string;
  assignmentType: 'subject_teacher' | 'homeroom_teacher' | 'unassigned';
  totalStudents: number;
  scoredStudents: number;
  unscoredStudents: number;
  progressPercentage: number;
  status: MonitoringStatus;
}

export interface ClassSubjectTreeItem {
  classId: string;
  className: string;
  grade: number | null;
  homeroomTeacherName?: string;
  totalStudents: number;
  subjects: {
    subjectId: string;
    subjectName: string;
    subjectCode: string | null;
    teacherName: string;
    teacherId: string | null;
    assignmentType: string;
    totalStudents: number;
    scoredStudents: number;
    progressPercentage: number;
    status: MonitoringStatus;
  }[];
}

const ensureConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }
};

/**
 * Fetch active period or specific period, along with list of all periods
 */
export async function fetchPeriods(): Promise<{
  activePeriod: AcademicPeriod | null;
  allPeriods: AcademicPeriod[];
}> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('academic_periods')
    .select('id, school_year, semester, label, is_active, is_archived')
    .order('school_year', { ascending: false })
    .order('semester', { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat periode akademik: ${error.message}`);
  }

  const allPeriods = (data || []) as AcademicPeriod[];
  const activePeriod = allPeriods.find((p) => p.is_active) || allPeriods[0] || null;

  return { activePeriod, allPeriods };
}

/**
 * Fetch complete dashboard summary for an academic period
 */
export async function fetchEraporDashboardSummary(
  periodId: string
): Promise<EraporPeriodSummary> {
  ensureConfigured();

  const { allPeriods } = await fetchPeriods();
  const currentPeriod = allPeriods.find((p) => p.id === periodId) || null;

  // 1. Total Classes
  const { count: classesCount, error: classErr } = await supabase
    .from('school_classes')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);
  if (classErr) throw classErr;

  // 2. Total Teacher Assignments for this period
  const { count: assignCount, error: assignErr } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('academic_period_id', periodId)
    .eq('active', true);
  if (assignErr) throw assignErr;

  // 3. Total Active Subjects
  const { count: subjectsCount, error: subjErr } = await supabase
    .from('academic_subjects')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);
  if (subjErr) throw subjErr;

  // 4. Calculate progress from monitoring data
  const monitoringData = await fetchEraporMonitoringData(periodId);
  let totalTargets = 0;
  let totalScored = 0;

  for (const row of monitoringData) {
    totalTargets += row.totalStudents;
    totalScored += row.scoredStudents;
  }

  const overallProgress =
    totalTargets > 0 ? Math.round((totalScored / totalTargets) * 100) : 0;

  return {
    period: currentPeriod,
    allPeriods,
    totalClasses: classesCount || 0,
    totalTeacherAssignments: assignCount || 0,
    totalSubjects: subjectsCount || 0,
    overallProgress,
    totalTargets,
    totalScored,
  };
}

/**
 * Fetch detailed monitoring progress per Class & Subject
 */
export async function fetchEraporMonitoringData(
  periodId: string
): Promise<EraporMonitoringRow[]> {
  ensureConfigured();

  // 1. Fetch active classes
  const { data: classesRaw, error: classErr } = await supabase
    .from('school_classes')
    .select('id, name, grade, phase, academic_level_id, active')
    .eq('active', true)
    .order('grade', { ascending: true })
    .order('name', { ascending: true });
  if (classErr) throw classErr;
  const classes = (classesRaw || []) as AcademicClass[];

  // 2. Fetch active subjects
  const { data: subjectsRaw, error: subjErr } = await supabase
    .from('academic_subjects')
    .select('id, academic_level_id, name, code, display_order, category, active')
    .eq('active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });
  if (subjErr) throw subjErr;
  const subjects = (subjectsRaw || []) as AcademicSubject[];

  // 3. Fetch teachers (to resolve names)
  const { data: teachersRaw, error: teacherErr } = await supabase
    .from('teachers')
    .select('id, name, status');
  if (teacherErr) throw teacherErr;
  const teacherMap = new Map<string, string>();
  for (const t of teachersRaw || []) {
    teacherMap.set(t.id, t.name);
  }

  // 4. Fetch assignments for this period
  const { data: assignmentsRaw, error: assignErr } = await supabase
    .from('teacher_assignments')
    .select('*')
    .eq('academic_period_id', periodId)
    .eq('active', true);
  if (assignErr) throw assignErr;
  const assignments = assignmentsRaw || [];

  // Group assignments by class_id
  const classAssignmentsMap = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = classAssignmentsMap.get(a.class_id) || [];
    list.push(a);
    classAssignmentsMap.set(a.class_id, list);
  }

  // 5. Fetch students count per class
  // We check enrollments first for this period
  const { data: enrollmentsRaw, error: enrollErr } = await supabase
    .from('student_enrollments')
    .select('student_id, class_id')
    .eq('academic_period_id', periodId);

  const studentCountByClassId = new Map<string, number>();

  if (!enrollErr && enrollmentsRaw && enrollmentsRaw.length > 0) {
    for (const e of enrollmentsRaw) {
      studentCountByClassId.set(
        e.class_id,
        (studentCountByClassId.get(e.class_id) || 0) + 1
      );
    }
  }

  // Also query students table to ensure classes with direct class_id / class_level matching are counted
  const { data: studentsRaw } = await supabase
    .from('students')
    .select('id, class_id, class_level, active')
    .eq('active', true);

  const directStudentCountByClass = new Map<string, number>();
  if (studentsRaw) {
    for (const st of studentsRaw) {
      const cId = st.class_id || st.class_level || '';
      if (cId) {
        directStudentCountByClass.set(
          cId.trim().toUpperCase(),
          (directStudentCountByClass.get(cId.trim().toUpperCase()) || 0) + 1
        );
      }
    }
  }

  const getStudentCountForClass = (cls: AcademicClass): number => {
    // 1. By class.id from enrollments
    const enrolled = studentCountByClassId.get(cls.id);
    if (enrolled && enrolled > 0) return enrolled;

    // 2. By class.id from students
    const directById = directStudentCountByClass.get(cls.id.toUpperCase());
    if (directById && directById > 0) return directById;

    // 3. By class.name from students (e.g. "1A", "2B")
    const directByName = directStudentCountByClass.get(cls.name.toUpperCase());
    if (directByName && directByName > 0) return directByName;

    return 0;
  };

  // 6. Fetch scored students from student_subject_scores for this period
  const { data: scoresRaw, error: scoresErr } = await supabase
    .from('student_subject_scores')
    .select('class_id, subject_id, student_id, sts_score, final_score')
    .eq('academic_period_id', periodId);

  if (scoresErr) throw scoresErr;

  // Map of `${classId}::${subjectId}` -> Set of studentIds who have a valid score
  const scoredStudentsMap = new Map<string, Set<string>>();
  for (const s of scoresRaw || []) {
    if (s.final_score !== null || s.sts_score !== null) {
      const key = `${s.class_id}::${s.subject_id}`;
      let set = scoredStudentsMap.get(key);
      if (!set) {
        set = new Set<string>();
        scoredStudentsMap.set(key, set);
      }
      set.add(s.student_id);
    }
  }

  // 7. Assemble monitoring rows
  const rows: EraporMonitoringRow[] = [];

  for (const cls of classes) {
    const classLevelId = cls.academic_level_id || `grade_${cls.grade}`;
    // Find subjects for this class's level
    const classSubjects = subjects.filter(
      (s) => s.academic_level_id === classLevelId || (cls.grade && s.academic_level_id === `grade_${cls.grade}`)
    );

    const classAssigns = classAssignmentsMap.get(cls.id) || [];
    const homeroomAssign = classAssigns.find(
      (a) => a.assignment_type === 'homeroom_teacher'
    );
    const homeroomTeacherName = homeroomAssign
      ? teacherMap.get(homeroomAssign.teacher_id) || 'Wali Kelas'
      : undefined;

    const totalStudents = getStudentCountForClass(cls);

    for (const subj of classSubjects) {
      // Find teacher assigned
      const subjectAssign = classAssigns.find(
        (a) => a.subject_id === subj.id && a.assignment_type === 'subject_teacher'
      );

      let teacherId: string | null = null;
      let teacherName = 'Belum Ditugaskan';
      let assignmentType: 'subject_teacher' | 'homeroom_teacher' | 'unassigned' =
        'unassigned';

      if (subjectAssign) {
        teacherId = subjectAssign.teacher_id;
        teacherName = teacherMap.get(subjectAssign.teacher_id) || 'Guru Mapel';
        assignmentType = 'subject_teacher';
      } else if (homeroomAssign) {
        teacherId = homeroomAssign.teacher_id;
        teacherName = `${homeroomTeacherName} (Wali Kelas)`;
        assignmentType = 'homeroom_teacher';
      }

      // Count scored students
      const key = `${cls.id}::${subj.id}`;
      const scoredCount = scoredStudentsMap.get(key)?.size || 0;
      const unscoredCount = Math.max(0, totalStudents - scoredCount);
      const progress =
        totalStudents > 0
          ? Math.min(100, Math.round((scoredCount / totalStudents) * 100))
          : 0;

      let status: MonitoringStatus = 'not_started';
      if (progress === 100 && totalStudents > 0) {
        status = 'completed';
      } else if (progress > 0) {
        status = 'in_progress';
      }

      rows.push({
        id: key,
        classId: cls.id,
        className: cls.name,
        classGrade: cls.grade,
        academicLevelId: cls.academic_level_id,
        subjectId: subj.id,
        subjectName: subj.name,
        subjectCode: subj.code,
        teacherId,
        teacherName,
        assignmentType,
        totalStudents,
        scoredStudents: scoredCount,
        unscoredStudents: unscoredCount,
        progressPercentage: progress,
        status,
      });
    }
  }

  return rows;
}

/**
 * Fetch hierarchical tree of classes -> subjects -> teacher for "Kelas & Mapel" view
 */
export async function fetchClassSubjectTree(
  periodId: string
): Promise<ClassSubjectTreeItem[]> {
  const monitoringRows = await fetchEraporMonitoringData(periodId);

  const classMap = new Map<string, ClassSubjectTreeItem>();

  for (const row of monitoringRows) {
    let item = classMap.get(row.classId);
    if (!item) {
      item = {
        classId: row.classId,
        className: row.className,
        grade: row.classGrade,
        totalStudents: row.totalStudents,
        subjects: [],
      };
      classMap.set(row.classId, item);
    }

    if (row.assignmentType === 'homeroom_teacher' && !item.homeroomTeacherName) {
      item.homeroomTeacherName = row.teacherName.replace(' (Wali Kelas)', '');
    }

    item.subjects.push({
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      subjectCode: row.subjectCode,
      teacherName: row.teacherName,
      teacherId: row.teacherId,
      assignmentType: row.assignmentType,
      totalStudents: row.totalStudents,
      scoredStudents: row.scoredStudents,
      progressPercentage: row.progressPercentage,
      status: row.status,
    });
  }

  return Array.from(classMap.values());
}
