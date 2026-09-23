import React, { useState } from 'react';
import {
  X,
  Send,
  Link as LinkIcon,
  User,
  BookOpen,
  FileCheck,
  HelpCircle,
  FolderUp,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import {
  ExamSubmissionItem,
  CLASS_LEVELS,
  SUBJECTS_SOAL,
  EXAM_TYPES,
  SEMESTER_TYPES,
  ExamUploadConfig,
} from '../types';
import { sanitizeDriveUrl, isValidUrl, openExternalDriveUrl } from '../utils/driveHelpers';

interface UploadSoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ExamSubmissionItem, 'id' | 'submittedAt'>) => Promise<void>;
  availableYears?: string[];
  config?: ExamUploadConfig;
}

const DEFAULT_YEAR_OPTIONS = ['2025/2026', '2024/2025', '2023/2024'];

export const UploadSoalModal: React.FC<UploadSoalModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableYears = DEFAULT_YEAR_OPTIONS,
  config,
}) => {
  const safeYears = availableYears && availableYears.length > 0 ? availableYears : DEFAULT_YEAR_OPTIONS;
  const initialYear = safeYears.find((y) => y !== 'Semua Tahun') || '2025/2026';

  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [subject, setSubject] = useState(SUBJECTS_SOAL[1] || 'Matematika');
  const [classLevel, setClassLevel] = useState(CLASS_LEVELS[1] || 'Kelas 1');
  const [examType, setExamType] = useState(EXAM_TYPES[1] || 'STS Ganjil (Sumatif Tengah Semester 1)');
  const [schoolYear, setSchoolYear] = useState(initialYear);
  const [semester, setSemester] = useState<string>(SEMESTER_TYPES[1] || 'Semester 1 (Ganjil)');
  const [driveUrl, setDriveUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileFormat, setFileFormat] = useState('Word (.docx)');
  const [hasAnswerKey, setHasAnswerKey] = useState(true);
  const [hasGridAnalysis, setHasGridAnalysis] = useState(true);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) {
      setErrorMsg('Mohon lengkapi Nama Guru Pengampu.');
      return;
    }
    if (!driveUrl.trim() || !isValidUrl(driveUrl)) {
      setErrorMsg('Mohon masukkan tautan berkas / folder Google Drive yang valid.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onSubmit({
        teacherName: teacherName.trim(),
        teacherPhone: teacherPhone.trim() || undefined,
        subject,
        classLevel,
        examType,
        schoolYear,
        semester,
        driveUrl: sanitizeDriveUrl(driveUrl),
        fileName: fileName.trim() || undefined,
        fileFormat,
        hasAnswerKey,
        hasGridAnalysis,
        status: 'menunggu',
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg('Gagal mengirim setoran soal: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        id="modal-upload-soal-form"
        className="w-full max-w-2xl bg-[#181B26] border border-[#2B3245] rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-100 max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#252B3B] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-[#24293A]">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0 shadow-inner">
            <FolderUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-xl font-bold text-white font-heading">
              Formulir Setor Soal Ujian Guru
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kirimkan berkas naskah soal ujian, kisi-kisi, dan kunci jawaban untuk panitia asesmen
            </p>
          </div>
        </div>

        {/* Google Drive Dropzone Quick Helper Banner */}
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#19233C]/60 to-emerald-950/30 border border-blue-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
          <div className="text-xs">
            <span className="font-bold text-white flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Folder Google Drive Utama Tersedia
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Bapak/Ibu guru dapat langsung meletakkan file soal ke folder Google Drive bersama sekolah, lalu tempelkan link file pada formulir di bawah.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openExternalDriveUrl(config.driveFolderUrl)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow transition-all cursor-pointer"
          >
            <span>Buka Drive Folder</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Teacher Name & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama Guru Pembuat Soal <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-blue-400 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                No. WhatsApp / Kontak (Opsional)
              </label>
              <input
                type="text"
                value={teacherPhone}
                onChange={(e) => setTeacherPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full px-3 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-blue-400 transition-all"
              />
            </div>
          </div>

          {/* Row 2: Subject & Class Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mata Pelajaran <span className="text-amber-400">*</span>
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-blue-400 transition-all"
              >
                {SUBJECTS_SOAL.filter((s) => s !== 'Semua Mata Pelajaran').map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jenjang / Tingkat Kelas <span className="text-amber-400">*</span>
              </label>
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-blue-400 transition-all"
              >
                {CLASS_LEVELS.filter((c) => c !== 'Semua Kelas').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Exam Type, Semester & School Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jenis Ujian / Asesmen <span className="text-amber-400">*</span>
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as any)}
                className="w-full px-2.5 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-400 transition-all"
              >
                {EXAM_TYPES.filter((t) => t !== 'Semua Jenis Ujian').map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Semester <span className="text-amber-400">*</span>
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-2.5 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-400 transition-all"
              >
                {SEMESTER_TYPES.filter((sem) => sem !== 'Semua Semester').map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tahun Pelajaran <span className="text-amber-400">*</span>
              </label>
              <select
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="w-full px-2.5 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-400 transition-all"
              >
                {safeYears
                  .filter((y) => y !== 'Semua Tahun')
                  .map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Row 4: Google Drive URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tautan Google Drive Berkas Soal <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
              <input
                type="url"
                required
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://docs.google.com/... atau https://drive.google.com/..."
                className="w-full pl-10 pr-3 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-400 transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Bisa berupa tautan file Google Docs/Word atau file yang sudah diunggah di folder Google Drive.
            </p>
          </div>

          {/* Row 5: File Name & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama File Dokumen (Opsional)
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Contoh: Soal_MTK_Kls4_UstAhmad_STS1.docx"
                className="w-full px-3 py-2 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-400 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Format Berkas
              </label>
              <select
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value)}
                className="w-full px-3 py-2 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-400 transition-all"
              >
                <option value="Word (.docx)">Word (.docx)</option>
                <option value="Google Docs">Google Docs</option>
                <option value="PDF (.pdf)">PDF (.pdf)</option>
                <option value="Excel (.xlsx)">Excel (.xlsx)</option>
                <option value="Folder / ZIP">Folder / ZIP</option>
              </select>
            </div>
          </div>

          {/* Row 6: Checkboxes for completeness */}
          <div className="bg-[#12141D] border border-[#24293A] rounded-2xl p-3.5 space-y-2">
            <span className="block text-xs font-bold text-slate-300 mb-1">
              Kelengkapan Dokumen Soal:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={hasAnswerKey}
                  onChange={(e) => setHasAnswerKey(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Kunci Jawaban Disertakan
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={hasGridAnalysis}
                  onChange={(e) => setHasGridAnalysis(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  Kisi-kisi / Analisis Butir Soal
                </span>
              </label>
            </div>
          </div>

          {/* Row 7: Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Catatan untuk Panitia (Opsional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Soal terdiri dari 20 PG + 5 Isian, kunci jawaban di halaman akhir..."
              className="w-full px-3.5 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-400 transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#24293A]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Setoran Soal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
