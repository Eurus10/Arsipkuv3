export type ExamType = 'SAS' | 'STS1' | 'STS2' | 'SAT' | 'US' | 'PH' | 'PAT' | 'PAS' | string;

export interface AnalysisQuestionConfig {
  pgCount: number;
  pgWeight: number;
  isianCount: number;
  isianWeight: number;
  cType: 'Uraian' | 'Essay' | 'Menjodohkan' | 'Lainnya';
  cCount: number;
  cWeight: number;
}

export interface StudentAnswers {
  pg: number[]; // 1 = Benar, 0 = Salah
  isian: number[]; // 1 = Benar, 0 = Salah atau skor 0..isianWeight
  c: number[]; // Skor 0..cWeight
}

export interface StudentSubjectResult {
  studentId: string;
  studentName: string;
  answers: StudentAnswers;
  totalScore: number;
  finalGrade: number; // 0..100
  isPassed: boolean;
}

export type SubjectAnalysisStatus = 'draft' | 'in_progress' | 'completed' | 'imported';

export interface AnalysisSubject {
  subjectId: string;
  subjectName: string;
  teacherName?: string;
  sheetName: string;
  status: SubjectAnalysisStatus;
  config: AnalysisQuestionConfig;
  studentResults: Record<string, StudentSubjectResult>; // Keyed by studentId
  maxScore: number;
  completedStudentsCount: number;
  updatedAt: string;
}

export interface AnalysisSession {
  formatType: 'ANALYSIS_PROJECT';
  formatVersion: number;
  sessionId: string;
  filePurpose: 'SESSION' | 'SUBJECT_IMPORT';
  schoolName?: string;
  classId: string;
  className: string;
  examType: ExamType;
  schoolYear: string;
  teacherName: string;
  analysisDate: string; // YYYY-MM-DD or formatted date string
  kktp: number; // default 70
  subjects: AnalysisSubject[];
  studentSnapshot: Array<{
    id: string;
    name: string;
    classId: string;
    schoolName?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  appVersion?: string;
}

export interface SubjectItemAnalysis {
  questionNumber: number;
  questionType: 'PG' | 'ISIAN' | 'C';
  label: string;
  maxScore: number;
  correctCount: number;
  totalAnswered: number;
  percentage: number;
}

export interface SubjectSummaryStats {
  totalStudents: number;
  completedStudents: number;
  averageGrade: number;
  highestGrade: number;
  lowestGrade: number;
  passedCount: number;
  failedCount: number;
  passedPercentage: number;
  itemAnalysis: SubjectItemAnalysis[];
}

export interface SessionStudentRekapRow {
  studentId: string;
  studentName: string;
  grades: Record<string, number | null>; // subjectId -> grade (or null if not completed)
  averageGrade: number;
  passedCount: number;
  failedCount: number;
  overallStatus: 'L' | 'TL';
}

export interface FileValidationResult {
  isValid: boolean;
  filePurpose: 'SESSION' | 'SUBJECT_IMPORT';
  session?: AnalysisSession;
  subjectToImport?: AnalysisSubject;
  errors: string[];
  warnings: string[];
  matchedStudentsCount: number;
  totalFileStudentsCount: number;
  conflictingSubjects: string[];
  newSubjects: string[];
}
