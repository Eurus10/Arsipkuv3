import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Users,
  GraduationCap,
  Sparkles,
  Download,
  FolderUp,
  Award,
  CheckCircle2,
  Clock3,
  Calendar,
  UserCheck,
  Target,
  FileText,
  Plus,
  ArrowRight,
  Edit3,
  Search,
  Check,
  RotateCcw,
  BarChart3,
  Layers,
  FileSpreadsheet,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  X,
  AlertCircle,
  Building2,
  Send,
  Printer,
  MessageSquare,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  AnalysisSession,
  AnalysisSubject,
  ExamType,
  AnalysisQuestionConfig,
  StudentAnswers,
  AnalysisImportContext,
} from '../../types/analysisTypes';
import { MasterClass } from '../../data/masterExamData';
import { Student, getStoredSchools, DEFAULT_SCHOOL_NAME } from '../../services/studentStorage';
import {
  getAllClassSessions,
  saveSubjectConfigToMultipleClasses,
  saveActiveSession,
  deleteSubjectSessionFromClasses,
  clearActiveSession,
} from '../../services/analysis/analysisSessionService';
import { exportSingleSubjectToExcel, exportMultiClassSubjectToExcel, } from '../../services/analysis/analysisExcelService';
import { calculateMaxScore, calculateSubjectSummaryStats } from '../../services/analysis/analysisCalculationService';
import {
  findBestSubjectInSession,
  getCanonicalSubjectKey,
  getStudentResultSafely,
  isSameCanonicalSubject,
} from '../../services/analysis/analysisSubjectAliasing';
import { PillStepper } from './PillStepper';
import { SendToPakZakiModal } from './SendToPakZakiModal';
import { AnalysisSubmissionChatModal } from './AnalysisSubmissionChatModal';
import {
  subscribeToAnalysisSubmissions,
  getLocalAnalysisSubmissions,
} from '../../services/analysisSubmissionService';
import { getActiveTeacherSession, silentSyncActiveTeacherSession } from '../../services/teacherStorage';
import { AnalysisSubmissionItem } from '../../types/analysisSubmissionTypes';

// Preset mata pelajaran umum guru bidang di SDIT AL FIKRI
const PRESET_SUBJECTS = [
  'Pendidikan Agama Islam & BP',
  'Akidah Akhlak',
  'Fiqih',
  'Bahasa Arab',
  'PJOK',
  'Bahasa Inggris',
  'Seni Rupa',
  'Seni Musik',
  'Seni Tari / Teater',
  'Bahasa Sunda',
  'BTQ (Baca Tulis Al-Qur\'an)',
  'Tahfidz Al-Qur\'an',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'IPAS',
  'Informatika',
  'PLKJ',
];

interface SubjectTeacherWorkspaceProps {
  masterClasses: MasterClass[];
  students: Student[];
  onOpenStudentInput: (session: AnalysisSession, subject: AnalysisSubject) => void;
  onOpenSubjectStats: (session: AnalysisSession, subject: AnalysisSubject) => void;
  onOpenImport: (context?: AnalysisImportContext) => void;

  refreshKey?: number;
}

export const SubjectTeacherWorkspace: React.FC<SubjectTeacherWorkspaceProps> = ({
  masterClasses,
  students,
  onOpenStudentInput,
  onOpenSubjectStats,
  onOpenImport,
  refreshKey,
}) => {
  // State sekolah
  const [schoolsList, setSchoolsList] = useState<string[]>(() => getStoredSchools());
  const [selectedSchool, setSelectedSchool] = useState<string>(DEFAULT_SCHOOL_NAME);

  // State form setup guru bidang
  const [subjectName, setSubjectName] = useState<string>('Pendidikan Agama Islam & BP');
  const [isCustomSubject, setIsCustomSubject] = useState<boolean>(false);
  const [customSubjectText, setCustomSubjectText] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [examType, setExamType] = useState<ExamType>('STS1');
  const [schoolYear, setSchoolYear] = useState<string>('2026/2027');
  const [kktp, setKktp] = useState<number>(70);
  const [analysisDate, setAnalysisDate] = useState<string>(
    new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );

  // Question configuration (Default resmi: 25 PG, 10 Isian, 5 Uraian)
  const [pgCount, setPgCount] = useState<number>(25);
  const [pgWeight, setPgWeight] = useState<number>(1);
  const [isianCount, setIsianCount] = useState<number>(10);
  const [isianWeight, setIsianWeight] = useState<number>(2);
  const [cType, setCType] = useState<'Uraian' | 'Essay' | 'Menjodohkan'>('Uraian');
  const [cCount, setCCount] = useState<number>(5);
  const [cWeight, setCWeight] = useState<number>(2);

  // Kelas yang diampu (Multi-Select)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(['1A', '1B']);
  const [activeClassId, setActiveClassId] = useState<string>('1A');

  // Mode status: apakah sudah selesai konfigurasi awal
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState<boolean>(false);
  const [newSubjName, setNewSubjName] = useState<string>('Pendidikan Agama Islam & BP');
  const [newSubjIsCustom, setNewSubjIsCustom] = useState<boolean>(false);
  const [newSubjCustomText, setNewSubjCustomText] = useState<string>('');
  const [newSubjTeacherName, setNewSubjTeacherName] = useState<string>('');
  const [newSubjTargetClasses, setNewSubjTargetClasses] = useState<string[]>([]);
  const [newSubjPgCount, setNewSubjPgCount] = useState<number>(20);
  const [newSubjPgWeight, setNewSubjPgWeight] = useState<number>(1);
  const [newSubjIsianCount, setNewSubjIsianCount] = useState<number>(10);
  const [newSubjIsianWeight, setNewSubjIsianWeight] = useState<number>(2);
  const [newSubjCType, setNewSubjCType] = useState<'Uraian' | 'Essay' | 'Menjodohkan'>('Uraian');
  const [newSubjCCount, setNewSubjCCount] = useState<number>(5);
  const [newSubjCWeight, setNewSubjCWeight] = useState<number>(4);
  const [newSubjKktp, setNewSubjKktp] = useState<number>(70);
  const [newSubjExamType, setNewSubjExamType] = useState<ExamType>('STS1');
  const [showClassPickerModal, setShowClassPickerModal] = useState<boolean>(false);
  const [showSwitchSessionModal, setShowSwitchSessionModal] = useState<boolean>(false);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState<boolean>(false);
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [batchDownloadStatus, setBatchDownloadStatus] = useState<string | null>(null);
  const [isSendToPakZakiOpen, setIsSendToPakZakiOpen] = useState<boolean>(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);
  const [sendTargetMode, setSendTargetMode] = useState<'single' | 'all'>('single');
  const classScrollRef = useRef<HTMLDivElement>(null);

  // Load class sessions map from storage
  const [classSessionsMap, setClassSessionsMap] = useState<Record<string, AnalysisSession>>({});

  const reloadSessions = () => {
    const all = getAllClassSessions();
    setClassSessionsMap(all);
  };

  useEffect(() => {
    reloadSessions();
  }, [refreshKey]);

  // Real-time listener for submissions status and revision notes from Pak Zaki
  const [submissions, setSubmissions] = useState<AnalysisSubmissionItem[]>(() =>
    getLocalAnalysisSubmissions()
  );

  useEffect(() => {
    const unsubscribe = subscribeToAnalysisSubmissions((items) => {
      setSubmissions(items);
    });
    return () => unsubscribe();
  }, []);

  // Cek apakah ada sesi yang sudah tersimpan untuk subject ini
  useEffect(() => {
    const all = getAllClassSessions();
    const classIdsWithSessions = Object.keys(all);
    if (classIdsWithSessions.length > 0) {
      // Cari jika ada subject yang sudah pernah dibuat guru bidang
      let foundSubject: AnalysisSubject | null = null;
      let foundExamType: ExamType = 'SAS';
      let foundYear = '2025/2026';
      let foundKktp = 70;
      let foundTeacher = '';
      const matchingClasses: string[] = [];

      classIdsWithSessions.forEach((cId) => {
        const session = all[cId];
        if (session && session.subjects.length > 0) {
          session.subjects.forEach((subj) => {
            if (!foundSubject) {
              foundSubject = subj;
              foundExamType = session.examType;
              foundYear = session.schoolYear;
              foundKktp = session.kktp;
              foundTeacher = subj.teacherName || session.teacherName;
            }
            if (foundSubject && subj.subjectName.toLowerCase() === foundSubject.subjectName.toLowerCase()) {
              if (!matchingClasses.includes(session.classId)) {
                matchingClasses.push(session.classId);
              }
            }
          });
        }
      });

      if (foundSubject && matchingClasses.length > 0) {
        const s = foundSubject as AnalysisSubject;
        setSubjectName(s.subjectName);
        setTeacherName(foundTeacher);
        setExamType(foundExamType);
        setSchoolYear(foundYear);
        setKktp(foundKktp);
        setPgCount(s.config.pgCount);
        setPgWeight(s.config.pgWeight);
        setIsianCount(s.config.isianCount);
        setIsianWeight(s.config.isianWeight);
        setCType(s.config.cType as any);
        setCCount(s.config.cCount);
        setCWeight(s.config.cWeight);
        setSelectedClassIds(matchingClasses);
        setActiveClassId(matchingClasses[0]);
        setIsConfigured(true);
      }
    }

    // Silent session sync in background without disrupting teacher form
    silentSyncActiveTeacherSession().catch(() => {});
  }, []);

  // Scroll active class into view smoothly
  useEffect(() => {
    if (classScrollRef.current && activeClassId) {
      const activeBtn = classScrollRef.current.querySelector<HTMLButtonElement>(
        `[data-class-id="${activeClassId}"]`
      );
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeClassId]);

  const handleScrollClasses = (direction: 'left' | 'right') => {
    if (classScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      classScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Daftar mata pelajaran yang sudah ada dalam sesi kelas yang tersimpan
  const availableSubjectsList = useMemo(() => {
    const map: Record<
      string,
      {
        subjectName: string;
        teacherName: string;
        examType: ExamType;
        schoolYear: string;
        kktp: number;
        classIds: string[];
        totalStudents: number;
        completedStudents: number;
        config: AnalysisQuestionConfig;
      }
    > = {};

    (Object.values(classSessionsMap) as AnalysisSession[]).forEach((sess) => {
      if (!sess || !sess.subjects) return;
      sess.subjects.forEach((subj) => {
        const canonicalKey = getCanonicalSubjectKey(subj.subjectName);
        const subjScoreCount = Object.keys(subj.studentResults || {}).length;

        if (!map[canonicalKey]) {
          map[canonicalKey] = {
            subjectName: subj.subjectName,
            teacherName: subj.teacherName || sess.teacherName,
            examType: sess.examType,
            schoolYear: sess.schoolYear,
            kktp: sess.kktp,
            classIds: [sess.classId],
            totalStudents: 0,
            completedStudents: 0,
            config: subj.config,
          };
        } else {
          // Jika entry lama belum ada nilai tapi subject ini memiliki nilai, perbarui nama/config
          if (subjScoreCount > 0 && map[canonicalKey].completedStudents === 0) {
            map[canonicalKey].subjectName = subj.subjectName;
            map[canonicalKey].config = subj.config;
            if (subj.teacherName) map[canonicalKey].teacherName = subj.teacherName;
          }
          if (!map[canonicalKey].classIds.includes(sess.classId)) {
            map[canonicalKey].classIds.push(sess.classId);
          }
        }
        const clsStudents = students.filter(
          (s) => s.classId.toLowerCase() === sess.classId.toLowerCase()
        );
        map[canonicalKey].totalStudents += clsStudents.length;
        map[canonicalKey].completedStudents += subjScoreCount;
      });
    });

    return Object.values(map);
  }, [classSessionsMap, students]);

  // Handler: Beralih ke mata pelajaran yang sudah ada
  const handleSelectExistingSubject = (item: (typeof availableSubjectsList)[0]) => {
    setSubjectName(item.subjectName);
    const isPreset = PRESET_SUBJECTS.includes(item.subjectName);
    setIsCustomSubject(!isPreset);
    if (!isPreset) {
      setCustomSubjectText(item.subjectName);
    }
    setTeacherName(item.teacherName);
    setExamType(item.examType);
    setSchoolYear(item.schoolYear);
    setKktp(item.kktp);
    setPgCount(item.config.pgCount);
    setPgWeight(item.config.pgWeight);
    setIsianCount(item.config.isianCount);
    setIsianWeight(item.config.isianWeight);
    setCType(item.config.cType as any);
    setCCount(item.config.cCount);
    setCWeight(item.config.cWeight);
    setSelectedClassIds(item.classIds);
    setActiveClassId(item.classIds[0] || '1A');
    setIsConfigured(true);
    setShowSwitchSessionModal(false);
  };

  const [showAllClasses, setShowAllClasses] = useState(false);

  // Filter siswa per sekolah yang dipilih
  const schoolStudents = useMemo(() => {
    const targetSchool = (selectedSchool || DEFAULT_SCHOOL_NAME).trim().toLowerCase();
    return students.filter(
      (s) => (s.schoolName || DEFAULT_SCHOOL_NAME).trim().toLowerCase() === targetSchool
    );
  }, [students, selectedSchool]);

  // Jumlah siswa per kelas untuk sekolah yang dipilih
  const studentCountPerClass = useMemo(() => {
    const map: Record<string, number> = {};
    schoolStudents.forEach((s) => {
      const cid = s.classId.toUpperCase();
      map[cid] = (map[cid] || 0) + 1;
    });
    return map;
  }, [schoolStudents]);

  // Rombel yang memiliki siswa di sekolah ini (atau semua jika showAllClasses aktif atau belum ada siswa)
  const availableClassesForSchool = useMemo(() => {
    const classesWithStudents = masterClasses.filter(
      (c) => (studentCountPerClass[c.id.toUpperCase()] || 0) > 0
    );
    if (classesWithStudents.length === 0 || showAllClasses) {
      return masterClasses;
    }
    return classesWithStudents;
  }, [masterClasses, studentCountPerClass, showAllClasses]);

  // Handler: Buka Modal Tambah Mapel Baru (Tanpa Ganti Sesi & Tanpa Hilang Data)
  const handleOpenAddSubjectModal = () => {
    setNewSubjName('Pendidikan Agama Islam & BP');
    setNewSubjIsCustom(false);
    setNewSubjCustomText('');
    setNewSubjTeacherName(teacherName || getActiveTeacherSession()?.name || '');
    setNewSubjTargetClasses(
      selectedClassIds.length > 0
        ? [...selectedClassIds]
        : availableClassesForSchool.slice(0, 4).map((c) => c.id)
    );
    setNewSubjPgCount(pgCount || 20);
    setNewSubjPgWeight(pgWeight || 1);
    setNewSubjIsianCount(isianCount || 10);
    setNewSubjIsianWeight(isianWeight || 2);
    setNewSubjCType(cType || 'Uraian');
    setNewSubjCCount(cCount || 5);
    setNewSubjCWeight(cWeight || 4);
    setNewSubjKktp(kktp || 70);
    setNewSubjExamType(examType || 'STS1');
    setIsAddSubjectModalOpen(true);
  };

  // Handler: Simpan & Buka Mapel Baru
  const handleSaveNewSubject = () => {
    const finalName =
      newSubjIsCustom && newSubjCustomText.trim()
        ? newSubjCustomText.trim()
        : newSubjName.trim();
    if (!finalName) {
      alert('Silakan tentukan nama mata pelajaran.');
      return;
    }
    if (newSubjTargetClasses.length === 0) {
      alert('Pilih minimal 1 kelas yang Anda ampu untuk mata pelajaran ini.');
      return;
    }

    const subjectId = `subj-${finalName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const newConfig: AnalysisQuestionConfig = {
      pgCount: newSubjPgCount,
      pgWeight: newSubjPgWeight,
      isianCount: newSubjIsianCount,
      isianWeight: newSubjIsianWeight,
      cType: newSubjCType,
      cCount: newSubjCCount,
      cWeight: newSubjCWeight,
    };

    const updatedMap = saveSubjectConfigToMultipleClasses({
      schoolName: selectedSchool.trim() || DEFAULT_SCHOOL_NAME,
      subjectId,
      subjectName: finalName,
      teacherName: newSubjTeacherName.trim(),
      config: newConfig,
      targetClassIds: newSubjTargetClasses,
      masterClasses,
      students,
      examType: newSubjExamType,
      schoolYear,
      kktp: newSubjKktp,
    });

    setClassSessionsMap(updatedMap);
    setSubjectName(finalName);
    setIsCustomSubject(newSubjIsCustom);
    setCustomSubjectText(newSubjCustomText);
    setTeacherName(newSubjTeacherName.trim());
    setExamType(newSubjExamType);
    setKktp(newSubjKktp);
    setPgCount(newSubjPgCount);
    setPgWeight(newSubjPgWeight);
    setIsianCount(newSubjIsianCount);
    setIsianWeight(newSubjIsianWeight);
    setCType(newSubjCType);
    setCCount(newSubjCCount);
    setCWeight(newSubjCWeight);
    setSelectedClassIds(newSubjTargetClasses);
    setActiveClassId(newSubjTargetClasses[0] || '1A');
    setIsConfigured(true);
    setIsAddSubjectModalOpen(false);
    setShowSwitchSessionModal(false);
  };

  // Handler: Mulai setup mata pelajaran / sesi baru dari awal
  const handleStartNewSubjectSetup = () => {
    handleOpenAddSubjectModal();
  };

  const activeSubjectName = isCustomSubject && customSubjectText.trim()
    ? customSubjectText.trim()
    : subjectName;

  const currentQuestionConfig: AnalysisQuestionConfig = useMemo(
    () => ({
      pgCount,
      pgWeight,
      isianCount,
      isianWeight,
      cType,
      cCount,
      cWeight,
    }),
    [pgCount, pgWeight, isianCount, isianWeight, cType, cCount, cWeight]
  );

  const maxScore = useMemo(
    () => calculateMaxScore(currentQuestionConfig),
    [currentQuestionConfig]
  );

  const activeSubjectSubmission = useMemo(() => {
    return submissions.find(
      (s) =>
        s.subjectName.toLowerCase().trim() === activeSubjectName.toLowerCase().trim() &&
        (s.classId.toLowerCase().includes(activeClassId.toLowerCase()) ||
          s.submissionType === 'multi_class')
    );
  }, [submissions, activeSubjectName, activeClassId]);

  // Helper toggle pilih kelas
  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) => {
      if (prev.includes(classId)) {
        if (prev.length <= 1) return prev; // Minimal 1 kelas
        const next = prev.filter((id) => id !== classId);
        if (activeClassId === classId && next.length > 0) {
          setActiveClassId(next[0]);
        }
        return next;
      } else {
        return [...prev, classId].sort();
      }
    });
  };

  const handleSelectPhase = (phase: 'ALL' | 'FASE_A' | 'FASE_B' | 'FASE_C' | 'CLEAR') => {
    if (phase === 'ALL') {
      setSelectedClassIds(availableClassesForSchool.map((c) => c.id));
    } else if (phase === 'FASE_A') {
      setSelectedClassIds(
        availableClassesForSchool.filter((c) => c.level === 1 || c.level === 2).map((c) => c.id)
      );
    } else if (phase === 'FASE_B') {
      setSelectedClassIds(
        availableClassesForSchool.filter((c) => c.level === 3 || c.level === 4).map((c) => c.id)
      );
    } else if (phase === 'FASE_C') {
      setSelectedClassIds(
        availableClassesForSchool.filter((c) => c.level === 5 || c.level === 6).map((c) => c.id)
      );
    } else if (phase === 'CLEAR') {
      if (availableClassesForSchool.length > 0) {
        setSelectedClassIds([availableClassesForSchool[0].id]);
        setActiveClassId(availableClassesForSchool[0].id);
      }
    }
  };

  // Simpan / Mulai Workspace Guru Bidang
  const handleApplyConfig = () => {
    if (selectedClassIds.length === 0) return;
    const finalSubjectName = activeSubjectName;
    const subjectId = `subj-${finalSubjectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const updatedMap = saveSubjectConfigToMultipleClasses({
      schoolName: selectedSchool.trim() || DEFAULT_SCHOOL_NAME,
      subjectId,
      subjectName: finalSubjectName,
      teacherName: teacherName.trim(),
      config: currentQuestionConfig,
      targetClassIds: selectedClassIds,
      masterClasses,
      students,
      examType,
      schoolYear,
      kktp,
    });

    setClassSessionsMap(updatedMap);
    if (!selectedClassIds.includes(activeClassId)) {
      setActiveClassId(selectedClassIds[0]);
    }
    setIsConfigured(true);
    setIsEditModalOpen(false);
  };

  // Sesi dan Subject untuk Kelas yang Sedang Aktif
  const activeClassSession = classSessionsMap[activeClassId.toLowerCase()] || null;
  const activeSubjectInSession: AnalysisSubject | null = useMemo(() => {
    if (!activeClassSession) return null;
    return (
      findBestSubjectInSession(activeClassSession, activeSubjectName) ||
      activeClassSession.subjects[0] ||
      null
    );
  }, [activeClassSession, activeSubjectName]);

  const handleDeleteCurrentSession = () => {
  const subjectId = activeSubjectInSession?.subjectId;

  if (!subjectId || !activeSubjectName || selectedClassIds.length === 0) {
    return;
  }

  deleteSubjectSessionFromClasses(
    subjectId,
    activeSubjectName,
    selectedClassIds
  );

  clearActiveSession();

  const updatedMap = getAllClassSessions();
  setClassSessionsMap(updatedMap);

  setIsConfigured(false);
  setSelectedClassIds([]);
  setActiveClassId('');
  setShowDeleteSessionModal(false);
  setShowSwitchSessionModal(false);
};

  // Daftar siswa kelas aktif (disaring berdasarkan sekolah dan kelas)
  const activeClassStudents = useMemo(() => {
    return students
      .filter(
        (s) =>
          s.classId.toLowerCase() === activeClassId.toLowerCase() &&
          (!selectedSchool || (s.schoolName || DEFAULT_SCHOOL_NAME).toLowerCase() === selectedSchool.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
  }, [students, activeClassId, selectedSchool]);

  // Filter siswa pencarian
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return activeClassStudents;
    const query = searchStudent.toLowerCase();
    return activeClassStudents.filter(
      (s) => s.name.toLowerCase().includes(query) || ((s as any).nisn && (s as any).nisn.includes(query))
    );
  }, [activeClassStudents, searchStudent]);

  // Statistik kelas aktif
  const activeStats = useMemo(() => {
    if (!activeSubjectInSession || activeClassStudents.length === 0) return null;
    return calculateSubjectSummaryStats(
      activeSubjectInSession,
      activeClassStudents,
      activeClassSession?.kktp || kktp
    );
  }, [activeSubjectInSession, activeClassStudents, activeClassSession, kktp]);

  // Memoized student row display map to prevent 90+ array allocations and .filter calls on every render
  const studentRowDisplayMap = useMemo(() => {
    const map = new Map<string, {
      isFilled: boolean;
      finalGrade: number | null;
      isPassed: boolean;
      correctPg: string | number;
      correctIsian: string | number;
      correctC: string | number;
      totalScore: string | number;
    }>();

    if (!activeSubjectInSession) return map;

    for (let sIdx = 0; sIdx < activeClassStudents.length; sIdx++) {
      const s = activeClassStudents[sIdx];
      const res = getStudentResultSafely(activeSubjectInSession.studentResults, s);
      if (!res) {
        map.set(s.id, {
          isFilled: false,
          finalGrade: null,
          isPassed: false,
          correctPg: '-',
          correctIsian: '-',
          correctC: '-',
          totalScore: '-',
        });
      } else {
        const answers = res.answers;
        let cPg = 0;
        if (answers?.pg) {
          for (let i = 0; i < answers.pg.length; i++) {
            if (answers.pg[i] > 0) cPg++;
          }
        }
        let cIsian = 0;
        if (answers?.isian) {
          for (let i = 0; i < answers.isian.length; i++) {
            if (answers.isian[i] > 0) cIsian++;
          }
        }
        let cC = 0;
        if (answers?.c) {
          for (let i = 0; i < answers.c.length; i++) {
            if (answers.c[i] > 0) cC++;
          }
        }

        map.set(s.id, {
          isFilled: true,
          finalGrade: Math.round(res.finalGrade),
          isPassed: res.isPassed,
          correctPg: cPg,
          correctIsian: cIsian,
          correctC: cC,
          totalScore: res.totalScore,
        });
      }
    }
    return map;
  }, [activeSubjectInSession, activeClassStudents]);

  // Export Excel 1 Kelas Aktif
  const handleExportActiveClass = () => {
    if (!activeClassSession || !activeSubjectInSession) return;
    exportSingleSubjectToExcel(
      activeClassSession,
      activeSubjectInSession,
      activeClassStudents
    );
  };

// Export Excel Semua Kelas Terpilih → 1 FILE MULTI-SHEET
const handleExportAllClasses = () => {
  if (selectedClassIds.length === 0) {
    setBatchDownloadStatus('Belum ada kelas yang dipilih.');
    setTimeout(() => {
      setBatchDownloadStatus(null);
    }, 2500);
    return;
  }

  setBatchDownloadStatus('Membuat 1 berkas Excel untuk semua kelas...');

  try {
    exportMultiClassSubjectToExcel({
      subjectName: activeSubjectName,
      teacherName,
      examType,
      schoolYear,
      kktp,

      // Seluruh session kelas yang sudah tersimpan
      classSessionsMap,

      // Seluruh data siswa
      allStudents: students,

      // Master kelas sekolah
      masterClasses,

      // Kelas yang dipilih guru
      selectedClassIds,
    });

    setBatchDownloadStatus(
      `Berhasil membuat 1 file Excel untuk ${selectedClassIds.length} kelas.`
    );

    setTimeout(() => {
      setBatchDownloadStatus(null);
    }, 3000);
  } catch (err) {
    console.error('Multi-class Excel export failed:', err);
    setBatchDownloadStatus(
      'Gagal membuat berkas Excel semua kelas. Silakan coba lagi.'
    );

    setTimeout(() => {
      setBatchDownloadStatus(null);
    }, 4000);
  }
};

  // ====================================================
  // RENDER 1: FORM SETUP AWAL (JIKA BELUM DISIAPKAN)
  // ====================================================
  if (!isConfigured) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-[fadeIn_150ms_ease-out]">
        <div className="relative bg-slate-900/95 sm:bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl space-y-6 overflow-hidden">
          {/* Ambient Top Glow (Hidden on Mobile for 60fps GPU performance) */}
          <div className="hidden sm:block absolute -top-12 -right-12 w-64 h-32 bg-indigo-500/10 blur-3xl pointer-events-none -z-10" />

          {/* Header Banner Mode Guru Bidang */}
          <div className="flex items-start justify-between pb-5 border-b border-white/10 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)] shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Setup Mode Guru Bidang (Per-Mata Pelajaran)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">
                    Multi-Kelas
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Atur 1 mata pelajaran & konfigurasi butir soal sekali saja, lalu pilih seluruh kelas yang Anda ajar untuk dinilai secara praktis.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            {/* 0. Sekolah / Lembaga */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                1. Sekolah / Lembaga
              </label>
              <div className="relative">
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 focus:border-indigo-400/50 rounded-xl px-3.5 py-2.5 text-sm text-indigo-300 font-bold outline-none transition-all cursor-pointer"
                >
                  {schoolsList.map((sch) => (
                    <option key={sch} value={sch} className="bg-slate-900 text-white">
                      {sch}
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-indigo-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Data siswa dan kelas akan disaring berdasarkan ekosistem sekolah ini.</p>
            </div>

            {/* 1. Mata Pelajaran & Nama Guru */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  2. Pilih Mata Pelajaran
                </label>
                <select
                  value={isCustomSubject ? '__CUSTOM__' : subjectName}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomSubject(true);
                    } else {
                      setIsCustomSubject(false);
                      setSubjectName(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-indigo-400/50 cursor-pointer"
                >
                  {PRESET_SUBJECTS.map((subj) => (
                    <option key={subj} value={subj} className="bg-slate-900 text-white">
                      {subj}
                    </option>
                  ))}
                  <option value="__CUSTOM__" className="bg-slate-900 text-amber-300">
                    + Input Mata Pelajaran Lainnya...
                  </option>
                </select>

                {isCustomSubject && (
                  <input
                    type="text"
                    placeholder="Ketik nama mata pelajaran custom..."
                    value={customSubjectText}
                    onChange={(e) => setCustomSubjectText(e.target.value)}
                    className="w-full mt-2 bg-slate-950/50 border border-amber-500/40 rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-amber-400"
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  3. Nama Guru Pengampu
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd.I"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 focus:border-indigo-400/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold outline-none transition-all placeholder:text-slate-600"
                  />
                  <UserCheck className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                </div>
              </div>
            </div>

            {/* 2. Jenis Ujian, Tahun Pelajaran, KKTP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  4. Jenis Ujian
                </label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as ExamType)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-indigo-400/50 cursor-pointer"
                >
                  <option value="STS1">1. STS 1 (Sumatif Tengah Semester 1)</option>
                  <option value="SAS 1">2. SAS 1 (Sumatif Akhir Semester 1)</option>
                  <option value="STS2">3. STS 2 (Sumatif Tengah Semester 2)</option>
                  <option value="SAT">4. SAT (Sumatif Akhir Tahun)</option>
                  <option value="US">5. US (Ujian Sekolah)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  5. Tahun Pelajaran
                </label>
                <input
                  type="text"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-indigo-400/50"
                  placeholder="2026/2027"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  6. Standar KKTP / KKM
                </label>
                <PillStepper
                  value={kktp}
                  onChange={setKktp}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>

            {/* 3. Konfigurasi Butir Soal */}
            <div className="bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Konfigurasi Struktur Butir Soal
                </h4>
                <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                  Total Skor Maksimal: {maxScore}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                {/* PG */}
                <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">1. Pilihan Ganda</span>
                    <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-md">
                      PG
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Jumlah Soal PG
                    </label>
                    <PillStepper
                      value={pgCount}
                      onChange={setPgCount}
                      min={0}
                      max={100}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Bobot per Nomor
                    </label>
                    <PillStepper
                      value={pgWeight}
                      onChange={setPgWeight}
                      min={1}
                      max={20}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Isian */}
                <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">2. Isian Singkat</span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                      IS
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Jumlah Soal Isian
                    </label>
                    <PillStepper
                      value={isianCount}
                      onChange={setIsianCount}
                      min={0}
                      max={100}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Bobot per Nomor
                    </label>
                    <PillStepper
                      value={isianWeight}
                      onChange={setIsianWeight}
                      min={1}
                      max={20}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Bagian C */}
                <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">3. Bagian C</span>
                    <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-md">
                      {cType}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Jenis Bagian C
                    </label>
                    <select
                      value={cType}
                      onChange={(e) => setCType(e.target.value as any)}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
                    >
                      <option value="Uraian">Uraian</option>
                      <option value="Essay">Essay</option>
                      <option value="Menjodohkan">Menjodohkan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Jumlah Soal {cType}
                    </label>
                    <PillStepper
                      value={cCount}
                      onChange={setCCount}
                      min={0}
                      max={100}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Bobot Maks. per Soal
                    </label>
                    <PillStepper
                      value={cWeight}
                      onChange={setCWeight}
                      min={1}
                      max={50}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Pilih Daftar Kelas yang Diampu (Multi-Select) */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    6. Pilih Kelas yang Diampu ({selectedClassIds.length} Terpilih)
                  </label>
                  {availableClassesForSchool.length < masterClasses.length && (
                    <span className="text-[10px] text-sky-300 bg-sky-950/70 border border-sky-800/40 px-2 py-0.5 rounded-full font-bold">
                      Hanya Rombel Berisi Siswa ({availableClassesForSchool.length})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSelectPhase('ALL')}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer transition-all"
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPhase('FASE_A')}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer transition-all"
                  >
                    Kelas 1-2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPhase('FASE_B')}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer transition-all"
                  >
                    Kelas 3-4
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPhase('FASE_C')}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer transition-all"
                  >
                    Kelas 5-6
                  </button>
                  {masterClasses.length > availableClassesForSchool.length && (
                    <button
                      type="button"
                      onClick={() => setShowAllClasses((prev) => !prev)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-[10.5px] font-bold text-indigo-300 cursor-pointer transition-all"
                    >
                      {showAllClasses ? 'Sembunyikan Rombel Kosong' : 'Tampilkan Semua (14 Rombel)'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {availableClassesForSchool.map((cls) => {
                  const isSelected = selectedClassIds.includes(cls.id);
                  const count = studentCountPerClass[cls.id.toUpperCase()] || 0;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => handleToggleClass(cls.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500/25 border-indigo-400/40 text-white shadow-sm shadow-indigo-500/20'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-sm">Kelas {cls.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 stroke-[3]" />}
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        count > 0 
                          ? isSelected ? 'bg-indigo-500/30 text-indigo-200' : 'bg-white/10 text-sky-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}>
                        {count > 0 ? `${count} Siswa` : '0 Siswa'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleApplyConfig}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 active:scale-[0.99] text-indigo-200 border border-indigo-400/30 font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.2)] cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Buka Workspace Guru Bidang Multi-Kelas</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // RENDER 2: WORKSPACE AKTIF GURU BIDANG (MULTI-KELAS)
  // ====================================================
  return (
    <div className="space-y-5 animate-[fadeIn_150ms_ease-out]">
      {/* Top Banner Guru Bidang (Executive Glass) */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 sm:bg-gradient-to-br sm:from-slate-900/90 sm:via-slate-900/80 sm:to-slate-950/90 p-4 sm:p-6 shadow-xl sm:shadow-2xl backdrop-blur-none sm:backdrop-blur-xl">
        {/* Ambient Top Glow (Hidden on Mobile for 60fps GPU performance) */}
        <div className="hidden sm:block pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="hidden sm:block pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-stretch justify-between gap-5 lg:gap-6">
          {/* Info Utama Mapel */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            {/* 1. Top Row: Institutional Context & Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 shadow-sm">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-bold text-slate-200">{selectedSchool || DEFAULT_SCHOOL_NAME}</span>
                <span className="text-white/20">•</span>
                <span className="text-slate-400 font-mono">TP {schoolYear}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 tracking-wider uppercase shadow-[0_0_12px_rgba(99,102,241,0.15)]">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{activeSubjectName}</span>
              </div>

              {/* Tombol Cepat Tambah Mapel Lain */}
              <button
                type="button"
                onClick={handleOpenAddSubjectModal}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Tambah mapel baru yang Anda ampu tanpa keluar sesi"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>+ Tambah Mapel Lain</span>
              </button>

              {teacherName && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-400/25 text-amber-200">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Guru: {teacherName}</span>
                </div>
              )}
            </div>

            {/* 2. Middle Row: Main Title & Description */}
            <div className="mt-3 mb-3.5">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug flex flex-wrap items-center gap-2 sm:gap-3">
                <span>Workspace Analisis {activeSubjectName}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30 font-mono">
                  <FileText className="w-3 h-3 text-purple-400" />
                  {examType}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                Pengelolaan dan analisis terpusat untuk {selectedClassIds.length} rombel kelas yang diampu
              </p>
            </div>

            {/* 3. Bottom Row: 4-Card Parametric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
              <div className="bg-slate-950/50 border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Jenis Ujian</p>
                  <p className="text-xs font-bold text-white truncate">{examType}</p>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-sky-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kelas Diampu</p>
                  <p className="text-xs font-bold text-white truncate">{selectedClassIds.length} Rombel</p>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Target KKTP</p>
                  <p className="text-xs font-black text-amber-300 truncate">≥ {kktp}</p>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tanggal Asesmen</p>
                  <p className="text-xs font-bold text-white truncate">{analysisDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Top Banner */}
          <div className="w-full lg:w-[280px] xl:w-[310px] shrink-0 flex flex-col justify-between gap-2.5 self-stretch pt-2 lg:pt-0">
            <button
              type="button"
              onClick={handleExportAllClasses}
              className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 border border-emerald-400/40 cursor-pointer transition-all"
              title="Download berkas Excel untuk semua kelas yang diajar"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download Excel Semua Kelas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSendTargetMode('all');
                setIsSendToPakZakiOpen(true);
              }}
              className="w-full h-10 px-4 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-600 hover:from-teal-400 hover:to-emerald-500 active:scale-[0.98] text-white font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 border border-emerald-400/35 cursor-pointer transition-all"
              title="Kirim lembar analisis seluruh kelas ini langsung ke Pak Zaki"
            >
              <Send className="w-3.5 h-3.5" />
              <span>🚀 Kirim ke Pak Zaki (Semua Kelas)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleOpenAddSubjectModal}
                className="h-10 px-2 sm:px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-[0.98] text-emerald-200 border border-emerald-500/35 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Tambah mapel baru yang Anda ampu tanpa keluar sesi"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">+ Tambah Mapel</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSwitchSessionModal(true)}
                className="h-10 px-2 sm:px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 active:scale-[0.98] text-sky-200 border border-sky-500/35 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Pilih atau beralih ke mapel / sesi yang pernah dibuat"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span className="truncate">Ganti Mapel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="h-10 px-2 sm:px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 active:scale-[0.98] text-purple-200 border border-purple-500/30 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Edit struktur & bobot butir soal atau tambah rombel kelas"
              >
                <Settings2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span className="truncate">Atur Kelas &amp; Bobot</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteSessionModal(true)}
                className="h-10 px-2 sm:px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] text-rose-300 border border-rose-500/25 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Hapus sesi analisis mata pelajaran ini"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">Hapus Sesi</span>
              </button>
            </div>
          </div>
        </div>

        {batchDownloadStatus && (
          <div className="mt-3 text-xs font-semibold text-sky-300 bg-sky-950/60 border border-sky-500/30 px-3.5 py-2 rounded-xl">
            {batchDownloadStatus}
          </div>
        )}
      </div>

      {/* ====================================================
          STATUS SETORAN & CATATAN REVISI DARI PAK ZAKI
          ==================================================== */}
      {activeSubjectSubmission && (
        <div className="animate-fadeIn">
          {activeSubjectSubmission.status === 'revisi' && (
            <div className="bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-amber-200 uppercase tracking-wide">
                        ⚠️ Catatan Revisi dari Pak Zaki
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 font-extrabold border border-amber-500/40">
                        {activeSubjectSubmission.className}
                      </span>
                    </div>
                    <div className="text-xs text-white font-medium bg-slate-950/70 p-3 rounded-xl border border-amber-500/20 mt-1.5 leading-relaxed">
                      "{activeSubjectSubmission.adminNote || 'Mohon periksa kembali kelengkapan skor siswa.'}"
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Silakan perbaiki data pada kelas terkait di bawah, lalu kirim ulang ke Pak Zaki.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setIsChatModalOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Buka ruang diskusi dan riwayat chat dengan Pak Zaki"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-300" />
                    <span>💬 Diskusi {activeSubjectSubmission.messages?.length ? `(${activeSubjectSubmission.messages.length})` : ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSendTargetMode('single');
                      setIsSendToPakZakiOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>🚀 Kirim Ulang Hasil Revisi</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSubjectSubmission.status === 'telah_diprint' && (
            <div className="bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-transparent border border-cyan-400/40 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0 shadow-sm">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-cyan-200">
                      🖨️ Telah di-Print oleh Pak Zaki
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-500/40">
                      Selesai Dicetak
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Berkas fisik analisis mapel {activeSubjectName} telah selesai dicetak untuk arsip dan pengesahan sekolah.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-center"
                title="Buka ruang diskusi dan riwayat chat dengan Pak Zaki"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-300" />
                <span>💬 Ruang Diskusi {activeSubjectSubmission.messages?.length ? `(${activeSubjectSubmission.messages.length})` : ''}</span>
              </button>
            </div>
          )}

          {activeSubjectSubmission.status === 'disetujui' && (
            <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-400/30 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-emerald-200">
                      ✓ Telah Disetujui oleh Pak Zaki
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/40">
                      Disetujui
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Lembar analisis mapel {activeSubjectName} telah diverifikasi &amp; disetujui. Menunggu proses cetak fisik.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-center"
                title="Buka ruang diskusi dan riwayat chat dengan Pak Zaki"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                <span>💬 Ruang Diskusi {activeSubjectSubmission.messages?.length ? `(${activeSubjectSubmission.messages.length})` : ''}</span>
              </button>
            </div>
          )}

          {activeSubjectSubmission.status === 'menunggu' && (
            <div className="bg-gradient-to-r from-sky-500/15 via-slate-900/60 to-transparent border border-sky-400/30 rounded-2xl p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 flex items-center justify-center shrink-0">
                  <Clock3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-sky-200">
                    ⏳ Sedang Menunggu Verifikasi Pak Zaki
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Lembar analisis telah disetorkan ke Pak Zaki. Menunggu giliran pemeriksaan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-center"
                title="Buka ruang diskusi dan riwayat chat dengan Pak Zaki"
              >
                <MessageSquare className="w-3.5 h-3.5 text-sky-300" />
                <span>💬 Ruang Diskusi {activeSubjectSubmission.messages?.length ? `(${activeSubjectSubmission.messages.length})` : ''}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ====================================================
          CLASS SWITCHER BAR (HYBRID OPTION A + B)
          Refined Mobile Carousel + Edge Fade + Fast Grid Modal
          ==================================================== */}
      <div className="bg-slate-900/95 sm:bg-slate-900/70 backdrop-blur-none sm:backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg overflow-hidden select-none">
        {/* Top Control Bar: Active Class Context & Actions */}
        <div className="px-3.5 py-2.5 bg-slate-950/40 border-b border-white/5 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 truncate">
              <span className="text-slate-400 hidden xs:inline">Daftar Kelas:</span>
              <span className="text-white font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-md text-[11px]">
                Kelas {activeClassId} ({selectedClassIds.indexOf(activeClassId) + 1}/{selectedClassIds.length})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* Quick Grid Modal Trigger (Ideal for Mobile 1-Thumb Switching) */}
            <button
              type="button"
              onClick={() => setShowClassPickerModal(true)}
              className="h-7 px-2.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 active:scale-95 text-indigo-300 border border-indigo-400/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Tampilkan semua kelas dalam bentuk grid cepat"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Pilih Cepat ({selectedClassIds.length})</span>
            </button>

            {/* Scroll Navigation Arrows (For quick nudging) */}
            {selectedClassIds.length > 3 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleScrollClasses('left')}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                  title="Geser kelas ke kiri"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleScrollClasses('right')}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                  title="Geser kelas ke kanan"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Carousel Track with Left/Right Fading Edge Masks */}
        <div className="relative overflow-hidden p-2 sm:p-2.5">
          {/* Left Edge Fade Mask */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-10" />

          {/* Scrollable Classes Row */}
          <div
            ref={classScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar scroll-smooth px-1"
          >
            {selectedClassIds.map((cId) => {
              const session = classSessionsMap[cId.toLowerCase()];
              const clsStudents = students.filter(
                (s) => s.classId.toLowerCase() === cId.toLowerCase()
              );
              const subj = session ? findBestSubjectInSession(session, activeSubjectName) : null;
              const completedCount = subj ? Object.keys(subj.studentResults || {}).length : 0;
              const totalCount = clsStudents.length;
              const isCompleted = totalCount > 0 && completedCount >= totalCount;
              const isActive = activeClassId === cId;

              return (
                <button
                  key={cId}
                  data-class-id={cId}
                  type="button"
                  onClick={() => setActiveClassId(cId)}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-500/25 text-white border-2 border-indigo-400 shadow-md shadow-indigo-500/25 font-black scale-[1.02]'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  <span>Kelas {cId}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : completedCount > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {completedCount}/{totalCount}
                  </span>
                </button>
              );
            })}

            {/* Quick "+ Tambah Kelas" Pill */}
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Tambah atau kelola rombel kelas yang diampu untuk mapel ini"
            >
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              <span>+ Tambah Kelas</span>
            </button>
          </div>

          {/* Right Edge Fade Mask */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent z-10" />
        </div>
      </div>

      {/* ====================================================
          MODAL PILIH KELAS CEPAT (MOBILE BOTTOM SHEET / GRID)
          ==================================================== */}
      {showClassPickerModal && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowClassPickerModal(false);
          }}
        >
          <div className="w-full sm:max-w-lg bg-slate-900 border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Pilih Kelas / Rombel
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedClassIds.length} Kelas diampu untuk {activeSubjectName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClassPickerModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 gap-2.5">
              {selectedClassIds.map((cId) => {
                const session = classSessionsMap[cId.toLowerCase()];
                const clsStudents = students.filter(
                  (s) => s.classId.toLowerCase() === cId.toLowerCase()
                );
                const subj = session ? findBestSubjectInSession(session, activeSubjectName) : null;
                const completedCount = subj ? Object.keys(subj.studentResults || {}).length : 0;
                const totalCount = clsStudents.length;
                const isCompleted = totalCount > 0 && completedCount >= totalCount;
                const isActive = activeClassId === cId;
                const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => {
                      setActiveClassId(cId);
                      setShowClassPickerModal(false);
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-500/25 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400/30'
                        : 'bg-slate-950/50 hover:bg-slate-950/80 border-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">Kelas {cId}</span>
                      {isActive ? (
                        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {percent}%
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-400">Progres Nilai</span>
                        <span
                          className={`font-bold ${
                            isCompleted
                              ? 'text-emerald-300'
                              : completedCount > 0
                              ? 'text-amber-300'
                              : 'text-slate-500'
                          }`}
                        >
                          {completedCount}/{totalCount} Siswa
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isCompleted
                              ? 'bg-emerald-400'
                              : completedCount > 0
                              ? 'bg-amber-400'
                              : 'bg-slate-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Selected Class Dashboard Workspace */}
      <div className="bg-slate-900/95 sm:bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
        {/* Class Overview Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-black text-base shadow-[0_0_12px_rgba(99,102,241,0.15)] shrink-0">
              {activeClassId}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Lembar Nilai Kelas {activeClassId}
                </h3>
                <span className="text-xs text-slate-400">
                  ({activeClassStudents.length} Siswa Terdaftar)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Wali Kelas:{' '}
                <span className="text-slate-300 font-semibold">
                  {masterClasses.find((c) => c.id === activeClassId)?.waliKelas || '-'}
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons for this class (Responsive Grid on Mobile) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                if (activeClassSession && activeSubjectInSession) {
                  onOpenStudentInput(activeClassSession, activeSubjectInSession);
                }
              }}
              className="h-10 px-3.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 active:scale-[0.98] text-indigo-200 border border-indigo-400/30 font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(99,102,241,0.15)] cursor-pointer transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Input / Edit Nilai</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeClassSession && activeSubjectInSession) {
                  onOpenSubjectStats(activeClassSession, activeSubjectInSession);
                }
              }}
              className="h-10 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] text-sky-300 font-bold text-xs flex items-center justify-center gap-2 border border-white/10 cursor-pointer transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
              <span>Analisis Soal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const currentCls = masterClasses.find(
                  (c) => c.id.toLowerCase() === activeClassId.toLowerCase()
                );
                onOpenImport({
                  callerMode: 'GURU_BIDANG',
                  targetClassId: activeClassId,
                  targetClassName: currentCls?.name || activeClassId,
                  targetSubjectName: activeSubjectName || subjectName,
                  targetClassSession: activeClassSession,
                });
              }}
              className="h-10 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 active:scale-[0.98] text-purple-200 font-bold text-xs flex items-center justify-center gap-2 border border-purple-500/30 cursor-pointer transition-all shadow-[0_0_12px_rgba(168,85,247,0.15)]"
              title="Import file Excel nilai guru mapel untuk kelas ini"
            >
              <FolderUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Import Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportActiveClass}
              className="h-10 px-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-[0.98] text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(16,185,129,0.15)] border border-emerald-500/30 cursor-pointer transition-all"
              title="Unduh berkas Excel resmi rapi untuk kelas ini"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>Download Excel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSendTargetMode('single');
                setIsSendToPakZakiOpen(true);
              }}
              className="h-10 px-3.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 active:scale-[0.98] text-teal-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(20,184,166,0.15)] border border-teal-500/30 cursor-pointer transition-all"
              title="Kirim lembar analisis kelas ini langsung ke Pak Zaki"
            >
              <Send className="w-3.5 h-3.5 text-teal-300" />
              <span>Kirim ke Pak Zaki</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Metrics Cards */}
        {activeStats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-950/40 border border-white/10 rounded-xl p-3 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Siswa Terisi
              </span>
              <div className="text-lg font-black text-white mt-0.5">
                {activeStats.completedStudents} / {activeStats.totalStudents}
              </div>
            </div>

            <div className="bg-slate-950/40 border border-white/10 rounded-xl p-3 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Rata-rata Nilai
              </span>
              <div className="text-lg font-black text-sky-400 mt-0.5">
                {activeStats.averageGrade.toFixed(1)}
              </div>
            </div>

            <div className="bg-slate-950/40 border border-white/10 rounded-xl p-3 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tuntas (L)
              </span>
              <div className="text-lg font-black text-emerald-400 mt-0.5">
                {activeStats.passedCount} Siswa ({activeStats.passedPercentage.toFixed(0)}%)
              </div>
            </div>

            <div className="bg-slate-950/40 border border-white/10 rounded-xl p-3 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Remidi (TL)
              </span>
              <div className="text-lg font-black text-rose-400 mt-0.5">
                {activeStats.failedCount} Siswa
              </div>
            </div>

            <div className="bg-slate-950/40 border border-white/10 rounded-xl p-3 col-span-2 sm:col-span-1 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tertinggi / Terendah
              </span>
              <div className="text-lg font-black text-amber-300 mt-0.5">
                {activeStats.highestGrade} / {activeStats.lowestGrade}
              </div>
            </div>
          </div>
        )}

        {/* Student List Table & Search */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Daftar Siswa Kelas {activeClassId} ({filteredStudents.length})
            </h4>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama siswa..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full bg-slate-950/50 border border-white/10 focus:border-indigo-400/50 rounded-xl pl-8 pr-3 py-2 text-xs text-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/40">
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 sm:bg-slate-900/95 text-slate-300 uppercase text-[10px] font-extrabold sticky top-0 z-10 border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3 text-center">PG (/{pgCount})</th>
                    <th className="py-2.5 px-3 text-center">Isian (/{isianCount})</th>
                    <th className="py-2.5 px-3 text-center">{cType} (/{cCount})</th>
                    <th className="py-2.5 px-3 text-center">Total Skor</th>
                    <th className="py-2.5 px-3 text-center">Nilai Akhir</th>
                    <th className="py-2.5 px-3 text-center">Ket.</th>
                    <th className="py-2.5 px-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map((student, idx) => {
                    const rowData = studentRowDisplayMap.get(student.id) || {
                      isFilled: false,
                      finalGrade: null,
                      isPassed: false,
                      correctPg: '-',
                      correctIsian: '-',
                      correctC: '-',
                      totalScore: '-',
                    };

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {student.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-sky-300">
                          {rowData.correctPg}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-amber-300">
                          {rowData.correctIsian}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-purple-300">
                          {rowData.correctC}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-white font-mono">
                          {rowData.totalScore}
                        </td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-white text-sm font-mono">
                          {rowData.finalGrade !== null ? rowData.finalGrade : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {rowData.isFilled ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                rowData.isPassed
                                   ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {rowData.isPassed ? 'L' : 'TL'}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (activeClassSession && activeSubjectInSession) {
                                onOpenStudentInput(activeClassSession, activeSubjectInSession);
                              }
                            }}
                            className="px-3 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                          >
                            {rowData.isFilled ? 'Edit' : 'Input'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                        Tidak ada data siswa yang cocok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Edit Konfigurasi & Atur Bobot Soal */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 sm:bg-slate-950/80 backdrop-blur-none sm:backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="w-full max-w-3xl bg-slate-900 sm:bg-slate-900/90 backdrop-blur-none sm:backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Ubah Konfigurasi & Atur Bobot Soal
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mata Pelajaran: <span className="text-indigo-300 font-bold">{activeSubjectName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Info Pengampu & Ujian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nama Guru Pengampu
                  </label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd.I"
                    className="w-full bg-slate-950/50 border border-white/10 focus:border-indigo-400/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Standar KKTP / KKM
                  </label>
                  <PillStepper
                    value={kktp}
                    onChange={setKktp}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Konfigurasi Bobot & Jumlah Soal */}
              <div className="bg-slate-950/40 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Pengaturan Bobot & Jumlah Butir Soal
                  </h4>
                  <span className="text-[11px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                    Total Skor Maksimal: {maxScore}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* PG */}
                  <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">1. Pilihan Ganda</span>
                      <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-md">
                        PG
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Jumlah Soal PG
                      </label>
                      <PillStepper
                        value={pgCount}
                        onChange={setPgCount}
                        min={0}
                        max={100}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Bobot per Nomor
                      </label>
                      <PillStepper
                        value={pgWeight}
                        onChange={setPgWeight}
                        min={1}
                        max={20}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Isian */}
                  <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">2. Isian Singkat</span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                        IS
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Jumlah Soal Isian
                      </label>
                      <PillStepper
                        value={isianCount}
                        onChange={setIsianCount}
                        min={0}
                        max={100}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Bobot per Nomor
                      </label>
                      <PillStepper
                        value={isianWeight}
                        onChange={setIsianWeight}
                        min={1}
                        max={20}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Bagian C */}
                  <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">3. Bagian C</span>
                      <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-md">
                        {cType}
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Jenis Bagian C
                      </label>
                      <select
                        value={cType}
                        onChange={(e) => setCType(e.target.value as any)}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
                      >
                        <option value="Uraian">Uraian</option>
                        <option value="Essay">Essay</option>
                        <option value="Menjodohkan">Menjodohkan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Jumlah Soal {cType}
                      </label>
                      <PillStepper
                        value={cCount}
                        onChange={setCCount}
                        min={0}
                        max={100}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Bobot Maks. per Soal
                      </label>
                      <PillStepper
                        value={cWeight}
                        onChange={setCWeight}
                        min={1}
                        max={50}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Daftar Kelas yang Diampu */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Daftar Kelas yang Diampu ({selectedClassIds.length} Terpilih)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSelectPhase('ALL')}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer transition-all"
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPhase('FASE_A')}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer transition-all"
                    >
                      Kelas 1-2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPhase('FASE_B')}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer transition-all"
                    >
                      Kelas 3-4
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPhase('FASE_C')}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer transition-all"
                    >
                      Kelas 5-6
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {masterClasses.map((cls) => {
                    const isSelected = selectedClassIds.includes(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => handleToggleClass(cls.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/25 border-indigo-400/40 text-white font-black shadow-sm shadow-indigo-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs">Kelas {cls.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyConfig}
                className="px-5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 active:scale-[0.99] text-indigo-200 border border-indigo-400/30 font-bold text-xs cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.2)] transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-indigo-400" />
                <span>Simpan & Terapkan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Sesi */}
      {showDeleteSessionModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 sm:bg-slate-950/80 backdrop-blur-none sm:backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteSessionModal(false);
            }
          }}
        >
          <div className="w-full max-w-md bg-slate-900 sm:bg-slate-900/95 backdrop-blur-none sm:backdrop-blur-2xl border border-rose-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>

              <div>
                <h3 className="text-base font-black text-white">
                  Hapus Sesi Analisis?
                </h3>

                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Sesi{' '}
                  <span className="text-white font-bold">
                    {activeSubjectName}
                  </span>{' '}
                  untuk{' '}
                  <span className="text-white font-bold">
                    {selectedClassIds.length} kelas
                  </span>{' '}
                  akan dihapus dari aplikasi.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-[11px] text-amber-300 leading-relaxed">
                Pastikan Anda sudah menyimpan file Excel hasil analisis.
                Setelah sesi dihapus, data yang tersimpan di aplikasi
                tidak dapat dipulihkan kecuali dari file Excel.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowDeleteSessionModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDeleteCurrentSession}
                className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Ya, Hapus Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Ganti Sesi / Pilih Mata Pelajaran Lain */}
      {showSwitchSessionModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-none sm:backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowSwitchSessionModal(false);
          }}
        >
          <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.15)]">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Pilih & Kelola Sesi Analisis
                  </h3>
                  <p className="text-xs text-slate-400">
                    Beralih ke mata pelajaran lain atau buat sesi analisis baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchSessionModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                title="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Banner Keamanan Data */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-emerald-200/90 leading-relaxed font-medium">
                Data nilai dan progres seluruh sesi <strong>tersimpan aman secara otomatis</strong> di browser. Anda dapat berpindah sesi kapan saja tanpa khawatir kehilangan nilai yang sudah diisi.
              </p>
            </div>

            {/* List Mata Pelajaran yang Tersimpan */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Mata Pelajaran yang Tersedia ({availableSubjectsList.length})
                </label>
              </div>

              {availableSubjectsList.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {availableSubjectsList.map((item) => {
                    const isCurrent =
                      item.subjectName.toLowerCase() === activeSubjectName.toLowerCase();
                    return (
                      <div
                        key={item.subjectName}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isCurrent
                            ? 'bg-indigo-500/15 border-indigo-500/35 ring-1 ring-indigo-500/30'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-white truncate">
                              {item.subjectName}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold bg-indigo-500/25 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full">
                                Sedang Aktif
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                            {item.teacherName && (
                              <span className="text-amber-300 font-semibold truncate max-w-[140px]">
                                {item.teacherName}
                              </span>
                            )}
                            <span>•</span>
                            <span>{item.classIds.length} Rombel ({item.classIds.join(', ')})</span>
                            <span>•</span>
                            <span className="text-sky-300 font-semibold">
                              {item.completedStudents}/{item.totalStudents} Terisi
                            </span>
                          </div>
                        </div>

                        {!isCurrent ? (
                          <button
                            type="button"
                            onClick={() => handleSelectExistingSubject(item)}
                            className="px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/35 text-indigo-200 font-bold text-xs transition-all cursor-pointer shrink-0 shadow-sm flex items-center gap-1"
                          >
                            <span>Buka Sesi Ini</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-indigo-400 font-bold shrink-0 px-2 py-1 rounded-lg bg-indigo-500/10">
                            Aktif
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
                  Belum ada riwayat mata pelajaran lain yang tersimpan.
                </div>
              )}
            </div>

            {/* Opsi Buat / Setup Baru */}
            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-sky-200">
                  Ingin Mengatur Mata Pelajaran Baru?
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mata pelajaran aktif saat ini tetap tersimpan aman dan dapat dibuka kembali kapan saja.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartNewSubjectSetup}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-200 font-bold text-xs cursor-pointer transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-sky-300" />
                <span>+ Setup Mapel Baru</span>
              </button>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowSwitchSessionModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kirim ke Pak Zaki */}
      <SendToPakZakiModal
        isOpen={isSendToPakZakiOpen}
        onClose={() => setIsSendToPakZakiOpen(false)}
        submissionType={sendTargetMode === 'all' ? 'multi_class' : 'single_class'}
        subjectName={activeSubjectName}
        classId={sendTargetMode === 'all' ? selectedClassIds.join(', ') : activeClassId}
        className={
          sendTargetMode === 'all'
            ? selectedClassIds.map((c) => `Kelas ${c}`).join(', ')
            : `Kelas ${activeClassId}`
        }
        examType={examType}
        schoolYear={schoolYear}
        teacherName={teacherName}
        kktp={kktp}
        totalStudents={
          sendTargetMode === 'all'
            ? students.filter((s) => selectedClassIds.map((c) => c.toLowerCase()).includes(s.classId.toLowerCase())).length
            : activeClassStudents.length
        }
        completedStudents={
          sendTargetMode === 'all'
            ? Object.values(classSessionsMap).reduce((acc, sess) => {
                const subj = sess ? findBestSubjectInSession(sess, activeSubjectName) : null;
                return acc + (subj ? Object.keys(subj.studentResults || {}).length : 0);
              }, 0)
            : (activeStats?.completedStudents || 0)
        }
        passedStudents={activeStats?.passedCount}
        averageGrade={activeStats ? Math.round(activeStats.averageGrade) : undefined}
        payload={
          sendTargetMode === 'all'
            ? {
                mode: 'multi_class',
                subjectName: activeSubjectName,
                teacherName,
                examType,
                schoolYear,
                kktp,
                classSessionsMap,
                selectedClassIds,
                allStudents: students,
                masterClasses,
              }
            : {
                mode: 'single_class',
                activeClassSession,
                activeSubjectInSession,
                activeClassStudents,
              }
        }
      />

      {/* Analysis Submission Chat / Discussion Modal */}
      {activeSubjectSubmission && (
        <AnalysisSubmissionChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          submission={activeSubjectSubmission}
          currentUserRole="guru"
          currentUserName={getActiveTeacherSession()?.name || teacherName || 'Guru Mata Pelajaran'}
        />
      )}

      {/* Modal: Tambah Mata Pelajaran Baru (Tanpa Ganti Sesi & Tanpa Hilang Data) */}
      {isAddSubjectModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsAddSubjectModalOpen(false);
          }}
        >
          <div className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shadow-sm">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Tambah Mata Pelajaran Baru
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mata pelajaran aktif ({activeSubjectName}) tetap tersimpan aman dan dapat dibuka kembali kapan saja
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSubjectModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <div className="space-y-4">
              {/* Pilihan Mapel */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Pilih atau Ketik Nama Mata Pelajaran
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={newSubjIsCustom ? 'CUSTOM' : newSubjName}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setNewSubjIsCustom(true);
                        } else {
                          setNewSubjIsCustom(false);
                          setNewSubjName(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950/60 border border-white/10 focus:border-emerald-400/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none cursor-pointer"
                    >
                      {PRESET_SUBJECTS.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Mata Pelajaran Lainnya (Ketik Manual)</option>
                    </select>
                  </div>
                  {newSubjIsCustom && (
                    <div>
                      <input
                        type="text"
                        value={newSubjCustomText}
                        onChange={(e) => setNewSubjCustomText(e.target.value)}
                        placeholder="Ketik nama mata pelajaran baru..."
                        className="w-full bg-slate-950/60 border border-emerald-400/40 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Guru & KKTP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nama Guru Pengampu
                  </label>
                  <input
                    type="text"
                    value={newSubjTeacherName}
                    onChange={(e) => setNewSubjTeacherName(e.target.value)}
                    placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd.I"
                    className="w-full bg-slate-950/50 border border-white/10 focus:border-emerald-400/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Standar KKTP / KKM (≥ Nilai Lulus)
                  </label>
                  <PillStepper
                    value={newSubjKktp}
                    onChange={setNewSubjKktp}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Bobot Soal */}
              <div className="bg-slate-950/40 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Pengaturan Bobot &amp; Butir Soal
                  </h4>
                  <span className="text-[11px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                    Total Skor: {newSubjPgCount * newSubjPgWeight + newSubjIsianCount * newSubjIsianWeight + newSubjCCount * newSubjCWeight}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* PG */}
                  <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2.5">
                    <span className="text-xs font-bold text-slate-200">1. Pilihan Ganda (PG)</span>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Jumlah Soal</label>
                      <PillStepper value={newSubjPgCount} onChange={setNewSubjPgCount} min={0} max={100} className="w-full" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Bobot / Soal</label>
                      <PillStepper value={newSubjPgWeight} onChange={setNewSubjPgWeight} min={1} max={20} className="w-full" />
                    </div>
                  </div>

                  {/* Isian */}
                  <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2.5">
                    <span className="text-xs font-bold text-slate-200">2. Isian Singkat</span>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Jumlah Soal</label>
                      <PillStepper value={newSubjIsianCount} onChange={setNewSubjIsianCount} min={0} max={100} className="w-full" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Bobot / Soal</label>
                      <PillStepper value={newSubjIsianWeight} onChange={setNewSubjIsianWeight} min={1} max={20} className="w-full" />
                    </div>
                  </div>

                  {/* Bagian C */}
                  <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">3. Bagian C</span>
                      <select
                        value={newSubjCType}
                        onChange={(e) => setNewSubjCType(e.target.value as any)}
                        className="bg-slate-950 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-purple-300 font-bold"
                      >
                        <option value="Uraian">Uraian</option>
                        <option value="Essay">Essay</option>
                        <option value="Menjodohkan">Menjodohkan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Jumlah Soal</label>
                      <PillStepper value={newSubjCCount} onChange={setNewSubjCCount} min={0} max={100} className="w-full" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Bobot / Soal</label>
                      <PillStepper value={newSubjCWeight} onChange={setNewSubjCWeight} min={1} max={50} className="w-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Rombel Kelas yang Diampu */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Pilih Rombel Kelas yang Diampu ({newSubjTargetClasses.length} Terpilih)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setNewSubjTargetClasses(availableClassesForSchool.map(c => c.id))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer"
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSubjTargetClasses(availableClassesForSchool.filter(c => c.level === 1 || c.level === 2).map(c => c.id))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer"
                    >
                      Kelas 1-2
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSubjTargetClasses(availableClassesForSchool.filter(c => c.level === 3 || c.level === 4).map(c => c.id))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer"
                    >
                      Kelas 3-4
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSubjTargetClasses(availableClassesForSchool.filter(c => c.level === 5 || c.level === 6).map(c => c.id))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] font-bold text-slate-300 cursor-pointer"
                    >
                      Kelas 5-6
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {masterClasses.map((cls) => {
                    const isSelected = newSubjTargetClasses.includes(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          setNewSubjTargetClasses(prev =>
                            prev.includes(cls.id) ? prev.filter(id => id !== cls.id) : [...prev, cls.id].sort()
                          );
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/25 border-emerald-400/40 text-white font-black shadow-sm shadow-emerald-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs">Kelas {cls.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddSubjectModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNewSubject}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan &amp; Buka Mapel Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
