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
    if (!title.trim()) {
      setErrorMsg('Nama atau judul berkas tidak boleh kosong.');
      return;
    }
    if (!driveUrl.trim() || !isValidUrl(driveUrl)) {
      setErrorMsg('Masukkan tautan Google Drive / Docs / Sheets yang valid.');
      return;
    }

    const finalYear = isCustomYear && customYearText.trim() ? customYearText.trim() : schoolYear;
    if (!finalYear || finalYear === 'custom') {
      setErrorMsg('Tahun pelajaran tidak boleh kosong.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      let docCategory = category;
      if (type === 'soal' && !docCategory) {
        docCategory = 'Bank Soal';
      }

      const updates: Partial<Omit<DocumentItem, 'id' | 'createdAt'>> = {
        title: title.trim(),
        type,
        category: docCategory.trim() || 'Umum',
        classLevel: type === 'sertifikat' ? (classLevel || 'Umum / Guru') : classLevel,
        subject: type === 'soal' ? subject : undefined,
        examType: type === 'soal' ? examType : undefined,
        recipient: type === 'sertifikat' ? recipient : undefined,
        certificateNumber:
          type === 'sertifikat' && certificateNumber.trim() ? certificateNumber.trim() : undefined,
        semester: type === 'rapor' ? semester : undefined,
        schoolYear: finalYear,
        driveUrl: sanitizeDriveUrl(driveUrl),
        note: note.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      await onSave(doc.id, updates);
      onClose();
    } catch (err: any) {
      setErrorMsg('Gagal menyimpan perubahan berkas: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(doc.id);
      onClose();
    } catch (err: any) {
      setErrorMsg('Gagal menghapus berkas: ' + (err?.message || 'Terjadi kesalahan'));
      setIsDeleting(false);
    }
  };

  const getTypeTheme = () => {
    switch (type) {
      case 'administrasi':
        return {
          icon: <FolderTree className="w-5 h-5 text-indigo-400" />,
          badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          title: 'Administrasi Kelas Guru',
          accent: 'border-indigo-500 focus:border-indigo-400',
        };
      case 'soal':
        return {
          icon: <BookOpenCheck className="w-5 h-5 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          title: 'Bank Soal & Ujian',
          accent: 'border-emerald-500 focus:border-emerald-400',
        };
      case 'sertifikat':
        return {
          icon: <Award className="w-5 h-5 text-amber-400" />,
          badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          title: 'Arsip Sertifikat & Piagam',
          accent: 'border-amber-500 focus:border-amber-400',
        };
      case 'rapor':
        return {
          icon: <GraduationCap className="w-5 h-5 text-cyan-400" />,
          badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          title: 'Arsip Rapor Siswa',
          accent: 'border-cyan-500 focus:border-cyan-400',
        };
    }
  };

  const theme = getTypeTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        id="modal-edit-document"
        className="w-full max-w-2xl bg-[#151823] border border-[#272D3E] rounded-3xl p-5 sm:p-7 shadow-2xl relative text-slate-100 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#222838] transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-4 pb-4 border-b border-[#24293A] flex-shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-[#0F111A] border border-[#272D3E] flex items-center justify-center flex-shrink-0 shadow-inner">
            {theme.icon}
          </div>
          <div className="pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white font-heading">
                Edit Berkas & Tautan Folder
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${theme.badgeBg}`}
              >
                {theme.title}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {doc.title || 'Ubah rincian berkas atau link Google Drive'}
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Delete Confirmation Warning */}
        {showDeleteConfirm && (
          <div className="mb-4 p-4 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-xs text-rose-200 flex-shrink-0 animate-fade-in">
            <div className="font-bold text-sm text-rose-300 mb-1 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              Konfirmasi Hapus Berkas Ini?
            </div>
            <p className="text-slate-300 mb-3 leading-relaxed">
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
                className="px-3 py-1.5 bg-[#202534] hover:bg-[#2B3245] text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nama Berkas / Folder <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Folder Administrasi Kelas 1A / Soal STS Ganjil PAI"
              className="w-full px-3.5 py-2.5 bg-[#0F111A] border border-[#272D3E] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all font-medium"
            />
          </div>

          {/* Tautan Google Drive */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Tautan Google Drive / Docs / Sheets <span className="text-amber-400">*</span>
              </label>
              {driveUrl && isValidUrl(driveUrl) && (
                <button
                  type="button"
                  onClick={() => openExternalDriveUrl(driveUrl)}
                  className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer font-medium"
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
                className="w-full pl-10 pr-4 py-2.5 bg-[#0F111A] border border-[#272D3E] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-400 transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Mendukung link Folder Google Drive, Google Docs, Sheets, Slide, atau PDF.
            </p>
          </div>

          {/* Menu & Kategori Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kategori Berkas
              </label>
              {type === 'administrasi' && (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0F111A] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 bg-[#0F111A] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all"
                />
              )}

              {type === 'sertifikat' && (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0F111A] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 bg-[#0F111A] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all cursor-pointer"
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jenjang Kelas
              </label>
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0F111A] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all cursor-pointer"
              >
                {CLASS_LEVELS.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contextual Fields depending on Type */}
          {type === 'soal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 bg-[#0F111A]/80 border border-[#272D3E] rounded-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Jenis Ujian
                </label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181B26] border border-[#2E364B] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  {EXAM_TYPES.filter((et) => et !== 'Semua Jenis Ujian').map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                  <option value="Penilaian Harian (PH)">Penilaian Harian (PH)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Contoh: Matematika / PAI / Semua Mapel"
                  className="w-full px-3 py-2 bg-[#181B26] border border-[#2E364B] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          )}

          {type === 'sertifikat' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 bg-[#0F111A]/80 border border-[#272D3E] rounded-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Penerima
                </label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181B26] border border-[#2E364B] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {RECIPIENT_TYPES.filter((r) => r !== 'Semua Penerima').map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor Sertifikat (Opsional)
                </label>
                <input
                  type="text"
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  placeholder="Contoh: 042/SDIT-AF/SERTIF/2025"
                  className="w-full px-3 py-2 bg-[#181B26] border border-[#2E364B] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-mono text-xs"
                />
              </div>
            </div>
          )}

          {type === 'rapor' && (
            <div className="p-3 bg-[#0F111A]/80 border border-[#272D3E] rounded-2xl">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 bg-[#181B26] border border-[#2E364B] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {SEMESTER_TYPES.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tahun Pelajaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tahun Pelajaran
              </label>
              <select
                value={isCustomYear ? 'custom' : schoolYear}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomYear(true);
                  } else {
                    setIsCustomYear(false);
                    setSchoolYear(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-[#0F111A] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
                <option value="custom">+ Tulis Tahun Pelajaran Baru...</option>
              </select>
            </div>

            {isCustomYear && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                  Tulis Tahun Pelajaran Baru
                </label>
                <input
                  type="text"
                  required
                  value={customYearText}
                  onChange={(e) => setCustomYearText(e.target.value)}
                  placeholder="Contoh: 2026/2027 atau 2027-2028"
                  className="w-full px-3.5 py-2.5 bg-[#0F111A] border border-amber-400/50 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            )}
          </div>

          {/* Catatan / Keterangan Tambahan */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Catatan / Keterangan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Berisi file RPP, Prota, Promes, dan Jurnal Mengajar Semester 1"
              className="w-full px-3.5 py-2 bg-[#0F111A] border border-[#272D3E] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all resize-none"
            />
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#24293A]">
            <div>
              {onDelete && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 bg-[#0F111A] hover:bg-[#202534] border border-[#272D3E] rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
