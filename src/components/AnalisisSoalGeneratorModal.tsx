import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  X,
  Sparkles,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BookOpen,
  Users,
  Layers,
  FolderOpen,
  HelpCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { subscribeToStudents, Student } from '../services/studentStorage';
import { getStoredMasterClasses } from '../services/storage';
import { MasterClass, MASTER_CLASSES } from '../data/masterExamData';
import {
  AnalysisSession,
  AnalysisSubject,
  ExamType,
  AnalysisQuestionConfig,
} from '../types/analysisTypes';
import {
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  createNewSession,
  addSubjectToSession,
  removeSubjectFromSession,
  saveStudentSubjectResult,
} from '../services/analysis/analysisSessionService';
import { SessionSetupCard } from './analysis/SessionSetupCard';
import { SessionDashboard } from './analysis/SessionDashboard';
import { SubjectTeacherWorkspace } from './analysis/SubjectTeacherWorkspace';
import { SubjectConfigModal } from './analysis/SubjectConfigModal';
import { StudentAnswerInputModal } from './analysis/StudentAnswerInputModal';
import { SessionRekapModal } from './analysis/SessionRekapModal';
import { SubjectStatsModal } from './analysis/SubjectStatsModal';
import { ImportAnalysisModal } from './analysis/ImportAnalysisModal';
import { PillStepper } from './analysis/PillStepper';
import {
  getSessionForClass,
  getOrCreateSessionForClass,
} from '../services/analysis/analysisSessionService';
import { verifyActiveTokenRealtime } from '../services/tokenAuthService';
import { isAdminLoggedIn } from '../services/auth';
import { useModalNavigation } from '../utils/modalNavigation';

interface AnalisisSoalGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalisisSoalGeneratorModal: React.FC<AnalisisSoalGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [masterClasses, setMasterClasses] = useState<MasterClass[]>(MASTER_CLASSES);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(true);

  // Active Session state
  const [activeSession, setActiveSession] = useState<AnalysisSession | null>(null);

  // Persona Mode: 'WALI_KELAS' | 'GURU_BIDANG' | 'LEGACY_BLANK'
  const [personaMode, setPersonaMode] = useState<'WALI_KELAS' | 'GURU_BIDANG' | 'LEGACY_BLANK'>('WALI_KELAS');

  // Sub-modal states
  const [isSubjectConfigOpen, setIsSubjectConfigOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<AnalysisSubject | null>(null);

  const [isStudentInputOpen, setIsStudentInputOpen] = useState(false);
  const [activeInputSubject, setActiveInputSubject] = useState<AnalysisSubject | null>(null);
  const [teacherWorkspaceRefreshKey, setTeacherWorkspaceRefreshKey] = useState(0);

  const [isRekapOpen, setIsRekapOpen] = useState(false);

  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [activeStatsSubject, setActiveStatsSubject] = useState<AnalysisSubject | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  // Legacy Blank Template Form State
  const [blankClassId, setBlankClassId] = useState<string>('');
  const [blankPgCount, setBlankPgCount] = useState<string>('20');
  const [blankIsianCount, setBlankIsianCount] = useState<string>('5');
  const [blankTypeC, setBlankTypeC] = useState<'Essay/Uraian' | 'Menjodohkan'>('Essay/Uraian');
  const [blankCCount, setBlankCCount] = useState<string>('5');
  const [blankStatus, setBlankStatus] = useState<{
    type: 'loading' | 'success' | 'error';
    message: string;
  } | null>(null);

  // Load master classes & check local storage on mount
  useEffect(() => {
    try {
      const classes = getStoredMasterClasses();
      if (classes && classes.length > 0) {
        setMasterClasses(classes);
        if (!blankClassId) {
          setBlankClassId(classes[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading master classes:', err);
    }

    // Load active session from cache
    const saved = getActiveSession();
    if (saved) {
      setActiveSession(saved);
    }
  }, [blankClassId]);

  // Subscribe to students in realtime
  useEffect(() => {
    setIsLoadingStudents(true);
    const unsubscribe = subscribeToStudents(
      (data) => {
        setStudents(data);
        setIsLoadingStudents(false);
      },
      (err) => {
        console.error('Failed to load students:', err);
        setIsLoadingStudents(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time security watchdog: if admin revokes token or removes device while modal is open, auto close modal
  useEffect(() => {
    if (!isOpen) return;
    if (isAdminLoggedIn()) return; // Admin is exempt

    const checkInterval = setInterval(async () => {
      try {
        const { isValid, message } = await verifyActiveTokenRealtime('analysis', false);
        if (!isValid) {
          alert(`Sesi akses berakhir: ${message || 'Lisensi token telah dinonaktifkan atau masa aktif habis.'}`);
          onClose();
        }
      } catch (err) {
        console.error('Error during token watchdog check:', err);
      }
    }, 45000); // Check every 45s

    return () => clearInterval(checkInterval);
  }, [isOpen, onClose]);

  // Intercept phone back button so modal closes gracefully without leaving the web
  useModalNavigation('analisis-soal-generator', isOpen, onClose);

  if (!isOpen) return null;

  // Active class object
  const currentActiveClass = masterClasses.find(
    (c) => c.id.toLowerCase() === (activeSession?.classId || '').toLowerCase()
  ) || null;

  // Handler: Start New Session from Setup Card
  const handleStartSession = (data: {
    schoolName?: string;
    classId: string;
    className: string;
    examType: ExamType;
    schoolYear: string;
    teacherName: string;
    analysisDate: string;
    kktp: number;
  }) => {
    const classStudents = students.filter(
      (s) =>
        s.classId.toLowerCase() === data.classId.toLowerCase() &&
        (!data.schoolName || !s.schoolName || s.schoolName.toLowerCase() === data.schoolName.toLowerCase())
    );
    const newSession = createNewSession({
      ...data,
      students: classStudents,
    });
    setActiveSession(newSession);
  };

  // Handler: Add / Update Subject in Session
  const handleSaveSubjectConfig = (data: {
    subjectId: string;
    subjectName: string;
    teacherName?: string;
    config: AnalysisQuestionConfig;
  }) => {
    if (!activeSession) return;
    const classStudents = students.filter(
      (s) => s.classId.toLowerCase() === activeSession.classId.toLowerCase()
    );
    const updated = addSubjectToSession(activeSession, {
      ...data,
      students: classStudents,
    });
    setActiveSession(updated);
    setIsSubjectConfigOpen(false);
    setEditingSubject(null);
  };

  // Handler: Save Student Result
const handleSaveStudentResult = (
  subjectId: string,
  result: {
    studentId: string;
    studentName: string;
    answers: import('../types/analysisTypes').StudentAnswers;
  }
) => {
  if (!activeSession) return;

  const updated = saveStudentSubjectResult(
    activeSession,
    subjectId,
    result
  );

  // Update session utama
  setActiveSession(updated);

  // Penting:
  // Update subject yang sedang dibuka di modal agar
  // data studentResults langsung terlihat tanpa harus
  // menutup modal terlebih dahulu.
  const updatedSubject = updated.subjects.find(
    (s) => s.subjectId === subjectId
  );

  if (updatedSubject) {
    setActiveInputSubject(updatedSubject);
  }
};

  // Handler: Delete Subject
  const handleDeleteSubject = (subjectId: string) => {
    if (!activeSession) return;
    const updated = removeSubjectFromSession(activeSession, subjectId);
    setActiveSession(updated);
  };

  // Handler: Reset Session
  const handleResetSession = () => {
    setIsConfirmResetOpen(true);
  };

  const handleConfirmReset = () => {
    clearActiveSession();
    setActiveSession(null);
    setIsConfirmResetOpen(false);
  };

  // Handler: Legacy Blank Excel Generator
  const handleGenerateBlankExcel = () => {
    setBlankStatus(null);
    if (!blankClassId) {
      setBlankStatus({ type: 'error', message: 'Silakan pilih kelas.' });
      return;
    }

    const pg = parseInt(blankPgCount, 10);
    const isian = parseInt(blankIsianCount, 10);
    const c = parseInt(blankCCount, 10);

    if (isNaN(pg) || isNaN(isian) || isNaN(c) || pg < 0 || isian < 0 || c < 0) {
      setBlankStatus({
        type: 'error',
        message: 'Jumlah soal harus berupa angka valid (minimal 0).',
      });
      return;
    }

    if (pg + isian + c === 0) {
      setBlankStatus({ type: 'error', message: 'Jumlah butir soal tidak boleh 0.' });
      return;
    }

    const classStudents = students.filter(
      (s) => s.classId.toLowerCase() === blankClassId.toLowerCase()
    );
    if (classStudents.length === 0) {
      setBlankStatus({
        type: 'error',
        message: 'Belum ada data siswa untuk kelas ini di menu Data Siswa.',
      });
      return;
    }

    setBlankStatus({ type: 'loading', message: 'Membuat Excel...' });

    try {
      const sortedStudents = [...classStudents].sort((a, b) =>
        a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
      );
      const foundCls = masterClasses.find((cls) => cls.id === blankClassId);
      const className = foundCls ? foundCls.name : blankClassId;
      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `Template_Analisis_Kosong_Kelas_${className}_${todayStr}.xlsx`;

      const wsData: any[][] = [];
      wsData.push(['YAYASAN DAARUL FIKRI TIGARAKSA']);
      wsData.push(['SEKOLAH DASAR ISLAM TERPADU (SDIT) AL FIKRI']);
      wsData.push(['LEMBAR ANALISIS BUTIR SOAL & CAPAIAN UJIAN']);
      wsData.push([]);
      wsData.push(['Mata Pelajaran', ':', '', '', 'Kelas', ':', className]);
      wsData.push(['Guru Pengampu', ':', '', '', 'Tahun Pelajaran', ':', '2025/2026']);
      wsData.push(['Jenis Ujian', ':', '', '', 'Tanggal', ':', todayStr]);
      wsData.push([]);

      const headerRow: string[] = ['No', 'Nama Peserta Didik'];
      for (let i = 1; i <= pg; i++) headerRow.push(`PG ${i}`);
      for (let i = 1; i <= isian; i++) headerRow.push(`IS ${i}`);
      const partCLabel = blankTypeC === 'Essay/Uraian' ? 'UR' : 'MJ';
      for (let i = 1; i <= c; i++) headerRow.push(`${partCLabel} ${i}`);
      headerRow.push('Jml Benar', 'Total Skor', 'Nilai Akhir', 'Keterangan');
      wsData.push(headerRow);

      const totalQ = pg + isian + c;
      const startRow = 10;

      sortedStudents.forEach((student, index) => {
        const rowNum = startRow + index;
        const row: any[] = [index + 1, student.name];
        for (let q = 0; q < totalQ; q++) row.push('');

        const firstCol = XLSX.utils.encode_col(2);
        const lastCol = XLSX.utils.encode_col(2 + totalQ - 1);
        const formulaSum = `=SUM(${firstCol}${rowNum}:${lastCol}${rowNum})`;

        row.push({ t: 'n', f: formulaSum, v: '' });
        row.push({ t: 'n', f: formulaSum, v: '' });
        row.push({ t: 'n', f: `=ROUND((${XLSX.utils.encode_col(2 + totalQ + 1)}${rowNum}/${totalQ})*100, 2)`, v: '' });
        row.push({ t: 's', f: `=IF(${XLSX.utils.encode_col(2 + totalQ + 2)}${rowNum}>=70, "L", "TL")`, v: '' });

        wsData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Analisis ${className}`);
      XLSX.writeFile(wb, filename);

      setBlankStatus({
        type: 'success',
        message: `Berhasil mengunduh template Excel kosong untuk Kelas ${className}!`,
      });
    } catch (err: any) {
      console.error('Error generating blank Excel:', err);
      setBlankStatus({
        type: 'error',
        message: `Gagal membuat file Excel: ${err.message || 'Error'}`,
      });
    }
  };

  // Handler: Switch Class in Mode Wali Kelas
  const handleSwitchClass = (targetClassId: string) => {
    const existing = getSessionForClass(targetClassId);
    if (existing) {
      setActiveSession(existing);
    } else {
      const found = masterClasses.find(
        (c) => c.id.toLowerCase() === targetClassId.toLowerCase()
      );
      const classStudents = students.filter(
        (s) => s.classId.toLowerCase() === targetClassId.toLowerCase()
      );
      const newSess = getOrCreateSessionForClass({
        classId: targetClassId,
        className: found ? found.name : targetClassId,
        examType: activeSession?.examType || 'SAS',
        schoolYear: activeSession?.schoolYear || '2025/2026',
        teacherName: found?.waliKelas || '',
        kktp: activeSession?.kktp || 70,
        students: classStudents,
      });
      setActiveSession(newSess);
    }
  };

  // Handler: Open Student Input from Mode Guru Bidang
  const handleOpenStudentInputFromTeacher = (
    session: AnalysisSession,
    subject: AnalysisSubject
  ) => {
    setActiveSession(session);
    setActiveInputSubject(subject);
    setIsStudentInputOpen(true);
  };

  // Handler: Open Subject Stats from Mode Guru Bidang
  const handleOpenSubjectStatsFromTeacher = (
    session: AnalysisSession,
    subject: AnalysisSubject
  ) => {
    setActiveSession(session);
    setActiveStatsSubject(subject);
    setIsStatsOpen(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 sm:items-center sm:justify-center sm:p-4 sm:bg-slate-950/80 backdrop-blur-md animate-[fadeIn_200ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[94vh] sm:max-w-6xl flex flex-col bg-slate-900 border-0 sm:border sm:border-white/10 rounded-none sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden text-slate-100">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 w-80 h-24 bg-sky-500/10 blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-0 right-1/4 w-80 h-24 bg-indigo-500/10 blur-3xl pointer-events-none -z-10" />

        {/* ====================================================
            TOP MODAL HEADER (Responsive 2-Row on Mobile, Safe-Area Protected)
            ==================================================== */}
        <div className="px-4 sm:px-7 py-3 sm:py-4 pt-[max(0.625rem,env(safe-area-inset-top))] bg-slate-950/50 backdrop-blur-md border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Top Line on Mobile / Left Column on Desktop */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.15)] shrink-0">
                <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-tight">
                    Generator & Workspace Analisis Soal
                  </h2>
                  <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/15 text-sky-300 border border-sky-400/25">
                    SDIT AL FIKRI
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">
                  Dual Mode: Wali Kelas (Per-Kelas) & Guru Bidang (Multi-Kelas)
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Line on Mobile / Right Column on Desktop */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
            {/* Dual Mode Persona Switcher (Glass Capsule) */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950/60 border border-white/10 gap-1 w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => setPersonaMode('WALI_KELAS')}
                className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  personaMode === 'WALI_KELAS'
                    ? 'bg-sky-500/25 text-sky-200 border border-sky-400/35 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
                title="Kelola seluruh mata pelajaran untuk satu kelas"
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Wali Kelas</span>
              </button>

              <button
                type="button"
                onClick={() => setPersonaMode('GURU_BIDANG')}
                className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  personaMode === 'GURU_BIDANG'
                    ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/35 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
                title="Kelola 1 mata pelajaran untuk banyak kelas sekaligus"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Guru Bidang</span>
              </button>

              <button
                type="button"
                onClick={() => setPersonaMode('LEGACY_BLANK')}
                className={`flex-1 sm:flex-none px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  personaMode === 'LEGACY_BLANK'
                    ? 'bg-white/15 text-white border border-white/20 shadow-md'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
                title="Download template kosong Excel"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline sm:hidden md:inline">Kosong</span>
              </button>
            </div>

            {/* Desktop Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:flex w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white items-center justify-center transition-all cursor-pointer shrink-0"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ====================================================
            MODAL BODY
            ==================================================== */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-7 overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          {personaMode === 'WALI_KELAS' ? (
            /* 1. MODE WALI KELAS (PER-KELAS) */
            activeSession ? (
              <SessionDashboard
                session={activeSession}
                masterClasses={masterClasses}
                students={students}
                onAddSubject={() => {
                  setEditingSubject(null);
                  setIsSubjectConfigOpen(true);
                }}
                onEditSubjectConfig={(subj) => {
                  setEditingSubject(subj);
                  setIsSubjectConfigOpen(true);
                }}
                onOpenStudentInput={(subj) => {
                  setActiveInputSubject(subj);
                  setIsStudentInputOpen(true);
                }}
                onOpenSubjectStats={(subj) => {
                  setActiveStatsSubject(subj);
                  setIsStatsOpen(true);
                }}
                onOpenRekap={() => setIsRekapOpen(true)}
                onOpenImport={() => setIsImportOpen(true)}
                onResetSession={handleResetSession}
                onDeleteSubject={handleDeleteSubject}
                onSwitchClass={handleSwitchClass}
              />
            ) : (
              <SessionSetupCard
                masterClasses={masterClasses}
                students={students}
                personaMode={personaMode}
                setPersonaMode={setPersonaMode}
                onStartSession={handleStartSession}
                onOpenImport={() => setIsImportOpen(true)}
              />
            )
          ) : personaMode === 'GURU_BIDANG' ? (
            /* 2. MODE GURU BIDANG (PER-MAPEL MULTI-KELAS) */
            <SubjectTeacherWorkspace
              masterClasses={masterClasses}
              students={students}
              onOpenStudentInput={handleOpenStudentInputFromTeacher}
              onOpenSubjectStats={handleOpenSubjectStatsFromTeacher}
              onOpenImport={() => setIsImportOpen(true)}
              refreshKey={teacherWorkspaceRefreshKey}
            />
          ) : (
            /* 3. GENERATOR TEMPLATE KOSONG (KLASIK) */
            <div className="max-w-xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xl">
              <div className="pb-4 border-b border-white/10">
                <h3 className="text-base sm:text-lg font-bold text-white">Generator Template Excel Kosong</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Unduh format lembar analisis butir soal kosong dengan daftar nama siswa yang terisi otomatis.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Pilih Kelas
                  </label>
                  <select
                    value={blankClassId}
                    onChange={(e) => setBlankClassId(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-sky-400 transition-colors"
                  >
                    {masterClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Kelas {cls.name} ({cls.levelName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Jumlah Soal PG
                    </label>
                    <PillStepper
                      value={Number(blankPgCount) || 0}
                      onChange={(v) => setBlankPgCount(String(v))}
                      min={0}
                      max={100}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Jumlah Soal Isian
                    </label>
                    <PillStepper
                      value={Number(blankIsianCount) || 0}
                      onChange={(v) => setBlankIsianCount(String(v))}
                      min={0}
                      max={100}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Jenis Bagian C
                    </label>
                    <select
                      value={blankTypeC}
                      onChange={(e) => setBlankTypeC(e.target.value as any)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-sky-400 cursor-pointer transition-colors"
                    >
                      <option value="Essay/Uraian">Essay / Uraian</option>
                      <option value="Menjodohkan">Menjodohkan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Jumlah Bagian C
                    </label>
                    <PillStepper
                      value={Number(blankCCount) || 0}
                      onChange={(v) => setBlankCCount(String(v))}
                      min={0}
                      max={100}
                      className="w-full"
                    />
                  </div>
                </div>

                {blankStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      blankStatus.type === 'error'
                        ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                        : blankStatus.type === 'success'
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-sky-500/15 border border-sky-500/30 text-sky-300'
                    }`}
                  >
                    {blankStatus.type === 'error' && <AlertCircle className="w-4 h-4" />}
                    {blankStatus.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {blankStatus.type === 'loading' && (
                      <span className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{blankStatus.message}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerateBlankExcel}
                  className="w-full py-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-200 font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.2)] cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File Excel Kosong (.xlsx)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
            SUB-MODALS
            ==================================================== */}
        {/* 1. Subject Config Modal */}
        <SubjectConfigModal
          isOpen={isSubjectConfigOpen}
          onClose={() => {
            setIsSubjectConfigOpen(false);
            setEditingSubject(null);
          }}
          activeClass={currentActiveClass}
          defaultTeacherName={activeSession?.teacherName}
          existingSubject={editingSubject}
          onSave={handleSaveSubjectConfig}
        />

        {/* 2. Student Answer Input Modal */}
        {activeSession && activeInputSubject && (
          <StudentAnswerInputModal
            isOpen={isStudentInputOpen}
            onClose={() => {
              setIsStudentInputOpen(false);
              setActiveInputSubject(null);
              setTeacherWorkspaceRefreshKey((prev) => prev + 1);
            }}
            session={activeSession}
            subject={activeInputSubject}
            students={students.filter(
              (s) => s.classId.toLowerCase() === activeSession.classId.toLowerCase()
            )}
            onSaveStudentResult={handleSaveStudentResult}
          />
        )}

        {/* 3. Session Rekap Modal */}
        {activeSession && (
          <SessionRekapModal
            isOpen={isRekapOpen}
            onClose={() => setIsRekapOpen(false)}
            session={activeSession}
            students={students.filter(
              (s) => s.classId.toLowerCase() === activeSession.classId.toLowerCase()
            )}
          />
        )}

        {/* 4. Subject Stats Modal */}
        {activeSession && activeStatsSubject && (
          <SubjectStatsModal
            isOpen={isStatsOpen}
            onClose={() => {
              setIsStatsOpen(false);
              setActiveStatsSubject(null);
            }}
            session={activeSession}
            subject={activeStatsSubject}
            students={students.filter(
              (s) => s.classId.toLowerCase() === activeSession.classId.toLowerCase()
            )}
          />
        )}

        {/* 5. Import Analysis Modal */}
        <ImportAnalysisModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          activeSession={activeSession}
          students={
            activeSession
              ? students.filter(
                  (s) => s.classId.toLowerCase() === activeSession.classId.toLowerCase()
                )
              : students
          }
          onImportComplete={(updatedSession) => {
            setActiveSession(updatedSession);
            setIsImportOpen(false);
          }}
        />

        {/* 6. Modal Konfirmasi Ganti / Mulai Sesi Baru */}
        {isConfirmResetOpen && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsConfirmResetOpen(false);
            }}
          >
            <div className="w-full max-w-md bg-[#131722] border border-[#2B354C] rounded-2xl shadow-2xl text-slate-100 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[#222A3C]">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ganti / Mulai Sesi Baru?</h3>
                  <p className="text-xs text-slate-400">Tutup sesi analisis yang sedang aktif</p>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 leading-relaxed bg-[#0E121B] p-3.5 rounded-xl border border-[#222A3C]">
                <p>
                  Sesi aktif untuk <strong className="text-cyan-300">Kelas {activeSession?.className} ({activeSession?.examType})</strong> akan ditutup dan Anda akan kembali ke menu pengaturan sesi awal untuk memilih kelas atau ujian lain.
                </p>
                <p className="text-amber-400 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Pastikan Anda telah mengunduh Excel proyek jika ingin menyimpan salinan sesi ini.</span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#222A3C]">
                <button
                  type="button"
                  onClick={() => setIsConfirmResetOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Ya, Ganti Sesi Baru</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
