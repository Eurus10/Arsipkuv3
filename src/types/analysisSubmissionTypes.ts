export type AnalysisSubmissionStatus = 'menunggu' | 'disetujui' | 'revisi' | 'telah_diprint';

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
  kktp: number;
  totalStudents: number;
  completedStudents: number;
  passedStudents?: number;
  averageGrade?: number;
  teacherNote?: string;
  adminNote?: string;
  status: AnalysisSubmissionStatus;
  submittedAt: string;
  updatedAt?: string;
  messages?: SubmissionChatMessage[];
  payload: any; // Full session or subject data for Excel regeneration & preview
}
