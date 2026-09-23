import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  NavTab,
  DocumentItem,
  SchoolTemplateItem,
  ExamUploadConfig,
  ExamSubmissionItem,
  ExamTrackingItem,
  TeacherUser,
  DEFAULT_EXAM_CONFIG,
  DEFAULT_SCHOOL_YEAR_OPTIONS,
} from './types';
import {
  getLocalDocuments,
  subscribeToDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteMultipleDocuments,
  clearAllDocuments,
  resetToDefaultDocuments,
  getStoredTemplates,
  subscribeToTemplates,
  updateStoredTemplate,
  getStoredExamConfig,
  subscribeToExamConfig,
  updateStoredExamConfig,
  getStoredExamSubmissions,
  subscribeToExamSubmissions,
  addExamSubmission,
  updateExamSubmission,
  deleteExamSubmission,
  archiveExamSubmissionToBankSoal,
  getLocalExamTrackings,
  subscribeToExamTrackings,
  toggleExamTrackingCollected,
  toggleExamTrackingPrinted,
  addExamTracking,
  updateExamTracking,
  deleteExamTracking,
  resetToDefaultExamTrackings,
} from './services/storage';
import { subscribeToStudents, getStoredStudentsLocal, type Student } from './services/studentStorage';
import { isAdminLoggedIn, logoutAdmin, subscribeToAuth } from './services/auth';
import {
  getActiveTeacherSession,
  logoutTeacher,
  verifyActiveTeacherSessionRealtime,
  subscribeToCurrentTeacherSession,
} from './services/teacherStorage';
import { AppBranding, getLocalBranding, subscribeToBranding, updateStoredBranding } from './services/brandingStorage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { AdministrasiView } from './components/AdministrasiView';
import { SoalView } from './components/SoalView';
import { SertifikatView } from './components/SertifikatView';
import { RaporView } from './components/RaporView';
import { RaporWorkspace } from './components/rapor/RaporWorkspace';
import { EraporAdminDashboard } from './components/rapor/EraporAdminDashboard';
import { AdminView } from './components/AdminView';
import { TrackingSoalView } from './components/TrackingSoalView';
import { UploadSoalView } from './components/UploadSoalView';
import { UploadSoalModal } from './components/UploadSoalModal';
import { LoginModal } from './components/LoginModal';
import { TeacherAuthModal } from './components/TeacherAuthModal';
import { EraporAuthModal } from './components/EraporAuthModal';
import { EditDocumentModal } from './components/EditDocumentModal';
import { PersonalQrisModal } from './components/PersonalQrisModal';
import StudentDatabaseView from './components/StudentDatabaseView';
import AcademicSettingsView from './components/academic/AcademicSettingsView';
import { handleModalPopState } from './utils/modalNavigation';
import { getTabFromCurrentPath, syncUrlWithTab, TAB_TO_PATH } from './utils/urlRouter';
import { clearEraporSession, getActiveEraporSession } from './services/teacherEraporAuthService';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>(() => getTabFromCurrentPath());
  const [documents, setDocuments] = useState<DocumentItem[]>(() => getLocalDocuments());
  const [templates, setTemplates] = useState<SchoolTemplateItem[]>(() => getStoredTemplates());
  const [examConfig, setExamConfig] = useState<ExamUploadConfig>(() => getStoredExamConfig());
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmissionItem[]>(() =>
    getStoredExamSubmissions()
  );
  const [examTrackings, setExamTrackings] = useState<ExamTrackingItem[]>(() =>
    getLocalExamTrackings()
  );
  const [students, setStudents] = useState<Student[]>(() => getStoredStudentsLocal());
  const [branding, setBranding] = useState<AppBranding>(() => getLocalBranding());
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Admin Authentication State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [pendingDocToEdit, setPendingDocToEdit] = useState<DocumentItem | null>(null);

  // In-Place Document Edit Modal State
  const [docToEditModal, setDocToEditModal] = useState<DocumentItem | null>(null);
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState<boolean>(false);

  // App-level QRIS modal for mobile header
  const [isAppQrisModalOpen, setIsAppQrisModalOpen] = useState<boolean>(false);

  // Teacher Whitelist Authentication State
  const [activeTeacher, setActiveTeacher] = useState<TeacherUser | null>(() => getActiveTeacherSession());
  // Admin Preview Teacher: ephemeral UI state only. It never replaces the real teacher session.
  const [previewTeacher, setPreviewTeacher] = useState<TeacherUser | null>(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [pendingTabForTeacher, setPendingTabForTeacher] = useState<NavTab | null>(null);
  const [teacherTargetName, setTeacherTargetName] = useState<string>('Folder Arsip Guru');
  const [teacherSuccessCallback, setTeacherSuccessCallback] = useState<(() => void) | null>(null);
  const [isEraporAuthModalOpen, setIsEraporAuthModalOpen] = useState<boolean>(false);

  const [authNotification, setAuthNotification] = useState<{
    message: string;
    type: 'success' | 'info';
  } | null>(null);

  // Android & Mobile Browser History Stack Handler & URL Synchronization
  const lastBackPressTimeRef = useRef<number>(0);
  const [showExitPrompt, setShowExitPrompt] = useState<boolean>(false);

  // Sync initial URL path and setup PopState navigation listener
  useEffect(() => {
    // 1. Initial Check on mount:
    const initialTab = getTabFromCurrentPath();
    const canonicalPath = TAB_TO_PATH[initialTab] || '/';
    
    // Set initial baseline history state with current canonical path
    window.history.replaceState({ app: 'sdit-arsip', tab: initialTab, modal: null }, '', canonicalPath);

    // If initial tab is protected and user has no access, prompt auth
    if (initialTab === 'admin' || initialTab === 'student_db' || initialTab === 'academic_settings') {
      if (!isAdminLoggedIn()) {
        setIsLoginModalOpen(true);
      }
    } else if (initialTab === 'rapor_sts') {
      if (!isAdminLoggedIn()) {
        const teacherSession = getActiveTeacherSession();
        if (!teacherSession) {
          openTeacherAuthForTab(initialTab);
        } else {
          const eraporSession = getActiveEraporSession();
          if (!eraporSession || eraporSession.teacherId !== teacherSession.id) {
            setIsEraporAuthModalOpen(true);
          }
        }
      }
    } else if (initialTab !== 'dashboard') {
      const teacherSession = getActiveTeacherSession();
      if (!teacherSession && !isAdminLoggedIn()) {
        openTeacherAuthForTab(initialTab);
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      // 0. Prioritas utama: jika ada modal berlapis (misal: input nilai siswa, generator analisis) yang terbuka
      if (handleModalPopState()) {
        return;
      }

      // 1. Jika ada modal yang sedang aktif terbuka, tutup modal tersebut
      if (isTeacherModalOpen || isLoginModalOpen || isUploadModalOpen || isEditDocModalOpen || isEraporAuthModalOpen) {
        setIsTeacherModalOpen(false);
        setIsLoginModalOpen(false);
        setIsUploadModalOpen(false);
        setIsEditDocModalOpen(false);
        setIsEraporAuthModalOpen(false);
        setDocToEditModal(null);
        setPendingDocToEdit(null);
        setPendingTabForTeacher(null);
        setTeacherSuccessCallback(null);
        syncUrlWithTab(currentTab, true);
        return;
      }

      // 2. Dapatkan target tab dari state history atau URL browser
      const eventTab = event.state?.tab as NavTab | undefined;
      const targetTab = eventTab || getTabFromCurrentPath();

      if (targetTab !== currentTab) {
        setCurrentTab(targetTab);
        if (targetTab !== 'admin') {
          setEditingDocId(null);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 3. Jika sedang di tab sub-halaman (Administrasi, Soal, Rapor, Admin, dll), kembali ke Dashboard
      if (currentTab !== 'dashboard') {
        setCurrentTab('dashboard');
        setEditingDocId(null);
        syncUrlWithTab('dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 4. Jika sudah berada di Dashboard, lakukan proteksi keluar aplikasi (Tekan 2x untuk keluar)
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2000) {
        // Pengguna menekan back dua kali berturut-turut dalam 2 detik -> izinkan keluar
        return;
      } else {
        lastBackPressTimeRef.current = now;
        setShowExitPrompt(true);
        setTimeout(() => {
          setShowExitPrompt(false);
        }, 2000);
        // Tahan pengguna tetap di dalam web
        syncUrlWithTab('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isTeacherModalOpen, isLoginModalOpen, isUploadModalOpen, isEditDocModalOpen, isEraporAuthModalOpen, currentTab]);

  // Real-time Firestore sync & auth check (Optimized to avoid full collection reads & polling)
  useEffect(() => {
    setIsAdmin(isAdminLoggedIn());
    const initialTeacher = getActiveTeacherSession();
    setActiveTeacher(initialTeacher);

    const unsubscribeAuth = subscribeToAuth((loggedIn) => {
      setIsAdmin(loggedIn);
    });

    const unsubscribeDocs = subscribeToDocuments((cloudDocs) => {
      setDocuments(cloudDocs);
      setIsCloudSynced(true);
    });

    const unsubscribeTemplates = subscribeToTemplates((cloudTemplates) => {
      setTemplates(cloudTemplates);
    });

    const unsubscribeExamConfig = subscribeToExamConfig((cloudConfig) => {
      setExamConfig(cloudConfig);
    });

    const unsubscribeBranding = subscribeToBranding((cloudBranding) => {
      setBranding(cloudBranding);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDocs();
      unsubscribeTemplates();
      unsubscribeExamConfig();
      unsubscribeBranding();
    };
  }, []);

  // INSTANT ZERO-DELAY SESSION REVOCATION LISTENER:
  // Ketika Admin mencabut sesi / memblokir guru di Firestore, browser guru langsung terputus seketika (0 detik)
  useEffect(() => {
    if (!activeTeacher?.id) return;

    const unsubscribe = subscribeToCurrentTeacherSession(
      activeTeacher.id,
      (reason) => {
        clearEraporSession();
        setIsEraporAuthModalOpen(false);
        setActiveTeacher(null);
        setCurrentTab('dashboard');
        setAuthNotification({
          message: reason || 'Sesi akses Anda telah dicabut oleh Administrator.',
          type: 'info',
        });
        setTimeout(() => setAuthNotification(null), 6000);
      },
      (updatedTeacher) => {
        setActiveTeacher(updatedTeacher);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeTeacher?.id]);

  // Sync counts
  const documentCounts = useMemo(() => {
    const administrasi = documents.filter((d) => d.type === 'administrasi').length;
    const soal = documents.filter((d) => d.type === 'soal').length;
    const sertifikat = documents.filter((d) => d.type === 'sertifikat').length;
    const rapor = documents.filter((d) => d.type === 'rapor').length;
    return {
      total: documents.length,
      administrasi,
      soal,
      sertifikat,
      rapor,
    };
  }, [documents]);

  const pendingSubmissionsCount = useMemo(() => {
    const uncollected = examTrackings.filter((t) => !t.isCollected).length;
    return uncollected;
  }, [examTrackings]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    documents.forEach((d) => {
      if (d.schoolYear) yearsSet.add(d.schoolYear);
    });
    examSubmissions.forEach((s) => {
      if (s.schoolYear) yearsSet.add(s.schoolYear);
    });
    examTrackings.forEach((t) => {
      if (t.schoolYear) yearsSet.add(t.schoolYear);
    });
    ['2025/2026', '2024/2025', '2023/2024'].forEach((y) => yearsSet.add(y));
    return ['Semua Tahun', ...Array.from(yearsSet).sort((a, b) => b.localeCompare(a))];
  }, [documents, examSubmissions, examTrackings]);

  const folderSoalTemplate = useMemo(() => {
    return templates.find((t) => t.category === 'folder_soal');
  }, [templates]);

  // Protected navigation handler:
  // - 'dashboard' is public.
  // - 'admin' and 'student_db' require Admin Login.
  // - 'administrasi', 'soal', 'tracking_soal', 'sertifikat', 'rapor' require Teacher Session (or Admin).
  const handleSelectTab = async (tab: NavTab) => {
    if (tab === 'admin' || tab === 'student_db' || tab === 'academic_settings') {
      if (!isAdmin) {
        setPendingDocToEdit(null);
        setIsLoginModalOpen(true);
        return;
      }
    } else if (tab === 'rapor_sts' && !isAdmin) {
      // e-Rapor memiliki login lapis kedua khusus guru.
      // Login guru utama tetap menjadi identitas, sedangkan PIN ini hanya
      // membuka modul e-Rapor.
      const session = getActiveTeacherSession();
      if (!session) {
        openTeacherAuthForTab(tab);
        return;
      }

      const verification = await verifyActiveTeacherSessionRealtime();
      if (!verification.isValid) {
        clearEraporSession();
        setActiveTeacher(null);
        setAuthNotification({
          message: verification.message || 'Sesi akses Anda telah dicabut oleh Administrator.',
          type: 'info',
        });
        setTimeout(() => setAuthNotification(null), 5000);
        openTeacherAuthForTab(tab);
        return;
      }

      const eraporSession = getActiveEraporSession();
      if (!eraporSession || eraporSession.teacherId !== session.id) {
        setIsEraporAuthModalOpen(true);
        return;
      }
    } else if (tab !== 'dashboard' && !isAdmin) {
      // Just-In-Time validation: Periksa apakah sesi guru saat ini masih valid.
      const session = getActiveTeacherSession();
      if (!session) {
        openTeacherAuthForTab(tab);
        return;
      }

      // Verifikasi realtime apakah sesi ini sudah dicabut atau diblokir admin.
      const verification = await verifyActiveTeacherSessionRealtime();
      if (!verification.isValid) {
        clearEraporSession();
        setActiveTeacher(null);
        setAuthNotification({
          message: verification.message || 'Sesi akses Anda telah dicabut oleh Administrator.',
          type: 'info',
        });
        setTimeout(() => setAuthNotification(null), 5000);
        openTeacherAuthForTab(tab);
        return;
      }
    }

    if (tab !== currentTab) {
      syncUrlWithTab(tab);
    }
    setCurrentTab(tab);
    if (tab !== 'admin') {
      setEditingDocId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openTeacherAuthForTab = (tab: NavTab) => {
    const tabNames: Record<string, string> = {
      administrasi: 'Arsip Administrasi Guru',
      soal: 'Bank Soal & Ujian',
      tracking_soal: 'Tracking Pengumpulan Soal',
      sertifikat: 'Arsip Sertifikat & Piagam',
      rapor: 'Arsip Rapor Siswa',
    };
    setPendingTabForTeacher(tab);
    setTeacherTargetName(tabNames[tab] || 'Folder Arsip Guru');
    setTeacherSuccessCallback(null);
    setIsTeacherModalOpen(true);
  };

  // Direct Teacher Auth Request Handler (for template links like Template Rapor, Folder Kosong, etc.)
  const handleRequestTeacherAuth = async (targetName: string, onSuccessCallback?: () => void) => {
    if (!isAdmin) {
      const session = getActiveTeacherSession();
      if (session) {
        const verification = await verifyActiveTeacherSessionRealtime();
        if (verification.isValid) {
          if (onSuccessCallback) onSuccessCallback();
          return;
        }
        setActiveTeacher(null);
        setAuthNotification({
          message: verification.message || 'Sesi akses Anda telah dicabut oleh Administrator.',
          type: 'info',
        });
        setTimeout(() => setAuthNotification(null), 5000);
      }
    }

    setPendingTabForTeacher(null);
    setTeacherTargetName(targetName);
    setTeacherSuccessCallback(() => onSuccessCallback || null);
    setIsTeacherModalOpen(true);
  };

  // Protected edit handler (when user clicks Edit on any document card in-place)
  const handleEditFromList = (doc: DocumentItem) => {
    if (!isAdmin) {
      setPendingDocToEdit(doc);
      setIsLoginModalOpen(true);
    } else {
      setDocToEditModal(doc);
      setIsEditDocModalOpen(true);
    }
  };

  // Admin Preview Teacher handler
  // Preview uses the selected teacher identity for academic-access resolution,
  // but deliberately does NOT write to the normal teacher/e-Rapor session storage.
  const handlePreviewTeacher = (teacher: TeacherUser) => {
    if (teacher.status !== 'active') {
      setAuthNotification({
        message: `${teacher.name} sedang diblokir dan tidak dapat dipreview.`,
        type: 'info',
      });
      setTimeout(() => setAuthNotification(null), 3500);
      return;
    }

    setPreviewTeacher(teacher);
    syncUrlWithTab('rapor_sts');
    setCurrentTab('rapor_sts');
    setAuthNotification({
      message: `Preview e-Rapor dibuka sebagai ${teacher.name}.`,
      type: 'success',
    });
    setTimeout(() => setAuthNotification(null), 3500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitPreviewTeacher = () => {
    setPreviewTeacher(null);
    setAuthNotification({
      message: 'Mode Preview Teacher ditutup. Anda kembali ke mode Admin.',
      type: 'info',
    });
    setTimeout(() => setAuthNotification(null), 3500);
  };

  // Teacher login success handler
  const handleTeacherLoginSuccess = (teacher: TeacherUser) => {
    setActiveTeacher(teacher);
    setIsTeacherModalOpen(false);
    if (pendingTabForTeacher) {
      syncUrlWithTab(pendingTabForTeacher);
      setCurrentTab(pendingTabForTeacher);
      setPendingTabForTeacher(null);
    }
    if (teacherSuccessCallback) {
      teacherSuccessCallback();
      setTeacherSuccessCallback(null);
    }
    setAuthNotification({
      message: `Selamat datang, ${teacher.name}! Akses berhasil dibuka.`,
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 4000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEraporAuthSuccess = () => {
    setIsEraporAuthModalOpen(false);
    syncUrlWithTab('rapor_sts');
    setCurrentTab('rapor_sts');
    setAuthNotification({
      message: 'Akses e-Rapor berhasil dibuka.',
      type: 'success',
    });
    setTimeout(() => setAuthNotification(null), 4000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Teacher logout handler
  const handleTeacherLogout = () => {
    setPreviewTeacher(null);
    logoutTeacher();
    clearEraporSession();
    setIsEraporAuthModalOpen(false);
    setActiveTeacher(null);
    syncUrlWithTab('dashboard');
    setCurrentTab('dashboard');
    setAuthNotification({
      message: 'Sesi guru berhasil ditutup.',
      type: 'info',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 4000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Login success handler
  const handleLoginSuccess = () => {
    setPreviewTeacher(null);
    setIsAdmin(true);
    setIsLoginModalOpen(false);
    if (pendingDocToEdit) {
      // Buka popup edit berkas langsung di halaman saat ini tanpa mengalihkan ke menu pengaturan
      setDocToEditModal(pendingDocToEdit);
      setIsEditDocModalOpen(true);
      setPendingDocToEdit(null);
      setAuthNotification({
        message: 'Login Admin berhasil. Membuka formulir edit berkas...',
        type: 'success',
      });
    } else {
      syncUrlWithTab('admin');
      setCurrentTab('admin');
      setAuthNotification({
        message: 'Login Admin berhasil. Selamat datang di Panel Pengaturan & Kelola Data.',
        type: 'success',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => {
      setAuthNotification(null);
    }, 4000);
  };

  // Logout handler
  const handleLogout = async () => {
    setPreviewTeacher(null);
    await logoutAdmin();
    clearEraporSession();
    setIsEraporAuthModalOpen(false);
    setIsAdmin(false);
    setEditingDocId(null);
    setPendingDocToEdit(null);
    syncUrlWithTab('dashboard');
    setCurrentTab('dashboard');
    setAuthNotification({
      message: 'Berhasil keluar dari mode Admin. Menu pengaturan telah dikunci untuk publik.',
      type: 'info',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 4000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Document Handlers (only executed via AdminView)
  const handleAddDocument = async (doc: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addDocument(doc);
  };

  const handleUpdateDocument = async (
    id: string,
    updates: Partial<Omit<DocumentItem, 'id' | 'createdAt'>>
  ) => {
    await updateDocument(id, updates);
  };

  const handleSaveDocModal = async (
    id: string,
    updates: Partial<Omit<DocumentItem, 'id' | 'createdAt'>>
  ) => {
    await handleUpdateDocument(id, updates);
    setAuthNotification({
      message: `Berkas "${updates.title || 'Dokumen'}" berhasil diperbarui.`,
      type: 'success',
    });
    setTimeout(() => setAuthNotification(null), 3500);
  };

  const handleDeleteDocModal = async (id: string) => {
    await handleDeleteDocument(id);
    setAuthNotification({
      message: 'Berkas berhasil dihapus dari arsip.',
      type: 'info',
    });
    setTimeout(() => setAuthNotification(null), 3500);
  };

  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id);
    if (editingDocId === id) setEditingDocId(null);
  };

  const handleDeleteMultipleDocuments = async (ids: string[]) => {
    await deleteMultipleDocuments(ids);
    if (editingDocId && ids.includes(editingDocId)) setEditingDocId(null);
  };

  const handleClearAllDocuments = async () => {
    await clearAllDocuments();
    setEditingDocId(null);
  };

  const handleResetDefaults = async () => {
    await resetToDefaultDocuments();
    setEditingDocId(null);
  };

  const handleUpdateTemplate = async (
    templateId: string,
    updates: Partial<SchoolTemplateItem>
  ) => {
    const updated = await updateStoredTemplate(templateId, updates);
    setTemplates(updated);
    setAuthNotification({
      message: 'Tautan template / folder berhasil diperbarui dan disinkronkan ke Cloud.',
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 4000);
  };

  // Exam Tracking Handlers
  const handleToggleTrackingCollected = async (id: string, isCollected: boolean) => {
    await toggleExamTrackingCollected(id, isCollected);
    setAuthNotification({
      message: isCollected
        ? 'Naskah soal ditandai: Sudah Dikumpulkan.'
        : 'Status naskah soal diubah: Belum Dikumpulkan.',
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 3000);
  };

  const handleToggleTrackingPrinted = async (id: string, isPrinted: boolean) => {
    await toggleExamTrackingPrinted(id, isPrinted);
    setAuthNotification({
      message: isPrinted
        ? 'Naskah soal ditandai: Sudah Selesai Diprint.'
        : 'Status naskah soal diubah: Belum Diprint.',
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 3000);
  };

  const handleAddExamTracking = async (
    data: Omit<ExamTrackingItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    await addExamTracking(data);
    setAuthNotification({
      message: `Monitoring naskah soal ${data.subject} (${data.classLevel}) berhasil ditambahkan.`,
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 3500);
  };

  const handleUpdateExamTracking = async (
    id: string,
    updates: Partial<ExamTrackingItem>
  ) => {
    await updateExamTracking(id, updates);
    setAuthNotification({
      message: 'Data monitoring naskah soal berhasil diperbarui.',
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 3500);
  };

  const handleDeleteExamTracking = async (id: string) => {
    await deleteExamTracking(id);
    setAuthNotification({
      message: 'Data monitoring naskah soal berhasil dihapus.',
      type: 'info',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 3500);
  };

  const handleResetExamTrackings = async () => {
    const res = await resetToDefaultExamTrackings();
    setExamTrackings(res);
    setAuthNotification({
      message: 'Daftar monitoring soal berhasil direset ke standar SDIT AL FIKRI.',
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 3500);
  };

  // Exam Upload Handlers
  const handleUpdateExamConfig = async (updates: Partial<ExamUploadConfig>) => {
    const updated = await updateStoredExamConfig(updates);
    setExamConfig(updated);
    setAuthNotification({
      message: 'Pengaturan folder upload soal ujian berhasil diperbarui.',
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 4000);
  };

  const handleSubmitExam = async (
    submission: Omit<ExamSubmissionItem, 'id' | 'submittedAt' | 'status'>
  ) => {
    const created = await addExamSubmission(submission);
    setAuthNotification({
      message: `Terima kasih! Naskah soal ${created.subject} (${created.classLevel}) berhasil disetorkan.`,
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 4000);
  };

  const handleUpdateExamSubmission = async (
    id: string,
    updates: Partial<ExamSubmissionItem>
  ) => {
    await updateExamSubmission(id, updates);
    setAuthNotification({
      message: 'Status setoran naskah soal berhasil diperbarui.',
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 4000);
  };

  const handleDeleteExamSubmission = async (id: string) => {
    await deleteExamSubmission(id);
    setAuthNotification({
      message: 'Data setoran soal berhasil dihapus.',
      type: 'info',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 4000);
  };

  const handleArchiveExamSubmission = async (
    submission: ExamSubmissionItem
  ): Promise<DocumentItem> => {
    const createdDoc = await archiveExamSubmissionToBankSoal(submission);
    setAuthNotification({
      message: `Soal ${submission.subject} (${submission.classLevel}) berhasil diarsipkan ke Bank Soal resmi.`,
      type: 'success',
    });
    setTimeout(() => {
      setAuthNotification(null);
    }, 4000);
    return createdDoc;
  };

  return (
    <div className="min-h-screen bg-[#12141D] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-amber-500/30 selection:text-amber-300">
      {/* Sidebar for Desktop & Mobile Bottom Nav */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        onRequestLogin={() => setIsLoginModalOpen(true)}
        activeTeacher={activeTeacher}
        onLogoutTeacher={handleTeacherLogout}
        pendingSubmissionsCount={pendingSubmissionsCount}
        studentCount={students.length}
        branding={branding}
        onOpenQris={() => setIsAppQrisModalOpen(true)}
        documentCounts={documentCounts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header */}
        <Header
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onRequestLogin={() => setIsLoginModalOpen(true)}
          activeTeacher={activeTeacher}
          onLogoutTeacher={handleTeacherLogout}
          branding={branding}
          onOpenQris={() => setIsAppQrisModalOpen(true)}
        />

        {/* Global Notification Banner */}
        {authNotification && (
          <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 max-w-sm p-4 bg-[#181B26] border border-amber-400/40 text-slate-100 rounded-2xl shadow-2xl flex items-start gap-3 animate-slide-in">
            <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0 animate-pulse"></span>
            <div className="flex-1">
              <p className="text-xs font-semibold leading-relaxed">
                {authNotification.message}
              </p>
            </div>
            <button
              onClick={() => setAuthNotification(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ADMIN PREVIEW TEACHER BANNER */}
        {isAdmin && previewTeacher && (
          <div className="sticky top-0 z-40 px-3 sm:px-5 pt-3">
            <div className="max-w-7xl mx-auto rounded-2xl border border-violet-400/25 bg-[#171827]/95 backdrop-blur-xl shadow-xl shadow-violet-950/10">
              <div className="px-3.5 py-3 sm:px-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-400/25 text-violet-300 flex items-center justify-center shrink-0">
                  👁
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">Admin Preview</span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="text-xs font-bold text-white truncate">{previewTeacher.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    Melihat e-Rapor menggunakan akses akademik guru ini · ID {previewTeacher.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExitPreviewTeacher}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-400/20 text-[10px] font-bold text-violet-200 transition-colors cursor-pointer"
                >
                  Keluar Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Views */}
        <main className="flex-1 pb-20 md:pb-8">
          {currentTab === 'dashboard' && (
            <DashboardView
              documents={documents}
              templates={templates}
              examConfig={examConfig}
              examSubmissions={examSubmissions}
              isAdmin={isAdmin}
              onRequestTeacherAuth={handleRequestTeacherAuth}
              onNavigate={handleSelectTab}
              onEditDocument={handleEditFromList}
              onUpdateTemplate={handleUpdateTemplate}
              onUpdateExamConfig={handleUpdateExamConfig}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onOpenRaporSts={() => handleSelectTab('rapor_sts')}
              branding={branding}
              onUpdateBranding={async (newBranding) => {
                setBranding(newBranding);
                await updateStoredBranding(newBranding);
              }}
            />
          )}

          {currentTab === 'rapor_sts' && (
            isAdmin && !previewTeacher ? (
              <EraporAdminDashboard
                onBack={() => handleSelectTab('dashboard')}
                onPreviewTeacher={handlePreviewTeacher}
                onNavigate={handleSelectTab}
                showNotification={(msg, type) => {
                  setAuthNotification({ message: msg, type: type || 'success' });
                  setTimeout(() => setAuthNotification(null), 3500);
                }}
              />
            ) : (
              <RaporWorkspace
                onBack={() => handleSelectTab('dashboard')}
                isAdmin={isAdmin}
                previewTeacher={previewTeacher}
                onLogoutTeacher={handleTeacherLogout}
              />
            )
          )}

          {currentTab === 'administrasi' && (
            <AdministrasiView
              documents={documents}
              onEditDocument={handleEditFromList}
            />
          )}

          {currentTab === 'soal' && (
            <SoalView
              documents={documents}
              onEditDocument={handleEditFromList}
              onNavigateToUpload={() => handleSelectTab('tracking_soal')}
              onNavigateToTracking={() => handleSelectTab('tracking_soal')}
            />
          )}

          {currentTab === 'tracking_soal' && (
            <TrackingSoalView
              isAdmin={isAdmin}
              schoolYears={DEFAULT_SCHOOL_YEAR_OPTIONS}
              onRequestLogin={() => setIsLoginModalOpen(true)}
            />
          )}

          {currentTab === 'sertifikat' && (
            <SertifikatView
              documents={documents}
              onEditDocument={handleEditFromList}
            />
          )}

          {currentTab === 'rapor' && (
            <RaporView
              documents={documents}
              onEditDocument={handleEditFromList}
            />
          )}

          {currentTab === 'student_db' && (
            isAdmin ? (
              <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
                <StudentDatabaseView
                  classes={[
                    { id: '1A', name: '1A' },
                    { id: '1B', name: '1B' },
                    { id: '2A', name: '2A' },
                    { id: '2B', name: '2B' },
                    { id: '2C', name: '2C' },
                    { id: '3A', name: '3A' },
                    { id: '3B', name: '3B' },
                    { id: '3C', name: '3C' },
                    { id: '4A', name: '4A' },
                    { id: '4B', name: '4B' },
                    { id: '5A', name: '5A' },
                    { id: '5B', name: '5B' },
                    { id: '6A', name: '6A' },
                    { id: '6B', name: '6B' },
                  ]}
                />
              </div>
            ) : (
              <div className="max-w-md mx-auto my-20 p-8 bg-[#181B26] border border-[#272D3E] rounded-3xl text-center shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-teal-400/15 border border-teal-400/30 text-teal-400 mx-auto flex items-center justify-center mb-4">
                  🔒
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Halaman Terkunci</h2>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Menu Data Siswa hanya dapat diakses oleh Administrator SDIT AL FIKRI.
                </p>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-6 py-3 bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold rounded-2xl shadow-lg transition-all cursor-pointer"
                >
                  Masuk sebagai Admin
                </button>
              </div>
            )
          )}

          {currentTab === 'academic_settings' && (
            isAdmin ? (
              <AcademicSettingsView
                showNotification={(msg, type) => {
                  setAuthNotification({ message: msg, type: type || 'success' });
                  setTimeout(() => setAuthNotification(null), 3500);
                }}
              />
            ) : (
              <div className="max-w-md mx-auto my-20 p-8 bg-[#181B26] border border-[#272D3E] rounded-3xl text-center shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 mx-auto flex items-center justify-center mb-4">
                  🔒
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Halaman Terkunci</h2>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Pengaturan Akademik hanya dapat diakses oleh Administrator SDIT AL FIKRI.
                </p>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold rounded-2xl shadow-lg transition-all cursor-pointer"
                >
                  Masuk sebagai Admin
                </button>
              </div>
            )
          )}

          {currentTab === 'admin' && (
            isAdmin ? (
              <AdminView
                documents={documents}
                templates={templates}
                examConfig={examConfig}
                examSubmissions={examSubmissions}
                onAddDocument={handleAddDocument}
                onUpdateDocument={handleUpdateDocument}
                onDeleteDocument={handleDeleteDocument}
                onDeleteMultipleDocuments={handleDeleteMultipleDocuments}
                onClearAllDocuments={handleClearAllDocuments}
                onResetDefaults={handleResetDefaults}
                onLogout={handleLogout}
                editingDocId={editingDocId}
                onClearEditing={() => setEditingDocId(null)}
                onUpdateTemplate={handleUpdateTemplate}
                onUpdateExamConfig={handleUpdateExamConfig}
                onUpdateExamSubmission={handleUpdateExamSubmission}
                onDeleteExamSubmission={handleDeleteExamSubmission}
                onArchiveExamSubmission={handleArchiveExamSubmission}
                branding={branding}
                onBrandingUpdated={(newBranding) => setBranding(newBranding)}
                onPreviewTeacher={handlePreviewTeacher}
                showNotification={(msg, type) => {
                  setAuthNotification({ message: msg, type: type || 'success' });
                  setTimeout(() => setAuthNotification(null), 3500);
                }}
              />
            ) : (
              <div className="max-w-md mx-auto my-20 p-8 bg-[#181B26] border border-[#272D3E] rounded-3xl text-center shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 mx-auto flex items-center justify-center mb-4">
                  🔒
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Halaman Terkunci</h2>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Menu Pengaturan & Kelola Data hanya dapat diakses oleh Administrator SDIT AL FIKRI.
                </p>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-2xl shadow-lg transition-all cursor-pointer"
                >
                  Masuk sebagai Admin
                </button>
              </div>
            )
          )}
        </main>
      </div>

      {/* Teacher Exam Upload Modal Form */}
      <UploadSoalModal
        isOpen={isUploadModalOpen}
        config={examConfig}
        availableYears={availableYears}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleSubmitExam}
      />

      {/* e-Rapor Authentication Modal */}
      <EraporAuthModal
        isOpen={isEraporAuthModalOpen}
        teacher={activeTeacher}
        onClose={() => setIsEraporAuthModalOpen(false)}
        onSuccess={handleEraporAuthSuccess}
      />

      {/* Teacher Authentication Modal (Whitelist by Name) */}
      <TeacherAuthModal
        isOpen={isTeacherModalOpen}
        onClose={() => {
          setIsTeacherModalOpen(false);
          setPendingTabForTeacher(null);
          setTeacherSuccessCallback(null);
        }}
        onSuccess={handleTeacherLoginSuccess}
        targetFeatureName={teacherTargetName}
      />

      {/* In-Place Quick Edit Document Modal for all views */}
      <EditDocumentModal
        isOpen={isEditDocModalOpen}
        document={docToEditModal}
        availableYears={availableYears}
        onClose={() => {
          setIsEditDocModalOpen(false);
          setDocToEditModal(null);
        }}
        onSave={handleSaveDocModal}
        onDelete={handleDeleteDocModal}
      />

      {/* Login Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setPendingDocToEdit(null);
        }}
        onSuccess={handleLoginSuccess}
      />

      {/* Global Mobile QRIS & Profile Modal */}
      <PersonalQrisModal
        isOpen={isAppQrisModalOpen}
        onClose={() => setIsAppQrisModalOpen(false)}
        branding={branding}
        onBrandingUpdated={async (newBranding) => {
          setBranding(newBranding);
          await updateStoredBranding(newBranding);
        }}
        isAdmin={isAdmin}
      />

      {/* Android Double-Back to Exit Floating Notification */}
      {showExitPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900/95 border border-[#2F374E] text-white text-xs font-semibold shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Tekan sekali lagi untuk keluar dari web</span>
        </div>
      )}
    </div>
  );
}
