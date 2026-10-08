import React, { useState, useMemo } from 'react';
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
  RotateCcw,
  Target,
  UserCheck,
  Calendar,
  GraduationCap,
  FileText,
  Building2,
  Send,
  Printer,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import {
  AnalysisSession,
  AnalysisSubject,
} from '../../types/analysisTypes';
import { Student, DEFAULT_SCHOOL_NAME } from '../../services/studentStorage';
import { MasterClass } from '../../data/masterExamData';
import { calculateSubjectSummaryStats } from '../../services/analysis/analysisCalculationService';
import { exportAnalysisProjectToExcel } from '../../services/analysis/analysisExcelService';
import { SendToPakZakiModal } from './SendToPakZakiModal';
import { AnalysisSubmissionChatModal } from './AnalysisSubmissionChatModal';
import {
  subscribeToAnalysisSubmissions,
  getLocalAnalysisSubmissions,
} from '../../services/analysisSubmissionService';
import { getActiveTeacherSession } from '../../services/teacherStorage';
import { AnalysisSubmissionItem } from '../../types/analysisSubmissionTypes';

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
  const [isSendToPakZakiOpen, setIsSendToPakZakiOpen] = useState<boolean>(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);
  const [submissions, setSubmissions] = useState<AnalysisSubmissionItem[]>(() =>
    getLocalAnalysisSubmissions()
  );

  React.useEffect(() => {
    const unsubscribe = subscribeToAnalysisSubmissions((items) => {
      setSubmissions(items);
    });
    return () => unsubscribe();
  }, []);

  const classSubmission = useMemo(() => {
    const activeTeacher = getActiveTeacherSession();
    const currentName = (activeTeacher?.name || session.teacherName || '').trim().toLowerCase();
    const currentId = (activeTeacher?.id || '').trim().toLowerCase();

    return submissions.find((s) => {
      const matchClass =
        s.classId.toLowerCase().includes(session.classId.toLowerCase()) &&
        (!s.examType || s.examType.toLowerCase() === session.examType.toLowerCase());
      if (!matchClass) return false;

      // Prioritize active teacher if available
      if (currentId && s.teacherId) {
        return s.teacherId.toLowerCase() === currentId;
      }
      if (currentName && s.teacherName) {
        const subTeacher = s.teacherName.toLowerCase();
        return subTeacher.includes(currentName) || currentName.includes(subTeacher);
      }
      return true;
    });
  }, [submissions, session.classId, session.examType, session.teacherName]);

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

  // Memoize statistik ringkasan per mapel agar tidak menghitung ulang berulang kali
  const subjectStatsMap = useMemo(() => {
    const map = new Map<string, { stats: ReturnType<typeof calculateSubjectSummaryStats>; progressPct: number }>();
    const studentsToUse = classStudents.length > 0 ? classStudents : (session.studentSnapshot as Student[]);
    session.subjects.forEach((subj) => {
      const stats = calculateSubjectSummaryStats(subj, studentsToUse, session.kktp);
      const progressPct =
        stats.totalStudents > 0
          ? Math.round((stats.completedStudents / stats.totalStudents) * 100)
          : 0;
      map.set(subj.subjectId, { stats, progressPct });
    });
    return map;
  }, [session.subjects, classStudents, session.kktp, session.studentSnapshot]);

  return (
    <div className="space-y-6">
      {/* ====================================================
          TOP SESSION BANNER & ACTION GRID (EXECUTIVE GLASS)
          ==================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 sm:bg-gradient-to-br sm:from-slate-900/90 sm:via-slate-900/80 sm:to-slate-950/90 p-4 sm:p-6 shadow-xl sm:shadow-2xl backdrop-blur-none sm:backdrop-blur-xl">
        {/* Ambient background glow accents (Hidden on Mobile for 60fps GPU performance) */}
        <div className="hidden sm:block pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="hidden sm:block pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-stretch justify-between gap-5 lg:gap-6">
          
          {/* LEFT SIDE: Identity, Title, & Parametric Info Strip */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            {/* 1. Top Row: Institutional Context & Tags */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sekolah & Tahun Pelajaran */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 shadow-sm">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-bold text-slate-200">{session.schoolName || DEFAULT_SCHOOL_NAME}</span>
                <span className="text-white/20">•</span>
                <span className="text-slate-400 font-mono">TP {session.schoolYear}</span>
              </div>

              {/* Kelas (Badge Statis Rapi) */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-500/15 border border-sky-400/30 text-sky-200 tracking-wider uppercase shadow-[0_0_12px_rgba(56,189,248,0.15)]">
                <GraduationCap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>KELAS {session.className}</span>
              </div>

              {/* Wali Kelas (Jika Ada) */}
              {session.teacherName ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-400/25 text-amber-200">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Wali Kelas: {session.teacherName}</span>
                </div>
              ) : null}
            </div>

            {/* 2. Middle Row: Main Title & Description */}
            <div className="mt-3 mb-3.5">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug flex flex-wrap items-center gap-2 sm:gap-3">
                <span>Workspace Analisis Butir Soal</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono">
                  <FileText className="w-3 h-3 text-indigo-400" />
                  {session.examType}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                Rekapitulasi instrumen asesmen dan diagnostik ketuntasan belajar siswa Kelas {session.className}
              </p>
            </div>

            {/* 3. Bottom Row: 4-Card Parametric Strip (Clean, Structured, Balanced) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
              {/* Card 1: Jenis Ujian */}
              <div className="bg-slate-950/50 border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Jenis Ujian</p>
                  <p className="text-xs font-bold text-white truncate">{session.examType}</p>
                </div>
              </div>

              {/* Card 2: Jumlah Siswa */}
              <div className="bg-slate-950/50 border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-purple-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Peserta Didik</p>
                  <p className="text-xs font-bold text-white truncate">{totalStudents} Siswa</p>
                </div>
              </div>

              {/* Card 3: Batas KKTP */}
              <div className="bg-slate-950/50 border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Target KKTP</p>
                  <p className="text-xs font-black text-amber-300 truncate">≥ {session.kktp}</p>
                </div>
              </div>

              {/* Card 4: Tanggal Asesmen */}
              <div className="bg-slate-950/50 border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tanggal Asesmen</p>
                  <p className="text-xs font-bold text-white truncate">{session.analysisDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Structured Action Console Deck */}
          <div className="w-full lg:w-[330px] xl:w-[350px] shrink-0 flex flex-col justify-between gap-2.5 self-stretch pt-2 lg:pt-0">
            {/* 1. Primary Action: Tambah Mapel */}
            <button
              type="button"
              onClick={onAddSubject}
              className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 border border-sky-400/40 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Mata Pelajaran</span>
            </button>

            {/* 2. Key Analysis Action: Rekapitulasi Nilai Seluruh Mapel */}
            <button
              type="button"
              onClick={onOpenRekap}
              className="w-full h-10 px-4 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 active:scale-[0.98] text-teal-200 hover:text-white font-black text-xs flex items-center justify-center gap-2 border border-teal-400/35 shadow-[0_0_14px_rgba(20,184,166,0.18)] cursor-pointer transition-all"
              title="Lihat rekapitulasi nilai dan ketercapaian seluruh mapel"
            >
              <Award className="w-4 h-4 text-amber-300 shrink-0 stroke-[2.3]" />
              <span className="tracking-wide">Rekapitulasi Nilai Seluruh Mapel</span>
            </button>

            {/* 2b. Kirim ke Pak Zaki */}
            <button
              type="button"
              onClick={() => setIsSendToPakZakiOpen(true)}
              className="w-full h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-emerald-400/40 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
              title="Kirim lembar analisis kelas ini langsung ke Pak Zaki"
            >
              <Send className="w-4 h-4 text-emerald-100 shrink-0" />
              <span>🚀 Kirim ke Pak Zaki</span>
            </button>

            {/* 3. Secondary Utility Deck: Download Excel, Import Guru Mapel, Ganti Sesi */}
            <div className="grid grid-cols-3 gap-2">
              {/* Download Excel */}
              <button
                type="button"
                onClick={handleExportAll}
                className="h-9 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-[0.98] text-emerald-200 border border-emerald-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Unduh seluruh analisis dalam 1 file Excel multi-sheet"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span className="truncate">Download</span>
              </button>

              {/* Import Guru Mapel */}
              <button
                type="button"
                onClick={onOpenImport}
                className="h-9 px-2 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 active:scale-[0.98] text-indigo-200 border border-indigo-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Impor file Excel nilai guru mapel ke dalam sesi ini"
              >
                <FolderUp className="w-3.5 h-3.5 text-indigo-400 shrink-0 stroke-[2.2]" />
                <span className="truncate">Import</span>
              </button>

              {/* Ganti Sesi / Pilih Sesi Lain */}
              <button
                type="button"
                onClick={onResetSession}
                className="h-9 px-2.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 active:scale-[0.98] text-sky-200 border border-sky-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Pilih atau beralih ke sesi kelas lain yang pernah dibuat tanpa menghapus data"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-300 shrink-0 stroke-[2.5]" />
                <span className="truncate">Ganti Sesi</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================
          STATUS SETORAN & CATATAN REVISI DARI PAK ZAKI
          ==================================================== */}
      {classSubmission && (
        <div className="animate-fadeIn">
          {classSubmission.status === 'revisi' && (
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
                        Perlu Perbaikan
                      </span>
                    </div>
                    <div className="text-xs text-white font-medium bg-slate-950/70 p-3 rounded-xl border border-amber-500/20 mt-1.5 leading-relaxed">
                      "{classSubmission.adminNote || 'Mohon periksa kembali kelengkapan skor siswa.'}"
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Silakan sesuaikan nilai atau butir soal di bawah, lalu klik tombol kirim ulang.
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
                    <span>💬 Diskusi {classSubmission.messages?.length ? `(${classSubmission.messages.length})` : ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSendToPakZakiOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>🚀 Kirim Ulang ke Pak Zaki</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {classSubmission.status === 'telah_diprint' && (
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
                    Berkas fisik analisis kelas ini telah dicetak oleh Pak Zaki untuk pengesahan &amp; arsip sekolah.
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
                <span>💬 Ruang Diskusi {classSubmission.messages?.length ? `(${classSubmission.messages.length})` : ''}</span>
              </button>
            </div>
          )}

          {classSubmission.status === 'disetujui' && (
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
                    Lembar analisis kelas ini telah diverifikasi &amp; disetujui. Menunggu giliran cetak fisik.
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
                <span>💬 Ruang Diskusi {classSubmission.messages?.length ? `(${classSubmission.messages.length})` : ''}</span>
              </button>
            </div>
          )}

          {classSubmission.status === 'menunggu' && (
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
                    Lembar analisis telah disetorkan ke Pak Zaki. Menunggu pemeriksaan.
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
                <span>💬 Ruang Diskusi {classSubmission.messages?.length ? `(${classSubmission.messages.length})` : ''}</span>
              </button>
            </div>
          )}
        </div>
      )}

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
          <div className="bg-slate-900 sm:bg-slate-900/40 backdrop-blur-none sm:backdrop-blur-xl border-2 border-dashed border-white/10 rounded-2xl p-6 sm:p-12 text-center flex flex-col items-center justify-center gap-3">
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
              const item = subjectStatsMap.get(subj.subjectId);
              const stats = item?.stats || {
                totalStudents: 0,
                completedStudents: 0,
                averageGrade: 0,
                highestGrade: 0,
                lowestGrade: 0,
                passedCount: 0,
                failedCount: 0,
                passedPercentage: 0,
                itemAnalysis: [],
              };
              const progressPct = item?.progressPct ?? 0;

              return (
                <div
                  key={subj.subjectId}
                  className="bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 hover:border-sky-400/30 rounded-2xl p-5 transition-all duration-200 shadow-lg hover:shadow-sky-500/5 flex flex-col justify-between group"
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

      {/* Modal Kirim ke Pak Zaki */}
      <SendToPakZakiModal
        isOpen={isSendToPakZakiOpen}
        onClose={() => setIsSendToPakZakiOpen(false)}
        submissionType="session"
        subjectName={
          session.subjects.length > 0
            ? session.subjects.map((s) => s.subjectName).join(', ')
            : 'Rekap Analisis Kelas'
        }
        classId={session.classId}
        className={`Kelas ${session.className}`}
        examType={session.examType}
        schoolYear={session.schoolYear}
        teacherName={session.teacherName}
        kktp={session.kktp}
        totalStudents={totalStudents}
        completedStudents={
          session.subjects.reduce(
            (acc, subj) => acc + Object.keys(subj.studentResults || {}).length,
            0
          )
        }
        payload={{
          session,
          students: classStudents,
        }}
      />

      {/* Analysis Submission Chat / Discussion Modal for Walas */}
      {classSubmission && (
        <AnalysisSubmissionChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          submission={classSubmission}
          currentUserRole="guru"
          currentUserName={
            getActiveTeacherSession()?.name ||
            session.teacherName ||
            `Wali Kelas ${session.className}`
          }
        />
      )}
    </div>
  );
};
