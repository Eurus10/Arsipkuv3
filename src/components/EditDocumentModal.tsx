import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  ExternalLink,
  Link as LinkIcon,
  FolderTree,
  BookOpenCheck,
  Award,
  GraduationCap,
  Calendar,
  Layers,
  FileText,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  DocumentItem,
  DocumentType,
  CATEGORIES_ADMINISTRASI,
  CATEGORIES_SERTIFIKAT,
  CATEGORIES_RAPOR,
  SEMESTER_TYPES,
  RECIPIENT_TYPES,
  CLASS_LEVELS,
  EXAM_TYPES,
  SUBJECTS_SOAL,
} from '../types';
import { sanitizeDriveUrl, isValidUrl, openExternalDriveUrl } from '../utils/driveHelpers';

interface EditDocumentModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  availableYears: string[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Omit<DocumentItem, 'id' | 'createdAt'>>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  isOpen,
  document: doc,
  availableYears,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('administrasi');
  const [category, setCategory] = useState('');
  const [classLevel, setClassLevel] = useState('Kelas 1');
  const [subject, setSubject] = useState('Semua Mata Pelajaran');
  const [examType, setExamType] = useState('STS Ganjil (Sumatif Tengah Semester 1)');
  const [recipient, setRecipient] = useState('Guru & Tendik');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [semester, setSemester] = useState('Semester 1 (Ganjil)');
  const [schoolYear, setSchoolYear] = useState('2025/2026');
  const [isCustomYear, setIsCustomYear] = useState(false);
  const [customYearText, setCustomYearText] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [note, setNote] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title || '');
      setType(doc.type || 'administrasi');
      setCategory(doc.category || '');
      setClassLevel(doc.classLevel || 'Kelas 1');
      setSubject(doc.subject || 'Semua Mata Pelajaran');
      setExamType(doc.examType || 'STS Ganjil (Sumatif Tengah Semester 1)');
      setRecipient(doc.recipient || 'Guru & Tendik');
      setCertificateNumber(doc.certificateNumber || '');
      setSemester(doc.semester || 'Semester 1 (Ganjil)');

      const currentYear = doc.schoolYear || '2025/2026';
      if (availableYears.includes(currentYear)) {
        setSchoolYear(currentYear);
        setIsCustomYear(false);
        setCustomYearText('');
      } else {
        setSchoolYear('custom');
        setIsCustomYear(true);
        setCustomYearText(currentYear);
      }

      setDriveUrl(doc.driveUrl || '');
      setNote(doc.note || '');
      setErrorMsg(null);
      setShowDeleteConfirm(false);
    }
  }, [doc, isOpen, availableYears]);

  if (!isOpen || !doc) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanTitle = title.trim();
    const cleanUrl = sanitizeDriveUrl(driveUrl.trim());

    if (!cleanTitle) {
      setErrorMsg('Nama berkas atau folder wajib diisi.');
      return;
    }

    if (!cleanUrl) {
      setErrorMsg('Tautan Google Drive wajib diisi.');
      return;
    }

    if (!isValidUrl(cleanUrl)) {
      setErrorMsg('Format tautan URL Google Drive tidak valid. Pastikan diawali dengan https://');
      return;
    }

    const finalSchoolYear = isCustomYear ? customYearText.trim() : schoolYear;
    if (!finalSchoolYear) {
      setErrorMsg('Tahun ajaran wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(doc.id, {
        title: cleanTitle,
        type,
        category: category || doc.category,
        classLevel,
        subject: type === 'soal' ? subject : undefined,
        examType: type === 'soal' ? examType : undefined,
        recipient: type === 'sertifikat' ? recipient : undefined,
        certificateNumber: type === 'sertifikat' ? certificateNumber : undefined,
        semester: type === 'rapor' ? semester : undefined,
        schoolYear: finalSchoolYear,
        driveUrl: cleanUrl,
        note: note.trim(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan perubahan berkas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(doc.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghapus berkas.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getTypeTheme = () => {
    switch (type) {
      case 'administrasi':
        return {
          icon: <FolderTree className="w-5 h-5 text-[#176B45]" />,
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          title: 'Administrasi Guru',
          accent: 'border-[#176B45] focus:border-[#176B45]',
        };
      case 'soal':
        return {
          icon: <BookOpenCheck className="w-5 h-5 text-teal-600" />,
          badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
          title: 'Bank Soal & Penilaian',
          accent: 'border-teal-600 focus:border-teal-500',
        };
      case 'sertifikat':
        return {
          icon: <Award className="w-5 h-5 text-amber-600" />,
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          title: 'Arsip Sertifikat & Piagam',
          accent: 'border-amber-600 focus:border-amber-500',
        };
      case 'rapor':
        return {
          icon: <GraduationCap className="w-5 h-5 text-cyan-600" />,
          badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
          title: 'Arsip Rapor Siswa',
          accent: 'border-cyan-600 focus:border-cyan-500',
        };
    }
  };

  const theme = getTypeTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        id="modal-edit-document"
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xl relative text-slate-800 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-4 pb-4 border-b border-slate-200 flex-shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 shadow-inner">
            {theme.icon}
          </div>
          <div className="pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Edit Berkas & Tautan Folder
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${theme.badgeBg}`}
              >
                {theme.title}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {doc.title || 'Ubah rincian berkas atau link Google Drive'}
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Delete Confirmation Warning */}
        {showDeleteConfirm && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex-shrink-0 animate-fade-in">
            <div className="font-bold text-sm text-rose-900 mb-1 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              Konfirmasi Hapus Berkas Ini?
            </div>
            <p className="text-slate-700 mb-3 leading-relaxed">
              Berkas <strong>"{doc.title}"</strong> akan dihapus dari daftar arsip. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Sekarang'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Judul Dokumen / Folder */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Berkas / Folder <span className="text-amber-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Folder Administrasi Kelas 1A / Soal STS Ganjil PAI"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Tautan Google Drive */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tautan Google Drive / Docs / Sheets <span className="text-amber-600">*</span>
              </label>
              {driveUrl && isValidUrl(driveUrl) && (
                <button
                  type="button"
                  onClick={() => openExternalDriveUrl(driveUrl)}
                  className="text-[11px] text-[#176B45] hover:text-[#125335] flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>Buka Uji Tautan</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="url"
                required
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/... atau https://docs.google.com/..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Mendukung link Folder Google Drive, Google Docs, Sheets, Slide, atau PDF.
            </p>
          </div>

          {/* Menu & Kategori Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kategori Berkas
              </label>
              {type === 'administrasi' && (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all cursor-pointer"
                >
                  {CATEGORIES_ADMINISTRASI.filter((c) => c !== 'Semua Kategori').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Administrasi Guru">Administrasi Guru</option>
                </select>
              )}

              {type === 'soal' && (
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Contoh: Bank Soal / Naskah Asesmen"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all"
                />
              )}

              {type === 'sertifikat' && (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all cursor-pointer"
                >
                  {CATEGORIES_SERTIFIKAT.filter((c) => c !== 'Semua Kategori').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}

              {type === 'rapor' && (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all cursor-pointer"
                >
                  {CATEGORIES_RAPOR.filter((c) => c !== 'Semua Kategori Rapor').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenjang Kelas
              </label>
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all cursor-pointer"
              >
                {CLASS_LEVELS.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Fields for Soal, Sertifikat, Rapor */}
          {type === 'soal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mata Pelajaran
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all cursor-pointer"
                >
                  {SUBJECTS_SOAL.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jenis Ujian / Asesmen
                </label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all cursor-pointer"
                >
                  {EXAM_TYPES.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'sertifikat' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Penerima
                </label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all cursor-pointer"
                >
                  {RECIPIENT_TYPES.map((rec) => (
                    <option key={rec} value={rec}>
                      {rec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nomor Sertifikat / Piagam (Opsional)
                </label>
                <input
                  type="text"
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  placeholder="Contoh: 042/SDIT-AF/SERTIF/2025"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          )}

          {type === 'rapor' && (
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Semester Rapor
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all cursor-pointer"
              >
                {SEMESTER_TYPES.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tahun Ajaran */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tahun Ajaran <span className="text-amber-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomYear(!isCustomYear);
                  if (!isCustomYear) setSchoolYear('custom');
                  else setSchoolYear(availableYears[0] || '2025/2026');
                }}
                className="text-[11px] text-[#176B45] hover:text-[#125335] font-medium cursor-pointer"
              >
                {isCustomYear ? 'Pilih dari Daftar' : '+ Ketik Manual'}
              </button>
            </div>

            {!isCustomYear ? (
              <select
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={customYearText}
                onChange={(e) => setCustomYearText(e.target.value)}
                placeholder="Contoh: 2026/2027 atau 2027-2028"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all font-mono"
              />
            )}
          </div>

          {/* Catatan / Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan / Keterangan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tambahkan catatan khusus mengenai berkas ini..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#176B45] focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            {onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Berkas</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#176B45] hover:bg-[#125335] active:scale-95 border border-[#176B45] rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
