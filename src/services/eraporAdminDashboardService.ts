import { supabase, isSupabaseConfigured } from './supabase';
import { AcademicPeriod } from './academicPeriodService';
import {
  fetchCanonicalEraporProgress,
  EraporOverallMonitoringProgress,
  EraporClassProgress,
  EraporSubjectProgress,
  SubjectProgressStatus,
} from './eraporProgressService';

export interface EraporPeriodSummary {
  period: AcademicPeriod | null;
  allPeriods: AcademicPeriod[];
  totalClasses: number;
  totalTeacherAssignments: number;
  totalSubjects: number;
  overallProgress: number; // 0 - 100%
  totalTargets: number;
  totalScored: number;
  completedSubjectCount: number;
  inProgressSubjectCount: number;
  notStartedSubjectCount: number;
}

export type MonitoringStatus = SubjectProgressStatus;

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
  totalSubjects: number;
  completedSubjects: number;
  inProgressSubjects: number;
  notStartedSubjects: number;
  overallProgress: number;
  status: MonitoringStatus;
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
 * Fetch complete dashboard summary for an academic period using Canonical Progress
 */
export async function fetchEraporDashboardSummary(
  periodId: string
): Promise<EraporPeriodSummary> {
  ensureConfigured();

  const [{ allPeriods }, canonicalData] = await Promise.all([
    fetchPeriods(),
    fetchCanonicalEraporProgress(periodId),
  ]);

  const currentPeriod = allPeriods.find((p) => p.id === periodId) || null;

  return {
    period: currentPeriod,
    allPeriods,
    totalClasses: canonicalData.totalClasses,
    totalTeacherAssignments: canonicalData.totalTeacherAssignments,
    totalSubjects: canonicalData.totalSubjects,
    overallProgress: canonicalData.overallProgress,
    totalTargets: canonicalData.totalTargetScoredEntries,
    totalScored: canonicalData.totalActualScoredEntries,
    completedSubjectCount: canonicalData.completedSubjectCount,
    inProgressSubjectCount: canonicalData.inProgressSubjectCount,
    notStartedSubjectCount: canonicalData.notStartedSubjectCount,
  };
}

/**
 * Fetch detailed monitoring progress per Class & Subject from Canonical Progress Source
 */
export async function fetchEraporMonitoringData(
  periodId: string
): Promise<EraporMonitoringRow[]> {
  ensureConfigured();

  const canonicalData = await fetchCanonicalEraporProgress(periodId);
  const rows: EraporMonitoringRow[] = [];

  for (const cls of canonicalData.classes) {
    for (const subj of cls.subjects) {
      rows.push({
        id: `${cls.classId}::${subj.subjectId}`,
        classId: cls.classId,
        className: cls.className,
        classGrade: cls.grade,
        academicLevelId: cls.academicLevelId,
        subjectId: subj.subjectId,
        subjectName: subj.subjectName,
        subjectCode: subj.subjectCode,
        teacherId: subj.teacherId,
        teacherName: subj.teacherName,
        assignmentType: subj.assignmentType,
        totalStudents: subj.totalStudents,
        scoredStudents: subj.scoredStudents,
        unscoredStudents: subj.unscoredStudents,
        progressPercentage: subj.progressPercentage,
        status: subj.status,
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
  ensureConfigured();

  const canonicalData = await fetchCanonicalEraporProgress(periodId);

  return canonicalData.classes.map((cls) => ({
    classId: cls.classId,
    className: cls.className,
    grade: cls.grade,
    homeroomTeacherName: cls.homeroomTeacherName,
    totalStudents: cls.totalStudents,
    totalSubjects: cls.totalSubjects,
    completedSubjects: cls.completedSubjects,
    inProgressSubjects: cls.inProgressSubjects,
    notStartedSubjects: cls.notStartedSubjects,
    overallProgress: cls.overallProgress,
    status: cls.status,
    subjects: cls.subjects.map((s) => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      subjectCode: s.subjectCode,
      teacherName: s.teacherName,
      teacherId: s.teacherId,
      assignmentType: s.assignmentType,
      totalStudents: s.totalStudents,
      scoredStudents: s.scoredStudents,
      progressPercentage: s.progressPercentage,
      status: s.status,
    })),
  }));
}
