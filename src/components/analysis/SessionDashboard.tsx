import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Plus,
  FileSpreadsheet,
  Download,
  FolderUp,
  Award,
  Settings2,
  Trash2,
  Edit3,
  BarChart3,
  CheckCircle2,
  Clock3,
  Users,
  RefreshCw,
  Target,
  UserCheck,
  Calendar,
  GraduationCap,
  FileText,
  Building2,
} from 'lucide-react';
import {
  AnalysisSession,
  AnalysisSubject,
} from '../../types/analysisTypes';
import { Student, DEFAULT_SCHOOL_NAME } from '../../services/studentStorage';
import { MasterClass } from '../../data/masterExamData';
import { calculateSubjectSummaryStats } from '../../services/analysis/analysisCalculationService';
import { exportAnalysisProjectToExcel } from '../../services/analysis/analysisExcelService';

interface SessionDashboardProps {
  session: AnalysisSession;
  masterClasses: MasterClass[];
  students: Student[];
  onAddSubject: () => void;
  onEditSubjectConfig: (subject: AnalysisSubject) => void;
  onOpenStudentInput: (subject: AnalysisSubject) => void;
  onOpenSubjectStats: (subject: AnalysisSubject) => void;
  onOpenRekap: () => void;
  onOpenImport: () => void;
  onResetSession: () => void;
  onDeleteSubject: (subjectId: string) => void;
  onSwitchClass?: (classId: string) => void;
}

export const SessionDashboard: React.FC<SessionDashboardProps> = ({
  session,
  masterClasses,
  students,
  onAddSubject,
  onEditSubjectConfig,
  onOpenStudentInput,
  onOpenSubjectStats,
  onOpenRekap,
  onOpenImport,
  onResetSession,
  onDeleteSubject,
  onSwitchClass,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter students for the active class & school
  const classStudents = students.filter(
    (s) =>
      s.classId.toLowerCase() === session.classId.toLowerCase() &&
      (!session.schoolName || (s.schoolName || DEFAULT_SCHOOL_NAME).toLowerCase() === session.schoolName.toLowerCase())
  );
  const totalStudents =
    classStudents.length > 0 ? classStudents.length : session.studentSnapshot.length || 0;

  const handleExportAll = () => {
    const studentsToUse = classStudents.length > 0 ? classStudents : (session.studentSnapshot as Student[]);
    exportAnalysisProjectToExcel(session, studentsToUse);
  };

  return (
    <div className="space-y-6">
      {/* ====================================================
          TOP SESSION BANNER & ACTION GRID (COMPACT GLASS)
          ==================================================== */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        {/* Ambient background glow effect */}
        <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 relative z-10">
          
          {/* LEFT SIDE: Identity & Info Pills */}
          <div className="flex-1 flex flex-col justify-center space-y-2.5 min-w-0">
            {/* Top Badges / Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* 0. Sekolah */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                <Building2 className="w-3 h-3 text-teal-400" />
                <span>{session.schoolName || DEFAULT_SCHOOL_NAME}</span>
              </div>

              {/* 1. Kelas (with quick switcher if onSwitchClass provided) */}
              {onSwitchClass ? (
                <div className="relative inline-flex items-center bg-sky-500/15 border border-sky-500/30 rounded-full pl-2.5 pr-1.5 py-0.5 text-[10.5px] font-black text-sky-300">
                  <GraduationCap className="w-3 h-3 text-sky-400 mr-1" />
                  <select
                    value={session.classId}
                    onChange={(e) => onSwitchClass(e.target.value)}
                    className="bg-transparent text-sky-200 font-black uppercase text-[10.5px] outline-none cursor-pointer pr-1"
                    title="Ganti kelas aktif"
                  >
                    {masterClasses.map((cls) => (
                      <option key={cls.id} value={cls.id} className="bg-slate-900 text-white">
                        KELAS {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30 uppercase tracking-wide">
                  <GraduationCap className="w-3 h-3 text-sky-400" />
                  <span>KELAS {session.className}</span>
                </div>
              )}

              {/* 2. Siswa Terdaftar */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 tracking-wide">
                <Users className="w-3 h-3 text-purple-400" />
                <span>{totalStudents} Siswa</span>
              </div>

              {/* 3. Jenis Ujian */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
                <FileText className="w-3 h-3 text-indigo-400" />
                <span>{session.examType}</span>
              </div>

              {/* 4. Tanggal */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>{session.analysisDate}</span>
              </div>

              {/* 5. Tahun Pelajaran */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-800/80 text-slate-300 border border-white/10 tracking-wide">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>TP {session.schoolYear}</span>
              </div>

              {/* 6. KKTP */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 tracking-wide">
                <Target className="w-3 h-3 text-amber-400" />
                <span>KKTP: {session.kktp}</span>
              </div>
            </div>

            {/* Title & Teacher Name Underneath */}
            <div className="space-y-0.5 pt-0.5">
              <h2 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-tight leading-tight">
                Workspace Analisis Butir Soal Kelas {session.className}
              </h2>
              {session.teacherName ? (
                <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{session.teacherName}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* RIGHT SIDE: Action Buttons Grid Layout (Soft Glass Tint) */}
          <div className="flex flex-col gap-2 w-full lg:w-[310px] shrink-0">
            {/* Top 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* 1. Tambah Mapel (Soft Cyan Glass) */}
              <button
                type="button"
                onClick={onAddSubject}
                className="h-10 px-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 active:scale-[0.98] text-sky-200 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(56,189,248,0.15)] border border-sky-400/30 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-sky-300 stroke-[2.8]" />
                <span className="truncate">Tambah Mapel</span>
              </button>

              {/* 2. Import Analisis Guru Mapel (Soft Indigo Glass) */}
              <button
                type="button"
                onClick={onOpenImport}
                className="h-10 px-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 active:scale-[0.98] text-indigo-200 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 border border-indigo-400/30 shadow-sm cursor-pointer transition-all"
                title="Impor file Excel nilai guru mapel ke dalam sesi ini"
              >
                <FolderUp className="w-3.5 h-3.5 text-indigo-300 shrink-0 stroke-[2.2]" />
                <span className="truncate">
                  Import Guru Mapel
                </span>
              </button>

              {/* 3. Download Excel (Soft Emerald Glass) */}
              <button
                type="button"
                onClick={handleExportAll}
                className="h-10 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-[0.98] text-emerald-200 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)] border border-emerald-400/30 cursor-pointer transition-all"
                title="Unduh seluruh analisis dalam 1 file Excel multi-sheet"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300 stroke-[2.5]" />
                <span className="truncate">Download Excel</span>
              </button>

              {/* 4. Ganti Sesi (Soft Rose Glass) */}
              <button
                type="button"
                onClick={onResetSession}
                className="h-10 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-[0.98] text-rose-300 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 border border-rose-400/25 cursor-pointer transition-all"
                title="Ganti atau hapus sesi analisis untuk memulai sesi baru"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-300 stroke-[2.5]" />
                <span className="truncate">Ganti Sesi</span>
              </button>
            </div>

            {/* 5. Rekapitulasi Nilai (Soft Teal Glass) */}
            <button
              type="button"
              onClick={onOpenRekap}
              className="h-9 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 active:scale-[0.99] text-teal-200 font-black text-xs flex items-center justify-center gap-2 border border-teal-400/30 shadow-[0_0_12px_rgba(20,184,166,0.15)] cursor-pointer transition-all"
              title="Lihat rekapitulasi nilai seluruh mapel"
            >
              <Award className="w-4 h-4 text-amber-300 shrink-0 stroke-[2.3]" />
              <span className="tracking-wide">
                Rekapitulasi Nilai Seluruh Mapel
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          SUBJECT CARDS GRID
          ==================================================== */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-4">
          <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            Daftar Analisis Mata Pelajaran ({session.subjects.length})
          </h3>
          <span className="text-xs text-slate-400">
            Klik kartu untuk mulai input atau edit nilai butir soal
          </span>
        </div>

        {session.subjects.length === 0 ? (
          /* Empty Subject State */
          <div className="bg-slate-900/40 backdrop-blur-xl border-2 border-dashed border-white/10 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 shadow-[0_0_15px_rgba(56,189,248,0.1)]">
              <BookOpen className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white">Belum Ada Mata Pelajaran yang Ditambahkan</h4>
            <p className="text-xs text-slate-400 max-w-md">
              Tambahkan mata pelajaran untuk mulai mengisi analisis butir soal per siswa, atau impor berkas Excel dari guru mapel.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onAddSubject}
                className="px-5 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-200 font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.2)] cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Mata Pelajaran Pertama</span>
              </button>
              <button
                type="button"
                onClick={onOpenImport}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold cursor-pointer transition-all"
              >
                Impor File Excel
              </button>
            </div>
          </div>
        ) : (
          /* Grid of subjects */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {session.subjects.map((subj) => {
              const studentsToUse =
                classStudents.length > 0 ? classStudents : (session.studentSnapshot as Student[]);
              const stats = calculateSubjectSummaryStats(subj, studentsToUse, session.kktp);
              const progressPct =
                stats.totalStudents > 0
                  ? Math.round((stats.completedStudents / stats.totalStudents) * 100)
                  : 0;

              return (
                <div
                  key={subj.subjectId}
                  className="bg-slate-900/50 hover:bg-slate-800/60 backdrop-blur-xl border border-white/10 hover:border-sky-400/30 rounded-2xl p-5 transition-all duration-200 shadow-lg hover:shadow-sky-500/5 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Title + Action buttons */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                          Sheet: {subj.sheetName}
                        </span>
                        <h4 className="text-base font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                          {subj.subjectName}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          Guru: {subj.teacherName || session.teacherName || '-'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditSubjectConfig(subj)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Ubah Konfigurasi Soal"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirmDeleteId === subj.subjectId) {
                              onDeleteSubject(subj.subjectId);
                              setConfirmDeleteId(null);
                            } else {
                              setConfirmDeleteId(subj.subjectId);
                              setTimeout(() => setConfirmDeleteId(null), 3000);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            confirmDeleteId === subj.subjectId
                              ? 'bg-rose-500 text-white font-bold text-[10px] px-2'
                              : 'bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300'
                          }`}
                          title="Hapus Mapel"
                        >
                          {confirmDeleteId === subj.subjectId ? 'Yakin?' : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Question Config Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      {subj.config.pgCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-300 text-[10px] font-bold border border-sky-500/25">
                          {subj.config.pgCount} PG
                        </span>
                      )}
                      {subj.config.isianCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/25">
                          {subj.config.isianCount} Isian
                        </span>
                      )}
                      {subj.config.cCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 text-[10px] font-bold border border-purple-500/25">
                          {subj.config.cCount} {subj.config.cType || 'Uraian'}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 text-[10px] font-bold border border-white/10">
                        Skor Maks: {subj.maxScore}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-slate-400 font-semibold">Progres Input Nilai</span>
                        <span className="font-bold text-white tabular-nums">
                          {stats.completedStudents} / {stats.totalStudents} Siswa ({progressPct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            progressPct >= 100 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Stats Pill (Frosted Capsule) */}
                    {stats.completedStudents > 0 && (
                      <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-xl bg-slate-950/40 border border-white/5 mb-4 text-center">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">Rata-rata</span>
                          <span className="text-xs font-black text-sky-300 tabular-nums">
                            {stats.averageGrade.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">Tertinggi</span>
                          <span className="text-xs font-black text-emerald-400 tabular-nums">
                            {stats.highestGrade}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">% Lulus</span>
                          <span className="text-xs font-black text-white tabular-nums">
                            {stats.passedPercentage}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions (Soft Glass Buttons) */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => onOpenStudentInput(subj)}
                      className="py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Input Nilai</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenSubjectStats(subj)}
                      className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Statistik Soal</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
