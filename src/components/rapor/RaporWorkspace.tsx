import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Settings2,
  Cloud,
  Check,
  Save,
  BookOpen,
  FileSpreadsheet,
  Award,
  Printer,
  Sparkles,
  School,
  Calendar,
  Layers,
  HelpCircle,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Key,
  ChevronRight,
  ChevronDown,
  Users,
  GraduationCap,
  CircleDot,
  Search,
  Bell,
  Quote,
  LayoutGrid,
  List,
  Star,
  TrendingUp,
  BarChart2,
  FileText,
  Plus,
} from 'lucide-react';
import {
  RaporStsClassData,
  RaporStsConfig,
  RaporSubject,
  StudentSubjectRecord,
  StudentAdditionalInfo,
} from '../../types/raporSts';
import {
  getGradeLevel,
  loadRaporWorkspaceFromSupabase,
  saveRaporWorkspaceToSupabase,
} from '../../services/raporScoreStorageService';
import { getStoredStudentsLocal, subscribeToStudents, Student } from '../../services/studentStorage';
import { RaporTpSetup } from './RaporTpSetup';
import { RaporScoreGrid } from './RaporScoreGrid';
import { RaporPrintPreview } from './RaporPrintPreview';
import { RaporLegerTable } from './RaporLegerTable';
import { RaporSettingsModal } from './RaporSettingsModal';
import { getActiveTeacherSession, logoutTeacher } from '../../services/teacherStorage';
import { clearEraporSession } from '../../services/teacherEraporAuthService';
import {
  fetchRaporSubjectsFromSupabase,
  syncLearningObjectivesToSupabase,
} from '../../services/academicRaporSubjectService';
import type { TeacherUser } from '../../types';
import {
  getTeacherAcademicAccess,
  TeacherAcademicAccess,
  TeacherAcademicContext,
  getSubjectsForClass,
  isHomeroomTeacherForClass,
} from '../../services/teacherAcademicAccessService';
import { RaporNotificationPopover, type RaporNotificationItem } from './RaporNotificationPopover';
import { RaporTeacherProfilePopover } from './RaporTeacherProfilePopover';

interface RaporWorkspaceProps {
  onBack: () => void;
  isAdmin?: boolean;
  /**
   * Admin Preview Teacher. This is intentionally separate from the normal
   * teacher session and never writes to teacher/e-Rapor session storage.
   */
  previewTeacher?: TeacherUser | null;
  onLogoutTeacher?: () => void;
}

type WorkspaceTab = 'tp_setup' | 'scores' | 'print' | 'leger';

export const RaporWorkspace: React.FC<RaporWorkspaceProps> = ({
  onBack,
  isAdmin = false,
  previewTeacher = null,
  onLogoutTeacher,
}) => {
  // Resolve the teacher session once when this workspace mounts.
  // Calling getActiveTeacherSession() directly during every render returns a new
  // object reference, which can retrigger callbacks/effects and cause visible
  // flicker while the workspace is loading. The teacher identity is stable for
  // the lifetime of this workspace; App.tsx remounts the workspace when the
  // logged-in teacher changes.
  const activeTeacher = useMemo(
    () => previewTeacher ?? getActiveTeacherSession(),
    [previewTeacher?.id]
  );
  const activeTeacherId = activeTeacher?.id || null;

  const [academicAccess, setAcademicAccess] = useState<TeacherAcademicAccess | null>(null);
  const [isAccessLoading, setIsAccessLoading] = useState<boolean>(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<TeacherAcademicContext | null>(null);

  const selectedClass = selectedContext?.className || '';
  const selectedSemester: '1' | '2' =
    academicAccess?.academicPeriod?.semester === 'Genap' ? '2' : '1';
  const selectedSchoolYear = academicAccess?.academicPeriod?.schoolYear || '';
  const isAuthorized = !!selectedContext;

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tp_setup');
  const [allStudents, setAllStudents] = useState<Student[]>(() => getStoredStudentsLocal());
  const [classData, setClassData] = useState<RaporStsClassData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSavingCloud, setIsSavingCloud] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<'saved' | 'unsaved' | 'saving' | 'error' | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Landing UI State
  const [landingSearchQuery, setLandingSearchQuery] = useState<string>('');
  const [landingViewMode, setLandingViewMode] = useState<'card' | 'list'>('card');

  // Popover States for Bell & Teacher Profile
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Modals & Navigation guard
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'general'>('general');
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [pendingExitAction, setPendingExitAction] = useState<'back' | 'change_class' | null>(null);

  // Resolve academic access from the logged-in teacher assignment.
  useEffect(() => {
    let cancelled = false;

    const loadAcademicAccess = async () => {
      if (!activeTeacher?.id) {
        setAcademicAccess(null);
        setSelectedContext(null);
        setAccessError('Sesi guru aktif tidak ditemukan. Silakan login sebagai guru terlebih dahulu.');
        setIsAccessLoading(false);
        return;
      }

      setIsAccessLoading(true);
      setAccessError(null);

      try {
        const access = await getTeacherAcademicAccess(activeTeacher.id);
        if (cancelled) return;

        setAcademicAccess(access);

        if (!access.academicPeriod) {
          setSelectedContext(null);
          setAccessError('Belum ada periode akademik aktif. Silakan aktifkan periode akademik terlebih dahulu.');
          return;
        }

        if (access.contexts.length === 0) {
          setSelectedContext(null);
          setAccessError('Belum ada assignment akademik untuk guru ini pada periode aktif.');
          return;
        }

        setSelectedContext((current) => {
          if (current) {
            const stillValid = access.contexts.find(
              (context) =>
                context.classId === current.classId &&
                context.subjectId === current.subjectId
            );
            if (stillValid) return stillValid;
          }
          return null;
        });
      } catch (error) {
        console.error('Error loading teacher academic access:', error);
        if (!cancelled) {
          setAcademicAccess(null);
          setSelectedContext(null);
          setAccessError('Gagal memuat akses akademik guru. Silakan coba lagi.');
        }
      } finally {
        if (!cancelled) setIsAccessLoading(false);
      }
    };

    void loadAcademicAccess();

    return () => {
      cancelled = true;
    };
  }, [activeTeacherId]);

  // Filter student list to the selected assigned class.
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return allStudents.filter(
      (st) => (st.classId || '').trim().toUpperCase() === selectedClass.trim().toUpperCase()
    );
  }, [allStudents, selectedClass]);

  // Keep a ref to classStudents to prevent re-fetching Firestore when background student list changes
  const classStudentsRef = useRef(classStudents);
  useEffect(() => {
    classStudentsRef.current = classStudents;
  }, [classStudents]);

  // Subscribe to student storage
  useEffect(() => {
    const unsub = subscribeToStudents((list) => {
      setAllStudents(list);
    });
    return () => unsub();
  }, []);

  // Track currently loaded class and period to prevent reload on subject switches
  const loadedClassRef = useRef<{ classId: string; periodId: string } | null>(null);

  const targetClassId = selectedContext?.classId;
  const targetAcademicLevelId = selectedContext?.academicLevelId;
  const activePeriodId = academicAccess?.academicPeriod?.id;

  // Load Class Data ONLY from Supabase when authorized and class changes
  const loadCurrentClassData = useCallback(async () => {
    if (!isAuthorized || !activePeriodId || !targetClassId) return;

    setIsLoading(true);
    setCloudStatus(null);
    try {
      const academicLevelId =
        targetAcademicLevelId ||
        academicAccess?.classes.find((item) => item.id === targetClassId)?.academicLevelId ||
        `grade_${getGradeLevel(selectedClass)}`;

      const data = await loadRaporWorkspaceFromSupabase({
        academicPeriodId: activePeriodId,
        classId: targetClassId,
        className: selectedClass,
        semester: selectedSemester,
        schoolYear: selectedSchoolYear,
        academicLevelId,
        students: classStudentsRef.current,
        teacherName: activeTeacher?.name,
      });

      setClassData(data);
      loadedClassRef.current = { classId: targetClassId, periodId: activePeriodId };
      setCloudStatus('saved');
      setHasUnsavedChanges(false);
      setLastSavedTime(
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err) {
      console.error('Error loading class data from Supabase:', err);
      setCloudStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthorized,
    activePeriodId,
    targetClassId,
    targetAcademicLevelId,
    academicAccess?.classes,
    selectedClass,
    selectedSemester,
    selectedSchoolYear,
    activeTeacher?.name,
  ]);

  useEffect(() => {
    if (!isAuthorized || !targetClassId || !activePeriodId) {
      loadedClassRef.current = null;
      return;
    }

    const isSameClassAndPeriod =
      loadedClassRef.current &&
      loadedClassRef.current.classId === targetClassId &&
      loadedClassRef.current.periodId === activePeriodId &&
      classData !== null;

    if (!isSameClassAndPeriod) {
      loadCurrentClassData();
    }
  }, [loadCurrentClassData, isAuthorized, targetClassId, activePeriodId, classData]);

  // Save to Supabase
  const handleSaveToCloud = async () => {
    if (!classData || !selectedContext || !academicAccess?.academicPeriod) return;
    if (previewTeacher) {
      return;
    }

    setIsSavingCloud(true);
    setCloudStatus('saving');
    try {
      const res = await saveRaporWorkspaceToSupabase({
        academicPeriodId: academicAccess.academicPeriod.id,
        classId: selectedContext.classId,
        teacherId: activeTeacherId,
        classData,
      });

      if (res.success) {
        setCloudStatus('saved');
        setHasUnsavedChanges(false);
        setLastSavedTime(
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        );
      } else {
        setCloudStatus('error');
      }
    } catch (err) {
      console.error('Error saving class data to Supabase:', err);
      setCloudStatus('error');
    } finally {
      setIsSavingCloud(false);
    }
  };

  // Update TP dari workspace e-Rapor.
  // Mapel tidak dibuat/dihapus oleh guru; Mapel berasal dari master Supabase.
  // Yang dapat berubah di sini hanya TP pada Mapel yang sudah ditetapkan.
  const handleUpdateSubjects = async (updatedSubjects: RaporSubject[]) => {
    if (!classData || !selectedContext || !academicAccess?.academicPeriod) return;

    // Sanitize: pastikan tidak ada TP dengan deskripsi kosong yang dikirim ke sinkronisasi
    const cleanUpdatedSubjects = updatedSubjects.map((s) => ({
      ...s,
      tpList: (s.tpList || []).filter((tp) => Boolean(tp.desc && tp.desc.trim())),
    }));

    const previousSubjects = (classData.subjects || []).map((s) => ({
      ...s,
      tpList: (s.tpList || []).filter((tp) => Boolean(tp.desc && tp.desc.trim())),
    }));

    try {
      setCloudStatus('saving');

      await syncLearningObjectivesToSupabase(previousSubjects, cleanUpdatedSubjects);

      const academicLevelId =
        selectedContext.academicLevelId ||
        academicAccess.classes.find((item) => item.id === selectedContext.classId)?.academicLevelId ||
        `grade_${getGradeLevel(selectedClass)}`;

      const refreshedSubjects = await fetchRaporSubjectsFromSupabase(academicLevelId);

      // Reconcile subjectRecords with refreshedSubjects
      const nextRecords = { ...classData.subjectRecords };
      for (const subj of refreshedSubjects) {
        const existingRecord = nextRecords[subj.id];
        if (existingRecord) {
          const updatedScores = { ...existingRecord.scores };
          for (const [studentId, scoreDetail] of Object.entries(updatedScores)) {
            const nextTpScores = { ...scoreDetail.tpScores };
            const nextTpAchieved = { ...scoreDetail.tpAchieved };
            for (const tp of subj.tpList) {
              if (nextTpScores[tp.id] === undefined) {
                nextTpScores[tp.id] = null;
              }
              if (nextTpAchieved[tp.id] === undefined) {
                nextTpAchieved[tp.id] = false;
              }
            }
            updatedScores[studentId] = {
              ...scoreDetail,
              tpScores: nextTpScores,
              tpAchieved: nextTpAchieved,
            };
          }
          nextRecords[subj.id] = {
            ...existingRecord,
            scores: updatedScores,
          };
        } else {
          const emptyScores: Record<string, any> = {};
          for (const st of classStudentsRef.current) {
            const tpScores: Record<string, number | null> = {};
            const tpAchieved: Record<string, boolean> = {};
            for (const tp of subj.tpList) {
              tpScores[tp.id] = null;
              tpAchieved[tp.id] = false;
            }
            emptyScores[st.id] = {
              studentId: st.id,
              studentName: st.name,
              nisn: st.nisn || '',
              nis: st.nim || '',
              tpScores,
              tpAchieved,
              stsScore: null,
              finalScore: null,
              autoDescription: '',
              customDescription: '',
              teacherNote: '',
            };
          }
          nextRecords[subj.id] = {
            subjectId: subj.id,
            scores: emptyScores,
          };
        }
      }

      const updatedClassData: RaporStsClassData = {
        ...classData,
        subjects: refreshedSubjects,
        subjectRecords: nextRecords,
        lastModified: new Date().toISOString(),
      };

      setClassData(updatedClassData);
      setCloudStatus('saved');
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error saving learning objectives to Supabase:', err);
      setCloudStatus('unsaved');
      setHasUnsavedChanges(true);
      throw err;
    }
  };

  // Update a single subject record (from Score Grid)
  const handleUpdateSubjectRecord = (subjectId: string, record: StudentSubjectRecord) => {
    if (!classData) return;
    const updatedRecords = {
      ...classData.subjectRecords,
      [subjectId]: record,
    };
    const updated: RaporStsClassData = {
      ...classData,
      subjectRecords: updatedRecords,
      lastModified: new Date().toISOString(),
    };
    setClassData(updated);
    setHasUnsavedChanges(true);
    setCloudStatus('unsaved');
  };

  // Update Additional Info (Attendance, Ekstra, Notes)
  const handleUpdateAdditionalInfo = (updatedAdditional: Record<string, StudentAdditionalInfo>) => {
    if (!classData) return;
    const updated: RaporStsClassData = {
      ...classData,
      additionalInfo: updatedAdditional,
      lastModified: new Date().toISOString(),
    };
    setClassData(updated);
    setHasUnsavedChanges(true);
    setCloudStatus('unsaved');
  };

  // Update Config
  const handleUpdateConfig = (newConfig: Partial<RaporStsConfig>) => {
    if (!classData) return;

    const updated: RaporStsClassData = {
      ...classData,
      config: {
        ...classData.config,
        ...newConfig,
        classLevel: selectedClass,
        semester: selectedSemester,
        schoolYear: selectedSchoolYear,
        teacherName: activeTeacher?.name || newConfig.teacherName || classData.config.teacherName,
        teacherNip: newConfig.teacherNip || classData.config.teacherNip,
      },
      lastModified: new Date().toISOString(),
    };

    setClassData(updated);
    setCloudStatus('saved');
    setHasUnsavedChanges(false);
  };

  // Select an already-authorized class + subject context. No class PIN is used.
  const handleSelectContext = (context: TeacherAcademicContext) => {
    if (hasUnsavedChanges) {
      setPendingExitAction('change_class');
      setShowExitConfirmModal(true);
      return;
    }

    setSelectedContext(context);
    setActiveTab('tp_setup');
  };

  // Handle Back to Dashboard with Unsaved Check
  const handleRequestBack = () => {
    if (hasUnsavedChanges) {
      setPendingExitAction('back');
      setShowExitConfirmModal(true);
    } else {
      onBack();
    }
  };

  // Handle Request Change Class with Unsaved Check
  const handleRequestChangeClass = () => {
    if (hasUnsavedChanges) {
      setPendingExitAction('change_class');
      setShowExitConfirmModal(true);
    } else {
      setSelectedContext(null);
    }
  };

  // Confirm Save & Exit
  const handleConfirmSaveAndExit = async () => {
    if (classData) {
      await handleSaveToCloud();
    }
    setShowExitConfirmModal(false);
    if (pendingExitAction === 'back') {
      onBack();
    } else if (pendingExitAction === 'change_class') {
      setSelectedContext(null);
    }
    setPendingExitAction(null);
  };

  // Confirm Exit Without Saving to Cloud
  const handleConfirmExitWithoutSave = () => {
    setShowExitConfirmModal(false);
    setHasUnsavedChanges(false);
    if (pendingExitAction === 'back') {
      onBack();
    } else if (pendingExitAction === 'change_class') {
      setSelectedContext(null);
    }
    setPendingExitAction(null);
  };

  const classCards = useMemo(() => {
    if (!academicAccess) return [];

    return academicAccess.classes.map((academicClass) => {
      const contexts = getSubjectsForClass(academicAccess, academicClass.id);
      return {
        academicClass,
        contexts,
        isHomeroom: isHomeroomTeacherForClass(academicAccess, academicClass.id),
      };
    });
  }, [academicAccess]);

  const teacherName = academicAccess?.teacherName || activeTeacher?.name || 'Bapak/Ibu Guru';
  const teacherInitials = useMemo(() => {
    const parts = (teacherName || '').replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
    if (!parts.length || !parts[0]) return 'GR';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [teacherName]);

  const teacherRoleSubtitle = useMemo(() => {
    if (!academicAccess || !academicAccess.classes.length) return 'Guru Mata Pelajaran';
    const isAnyHomeroom = academicAccess.classes.some((c) =>
      isHomeroomTeacherForClass(academicAccess, c.id)
    );
    if (isAnyHomeroom) return 'Wali Kelas';
    return 'Guru Mapel';
  }, [academicAccess]);

  const totalTeacherSubjectsCount = useMemo(() => {
    return classCards.reduce((sum, card) => sum + card.contexts.length, 0);
  }, [classCards]);

  const totalAssignedStudentsCount = useMemo(() => {
    if (!classCards.length) return allStudents.length;
    const ids = new Set<string>();
    classCards.forEach(({ academicClass }) => {
      allStudents
        .filter((st) => (st.classId || '').trim().toUpperCase() === academicClass.id.trim().toUpperCase())
        .forEach((st) => ids.add(st.id));
    });
    return ids.size || allStudents.length;
  }, [classCards, allStudents]);

  const filteredClassCards = useMemo(() => {
    if (!landingSearchQuery.trim()) return classCards;
    const q = landingSearchQuery.toLowerCase().trim();
    return classCards.filter(
      (card) =>
        card.academicClass.name.toLowerCase().includes(q) ||
        (card.academicClass.grade && String(card.academicClass.grade).toLowerCase().includes(q)) ||
        card.contexts.some((ctx) => ctx.subjectName.toLowerCase().includes(q))
    );
  }, [classCards, landingSearchQuery]);

  const selectedClassContexts = useMemo(() => {
    if (!academicAccess || !selectedContext) return [];
    return getSubjectsForClass(academicAccess, selectedContext.classId);
  }, [academicAccess, selectedContext]);

  const selectedIsHomeroom = useMemo(() => {
    if (!academicAccess || !selectedContext) return false;
    return isHomeroomTeacherForClass(academicAccess, selectedContext.classId);
  }, [academicAccess, selectedContext]);

  const renderCloudStatus = () => {
    if (cloudStatus === 'saving') {
      return <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Menyimpan</span></>;
    }
    if (cloudStatus === 'error') {
      return <><AlertCircle className="w-3.5 h-3.5" /><span>Gagal sinkron</span></>;
    }
    if (hasUnsavedChanges) {
      return <><CircleDot className="w-3.5 h-3.5 fill-current" /><span>Belum disimpan</span></>;
    }
    return <><CheckCircle2 className="w-3.5 h-3.5" /><span>Tersimpan{lastSavedTime ? ` • ${lastSavedTime}` : ''}</span></>;
  };

  const getScoredSubjectStats = useCallback(
    (className: string, contexts: TeacherAcademicContext[]) => {
      const total = contexts.length;
      if (!classData || classData.config.classLevel !== className || !classData.subjectRecords || total === 0) {
        return { scoredCount: 0, total, percentage: 0 };
      }

      let count = 0;
      for (const ctx of contexts) {
        const record = classData.subjectRecords[ctx.subjectId];
        if (record && record.scores) {
          const hasAnyScore = Object.values(record.scores).some(
            (s) =>
              (s.finalScore !== null && s.finalScore !== undefined) ||
              (s.stsScore !== null && s.stsScore !== undefined) ||
              Object.values(s.tpScores || {}).some((v) => v !== null && v !== undefined)
          );
          if (hasAnyScore) {
            count++;
          }
        }
      }

      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return { scoredCount: count, total, percentage };
    },
    [classData]
  );

  // Period text for Profile popover
  const academicPeriodText = useMemo(() => {
    if (!academicAccess?.academicPeriod) return undefined;
    return `T.A. ${academicAccess.academicPeriod.schoolYear} • Semester ${academicAccess.academicPeriod.semester}`;
  }, [academicAccess?.academicPeriod]);

  // Actual stats for Teacher Profile popover
  const teacherStats = useMemo(() => {
    const totalClasses = classCards.length;
    const uniqueSubjectIds = new Set(
      (academicAccess?.contexts || []).map((c) => c.subjectId)
    );
    const totalSubjects = uniqueSubjectIds.size;
    const totalStudents = allStudents.filter((st) =>
      classCards.some(
        (c) =>
          c.academicClass.id.trim().toUpperCase() ===
          (st.classId || '').trim().toUpperCase()
      )
    ).length;

    return {
      totalClasses,
      totalSubjects,
      totalStudents,
    };
  }, [classCards, academicAccess?.contexts, allStudents]);

  // Derived real notifications from actual workspace data
  const derivedNotifications = useMemo<RaporNotificationItem[]>(() => {
    const list: RaporNotificationItem[] = [];

    // 1. Unsaved changes warning
    if (hasUnsavedChanges && selectedClass) {
      list.push({
        id: 'unsaved-changes',
        type: 'alert',
        title: 'Perubahan Belum Disimpan',
        subtitle: `Kelas ${selectedClass}`,
        description: 'Terdapat catatan nilai atau capaian yang belum disimpan ke Cloud.',
        timestamp: 'Saat ini',
      });
    }

    // 2. Incomplete subjects / scores across teacher's classes
    classCards.forEach(({ academicClass, contexts }) => {
      const stats = getScoredSubjectStats(academicClass.name, contexts);
      if (stats.total > 0 && stats.scoredCount < stats.total) {
        list.push({
          id: `incomplete-${academicClass.id}`,
          type: 'warning',
          title: 'Nilai Belum Lengkap',
          subtitle: `Kelas ${academicClass.name}`,
          description: `${stats.total - stats.scoredCount} dari ${stats.total} mapel belum selesai dinilai.`,
          classId: academicClass.id,
        });
      }
    });

    // 3. Incomplete TP description warning for currently opened class
    if (classData && classData.subjects) {
      const emptyTpSubjects = classData.subjects.filter((subj) => {
        const activeTps = (subj.tpList || []).filter((t) => t.isActive);
        return activeTps.length === 0 || activeTps.every((t) => !t.desc || !t.desc.trim());
      });

      if (emptyTpSubjects.length > 0) {
        list.push({
          id: 'incomplete-tps',
          type: 'info',
          title: 'Tujuan Pembelajaran Belum Lengkap',
          subtitle: `Kelas ${selectedClass}`,
          description: `${emptyTpSubjects.length} mata pelajaran belum memiliki butir TP terdefinisi.`,
        });
      }
    }

    // 4. Cloud sync status notification
    if (cloudStatus === 'saved' || lastSavedTime) {
      list.push({
        id: 'cloud-synced',
        type: 'success',
        title: 'Sinkronisasi Cloud Berhasil',
        subtitle: 'Penyimpanan Aman',
        description: lastSavedTime
          ? `Data penilaian terakhir berhasil disimpan pada ${lastSavedTime}.`
          : 'Data tersinkron otomatis dengan Supabase.',
      });
    }

    return list;
  }, [hasUnsavedChanges, selectedClass, classCards, getScoredSubjectStats, classData, cloudStatus, lastSavedTime]);

  const pendingNotificationCount = useMemo(() => {
    return derivedNotifications.filter((n) => n.type !== 'success').length;
  }, [derivedNotifications]);

  const handleSelectNotification = (item: RaporNotificationItem) => {
    setIsNotificationOpen(false);
    if (item.classId) {
      const foundCard = classCards.find((c) => c.academicClass.id === item.classId);
      if (foundCard && foundCard.contexts[0]) {
        handleSelectContext(foundCard.contexts[0]);
      }
    }
  };

  const handleTeacherLogoutAction = () => {
    setIsProfileOpen(false);
    if (onLogoutTeacher) {
      onLogoutTeacher();
    } else {
      clearEraporSession();
      logoutTeacher();
      onBack();
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-2rem)] text-slate-100 font-sans selection:bg-emerald-400/30 selection:text-emerald-100">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-[8%] h-[30rem] w-[30rem] rounded-full bg-emerald-500/[0.04] blur-[120px]" />
        <div className="absolute top-[35%] right-[4%] h-[26rem] w-[26rem] rounded-full bg-cyan-500/[0.03] blur-[130px]" />
        <div className="absolute -bottom-24 left-[42%] h-[24rem] w-[24rem] rounded-full bg-amber-500/[0.02] blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-[1680px] px-2.5 sm:px-4 lg:px-5 xl:px-6 py-2.5 sm:py-3 pb-20 md:pb-6">
        {/* ============================================================
            GLOBAL HEADER (Dark Executive Academic Top Bar)
        ============================================================ */}
        <header className="sticky top-0 z-40 mb-4 rounded-2xl border border-white/[0.09] bg-[#070F1E]/95 backdrop-blur-xl shadow-lg shadow-black/20">
          <div className="h-16 px-3 sm:px-4 flex items-center justify-between gap-3">
            {/* Left: Back & Academic Period Indicators */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleRequestBack}
                className="group shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.08] hover:border-white/[0.16] text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-slate-900/70">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <span className="text-slate-400">Tahun Pelajaran </span>
                    <span className="font-semibold text-white">{academicAccess?.academicPeriod?.schoolYear || '2026/2027'}</span>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-slate-900/70">
                  <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <span className="text-slate-400">Semester </span>
                    <span className="font-semibold text-emerald-400">{academicAccess?.academicPeriod?.semester || 'Ganjil'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Global Search */}
            <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={landingSearchQuery}
                  onChange={(e) => setLandingSearchQuery(e.target.value)}
                  placeholder="Cari fitur, kelas, atau bantuan..."
                  className="w-full h-9 pl-9 pr-14 rounded-xl border border-white/[0.08] bg-slate-900/70 text-xs font-normal text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-white/[0.10] bg-white/[0.04] text-[9px] font-medium text-slate-400 tracking-wider">
                  Ctrl K
                </div>
              </div>
            </div>

            {/* Right: Cloud Status, Notifications & Profile Chip */}
            <div className="flex items-center gap-2 shrink-0">
              {isAuthorized && (
                <div
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[10px] sm:text-[11px] font-medium transition-all ${
                    cloudStatus === 'error'
                      ? 'border-rose-400/25 bg-rose-500/[0.10] text-rose-300'
                      : hasUnsavedChanges
                      ? 'border-amber-400/25 bg-amber-400/[0.10] text-amber-200'
                      : 'border-emerald-400/25 bg-emerald-500/[0.09] text-emerald-300'
                  }`}
                >
                  {renderCloudStatus()}
                </div>
              )}

              {isAuthorized && (
                <button
                  type="button"
                  onClick={handleRequestChangeClass}
                  className="h-9 px-2.5 sm:px-3 rounded-xl border border-white/[0.09] bg-white/[0.035] hover:bg-white/[0.08] hover:border-white/[0.16] text-slate-200 text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Ganti atau lihat daftar kelas"
                >
                  <School className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Kelas Saya</span>
                </button>
              )}

              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationOpen((prev) => !prev);
                    setIsProfileOpen(false);
                  }}
                  className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                    isNotificationOpen
                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.08] text-slate-300 hover:text-white'
                  }`}
                  title="Notifikasi"
                >
                  <Bell className="w-4 h-4" />
                  {pendingNotificationCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center border-2 border-slate-950 shadow-sm">
                      {pendingNotificationCount}
                    </span>
                  )}
                </button>

                <RaporNotificationPopover
                  isOpen={isNotificationOpen}
                  onClose={() => setIsNotificationOpen(false)}
                  notifications={derivedNotifications}
                  onSelectNotification={handleSelectNotification}
                />
              </div>

              {/* Teacher Profile Chip */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen((prev) => !prev);
                    setIsNotificationOpen(false);
                  }}
                  className={`flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl border transition-all cursor-pointer active:scale-95 text-left ${
                    isProfileOpen
                      ? 'border-emerald-400/40 bg-slate-900 shadow-md shadow-emerald-500/10'
                      : 'border-white/[0.08] bg-slate-900/70 hover:bg-slate-900 hover:border-white/[0.14]'
                  }`}
                  title="Profil Guru & Ringkasan Akademik"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                    {teacherInitials}
                  </div>
                  <div className="hidden sm:block text-left min-w-0 max-w-[140px]">
                    <p className="text-xs font-semibold text-white truncate">{teacherName}</p>
                    <p className="text-[10px] text-slate-400 font-normal truncate">{teacherRoleSubtitle}</p>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block transition-transform duration-200 ${
                      isProfileOpen ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>

                <RaporTeacherProfilePopover
                  isOpen={isProfileOpen}
                  onClose={() => setIsProfileOpen(false)}
                  teacherName={teacherName}
                  teacherInitials={teacherInitials}
                  teacherRoleSubtitle={teacherRoleSubtitle}
                  academicPeriodName={academicPeriodText}
                  stats={teacherStats}
                  onLogout={handleTeacherLogoutAction}
                />
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { setSettingsTab('general'); setIsSettingsModalOpen(true); }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/[0.09] bg-white/[0.035] hover:bg-white/[0.08] hover:border-white/[0.16] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Pengaturan Rapor"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              )}

              {isAuthorized && (
                <button
                  type="button"
                  onClick={handleSaveToCloud}
                  disabled={isSavingCloud || !classData}
                  className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl border text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                    hasUnsavedChanges
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/15 hover:bg-amber-300'
                      : 'bg-white/[0.055] text-slate-200 border-white/[0.10] hover:bg-white/[0.09] hover:border-white/[0.18]'
                  }`}
                >
                  {isSavingCloud ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{hasUnsavedChanges ? 'Simpan' : 'Sinkron'}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {isAccessLoading ? (
          <div className="min-h-[55vh] flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-slate-950/55 backdrop-blur-xl px-6 py-12 text-center shadow-2xl">
              <div className="w-10 h-10 border-[3px] border-emerald-400/25 border-t-emerald-400 rounded-full animate-spin mx-auto" />
              <p className="mt-5 text-sm font-bold text-slate-200">Menyiapkan Ruang Kerja Akademik...</p>
              <p className="mt-1 text-xs text-slate-400">Membaca periode aktif dan penugasan guru.</p>
            </div>
          </div>
        ) : !selectedContext ? (
          /* ============================================================
             CLASS SELECTION / LANDING (Visual Exact Redesign)
          ============================================================ */
          <main className="space-y-4 sm:space-y-5">
            {accessError && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] px-4 py-3 text-xs sm:text-sm text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{accessError}</span>
              </div>
            )}

            {/* 1. HERO BANNER (Compact & Executive) */}
            {academicAccess && (
              <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#071322] via-[#091b2c] to-[#0b2438] shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_35%,rgba(16,185,129,0.10),transparent_40%),radial-gradient(circle_at_15%_80%,rgba(14,165,233,0.06),transparent_35%)] pointer-events-none" />

                <div className="relative p-4 sm:p-5 lg:px-6 lg:py-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Side: Greeting & Inline Quote */}
                  <div className="min-w-0 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                        <Sparkles className="h-2.5 w-2.5" />
                        Ruang Kerja Rapor
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">•</span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline font-normal">Kurikulum Merdeka</span>
                    </div>

                    <h2 className="mt-1.5 text-xl sm:text-2xl lg:text-[25px] font-bold leading-tight tracking-tight text-white">
                      Halo, {teacherName} <span className="inline-block">👋</span>
                    </h2>

                    {/* Inline Compact Inspiration Quote */}
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-slate-950/50 px-3 py-1.5 backdrop-blur-xs">
                      <Quote className="h-3 w-3 text-emerald-400 shrink-0" />
                      <p className="text-xs italic text-slate-300 truncate font-normal">
                        “Setiap anak memiliki potensi, tugas kita adalah membantu mereka menemukannya.”
                      </p>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 shrink-0 hidden md:inline">
                        — Ki Hajar Dewantara
                      </span>
                    </div>
                  </div>

                  {/* Right Side: 3 Compact Feature Pills */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                        <BarChart2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="leading-tight text-left">
                        <p className="text-xs font-semibold text-white">Kelola Nilai</p>
                        <p className="text-[10px] text-slate-400 font-normal">Lebih terstruktur</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      <div className="leading-tight text-left">
                        <p className="text-xs font-semibold text-white">Pantau Siswa</p>
                        <p className="text-[10px] text-slate-400 font-normal">Capaian belajar</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="leading-tight text-left">
                        <p className="text-xs font-semibold text-white">Rapor Siap</p>
                        <p className="text-[10px] text-slate-400 font-normal">Cetak & ekspor</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 3. SECTION "KELAS SAYA" */}
            {academicAccess && classCards.length > 0 && (
              <section className="space-y-3">
                {/* Section Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                      <Layers className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">Kelas Saya</h2>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          {classCards.length} Kelas
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-normal">Pilih kelas binaan atau penugasan mapel Anda.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Class Search input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={landingSearchQuery}
                        onChange={(e) => setLandingSearchQuery(e.target.value)}
                        placeholder="Cari kelas..."
                        className="h-8 pl-8 pr-3 rounded-lg border border-white/[0.08] bg-slate-900/80 text-xs font-normal text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400/40 w-36 sm:w-44"
                      />
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center rounded-lg border border-white/[0.08] bg-slate-900/80 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setLandingViewMode('card')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          landingViewMode === 'card'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs font-semibold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Tampilan Kartu"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Kartu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLandingViewMode('list')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          landingViewMode === 'list'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs font-semibold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Tampilan Daftar"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Daftar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid of Class Cards */}
                {landingViewMode === 'card' ? (
                  <div
                    className={
                      filteredClassCards.length === 1
                        ? 'grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch'
                        : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 items-stretch'
                    }
                  >
                    {filteredClassCards.map(({ academicClass, contexts, isHomeroom }) => {
                      const studentCount = allStudents.filter(
                        (student) => (student.classId || '').trim().toUpperCase() === academicClass.id.trim().toUpperCase()
                      ).length;

                      const { scoredCount, total: totalContextMapel, percentage: scoredPercentage } = getScoredSubjectStats(
                        academicClass.name,
                        contexts
                      );

                      const isAllScored = totalContextMapel > 0 && scoredCount === totalContextMapel;
                      const isPartiallyScored = scoredCount > 0 && scoredCount < totalContextMapel;

                      // Proportional Circular Gauge calculation (Size: 48px)
                      const gaugeSize = 48;
                      const strokeWidth = 4;
                      const radius = (gaugeSize - strokeWidth) / 2;
                      const circumference = 2 * Math.PI * radius;
                      const strokeOffset = circumference - (scoredPercentage / 100) * circumference;

                      const isSingleCard = filteredClassCards.length === 1;

                      return (
                        <article
                          key={academicClass.id}
                          className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#07111E] p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/35 flex flex-col justify-between gap-3.5"
                        >
                          {/* SISI ATAS: ICON BUKU + IDENTITAS KELAS + METADATA */}
                          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                            {/* C1. Icon Utama Kiri: BookOpen akademis rounded-2xl subtle emerald */}
                            <div className="w-12 h-12 sm:w-13 sm:h-13 shrink-0 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] flex items-center justify-center text-emerald-400 shadow-inner">
                              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                            </div>

                            {/* C2. Identitas Kelas & Metadata */}
                            <div className="min-w-0 flex-1">
                              {/* Badges di atas nama: WALI KELAS / GURU MAPEL + ROMBEL */}
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                    isHomeroom
                                      ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                                      : 'border-sky-500/30 bg-sky-950/40 text-sky-300'
                                  }`}
                                >
                                  {isHomeroom ? 'Wali Kelas' : 'Guru Mapel'}
                                </span>

                                <span className="rounded-full border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                                  Rombel
                                </span>
                              </div>

                              {/* Nama Kelas (Hanya tampil sekali) */}
                              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate leading-tight">
                                Kelas {academicClass.name}
                              </h3>

                              {/* Metadata Satu Baris: Compact & whitespace-nowrap agar selalu pas satu baris */}
                              <div className="mt-1 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400 font-medium whitespace-nowrap overflow-hidden">
                                <div className="flex items-center gap-1 shrink-0">
                                  <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>Tingkat {academicClass.grade ?? '-'}</span>
                                </div>
                                <span className="text-slate-600 text-[9px]">•</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{totalContextMapel} Mapel</span>
                                </div>
                                <span className="text-slate-600 text-[9px]">•</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{studentCount} Siswa</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* SISI BAWAH / AKSI: MINI PROGRESS CONTAINER + TOMBOL BUKA KELAS */}
                          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-white/[0.05]">
                            {/* C3. Area Progress */}
                            <div className="flex items-center gap-2.5 sm:gap-3 bg-[#0A1626]/90 rounded-2xl border border-white/[0.08] px-3 py-2 shadow-sm min-w-0">
                              <div className="relative flex items-center justify-center shrink-0" style={{ width: gaugeSize, height: gaugeSize }}>
                                <svg width={gaugeSize} height={gaugeSize} className="transform -rotate-90">
                                  <circle
                                    cx={gaugeSize / 2}
                                    cy={gaugeSize / 2}
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                    className="text-slate-800"
                                  />
                                  <circle
                                    cx={gaugeSize / 2}
                                    cy={gaugeSize / 2}
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeOffset}
                                    strokeLinecap="round"
                                    className={
                                      isAllScored
                                        ? 'text-emerald-400'
                                        : scoredPercentage > 0
                                        ? 'text-amber-400'
                                        : 'text-emerald-500/25'
                                    }
                                  />
                                </svg>
                                <span className="absolute text-[11px] font-bold text-white">{scoredPercentage}%</span>
                              </div>

                              <div className="text-left leading-tight pr-1 min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-white truncate">{scoredCount} / {totalContextMapel} Mapel</p>
                                <p className={`mt-0.5 text-[10px] sm:text-[11px] font-medium truncate ${
                                  isAllScored ? 'text-emerald-400' : scoredPercentage > 0 ? 'text-amber-400' : 'text-slate-400'
                                }`}>
                                  {isAllScored ? 'Selesai' : scoredPercentage > 0 ? 'Sedang dikerjakan' : 'Belum diisi'}
                                </p>
                              </div>
                            </div>

                            {/* C4. Tombol Buka Kelas: Sky-Blue dinamis untuk aksi buka, berganti Hijau Emerald jika nilai sudah terisi 100% */}
                            <button
                              type="button"
                              onClick={() => contexts[0] && handleSelectContext(contexts[0])}
                              disabled={!contexts[0]}
                              className={`inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-2xl font-bold px-3.5 sm:px-4.5 text-xs sm:text-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shrink-0 ${
                                isAllScored
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_4px_18px_rgba(16,185,129,0.30)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.45)]'
                                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-[0_4px_18px_rgba(2,132,199,0.25)] hover:shadow-[0_6px_22px_rgba(2,132,199,0.40)]'
                              }`}
                            >
                              {isAllScored ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                              ) : (
                                <BookOpen className="w-4 h-4 shrink-0" />
                              )}
                              <span>Buka Kelas</span>
                              <ChevronRight className="w-4 h-4 shrink-0" />
                            </button>
                          </div>
                        </article>
                      );
                    })}

                    {/* Placeholder Slot for Other Classes */}
                    {filteredClassCards.length === 1 && (
                      <aside className="h-full min-h-[110px] flex items-center rounded-2xl sm:rounded-3xl border border-dashed border-white/[0.10] bg-[#07111E]/40 p-5 text-left">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-slate-400 shrink-0">
                            <Plus className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-semibold text-slate-200">Belum ada kelas lainnya</h3>
                            <p className="text-[11px] sm:text-xs leading-relaxed text-slate-400 font-normal mt-0.5">
                              Kelas lain akan muncul otomatis jika terdapat penugasan tambahan dari administrator.
                            </p>
                          </div>
                        </div>
                      </aside>
                    )}
                  </div>
                ) : (
                  /* List View Mode */
                  <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A1220]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-white/[0.07] bg-white/[0.02] text-slate-300 uppercase tracking-normal text-[11px] font-semibold">
                          <tr>
                            <th className="py-3 px-4">Kelas / Rombel</th>
                            <th className="py-3 px-4">Peran</th>
                            <th className="py-3 px-4">Tingkat</th>
                            <th className="py-3 px-4">Peserta Didik</th>
                            <th className="py-3 px-4">Mata Pelajaran</th>
                            <th className="py-3 px-4">Progres Pengisian</th>
                            <th className="py-3 px-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                          {filteredClassCards.map(({ academicClass, contexts, isHomeroom }) => {
                            const studentCount = allStudents.filter(
                              (student) => (student.classId || '').trim().toUpperCase() === academicClass.id.trim().toUpperCase()
                            ).length;

                            const { scoredCount, total: totalContextMapel, percentage: scoredPercentage } = getScoredSubjectStats(
                              academicClass.name,
                              contexts
                            );

                            return (
                              <tr key={academicClass.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 px-4 font-semibold text-white text-[13px]">Kelas {academicClass.name}</td>
                                <td className="py-3 px-4">
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                    isHomeroom ? 'border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-300' : 'border-sky-400/25 bg-sky-500/[0.10] text-sky-300'
                                  }`}>
                                    {isHomeroom ? 'Wali Kelas' : 'Guru Mapel'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-300 font-normal">Tingkat {academicClass.grade ?? '-'}</td>
                                <td className="py-3 px-4 text-slate-300 font-normal">{studentCount} Siswa</td>
                                <td className="py-3 px-4 text-slate-300 font-normal">{totalContextMapel} Mapel</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${scoredPercentage}%` }} />
                                    </div>
                                    <span className="font-semibold text-white text-[11px]">{scoredPercentage}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => contexts[0] && handleSelectContext(contexts[0])}
                                    disabled={!contexts[0]}
                                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    <span>Buka</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Empty State when no classes assigned */}
            {academicAccess && classCards.length === 0 && !accessError && (
              <section className="rounded-2xl border border-dashed border-white/[0.10] bg-slate-900/35 px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400">
                  <School className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">Belum ada penugasan aktif</h3>
                <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400 font-normal">
                  Belum ada kelas dan mata pelajaran yang dapat dikelola pada periode akademik aktif. Silakan hubungi admin sekolah.
                </p>
              </section>
            )}

            {/* 4. FOOTER (Identitas & Educational Quote) */}
            <footer className="mt-8 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px]">
              <div>
                <p className="font-semibold text-slate-300">e-Rapor Kurikulum Merdeka</p>
                <p className="text-[10px] text-slate-400 font-normal">Sistem Penilaian & Laporan Hasil Belajar Peserta Didik</p>
              </div>
              <div className="italic text-right text-slate-400 text-[10px] font-normal">
                “Pendidikan adalah investasi terbaik untuk masa depan.” — Anies Baswedan
              </div>
            </footer>
          </main>
        ) : isLoading || !classData ? (
          <div className="min-h-[55vh] flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-slate-950/55 backdrop-blur-xl px-6 py-12 text-center shadow-2xl">
              <div className="w-10 h-10 border-[3px] border-amber-400/25 border-t-amber-400 rounded-full animate-spin mx-auto" />
              <p className="mt-5 text-sm font-bold text-slate-200">Membuka Kelas {selectedClass}...</p>
              <p className="mt-1 text-xs text-slate-400 font-normal">Menyiapkan {selectedContext.subjectName} dan data siswa.</p>
            </div>
          </div>
        ) : (
          /* ============================================================
             ACTIVE RAPOR WORKSPACE
             Executive Header with Integrated Navigation & Quick Stats
          ============================================================ */
          <main className="space-y-3.5">
            <section className="rounded-2xl border border-white/[0.08] bg-[#07111E] shadow-xl shadow-black/20 p-3 sm:p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                {/* Left: Class Identity & Role Badge */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-amber-400/25 bg-amber-400/[0.09] flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
                    <GraduationCap className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Kelas {selectedClass}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${
                        selectedIsHomeroom
                          ? 'border-emerald-400/30 bg-emerald-500/[0.12] text-emerald-300'
                          : 'border-cyan-400/30 bg-cyan-500/[0.12] text-cyan-300'
                      }`}>
                        {selectedIsHomeroom ? 'Wali Kelas' : 'Guru Mapel'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 font-normal">
                      {selectedSchoolYear} <span className="text-slate-600 mx-1">•</span>
                      Semester {academicAccess?.academicPeriod?.semester || selectedSemester}
                    </p>
                  </div>
                </div>

                {/* Center: Segmented Navigation Pills */}
                <nav className="flex items-center justify-start lg:justify-center gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-white/[0.06] overflow-x-auto custom-scrollbar">
                  {([
                    ['tp_setup', Layers, 'TP & Capaian'],
                    ['scores', BookOpen, 'Input Nilai'],
                    ['leger', FileSpreadsheet, 'Leger'],
                    ['print', Printer, 'Cetak Rapor'],
                  ] as const).map(([tab, Icon, label]) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`h-9 px-3.5 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all duration-200 whitespace-nowrap cursor-pointer active:scale-95 ${
                          isActive
                            ? 'border border-emerald-400/50 bg-emerald-500/[0.15] text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`} />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Right: 3 Quick Metric Cards */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                  <div className="min-w-[68px] sm:min-w-[74px] rounded-xl border border-white/[0.08] bg-slate-950/70 px-2.5 py-1.5 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Siswa</p>
                    <p className="text-sm sm:text-base font-bold text-white leading-tight mt-0.5">{classStudents.length}</p>
                  </div>

                  <div className="min-w-[68px] sm:min-w-[74px] rounded-xl border border-white/[0.08] bg-slate-950/70 px-2.5 py-1.5 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Mapel</p>
                    <p className="text-sm sm:text-base font-bold text-white leading-tight mt-0.5">{selectedClassContexts.length}</p>
                  </div>

                  <div className="min-w-[80px] sm:min-w-[88px] rounded-xl border border-white/[0.08] bg-slate-950/70 px-2.5 py-1.5 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Periode</p>
                    <p className="text-sm sm:text-base font-bold text-amber-300 leading-tight mt-0.5">
                      {academicAccess?.academicPeriod?.semester || selectedSemester}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Active content: deliberately not wrapped in another decorative
                card so child components can own their own visual hierarchy. */}
            <section className="min-h-[calc(100vh-13rem)]">
              {activeTab === 'tp_setup' && (
                <RaporTpSetup
                  subjects={classData.subjects}
                  onUpdateSubjects={handleUpdateSubjects}
                  fase={classData.config.fase}
                  gradeLevel={getGradeLevel(selectedClass)}
                  classLevel={selectedClass}
                  initialSubjectId={selectedContext.subjectId}
                  allowedSubjectIds={selectedClassContexts.map((c) => c.subjectId)}
                  isHomeroom={selectedIsHomeroom}
                  onSelectSubject={(subjectId) => {
                    const ctx = selectedClassContexts.find((c) => c.subjectId === subjectId);
                    if (ctx) {
                      setSelectedContext(ctx);
                    } else {
                      const subj = classData.subjects.find((s) => s.id === subjectId);
                      if (subj) {
                        setSelectedContext((prev) => ({
                          ...prev!,
                          subjectId: subj.id,
                          subjectName: subj.name,
                          subjectCode: subj.code || null,
                        }));
                      }
                    }
                  }}
                  onNextToScores={() => setActiveTab('scores')}
                  readOnly={!!previewTeacher}
                />
              )}

              {activeTab === 'scores' && (
                <RaporScoreGrid
                  subjects={classData.subjects}
                  students={classStudents}
                  subjectRecords={classData.subjectRecords}
                  config={classData.config}
                  gradeLevel={getGradeLevel(selectedClass)}
                  classLevel={selectedClass}
                  semester={selectedSemester}
                  schoolYear={selectedSchoolYear}
                  initialSubjectId={selectedContext.subjectId}
                  additionalInfo={classData.additionalInfo}
                  onSelectSubject={(subjectId) => {
                    const ctx = selectedClassContexts.find((c) => c.subjectId === subjectId);
                    if (ctx) {
                      setSelectedContext(ctx);
                    } else {
                      const subj = classData.subjects.find((s) => s.id === subjectId);
                      if (subj) {
                        setSelectedContext((prev) => ({
                          ...prev!,
                          subjectId: subj.id,
                          subjectName: subj.name,
                          subjectCode: subj.code || null,
                        }));
                      }
                    }
                  }}
                  onUpdateAdditionalInfo={handleUpdateAdditionalInfo}
                  onUpdateSubjectRecord={handleUpdateSubjectRecord}
                  onGoToTpSetup={() => setActiveTab('tp_setup')}
                />
              )}

              {activeTab === 'leger' && (
                <RaporLegerTable
                  classData={classData}
                  students={classStudents}
                />
              )}

              {activeTab === 'print' && (
                <RaporPrintPreview
                  classData={classData}
                  students={classStudents}
                  semester={selectedSemester}
                  schoolYear={selectedSchoolYear}
                />
              )}
            </section>
          </main>
        )}
        {/* Exit Confirmation Dialog Modal */}
        {showExitConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.12] bg-slate-900/95 backdrop-blur-2xl shadow-2xl">
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/[0.12] border border-amber-400/25 text-amber-300 flex items-center justify-center shadow-inner">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="mt-4 text-base sm:text-lg font-bold text-white tracking-tight">Ada Perubahan yang Belum Disinkronkan</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  Perubahan Kelas <span className="text-amber-300 font-semibold">{selectedClass}</span> sudah tersimpan lokal di peramban, tetapi belum dikirim ke Cloud Database.
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5 mt-6">
                  <button
                    type="button"
                    onClick={handleConfirmSaveAndExit}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors cursor-pointer active:scale-95 shadow-md shadow-amber-400/20"
                  >
                    Simpan & Lanjut
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExitWithoutSave}
                    className="px-4 py-2.5 rounded-xl border border-white/[0.10] bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 font-semibold text-xs transition-colors cursor-pointer active:scale-95"
                  >
                    Lanjut Tanpa Sinkron
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExitConfirmModal(false)}
                  className="w-full mt-2.5 px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {classData && (
          <RaporSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            config={classData.config}
            activeClass={selectedClass}
            gradeLevel={getGradeLevel(selectedClass)}
            initialTab={settingsTab}
            onSaveConfig={handleUpdateConfig}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
};
