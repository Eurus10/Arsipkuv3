import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  BookOpen,
  Calendar,
  UserCheck,
  Target,
  FolderOpen,
  CheckCircle2,
  Users,
  Building2,
  BarChart2,
  ArrowRight,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { MasterClass } from '../../data/masterExamData';
import { Student, getStoredSchools, DEFAULT_SCHOOL_NAME } from '../../services/studentStorage';
import { ExamType, AnalysisSession } from '../../types/analysisTypes';
import { PillStepper } from './PillStepper';
import { getEraporHomeroomForClass } from '../../services/analysis/eraporHomeroomBridge';
import { getAllClassSessions } from '../../services/analysis/analysisSessionService';

interface SessionSetupCardProps {
  masterClasses: MasterClass[];
  students: Student[];
  personaMode?: 'WALI_KELAS' | 'GURU_BIDANG' | 'LEGACY_BLANK';
  setPersonaMode?: (mode: 'WALI_KELAS' | 'GURU_BIDANG' | 'LEGACY_BLANK') => void;
  onStartSession: (data: {
    schoolName?: string;
    classId: string;
    className: string;
    examType: ExamType;
    schoolYear: string;
    teacherName: string;
    analysisDate: string;
    kktp: number;
  }) => void;
  onOpenImport: () => void;
  onSelectExistingSession?: (session: AnalysisSession) => void;
}

const COMMON_EXAMS: Array<{ id: string; label: string; desc: string }> = [
  { id: 'STS1', label: 'STS 1 (Sumatif Tengah Smt 1)', desc: 'Tengah Semester 1' },
  { id: 'SAS 1', label: 'SAS 1 (Sumatif Akhir Smt 1)', desc: 'Akhir Semester 1' },
  { id: 'STS2', label: 'STS 2 (Sumatif Tengah Smt 2)', desc: 'Tengah Semester 2' },
  { id: 'SAT', label: 'SAT (Sumatif Akhir Tahun)', desc: 'Kenaikan Kelas / Akhir Tahun' },
  { id: 'US', label: 'US (Ujian Sekolah)', desc: 'Kelas 6 Akhir' },
];

export const SessionSetupCard: React.FC<SessionSetupCardProps> = ({
  masterClasses,
  students,
  personaMode = 'WALI_KELAS',
  setPersonaMode,
  onStartSession,
  onOpenImport,
  onSelectExistingSession,
}) => {
  const [schoolsList, setSchoolsList] = useState<string[]>(() => getStoredSchools());
  const [selectedSchool, setSelectedSchool] = useState<string>(DEFAULT_SCHOOL_NAME);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [examType, setExamType] = useState<string>('STS1');
  const [customExam, setCustomExam] = useState<string>('');
  const [schoolYear, setSchoolYear] = useState<string>('2026/2027');
  const [teacherName, setTeacherName] = useState<string>('');
  const [analysisDate, setAnalysisDate] = useState<string>(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });
  const [kktp, setKktp] = useState<number>(70);

  // Daftar sesi kelas yang sudah tersimpan
  const savedSessionsList = useMemo(() => {
    const all = getAllClassSessions(true);
    return Object.values(all).sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, []);

  // Initialize selected class & schools list on load
  useEffect(() => {
    const list = getStoredSchools();
    setSchoolsList(list);

    if (masterClasses.length > 0 && !selectedClassId) {
      const first = masterClasses[0];
      setSelectedClassId(first.id);
      const homeroom = getEraporHomeroomForClass(first.id) || first.waliKelas || '';
      setTeacherName(homeroom);
    }
  }, [masterClasses, selectedClassId]);

  // When class changes, update default teacher from e-Rapor
  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const homeroom = getEraporHomeroomForClass(newClassId);
    if (homeroom) {
      setTeacherName(homeroom);
    } else {
      const found = masterClasses.find((c) => c.id === newClassId);
      if (found && found.waliKelas) {
        setTeacherName(found.waliKelas);
      }
    }
  };

  const currentClassStudents = students.filter(
    (s) =>
      s.classId.toUpperCase() === selectedClassId.toUpperCase() &&
      (!selectedSchool || (s.schoolName || DEFAULT_SCHOOL_NAME).toLowerCase() === selectedSchool.toLowerCase())
  );
  const foundClass = masterClasses.find((c) => c.id === selectedClassId);
  const className = foundClass ? foundClass.name : selectedClassId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalExamType = examType === 'CUSTOM' ? customExam.trim() || 'UJIAN' : examType;

    onStartSession({
      schoolName: selectedSchool.trim() || DEFAULT_SCHOOL_NAME,
      classId: selectedClassId,
      className,
      examType: finalExamType,
      schoolYear,
      teacherName: teacherName.trim(),
      analysisDate,
      kktp: Number(kktp) || 70,
    });
  };

  return (
    <div className="space-y-5">
      {/* ====================================================
          3 CIRCULAR MODE SHORTCUTS (3 LINGKARAN MODE BESAR)
          ==================================================== */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pb-2">
        {/* MODE 1: WALI KELAS */}
        <button
          type="button"
          onClick={() => setPersonaMode?.('WALI_KELAS')}
          className="flex flex-col items-center justify-center text-center group cursor-pointer focus:outline-none"
        >
          <div
            className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-active:scale-95 ${
              personaMode === 'WALI_KELAS'
                ? 'bg-gradient-to-b from-cyan-400/35 via-cyan-500/20 to-cyan-950/95 border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.5)] scale-105'
                : 'bg-gradient-to-b from-slate-800/60 via-slate-900/80 to-slate-950/90 border-slate-700/80 opacity-75 hover:opacity-100 hover:border-cyan-400/50'
            }`}
          >
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <Users className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
            
            {/* Active Indicator Dot */}
            {personaMode === 'WALI_KELAS' && (
              <div className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] border-2 border-slate-950" />
            )}
          </div>

          <span className="text-xs sm:text-sm font-black text-white mt-2.5 tracking-tight group-hover:text-cyan-300 transition-colors">
            Mode Wali Kelas
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
            Analisis per kelas
          </span>
        </button>

        {/* MODE 2: GURU BIDANG */}
        <button
          type="button"
          onClick={() => setPersonaMode?.('GURU_BIDANG')}
          className="flex flex-col items-center justify-center text-center group cursor-pointer focus:outline-none"
        >
          <div
            className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-active:scale-95 ${
              personaMode === 'GURU_BIDANG'
                ? 'bg-gradient-to-b from-purple-400/35 via-purple-500/20 to-purple-950/95 border-purple-400 shadow-[0_0_24px_rgba(192,132,252,0.5)] scale-105'
                : 'bg-gradient-to-b from-slate-800/60 via-slate-900/80 to-slate-950/90 border-slate-700/80 opacity-75 hover:opacity-100 hover:border-purple-400/50'
            }`}
          >
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-purple-300 drop-shadow-[0_0_10px_rgba(192,132,252,0.7)]" />
            
            {/* Active Indicator Dot */}
            {personaMode === 'GURU_BIDANG' && (
              <div className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_10px_#c084fc] border-2 border-slate-950" />
            )}
          </div>

          <span className="text-xs sm:text-sm font-black text-white mt-2.5 tracking-tight group-hover:text-purple-300 transition-colors">
            Mode Guru Bidang
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
            Analisis multi kelas
          </span>
        </button>

        {/* MODE 3: BUKA / PULIHKAN */}
        <button
          type="button"
          onClick={onOpenImport}
          className="flex flex-col items-center justify-center text-center group cursor-pointer focus:outline-none"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-emerald-400/35 via-emerald-500/20 to-emerald-950/95 border border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.4)] flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-active:scale-95">
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <FolderOpen className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
          </div>

          <span className="text-xs sm:text-sm font-black text-white mt-2.5 tracking-tight group-hover:text-emerald-300 transition-colors">
            Buka / Pulihkan
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
            Proyek Excel
          </span>
        </button>
      </div>

      {/* BANNER SESI AKTIF TERSIMPAN (MEMULIHKAN SESI DENGAN 1 KLIK) */}
      {savedSessionsList.length > 0 && onSelectExistingSession && (
        <div className="p-4 sm:p-4.5 rounded-2xl bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-slate-950 border border-sky-400/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                <FolderOpen className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-black text-white">
                Lanjutkan Sesi yang Pernah Dibuat ({savedSessionsList.length})
              </span>
            </div>
            <span className="text-[11px] text-sky-300/80 font-semibold">
              Tersimpan aman di perangkat
            </span>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {savedSessionsList.map((s) => (
              <button
                key={s.sessionId || s.classId}
                type="button"
                onClick={() => onSelectExistingSession(s)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950/80 hover:bg-sky-500/20 border border-slate-800 hover:border-sky-400/40 text-left transition-all shrink-0 cursor-pointer group flex items-center gap-3 shadow-sm"
              >
                <div>
                  <div className="text-xs font-black text-white group-hover:text-sky-300 flex items-center gap-1.5">
                    <span>Kelas {s.className || s.classId}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                      {s.examType}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {s.subjects.length} Mapel • {s.teacherName || 'Wali Kelas'}
                  </div>
                </div>
                <div className="w-6 h-6 rounded-lg bg-sky-500/10 group-hover:bg-sky-500/20 border border-sky-400/20 flex items-center justify-center text-sky-300 shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================
          BANNER WORKSPACE ANALISIS TERPADU
          ==================================================== */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900/90 via-[#0D1527]/95 to-slate-900/90 border border-cyan-500/25 p-4 sm:p-6 shadow-xl overflow-hidden">
        {/* Decorative Right Watermark */}
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none text-cyan-300">
          <BarChart2 className="w-28 h-28 sm:w-36 sm:h-36" />
        </div>

        <div className="relative z-10 space-y-1.5 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider shadow-[0_0_12px_rgba(99,102,241,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> WORKSPACE ANALISIS TERPADU
          </span>

          <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
            Mulai Sesi Analisis Butir Soal
          </h2>

          <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed">
            Kelola analisis butir soal per mata pelajaran untuk kelas Anda dalam satu proyek Excel terintegrasi.
          </p>
        </div>
      </div>

      {/* ====================================================
          FORM IDENTITAS & SETUP SESI (MOBILE-FIRST)
          ==================================================== */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* 1. SEKOLAH / LEMBAGA */}
          <div className="p-3 sm:p-4 rounded-2xl bg-[#0B101D]/90 border border-slate-800 transition-all focus-within:border-cyan-400/70">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <span>1. Sekolah / Lembaga</span>
            </label>

            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400/80 rounded-xl px-3.5 py-3 text-base font-black text-sky-300 outline-none cursor-pointer transition-all"
            >
              {schoolsList.map((sch) => (
                <option key={sch} value={sch} className="bg-slate-900 text-white">
                  {sch}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Data siswa disaring berdasarkan sekolah ini.</p>
          </div>

          {/* 2. PILIH KELAS TARGET */}
          <div className="p-3 sm:p-4 rounded-2xl bg-[#0B101D]/90 border border-slate-800 transition-all focus-within:border-cyan-400/70">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span>2. Pilih Kelas Target</span>
            </label>

            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400/80 rounded-xl px-3.5 py-3 text-base font-black text-white outline-none cursor-pointer transition-all"
              required
            >
              {masterClasses.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-slate-900 text-white">
                  Kelas {cls.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-2 font-medium">
              <Users className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                {currentClassStudents.length > 0 ? (
                  <strong className="text-emerald-400 font-bold">
                    {currentClassStudents.length} Siswa terdaftar di database
                  </strong>
                ) : (
                  <strong className="text-amber-400 font-bold">
                    Belum ada siswa ({selectedSchool})
                  </strong>
                )}
              </span>
            </div>
          </div>

          {/* 3. GURU / WALI KELAS */}
          <div className="p-3 sm:p-4 rounded-2xl bg-[#0B101D]/90 border border-slate-800 transition-all focus-within:border-cyan-400/70">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-400 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <span>3. Guru / Wali Kelas</span>
            </label>

            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Contoh: Bu Yeni, S.Pd."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400/80 rounded-xl px-3.5 py-3 text-base font-bold text-white outline-none placeholder:text-slate-600 transition-all"
              required
            />
            
            <p className="text-[11px] text-cyan-300/90 font-medium mt-1.5 flex items-center gap-1">
              <span className="text-amber-400 font-bold">★ Wajib nama lengkap + gelar:</span> contoh "Bu Yeni, S.Pd."
            </p>
            {getEraporHomeroomForClass(selectedClassId) && (
              <p className="text-[11px] text-teal-300 font-semibold mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block animate-pulse"></span>
                <span>Otomatis dari data e-Rapor: <strong className="text-white underline decoration-teal-400/50">{getEraporHomeroomForClass(selectedClassId)}</strong></span>
              </p>
            )}
          </div>

          {/* 4. TAHUN PELAJARAN & 5. TANGGAL ANALISIS (2 KOLOM RESPONSIVE) */}
          <div className="grid grid-cols-2 gap-3">
            {/* 4. TAHUN PELAJARAN */}
            <div className="p-3 rounded-2xl bg-[#0B101D]/90 border border-slate-800 transition-all focus-within:border-cyan-400/70">
              <label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 truncate">
                <div className="w-6 h-6 rounded-md bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">4. Thn Pelajaran</span>
              </label>

              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="2026/2027"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400/80 rounded-xl px-3 py-2.5 text-base font-bold text-white outline-none transition-all"
                required
              />
            </div>

            {/* 5. TANGGAL ANALISIS */}
            <div className="p-3 rounded-2xl bg-[#0B101D]/90 border border-slate-800 transition-all focus-within:border-cyan-400/70">
              <label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 truncate">
                <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">5. Tgl Analisis</span>
              </label>

              <input
                type="text"
                value={analysisDate}
                onChange={(e) => setAnalysisDate(e.target.value)}
                placeholder="9 September 2026"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400/80 rounded-xl px-3 py-2.5 text-base font-bold text-white outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* 6. STANDAR KKTP / KKM */}
          <div className="p-3 sm:p-4 rounded-2xl bg-[#0B101D]/90 border border-slate-800">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <span>6. Standar KKTP / KKM</span>
            </label>

            <PillStepper
              value={kktp}
              onChange={setKktp}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Nilai ≥ KKTP dianggap Lulus (L).</p>
          </div>

          {/* 7. PILIH JENIS UJIAN (GRID 5 PILIHAN RESMI SDIT AL FIKRI) */}
          <div className="p-3 sm:p-4 rounded-2xl bg-[#0B101D]/90 border border-slate-800 space-y-2.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <span>7. Pilih Jenis Ujian (Urutan Resmi: STS1, SAS 1, STS2, SAT, US)</span>
            </label>

            {/* Grid 5 Pilihan Urutan Resmi: 1. STS1, 2. SAS 1, 3. STS2, 4. SAT, 5. US */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { id: 'STS1', name: '1. STS1', desc: 'Tengah Semester 1' },
                { id: 'SAS 1', name: '2. SAS 1', desc: 'Akhir Semester 1' },
                { id: 'STS2', name: '3. STS2', desc: 'Tengah Semester 2' },
                { id: 'SAT', name: '4. SAT', desc: 'Kenaikan / Akhir Tahun' },
                { id: 'US', name: '5. US', desc: 'Ujian Sekolah Kelas 6' },
              ].map((exam) => {
                const isSelected = examType === exam.id || (exam.id === 'SAS 1' && (examType === 'SAS1' || examType === 'SAS'));
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => setExamType(exam.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-600/35 to-cyan-600/20 border-cyan-400/80 text-white shadow-[0_0_18px_rgba(34,211,238,0.25)]'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-black tracking-tight">{exam.name}</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight mt-1">{exam.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SUBMIT BUTTON (CTA UTAMA) */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 hover:from-indigo-600 hover:to-cyan-500 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(56,189,248,0.35)] active:scale-98 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-cyan-100 animate-pulse shrink-0" />
              <span>Buka Workspace Sesi Analisis ({className})</span>
              <ArrowRight className="w-5 h-5 text-white shrink-0" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
