import React, { useState, useMemo } from 'react';
import {
  FolderUp,
  ExternalLink,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Copy,
  Check,
  Edit2,
  Trash2,
  Archive,
  BookOpen,
  Filter,
  Layers,
  MessageSquare,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ExamSubmissionItem,
  ExamUploadConfig,
  CLASS_LEVELS,
  SUBJECTS_SOAL,
  EXAM_TYPES,
  DocumentItem,
} from '../types';
import { openExternalDriveUrl } from '../utils/driveHelpers';
import { UploadSoalModal } from './UploadSoalModal';
import { EditExamConfigModal } from './EditExamConfigModal';

interface UploadSoalViewProps {
  submissions: ExamSubmissionItem[];
  config: ExamUploadConfig;
  isAdmin: boolean;
  availableYears?: string[];
  onSubmitSubmission: (data: Omit<ExamSubmissionItem, 'id' | 'submittedAt'>) => Promise<void>;
  onUpdateSubmission: (id: string, updates: Partial<ExamSubmissionItem>) => Promise<void>;
  onDeleteSubmission: (id: string) => Promise<void>;
  onArchiveSubmission: (submission: ExamSubmissionItem) => Promise<DocumentItem>;
  onUpdateConfig: (updates: Partial<ExamUploadConfig>) => Promise<void>;
  onOpenUploadModal?: () => void;
}

const DEFAULT_YEARS_FILTER = ['Semua Tahun', '2025/2026', '2024/2025', '2023/2024'];

export const UploadSoalView: React.FC<UploadSoalViewProps> = ({
  submissions,
  config,
  isAdmin,
  availableYears = DEFAULT_YEARS_FILTER,
  onSubmitSubmission,
  onUpdateSubmission,
  onDeleteSubmission,
  onArchiveSubmission,
  onUpdateConfig,
  onOpenUploadModal,
}) => {
  const safeYears = availableYears && availableYears.length > 0 ? availableYears : DEFAULT_YEARS_FILTER;
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [selectedSubject, setSelectedSubject] = useState('Semua Mata Pelajaran');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status');
  const [selectedYear, setSelectedYear] = useState('Semua Tahun');

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Status feedback editing modal/state
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const handleCopyLink = () => {
    if (config.driveFolderUrl) {
      navigator.clipboard.writeText(config.driveFolderUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          sub.teacherName.toLowerCase().includes(q) ||
          sub.subject.toLowerCase().includes(q) ||
          sub.classLevel.toLowerCase().includes(q) ||
          sub.examType.toLowerCase().includes(q) ||
          (sub.fileName && sub.fileName.toLowerCase().includes(q)) ||
          (sub.note && sub.note.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (selectedClass !== 'Semua Kelas' && sub.classLevel !== selectedClass) return false;
      if (selectedSubject !== 'Semua Mata Pelajaran' && sub.subject !== selectedSubject) return false;
      if (selectedStatus !== 'Semua Status' && sub.status !== selectedStatus) return false;
      if (selectedYear !== 'Semua Tahun' && sub.schoolYear !== selectedYear) return false;

      return true;
    });
  }, [submissions, search, selectedClass, selectedSubject, selectedStatus, selectedYear]);

  // Statistics
  const stats = useMemo(() => {
    const total = submissions.length;
    const pending = submissions.filter((s) => s.status === 'menunggu').length;
    const accepted = submissions.filter((s) => s.status === 'diterima').length;
    const revision = submissions.filter((s) => s.status === 'revisi').length;
    return { total, pending, accepted, revision };
  }, [submissions]);

  const handleArchive = async (sub: ExamSubmissionItem) => {
    try {
      setArchivingId(sub.id);
      await onArchiveSubmission(sub);
    } finally {
      setArchivingId(null);
    }
  };

  const handleSaveFeedback = async (id: string) => {
    await onUpdateSubmission(id, { adminFeedback: feedbackText.trim() });
    setEditingFeedbackId(null);
    setFeedbackText('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Hero Box: Google Drive Upload Portal */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1A2033] via-[#161B2B] to-[#121624] border border-[#2B354F] rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <FolderUp className="w-3.5 h-3.5" />
                <span>Portal Pengumpulan Soal Ujian Guru</span>
              </span>
              {config.activePeriod && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {config.activePeriod}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-heading">
              {config.title || 'Folder Google Drive Pengumpulan Soal Ujian'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {config.description ||
                'Bapak/Ibu guru dipersilakan mengunggah berkas soal langsung ke Google Drive bersama atau mencantumkan tautan file pada formulir setor soal di bawah.'}
            </p>

            {config.instructions && (
              <div className="pt-2 text-xs text-amber-300/90 flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span className="font-mono text-[11px] bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  {config.instructions}
                </span>
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto flex-shrink-0">
            {/* Direct Open Google Drive Button */}
            <button
              type="button"
              onClick={() => openExternalDriveUrl(config.driveFolderUrl)}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Buka Folder Google Drive Soal</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <div className="flex items-center gap-2">
              {/* Submit Form Button */}
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Isi Form Setor Soal</span>
              </button>

              {/* Copy Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                title="Salin Tautan Folder Google Drive"
                className="p-2.5 rounded-xl bg-[#12141D] hover:bg-[#202534] border border-[#2B354F] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Admin Edit Link */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  title="Edit Pengaturan Folder & Periode Soal"
                  className="p-2.5 rounded-xl bg-[#1C2130] hover:bg-[#283044] border border-amber-400/40 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#181B26] border border-[#252A3B] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-white leading-none font-heading">
              {stats.total}
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Total Soal Masuk</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181B26] border border-[#252A3B] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-amber-400 leading-none font-heading">
              {stats.pending}
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Menunggu Review</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181B26] border border-[#252A3B] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-emerald-400 leading-none font-heading">
              {stats.accepted}
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Diterima / Siap Cetak</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181B26] border border-[#252A3B] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-rose-400 leading-none font-heading">
              {stats.revision}
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Perlu Revisi</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#181B26] border border-[#262B3C] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama guru, mata pelajaran, jenis ujian, atau catatan..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#12141D] border border-[#282E40] rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Setor Soal Baru</span>
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#222738]">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-400"
          >
            {CLASS_LEVELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-400"
          >
            {SUBJECTS_SOAL.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-400"
          >
            <option value="Semua Status">Semua Status</option>
            <option value="menunggu">Menunggu Review</option>
            <option value="diterima">Diterima / Siap Cetak</option>
            <option value="revisi">Perlu Revisi</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-400"
          >
            {safeYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submissions List / Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-heading">
            <span>Daftar Setoran Soal Guru Masuk</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {filteredSubmissions.length} Berkas
            </span>
          </h3>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center bg-[#181B26] border border-[#272D3E] rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
              <FolderUp className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-300">Belum ada setoran naskah soal yang cocok</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Silakan gunakan tombol "Setor Soal Baru" di atas atau sesuaikan kata kunci pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSubmissions.map((sub) => {
              const dateStr = new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={sub.id}
                  className="bg-[#181B26] border border-[#262C3E] hover:border-[#384260] rounded-3xl p-5 sm:p-6 shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Top Status & Class Pill */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {sub.classLevel}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#12141D] text-slate-300 border border-[#272D3E]">
                          {sub.schoolYear}
                        </span>
                      </div>

                      {/* Status Badge */}
                      {sub.status === 'diterima' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Diterima / Siap</span>
                        </span>
                      )}
                      {sub.status === 'menunggu' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>Menunggu Review</span>
                        </span>
                      )}
                      {sub.status === 'revisi' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-3 h-3" />
                          <span>Perlu Revisi</span>
                        </span>
                      )}
                    </div>

                    {/* Subject & Exam Title */}
                    <div>
                      <h4 className="text-base font-extrabold text-white tracking-tight group-hover:text-blue-300 transition-colors">
                        {sub.subject}
                      </h4>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        {sub.examType} {sub.semester ? `• ${sub.semester}` : ''}
                      </p>
                    </div>

                    {/* Teacher Details & Submitter */}
                    <div className="p-3 bg-[#12141D] border border-[#222738] rounded-2xl text-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">Guru Pengampu:</span>
                        <span className="font-bold text-white">{sub.teacherName}</span>
                      </div>

                      {sub.fileName && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400">Nama Berkas:</span>
                          <span className="font-mono text-[11px] text-blue-400 truncate max-w-[180px]">
                            {sub.fileName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">Waktu Kirim:</span>
                        <span className="text-slate-300 text-[11px]">{dateStr}</span>
                      </div>

                      {/* Completeness tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#1C2130]">
                        {sub.hasAnswerKey ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            ✓ Kunci Jawaban
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md">
                            - Tanpa Kunci
                          </span>
                        )}

                        {sub.hasGridAnalysis ? (
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                            ✓ Kisi-kisi / Analisis
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md">
                            - Tanpa Kisi-kisi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Teacher's Note */}
                    {sub.note && (
                      <p className="text-xs text-slate-400 bg-[#141722] p-2.5 rounded-xl border border-[#222838] italic">
                        "{sub.note}"
                      </p>
                    )}

                    {/* Admin Review Feedback note */}
                    {sub.adminFeedback && (
                      <div className="p-2.5 bg-blue-950/30 border border-blue-500/25 rounded-xl text-xs space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                          Catatan Panitia / Admin:
                        </span>
                        <p className="text-slate-200">{sub.adminFeedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-[#222738] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      {/* Open File in Drive button */}
                      <button
                        type="button"
                        onClick={() => openExternalDriveUrl(sub.driveUrl)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka / Unduh Soal</span>
                      </button>

                      {/* Admin Quick Review status */}
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          {sub.status !== 'diterima' && (
                            <button
                              type="button"
                              onClick={() => onUpdateSubmission(sub.id, { status: 'diterima' })}
                              title="Tandai Diterima"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                            >
                              Terima
                            </button>
                          )}
                          {sub.status !== 'revisi' && (
                            <button
                              type="button"
                              onClick={() => onUpdateSubmission(sub.id, { status: 'revisi' })}
                              title="Minta Revisi"
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold border border-rose-500/30 transition-colors cursor-pointer"
                            >
                              Revisi
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Admin Archive and Feedback Tools */}
                    {isAdmin && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1F2435]">
                        <button
                          type="button"
                          disabled={archivingId === sub.id}
                          onClick={() => handleArchive(sub)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 text-xs font-bold border border-amber-400/30 transition-colors cursor-pointer"
                        >
                          {archivingId === sub.id ? (
                            <span className="w-3 h-3 border-2 border-amber-300 border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                          <span>Arsipkan ke Bank Soal</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFeedbackId(sub.id);
                              setFeedbackText(sub.adminFeedback || '');
                            }}
                            className="p-1.5 rounded-lg bg-[#12141D] hover:bg-[#202534] text-slate-300 hover:text-white border border-[#272D3E] text-xs transition-colors cursor-pointer"
                            title="Tulis Catatan Panitia"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus setoran soal ${sub.subject} (${sub.teacherName})?`)) {
                                onDeleteSubmission(sub.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors cursor-pointer"
                            title="Hapus Setoran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teacher Upload Form Modal */}
      {isSubmitModalOpen && (
        <UploadSoalModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSubmit={onSubmitSubmission}
          availableYears={availableYears}
          config={config}
        />
      )}

      {/* Admin Edit Exam Upload Config Modal */}
      {isConfigModalOpen && (
        <EditExamConfigModal
          isOpen={isConfigModalOpen}
          config={config}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={onUpdateConfig}
        />
      )}

      {/* Quick Feedback Note Modal */}
      {editingFeedbackId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#181B26] border border-[#2B3245] rounded-3xl p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-2 font-heading">
              Catatan / Tanggapan Panitia Soal
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Tulis catatan perbaikan atau konfirmasi untuk guru pembuat soal
            </p>
            <textarea
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Contoh: Format naskah sudah oke, siap dicetak..."
              className="w-full px-3.5 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-400 transition-all resize-none mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFeedbackId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveFeedback(editingFeedbackId)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow cursor-pointer"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
