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
    <div className="space-y-5 font-sans text-slate-800">
      {/* ====================================================
          3 CIRCULAR MODE SHORTCUTS
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
                ? 'bg-sky-50 border-sky-400 text-sky-600 shadow-md scale-105'
                : 'bg-white border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-300 shadow-xs'
            }`}
          >
            <Users className="w-7 h-7 sm:w-8 sm:h-8" />
            
            {/* Active Indicator Dot */}
            {personaMode === 'WALI_KELAS' && (
              <div className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-sky-500 shadow-xs border-2 border-white" />
            )}
          </div>

          <span className="text-xs sm:text-sm font-black text-slate-900 mt-2.5 tracking-tight group-hover:text-sky-600 transition-colors">
            Mode Wali Kelas
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
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
                ? 'bg-indigo-50 border-indigo-400 text-indigo-600 shadow-md scale-105'
                : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shadow-xs'
            }`}
          >
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" />
            
            {/* Active Indicator Dot */}
            {personaMode === 'GURU_BIDANG' && (
              <div className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs border-2 border-white" />
            )}
          </div>

          <span className="text-xs sm:text-sm font-black text-slate-900 mt-2.5 tracking-tight group-hover:text-indigo-600 transition-colors">
            Mode Guru Bidang
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
            Analisis multi kelas
          </span>
        </button>

        {/* MODE 3: BUKA / PULIHKAN */}
        <button
          type="button"
          onClick={onOpenImport}
          className="flex flex-col items-center justify-center text-center group cursor-pointer focus:outline-none"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-50 border border-emerald-400 text-emerald-600 shadow-xs flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-active:scale-95">
            <FolderOpen className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <span className="text-xs sm:text-sm font-black text-slate-900 mt-2.5 tracking-tight group-hover:text-emerald-600 transition-colors">
            Buka / Pulihkan
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
            Proyek Excel
          </span>
        </button>
      </div>

      {/* BANNER SESI AKTIF TERSIMPAN */}
      {savedSessionsList.length > 0 && onSelectExistingSession && (
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/90 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                <FolderOpen className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-black text-slate-900">
                Lanjutkan Sesi yang Pernah Dibuat ({savedSessionsList.length})
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              Tersimpan aman di browser
            </span>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {savedSessionsList.map((s) => (
              <button
                key={s.sessionId || s.classId}
                type="button"
                onClick={() => onSelectExistingSession(s)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-left transition-all shrink-0 cursor-pointer group flex items-center gap-3 shadow-2xs"
              >
                <div>
                  <div className="text-xs font-black text-slate-900 group-hover:text-sky-700 flex items-center gap-1.5">
                    <span>Kelas {s.className || s.classId}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                      {s.examType}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {s.subjects.length} Mapel • {s.teacherName || 'Wali Kelas'}
                  </div>
                </div>
                <div className="w-6 h-6 rounded-lg bg-sky-50 group-hover:bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
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
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-sky-50 via-indigo-50/50 to-white border border-slate-200/90 p-5 sm:p-6 shadow-xs overflow-hidden">
        {/* Decorative Right Watermark */}
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none text-sky-600">
          <BarChart2 className="w-28 h-28 sm:w-36 sm:h-36" />
        </div>

        <div className="relative z-10 space-y-1.5 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-600 animate-pulse" /> WORKSPACE ANALISIS TERPADU
          </span>

          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            Mulai Sesi Analisis Butir Soal
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Kelola analisis butir soal per mata pelajaran untuk kelas Anda dalam satu proyek Excel terintegrasi.
          </p>
        </div>
      </div>

      {/* ====================================================
          FORM IDENTITAS & SETUP SESI (MOBILE-FIRST)
          ==================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* 1. SEKOLAH / LEMBAGA */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 transition-all focus-within:border-sky-500 focus-within:bg-white">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <span>1. Sekolah / Lembaga</span>
            </label>

            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-base font-black text-slate-900 outline-none cursor-pointer transition-all shadow-2xs"
            >
              {schoolsList.map((sch) => (
                <option key={sch} value={sch}>
                  {sch}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">Data siswa disaring berdasarkan sekolah ini.</p>
          </div>

          {/* 2. PILIH KELAS TARGET */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 transition-all focus-within:border-sky-500 focus-within:bg-white">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span>2. Pilih Kelas Target</span>
            </label>

            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-base font-black text-slate-900 outline-none cursor-pointer transition-all shadow-2xs"
              required
            >
              {masterClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Kelas {cls.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2 font-medium">
              <Users className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                {currentClassStudents.length > 0 ? (
                  <strong className="text-emerald-700 font-bold">
                    {currentClassStudents.length} Siswa terdaftar di database
                  </strong>
                ) : (
                  <strong className="text-amber-700 font-bold">
                    Belum ada siswa ({selectedSchool})
                  </strong>
                )}
              </span>
            </div>
          </div>

          {/* 3. GURU / WALI KELAS */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 transition-all focus-within:border-sky-500 focus-within:bg-white">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <span>3. Guru / Wali Kelas</span>
            </label>

            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Contoh: Bu Yeni, S.Pd."
              className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-base font-bold text-slate-900 outline-none placeholder:text-slate-400 transition-all shadow-2xs"
              required
            />
            
            <p className="text-[11px] text-slate-600 font-medium mt-1.5 flex items-center gap-1">
              <span className="text-amber-700 font-bold">★ Wajib nama lengkap + gelar:</span> contoh "Bu Yeni, S.Pd."
            </p>
            {getEraporHomeroomForClass(selectedClassId) && (
              <p className="text-[11px] text-teal-700 font-semibold mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block animate-pulse"></span>
                <span>Otomatis dari data e-Rapor: <strong className="text-slate-900 underline decoration-teal-400/50">{getEraporHomeroomForClass(selectedClassId)}</strong></span>
              </p>
            )}
          </div>

          {/* 4. TAHUN PELAJARAN & 5. TANGGAL ANALISIS */}
          <div className="grid grid-cols-2 gap-3">
            {/* 4. TAHUN PELAJARAN */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 transition-all focus-within:border-sky-500 focus-within:bg-white">
              <label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 truncate">
                <div className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">4. Thn Pelajaran</span>
              </label>

              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="2026/2027"
                className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 text-sm sm:text-base font-bold text-slate-900 outline-none transition-all shadow-2xs"
                required
              />
            </div>

            {/* 5. TANGGAL ANALISIS */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 transition-all focus-within:border-sky-500 focus-within:bg-white">
              <label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 truncate">
                <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">5. Tgl Analisis</span>
              </label>

              <input
                type="text"
                value={analysisDate}
                onChange={(e) => setAnalysisDate(e.target.value)}
                placeholder="9 September 2026"
                className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 text-sm sm:text-base font-bold text-slate-900 outline-none transition-all shadow-2xs"
                required
              />
            </div>
          </div>

          {/* 6. STANDAR KKTP / KKM */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
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
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">Nilai ≥ KKTP dianggap Lulus (L).</p>
          </div>

          {/* 7. PILIH JENIS UJIAN */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <span>7. Pilih Jenis Ujian (Urutan Resmi: STS1, SAS 1, STS2, SAT, US)</span>
            </label>

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
                        ? 'bg-sky-50/80 border-sky-400 text-slate-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-black tracking-tight">{exam.name}</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-sky-500 bg-sky-600 text-white'
                            : 'border-slate-300 bg-transparent'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight mt-1">{exam.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SUBMIT BUTTON (CTA UTAMA) */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-sky-200 shrink-0" />
              <span>Buka Workspace Sesi Analisis ({className})</span>
              <ArrowRight className="w-5 h-5 text-white shrink-0" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
