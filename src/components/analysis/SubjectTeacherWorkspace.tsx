import React, { useState, useEffect, useMemo } from 'react';
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
  Edit3,
  Search,
  Check,
  RotateCcw,
  BarChart3,
  Layers,
  FileSpreadsheet,
  Settings2,
  ChevronRight,
  AlertCircle,
  Building2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  AnalysisSession,
  AnalysisSubject,
  ExamType,
  AnalysisQuestionConfig,
  StudentAnswers,
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
import { PillStepper } from './PillStepper';

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
  onOpenImport: () => void;

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
  const [examType, setExamType] = useState<ExamType>('SAS');
  const [schoolYear, setSchoolYear] = useState<string>('2026/2027');
  const [kktp, setKktp] = useState<number>(70);
  const [analysisDate, setAnalysisDate] = useState<string>(
    new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );

  // Question configuration
  const [pgCount, setPgCount] = useState<number>(20);
  const [pgWeight, setPgWeight] = useState<number>(1);
  const [isianCount, setIsianCount] = useState<number>(5);
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
  const [showSwitchSessionModal, setShowSwitchSessionModal] = useState<boolean>(false);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState<boolean>(false);
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [batchDownloadStatus, setBatchDownloadStatus] = useState<string | null>(null);

  // Load class sessions map from storage
  const [classSessionsMap, setClassSessionsMap] = useState<Record<string, AnalysisSession>>({});

  const reloadSessions = () => {
    const all = getAllClassSessions();
    setClassSessionsMap(all);
  };

  useEffect(() => {
    reloadSessions();
  }, [refreshKey]);

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
  }, []);

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
        const key = subj.subjectName.toLowerCase().trim();
        if (!map[key]) {
          map[key] = {
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
          if (!map[key].classIds.includes(sess.classId)) {
            map[key].classIds.push(sess.classId);
          }
        }
        const clsStudents = students.filter(
          (s) => s.classId.toLowerCase() === sess.classId.toLowerCase()
        );
        map[key].totalStudents += clsStudents.length;
        map[key].completedStudents += Object.keys(subj.studentResults || {}).length;
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

  // Handler: Mulai setup mata pelajaran / sesi baru dari awal
  const handleStartNewSubjectSetup = () => {
    setIsConfigured(false);
    setShowSwitchSessionModal(false);
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
    const match = activeClassSession.subjects.find(
      (s) => s.subjectName.toLowerCase() === activeSubjectName.toLowerCase()
    );
    return match || activeClassSession.subjects[0] || null;
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
        <div className="relative bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 overflow-hidden">
          {/* Ambient Top Glow */}
          <div className="absolute -top-12 -right-12 w-64 h-32 bg-indigo-500/10 blur-3xl pointer-events-none -z-10" />

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
                  <option value="SAS">SAS (Sumatif Akhir Semester)</option>
                  <option value="SAT">SAT (Sumatif Akhir Tahun)</option>
                  <option value="STS 1">STS 1 (Sumatif Tengah Semester 1)</option>
                  <option value="STS 2">STS 2 (Sumatif Tengah Semester 2)</option>
                  <option value="PTS">PTS (Penilaian Tengah Semester)</option>
                  <option value="PAS">PAS (Penilaian Akhir Semester)</option>
                  <option value="PAT">PAT (Penilaian Akhir Tahun)</option>
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
      {/* Top Banner Guru Bidang */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-10 -right-10 w-64 h-32 bg-indigo-500/10 blur-3xl pointer-events-none -z-10" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          {/* Info Utama Mapel */}
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
                <BookOpen className="w-3 h-3 text-indigo-400" />
                <span>{activeSubjectName}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-white/5 text-sky-300 border border-white/10">
                <Building2 className="w-3 h-3 text-sky-400" />
                <span>{selectedSchool || DEFAULT_SCHOOL_NAME}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-white/5 text-sky-300 border border-white/10">
                <GraduationCap className="w-3 h-3 text-sky-400" />
                <span>{selectedClassIds.length} Kelas Diampu</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-purple-500/20 text-purple-200 border border-purple-500/30">
                <FileText className="w-3 h-3 text-purple-300" />
                <span>{examType}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-white/5 text-slate-300 border border-white/10">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>TP {schoolYear}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Target className="w-3 h-3 text-amber-400" />
                <span>KKTP: {kktp}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <h2 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-tight">
                Workspace Analisis {activeSubjectName}
              </h2>
              {teacherName && (
                <div className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Guru Pengampu: {teacherName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Top Banner (Responsive Grid on Mobile) */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
            <button
              type="button"
              onClick={handleExportAllClasses}
              className="h-10 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-[0.98] text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(16,185,129,0.15)] border border-emerald-500/30 cursor-pointer transition-all"
              title="Download berkas Excel untuk semua kelas yang diajar"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300 stroke-[2.5]" />
              <span>Download Excel Semua Kelas</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 active:scale-[0.98] text-purple-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-purple-500/30 cursor-pointer transition-all shadow-[0_0_12px_rgba(168,85,247,0.15)]"
              title="Edit struktur & bobot butir soal atau daftar kelas"
            >
              <Settings2 className="w-3.5 h-3.5 text-purple-300" />
              <span>Edit Bobot & Soal</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteSessionModal(true)}
              className="h-10 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-[0.98] text-rose-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-rose-500/30 cursor-pointer transition-all"
              title="Hapus sesi analisis mata pelajaran ini"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Hapus Sesi</span>
            </button>
          </div>
        </div>

        {batchDownloadStatus && (
          <div className="mt-3 text-xs font-semibold text-sky-300 bg-sky-950/60 border border-sky-500/30 px-3.5 py-2 rounded-xl">
            {batchDownloadStatus}
          </div>
        )}
      </div>

      {/* Class Switcher Tabs (Horizontal Pills) */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 flex items-center gap-2 overflow-x-auto select-none shadow-sm">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0 flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
          Pilih Kelas:
        </span>
        <div className="flex items-center gap-1.5">
          {selectedClassIds.map((cId) => {
            const session = classSessionsMap[cId.toLowerCase()];
            const clsStudents = students.filter(
              (s) => s.classId.toLowerCase() === cId.toLowerCase()
            );
            const subj = session?.subjects.find(
              (s) => s.subjectName.toLowerCase() === activeSubjectName.toLowerCase()
            );
            const completedCount = subj ? Object.keys(subj.studentResults).length : 0;
            const totalCount = clsStudents.length;
            const isCompleted = totalCount > 0 && completedCount >= totalCount;
            const isActive = activeClassId === cId;

            return (
              <button
                key={cId}
                type="button"
                onClick={() => setActiveClassId(cId)}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-500/25 text-white border border-indigo-400/40 shadow-sm shadow-indigo-500/20 font-black'
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
        </div>
      </div>

      {/* Selected Class Dashboard Workspace */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
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
              onClick={onOpenImport}
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
                <thead className="bg-white/5 text-slate-300 uppercase text-[10px] font-extrabold sticky top-0 z-10 border-b border-white/10 backdrop-blur-md">
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
                    const res = activeSubjectInSession?.studentResults[student.id];
                    const isFilled = !!res;
                    const finalGrade = res ? Math.round(res.finalGrade) : null;
                    const isPassed = res ? res.isPassed : false;
                    const correctPg = res?.answers?.pg ? res.answers.pg.filter((v) => v > 0).length : '-';
                    const correctIsian = res?.answers?.isian ? res.answers.isian.filter((v) => v > 0).length : '-';
                    const correctC = res?.answers?.c ? res.answers.c.filter((v) => v > 0).length : '-';

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
                          {correctPg}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-amber-300">
                          {correctIsian}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-purple-300">
                          {correctC}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-white font-mono">
                          {res ? res.totalScore : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-white text-sm font-mono">
                          {finalGrade !== null ? finalGrade : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {res ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                isPassed
                                   ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {isPassed ? 'L' : 'TL'}
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
                            {isFilled ? 'Edit' : 'Input'}
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="w-full max-w-3xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
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
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteSessionModal(false);
            }
          }}
        >
          <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-2xl border border-rose-500/30 rounded-2xl sm:rounded-3xl p-6 shadow-2xl text-slate-100">
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowSwitchSessionModal(false);
          }}
        >
          <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.15)]">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Ganti Sesi Mata Pelajaran
                  </h3>
                  <p className="text-xs text-slate-400">
                    Beralih ke mata pelajaran lain yang sudah tersimpan atau buat sesi baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchSessionModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* List Mata Pelajaran yang Tersimpan */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Mata Pelajaran yang Tersedia di Sistem
              </label>

              {availableSubjectsList.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {availableSubjectsList.map((item) => {
                    const isCurrent =
                      item.subjectName.toLowerCase() === activeSubjectName.toLowerCase();
                    return (
                      <div
                        key={item.subjectName}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isCurrent
                            ? 'bg-indigo-500/15 border-indigo-500/30'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white">
                              {item.subjectName}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                                Sedang Aktif
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            {item.teacherName && (
                              <span className="text-amber-300 font-semibold">
                                {item.teacherName}
                              </span>
                            )}
                            <span>•</span>
                            <span>{item.classIds.length} Kelas ({item.classIds.join(', ')})</span>
                            <span>•</span>
                            <span className="text-sky-300">
                              {item.completedStudents}/{item.totalStudents} Nilai Terisi
                            </span>
                          </div>
                        </div>

                        {!isCurrent ? (
                          <button
                            type="button"
                            onClick={() => handleSelectExistingSubject(item)}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 font-bold text-xs transition-all cursor-pointer shrink-0 shadow-sm"
                          >
                            Pilih Sesi Ini
                          </button>
                        ) : (
                          <span className="text-xs text-indigo-400 font-bold shrink-0">
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
            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-sky-300">
                  Ingin Mengatur Mata Pelajaran Baru?
                </h4>
                <p className="text-[11px] text-slate-400">
                  Kembali ke form setup awal untuk memilih mapel dan mengatur konfigurasi baru.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartNewSubjectSetup}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 font-bold text-xs cursor-pointer transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(14,165,233,0.15)]"
              >
                <Plus className="w-3.5 h-3.5 text-sky-300" />
                <span>+ Setup Mapel Baru</span>
              </button>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end">
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
    </div>
  );
};
