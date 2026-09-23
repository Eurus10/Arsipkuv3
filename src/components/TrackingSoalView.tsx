import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderOpen,
  SlidersHorizontal,
  Download,
  Sparkles,
  Layers,
  Check,
  Search,
  FileCheck,
  Printer,
  ExternalLink,
  Edit2,
  Copy,
  CheckCheck,
  Link as LinkIcon,
  Paperclip,
  X,
  Save,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  FileText,
  HelpCircle,
  FolderCheck,
  AlertCircle,
  BookOpen,
  ChevronDown,
  MoreHorizontal,
  Hourglass,
  Lock,
} from 'lucide-react';
import { syncGoogleDriveTracking, SyncDriveResult } from '../services/driveSyncService';
import {
  ExamTrackingItem,
  SchoolYearOption,
  SchoolTemplateItem,
  ExamTrackingRecord,
  ExamUploadConfig,
  ExamSessionConfig,
  DEFAULT_EXAM_CONFIG,
} from '../types';
import { DriveFolderTransitionModal } from './DriveFolderTransitionModal';
import {
  MasterClass,
  formatSubjectDisplayName,
} from '../data/masterExamData';
import {
  getStoredMasterClasses,
  subscribeToMasterClasses,
  updateStoredMasterClasses,

  getStoredTrackingRecords,
  subscribeToTrackingRecords,
  toggleTrackingRecordCollected,
  toggleTrackingRecordPrinted,
  batchSetClassTrackingStatus,
  clearAllTrackingRecords,

  getStoredExamConfig,
  subscribeToExamConfig,
  updateStoredExamConfig,

  getStoredTemplates,
  subscribeToTemplates,
  updateStoredTemplate,

  getStoredExamSessions,
  subscribeToExamSessions,
  updateSingleExamSession,
} from '../services/storage';
import { TrackingExamSettingsModal } from './TrackingExamSettingsModal';
import { TrackingExportModal } from './TrackingExportModal';
import { sanitizeDriveUrl, isValidUrl } from '../utils/driveHelpers';

interface TrackingSoalViewProps {
  isAdmin: boolean;
  schoolYears?: SchoolYearOption[];
  onRequestLogin?: () => void;
}

export const TrackingSoalView: React.FC<TrackingSoalViewProps> = ({
  isAdmin,
  schoolYears = [],
  onRequestLogin,
}) => {
  // Master Classes (Real-time customizable: walas, subjects, teachers)
  const [masterClasses, setMasterClasses] = useState<MasterClass[]>(() =>
    getStoredMasterClasses()
  );

  // Tracking Records State
  const [trackingRecords, setTrackingRecords] = useState<Record<string, ExamTrackingRecord>>(
    () => getStoredTrackingRecords()
  );

  // Drive Folder Config State (real-time synced)
  const [currentExamConfig, setCurrentExamConfig] = useState<ExamUploadConfig>(() =>
    getStoredExamConfig()
  );
  const [templates, setTemplates] = useState<SchoolTemplateItem[]>(() =>
    getStoredTemplates()
  );

  const trackingSessionId = 'pendataan-soal-aktif';

  const getInitialTrackingSession = (): ExamSessionConfig => {
  const sessions = getStoredExamSessions();

  const existing = sessions.find(
    (session) => session.id === trackingSessionId
  );

  if (existing) {
    return existing;
  }

  return {
    id: trackingSessionId,
    name: 'Pendataan Soal Ujian Aktif',
    schoolYear: '2025/2026',
    activeClasses: {},
    activeSubjects: {},
    updatedAt: new Date().toISOString(),
  };
};

const [activeExamSession, setActiveExamSession] =
  useState<ExamSessionConfig>(
    getInitialTrackingSession
  );

  // Filters (Simplified for pendataan)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'all'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'collected' | 'collected_unprinted' | 'uncollected' | 'printed' | 'complete'>('all');

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isEditDriveModalOpen, setIsEditDriveModalOpen] = useState<boolean>(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [tempDriveUrlInput, setTempDriveUrlInput] = useState<string>('');
  const [isSavingDrive, setIsSavingDrive] = useState<boolean>(false);
  const [driveSaveError, setDriveSaveError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [syncResultModalData, setSyncResultModalData] = useState<SyncDriveResult | null>(null);
  const [syncModalTab, setSyncModalTab] = useState<'matched' | 'unmatched' | 'guide'>('matched');
  const [isDriveTransitionOpen, setIsDriveTransitionOpen] = useState<boolean>(false);
  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState<boolean>(false);

  // Real-time Firestore sync
  useEffect(() => {
    const unsubMaster = subscribeToMasterClasses((cloudMaster) => {
      setMasterClasses(cloudMaster);
    });

    const unsubRecords = subscribeToTrackingRecords((cloudRecords) => {
      setTrackingRecords(cloudRecords);
    });

    const unsubConfig = subscribeToExamConfig((cfg) => {
      setCurrentExamConfig(cfg);
    });

    const unsubTemplates = subscribeToTemplates((tmpls) => {
      setTemplates(tmpls);
    });

    const unsubExamSessions = subscribeToExamSessions(
      (sessions) => {
        const activeSession = sessions.find(
          (session) => session.id === trackingSessionId
        );

        if (activeSession) {
          setActiveExamSession(activeSession);
        }
      },
      (error) => {
        console.warn(
          'Konfigurasi ujian menggunakan cache lokal (kuota/offline):',
          error
        );
      }
    );

    return () => {
      unsubMaster();
      unsubRecords();
      unsubConfig();
      unsubTemplates();
      unsubExamSessions();
    };
  }, []);

  // Compute resolved Google Drive Folder URL
  const activeDriveFolderUrl = useMemo(() => {
    const fromConfig = currentExamConfig?.driveFolderUrl;
    if (fromConfig && isValidUrl(fromConfig)) return sanitizeDriveUrl(fromConfig);

    const folderTmpl = templates.find((t) => t.category === 'folder_soal' || t.id === 'tmpl_folder_soal');
    if (folderTmpl?.driveUrl && isValidUrl(folderTmpl.driveUrl)) return sanitizeDriveUrl(folderTmpl.driveUrl);

    return sanitizeDriveUrl(DEFAULT_EXAM_CONFIG.driveFolderUrl);
  }, [currentExamConfig, templates]);

  // Calculated Statistics
  const stats = useMemo(() => {
    let totalTarget = 0;
    let totalCollected = 0;
    let totalPrinted = 0;

    masterClasses.forEach((c) => {
      const isClassActive =
        activeExamSession.activeClasses?.[c.id] !== false;

      if (!isClassActive) return;

      c.subjects.forEach((s) => {
        const isSubjectActive =
          activeExamSession.activeSubjects?.[c.id]?.[s.id] !== false;

        if (!isSubjectActive) return;

        totalTarget++;

        const recordKey = `${trackingSessionId}__${c.id}__${s.id}`;
        const record = trackingRecords[recordKey];

        if (record?.isCollected) totalCollected++;
        if (record?.isPrinted) totalPrinted++;
      });
    });

    const totalNotCollected = Math.max(
      0,
      totalTarget - totalCollected
    );

    const totalNotPrinted = Math.max(
      0,
      totalTarget - totalPrinted
    );

    const collectedPercentage =
      totalTarget > 0
        ? Math.round((totalCollected / totalTarget) * 100)
        : 0;

    const printedPercentage =
      totalTarget > 0
        ? Math.round((totalPrinted / totalTarget) * 100)
        : 0;

    return {
      totalTarget,
      totalCollected,
      totalNotCollected,
      totalPrinted,
      totalNotPrinted,
      collectedPercentage,
      printedPercentage,
    };
  }, [
    masterClasses,
    trackingRecords,
    activeExamSession,
  ]);

  // Handle Toggle Collected
  const handleToggleCollected = async (c: MasterClass, s: { id: string; name: string; teacher?: string }) => {
    if (!isAdmin) {
      showFeedback('Hanya Administrator yang dapat mengubah status kumpul.');
      return;
    }
    const recordKey = `${trackingSessionId}__${c.id}__${s.id}`;
    try {
      await toggleTrackingRecordCollected(recordKey, {
        examSessionId: trackingSessionId,
        classId: c.id,
        subjectId: s.id,
        subjectName: s.name,
        teacherName: s.teacher,
        source: 'manual',
      });
    } catch (err: any) {
      showFeedback(
        err?.message ||
          'Gagal menyimpan status kumpul.'
      );
    }
  };

  // Handle Toggle Printed
  const handleTogglePrinted = async (c: MasterClass, s: { id: string; name: string; teacher?: string }) => {
    if (!isAdmin) {
      showFeedback('Hanya Administrator yang dapat mengubah status cetak.');
      return;
    }
    const recordKey = `${trackingSessionId}__${c.id}__${s.id}`;
    try {
      await toggleTrackingRecordPrinted(recordKey, {
        examSessionId: trackingSessionId,
        classId: c.id,
        subjectId: s.id,
        subjectName: s.name,
        teacherName: s.teacher,
      });
    } catch (err: any) {
      showFeedback(
        err?.message ||
          'Gagal menyimpan status print.'
      );
    }
  };

  // Batch toggle for a class
  const handleBatchClass = async (
    c: MasterClass,
    field: 'isCollected' | 'isPrinted',
    targetVal: boolean
  ) => {
    if (!isAdmin) return;

    const activeSubjects = c.subjects.filter(
      (subject) =>
        activeExamSession.activeSubjects?.[c.id]?.[subject.id] !== false
    );

    if (activeSubjects.length === 0) {
      showFeedback(
        `Tidak ada mapel aktif untuk Kelas ${c.name}.`
      );
      return;
    }

    try {
      await batchSetClassTrackingStatus(
        trackingSessionId,
        c.id,
        activeSubjects,
        field,
        targetVal
      );

      showFeedback(
        `Status ${
          field === 'isCollected' ? 'Kumpul' : 'Fotocopy'
        } Kelas ${c.name} diperbarui.`
      );
    } catch (err: any) {
      showFeedback(
        err?.message ||
          'Gagal memperbarui status tracking.'
      );
    }
  };

  // Clear All Data for New Exam
  const handleConfirmClearAll = async () => {
    if (!isAdmin) return;

    try {
      await clearAllTrackingRecords();

      setIsClearModalOpen(false);

      showFeedback(
        '🗑️ Seluruh data tracking berhasil dikosongkan untuk ujian baru.'
      );
    } catch (err: any) {
      showFeedback(
        err?.message ||
          '❌ Gagal mengosongkan data tracking.'
      );
    }
  };

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleUpdateMasterClasses = async (
    updated: MasterClass[]
  ) => {
    try {
      await updateStoredMasterClasses(
        updated
      );

      setMasterClasses(updated);

      showFeedback(
        'Master Data Kelas & Mapel diperbarui.'
      );
    } catch (err: any) {
      showFeedback(
        err?.message ||
          '❌ Gagal menyimpan Master Data Kelas & Mapel.'
      );

      throw err;
    }
  };

  // Open Edit Drive Modal
  const handleOpenEditDriveModal = () => {
    setTempDriveUrlInput(activeDriveFolderUrl);
    setDriveSaveError(null);
    setIsEditDriveModalOpen(true);
  };

  // Save updated Drive folder URL
  const handleSaveDriveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempDriveUrlInput.trim()) {
      setDriveSaveError('Link Google Drive tidak boleh kosong.');
      return;
    }
    const sanitized = sanitizeDriveUrl(tempDriveUrlInput);
    if (!isValidUrl(sanitized)) {
      setDriveSaveError('Format tautan tidak valid. Masukkan URL Google Drive yang benar.');
      return;
    }

    try {
      setIsSavingDrive(true);
      setDriveSaveError(null);
      await updateStoredExamConfig({ driveFolderUrl: sanitized });
      const folderTmpl = templates.find((t) => t.category === 'folder_soal' || t.id === 'tmpl_folder_soal');
      if (folderTmpl) {
        await updateStoredTemplate(folderTmpl.id, { driveUrl: sanitized });
      }
      setIsEditDriveModalOpen(false);
      showFeedback('✅ Tautan Folder Google Drive berhasil diperbarui dan aktif!');
    } catch (err: any) {
      setDriveSaveError('Gagal menyimpan link: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSavingDrive(false);
    }
  };

  const handleCopyDriveUrl = () => {
    if (activeDriveFolderUrl) {
      navigator.clipboard.writeText(activeDriveFolderUrl);
      setCopiedLink(true);
      showFeedback('📋 Link Google Drive berhasil disalin!');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const lastMatchedCountRef = useRef<number>(0);

  const handleSyncDrive = async (isSilent: boolean = false) => {
    if (!activeDriveFolderUrl) {
      if (!isSilent) {
        showFeedback('Folder Google Drive belum diatur di Pengaturan Admin.');
      }
      return;
    }

    try {
      if (!isSilent) {
        setIsSyncingDrive(true);
        showFeedback('🔄 Menghubungkan ke Service Account Google Drive & mencocokkan file...');
      }

      const result = await syncGoogleDriveTracking(
        activeDriveFolderUrl,
        trackingSessionId,
        masterClasses,
        activeExamSession,
        trackingRecords
      );

      // Instantly refresh trackingRecords state in UI
      setTrackingRecords(getStoredTrackingRecords());

      if (!isSilent) {
        setSyncResultModalData(result);
        if (result.matchedCount > 0) {
          setSyncModalTab('matched');
        } else if (result.unmatchedFiles.length > 0) {
          setSyncModalTab('unmatched');
        } else {
          setSyncModalTab('guide');
        }

        if (result.success) {
          showFeedback(result.message);
        } else {
          showFeedback(`⚠️ ${result.message}`);
        }
      } else {
        if (result.matchedCount > lastMatchedCountRef.current && lastMatchedCountRef.current !== 0) {
          showFeedback(`✨ Real-time Drive: ${result.matchedCount} naskah soal otomatis terdeteksi!`);
        }
      }
      lastMatchedCountRef.current = result.matchedCount;
    } catch (err: any) {
      if (!isSilent) {
        showFeedback('Gagal sinkronisasi: ' + (err?.message || 'Terjadi kesalahan'));
      }
    } finally {
      if (!isSilent) {
        setIsSyncingDrive(false);
      }
    }
  };

  // Real-time background sync polling (otomatis tanpa klik tombol)
  useEffect(() => {
    if (!activeDriveFolderUrl) return;

    // Silent sync 2 seconds after page open
    const initialTimer = setTimeout(() => {
      handleSyncDrive(true);
    }, 2000);

    // Auto polling every 2 minutes (120000ms) to save API quota and bandwidth
    const interval = setInterval(() => {
      handleSyncDrive(true);
    }, 120000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [activeDriveFolderUrl, trackingSessionId, activeExamSession]);

  // Filter classes sequentially for continuous 4-column layout
  const filteredOrderedClasses = useMemo(() => {
    return masterClasses.filter((c) => {
      const isClassActive =
        activeExamSession.activeClasses?.[c.id] !== false;

      if (!isClassActive) {
        return false;
      }

      if (
        selectedLevelFilter !== 'all' &&
        c.level !== selectedLevelFilter
      ) {
        return false;
      }

      // If 'collected' filter is active, only show classes that have at least one subject collected
      if (selectedStatusFilter === 'collected') {
        const activeClassSubjects = c.subjects.filter(
          (subject) =>
            activeExamSession.activeSubjects?.[c.id]?.[subject.id] !== false
        );

        const hasCollected = activeClassSubjects.some((s) => {
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const matchSub = s.name.toLowerCase().includes(q);
            const matchTeach = (s.teacher || '').toLowerCase().includes(q);
            if (!matchSub && !matchTeach) return false;
          }
          const key = `${trackingSessionId}__${c.id}__${s.id}`;
          const rec = trackingRecords[key];
          return Boolean(rec?.isCollected);
        });

        if (!hasCollected) {
          return false;
        }
      }

      // If 'collected_unprinted' filter is active, only show classes that have at least one subject collected but unprinted
      if (selectedStatusFilter === 'collected_unprinted') {
        const activeClassSubjects = c.subjects.filter(
          (subject) =>
            activeExamSession.activeSubjects?.[c.id]?.[subject.id] !== false
        );

        const hasCollectedUnprinted = activeClassSubjects.some((s) => {
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const matchSub = s.name.toLowerCase().includes(q);
            const matchTeach = (s.teacher || '').toLowerCase().includes(q);
            if (!matchSub && !matchTeach) return false;
          }
          const key = `${trackingSessionId}__${c.id}__${s.id}`;
          const rec = trackingRecords[key];
          return Boolean(rec?.isCollected && !rec?.isPrinted);
        });

        if (!hasCollectedUnprinted) {
          return false;
        }
      }

      // If 'printed' filter is active, only show classes that have at least one subject printed
      if (selectedStatusFilter === 'printed') {
        const activeClassSubjects = c.subjects.filter(
          (subject) =>
            activeExamSession.activeSubjects?.[c.id]?.[subject.id] !== false
        );

        const hasPrinted = activeClassSubjects.some((s) => {
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const matchSub = s.name.toLowerCase().includes(q);
            const matchTeach = (s.teacher || '').toLowerCase().includes(q);
            if (!matchSub && !matchTeach) return false;
          }
          const key = `${trackingSessionId}__${c.id}__${s.id}`;
          const rec = trackingRecords[key];
          return Boolean(rec?.isPrinted);
        });

        if (!hasPrinted) {
          return false;
        }
      }

      return true;
    });
  }, [
    masterClasses,
    selectedLevelFilter,
    selectedStatusFilter,
    searchQuery,
    trackingRecords,
    trackingSessionId,
    activeExamSession,
  ]);

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5 animate-fade-in font-sans">
      {/* Toast Notification */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#181B26] border border-amber-400/50 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-slide-in">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Header Banner - Luxury Glassmorphic Header Container with Custom Background Asset */}
      <div className="border border-[#1e2738] rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-2xl relative bg-[#0a0e17] transition-all duration-300">
        {/* Inner Background & Ambient Glows Container with Overflow Hidden */}
        <div 
          className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(to right, rgba(10, 14, 23, 0.92), rgba(15, 20, 32, 0.82)), url('/assets/Templateadmin/headertrackingsoal.webp')` }}
        >
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 right-1/3 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
          {/* Left Column: Information & Status */}
          <div className="space-y-2 max-w-xl">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#131926]/90 border border-amber-500/40 rounded-full text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-wider shadow-lg backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>MONITORING PENDATAAN &amp; PENGUMPULAN SOAL</span>
            </div>

            {/* Main Title */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
              Tracking Naskah <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]">Soal Ujian</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-300/90 font-medium leading-relaxed">
              Sistem pendataan pengumpulan dan cetak naskah soal per kelas secara berurutan.
            </p>

            {/* Bottom Status Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0e131f]/90 border border-[#232d42] rounded-xl text-xs font-semibold text-slate-200 shadow-sm backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
                <span>{activeExamSession.name || 'Pendataan Soal Ujian Aktif'}</span>
              </div>
              <div className="inline-flex items-center px-3 py-1 bg-[#0e131f]/90 border border-amber-500/50 rounded-xl text-xs font-bold text-amber-400 tracking-wide shadow-sm backdrop-blur-md">
                <span>TP {activeExamSession.schoolYear || '2026/2027'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Motivation Accent & Horizontal Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center lg:items-end justify-between lg:justify-end gap-3 sm:gap-4 shrink-0">
            {/* Motivation Quote Accent */}
            <div className="hidden xl:flex flex-col items-end text-right justify-center pr-4 border-r border-slate-700/60 my-auto">
              <span className="text-[11px] font-medium text-slate-300">Data Tertata · Proses Lebih Mudah</span>
              <span className="text-xs font-extrabold text-white tracking-wide">Hasil Lebih Maksimal</span>
              <div className="w-20 h-0.5 bg-gradient-to-r from-sky-400 to-cyan-300 rounded-full mt-1.5 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            </div>

            {/* Horizontal Action Toolbar */}
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center relative">
                {/* 1. Kelola Data */}
                <button
                  type="button"
                  onClick={() => setIsDriveTransitionOpen(true)}
                  title={`Buka Google Drive: ${activeDriveFolderUrl}`}
                  className="px-3.5 py-2.5 bg-[#121724]/90 border border-[#2b364e] hover:border-amber-400/80 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg transition-all duration-200 hover:scale-105 group backdrop-blur-md"
                >
                  <FolderOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300">Kelola Data</span>
                </button>

                {/* 2. Lampiran */}
                <button
                  type="button"
                  onClick={handleCopyDriveUrl}
                  title={copiedLink ? "Tautan Berhasil Disalin!" : "Salin Tautan Google Drive"}
                  className="px-3.5 py-2.5 bg-[#121724]/90 border border-[#2b364e] hover:border-slate-300/80 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg transition-all duration-200 hover:scale-105 group backdrop-blur-md"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white">Lampiran</span>
                </button>

                {/* 3. Sinkronisasi */}
                <button
                  type="button"
                  onClick={() => handleSyncDrive(false)}
                  disabled={isSyncingDrive}
                  title="Sinkronkan File Soal dari Google Drive"
                  className="px-3.5 py-2.5 bg-[#121724]/90 border border-[#2b364e] hover:border-sky-400/80 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg transition-all duration-200 hover:scale-105 group disabled:opacity-50 backdrop-blur-md"
                >
                  <RefreshCw className={`w-4 h-4 text-sky-400 ${isSyncingDrive ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300">Sinkronisasi</span>
                </button>

                {/* 4. Aksi ▾ Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsActionDropdownOpen(!isActionDropdownOpen)}
                    title="Menu Aksi Lainnya"
                    className="px-3.5 py-2.5 bg-[#121724]/90 border border-[#2b364e] hover:border-amber-400/80 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg transition-all duration-200 hover:scale-105 group backdrop-blur-md"
                  >
                    <MoreHorizontal className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300">Aksi</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isActionDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu Popup */}
                  {isActionDropdownOpen && (
                    <>
                      {/* Fixed backdrop to dismiss dropdown on click outside */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsActionDropdownOpen(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-[#121622] border border-[#2a344d] rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-2xl animate-fade-in">
                        <div className="px-3 py-2 border-b border-[#222a3d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Menu Aksi &amp; Pengaturan
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => { setIsActionDropdownOpen(false); setIsSettingsModalOpen(true); }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1c2333] text-xs font-medium text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                          <span>Pengaturan Mapel &amp; Kelas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsActionDropdownOpen(false); setIsExportModalOpen(true); }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1c2333] text-xs font-medium text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-amber-400" />
                          <span>Export &amp; Cetak Rekap</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsActionDropdownOpen(false); handleOpenEditDriveModal(); }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1c2333] text-xs font-medium text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4 text-sky-400" />
                          <span>Edit Link Google Drive</span>
                        </button>

                        <div className="my-1 border-t border-[#222a3d]" />

                        <button
                          type="button"
                          onClick={() => { setIsActionDropdownOpen(false); setIsClearModalOpen(true); }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-rose-500/15 text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
                          <span>Kosongkan Data Ujian</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Tampilan Publik / Non-Admin: Tombol Masuk Admin & Export Rekap */
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                {onRequestLogin && (
                  <button
                    type="button"
                    onClick={onRequestLogin}
                    title="Masuk Mode Admin untuk mencentang dan mengubah data tracking"
                    className="px-4 py-2.5 bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 rounded-xl sm:rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-300 hover:text-amber-200 cursor-pointer shadow-lg transition-all duration-200 hover:scale-105 backdrop-blur-md"
                  >
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Mode Admin</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  title="Lihat & Cetak Rekapitulasi Monitoring"
                  className="px-4 py-2.5 bg-[#121724]/90 border border-[#2b364e] hover:border-amber-400/80 rounded-xl sm:rounded-2xl flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-amber-300 cursor-pointer shadow-lg transition-all duration-200 hover:scale-105 backdrop-blur-md"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Lihat &amp; Cetak Rekap</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5 Statistics Cards Horizontal Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* CARD 1: TOTAL TARGET */}
        <div className="col-span-2 sm:col-span-1 bg-[#121622] border border-[#232d42] hover:border-amber-500/40 rounded-2xl p-3.5 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TOTAL TARGET
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs shadow-inner">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-2xl font-black text-white tracking-tight">
                {stats.totalTarget}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                Dari <strong className="text-amber-400">
                  {masterClasses.filter(
                    (c) => activeExamSession.activeClasses?.[c.id] !== false
                  ).length}
                </strong> kelas aktif
              </div>
            </div>
            {/* Mini SVG Bar Chart Graphic */}
            <div className="w-12 h-7 flex items-end justify-between gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <div className="w-2 bg-amber-500/30 rounded-t h-[40%]" />
              <div className="w-2 bg-amber-500/50 rounded-t h-[70%]" />
              <div className="w-2 bg-amber-500/80 rounded-t h-[55%]" />
              <div className="w-2 bg-amber-400 rounded-t h-[90%]" />
            </div>
          </div>
        </div>

        {/* CARD 2: SUDAH KUMPUL */}
        <div className="bg-[#121622] border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-3.5 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              SUDAH KUMPUL
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="w-full">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-400">
                  {stats.totalCollected}
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  ({stats.collectedPercentage}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800/80 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${stats.collectedPercentage}%` }}
                />
              </div>
            </div>
            {/* Mini SVG Wave Trend Chart */}
            <svg className="w-10 h-6 shrink-0 text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 40 24" fill="none">
              <path d="M2 18 Q 10 12, 18 16 T 38 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>

        {/* CARD 3: BELUM KUMPUL */}
        <div className="bg-[#121622] border border-rose-500/30 hover:border-rose-500/60 rounded-2xl p-3.5 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
              BELUM KUMPUL
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-inner">
              <Hourglass className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-2xl font-black text-rose-400">
                {stats.totalNotCollected}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                Menunggu setor guru
              </div>
            </div>
            {/* Mini SVG Wave Trend Chart */}
            <svg className="w-10 h-6 shrink-0 text-rose-400 opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 40 24" fill="none">
              <path d="M2 6 Q 12 20, 22 10 T 38 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>

        {/* CARD 4: SUDAH FOTOCOPY */}
        <div className="bg-[#121622] border border-sky-500/30 hover:border-sky-500/60 rounded-2xl p-3.5 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
              SUDAH FOTOCOPY
            </span>
            <div className="w-7 h-7 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shadow-inner">
              <Printer className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="w-full">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-sky-400">
                  {stats.totalPrinted}
                </span>
                <span className="text-xs font-bold text-sky-300">
                  ({stats.printedPercentage}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800/80 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${stats.printedPercentage}%` }}
                />
              </div>
            </div>
            {/* Mini SVG Wave Trend Chart */}
            <svg className="w-10 h-6 shrink-0 text-sky-400 opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 40 24" fill="none">
              <path d="M2 20 Q 14 10, 24 14 T 38 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>

        {/* CARD 5: BELUM FOTOCOPY */}
        <div className="bg-[#121622] border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-3.5 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              BELUM FOTOCOPY
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <Printer className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-2xl font-black text-amber-400">
                {stats.totalNotPrinted}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                Menunggu fotocopy
              </div>
            </div>
            {/* Mini SVG Wave Trend Chart */}
            <svg className="w-10 h-6 shrink-0 text-amber-400 opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 40 24" fill="none">
              <path d="M2 8 Q 12 18, 22 8 T 38 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filter & Search Panel Container */}
      <div className="bg-[#121622] border border-[#232d42] rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              CARI MAPEL / GURU
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama mapel atau guru..."
                className="w-full pl-9 pr-3 py-2 bg-[#0c0f17] border border-[#232d42] focus:border-amber-400/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              FILTER STATUS
            </label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#0c0f17] border border-[#232d42] focus:border-amber-400/80 rounded-xl text-xs font-medium text-white focus:outline-none cursor-pointer shadow-inner"
            >
              <option value="all">Semua Status Mapel</option>
              <option value="collected">📥 Sudah Kumpul (Semua yang Dikumpulkan)</option>
              <option value="collected_unprinted">📄 Belum Fotocopy (Sudah Kumpul &amp; Belum Cetak)</option>
              <option value="printed">🖨️ Sudah Fotocopy</option>
              <option value="uncollected">⏳ Belum Kumpul Saja</option>
              <option value="complete">✅ Lengkap (Kumpul &amp; Fotocopy)</option>
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              FILTER JENJANG KELAS
            </label>
            <select
              value={selectedLevelFilter}
              onChange={(e) =>
                setSelectedLevelFilter(
                  e.target.value === 'all' ? 'all' : Number(e.target.value)
                )
              }
              className="w-full px-3 py-2 bg-[#0c0f17] border border-[#232d42] focus:border-amber-400/80 rounded-xl text-xs font-bold text-amber-300 focus:outline-none cursor-pointer shadow-inner"
            >
              <option value="all">Semua Kelas (1A s/d 6B)</option>
              <option value={1}>Kelas 1 (1A, 1B)</option>
              <option value={2}>Kelas 2 (2A, 2B, 2C)</option>
              <option value={3}>Kelas 3 (3A, 3B, 3C)</option>
              <option value={4}>Kelas 4 (4A, 4B)</option>
              <option value={5}>Kelas 5 (5A, 5B)</option>
              <option value={6}>Kelas 6 (6A, 6B)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pill Buttons */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-[#232d42] overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase flex-shrink-0">KELAS:</span>
          <button
            type="button"
            onClick={() => setSelectedLevelFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
              selectedLevelFilter === 'all'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.5)] font-black'
                : 'bg-[#0c0f17] hover:bg-slate-800 text-slate-300 border border-[#232d42]'
            }`}
          >
            Semua
          </button>
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevelFilter(lvl)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                selectedLevelFilter === lvl
                  ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.5)] font-black'
                  : 'bg-[#0c0f17] hover:bg-slate-800 text-slate-300 border border-[#232d42]'
              }`}
            >
              Kelas {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* CONTINUOUS 4-COLUMN GRID (NO JENJANG DIVIDERS)
          Baris 1: 1A, 1B, 2A, 2B
          Baris 2: 2C, 3A, 3B, 3C (REVISI 4: Kelas 2C proporsional dan disamakan)
      */}
      {filteredOrderedClasses.length === 0 ? (
        <div className="bg-[#141722] border border-[#232A3B] rounded-2xl p-8 text-center text-slate-400 space-y-2">
          <p className="text-sm font-semibold text-slate-300">Tidak ada kelas yang sesuai dengan kriteria filter.</p>
          <p className="text-xs text-slate-500">
            {selectedStatusFilter === 'collected_unprinted'
              ? 'Semua soal yang terkumpul sudah selesai difotokopi, atau belum ada naskah soal yang masuk.'
              : selectedStatusFilter === 'printed'
              ? 'Belum ada naskah soal yang ditandai sudah difotokopi.'
              : 'Silakan sesuaikan pencarian atau pilihan filter jenjang/status di atas.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {filteredOrderedClasses.map((c) => {
          const activeClassSubjects = c.subjects.filter(
            (subject) =>
              activeExamSession.activeSubjects?.[c.id]?.[subject.id] !== false
          );

          const subjectsList = activeClassSubjects.filter((s) => {
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim();
              const matchSub = s.name.toLowerCase().includes(q);
              const matchTeach = (s.teacher || '').toLowerCase().includes(q);

              if (!matchSub && !matchTeach) {
                return false;
              }
            }

            const key = `${trackingSessionId}__${c.id}__${s.id}`;
            const rec = trackingRecords[key];

            if (selectedStatusFilter === 'collected') {
              // Tampilkan SELURUH soal yang sudah dikumpulkan (isCollected === true), baik yang belum atau sudah diprint
              if (!rec?.isCollected) {
                return false;
              }
            }

            if (selectedStatusFilter === 'collected_unprinted') {
              // Hanya tampilkan jika SUDAH kumpul (isCollected === true) DAN BELUM cetak (!isPrinted)
              if (!rec?.isCollected || rec?.isPrinted) {
                return false;
              }
            }

            if (
              selectedStatusFilter === 'uncollected' &&
              rec?.isCollected
            ) {
              return false;
            }

            if (
              selectedStatusFilter === 'printed' &&
              !rec?.isPrinted
            ) {
              return false;
            }

            if (
              selectedStatusFilter === 'complete' &&
              (!rec?.isCollected || !rec?.isPrinted)
            ) {
              return false;
            }

            return true;
          });

          let classCollected = 0;
          let classPrinted = 0;

          activeClassSubjects.forEach((s) => {
            const key = `${trackingSessionId}__${c.id}__${s.id}`;
            const rec = trackingRecords[key];

            if (rec?.isCollected) {
              classCollected++;
            }

            if (rec?.isPrinted) {
              classPrinted++;
            }
          });

          const isClassFullyCollected =
            classCollected === activeClassSubjects.length &&
            activeClassSubjects.length > 0;

          const isClassFullyPrinted =
            classPrinted === activeClassSubjects.length &&
            activeClassSubjects.length > 0;

          return (
            <div
              key={c.id}
              className="bg-[#181B26] border border-[#272D3E] rounded-2xl overflow-hidden shadow-lg flex flex-col hover:border-slate-600 transition-colors"
            >
              {/* Compact Class Card Header */}
              <div className="p-3 bg-[#151722] border-b border-[#272D3E]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs flex-shrink-0">
                      {c.name}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-white leading-none truncate">
                        Kelas {c.name}
                      </h3>
                      <span className="text-[10px] text-amber-300 font-medium leading-none block mt-0.5 truncate max-w-[120px]" title={`Wali: ${c.waliKelas}`}>
                        Wali: {c.waliKelas}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-semibold flex-shrink-0">
                    <span className={isClassFullyCollected ? 'text-emerald-400' : 'text-slate-300'}>
                      K: {classCollected}/{c.subjects.length}
                    </span>
                    <span className="text-slate-500 mx-1">•</span>
                    <span className={isClassFullyPrinted ? 'text-blue-400' : 'text-slate-300'}>
                      F: {classPrinted}/{c.subjects.length}
                    </span>
                  </div>
                </div>

                {/* Admin Batch Quick Action Buttons */}
                {isAdmin && (
                  <div className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-[#272D3E]/60 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleBatchClass(c, 'isCollected', !isClassFullyCollected)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        isClassFullyCollected
                          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                      }`}
                    >
                      {isClassFullyCollected ? 'Reset K' : 'Semua K'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBatchClass(c, 'isPrinted', !isClassFullyPrinted)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        isClassFullyPrinted
                          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30'
                      }`}
                    >
                      {isClassFullyPrinted ? 'Reset F' : 'Semua F'}
                    </button>
                  </div>
                )}
              </div>

              {/* Table with Propagated Proportional Alignment */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse table-fixed">
                  <thead>
                    <tr className="bg-[#12141D] text-[10px] font-bold text-slate-400 border-b border-[#272D3E]">
                      <th className="py-1 px-1.5 w-6 text-center">NO</th>
                      <th className="py-1 px-2">MAPEL</th>
                      <th className="py-1 px-1.5 w-14 text-center">KUMPUL</th>
                      <th className="py-1 px-1.5 w-16 text-center">FOTOCOPY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#272D3E]/40">
                    {subjectsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500 text-[10px]">
                          Tidak ada mapel
                        </td>
                      </tr>
                    ) : (
                      subjectsList.map((sub, idx) => {
                        const key = `${trackingSessionId}__${c.id}__${sub.id}`;
                        const rec = trackingRecords[key];
                        const isKumpul = !!rec?.isCollected;
                        const isPrint = !!rec?.isPrinted;

                        return (
                          <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-1 px-1.5 text-center text-slate-500 text-[10px] font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-1 px-2 text-slate-200 truncate">
                              <div
                                className="font-semibold text-white truncate"
                                title={formatSubjectDisplayName(sub.name, sub.teacher)}
                              >
                                {formatSubjectDisplayName(sub.name, sub.teacher)}
                              </div>
                            </td>
                            <td className="py-1 px-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCollected(c, sub)}
                                    title={
                                      isKumpul
                                        ? `Status Kumpul: Sudah dikumpulkan${rec?.collectedAt ? ` (${new Date(rec.collectedAt).toLocaleDateString('id-ID')} ${new Date(rec.collectedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})` : ''} - Klik untuk ubah`
                                        : 'Status Kumpul: Belum dikumpulkan - Klik untuk tandai sudah kumpul'
                                    }
                                    className={`w-full py-0.5 px-1 rounded text-[10px] font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                                      isKumpul
                                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-slate-900/90 text-slate-500 border border-slate-800 hover:text-slate-300'
                                    }`}
                                  >
                                    {isKumpul ? '✓' : '—'}
                                  </button>
                                ) : (
                                  <span
                                    title={
                                      isKumpul
                                        ? `Status Kumpul: Sudah dikumpulkan${rec?.collectedAt ? ` (${new Date(rec.collectedAt).toLocaleDateString('id-ID')} ${new Date(rec.collectedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})` : ''}`
                                        : 'Status Kumpul: Belum dikumpulkan'
                                    }
                                    className={isKumpul ? 'text-emerald-400 font-bold' : 'text-slate-600'}
                                  >
                                    {isKumpul ? '✓' : '—'}
                                  </span>
                                )}
                                {isAdmin && isKumpul && (rec?.driveFileUrl || rec?.driveUrl) && (
                                  <a
                                    href={rec.driveFileUrl || rec.driveUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-0.5 text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0"
                                    title="Buka File Soal di Google Drive"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-1 px-1.5 text-center">
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePrinted(c, sub)}
                                  title={
                                    isPrint
                                      ? `Status Fotocopy: Sudah dicetak/fotocopy${rec?.printedAt ? ` (${new Date(rec.printedAt).toLocaleDateString('id-ID')} ${new Date(rec.printedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})` : ''} - Klik untuk ubah`
                                      : 'Status Fotocopy: Belum dicetak/fotocopy - Klik untuk tandai sudah fotocopy'
                                  }
                                  className={`w-full py-0.5 px-1 rounded text-[10px] font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                                    isPrint
                                      ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40'
                                      : 'bg-slate-900/90 text-slate-500 border border-slate-800 hover:text-slate-300'
                                  }`}
                                >
                                  {isPrint ? '✓' : '—'}
                                </button>
                              ) : (
                                <span
                                  title={
                                    isPrint
                                      ? `Status Fotocopy: Sudah dicetak/fotocopy${rec?.printedAt ? ` (${new Date(rec.printedAt).toLocaleDateString('id-ID')} ${new Date(rec.printedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})` : ''}`
                                      : 'Status Fotocopy: Belum dicetak/fotocopy'
                                  }
                                  className={isPrint ? 'text-blue-400 font-bold' : 'text-slate-600'}
                                >
                                  {isPrint ? '✓' : '—'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Modal Edit Link Google Drive Folder */}
      {isEditDriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#181B26] border border-[#2B3245] rounded-3xl p-6 shadow-2xl text-slate-100 relative">
            <button
              type="button"
              onClick={() => setIsEditDriveModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#252B3B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#24293A]">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Pengaturan Tautan Google Drive Soal
                </h3>
                <p className="text-xs text-slate-400">
                  Update tautan folder tempat guru mengunggah & menyimpan file soal
                </p>
              </div>
            </div>

            {driveSaveError && (
              <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {driveSaveError}
              </div>
            )}

            <form onSubmit={handleSaveDriveUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  URL / Tautan Folder Google Drive *
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    required
                    value={tempDriveUrlInput}
                    onChange={(e) => setTempDriveUrlInput(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full pl-9 pr-3 py-2.5 bg-[#12141D] border border-[#2B3245] focus:border-amber-400 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {isValidUrl(tempDriveUrlInput) && (
                  <a
                    href={sanitizeDriveUrl(tempDriveUrlInput)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>Uji Tautan</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleCopyDriveUrl}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Tersalin' : 'Salin URL'}</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#24293A]">
                <button
                  type="button"
                  onClick={() => setIsEditDriveModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingDrive}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingDrive ? 'Menyimpan...' : 'Simpan Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Clear All Tracking Data */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#181B26] border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-slate-100 relative">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#24293A]">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Kosongkan Seluruh Data Tracking?
                </h3>
                <p className="text-xs text-rose-300">
                  Tindakan ini akan mereset centang kumpul & print untuk menghadapi ujian baru.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Semua status pengumpulan soal akan dikembalikan ke posisi 0 (belum kumpul). Master data mapel dan kelas tetap aman.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#24293A]">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Ya, Kosongkan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal with Master Classes & School Years */}
      <TrackingExamSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() =>
          setIsSettingsModalOpen(false)
        }
        examSession={activeExamSession}
        onSaveSession={async (updatedSession) => {
          try {
            await updateSingleExamSession(
              trackingSessionId,
              updatedSession
            );

            setActiveExamSession(
              updatedSession
            );

            setIsSettingsModalOpen(false);

            showFeedback(
              '✅ Pengaturan ujian berhasil disimpan.'
            );
          } catch (err: any) {
            console.error(
              'Gagal menyimpan konfigurasi ujian:',
              err
            );

            showFeedback(
              err?.message ||
                '❌ Gagal menyimpan pengaturan ujian.'
            );

            throw err;
          }
        }}
        schoolYears={schoolYears.map((s) => (typeof s === 'string' ? s : s.year))}
        masterClasses={masterClasses}
        onUpdateMasterClasses={
          handleUpdateMasterClasses
        }
      />

      {/* Export & Rekapitulasi Modal */}
      <TrackingExportModal
        isOpen={isExportModalOpen}
        onClose={() =>
          setIsExportModalOpen(false)
        }
        examSession={activeExamSession}
        activeMasterClasses={
          masterClasses.filter(
            (c) =>
              activeExamSession.activeClasses?.[
                c.id
              ] !== false
          )
        }
        activeSubjectsMap={
          activeExamSession.activeSubjects ||
          {}
        }
        trackingRecords={trackingRecords}
        stats={stats}
      />

      {/* Modal Log & Diagnostik Sinkronisasi Google Drive (Hasil Transparan) */}
      {syncResultModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#141722] border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-slate-100 relative max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#24293A]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Hasil Diagnostik & Sinkronisasi Drive
                  </h3>
                  <p className="text-xs text-slate-400">
                    Detail pemindaian file naskah soal dari folder Google Drive
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSyncResultModalData(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="bg-[#1C2030] border border-slate-700/50 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <FolderCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Total File Terbaca</div>
                  <div className="text-lg font-extrabold text-white">
                    {syncResultModalData.totalDriveFilesFound}
                  </div>
                </div>
              </div>

              <div className="bg-[#1C2030] border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400/90 font-medium">Tercocokkan (Kumpul)</div>
                  <div className="text-lg font-extrabold text-emerald-300">
                    {syncResultModalData.matchedCount}
                  </div>
                </div>
              </div>

              <div className="bg-[#1C2030] border border-amber-500/30 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-amber-400/90 font-medium">Belum Matched</div>
                  <div className="text-lg font-extrabold text-amber-300">
                    {syncResultModalData.unmatchedFiles.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-[#24293A] pb-2 mb-4">
              <button
                type="button"
                onClick={() => setSyncModalTab('matched')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  syncModalTab === 'matched'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tercocokkan ({syncResultModalData.matchedCount})
              </button>

              <button
                type="button"
                onClick={() => setSyncModalTab('unmatched')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  syncModalTab === 'unmatched'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                File Belum Matched ({syncResultModalData.unmatchedFiles.length})
              </button>

              <button
                type="button"
                onClick={() => setSyncModalTab('guide')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ml-auto ${
                  syncModalTab === 'guide'
                    ? 'bg-sky-600/30 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Panduan & API Key
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[220px]">
              {/* Tab 1: Matched Files */}
              {syncModalTab === 'matched' && (
                <div>
                  {syncResultModalData.matchedDetails.length === 0 ? (
                    <div className="text-center py-8 bg-[#181B26] rounded-2xl border border-dashed border-slate-700">
                      <FileCheck className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-60" />
                      <p className="text-xs text-slate-300 font-medium">
                        Belum ada file soal yang cocok dengan tabel kelas & mapel aktif.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Cek tab "File Belum Matched" untuk melihat file apa saja yang ada di Drive Anda.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {syncResultModalData.matchedDetails.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[#1A1E2C] border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg flex-shrink-0">
                              Kelas {item.classId}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">
                                {item.subjectName}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                <FileText className="w-3 h-3 text-emerald-400" />
                                {item.fileName}
                              </div>
                            </div>
                          </div>

                          {item.driveUrl && (
                            <a
                              href={item.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm"
                            >
                              <span>Buka File</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Unmatched Files */}
              {syncModalTab === 'unmatched' && (
                <div>
                  <div className="p-3 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      File di bawah ini ditemukan di Google Drive Anda, namun sistem belum mengenali nama kelas atau mata pelajarannya. 
                      <strong className="text-amber-300 ml-1">Saran:</strong> Tambahkan kode kelas (misal <code className="bg-amber-950/60 px-1 rounded text-amber-300">1A</code>) dan nama mapel (misal <code className="bg-amber-950/60 px-1 rounded text-amber-300">Matematika</code>) pada nama file di Drive.
                    </div>
                  </div>

                  {syncResultModalData.unmatchedFiles.length === 0 ? (
                    <div className="text-center py-8 bg-[#181B26] rounded-2xl border border-dashed border-slate-700">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                      <p className="text-xs text-emerald-300 font-medium">
                        Luar biasa! Tidak ada file yang tidak cocok. Seluruh file di Drive berhasil dikenali.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {syncResultModalData.unmatchedFiles.map((file, idx) => (
                        <div
                          key={file.id || idx}
                          className="p-3 bg-[#1A1E2C] border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            {file.path && (
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                Subfolder: {file.path}
                              </div>
                            )}
                          </div>

                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Buka</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Panduan & API Key */}
              {syncModalTab === 'guide' && (
                <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                  {/* Option A: Public Share */}
                  <div className="p-4 bg-[#181C2B] border border-sky-500/30 rounded-2xl space-y-2">
                    <h4 className="font-bold text-sky-300 text-sm flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-sky-400" />
                      Langkah 1: Atur Hak Akses Folder Google Drive
                    </h4>
                    <p className="text-slate-300">
                      Agar sistem dapat memindai file tanpa hambatan, buka folder Google Drive Anda dan ubah pengaturan aksesnya:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-300 font-medium">
                      <li>Buka folder penyimpanan naskah soal di Google Drive.</li>
                      <li>Klik tombol <strong>"Bagikan" (Share)</strong> di pojok kanan atas folder.</li>
                      <li>Di bagian <em>Akses Umum (General Access)</em>, ubah dari <strong>Dibatasi</strong> menjadi <strong>"Siapa saja yang memiliki link"</strong>.</li>
                      <li>Pastikan peran dipilih sebagai <strong>"Pelihat" (Viewer)</strong>.</li>
                      <li>Klik <strong>Selesai</strong> dan jalankan kembali tombol <strong>Sinkronkan Drive</strong> di aplikasi.</li>
                    </ol>
                  </div>

                  {/* Option B: Standard Naming Format */}
                  <div className="p-4 bg-[#181C2B] border border-emerald-500/30 rounded-2xl space-y-2">
                    <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      Langkah 2: Format Penamaan File yang Disarankan
                    </h4>
                    <p>
                      Sistem menggunakan kecerdasan pencocokan otomatis (*Flex-Matching*). Pastikan nama file atau file di subfolder memuat kode kelas dan nama mapel:
                    </p>
                    <div className="bg-[#11131D] p-3 rounded-xl space-y-1 font-mono text-[11px] text-emerald-300 border border-emerald-950">
                      <div>• 1A_Matematika_Soal_PAS.docx</div>
                      <div>• Soal PAS Kelas 1-A PAI.pdf</div>
                      <div>• 2B IPAS Ujian Akhir.docx</div>
                      <div>• 3A_Bahasa_Inggris.docx</div>
                    </div>
                  </div>

                  {/* Option C: Google Drive API Key Setup */}
                  <div className="p-4 bg-[#181C2B] border border-slate-700 rounded-2xl space-y-2">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Langkah 3: Mengaktifkan Google Drive API Key (Opsional)
                    </h4>
                    <p>
                      Jika folder Anda bersifat privat atau Anda ingin mempercepat proses sinkronisasi melalui API resmi Google:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-300">
                      <li>Buka <strong>Google Cloud Console</strong> (<a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">console.cloud.google.com</a>).</li>
                      <li>Buka menu <strong>APIs & Services &gt; Library</strong>.</li>
                      <li>Cari <strong>Google Drive API</strong> lalu klik <strong>Enable (Aktifkan)</strong>.</li>
                      <li>Buka menu <strong>APIs & Services &gt; Credentials</strong>, lalu klik <strong>Create Credentials &gt; API Key</strong>.</li>
                      <li>Salin Kunci API tersebut dan masukkan sebagai environment variable <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">GOOGLE_DRIVE_API_KEY</code> di pengaturan server.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#24293A]">
              <div className="text-[11px] text-slate-400">
                {syncResultModalData.totalDriveFilesFound > 0 ? (
                  <span>
                    Status: Dipindai melalui <strong className="text-slate-200">{syncResultModalData.apiMethodUsed || 'Pembaca Folder Publik'}</strong>
                  </span>
                ) : (
                  <span className="text-amber-400">
                    Pastikan folder Drive diset publik atau beri nama file sesuai format.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSyncResultModalData(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Tutup Diagnostik
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Second Transition & Naming Guide Modal for Google Drive */}
      <DriveFolderTransitionModal
        isOpen={isDriveTransitionOpen}
        targetUrl={activeDriveFolderUrl}
        folderTitle="Folder Google Drive Pengumpulan Soal"
        onClose={() => setIsDriveTransitionOpen(false)}
      />
    </div>
  );
};
