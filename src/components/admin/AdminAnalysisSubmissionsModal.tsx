import React, { useState, useEffect, useMemo } from 'react';
import {
  Inbox,
  X,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Trash2,
  FileSpreadsheet,
  FileText,
  Users,
  GraduationCap,
  Calendar,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Check,
  Printer,
  Folder,
  LayoutGrid,
  List,
  Megaphone,
  Send,
  UserCheck,
  BookOpen,
  User,
  RotateCcw,
  RefreshCw,
  Database,
  Settings,
  Key,
  Link2,
  Copy,
  ShieldCheck,
  ChevronLeft,
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
  fetchSubmissionsFromSupabase,
  fetchSubmissionPayloadById,
  syncLocalSubmissionsToSupabase,
  syncFirestoreToSupabase,
} from '../../services/analysisSubmissionService';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  isSupabaseConfigured,
  testSupabaseConnection,
} from '../../services/supabase';
import {
  exportSingleSubjectToExcel,
  exportMultiClassSubjectToExcel,
  exportAnalysisProjectToExcel,
} from '../../services/analysis/analysisExcelService';
import { getStoredStudentsLocal } from '../../services/studentStorage';
import { MASTER_CLASSES } from '../../data/masterExamData';
import { normalizeTeacherName } from '../../services/teacherStorage';
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

export interface UnifiedDocumentItem {
  id: string;
  sourceType: 'analisis' | 'absensi';
  title: string;
  subtitle: string;
  classId: string;
  className: string;
  teacherName: string;
  submittedAt: string;
  printedAt?: string;
  isPrinted: boolean;
  schoolYear: string;
  examType?: string;
  rawAnalysis?: AnalysisSubmissionItem;
  rawAttendance?: AttendanceSubmissionItem;
}

function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[d.getMonth()] || '';
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}.${minutes}`;
  } catch {
    return isoString;
  }
}

export const AdminAnalysisSubmissionsModal: React.FC<AdminAnalysisSubmissionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Raw Data Submissions
  const [analysisSubmissions, setAnalysisSubmissions] = useState<AnalysisSubmissionItem[]>([]);
  const [attendanceSubmissions, setAttendanceSubmissions] = useState<AttendanceSubmissionItem[]>([]);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'all' | 'unprinted' | 'printed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'analisis' | 'absensi'>('all');
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 7;

  // Chat Modal State
  const [chatSubmission, setChatSubmission] = useState<AnalysisSubmissionItem | null>(null);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  const [announcementTitle, setAnnouncementTitle] = useState<string>('');
  const [announcementMessage, setAnnouncementMessage] = useState<string>('');
  const [announcementTarget, setAnnouncementTarget] = useState<string>('all');
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState<boolean>(false);

  // Supabase Configuration Modal State
  const [isRefreshingSupabase, setIsRefreshingSupabase] = useState<boolean>(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState<boolean>(false);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState<boolean>(false);
  const [showSupabaseSettingsModal, setShowSupabaseSettingsModal] = useState<boolean>(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState<string>('');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState<string>('');
  const [isTestingSupabase, setIsTestingSupabase] = useState<boolean>(false);
  const [supabaseTestFeedback, setSupabaseTestFeedback] = useState<{
    success: boolean;
    message: string;
    tableFound?: boolean;
    latencyMs?: number;
  } | null>(null);
  const [isConfiguredSupabase, setIsConfiguredSupabase] = useState<boolean>(() => isSupabaseConfigured());
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);

  // User feedback toasts
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionWarningMsg, setActionWarningMsg] = useState<string | null>(null);

  // Subscriptions
  useEffect(() => {
    if (!isOpen) return;
    const unsubAnalysis = subscribeToAnalysisSubmissions((items) => {
      setAnalysisSubmissions(items);
    });
    const unsubAttendance = subscribeToAttendanceSubmissions((items) => {
      setAttendanceSubmissions(items);
    });
    return () => {
      unsubAnalysis();
      unsubAttendance();
    };
  }, [isOpen]);

  // Unified Document List transformation
  const allUnifiedDocuments = useMemo<UnifiedDocumentItem[]>(() => {
    const list: UnifiedDocumentItem[] = [];

    // 1. Process Analisis Nilai
    analysisSubmissions.forEach((sub) => {
      const isPrinted = sub.status === 'telah_diprint' || sub.status === 'disetujui';
      const printedAt = sub.printedAt || (isPrinted ? sub.updatedAt : undefined);

      let subtitle = 'Sumatif Akhir Semester';
      if (sub.examType) {
        subtitle = sub.examType === 'SAS' ? 'Sumatif Akhir Semester (SAS)'
          : sub.examType === 'STS' ? 'Sumatif Tengah Semester (STS)'
          : sub.examType === 'PTS' ? 'Penilaian Tengah Semester (PTS)'
          : sub.examType === 'PAS' ? 'Penilaian Akhir Semester (PAS)'
          : sub.examType;
      } else if (sub.subjectName && sub.subjectName !== 'Analisis Butir Soal') {
        subtitle = sub.subjectName;
      }

      list.push({
        id: sub.id,
        sourceType: 'analisis',
        title: 'Analisis Nilai',
        subtitle,
        classId: sub.classId,
        className: sub.className,
        teacherName: sub.teacherName || 'Guru Pengampu',
        submittedAt: sub.submittedAt || sub.updatedAt || new Date().toISOString(),
        printedAt,
        isPrinted,
        schoolYear: sub.schoolYear || '2026/2027',
        examType: sub.examType,
        rawAnalysis: sub,
      });
    });

    // 2. Process Rekap Absensi
    attendanceSubmissions.forEach((item) => {
      const isPrinted = item.status === 'telah_diprint' || item.status === 'disetujui';
      const printedAt = item.printedAt || (isPrinted ? item.updatedAt : undefined);
      const subtitle = item.periodLabel ? `Periode ${item.periodLabel}` : 'Rekap Kehadiran';

      list.push({
        id: item.id,
        sourceType: 'absensi',
        title: 'Rekap Absensi',
        subtitle,
        classId: item.classId,
        className: item.className,
        teacherName: item.teacherName || 'Wali Kelas',
        submittedAt: item.submittedAt || item.updatedAt || new Date().toISOString(),
        printedAt,
        isPrinted,
        schoolYear: item.schoolYear || '2026/2027',
        rawAttendance: item,
      });
    });

    return list;
  }, [analysisSubmissions, attendanceSubmissions]);

  // Distinct School Years for dropdown filter
  const distinctSchoolYears = useMemo(() => {
    const set = new Set<string>();
    allUnifiedDocuments.forEach((doc) => {
      if (doc.schoolYear) set.add(doc.schoolYear);
    });
    return Array.from(set);
  }, [allUnifiedDocuments]);

  // KPI Metrics (Accurate counts from whole dataset)
  const totalCount = allUnifiedDocuments.length;
  const unprintedCount = useMemo(() => allUnifiedDocuments.filter((d) => !d.isPrinted).length, [allUnifiedDocuments]);
  const printedCount = useMemo(() => allUnifiedDocuments.filter((d) => d.isPrinted).length, [allUnifiedDocuments]);

  // Filtered & Sorted Documents
  const filteredAndSortedDocuments = useMemo(() => {
    return allUnifiedDocuments
      .filter((doc) => {
        // Status filter
        if (statusFilter === 'unprinted' && doc.isPrinted) return false;
        if (statusFilter === 'printed' && !doc.isPrinted) return false;

        // Type filter
        if (typeFilter !== 'all' && doc.sourceType !== typeFilter) return false;

        // School Year filter
        if (schoolYearFilter !== 'all' && doc.schoolYear !== schoolYearFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchClass = (doc.className || '').toLowerCase().includes(q);
          const matchTeacher = (doc.teacherName || '').toLowerCase().includes(q);
          const matchTitle = (doc.title || '').toLowerCase().includes(q);
          const matchSubtitle = (doc.subtitle || '').toLowerCase().includes(q);
          if (!matchClass && !matchTeacher && !matchTitle && !matchSubtitle) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // CRITICAL SORTING RULE:
        // 1. Unprinted items always on top; printed items automatically move to the bottom
        if (!a.isPrinted && b.isPrinted) return -1;
        if (a.isPrinted && !b.isPrinted) return 1;

        // 2. Newly arrived unprinted items on the very top (submittedAt descending)
        if (!a.isPrinted && !b.isPrinted) {
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        }

        // 3. For printed items: newest printedAt (or submittedAt) first
        const timeA = new Date(a.printedAt || a.submittedAt).getTime();
        const timeB = new Date(b.printedAt || b.submittedAt).getTime();
        return timeB - timeA;
      });
  }, [allUnifiedDocuments, statusFilter, typeFilter, schoolYearFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, schoolYearFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedDocuments.length / ITEMS_PER_PAGE));
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedDocuments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedDocuments, currentPage]);

  // Handlers for Marking Printed
  const handleMarkAsPrinted = async (doc: UnifiedDocumentItem) => {
    try {
      if (doc.sourceType === 'analisis' && doc.rawAnalysis) {
        await updateAnalysisSubmissionStatus(doc.rawAnalysis.id, 'telah_diprint');
        setActionSuccessMsg(`Dokumen "${doc.title} - ${doc.className}" berhasil ditandai Sudah Dicetak.`);
      } else if (doc.sourceType === 'absensi' && doc.rawAttendance) {
        await updateAttendanceSubmissionStatus(doc.rawAttendance.id, 'telah_diprint');
        setActionSuccessMsg(`Rekap absensi Kelas ${doc.className} berhasil ditandai Sudah Dicetak.`);
      }
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to mark as printed:', err);
      setActionWarningMsg('Gagal memperbarui status cetak dokumen.');
      setTimeout(() => setActionWarningMsg(null), 4000);
    }
  };

  const handleRevertToUnprinted = async (doc: UnifiedDocumentItem) => {
    try {
      if (doc.sourceType === 'analisis' && doc.rawAnalysis) {
        await updateAnalysisSubmissionStatus(doc.rawAnalysis.id, 'menunggu');
        setActionSuccessMsg(`Dokumen "${doc.title} - ${doc.className}" dikembalikan ke antrean Belum Dicetak.`);
      } else if (doc.sourceType === 'absensi' && doc.rawAttendance) {
        await updateAttendanceSubmissionStatus(doc.rawAttendance.id, 'menunggu');
        setActionSuccessMsg(`Rekap absensi Kelas ${doc.className} dikembalikan ke antrean Belum Dicetak.`);
      }
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to revert status:', err);
    }
  };

  // Handlers for Downloading Documents
  const handleDownloadAnalysis = async (sub: AnalysisSubmissionItem) => {
    try {
      let payload = sub.payload;
      if (!payload || Object.keys(payload).length === 0) {
        const loaded = await fetchSubmissionPayloadById(sub.id);
        if (loaded) payload = loaded;
      }

      if (!payload || Object.keys(payload).length === 0) {
        alert('Data berkas analisis tidak tersedia.');
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
          setActionSuccessMsg(`File Excel "${sub.subjectName}" Kelas ${sub.className} berhasil diunduh.`);
          setTimeout(() => setActionSuccessMsg(null), 3000);
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
        setActionSuccessMsg(`File Excel "${sub.subjectName}" multi-kelas berhasil diunduh.`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
        return;
      }

      if (payload.session) {
        const studentsToUse =
          payload.students && payload.students.length > 0
            ? payload.students
            : getStoredStudentsLocal().filter(
                (s) => s.classId.toLowerCase() === (payload.session.classId || '').toLowerCase()
              );
        exportAnalysisProjectToExcel(payload.session, studentsToUse);
        setActionSuccessMsg(`Proyek Excel rekap lengkap Kelas ${sub.className} berhasil diunduh.`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
        return;
      }

      alert('Format berkas tidak dikenali untuk ekspor Excel.');
    } catch (err) {
      console.error('Failed to download Excel:', err);
      alert('Gagal mengunduh Excel.');
    }
  };

  const handleDownloadAttendance = async (item: AttendanceSubmissionItem) => {
    try {
      const rows =
        item.rows && item.rows.length > 0
          ? item.rows
          : [
              {
                periode: item.periodLabel,
                totalSiswa: item.totalStudents,
                hariEfektif: item.effectiveDays,
                totalHadir: item.totalH,
                sakit: item.totalS,
                izin: item.totalI,
                alpha: item.totalA,
                rate: item.attendanceRate,
              },
            ];

      await exportGrafikKehadiranToExcel({
        schoolName: 'SEKOLAH DASAR ISLAM TERPADU AL FIKRI',
        schoolYear: item.schoolYear.startsWith('TAHUN')
          ? item.schoolYear
          : `TAHUN PELAJARAN ${item.schoolYear.replace(/^TP\s*/i, '')}`,
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
      alert('Gagal mengunduh file Excel absensi.');
    }
  };

  const handleDownloadDoc = (doc: UnifiedDocumentItem) => {
    if (doc.sourceType === 'analisis' && doc.rawAnalysis) {
      void handleDownloadAnalysis(doc.rawAnalysis);
    } else if (doc.sourceType === 'absensi' && doc.rawAttendance) {
      void handleDownloadAttendance(doc.rawAttendance);
    }
  };

  // Handlers for Deletion
  const handleDeleteDoc = async (doc: UnifiedDocumentItem) => {
    const confirmText = `Hapus dokumen "${doc.title} - ${doc.className}" dari daftar antrean cetak?`;
    if (!window.confirm(confirmText)) return;

    try {
      if (doc.sourceType === 'analisis') {
        await deleteAnalysisSubmission(doc.id);
      } else {
        await deleteAttendanceSubmission(doc.id);
      }
      setActionSuccessMsg('Dokumen berhasil dihapus dari antrean.');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Supabase utilities
  const handleOpenSupabaseSettings = () => {
    const cfg = getStoredSupabaseConfig();
    setSupabaseUrlInput(cfg.url || '');
    setSupabaseKeyInput(cfg.anonKey || '');
    setSupabaseTestFeedback(null);
    setShowSupabaseSettingsModal(true);
  };

  const handleTestAndSaveSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestFeedback(null);
    try {
      const res = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
      setSupabaseTestFeedback(res);
      if (res.success) {
        saveStoredSupabaseConfig(supabaseUrlInput, supabaseKeyInput);
        setIsConfiguredSupabase(true);
        setActionSuccessMsg('Konfigurasi Supabase berhasil disimpan!');
        setTimeout(() => setActionSuccessMsg(null), 3000);
        void handleRefreshSupabase();
      }
    } catch (err: any) {
      setSupabaseTestFeedback({
        success: false,
        message: err?.message || 'Gagal menguji koneksi ke Supabase.',
      });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleRefreshSupabase = async () => {
    setIsRefreshingSupabase(true);
    try {
      const items = await fetchSubmissionsFromSupabase(true);
      setAnalysisSubmissions(items);
      setIsConfiguredSupabase(isSupabaseConfigured());
      setActionSuccessMsg('Antrean setoran berhasil diperbarui dari Supabase.');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to refresh from Supabase:', err);
    } finally {
      setIsRefreshingSupabase(false);
    }
  };

  const handleSyncFirestoreToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      handleOpenSupabaseSettings();
      return;
    }
    setIsSyncingFirestore(true);
    try {
      const result = await syncFirestoreToSupabase();
      if (result.error) {
        setActionWarningMsg(`Penyalinan dari Firestore: ${result.error}`);
        setTimeout(() => setActionWarningMsg(null), 6000);
      } else {
        setActionSuccessMsg(`✅ Berhasil menyalin ${result.pushed} berkas dari Firestore ke Supabase!`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
        await handleRefreshSupabase();
      }
    } catch (err: any) {
      setActionWarningMsg(`Gagal: ${err?.message || 'Koneksi Firestore gagal'}`);
      setTimeout(() => setActionWarningMsg(null), 5000);
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  // Broadcast announcement
  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      alert('Judul dan pesan pengumuman wajib diisi.');
      return;
    }
    setIsSendingAnnouncement(true);
    try {
      await createBroadcastAnnouncement(
        announcementTitle.trim(),
        announcementMessage.trim(),
        'Pak Zaki (Admin)',
        'analysis'
      );
      setActionSuccessMsg('Pengumuman berhasil disiarkan ke seluruh dewan guru.');
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Outer Card Styled in Arsipku Light Aesthetics */}
      <div className="w-full max-w-6xl bg-[#F6FAF8] border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-slate-800 max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* ======================================================== */}
        {/* TOP HEADER: Arsipku Brand & Utility Bar                 */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-1">
          {/* Left Brand Identity matching the attachment */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#00875A] text-white flex items-center justify-center shadow-md shadow-[#00875A]/25 shrink-0">
              <Printer className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Arsipku</h2>
              <div className="h-6 w-px bg-slate-300 hidden sm:block" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Pusat Cetak Dokumen</h3>
                <p className="text-xs text-slate-500 font-medium">Arsip Digital SDIT AL FIKRI</p>
              </div>
            </div>
          </div>

          {/* Right Utility Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {/* Supabase Status Pill */}
            {isConfiguredSupabase ? (
              <button
                type="button"
                onClick={handleOpenSupabaseSettings}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                title="Supabase Terhubung. Klik untuk melihat konfigurasi."
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Supabase</span>
                <Settings className="w-3 h-3 text-emerald-600 opacity-80" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenSupabaseSettings}
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs animate-pulse"
                title="Supabase belum terhubung! Klik untuk konfigurasi."
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Hubungkan Supabase</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              disabled={isRefreshingSupabase}
              onClick={handleRefreshSupabase}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Segarkan antrean setoran dari Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingSupabase ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Broadcast Announcement Button */}
            <button
              type="button"
              onClick={() => setShowAnnouncementModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Kirim pengumuman ke seluruh guru"
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">Kirim Info</span>
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-all shadow-xs ml-auto sm:ml-0"
              title="Tutup Jendela"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Success Toast */}
        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between gap-2 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccessMsg(null)}
              className="text-emerald-600 hover:text-emerald-900 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Warning Toast */}
        {actionWarningMsg && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between gap-2 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold">{actionWarningMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionWarningMsg(null)}
              className="text-amber-600 hover:text-amber-900 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3 TOP KPI SUMMARY CARDS                                 */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 shrink-0">
          {/* Card 1: Total Dokumen */}
          <div className="bg-[#EAF7EE] border border-[#D0F0DB] rounded-2xl p-4 flex items-center gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#D0F0DB] text-[#00875A] flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Total Dokumen</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mt-0.5">
                {totalCount}
              </p>
            </div>
          </div>

          {/* Card 2: Belum Dicetak */}
          <div className="bg-[#FFF9EE] border border-[#FDE8C7] rounded-2xl p-4 flex items-center gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#FDE8C7] text-amber-600 flex items-center justify-center shadow-xs shrink-0">
              <Printer className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Belum Dicetak</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight leading-none mt-0.5">
                {unprintedCount}
              </p>
            </div>
          </div>

          {/* Card 3: Sudah Dicetak */}
          <div className="bg-[#EEFBF4] border border-[#C8F2DA] rounded-2xl p-4 flex items-center gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#C8F2DA] text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Sudah Dicetak</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight leading-none mt-0.5">
                {printedCount}
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* FILTER BAR & SEARCH CONTROLS                             */}
        {/* ======================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          {/* Status Tabs Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs ${
                statusFilter === 'all'
                  ? 'bg-[#00875A] text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
              }`}
            >
              Semua ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('unprinted')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs ${
                statusFilter === 'unprinted'
                  ? 'bg-[#00875A] text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Belum Dicetak ({unprintedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('printed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs ${
                statusFilter === 'printed'
                  ? 'bg-[#00875A] text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sudah Dicetak ({printedCount})</span>
            </button>

            {/* Document Type Filter Pill Selector */}
            <div className="h-5 w-px bg-slate-300 mx-1 hidden sm:block" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#00875A] cursor-pointer shadow-xs"
            >
              <option value="all">Semua Jenis Dokumen</option>
              <option value="analisis">Analisis Nilai Saja</option>
              <option value="absensi">Rekap Absensi Saja</option>
            </select>
          </div>

          {/* Search Input & TP Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kelas, jenis dokumen, atau nama guru..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A] shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Tahun Pelajaran Dropdown */}
            <div className="relative shrink-0">
              <select
                value={schoolYearFilter}
                onChange={(e) => setSchoolYearFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-8 pr-7 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#00875A] cursor-pointer shadow-xs appearance-none"
              >
                <option value="all">Semua TP</option>
                {distinctSchoolYears.map((tp) => (
                  <option key={tp} value={tp}>
                    TP {tp}
                  </option>
                ))}
              </select>
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* UNIFIED DOCUMENT LIST TABLE                             */}
        {/* ======================================================== */}
        <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAF9] border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-3.5 px-3 text-center w-12">No</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Dokumen</th>
                  <th className="py-3.5 px-3 text-center w-20">Kelas</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Disetor Oleh</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Tanggal Setor</th>
                  <th className="py-3.5 px-4 min-w-[160px] text-center">Status Cetak</th>
                  <th className="py-3.5 px-4 text-center min-w-[190px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Inbox className="w-8 h-8 text-slate-300" />
                        <p className="text-xs font-semibold text-slate-500">Tidak ada dokumen yang sesuai dengan filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDocuments.map((doc, idx) => {
                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                    const isAttendance = doc.sourceType === 'absensi';

                    return (
                      <tr
                        key={doc.id}
                        className={`hover:bg-slate-50/80 transition-colors group ${
                          !doc.isPrinted ? 'bg-amber-50/10' : ''
                        }`}
                      >
                        {/* No */}
                        <td className="py-3.5 px-3 text-center text-xs font-semibold text-slate-400 tabular-nums">
                          {rowNumber}
                        </td>

                        {/* Dokumen: Icon + Title + Subtitle */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${
                              isAttendance
                                ? 'bg-rose-50 border-rose-200 text-rose-500'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            }`}>
                              {isAttendance ? (
                                <FileText className="w-4 h-4 stroke-[2]" />
                              ) : (
                                <FileSpreadsheet className="w-4 h-4 stroke-[2]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#00875A] transition-colors truncate">
                                {doc.title}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                {doc.subtitle}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Kelas: Rounded green badge */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-[#E6F4EA] text-[#00875A] font-extrabold text-xs inline-block shadow-2xs">
                            {doc.className}
                          </span>
                        </td>

                        {/* Disetor Oleh */}
                        <td className="py-3.5 px-4">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {doc.teacherName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            TP {doc.schoolYear}
                          </p>
                        </td>

                        {/* Tanggal Setor */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDateTime(doc.submittedAt)}</span>
                          </div>
                        </td>

                        {/* Status Cetak */}
                        <td className="py-3.5 px-4 text-center">
                          {doc.isPrinted ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Sudah Dicetak</span>
                              </span>
                              {doc.printedAt && (
                                <span className="text-[10px] text-slate-400 font-medium mt-1">
                                  {formatDateTime(doc.printedAt)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center">
                              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs animate-pulse">
                                <Printer className="w-3.5 h-3.5 text-amber-600" />
                                <span>Belum Dicetak</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Aksi: Unduh & Tandai Cetak */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Tombol Unduh */}
                            <button
                              type="button"
                              onClick={() => handleDownloadDoc(doc)}
                              className="px-3 py-1.5 rounded-xl bg-[#E6F4EA] hover:bg-[#D4EEDC] text-[#00875A] font-bold text-xs inline-flex items-center gap-1.5 border border-[#C2E7CC] transition-all cursor-pointer shadow-xs active:scale-95"
                              title="Unduh format Excel resmi"
                            >
                              <Download className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Unduh</span>
                            </button>

                            {/* Tombol Tandai Cetak / Batal Cetak */}
                            {!doc.isPrinted ? (
                              <button
                                type="button"
                                onClick={() => handleMarkAsPrinted(doc)}
                                className="px-3.5 py-1.5 rounded-xl bg-[#00875A] hover:bg-[#00724C] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                                title="Tandai dokumen selesai dicetak (otomatis pindah ke bawah antrean)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Tandai Cetak</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRevertToUnprinted(doc)}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all cursor-pointer shadow-2xs"
                                title="Kembalikan status ke Belum Dicetak"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Chat Diskusi Guru (Khusus Analisis) */}
                            {doc.rawAnalysis && (
                              <button
                                type="button"
                                onClick={() => {
                                  setChatSubmission(doc.rawAnalysis!);
                                  setShowChatModal(true);
                                }}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-indigo-600 transition-all cursor-pointer shadow-2xs"
                                title="Buka ruang diskusi dengan guru"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Tombol Hapus Setoran */}
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer shadow-2xs"
                              title="Hapus dokumen dari antrean cetak"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ======================================================== */}
          {/* BOTTOM PAGINATION BAR                                   */}
          {/* ======================================================== */}
          <div className="p-3.5 bg-[#F8FAF9] border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <p className="text-xs text-slate-500 font-medium">
              Menampilkan{' '}
              <span className="font-bold text-slate-800">
                {filteredAndSortedDocuments.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{' '}
              –{' '}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedDocuments.length)}
              </span>{' '}
              dari{' '}
              <span className="font-bold text-slate-800">{filteredAndSortedDocuments.length}</span> dokumen
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - currentPage) <= 1) return true;
                  return false;
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;

                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && (
                        <span className="px-1 text-slate-400 text-xs font-bold">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center ${
                          currentPage === p
                            ? 'bg-[#00875A] text-white shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MODAL PENGATURAN SUPABASE                                */}
        {/* ======================================================== */}
        {showSupabaseSettingsModal && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isTestingSupabase) {
                setShowSupabaseSettingsModal(false);
              }
            }}
          >
            <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-800 max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      Pengaturan Koneksi Supabase
                    </h3>
                    <p className="text-xs text-slate-500">
                      Hubungkan database PostgreSQL Supabase sekolah untuk meja setoran guru &amp; e-Rapor
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isTestingSupabase}
                  onClick={() => setShowSupabaseSettingsModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Feedback Banner */}
              {supabaseTestFeedback && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-fadeIn ${
                    supabaseTestFeedback.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {supabaseTestFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <p className="font-semibold">{supabaseTestFeedback.message}</p>
                </div>
              )}

              {/* Form Input URL & Anon Key */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                      Project URL Supabase
                    </span>
                  </label>
                  <input
                    type="text"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value.trim())}
                    placeholder="https://YOUR_PROJECT_REF.supabase.co"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-[#00875A] font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      API Key (anon public)
                    </span>
                  </label>
                  <input
                    type="password"
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value.trim())}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-[#00875A] font-mono transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isSyncingFirestore || isTestingSupabase}
                  onClick={handleSyncFirestoreToSupabase}
                  className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Tarik data lama dari Google Firestore dan salin ke Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
                  <span>{isSyncingFirestore ? 'Menarik...' : 'Salin Data dari Firestore'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isTestingSupabase}
                    onClick={() => setShowSupabaseSettingsModal(false)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    disabled={isTestingSupabase}
                    onClick={handleTestAndSaveSupabase}
                    className="px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00724C] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#00875A]/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isTestingSupabase ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menguji...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Uji &amp; Simpan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL PENGUMUMAN DEWAN GURU                              */}
        {/* ======================================================== */}
        {showAnnouncementModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-2xl text-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-500" />
                  Kirim Pengumuman / Pesan Dashboard Guru
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Pesan ini akan langsung muncul sebagai notifikasi pop-up di layar beranda dashboard guru.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Judul Informasi:
                  </label>
                  <input
                    type="text"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Contoh: Berkas Cetak Analisis STS Selesai / Jadwal Rapor"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00875A]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Isi Pesan:
                  </label>
                  <textarea
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="Ketik rincian pesan informasi untuk guru di sini..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00875A] resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSendingAnnouncement}
                  onClick={handleSendAnnouncement}
                  className="px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00724C] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#00875A]/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingAnnouncement ? 'Mengirim...' : 'Kirim Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat modal with teacher */}
        <AnalysisSubmissionChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setChatSubmission(null);
          }}
          submission={
            analysisSubmissions.find((s) => s.id === chatSubmission?.id) || chatSubmission
          }
          currentUserRole="admin"
          currentUserName="Pak Zaki (Admin)"
        />
      </div>
    </div>
  );
};
