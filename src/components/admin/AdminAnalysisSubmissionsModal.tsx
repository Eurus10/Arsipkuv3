import React, { useState, useEffect, useMemo } from 'react';
import {
  Inbox,
  X,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  FileSpreadsheet,
  Users,
  GraduationCap,
  Calendar,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Coffee,
  Check,
  Printer,
  Folder,
  FolderOpen,
  LayoutGrid,
  List,
  Megaphone,
  Send,
  UserCheck,
  Layers,
  BookOpen,
  User,
  Hourglass,
  Edit3,
} from 'lucide-react';
import {
  AnalysisSubmissionItem,
  AnalysisSubmissionStatus,
} from '../../types/analysisSubmissionTypes';
import {
  subscribeToAnalysisSubmissions,
  updateAnalysisSubmissionStatus,
  updateSingleSubjectStatus,
  deleteAnalysisSubmission,
} from '../../services/analysisSubmissionService';
import {
  exportSingleSubjectToExcel,
  exportMultiClassSubjectToExcel,
  exportAnalysisProjectToExcel,
} from '../../services/analysis/analysisExcelService';
import { getStoredStudentsLocal } from '../../services/studentStorage';
import { MASTER_CLASSES } from '../../data/masterExamData';
import { AnalysisSubmissionChatModal } from '../analysis/AnalysisSubmissionChatModal';
import {
  createBroadcastAnnouncement,
  sendTeacherNotification,
} from '../../services/teacherNotificationService';
import {
  AttendanceSubmissionItem,
  AttendanceSubmissionStatus,
  subscribeToAttendanceSubmissions,
  updateAttendanceSubmissionStatus,
  deleteAttendanceSubmission,
} from '../../services/attendanceSubmissionService';
import { exportGrafikKehadiranToExcel } from '../../services/administrasiExcelService';

interface AdminAnalysisSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface SubjectStudentStats {
  completed: number;
  total: number;
  isComplete: boolean;
  missingCount: number;
}

export function getSubjectStudentStats(
  sub: AnalysisSubmissionItem,
  subjectName?: string
): SubjectStudentStats {
  // 1. Direct check in subjectStatuses if available and has valid numbers
  if (subjectName && sub.subjectStatuses && sub.subjectStatuses[subjectName]) {
    const st = sub.subjectStatuses[subjectName];
    if (
      st.completedStudents !== undefined &&
      st.totalStudents !== undefined &&
      st.totalStudents > 0
    ) {
      const isComplete = st.completedStudents >= st.totalStudents;
      return {
        completed: st.completedStudents,
        total: st.totalStudents,
        isComplete,
        missingCount: Math.max(0, st.totalStudents - st.completedStudents),
      };
    }
  }

  // 2. Extraction from payload.session.subjects (Walas multi-subject session)
  const payload = sub.payload;
  if (payload?.session?.subjects && Array.isArray(payload.session.subjects)) {
    const subjects = payload.session.subjects;
    const totalClassStudents =
      payload.students?.length ||
      payload.session.studentSnapshot?.length ||
      sub.totalStudents ||
      0;

    if (subjectName) {
      const q = subjectName.trim().toLowerCase();
      const targetSubj = subjects.find((s: any) => {
        const sName = (s.name || s.subjectName || '').trim().toLowerCase();
        return sName === q || sName.includes(q) || q.includes(sName);
      });
      if (targetSubj) {
        const completed =
          targetSubj.completedStudentsCount !== undefined
            ? targetSubj.completedStudentsCount
            : targetSubj.studentResults
            ? Object.keys(targetSubj.studentResults).length
            : 0;
        const total = totalClassStudents || sub.totalStudents || completed;
        const isComplete = completed >= total && total > 0;
        return {
          completed,
          total,
          isComplete,
          missingCount: Math.max(0, total - completed),
        };
      }
    }
  }

  // 3. Extraction from payload.classSessionsMap (Guru Mapel multi-class mode)
  if (payload?.classSessionsMap && typeof payload.classSessionsMap === 'object') {
    if (subjectName) {
      const q = subjectName.trim().toLowerCase();
      const targetKey = Object.keys(payload.classSessionsMap).find(
        (k) => k.trim().toLowerCase() === q || k.toLowerCase().includes(q) || q.includes(k.toLowerCase())
      );
      if (targetKey && payload.classSessionsMap[targetKey]) {
        const classSess = payload.classSessionsMap[targetKey];
        const classStudentsCount =
          payload.allStudents?.filter(
            (st: any) => (st.classId || '').toLowerCase() === targetKey.toLowerCase()
          ).length || 0;
        const completed =
          classSess.completedStudentsCount !== undefined
            ? classSess.completedStudentsCount
            : classSess.studentResults
            ? Object.keys(classSess.studentResults).length
            : 0;
        const total = classStudentsCount || sub.totalStudents || completed;
        return {
          completed,
          total,
          isComplete: completed >= total && total > 0,
          missingCount: Math.max(0, total - completed),
        };
      }
    }
  }

  // 4. Fallback to sub.completedStudents and sub.totalStudents
  let completed = sub.completedStudents || 0;
  const total = sub.totalStudents || 0;
  // If multi-subject submission and completed is the multi-subject aggregate (> total), clamp safely
  if (sub.subjectStatuses && Object.keys(sub.subjectStatuses).length > 1 && total > 0 && completed > total) {
    completed = total;
  }
  return {
    completed,
    total,
    isComplete: completed >= total && total > 0,
    missingCount: Math.max(0, total - completed),
  };
}

export function getSubmissionStudentStats(sub: AnalysisSubmissionItem) {
  if (sub.subjectStatuses && Object.keys(sub.subjectStatuses).length > 1) {
    let sumCompleted = 0;
    let sumTotal = 0;
    let completeSubjects = 0;
    const totalSubjects = Object.keys(sub.subjectStatuses).length;

    Object.keys(sub.subjectStatuses).forEach((sName) => {
      const stats = getSubjectStudentStats(sub, sName);
      sumCompleted += stats.completed;
      sumTotal += stats.total;
      if (stats.isComplete) completeSubjects++;
    });

    return {
      completed: sumCompleted,
      total: sumTotal,
      completeSubjects,
      totalSubjects,
      isAllComplete: completeSubjects === totalSubjects,
    };
  }

  const stats = getSubjectStudentStats(sub);
  return {
    completed: stats.completed,
    total: stats.total,
    completeSubjects: stats.isComplete ? 1 : 0,
    totalSubjects: 1,
    isAllComplete: stats.isComplete,
  };
}

export interface TeacherSubjectStatSummary {
  name: string;
  className: string;
  completed: number;
  total: number;
  isComplete: boolean;
  missingCount: number;
  status: AnalysisSubmissionStatus;
}

interface TeacherGroup {
  teacherKey: string;
  teacherName: string;
  teacherId?: string;
  teacherRoleTitle?: string;
  submissions: AnalysisSubmissionItem[];
  totalSubjects: number;
  printedCount: number;
  pendingCount: number;
  revisionCount: number;
  approvedCount: number;
  latestSubmittedAt: string;
  totalCompletedStudents: number;
  totalStudentsSlots: number;
  incompleteSubjectsCount: number;
  allSubjectStats: TeacherSubjectStatSummary[];
}

export const AdminAnalysisSubmissionsModal: React.FC<AdminAnalysisSubmissionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [submissions, setSubmissions] = useState<AnalysisSubmissionItem[]>([]);
  const [mainTab, setMainTab] = useState<'analisis' | 'absensi'>('analisis');
  const [viewMode, setViewMode] = useState<'folder' | 'linear'>('folder');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | AnalysisSubmissionStatus>('all');
  
  // Attendance submissions state
  const [attendanceSubmissions, setAttendanceSubmissions] = useState<AttendanceSubmissionItem[]>([]);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | AttendanceSubmissionStatus>('all');
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState<string>('');
  const [selectedAttendanceForRevision, setSelectedAttendanceForRevision] = useState<AttendanceSubmissionItem | null>(null);
  const [attendanceRevisionNote, setAttendanceRevisionNote] = useState<string>('');
  const [showAttendanceRevisionModal, setShowAttendanceRevisionModal] = useState<boolean>(false);

  // Expanded teacher folder cards & pop-up modal state
  const [expandedTeacherKeys, setExpandedTeacherKeys] = useState<Record<string, boolean>>({});
  const [selectedTeacherKeyForModal, setSelectedTeacherKeyForModal] = useState<string | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<'list' | 'grid'>('list');

  // Chat Modal State
  const [chatSubmission, setChatSubmission] = useState<AnalysisSubmissionItem | null>(null);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);

  // Revision Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<AnalysisSubmissionItem | null>(null);
  const [revisionSubjectName, setRevisionSubjectName] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState<string>('');
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  const [announcementTitle, setAnnouncementTitle] = useState<string>('');
  const [announcementMessage, setAnnouncementMessage] = useState<string>('');
  const [announcementTarget, setAnnouncementTarget] = useState<string>('all');
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState<boolean>(false);

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToAnalysisSubmissions((items) => {
      setSubmissions(items);
    });
    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAttendanceSubmissions((items) => {
      setAttendanceSubmissions(items);
    });
    return () => unsub();
  }, [isOpen]);

  const handleMarkAttendancePrinted = async (item: AttendanceSubmissionItem) => {
    try {
      await updateAttendanceSubmissionStatus(item.id, 'telah_diprint');
      setActionSuccessMsg(`Rekap absensi ${item.className} (${item.periodLabel}) ditandai: Telah di-Print.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to mark attendance as printed:', err);
    }
  };

  const handleMarkAttendanceApproved = async (item: AttendanceSubmissionItem) => {
    try {
      await updateAttendanceSubmissionStatus(item.id, 'disetujui');
      setActionSuccessMsg(`Rekap absensi ${item.className} (${item.periodLabel}) disetujui.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to approve attendance:', err);
    }
  };

  const handleOpenAttendanceRevision = (item: AttendanceSubmissionItem) => {
    setSelectedAttendanceForRevision(item);
    setAttendanceRevisionNote(item.adminNote || '');
    setShowAttendanceRevisionModal(true);
  };

  const handleSubmitAttendanceRevision = async () => {
    if (!selectedAttendanceForRevision) return;
    try {
      await updateAttendanceSubmissionStatus(
        selectedAttendanceForRevision.id,
        'revisi',
        attendanceRevisionNote.trim() || 'Mohon periksa kembali kelengkapan presensi siswa.'
      );
      setActionSuccessMsg(`Catatan revisi untuk ${selectedAttendanceForRevision.className} telah dikirim.`);
      setShowAttendanceRevisionModal(false);
      setSelectedAttendanceForRevision(null);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to update attendance revision:', err);
    }
  };

  const handleExportAttendanceExcel = async (item: AttendanceSubmissionItem) => {
    try {
      const rows = item.rows && item.rows.length > 0 ? item.rows : [
        {
          periode: item.periodLabel,
          totalSiswa: item.totalStudents,
          hariEfektif: item.effectiveDays,
          totalHadir: item.totalH,
          sakit: item.totalS,
          izin: item.totalI,
          alpha: item.totalA,
          rate: item.attendanceRate,
        }
      ];

      await exportGrafikKehadiranToExcel({
        schoolName: 'SEKOLAH DASAR ISLAM TERPADU AL FIKRI',
        schoolYear: item.schoolYear.startsWith('TAHUN') ? item.schoolYear : `TAHUN PELAJARAN ${item.schoolYear.replace(/^TP\s*/i, '')}`,
        classLevel: item.className.startsWith('Kelas') ? item.className : `Kelas ${item.className}`,
        periodType: item.periodType,
        periodLabel: item.periodLabel,
        headmasterName: item.headmasterName || 'H. M. HALIM MUSTOMI, S.Pd.',
        teacherName: item.teacherName || 'Wali Kelas',
        rows,
      });

      setActionSuccessMsg(`File Excel rekap absensi ${item.className} berhasil diunduh.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to export attendance Excel:', err);
    }
  };

  const handleDeleteAttendance = async (id: string, name: string) => {
    if (!window.confirm(`Hapus setoran absensi "${name}" dari daftar?`)) return;
    try {
      await deleteAttendanceSubmission(id);
      setActionSuccessMsg('Setoran absensi berhasil dihapus.');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to delete attendance submission:', err);
    }
  };

  const filteredAttendance = useMemo(() => {
    return attendanceSubmissions.filter((item) => {
      if (attendanceStatusFilter !== 'all' && item.status !== attendanceStatusFilter) {
        return false;
      }
      if (attendanceSearchQuery.trim()) {
        const q = attendanceSearchQuery.toLowerCase();
        const matchClass = (item.className || '').toLowerCase().includes(q);
        const matchTeacher = (item.teacherName || '').toLowerCase().includes(q);
        const matchPeriod = (item.periodLabel || '').toLowerCase().includes(q);
        if (!matchClass && !matchTeacher && !matchPeriod) return false;
      }
      return true;
    });
  }, [attendanceSubmissions, attendanceStatusFilter, attendanceSearchQuery]);

  const pendingAttendanceCount = useMemo(() => {
    return attendanceSubmissions.filter((s) => s.status === 'menunggu').length;
  }, [attendanceSubmissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Status filter
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (sub.teacherName || '').toLowerCase().includes(q);
        const matchSubject = (sub.subjectName || '').toLowerCase().includes(q);
        const matchClass = (sub.className || '').toLowerCase().includes(q);
        if (!matchName && !matchSubject && !matchClass) return false;
      }

      return true;
    });
  }, [submissions, statusFilter, searchQuery]);

  // Group submissions by Teacher for Folder / Container Grid
  const teacherGroups = useMemo<TeacherGroup[]>(() => {
    const groupsMap = new Map<string, TeacherGroup>();

    filteredSubmissions.forEach((sub) => {
      const teacherKey = (sub.teacherId || sub.teacherName || 'Guru Pengampu').trim();
      const existing = groupsMap.get(teacherKey);

      // Count individual subjects inside this submission
      let subjectsInSub = 1;
      let printedInSub = 0;
      let pendingInSub = 0;
      let revisionInSub = 0;
      let approvedInSub = 0;

      if (sub.subjectStatuses && Object.keys(sub.subjectStatuses).length > 0) {
        subjectsInSub = Object.keys(sub.subjectStatuses).length;
        Object.values(sub.subjectStatuses).forEach((st) => {
          if (st.status === 'telah_diprint') printedInSub++;
          else if (st.status === 'revisi') revisionInSub++;
          else if (st.status === 'disetujui') approvedInSub++;
          else pendingInSub++;
        });
      } else {
        if (sub.status === 'telah_diprint') printedInSub = 1;
        else if (sub.status === 'revisi') revisionInSub = 1;
        else if (sub.status === 'disetujui') approvedInSub = 1;
        else pendingInSub = 1;
      }

      // Calculate student progress in this submission
      const subStudentStats = getSubmissionStudentStats(sub);
      const completedStudentsInSub = subStudentStats.completed;
      const totalStudentsInSub = subStudentStats.total;
      const incompleteInSub = subStudentStats.totalSubjects - subStudentStats.completeSubjects;

      // Collect per-subject stats for quick chips / pills
      const subSubjectStatsList: TeacherSubjectStatSummary[] = [];
      if (sub.subjectStatuses && Object.keys(sub.subjectStatuses).length > 0) {
        Object.entries(sub.subjectStatuses).forEach(([sName, sStat]) => {
          const stats = getSubjectStudentStats(sub, sName);
          subSubjectStatsList.push({
            name: sName,
            className: sub.className,
            completed: stats.completed,
            total: stats.total,
            isComplete: stats.isComplete,
            missingCount: stats.missingCount,
            status: sStat.status,
          });
        });
      } else {
        const stats = getSubjectStudentStats(sub);
        subSubjectStatsList.push({
          name: sub.subjectName,
          className: sub.className,
          completed: stats.completed,
          total: stats.total,
          isComplete: stats.isComplete,
          missingCount: stats.missingCount,
          status: sub.status,
        });
      }

      if (existing) {
        existing.submissions.push(sub);
        existing.totalSubjects += subjectsInSub;
        existing.printedCount += printedInSub;
        existing.pendingCount += pendingInSub;
        existing.revisionCount += revisionInSub;
        existing.approvedCount += approvedInSub;
        existing.totalCompletedStudents += completedStudentsInSub;
        existing.totalStudentsSlots += totalStudentsInSub;
        existing.incompleteSubjectsCount += incompleteInSub;
        existing.allSubjectStats.push(...subSubjectStatsList);
        if (new Date(sub.submittedAt).getTime() > new Date(existing.latestSubmittedAt).getTime()) {
          existing.latestSubmittedAt = sub.submittedAt;
        }
      } else {
        groupsMap.set(teacherKey, {
          teacherKey,
          teacherName: sub.teacherName || 'Guru Pengampu',
          teacherId: sub.teacherId,
          teacherRoleTitle: sub.teacherRoleTitle,
          submissions: [sub],
          totalSubjects: subjectsInSub,
          printedCount: printedInSub,
          pendingCount: pendingInSub,
          revisionCount: revisionInSub,
          approvedCount: approvedInSub,
          latestSubmittedAt: sub.submittedAt,
          totalCompletedStudents: completedStudentsInSub,
          totalStudentsSlots: totalStudentsInSub,
          incompleteSubjectsCount: incompleteInSub,
          allSubjectStats: subSubjectStatsList,
        });
      }
    });

    return Array.from(groupsMap.values()).sort(
      (a, b) => new Date(b.latestSubmittedAt).getTime() - new Date(a.latestSubmittedAt).getTime()
    );
  }, [filteredSubmissions]);

  const selectedTeacherGroup = useMemo(() => {
    if (!selectedTeacherKeyForModal) return null;
    return teacherGroups.find((g) => g.teacherKey === selectedTeacherKeyForModal) || null;
  }, [teacherGroups, selectedTeacherKeyForModal]);

  const pendingCount = useMemo(() => {
    return submissions.filter((s) => s.status === 'menunggu').length;
  }, [submissions]);

  if (!isOpen) return null;

  const toggleTeacherFolder = (teacherKey: string) => {
    setSelectedTeacherKeyForModal(teacherKey);
  };

  const handleApprove = async (sub: AnalysisSubmissionItem) => {
    try {
      await updateAnalysisSubmissionStatus(sub.id, 'disetujui');
      setActionSuccessMsg(`Setoran ${sub.subjectName} (${sub.className}) telah disetujui.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to approve submission:', err);
    }
  };

  const handleMarkPrinted = async (sub: AnalysisSubmissionItem) => {
    try {
      await updateAnalysisSubmissionStatus(sub.id, 'telah_diprint');
      setActionSuccessMsg(`Semua mapel di ${sub.subjectName} (${sub.className}) ditandai: Telah di-Print.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to mark submission as printed:', err);
    }
  };

  const handleMarkSingleSubjectPrinted = async (
    sub: AnalysisSubmissionItem,
    subjectName: string
  ) => {
    try {
      await updateSingleSubjectStatus(sub.id, subjectName, 'telah_diprint');
      setActionSuccessMsg(`Mapel "${subjectName}" (${sub.className}) berhasil ditandai: Telah di-Print.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to mark single subject as printed:', err);
    }
  };

  const handleMarkSingleSubjectApproved = async (
    sub: AnalysisSubmissionItem,
    subjectName: string
  ) => {
    try {
      await updateSingleSubjectStatus(sub.id, subjectName, 'disetujui');
      setActionSuccessMsg(`Mapel "${subjectName}" (${sub.className}) berhasil disetujui.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to approve single subject:', err);
    }
  };

  const handleOpenRevision = (sub: AnalysisSubmissionItem, subjectName?: string) => {
    setSelectedSubmission(sub);
    setRevisionSubjectName(subjectName || null);
    setRevisionNote(sub.adminNote || '');
    setShowRevisionModal(true);
  };

  const handleSubmitRevision = async () => {
    if (!selectedSubmission) return;
    try {
      if (revisionSubjectName) {
        await updateSingleSubjectStatus(
          selectedSubmission.id,
          revisionSubjectName,
          'revisi',
          revisionNote.trim() || 'Mohon periksa kembali kelengkapan skor siswa.'
        );
        setActionSuccessMsg(`Catatan revisi untuk mapel "${revisionSubjectName}" telah disimpan.`);
      } else {
        await updateAnalysisSubmissionStatus(
          selectedSubmission.id,
          'revisi',
          revisionNote.trim() || 'Mohon periksa kembali kelengkapan skor siswa.'
        );
        setActionSuccessMsg('Catatan revisi telah disimpan untuk guru.');
      }
      setShowRevisionModal(false);
      setSelectedSubmission(null);
      setRevisionSubjectName(null);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to update revision status:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus setoran analisis "${name}" dari daftar?`)) return;
    try {
      await deleteAnalysisSubmission(id);
      setActionSuccessMsg('Setoran berhasil dihapus.');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to delete submission:', err);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      alert('Judul dan pesan pengumuman wajib diisi.');
      return;
    }
    setIsSendingAnnouncement(true);
    try {
      if (announcementTarget === 'all') {
        await createBroadcastAnnouncement(
          announcementTitle.trim(),
          announcementMessage.trim(),
          'Pak Zaki (Admin)',
          'analysis'
        );
        setActionSuccessMsg('Pengumuman berhasil disiarkan ke seluruh dewan guru.');
      } else {
        const targetTeacher = teacherGroups.find((g) => g.teacherKey === announcementTarget);
        await sendTeacherNotification({
          teacherId: targetTeacher?.teacherId,
          teacherName: targetTeacher?.teacherName || 'Guru SDIT',
          title: announcementTitle.trim(),
          message: announcementMessage.trim(),
          type: 'announcement',
          adminSenderName: 'Pak Zaki (Admin)',
          linkAction: 'analysis',
        });
        setActionSuccessMsg(`Pesan pemberitahuan berhasil dikirimkan ke ${targetTeacher?.teacherName}.`);
      }
      setShowAnnouncementModal(false);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Failed to send announcement:', err);
      alert('Gagal mengirimkan pengumuman.');
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  const handleDownloadExcel = (sub: AnalysisSubmissionItem, specificSubjectName?: string) => {
    try {
      const payload = sub.payload;
      if (!payload) {
        alert('Data payload berkas tidak tersedia.');
        return;
      }

      if (payload.mode === 'single_class' || sub.submissionType === 'single_class') {
        if (payload.activeClassSession && payload.activeSubjectInSession) {
          const studentsForClass =
            payload.activeClassStudents && payload.activeClassStudents.length > 0
              ? payload.activeClassStudents
              : getStoredStudentsLocal().filter(
                  (s) => s.classId.toLowerCase() === sub.classId.toLowerCase()
                );

          exportSingleSubjectToExcel(
            payload.activeClassSession,
            payload.activeSubjectInSession,
            studentsForClass
          );
          return;
        }
      }

      if (payload.mode === 'multi_class' || sub.submissionType === 'multi_class') {
        const storedStudents = getStoredStudentsLocal();
        exportMultiClassSubjectToExcel({
          subjectName: payload.subjectName || sub.subjectName,
          teacherName: payload.teacherName || sub.teacherName,
          examType: payload.examType || sub.examType,
          schoolYear: payload.schoolYear || sub.schoolYear,
          kktp: payload.kktp || sub.kktp,
          classSessionsMap: payload.classSessionsMap || {},
          allStudents:
            payload.allStudents && payload.allStudents.length > 0
              ? payload.allStudents
              : storedStudents,
          masterClasses:
            payload.masterClasses && payload.masterClasses.length > 0
              ? payload.masterClasses
              : MASTER_CLASSES,
          selectedClassIds: payload.selectedClassIds || [sub.classId],
        });
        return;
      }

      if (payload.session) {
        const studentsToUse =
          payload.students && payload.students.length > 0
            ? payload.students
            : getStoredStudentsLocal().filter(
                (s) => s.classId.toLowerCase() === (payload.session.classId || '').toLowerCase()
              );

        // If specific subject is requested from multi-subject session
        if (specificSubjectName && payload.session.subjects) {
          const targetSubj = payload.session.subjects.find(
            (s: any) => (s.name || '').toLowerCase() === specificSubjectName.toLowerCase()
          );
          if (targetSubj) {
            exportSingleSubjectToExcel(payload.session, targetSubj, studentsToUse);
            return;
          }
        }

        exportAnalysisProjectToExcel(payload.session, studentsToUse);
        return;
      }

      alert('Format berkas tidak dikenali untuk ekspor langsung.');
    } catch (err) {
      console.error('Failed to download Excel for submission:', err);
      alert('Gagal mengunduh Excel setoran.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl bg-slate-900 border border-[#2A3044] rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 text-slate-100 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/10 shrink-0">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white">Pusat Setoran Guru</h3>
                {(pendingCount > 0 || pendingAttendanceCount > 0) && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-extrabold border border-amber-500/30 animate-pulse">
                    {pendingCount + pendingAttendanceCount} Menunggu Cetak / Verifikasi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pusat antrean cetak &amp; validasi berkas analisis nilai dan rekap absensi SDIT Al Fikri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Broadcast Announcement Button */}
            <button
              type="button"
              onClick={() => setShowAnnouncementModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              title="Kirim pesan atau info rapor langsung ke dashboard guru"
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Kirim Info / Pesan</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action success alert */}
        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 shrink-0 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Main Tab Navigation: Setoran Analisis vs Setoran Absensi */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setMainTab('analisis')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mainTab === 'analisis'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black shadow-lg shadow-teal-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Setoran Analisis Nilai</span>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                mainTab === 'analisis' ? 'bg-slate-950/30 text-slate-950' : 'bg-white/10 text-slate-300'
              }`}
            >
              {submissions.length}
            </span>
            {pendingCount > 0 && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                title={`${pendingCount} menunggu cetak`}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMainTab('absensi')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mainTab === 'absensi'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black shadow-lg shadow-teal-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Setoran Rekap Absensi</span>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                mainTab === 'absensi' ? 'bg-slate-950/30 text-slate-950' : 'bg-white/10 text-slate-300'
              }`}
            >
              {attendanceSubmissions.length}
            </span>
            {pendingAttendanceCount > 0 && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                title={`${pendingAttendanceCount} menunggu cetak`}
              />
            )}
          </button>
        </div>

        {/* TAB 1: SETORAN ANALISIS NILAI */}
        {mainTab === 'analisis' && (
          <>
            {/* Control Toolbar: View Toggle, Search & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-1">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('folder')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'folder'
                        ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Tampilan Folder Kontainer Akun Guru"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Grid Folder Guru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('linear')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'linear'
                        ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Tampilan Linier Semua Setoran"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Semua Setoran ({filteredSubmissions.length})</span>
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama guru, mapel, atau kelas..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/10 shrink-0 overflow-x-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'all'
                      ? 'bg-teal-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('menunggu')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'menunggu'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⏳ Menunggu ({submissions.filter((s) => s.status === 'menunggu').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('telah_diprint')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'telah_diprint'
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🖨️ Telah di-Print ({submissions.filter((s) => s.status === 'telah_diprint').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('disetujui')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'disetujui'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✓ Disetujui ({submissions.filter((s) => s.status === 'disetujui').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('revisi')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'revisi'
                      ? 'bg-rose-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚠ Revisi ({submissions.filter((s) => s.status === 'revisi').length})
                </button>
              </div>
            </div>

        {/* Content View: FOLDER GRID vs LINEAR LIST */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-white/5 space-y-2">
              <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-400">Belum ada berkas setoran analisis yang cocok.</p>
              <p className="text-[11px] text-slate-500">
                Saat guru menekan tombol "Kirim ke Pak Zaki", berkas analisis soal akan muncul di sini secara otomatis.
              </p>
            </div>
          ) : viewMode === 'folder' ? (
            /* VIEW MODE 1: GRID FOLDER GURU (MINIMALIS ESTETIK BERBASIS SIMBOL WARNA) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {teacherGroups.map((group) => {
                const isSelected = selectedTeacherKeyForModal === group.teacherKey;
                const initials = group.teacherName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0].toUpperCase())
                  .join('');

                const progressPercent = Math.min(
                  100,
                  Math.round(
                    (group.totalCompletedStudents / Math.max(1, group.totalStudentsSlots)) * 100
                  ) || 0
                );

                return (
                  <div
                    key={group.teacherKey}
                    onClick={() => toggleTeacherFolder(group.teacherKey)}
                    className={`bg-[#0d1424] border rounded-2xl transition-all overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl cursor-pointer group ${
                      isSelected
                        ? 'border-teal-500/80 ring-2 ring-teal-500/30 shadow-teal-950/50'
                        : 'border-[#1b253b] hover:border-teal-500/50 hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Folder Header Card: Ultra-Clean, Simbol & Warna Saja */}
                    <div className="p-4 flex flex-col justify-between gap-3 h-full">
                      {/* Top Row: Avatar, Name & Status Symbol */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#141e34] border border-teal-500/30 text-teal-300 font-black text-xs flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 group-hover:border-teal-400/60 transition-all">
                            {initials || <UserCheck className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-teal-300 transition-colors truncate">
                              {group.teacherName}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              {group.teacherRoleTitle || group.submissions[0]?.className || 'Guru SDIT'}
                            </p>
                          </div>
                        </div>

                        {/* Single Primary Status Icon Indicator */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {group.revisionCount > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-black shadow-sm"
                              title="Terdapat catatan revisi yang perlu diperbaiki guru"
                            >
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                              <span>⚠️ Revisi</span>
                            </span>
                          ) : group.incompleteSubjectsCount > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black shadow-sm"
                              title={`${group.incompleteSubjectsCount} mapel masih ada siswa belum dinilai`}
                            >
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                              <span>⏳ Mengisi</span>
                            </span>
                          ) : group.pendingCount > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black shadow-sm"
                              title="Nilai lengkap, siap di-print"
                            >
                              <span className="w-2 h-2 rounded-full bg-cyan-400" />
                              <span>🖨️ Siap Cetak</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black shadow-sm"
                              title="Semua nilai lengkap & selesai dicetak"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span>✓ Selesai</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Row: Simbol Warna Per-Mapel (Compact Color Dots + Tooltip) */}
                      {group.allSubjectStats && group.allSubjectStats.length > 0 && (
                        <div className="flex items-center justify-between py-2 px-2.5 bg-[#080d19] rounded-xl border border-[#1b253b] gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {group.allSubjectStats.slice(0, 10).map((st, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold cursor-default transition-all hover:scale-125 ${
                                  st.status === 'telah_diprint'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : st.isComplete
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                }`}
                                title={`${st.name} (${st.className}): ${st.completed}/${st.total} Siswa • ${
                                  st.isComplete ? 'Selesai / Lengkap ✓' : `${st.missingCount} Siswa Belum Dinilai ⚠️`
                                } • Status: ${
                                  st.status === 'telah_diprint'
                                    ? 'Telah di-Print'
                                    : st.status === 'disetujui'
                                    ? 'Disetujui'
                                    : st.status === 'revisi'
                                    ? 'Revisi'
                                    : 'Menunggu'
                                }`}
                              >
                                {st.status === 'telah_diprint' ? '🖨️' : st.isComplete ? '✓' : '✕'}
                              </span>
                            ))}
                            {group.allSubjectStats.length > 10 && (
                              <span className="text-[9px] text-slate-400 font-bold px-1 py-0.5 rounded bg-white/5">
                                +{group.allSubjectStats.length - 10}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0">
                            {group.totalSubjects} Mapel
                          </span>
                        </div>
                      )}

                      {/* Bottom Row: Minimalist Progress Bar & Clean Counter */}
                      <div className="space-y-1.5 pt-1">
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                          <div
                            className={`h-full transition-all duration-500 ${
                              progressPercent >= 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                : 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-500" />
                            <strong className={progressPercent >= 100 ? 'text-emerald-400' : 'text-rose-400'}>
                              {group.totalCompletedStudents} / {group.totalStudentsSlots}
                            </strong>{' '}
                            Nilai Terisi ({progressPercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Modal Trigger Action Button */}
                      <div className="pt-2 border-t border-[#1b253b]/80">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeacherKeyForModal(group.teacherKey);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 hover:border-teal-500/50 text-teal-300 hover:text-teal-200 text-xs font-bold flex items-center justify-between transition-all shadow-sm cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
                            <span>Buka Berkas & Tindakan Cetak</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 font-mono font-bold">
                            {group.totalSubjects} Mapel ↗
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW MODE 2: LINEAR LIST */
            filteredSubmissions.map((sub) => {
              const formattedDate = new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={sub.id}
                  className="bg-slate-950/60 border border-white/10 hover:border-teal-500/30 rounded-2xl p-4 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{sub.subjectName}</span>
                        <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-black">
                          {sub.className}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs font-semibold text-slate-300">{sub.teacherName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span>{sub.examType}</span>
                        <span>•</span>
                        <span>TA {sub.schoolYear}</span>
                        <span>•</span>
                        <span className="text-slate-500">{formattedDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          sub.status === 'telah_diprint'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : sub.status === 'disetujui'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : sub.status === 'revisi'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {sub.status === 'telah_diprint'
                          ? '🖨️ Telah di-Print'
                          : sub.status === 'disetujui'
                          ? '✓ Disetujui'
                          : sub.status === 'revisi'
                          ? '⚠ Perlu Revisi'
                          : '⏳ Menunggu'}
                      </span>
                    </div>
                  </div>

                  {/* Multi-Subject Badges with Per-Subject Student Count if applicable */}
                  {sub.subjectStatuses && Object.keys(sub.subjectStatuses).length > 1 && (
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Rincian Mapel:
                      </span>
                      {Object.entries(sub.subjectStatuses).map(([sName, sStat]) => {
                        const stStats = getSubjectStudentStats(sub, sName);
                        return (
                          <div
                            key={sName}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${
                              stStats.isComplete
                                ? 'bg-slate-950/80 border-emerald-500/30 text-slate-200'
                                : 'bg-slate-950/80 border-amber-500/30 text-slate-200'
                            }`}
                          >
                            <span className="font-extrabold text-white">{sName}:</span>
                            <span className={`tabular-nums ${
                              stStats.isComplete ? 'text-emerald-300' : 'text-amber-300'
                            }`}>
                              {stStats.completed}/{stStats.total} Siswa
                            </span>
                            <span className="text-[9px] opacity-75">
                              {sStat.status === 'telah_diprint'
                                ? '🖨️'
                                : sStat.status === 'disetujui'
                                ? '✓'
                                : sStat.status === 'revisi'
                                ? '⚠️'
                                : '⏳'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Peserta Didik:</span>
                      {(() => {
                        const isMulti = sub.subjectStatuses && Object.keys(sub.subjectStatuses).length > 1;
                        const subStats = getSubmissionStudentStats(sub);
                        return (
                          <>
                            <strong className="text-white">
                              {isMulti
                                ? `${subStats.completed} / ${subStats.total} Nilai Terisi`
                                : `${subStats.completed} / ${subStats.total} Siswa`}
                            </strong>
                            {isMulti && (
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                                {sub.totalStudents ? `${sub.totalStudents} Siswa/Kelas • ` : ''}
                                {subStats.completeSubjects} dari {subStats.totalSubjects} Mapel Lengkap
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Rata-rata Nilai:</span>
                      <strong className="text-sky-300">{sub.averageGrade ?? '-'}</strong>
                    </div>

                    <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Target KKTP:</span>
                      <strong className="text-amber-300">≥ {sub.kktp}</strong>
                    </div>

                    <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Tuntas Belajar:</span>
                      <strong className="text-emerald-300">
                        {sub.passedStudents !== undefined ? `${sub.passedStudents} Siswa` : '-'}
                      </strong>
                    </div>
                  </div>

                  {/* Teacher's Note if any */}
                  {sub.teacherNote && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5 text-xs text-indigo-200 italic flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>"{sub.teacherNote}"</span>
                    </div>
                  )}

                  {/* Action Buttons for Pak Zaki */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadExcel(sub)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Unduh berkas Excel resmi untuk setoran ini"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Excel</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {sub.status !== 'disetujui' && sub.status !== 'telah_diprint' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(sub)}
                          className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold text-xs border border-teal-500/30 flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                      )}

                      {sub.status !== 'telah_diprint' && (
                        <button
                          type="button"
                          onClick={() => handleMarkPrinted(sub)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs border border-cyan-500/30 flex items-center gap-1 cursor-pointer transition-all"
                          title="Tandai berkas fisik analisis ini sudah selesai dicetak"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Telah di-Print</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setChatSubmission(sub);
                          setShowChatModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold text-xs border border-indigo-500/30 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        title="Buka ruang diskusi dan riwayat chat dengan guru"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Diskusi {sub.messages?.length ? `(${sub.messages.length})` : ''}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRevision(sub)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Minta Revisi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(sub.id, `${sub.subjectName} (${sub.className})`)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 cursor-pointer transition-all"
                        title="Hapus setoran ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
    )}

    {/* TAB 2: SETORAN REKAP ABSENSI */}
    {mainTab === 'absensi' && (
      <div className="flex flex-col flex-1 overflow-hidden space-y-3">
        {/* Attendance Toolbar: Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={attendanceSearchQuery}
              onChange={(e) => setAttendanceSearchQuery(e.target.value)}
              placeholder="Cari kelas, nama wali kelas, atau periode absensi..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          {/* Attendance Status Filter Chips */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/10 shrink-0 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setAttendanceStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                attendanceStatusFilter === 'all'
                  ? 'bg-teal-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({attendanceSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setAttendanceStatusFilter('menunggu')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                attendanceStatusFilter === 'menunggu'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⏳ Menunggu ({attendanceSubmissions.filter((s) => s.status === 'menunggu').length})
            </button>
            <button
              type="button"
              onClick={() => setAttendanceStatusFilter('telah_diprint')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                attendanceStatusFilter === 'telah_diprint'
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🖨️ Telah di-Print ({attendanceSubmissions.filter((s) => s.status === 'telah_diprint').length})
            </button>
            <button
              type="button"
              onClick={() => setAttendanceStatusFilter('disetujui')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                attendanceStatusFilter === 'disetujui'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ✓ Disetujui ({attendanceSubmissions.filter((s) => s.status === 'disetujui').length})
            </button>
            <button
              type="button"
              onClick={() => setAttendanceStatusFilter('revisi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                attendanceStatusFilter === 'revisi'
                  ? 'bg-rose-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚠ Revisi ({attendanceSubmissions.filter((s) => s.status === 'revisi').length})
            </button>
          </div>
        </div>

        {/* Attendance Content List / Grid */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {filteredAttendance.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-white/5 space-y-2">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-400">Belum ada berkas setoran rekap absensi.</p>
              <p className="text-[11px] text-slate-500">
                Saat wali kelas menekan tombol "Kirim ke Pak Zaki" pada Generator Absensi, berkas akan muncul di sini secara otomatis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAttendance.map((item) => {
                const isOptimal = item.attendanceRate >= 95;
                const isWarning = item.attendanceRate < 85;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-950/70 border border-white/10 hover:border-teal-500/30 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 shadow-md"
                  >
                    <div>
                      {/* Card Header: Class & Status Symbol */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{item.className}</span>
                            <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-black">
                              {item.schoolYear}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Wali Kelas: <strong className="text-slate-300">{item.teacherName}</strong>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Periode: {item.periodLabel}
                          </p>
                        </div>

                        {/* Status Icon Indicator */}
                        <div className="shrink-0">
                          {item.status === 'telah_diprint' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                              <span>🔵</span>
                              <span>🖨️ Di-Print</span>
                            </span>
                          ) : item.status === 'disetujui' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                              <span>🟢</span>
                              <span>✓ Disetujui</span>
                            </span>
                          ) : item.status === 'revisi' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                              <span>🔴</span>
                              <span>⚠️ Revisi</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                              <span>🟡</span>
                              <span>⏳ Menunggu</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attendance Metrics Body */}
                      <div className="py-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Tingkat Kehadiran:</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              isOptimal
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : isWarning
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {item.attendanceRate}%
                          </span>
                        </div>

                        {/* Counters Breakdown */}
                        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5">
                            <span className="text-slate-400 block">Hadir</span>
                            <strong className="text-white font-mono">{item.totalH}</strong>
                          </div>
                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5">
                            <span className="text-slate-400 block">Sakit</span>
                            <strong className="text-amber-300 font-mono">{item.totalS}</strong>
                          </div>
                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5">
                            <span className="text-slate-400 block">Izin</span>
                            <strong className="text-sky-300 font-mono">{item.totalI}</strong>
                          </div>
                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5">
                            <span className="text-slate-400 block">Alpha</span>
                            <strong className="text-rose-400 font-mono">{item.totalA}</strong>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>Hari Efektif: {item.effectiveDays} Hari</span>
                          <span>Total: {item.totalStudents} Siswa</span>
                        </div>

                        {item.teacherNote && (
                          <div className="p-2 rounded-lg bg-teal-950/30 border border-teal-500/20 text-[10px] text-teal-200">
                            <span className="font-bold text-teal-300">Catatan Guru: </span>
                            {item.teacherNote}
                          </div>
                        )}

                        {item.adminNote && (
                          <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/20 text-[10px] text-rose-200">
                            <span className="font-bold text-rose-300">Catatan Revisi: </span>
                            {item.adminNote}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons for Pak Zaki */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleExportAttendanceExcel(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                        title="Unduh file Excel resmi dengan grafik kehadiran otomatis"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Cetak Excel</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {item.status !== 'telah_diprint' && (
                          <button
                            type="button"
                            onClick={() => handleMarkAttendancePrinted(item)}
                            className="px-2 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Tandai berkas fisik ini telah selesai di-print"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Telah Print</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenAttendanceRevision(item)}
                          className="px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold cursor-pointer"
                          title="Kirim catatan revisi ke guru"
                        >
                          Revisi
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAttendance(item.id, item.className)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/5 text-[10px] cursor-pointer"
                          title="Hapus setoran absensi ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}
  </div>

  {/* Attendance Revision Modal */}
  {showAttendanceRevisionModal && selectedAttendanceForRevision && (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]">
      <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl p-5 space-y-3.5 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            Catatan Revisi Rekap Absensi
          </h4>
          <button
            type="button"
            onClick={() => setShowAttendanceRevisionModal(false)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Kirim catatan untuk <strong className="text-white">{selectedAttendanceForRevision.teacherName}</strong> ({selectedAttendanceForRevision.className} - {selectedAttendanceForRevision.periodLabel}):
        </p>

        <textarea
          value={attendanceRevisionNote}
          onChange={(e) => setAttendanceRevisionNote(e.target.value)}
          placeholder="Contoh: Jumlah hari efektif mohon disesuaikan menjadi 22 hari, cek kembali data siswa yang izin..."
          rows={3}
          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500/50 resize-none"
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowAttendanceRevisionModal(false)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmitAttendanceRevision}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold cursor-pointer"
          >
            Kirim Revisi
          </button>
        </div>
      </div>
    </div>
  )}

      {/* Revision Modal Prompt */}
      {showRevisionModal && selectedSubmission && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                Catatan Revisi untuk Guru
              </h4>
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Berikan catatan perbaikan untuk{' '}
              <strong className="text-white">{selectedSubmission.teacherName}</strong> (
              {revisionSubjectName ? `Mapel ${revisionSubjectName} - ` : ''}
              {selectedSubmission.className}):
            </p>

            <textarea
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Contoh: Mohon periksa kembali kelengkapan skor isian nomor 1-5..."
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitRevision}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Simpan & Tandai Revisi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal for Pak Zaki */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                Kirim Pengumuman / Pesan Dashboard Guru
              </h4>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Pesan ini akan langsung muncul sebagai notifikasi pop-up di layar beranda dashboard guru saat mereka membuka web.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Penerima Pengumuman:
                </label>
                <select
                  value={announcementTarget}
                  onChange={(e) => setAnnouncementTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="all">📢 Semua Dewan Guru (Siaran Umum)</option>
                  {teacherGroups.map((g) => (
                    <option key={g.teacherKey} value={g.teacherKey}>
                      👤 Khusus: {g.teacherName} {g.teacherRoleTitle ? `(${g.teacherRoleTitle})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Judul Informasi:
                </label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Contoh: Berkas Cetak Analisis STS Selesai / Jadwal Rapor"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Isi Pesan:
                </label>
                <textarea
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Ketik rincian pesan informasi untuk guru di sini..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSendingAnnouncement}
                onClick={handleSendAnnouncement}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingAnnouncement ? 'Mengirim...' : 'Kirim Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Submission Chat Modal */}
      <AnalysisSubmissionChatModal
        isOpen={showChatModal}
        onClose={() => {
          setShowChatModal(false);
          setChatSubmission(null);
        }}
        submission={
          submissions.find((s) => s.id === chatSubmission?.id) || chatSubmission
        }
        currentUserRole="admin"
        currentUserName="Pak Zaki (Admin)"
      />

      {/* POP-UP MODAL DETAIL BERKAS & SETORAN GURU (NEON CLASSROOM DASHBOARD DESIGN) */}
      {selectedTeacherGroup && (() => {
        const isGlobalComplete =
          selectedTeacherGroup.totalCompletedStudents >= selectedTeacherGroup.totalStudentsSlots &&
          selectedTeacherGroup.totalStudentsSlots > 0;
        const globalProgressPercent = Math.min(
          100,
          Math.round(
            (selectedTeacherGroup.totalCompletedStudents /
              Math.max(1, selectedTeacherGroup.totalStudentsSlots)) *
              100
          ) || 0
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#020617]/85 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-[#060c1d] border border-sky-500/30 w-full max-w-6xl max-h-[92vh] rounded-[24px] shadow-[0_0_60px_rgba(2,6,23,0.9)] flex flex-col overflow-hidden text-slate-200">
              {/* Modal Header: Top Navigation */}
              <div className="p-3.5 sm:p-4 bg-[#070e22]/90 border-b border-sky-500/20 flex items-center justify-between gap-3 shrink-0">
                {/* Left: Avatar LS + Name + Subtitle */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-500 text-white font-bold text-sm flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.35)] border border-sky-300/40 shrink-0">
                    {selectedTeacherGroup.teacherName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0].toUpperCase())
                      .join('') || 'LS'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-normal truncate">
                      {selectedTeacherGroup.teacherName}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-400 truncate">
                      {selectedTeacherGroup.teacherRoleTitle ||
                        `Guru Kelas ${selectedTeacherGroup.submissions[0]?.className || '3B'}`}
                    </p>
                  </div>
                </div>

                {/* Right: Global Student Progress Pill + Quick Print Icon + Close Icon */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  {/* Global Progress Pill */}
                  <div className="bg-[#030816]/95 border border-sky-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 sm:gap-2.5 text-xs text-slate-200 shadow-inner">
                    <Users className={`w-3.5 h-3.5 shrink-0 ${isGlobalComplete ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <span className={`font-bold tabular-nums whitespace-nowrap text-xs ${isGlobalComplete ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {selectedTeacherGroup.totalCompletedStudents} / {selectedTeacherGroup.totalStudentsSlots}
                    </span>
                    <div className="w-14 sm:w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isGlobalComplete
                            ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            : 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                        }`}
                        style={{ width: `${globalProgressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Print Action with Badge */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTeacherGroup.submissions[0]) {
                        handleMarkPrinted(selectedTeacherGroup.submissions[0]);
                      }
                    }}
                    className="w-9 h-9 rounded-xl bg-[#081836] hover:bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:text-white flex items-center justify-center relative transition-all shadow-sm cursor-pointer"
                    title="Print Semua Mapel"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#060c1d]">
                      {selectedTeacherGroup.totalSubjects}
                    </span>
                  </button>

                  {/* Close Button [✕] */}
                  <button
                    type="button"
                    onClick={() => setSelectedTeacherKeyForModal(null)}
                    className="w-9 h-9 rounded-full bg-[#0c162e] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/40 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                    title="Tutup Jendela"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Spacious Neon Classroom Dashboard View */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-5 custom-scrollbar bg-[#050b18]">
                {selectedTeacherGroup.submissions.map((sub) => {
                  const formattedDate = new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const subStats = getSubmissionStudentStats(sub);
                  const isSubComplete = subStats.completed >= subStats.total && subStats.total > 0;
                  const subProgressPercent = Math.min(
                    100,
                    Math.round((subStats.completed / Math.max(1, subStats.total)) * 100) || 0
                  );
                  const hasSubjectStatuses =
                    sub.subjectStatuses && Object.keys(sub.subjectStatuses).length > 0;

                  const subjectEntries = hasSubjectStatuses
                    ? Object.entries(sub.subjectStatuses!)
                    : [[sub.subjectName, { status: sub.status } as any]];

                  return (
                    <div key={sub.id} className="space-y-3.5">
                      {/* 1. Hero Session Overview Card */}
                      <div className="bg-gradient-to-r from-[#0d214a]/95 via-[#0b1a3c]/95 to-[#07132e]/95 border border-sky-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-[0_8px_28px_rgba(2,8,22,0.6)] backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="absolute -top-24 left-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Left: Book Icon + Titles + Badges */}
                        <div className="flex items-center gap-3.5 min-w-0 z-10">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                            isSubComplete
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                              : 'bg-rose-500/20 border-rose-400/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                          }`}>
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-bold text-white leading-snug tracking-tight truncate max-w-2xl">
                              {hasSubjectStatuses
                                ? Object.keys(sub.subjectStatuses!).join(', ')
                                : sub.subjectName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/40 text-[11px] font-bold shadow-sm">
                                Kelas {sub.className}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span>{sub.examType || 'STS1'} • TA {sub.schoolYear || '2026/2027'}</span>
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Waktu Setor: {formattedDate}
                            </p>
                          </div>
                        </div>

                        {/* Right: 2 Mini Widgets (Siswa Terisi + Status Sesi) */}
                        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap z-10">
                          {/* Widget 1: Siswa Terisi */}
                          <div className={`bg-[#040b1a]/90 rounded-xl p-2.5 px-3.5 flex items-center gap-3 min-w-[190px] shadow-inner border ${
                            isSubComplete ? 'border-emerald-500/30' : 'border-rose-500/30'
                          }`}>
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                              isSubComplete
                                ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                                : 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                            }`}>
                              <Users className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs sm:text-sm font-bold tabular-nums ${
                                isSubComplete ? 'text-emerald-300' : 'text-rose-300'
                              }`}>
                                {subStats.completed} / {subStats.total}
                              </div>
                              <div className="text-[10px] font-medium text-slate-400">
                                {isSubComplete ? 'Nilai Selesai ✓' : 'Belum Lengkap ⚠️'}
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-white/5 mt-1">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isSubComplete
                                      ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                      : 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                  }`}
                                  style={{ width: `${subProgressPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Widget 2: Status Sesi */}
                          <div
                            onClick={() => handleOpenRevision(sub)}
                            className="bg-[#040b1a]/90 border border-amber-500/30 hover:border-amber-400/60 rounded-xl p-2.5 px-3.5 flex items-center justify-between gap-2.5 min-w-[145px] shadow-inner cursor-pointer transition-all group"
                            title="Klik untuk melihat / mengubah status catatan revisi"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-105 transition-transform">
                                {sub.status === 'telah_diprint' ? (
                                  <Printer className="w-4 h-4 text-cyan-300" />
                                ) : sub.status === 'disetujui' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                ) : sub.status === 'revisi' ? (
                                  <AlertCircle className="w-4 h-4 text-rose-300" />
                                ) : (
                                  <Hourglass className="w-4 h-4 text-amber-300" />
                                )}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-amber-300 block">
                                  {sub.status === 'telah_diprint'
                                    ? 'Selesai Print'
                                    : sub.status === 'disetujui'
                                    ? 'Disetujui'
                                    : sub.status === 'revisi'
                                    ? 'Perlu Revisi'
                                    : 'Menunggu'}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </div>

                      {/* 2. Session Action Bar (Middle Bar) */}
                      <div className="flex items-center justify-between gap-2.5 py-0.5 flex-wrap">
                        {/* Left: Emerald Download Button */}
                        <button
                          type="button"
                          onClick={() => handleDownloadExcel(sub)}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_18px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
                          title="Download Excel Lengkap Rekap Nilai"
                        >
                          <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                          <span>Unduh Excel Rekap</span>
                        </button>

                        {/* Right: Glass Icon Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Print Sesi Button */}
                          <button
                            type="button"
                            onClick={() => handleMarkPrinted(sub)}
                            className="w-9 h-9 rounded-xl bg-[#091a38]/90 hover:bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:border-sky-400 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                            title="Tandai Semua Mapel Selesai di-Print"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Diskusi / Chat Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setChatSubmission(sub);
                              setShowChatModal(true);
                            }}
                            className="w-9 h-9 rounded-xl bg-[#131138]/90 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:border-indigo-400 relative flex items-center justify-center transition-all cursor-pointer shadow-sm"
                            title="Buka Chat Diskusi Guru"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {sub.messages && sub.messages.length > 0 && (
                              <span className="absolute -top-1 -right-1 px-1 py-0.1 rounded-full bg-indigo-500 text-white text-[9px] font-bold ring-2 ring-[#060c1d] shadow-sm">
                                {sub.messages.length}
                              </span>
                            )}
                          </button>

                          {/* Revisi Sesi Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenRevision(sub)}
                            className="w-9 h-9 rounded-xl bg-[#2a1d09]/90 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:border-amber-400 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                            title="Kirim Catatan Revisi Sesi"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>

                          {/* Hapus Sesi Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(sub.id, `${sub.subjectName} (${sub.className})`)}
                            className="w-9 h-9 rounded-xl bg-[#1f1017]/90 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:border-rose-400 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                            title="Hapus Setoran Sesi Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 3. Section Title & Toggle */}
                      <div className="flex items-center justify-between pt-2 pb-0.5">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-teal-400" />
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                            PELACAKAN STATUS & AKSI PER-MAPEL ({subjectEntries.length} MAPEL)
                          </span>
                        </div>

                        <div className="bg-[#050b18] border border-white/10 rounded-lg p-0.5 flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setDetailViewMode('grid')}
                            className={`p-1 rounded-md transition-all cursor-pointer ${
                              detailViewMode === 'grid'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                            title="Tampilan Grid"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailViewMode('list')}
                            className={`p-1 rounded-md transition-all cursor-pointer ${
                              detailViewMode === 'list'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                            title="Tampilan List Baris"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 4. Subject List / Grid of Neon Rows */}
                      <div
                        className={
                          detailViewMode === 'grid'
                            ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                            : 'space-y-2.5'
                        }
                      >
                        {subjectEntries.map(([subjName, subjStat]) => {
                          const isPrinted = (subjStat as any).status === 'telah_diprint';
                          const isApproved = (subjStat as any).status === 'disetujui';
                          const isRevisi = (subjStat as any).status === 'revisi';
                          const stStats = getSubjectStudentStats(sub, subjName);

                          const isMapelComplete =
                            stStats.isComplete ||
                            (stStats.completed >= stStats.total && stStats.total > 0);
                          const studentRatio =
                            stStats.total > 0 ? stStats.completed / stStats.total : 0;
                          const progressPercent =
                            Math.min(100, Math.round(studentRatio * 100)) || 0;

                          return (
                            <div
                              key={subjName}
                              className={`bg-[#081226]/90 hover:bg-[#0b1834] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all shadow-sm group border ${
                                isMapelComplete
                                  ? 'border-emerald-500/25 hover:border-emerald-400/50'
                                  : 'border-rose-500/25 hover:border-rose-400/50'
                              }`}
                            >
                              {/* Col 1: Icon Box + Subject Name + Subtitle */}
                              <div className="flex items-center gap-3 min-w-[190px]">
                                <div
                                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                                    isMapelComplete
                                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                                      : 'bg-rose-500/15 border-rose-400/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                                  }`}
                                >
                                  <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs sm:text-sm font-bold text-white uppercase tracking-normal group-hover:text-sky-200 transition-colors truncate">
                                    {subjName}
                                  </h5>
                                  <p className="text-[11px] text-slate-400 font-medium">
                                    Kelas {sub.className}
                                  </p>
                                </div>
                              </div>

                              {/* Col 2: Student Progress Bar Capsule (Green if complete, Red if incomplete) */}
                              <div className={`bg-[#050b1a]/95 border rounded-xl px-3 py-1.5 flex items-center gap-2.5 min-w-[170px] ${
                                isMapelComplete ? 'border-emerald-500/20' : 'border-rose-500/20'
                              }`}>
                                <User className={`w-3.5 h-3.5 shrink-0 ${
                                  isMapelComplete ? 'text-emerald-400' : 'text-rose-400'
                                }`} />
                                <span className={`text-xs font-bold tabular-nums whitespace-nowrap ${
                                  isMapelComplete ? 'text-emerald-300' : 'text-rose-300'
                                }`}>
                                  {stStats.completed} / {stStats.total}
                                </span>
                                <div className="w-20 sm:w-24 bg-slate-800/80 rounded-full h-2 overflow-hidden border border-white/5">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isMapelComplete
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                        : 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              </div>

                              {/* Col 3: Status Capsule Pill */}
                              <div>
                                {isPrinted ? (
                                  <span className="px-3 py-1 rounded-xl bg-teal-950/70 border border-teal-500/40 text-teal-300 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                                    <span>Telah di-Print</span>
                                  </span>
                                ) : isRevisi ? (
                                  <span className="px-3 py-1 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Perlu Revisi</span>
                                  </span>
                                ) : isApproved ? (
                                  <span className="px-3 py-1 rounded-xl bg-teal-950/70 border border-teal-500/40 text-teal-300 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                                    <span>Disetujui</span>
                                  </span>
                                ) : isMapelComplete ? (
                                  <span className="px-3 py-1 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Nilai Selesai ✓</span>
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                                    <Hourglass className="w-3.5 h-3.5 text-rose-400" />
                                    <span>{stStats.missingCount > 0 ? `${stStats.missingCount} Belum` : 'Belum Selesai'}</span>
                                  </span>
                                )}
                              </div>

                              {/* Col 4: Action Buttons Cluster */}
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                {/* Download Excel Mapel */}
                                <button
                                  type="button"
                                  onClick={() => handleDownloadExcel(sub, subjName)}
                                  className="w-8 h-8 rounded-lg bg-emerald-950/70 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                                  title={`Unduh Excel khusus mapel ${subjName}`}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                {/* Mark as Printed */}
                                <button
                                  type="button"
                                  onClick={() => handleMarkSingleSubjectPrinted(sub, subjName)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                                    isPrinted
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                      : 'bg-sky-950/70 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:border-sky-400'
                                  }`}
                                  title={`Tandai soal mapel ${subjName} telah dicetak di TU`}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* Approve */}
                                <button
                                  type="button"
                                  onClick={() => handleMarkSingleSubjectApproved(sub, subjName)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                                    isApproved
                                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                      : 'bg-teal-950/70 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:border-teal-400'
                                  }`}
                                  title={`Setujui analisis mapel ${subjName}`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Revision */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenRevision(sub, subjName)}
                                  className="w-8 h-8 rounded-lg bg-amber-950/70 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                                  title={`Buka catatan revisi mapel ${subjName}`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Chevron Details */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenRevision(sub, subjName)}
                                  className="w-7 h-7 rounded-lg bg-transparent hover:bg-white/5 text-slate-500 hover:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                                  title="Detail Mapel"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
