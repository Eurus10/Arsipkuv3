export type AnalysisSubmissionStatus = 'menunggu' | 'disetujui' | 'revisi' | 'telah_diprint';

export interface SubjectPrintStatus {
  status: AnalysisSubmissionStatus;
  printedAt?: string;
  approvedAt?: string;
  revisionNote?: string;
  lastSubmittedAt?: string;
  isRevisedAfterPrint?: boolean;
  completedStudents?: number;
  totalStudents?: number;
}

export interface SubmissionChatMessage {
  id: string;
  senderName: string;
  senderRole: 'admin' | 'guru' | 'system';
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface AnalysisSubmissionItem {
  id: string;
  submissionType: 'single_class' | 'multi_class' | 'session';
  subjectName: string;
  classId: string; // e.g. "4A" or "4A, 4B, 4C"
  className: string;
  examType: string;
  schoolYear: string;
  teacherName: string;
  teacherId?: string; // Whitelist ID if logged in
  teacherRoleTitle?: string; // e.g. "Wali Kelas 1A" or "Guru MTK"
  kktp: number;
  totalStudents: number;
  completedStudents: number;
  passedStudents?: number;
  averageGrade?: number;
  teacherNote?: string;
  adminNote?: string;
  status: AnalysisSubmissionStatus;
  subjectStatuses?: Record<string, SubjectPrintStatus>; // Individual status tracking per subject
  submittedAt: string;
  updatedAt?: string;
  messages?: SubmissionChatMessage[];
  payload: any; // Full session or subject data for Excel regeneration & preview
}
