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
    <div className="space-y-6 font-sans text-slate-800">
      {/* ====================================================
          TOP SESSION BANNER & ACTION GRID (EXECUTIVE CLEAN LIGHT)
          ==================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
        {/* Subtle decorative glow */}
        <div className="hidden sm:block pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-sky-100/50 blur-3xl" />
        <div className="hidden sm:block pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-indigo-100/50 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-stretch justify-between gap-5 lg:gap-6">
          
          {/* LEFT SIDE: Identity, Title, & Parametric Info Strip */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            {/* 1. Top Row: Institutional Context & Tags */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sekolah & Tahun Pelajaran */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100/90 border border-slate-200/90 text-slate-700 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-800">{session.schoolName || DEFAULT_SCHOOL_NAME}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-mono">TP {session.schoolYear}</span>
              </div>

              {/* Kelas (Badge Statis Rapi) */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-50 border border-sky-200 text-sky-700 tracking-wider uppercase shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>KELAS {session.className}</span>
              </div>

              {/* Wali Kelas (Jika Ada) */}
              {session.teacherName ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Wali Kelas: {session.teacherName}</span>
                </div>
              ) : null}
            </div>

            {/* 2. Middle Row: Main Title & Description */}
            <div className="mt-3.5 mb-3.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug flex flex-wrap items-center gap-2 sm:gap-3">
                <span>Workspace Analisis Butir Soal</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                  <FileText className="w-3 h-3 text-indigo-600" />
                  {session.examType}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                Rekapitulasi instrumen asesmen dan diagnostik ketuntasan belajar siswa Kelas {session.className}
              </p>
            </div>

            {/* 3. Bottom Row: 4-Card Parametric Strip (Clean, Structured, Balanced) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
              {/* Card 1: Jenis Ujian */}
              <div className="bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/80 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Jenis Ujian</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{session.examType}</p>
                </div>
              </div>

              {/* Card 2: Jumlah Siswa */}
              <div className="bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/80 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Peserta Didik</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{totalStudents} Siswa</p>
                </div>
              </div>

              {/* Card 3: Batas KKTP */}
              <div className="bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/80 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Target KKTP</p>
                  <p className="text-xs font-black text-amber-700 truncate">≥ {session.kktp}</p>
                </div>
              </div>

              {/* Card 4: Tanggal Asesmen */}
              <div className="bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/80 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tanggal Asesmen</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{session.analysisDate}</p>
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
              className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm border border-sky-400 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Mata Pelajaran</span>
            </button>

            {/* 2. Key Analysis Action: Rekapitulasi Nilai Seluruh Mapel */}
            <button
              type="button"
              onClick={onOpenRekap}
              className="w-full h-10 px-4 rounded-xl bg-teal-50 hover:bg-teal-100 active:scale-[0.98] text-teal-800 font-black text-xs flex items-center justify-center gap-2 border border-teal-200 shadow-2xs cursor-pointer transition-all"
              title="Lihat rekapitulasi nilai dan ketercapaian seluruh mapel"
            >
              <Award className="w-4 h-4 text-amber-600 shrink-0 stroke-[2.3]" />
              <span className="tracking-wide">Rekapitulasi Nilai Seluruh Mapel</span>
            </button>

            {/* 2b. Kirim ke Pak Zaki */}
            <button
              type="button"
              onClick={() => setIsSendToPakZakiOpen(true)}
              className="w-full h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-emerald-500/40 shadow-sm cursor-pointer transition-all"
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
                className="h-9 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                title="Unduh seluruh analisis dalam 1 file Excel multi-sheet"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span className="truncate">Download</span>
              </button>

              {/* Import Guru Mapel */}
              <button
                type="button"
                onClick={onOpenImport}
                className="h-9 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 active:scale-[0.98] text-indigo-800 border border-indigo-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                title="Impor file Excel nilai guru mapel ke dalam sesi ini"
              >
                <FolderUp className="w-3.5 h-3.5 text-indigo-600 shrink-0 stroke-[2.2]" />
                <span className="truncate">Import</span>
              </button>

              {/* Ganti Sesi / Pilih Sesi Lain */}
              <button
                type="button"
                onClick={onResetSession}
                className="h-9 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 border border-slate-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                title="Pilih atau beralih ke sesi kelas lain yang pernah dibuat tanpa menghapus data"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600 shrink-0 stroke-[2.5]" />
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
            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">
                        ⚠️ Catatan Revisi dari Pak Zaki
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold border border-amber-300">
                        Perlu Perbaikan
                      </span>
                    </div>
                    <div className="text-xs text-slate-800 font-medium bg-white p-3 rounded-xl border border-amber-200 mt-1.5 leading-relaxed shadow-2xs">
                      "{classSubmission.adminNote || 'Mohon periksa kembali kelengkapan skor siswa.'}"
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Silakan sesuaikan nilai atau butir soal di bawah, lalu klik tombol kirim ulang.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setIsChatModalOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Buka ruang diskusi dan riwayat chat dengan Pak Zaki"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>💬 Diskusi {classSubmission.messages?.length ? `(${classSubmission.messages.length})` : ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSendToPakZakiOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>🚀 Kirim Ulang ke Pak Zaki</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {classSubmission.status === 'telah_diprint' && (
            <div className="bg-cyan-50/80 border border-cyan-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 border border-cyan-300 text-cyan-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-cyan-900">
                      🖨️ Telah di-Print oleh Pak Zaki
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-extrabold border border-cyan-300">
                      Selesai Dicetak
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Berkas fisik analisis kelas ini telah dicetak oleh Pak Zaki untuk pengesahan &amp; arsip sekolah.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-cyan-100/80 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-center"
                title="Buka ruang diskusi dan riwayat chat dengan Pak Zaki"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-700" />
                <span>💬 Ruang Diskusi {classSubmission.messages?.length ? `(${classSubmission.messages.length})` : ''}</span>
              </button>
            </div>
          )}

          {classSubmission.status === 'disetujui' && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-emerald-900">
                      ✓ Telah Disetujui oleh Pak Zaki
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300">
                      Disetujui
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Lembar analisis kelas ini telah diverifikasi &amp; disetujui. Menunggu giliran cetak fisik.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-100/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-center"
                title="Buka ruang diskusi dan riwayat chat dengan Pak Zaki"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                <span>💬 Ruang Diskusi {classSubmission.messages?.length ? `(${classSubmission.messages.length})` : ''}</span>
              </button>
            </div>
          )}

          {classSubmission.status === 'menunggu' && (
            <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-100 border border-sky-300 text-sky-700 flex items-center justify-center shrink-0">
                  <Clock3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-sky-900">
                    ⏳ Sedang Menunggu Verifikasi Pak Zaki
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Lembar analisis telah disetorkan ke Pak Zaki. Menunggu pemeriksaan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-sky-100/80 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-center"
                title="Buka ruang diskusi dan riwayat chat dengan Pak Zaki"
              >
                <MessageSquare className="w-3.5 h-3.5 text-sky-700" />
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
          <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600" />
            Daftar Analisis Mata Pelajaran ({session.subjects.length})
          </h3>
          <span className="text-xs text-slate-500">
            Klik kartu untuk mulai input atau edit nilai butir soal
          </span>
        </div>

        {session.subjects.length === 0 ? (
          /* Empty Subject State */
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 sm:p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200 shadow-2xs">
              <BookOpen className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">Belum Ada Mata Pelajaran yang Ditambahkan</h4>
            <p className="text-xs text-slate-500 max-w-md">
              Tambahkan mata pelajaran untuk mulai mengisi analisis butir soal per siswa, atau impor berkas Excel dari guru mapel.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onAddSubject}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Mata Pelajaran Pertama</span>
              </button>
              <button
                type="button"
                onClick={onOpenImport}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-all shadow-2xs"
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
                  className="bg-white hover:bg-slate-50/60 border border-slate-200/90 hover:border-sky-300 rounded-2xl p-5 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Title + Action buttons */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
                          Sheet: {subj.sheetName}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 truncate group-hover:text-sky-600 transition-colors">
                          {subj.subjectName}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Guru: {subj.teacherName || session.teacherName || '-'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditSubjectConfig(subj)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
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
                              : 'bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600'
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
                        <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200">
                          {subj.config.pgCount} PG
                        </span>
                      )}
                      {subj.config.isianCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                          {subj.config.isianCount} Isian
                        </span>
                      )}
                      {subj.config.cCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                          {subj.config.cCount} {subj.config.cType || 'Uraian'}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                        Skor Maks: {subj.maxScore}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-slate-500 font-semibold">Progres Input Nilai</span>
                        <span className="font-bold text-slate-800 tabular-nums">
                          {stats.completedStudents} / {stats.totalStudents} Siswa ({progressPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 border border-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            progressPct >= 100 ? 'bg-emerald-500 shadow-2xs' : 'bg-sky-500 shadow-2xs'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Stats Pill */}
                    {stats.completedStudents > 0 && (
                      <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-4 text-center">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-semibold">Rata-rata</span>
                          <span className="text-xs font-black text-sky-700 tabular-nums">
                            {stats.averageGrade.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-semibold">Tertinggi</span>
                          <span className="text-xs font-black text-emerald-700 tabular-nums">
                            {stats.highestGrade}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-semibold">% Lulus</span>
                          <span className="text-xs font-black text-slate-800 tabular-nums">
                            {stats.passedPercentage}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onOpenStudentInput(subj)}
                      className="py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Input Nilai</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenSubjectStats(subj)}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
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
