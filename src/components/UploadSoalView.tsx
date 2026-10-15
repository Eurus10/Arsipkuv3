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
    <div className="space-y-6 animate-fade-in pb-16 font-sans text-slate-800">
      {/* Top Hero Box: Google Drive Upload Portal */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/60 border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
        {/* Subtle Decorative Gradient */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-100/40 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                <FolderUp className="w-3.5 h-3.5" />
                <span>Portal Pengumpulan Soal Ujian Guru</span>
              </span>
              {config.activePeriod && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {config.activePeriod}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {config.title || 'Folder Google Drive Pengumpulan Soal Ujian'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {config.description ||
                'Bapak/Ibu guru dipersilakan mengunggah berkas soal langsung ke Google Drive bersama atau mencantumkan tautan file pada formulir setor soal di bawah.'}
            </p>

            {config.instructions && (
              <div className="pt-2 text-xs text-amber-900 flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span className="font-mono text-[11px] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
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
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Buka Folder Google Drive Soal</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <div className="flex items-center gap-2">
              {/* Submit Form Button */}
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Isi Form Setor Soal</span>
              </button>

              {/* Copy Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                title="Salin Tautan Folder Google Drive"
                className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Admin Edit Link */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  title="Edit Pengaturan Folder & Periode Soal"
                  className="p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-700 hover:text-amber-800 transition-colors cursor-pointer shadow-2xs"
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
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-slate-900 leading-none font-heading">
              {stats.total}
            </span>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Total Soal Masuk</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-amber-600 leading-none font-heading">
              {stats.pending}
            </span>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Menunggu Review</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-emerald-600 leading-none font-heading">
              {stats.accepted}
            </span>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Diterima / Siap Cetak</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-rose-600 leading-none font-heading">
              {stats.revision}
            </span>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Perlu Revisi</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama guru, mata pelajaran, jenis ujian, atau catatan..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Setor Soal Baru</span>
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="Semua Status">Semua Status</option>
            <option value="menunggu">Menunggu Review</option>
            <option value="diterima">Diterima / Siap Cetak</option>
            <option value="revisi">Perlu Revisi</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
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
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
            <span>Daftar Setoran Soal Guru Masuk</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {filteredSubmissions.length} Berkas
            </span>
          </h3>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderUp className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">Belum ada setoran naskah soal yang cocok</h4>
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
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Top Status & Class Pill */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                          {sub.classLevel}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                          {sub.schoolYear}
                        </span>
                      </div>

                      {/* Status Badge */}
                      {sub.status === 'diterima' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Diterima / Siap</span>
                        </span>
                      )}
                      {sub.status === 'menunggu' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Menunggu Review</span>
                        </span>
                      )}
                      {sub.status === 'revisi' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3" />
                          <span>Perlu Revisi</span>
                        </span>
                      )}
                    </div>

                    {/* Subject & Exam Title */}
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                        {sub.subject}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        {sub.examType} {sub.semester ? `• ${sub.semester}` : ''}
                      </p>
                    </div>

                    {/* Teacher Details & Submitter */}
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500">Guru Pengampu:</span>
                        <span className="font-bold text-slate-900">{sub.teacherName}</span>
                      </div>

                      {sub.fileName && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">Nama Berkas:</span>
                          <span className="font-mono text-[11px] text-blue-600 truncate max-w-[180px]">
                            {sub.fileName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500">Waktu Kirim:</span>
                        <span className="text-slate-600 text-[11px]">{dateStr}</span>
                      </div>

                      {/* Completeness tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-200/70">
                        {sub.hasAnswerKey ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            ✓ Kunci Jawaban
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            - Tanpa Kunci
                          </span>
                        )}

                        {sub.hasGridAnalysis ? (
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                            ✓ Kisi-kisi / Analisis
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            - Tanpa Kisi-kisi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Teacher's Note */}
                    {sub.note && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 italic">
                        "{sub.note}"
                      </p>
                    )}

                    {/* Admin Review Feedback note */}
                    {sub.adminFeedback && (
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                          Catatan Panitia / Admin:
                        </span>
                        <p className="text-slate-800">{sub.adminFeedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      {/* Open File in Drive button */}
                      <button
                        type="button"
                        onClick={() => openExternalDriveUrl(sub.driveUrl)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
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
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                            >
                              Terima
                            </button>
                          )}
                          {sub.status !== 'revisi' && (
                            <button
                              type="button"
                              onClick={() => onUpdateSubmission(sub.id, { status: 'revisi' })}
                              title="Minta Revisi"
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                            >
                              Revisi
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Admin Archive and Feedback Tools */}
                    {isAdmin && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={archivingId === sub.id}
                          onClick={() => handleArchive(sub)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                        >
                          {archivingId === sub.id ? (
                            <span className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
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
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs transition-colors cursor-pointer"
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
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl text-slate-800">
            <h3 className="text-base font-bold text-slate-900 mb-1 font-heading">
              Catatan / Tanggapan Panitia Soal
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Tulis catatan perbaikan atau konfirmasi untuk guru pembuat soal
            </p>
            <textarea
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Contoh: Format naskah sudah oke, siap dicetak..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-all resize-none mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFeedbackId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveFeedback(editingFeedbackId)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
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
