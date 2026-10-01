export type TeacherNotificationType =
  | 'print'
  | 'revision'
  | 'approved'
  | 'chat'
  | 'announcement';

export interface TeacherNotificationItem {
  id: string;
  teacherId?: string; // Target teacher id ('all' for general school announcement)
  teacherName?: string;
  title: string;
  message: string;
  type: TeacherNotificationType;
  submissionId?: string;
  subjectName?: string;
  className?: string;
  createdAt: string;
  isRead?: boolean;
  adminSenderName?: string;
  linkAction?: 'analysis' | 'discussion' | 'rapor';
}
