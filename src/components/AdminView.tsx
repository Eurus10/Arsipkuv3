import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Check,
  X,
  FolderPlus,
  RotateCcw,
  Search,
  Award,
  BookOpenCheck,
  GraduationCap,
  Lock,
  LogOut,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Calendar,
  FolderTree,
  Folder,
  CheckSquare,
  Square,
  AlertTriangle,
  Download,
  Upload,
  Cloud,
  CloudCheck,
  FileJson,
  FileSpreadsheet,
  LayoutTemplate,
  FileDown,
  FolderUp,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  Info,
  Key,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import {
  DocumentItem,
  DocumentType,
  SchoolTemplateItem,
  ExamUploadConfig,
  DEFAULT_EXAM_CONFIG,
  ExamSubmissionItem,
  CATEGORIES_ADMINISTRASI,
  CATEGORIES_SERTIFIKAT,
  CATEGORIES_RAPOR,
  SEMESTER_TYPES,
  RECIPIENT_TYPES,
  CLASS_LEVELS,
  EXAM_TYPES,
} from '../types';
import { sanitizeDriveUrl, openExternalDriveUrl } from '../utils/driveHelpers';
import { setAdminPassword } from '../services/auth';
import {
  getStoredSchoolYears,
  addStoredSchoolYear,
  deleteStoredSchoolYear,
  getAllSchoolYears,
  exportBackupJSON,
  importBackupJSON,
} from '../services/storage';
import { EditTemplateModal } from './EditTemplateModal';
import { EditExamConfigModal } from './EditExamConfigModal';
import { AdminTokenManagerModal } from './admin/AdminTokenManagerModal';
import { AdminTeacherManagerModal } from './admin/AdminTeacherManagerModal';
import { AdminLogoManagerModal } from './admin/AdminLogoManagerModal';
import { FirestoreQuotaWidget } from './admin/FirestoreQuotaWidget';
import { AppBranding, DEFAULT_BRANDING } from '../services/brandingStorage';

interface AdminViewProps {
  documents: DocumentItem[];
  templates?: SchoolTemplateItem[];
  examConfig?: ExamUploadConfig;
  examSubmissions?: ExamSubmissionItem[];
  onAddDocument: (doc: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateDocument: (id: string, updates: Partial<Omit<DocumentItem, 'id' | 'createdAt'>>) => void;
  onDeleteDocument: (id: string) => void;
  onDeleteMultipleDocuments?: (ids: string[]) => void;
  onClearAllDocuments?: () => void;
  onResetDefaults: () => void;
  onLogout: () => void;
  editingDocId?: string | null;
  onClearEditing?: () => void;
  onUpdateTemplate?: (templateId: string, updates: Partial<SchoolTemplateItem>) => Promise<void>;
  onUpdateExamConfig?: (updates: Partial<ExamUploadConfig>) => Promise<void>;
  onUpdateExamSubmission?: (id: string, updates: Partial<ExamSubmissionItem>) => Promise<void>;
  onDeleteExamSubmission?: (id: string) => Promise<void>;
  onArchiveExamSubmission?: (submission: ExamSubmissionItem) => Promise<DocumentItem>;
  branding?: AppBranding;
  onBrandingUpdated?: (newBranding: AppBranding) => void;
  showNotification?: (message: string, type?: 'success' | 'info') => void;
  onPreviewTeacher?: (teacher: import('../types').TeacherUser) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  documents,
  templates = [],
  examConfig = DEFAULT_EXAM_CONFIG,
  examSubmissions = [],
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onDeleteMultipleDocuments,
  onClearAllDocuments,
  onResetDefaults,
  onLogout,
  editingDocId,
  onClearEditing,
  onUpdateTemplate,
  onUpdateExamConfig,
  onUpdateExamSubmission,
  onDeleteExamSubmission,
  onArchiveExamSubmission,
  branding = DEFAULT_BRANDING,
  onBrandingUpdated,
  showNotification,
  onPreviewTeacher,
}) => {
  // Template editing state
  const [selectedTemplateToEdit, setSelectedTemplateToEdit] = useState<SchoolTemplateItem | null>(null);
  const [isEditExamConfigOpen, setIsEditExamConfigOpen] = useState(false);
  const [archivingSubId, setArchivingSubId] = useState<string | null>(null);
  const [showTokenManagerModal, setShowTokenManagerModal] = useState(false);
  const [showTeacherManagerModal, setShowTeacherManagerModal] = useState(false);
  const [showLogoManagerModal, setShowLogoManagerModal] = useState(false);

  // Available school years state
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [yearSuccessMsg, setYearSuccessMsg] = useState<string | null>(null);
  const [yearErrorMsg, setYearErrorMsg] = useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState<boolean>(!!editingDocId);
  const [currentId, setCurrentId] = useState<string | null>(editingDocId || null);

  const [type, setType] = useState<DocumentType>('administrasi');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES_ADMINISTRASI[1]);
  const [classLevel, setClassLevel] = useState<string>('Kelas 1');
  const [subject, setSubject] = useState<string>('Semua Mata Pelajaran');
  const [examType, setExamType] = useState<string>(EXAM_TYPES[1] || 'STS Ganjil (Sumatif Tengah Semester 1)');
  const [recipient, setRecipient] = useState<string>('Guru & Tendik');
  const [certificateNumber, setCertificateNumber] = useState<string>('');
  const [semester, setSemester] = useState<string>('Semester 1 (Ganjil)');
  const [schoolYear, setSchoolYear] = useState<string>('2025/2026');
  const [isCustomYearMode, setIsCustomYearMode] = useState(false);
  const [customYearText, setCustomYearText] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [note, setNote] = useState('');

  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Selection and Delete Modals
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);

  // Password Change Modal / Section
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassText, setShowPassText] = useState(false);
  const [passChangeSuccess, setPassChangeSuccess] = useState<string | null>(null);
  const [passChangeError, setPassChangeError] = useState<string | null>(null);

  // Backup and Restore State
  const [backupMessage, setBackupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    try {
      exportBackupJSON(documents);
      setBackupMessage({
        text: `Cadangan JSON berhasil diunduh (${documents.length} arsip dokumen).`,
        type: 'success',
      });
      setTimeout(() => setBackupMessage(null), 4000);
    } catch (err) {
      setBackupMessage({
        text: 'Gagal mengunduh file cadangan.',
        type: 'error',
      });
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBackupMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await importBackupJSON(parsed);

      if (result.success) {
        setBackupMessage({
          text: result.message,
          type: 'success',
        });
        refreshSchoolYears();
      } else {
        setBackupMessage({
          text: result.message,
          type: 'error',
        });
      }
    } catch (err) {
      setBackupMessage({
        text: 'Gagal membaca file cadangan. Pastikan file berformat JSON valid.',
        type: 'error',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setBackupMessage(null), 6000);
    }
  };

  // Sync available school years
  const refreshSchoolYears = () => {
    const years = getAllSchoolYears(documents);
    setAvailableYears(years);
    if (!schoolYear && years.length > 0) {
      setSchoolYear(years[0]);
    }
  };

  useEffect(() => {
    refreshSchoolYears();
  }, [documents]);

  // When editingDocId prop changes or user clicks edit
  useEffect(() => {
    if (editingDocId) {
      const doc = documents.find((d) => d.id === editingDocId);
      if (doc) {
        populateForm(doc);
      }
    }
  }, [editingDocId, documents]);

  const populateForm = (doc: DocumentItem) => {
    setIsEditing(true);
    setCurrentId(doc.id);
    setType(doc.type);
    setTitle(doc.title);
    setCategory(
      doc.category ||
        (doc.type === 'sertifikat'
          ? CATEGORIES_SERTIFIKAT[1]
          : doc.type === 'rapor'
          ? CATEGORIES_RAPOR[1]
          : CATEGORIES_ADMINISTRASI[1])
    );
    setClassLevel(doc.classLevel || 'Kelas 1');
    setSubject(doc.subject || 'Semua Mata Pelajaran');
    setExamType(doc.examType || 'STS');
    setRecipient(doc.recipient || 'Guru & Tendik');
    setCertificateNumber(doc.certificateNumber || '');
    setSemester(doc.semester || 'Semester 1 (Ganjil)');
    setSchoolYear(doc.schoolYear || '2025/2026');
    setIsCustomYearMode(false);
    setCustomYearText('');
    setDriveUrl(doc.driveUrl || '');
    setNote(doc.note || '');
    setFormSuccessMessage(null);
    setFormErrorMessage(null);
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setTitle('');
    setType('administrasi');
    setCategory(CATEGORIES_ADMINISTRASI[1]);
    setClassLevel('Kelas 1');
    setSubject('Semua Mata Pelajaran');
    setExamType('STS');
    setRecipient('Guru & Tendik');
    setCertificateNumber('');
    setSemester('Semester 1 (Ganjil)');
    const defaultY = availableYears[0] || '2025/2026';
    setSchoolYear(defaultY);
    setIsCustomYearMode(false);
    setCustomYearText('');
    setDriveUrl('');
    setNote('');
    setFormErrorMessage(null);
    if (onClearEditing) onClearEditing();
  };

  // Quick school year creation handler
  const handleAddNewSchoolYear = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanYear = newYearInput.trim();
    if (!cleanYear) {
      setYearErrorMsg('Tahun pelajaran tidak boleh kosong (contoh: 2026/2027 atau 2025-2026).');
      return;
    }
    const updated = await addStoredSchoolYear(cleanYear);
    setAvailableYears(updated);
    setSchoolYear(cleanYear);
    setNewYearInput('');
    setYearSuccessMsg(`Tahun pelajaran "${cleanYear}" berhasil ditambahkan dan siap digunakan.`);
    setYearErrorMsg(null);
    setTimeout(() => {
      setYearSuccessMsg(null);
      setShowAddYearModal(false);
    }, 2000);
  };

  const handleDeleteSchoolYear = async (yearToDelete: string) => {
    if (window.confirm(`Hapus tahun pelajaran "${yearToDelete}" dari daftar pilihan?`)) {
      const updated = await deleteStoredSchoolYear(yearToDelete);
      setAvailableYears(updated);
      if (schoolYear === yearToDelete) {
        setSchoolYear(updated[0] || '2025/2026');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormErrorMessage('Nama dokumen wajib diisi.');
      return;
    }

    if (!driveUrl.trim()) {
      setFormErrorMessage('Link Google Drive wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormErrorMessage(null);

    try {
      // Determine school year
      let finalSchoolYear = schoolYear;
      if (isCustomYearMode && customYearText.trim()) {
        finalSchoolYear = customYearText.trim();
        await addStoredSchoolYear(finalSchoolYear);
        refreshSchoolYears();
      }

      const cleanedUrl = sanitizeDriveUrl(driveUrl);

      let docCategory = category;
      if (type === 'soal') {
        docCategory = 'Bank Soal';
      }

      const docPayload: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'> = {
        type,
        title: title.trim(),
        category: docCategory,
        classLevel: type === 'sertifikat' ? (classLevel || 'Umum / Guru') : classLevel,
        subject: type === 'soal' ? 'Semua Mata Pelajaran' : undefined,
        examType: type === 'soal' ? examType : undefined,
        recipient: type === 'sertifikat' ? recipient : undefined,
        certificateNumber: type === 'sertifikat' && certificateNumber.trim() ? certificateNumber.trim() : undefined,
        semester: type === 'rapor' ? semester : undefined,
        schoolYear: finalSchoolYear,
        driveUrl: cleanedUrl,
        note: note.trim() || undefined,
      };

      if (isEditing && currentId) {
        await onUpdateDocument(currentId, docPayload);
        setFormSuccessMessage(`Dokumen "${title}" berhasil diperbarui.`);
      } else {
        await onAddDocument(docPayload);
        setFormSuccessMessage(`Dokumen "${title}" berhasil disimpan dan tersinkronisasi.`);
      }

      // Auto clear success message after 3.5 seconds
      setTimeout(() => {
        setFormSuccessMessage(null);
      }, 3500);

      resetForm();
    } catch (err: any) {
      console.error('Gagal menyimpan dokumen:', err);
      setFormErrorMessage('Gagal menyimpan dokumen: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (doc) {
      setDocToDelete(doc);
    } else {
      onDeleteDocument(id);
      setDeleteConfirmId(null);
      if (currentId === id) {
        resetForm();
      }
    }
  };

  const handleConfirmSingleDelete = () => {
    if (docToDelete) {
      onDeleteDocument(docToDelete.id);
      if (currentId === docToDelete.id) {
        resetForm();
      }
      setSelectedIds((prev) => prev.filter((x) => x !== docToDelete.id));
      setDocToDelete(null);
      setDeleteConfirmId(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredAdminDocs.length && filteredAdminDocs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAdminDocs.map((d) => d.id));
    }
  };

  const handleConfirmBatchDelete = () => {
    if (onDeleteMultipleDocuments) {
      onDeleteMultipleDocuments(selectedIds);
    } else {
      selectedIds.forEach((id) => onDeleteDocument(id));
    }
    if (currentId && selectedIds.includes(currentId)) {
      resetForm();
    }
    setSelectedIds([]);
    setShowBatchDeleteModal(false);
  };

  const handleConfirmClearAll = () => {
    if (onClearAllDocuments) {
      onClearAllDocuments();
    } else {
      documents.forEach((d) => onDeleteDocument(d.id));
    }
    setSelectedIds([]);
    setShowClearAllModal(false);
    resetForm();
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.trim().length < 3) {
      setPassChangeError('Kata sandi baru minimal 3 karakter.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setPassChangeError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      const success = await setAdminPassword(newPassword.trim());
      if (success) {
        setPassChangeSuccess('Kata sandi admin berhasil diperbarui!');
        setPassChangeError(null);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordChangeModal(false);
          setPassChangeSuccess(null);
        }, 2000);
      } else {
        setPassChangeError('Gagal menyimpan kata sandi baru. Pastikan sesi admin aktif.');
      }
    } catch (err) {
      setPassChangeError('Terjadi kesalahan saat memperbarui kata sandi.');
    }
  };

  const filteredAdminDocs = documents.filter((d) => {
    if (!adminSearch.trim()) return true;
    const q = adminSearch.toLowerCase().trim();
    return (
      d.title.toLowerCase().includes(q) ||
      (d.subject && d.subject.toLowerCase().includes(q)) ||
      (d.category && d.category.toLowerCase().includes(q)) ||
      (d.recipient && d.recipient.toLowerCase().includes(q)) ||
      (d.certificateNumber && d.certificateNumber.toLowerCase().includes(q)) ||
      d.classLevel.toLowerCase().includes(q) ||
      (d.schoolYear && d.schoolYear.toLowerCase().includes(q)) ||
      (d.examType && d.examType.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-[1340px] mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 md:pb-12 text-slate-100 font-sans">
      {/* Top Security & Admin Control Ribbon */}
      <div className="bg-[#161824] border border-[#2A3044] rounded-3xl p-4 sm:p-5 mb-6 shadow-xl relative overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Row: Session Status & Primary Account Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#252A3C]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-emerald-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center flex-shrink-0 shadow-inner">
              <ShieldCheck className="w-5.5 h-5.5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50"></span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Sesi Admin Aktif
                </span>
                <span className="text-[10px] bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/20 font-semibold hidden sm:inline-block">
                  SDIT AL FIKRI
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Mode pengelola arsip digital &amp; kontrol konfigurasi sistem
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <button
              onClick={() => setShowPasswordChangeModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-[#1E2232] hover:bg-[#272C40] border border-[#2E354B] rounded-xl transition-all cursor-pointer shadow-sm"
              title="Ubah kata sandi akun admin"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Ganti Sandi</span>
            </button>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl transition-all cursor-pointer shadow-sm shadow-rose-500/5"
              title="Keluar dari mode admin &amp; kunci menu pengelola"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Kunci / Logout</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Categorized Quick Admin Tools */}
        <div className="pt-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-sky-400" />
              Alat Pengelolaan &amp; Pengaturan Sistem
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <button
              onClick={() => setShowLogoManagerModal(true)}
              className="flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 text-xs font-bold text-teal-300 hover:text-white bg-[#1B2030] hover:bg-[#23293E] border border-teal-500/25 hover:border-teal-500/50 rounded-xl transition-all cursor-pointer group shadow-sm"
            >
              <div className="w-6 h-6 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform flex-shrink-0">
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Logo Aplikasi</span>
            </button>

            <button
              onClick={() => setShowTeacherManagerModal(true)}
              className="flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 text-xs font-bold text-emerald-300 hover:text-white bg-[#1B2030] hover:bg-[#23293E] border border-emerald-500/25 hover:border-emerald-500/50 rounded-xl transition-all cursor-pointer group shadow-sm"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform flex-shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Whitelist Guru</span>
            </button>

            <button
              onClick={() => setShowTokenManagerModal(true)}
              className="flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 text-xs font-bold text-amber-300 hover:text-white bg-[#1B2030] hover:bg-[#23293E] border border-amber-500/25 hover:border-amber-500/50 rounded-xl transition-all cursor-pointer group shadow-sm"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform flex-shrink-0">
                <Key className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Lisensi &amp; Token</span>
            </button>

            <button
              onClick={() => setShowAddYearModal(true)}
              className="flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 text-xs font-bold text-sky-300 hover:text-white bg-[#1B2030] hover:bg-[#23293E] border border-sky-500/25 hover:border-sky-500/50 rounded-xl transition-all cursor-pointer group shadow-sm"
            >
              <div className="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform flex-shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Tahun Pelajaran</span>
            </button>

            {documents.length > 0 && (
              <button
                onClick={() => setShowClearAllModal(true)}
                className="flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 text-xs font-bold text-rose-300 hover:text-white bg-[#1B2030] hover:bg-rose-500/15 border border-rose-500/25 hover:border-rose-500/50 rounded-xl transition-all cursor-pointer group shadow-sm"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">Kosongkan Arsip</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Firestore Daily Quota Status Widget */}
      <div className="mb-6">
        <FirestoreQuotaWidget />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Pengaturan & Kelola Data
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
            Pengelolaan Data Arsip
          </h1>
          <p className="text-slate-400 font-medium text-xs sm:text-sm mt-0.5">
            Tambah arsip baru, kelola tahun pelajaran, dan atur tautan folder induk Google Drive
          </p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Kembalikan data arsip ke data awal bawaan sekolah?')) {
              onResetDefaults();
              refreshSchoolYears();
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#181B26] border border-[#272D3E] rounded-2xl hover:bg-[#202534] transition-colors self-start sm:self-auto shadow-sm cursor-pointer"
          title="Reset ke data contoh bawaan"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Data Default</span>
        </button>
      </div>

      {/* Form Card */}
      <div className="bg-[#181B26] border border-[#262C3E] rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#242A3C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
              {isEditing ? <Edit2 className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-heading">
                {isEditing ? 'Edit Metadata Dokumen' : 'Tambah Dokumen Baru'}
              </h2>
              <p className="text-xs text-slate-400">Tautan Google Drive dapat langsung diakses oleh guru & staf</p>
            </div>
          </div>
          {isEditing && (
            <button
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#12141D] border border-[#262C3E] font-medium transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Batal</span>
            </button>
          )}
        </div>

        {formSuccessMessage && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm rounded-2xl flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-medium">{formSuccessMessage}</span>
          </div>
        )}

        {formErrorMessage && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm rounded-2xl flex items-center gap-2.5">
            <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="font-medium">{formErrorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Document Type Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Pilih Jenis Dokumen Arsip <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                id="btn-select-type-administrasi"
                onClick={() => {
                  setType('administrasi');
                  setCategory(CATEGORIES_ADMINISTRASI[1]);
                }}
                className={`py-3 px-3.5 text-xs sm:text-sm font-semibold rounded-2xl border transition-all cursor-pointer ${
                  type === 'administrasi'
                    ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 shadow-sm'
                    : 'bg-[#12141D] border-[#272D3E] text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Administrasi
              </button>
              <button
                type="button"
                id="btn-select-type-soal"
                onClick={() => {
                  setType('soal');
                  if (!examType || examType === 'STS') {
                    setExamType(EXAM_TYPES[1] || 'STS Ganjil (Sumatif Tengah Semester 1)');
                  }
                }}
                className={`py-3 px-3.5 text-xs sm:text-sm font-semibold rounded-2xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'soal'
                    ? 'bg-blue-500/15 border-blue-400 text-blue-300 shadow-sm'
                    : 'bg-[#12141D] border-[#272D3E] text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpenCheck className="w-4 h-4 text-blue-400" />
                <span>2. Bank Soal</span>
              </button>
              <button
                type="button"
                id="btn-select-type-sertifikat"
                onClick={() => {
                  setType('sertifikat');
                  setCategory(CATEGORIES_SERTIFIKAT[1]);
                }}
                className={`py-3 px-3.5 text-xs sm:text-sm font-semibold rounded-2xl border transition-all cursor-pointer ${
                  type === 'sertifikat'
                    ? 'bg-purple-500/15 border-purple-400 text-purple-300 shadow-sm'
                    : 'bg-[#12141D] border-[#272D3E] text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Arsip Sertifikat
              </button>
              <button
                type="button"
                id="btn-select-type-rapor"
                onClick={() => {
                  setType('rapor');
                  setCategory(CATEGORIES_RAPOR[1]);
                }}
                className={`py-3 px-3.5 text-xs sm:text-sm font-semibold rounded-2xl border transition-all cursor-pointer ${
                  type === 'rapor'
                    ? 'bg-rose-500/15 border-rose-400 text-rose-300 shadow-sm'
                    : 'bg-[#12141D] border-[#272D3E] text-slate-400 hover:text-slate-200'
                }`}
              >
                4. Arsip Rapor
              </button>
            </div>
          </div>

          {/* Folder Induk Bank Soal Notice */}
          {type === 'soal' && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3">
              <FolderTree className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 leading-relaxed">
                <strong className="text-white block mb-0.5">Struktur Folder Induk Berdasarkan Jenis Ujian:</strong>
                Link Google Drive yang Anda masukkan adalah <em>Folder Induk Jenis Ujian</em> (misal: <strong>STS Ganjil, SAS Ganjil, SAT Genap, Ujian Sekolah</strong>). Di dalam folder ini sudah memuat subfolder seluruh jenjang kelas (Kelas 1 s/d 6) dan seluruh mata pelajaran.
              </div>
            </div>
          )}

          {/* Arsip Rapor Notice */}
          {type === 'rapor' && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3">
              <GraduationCap className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 leading-relaxed">
                <strong className="text-white block mb-0.5">Arsip Buku Rapor, Leger Nilai & P5:</strong>
                Pilih jenjang kelas, semester, kategori rapor, dan tempelkan tautan link Google Drive (folder per kelas / file leger / buku rapor). Berkas akan langsung tersimpan di cloud dan terorganisir rapi di menu <strong>Arsip Rapor</strong>.
              </div>
            </div>
          )}

          {/* Nama Dokumen */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Judul / Nama Dokumen <span className="text-rose-400">*</span>
            </label>
            <input
              id="admin-input-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'administrasi'
                  ? 'Contoh: Administrasi Kelas 5 atau Modul Ajar IPAS Fase B'
                  : type === 'soal'
                  ? 'Contoh: STS Ganjil 2024-2025 atau SAT Genap 2024/2025'
                  : type === 'rapor'
                  ? 'Contoh: Rapor Semester Ganjil Kelas 4A atau Rapor P5'
                  : 'Contoh: Sertifikat Pelatihan Guru Kurikulum Merdeka'
              }
              className="w-full px-4 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-all font-medium"
            />
          </div>

          {/* Conditional fields for Sertifikat */}
          {type === 'sertifikat' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Penerima Sertifikat
                </label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-200 focus:outline-none focus:border-purple-400 transition-all font-medium"
                >
                  {RECIPIENT_TYPES.filter((r) => r !== 'Semua Penerima').map((r) => (
                    <option key={r} value={r} className="bg-[#181B26] text-slate-100">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kategori Sertifikat
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-200 focus:outline-none focus:border-purple-400 transition-all font-medium"
                >
                  {CATEGORIES_SERTIFIKAT.filter((cat) => cat !== 'Semua Kategori').map((cat) => (
                    <option key={cat} value={cat} className="bg-[#181B26] text-slate-100">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor Sertifikat / Piagam (Opsional)
                </label>
                <input
                  type="text"
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  placeholder="Contoh: 088/DIKNAS/PKM-SD/2025"
                  className="w-full px-4 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-400 transition-all font-medium"
                />
              </div>
            </div>
          )}

          {/* Conditional fields for Soal vs Administrasi */}
          {type === 'soal' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Jenis Ujian / Evaluasi */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Jenis Ujian / Evaluasi <span className="text-rose-400">*</span>
                </label>
                <select
                  id="admin-select-exam-type"
                  value={examType}
                  onChange={(e) => {
                    const newExam = e.target.value;
                    setExamType(newExam);
                    // Helpful concise autofill
                    if (!title || title.startsWith('STS') || title.startsWith('SAS') || title.startsWith('SAT') || title.startsWith('Ujian') || title.startsWith('Folder')) {
                      const short = newExam.split('(')[0].trim();
                      const yr = schoolYear ? schoolYear.replace('/', '-') : '2024-2025';
                      setTitle(`${short} ${yr}`);
                    }
                  }}
                  className="w-full px-3.5 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-200 focus:outline-none focus:border-rose-400 transition-all font-medium"
                >
                  {EXAM_TYPES.filter((ex) => ex !== 'Semua Jenis Ujian').map((ex) => (
                    <option key={ex} value={ex} className="bg-[#181B26] text-slate-100">
                      {ex}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tahun Pelajaran */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Tahun Pelajaran <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomYearMode(!isCustomYearMode)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {isCustomYearMode ? 'Pilih dari Daftar' : '+ Ketik Tahun Baru'}
                  </button>
                </div>

                {isCustomYearMode ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={customYearText}
                      onChange={(e) => setCustomYearText(e.target.value)}
                      placeholder="Contoh: 2026/2027 atau 2025-2026"
                      className="flex-1 px-4 py-3 bg-[#12141D] border border-emerald-500/50 rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-400 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customYearText.trim()) {
                          addStoredSchoolYear(customYearText.trim());
                          refreshSchoolYears();
                          setSchoolYear(customYearText.trim());
                          setIsCustomYearMode(false);
                        }
                      }}
                      className="px-3.5 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                      title="Simpan tahun ini ke daftar"
                    >
                      Simpan
                    </button>
                  </div>
                ) : (
                  <select
                    id="admin-select-year"
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-200 focus:outline-none focus:border-rose-400 transition-all font-medium"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y} className="bg-[#181B26] text-slate-100">
                        {y}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Info Cakupan Folder */}
              <div className="sm:col-span-2 p-3 bg-[#12141D] border border-[#272D3E] rounded-2xl flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-rose-300">Cakupan Folder Induk:</span>
                <span className="font-medium text-slate-400">Seluruh Tingkat Kelas (1 s/d 6) & Seluruh Mata Pelajaran</span>
              </div>
            </div>
          ) : (
            /* Row: Kelas & Tahun Pelajaran for Administrasi / Sertifikat */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tingkat Kelas <span className="text-rose-400">*</span>
                </label>
                <select
                  id="admin-select-class"
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-200 focus:outline-none focus:border-amber-400 transition-all font-medium"
                >
                  {CLASS_LEVELS.filter((c) => c !== 'Semua Kelas').map((c) => (
                    <option key={c} value={c} className="bg-[#181B26] text-slate-100">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tahun Pelajaran dengan opsi tambah baru */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Tahun Pelajaran <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomYearMode(!isCustomYearMode)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {isCustomYearMode ? 'Pilih dari Daftar' : '+ Ketik Tahun Baru'}
                  </button>
                </div>

                {isCustomYearMode ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={customYearText}
                      onChange={(e) => setCustomYearText(e.target.value)}
                      placeholder="Contoh: 2026/2027 atau 2025-2026"
                      className="flex-1 px-4 py-3 bg-[#12141D] border border-emerald-500/50 rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-400 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customYearText.trim()) {
                          addStoredSchoolYear(customYearText.trim());
                          refreshSchoolYears();
                          setSchoolYear(customYearText.trim());
                          setIsCustomYearMode(false);
                        }
                      }}
                      className="px-3.5 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                      title="Simpan tahun ini ke daftar"
                    >
                      Simpan
                    </button>
                  </div>
                ) : (
                  <select
                    id="admin-select-year"
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-200 focus:outline-none focus:border-amber-400 transition-all font-medium"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y} className="bg-[#181B26] text-slate-100">
                        {y}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* If type is Administrasi -> Show Kategori */}
          {type === 'administrasi' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kategori Administrasi
              </label>
              <select
                id="admin-select-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-200 focus:outline-none focus:border-emerald-400 transition-all font-medium"
              >
                {CATEGORIES_ADMINISTRASI.filter((cat) => cat !== 'Semua Kategori').map((cat) => (
                  <option key={cat} value={cat} className="bg-[#181B26] text-slate-100">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* If type is Rapor -> Show Semester & Kategori Rapor */}
          {type === 'rapor' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Semester Rapor
                </label>
                <select
                  id="admin-select-rapor-semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-200 focus:outline-none focus:border-rose-400 transition-all font-medium"
                >
                  {SEMESTER_TYPES.filter((s) => s !== 'Semua Semester').map((sem) => (
                    <option key={sem} value={sem} className="bg-[#181B26] text-slate-100">
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kategori Rapor & Nilai
                </label>
                <select
                  id="admin-select-rapor-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-200 focus:outline-none focus:border-rose-400 transition-all font-medium"
                >
                  {CATEGORIES_RAPOR.filter((cat) => cat !== 'Semua Kategori Rapor').map((cat) => (
                    <option key={cat} value={cat} className="bg-[#181B26] text-slate-100">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Link Google Drive */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Link Google Drive {type === 'soal' ? '(Folder Induk)' : ''} <span className="text-rose-400">*</span>
              </label>
              {driveUrl && (
                <a
                  href={sanitizeDriveUrl(driveUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-semibold"
                >
                  <span>Tes Tautan Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <input
              id="admin-input-drive-url"
              type="text"
              required
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/... atau docs.google.com/..."
              className="w-full px-4 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-all font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              {type === 'soal'
                ? 'Masukkan link folder induk Google Drive yang berisi subfolder rombel (1A, 1B, 1C) dan seluruh mapel.'
                : 'Masukkan tautan Google Drive / Docs / Sheets yang dapat dibuka oleh guru & staf sekolah.'}
            </p>
          </div>

          {/* Catatan Singkat */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Catatan Rombel / Keterangan (Opsional)
            </label>
            <input
              id="admin-input-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                type === 'soal'
                  ? 'Contoh: Memuat rombel 1A, 1B, 1C & kunci jawaban seluruh mapel'
                  : 'Contoh: Termasuk modul ajar dan lembar penilaian'
              }
              className="w-full px-4 py-3 bg-[#12141D] border border-[#272D3E] rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-all"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-2xl transition-colors cursor-pointer"
              >
                Batal
              </button>
            )}
            <button
              id="admin-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Menyimpan...</span>
                </>
              ) : isEditing ? (
                'Simpan Perubahan'
              ) : (
                'Tambah Dokumen'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Cloud Sync & Backup Data (Export & Import JSON) Panel */}
      <div className="bg-[#181B26] border border-sky-500/30 rounded-3xl p-6 sm:p-7 shadow-xl mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-[#24293A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center flex-shrink-0">
              <Cloud className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white font-heading">
                  Sinkronisasi Cloud & Cadangan Data
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CloudCheck className="w-3 h-3" />
                  <span>Cloud Aktif</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Data link Google Drive otomatis tersinkron ke Firebase Firestore (Vercel & Domain Custom aman)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Export JSON Button */}
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-all shadow-md cursor-pointer"
              title="Unduh file JSON cadangan seluruh link dan data arsip"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Cadangan JSON</span>
            </button>

            {/* Import JSON Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Pulihkan data arsip dari file JSON cadangan"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>{isImporting ? 'Mengimpor...' : 'Impor Cadangan JSON'}</span>
            </button>
          </div>
        </div>

        {/* Feedback message for backup actions */}
        {backupMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 mb-4 ${
              backupMessage.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {backupMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{backupMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 bg-[#12141D] p-4 rounded-2xl border border-[#24293A]">
          <div className="flex items-start gap-2.5">
            <FileJson className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">File Cadangan Portabel:</span>
              <p className="text-slate-400 text-[11px]">
                File JSON dapat disimpan sebagai arsip cadangan lokal sekolah kapan pun dibutuhkan.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CloudCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Sinkronisasi Otomatis Antar Perangkat:</span>
              <p className="text-slate-400 text-[11px]">
                Setiap data yang Anda simpan di sini akan langsung terbaca oleh seluruh guru di domain Vercel / domain sekolah.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick School Years Management Panel */}
      <div className="bg-[#181B26] border border-[#262C3E] rounded-3xl p-6 sm:p-7 shadow-xl mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#24293A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-heading">
                Daftar Tahun Pelajaran Terdaftar ({availableYears.length})
              </h3>
              <p className="text-xs text-slate-400">Tahun pelajaran ini akan otomatis muncul pada seluruh menu filter arsip</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddYearModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Tahun Baru</span>
          </button>
        </div>

        {/* Chips of available years */}
        <div className="flex flex-wrap gap-2.5">
          {availableYears.map((year) => (
            <div
              key={year}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs font-semibold text-slate-200 hover:border-emerald-500/40 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{year}</span>
              {availableYears.length > 1 && (
                <button
                  onClick={() => handleDeleteSchoolYear(year)}
                  className="p-0.5 text-slate-400 hover:text-rose-400 rounded transition-colors ml-1"
                  title={`Hapus tahun ${year}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

{/* =========================================================
    AKSES CEPAT UJIAN & TEMPLATE
    Hanya 3 item yang memang menggunakan link Google Drive:
    1. Template Analisis Soal & Kop
    2. Template Rapor
    3. Folder Kosong Pengumpulan Soal

    Tracking Pengumpulan Soal adalah menu internal aplikasi,
    sehingga tidak mempunyai link Drive.
   ========================================================= */}
{templates && templates.length > 0 && (
  <div className="bg-[#181B26] border border-[#262C3E] rounded-3xl p-6 sm:p-7 shadow-xl mb-8">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-[#24293A]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
          <FileDown className="w-4 h-4" />
        </div>

        <div>
          <h3 className="text-sm sm:text-base font-bold text-white font-heading">
            Akses Cepat Ujian & Template
          </h3>

          <p className="text-xs text-slate-400">
            Kelola tautan Google Drive yang tampil pada Kelompok A di Dashboard.
          </p>
        </div>
      </div>
    </div>

    {(() => {
      const editableCategories: SchoolTemplateItem['category'][] = [
        'analisis_soal',
        'rapor',
        'folder_soal',
      ];

      const templateLabels: Record<
        SchoolTemplateItem['category'],
        {
          title: string;
          description: string;
        }
      > = {
        analisis_soal: {
          title: 'Template Analisis Soal & Kop',
          description:
            'Template analisis butir soal dan kop naskah ujian.',
        },

        rapor: {
          title: 'Template Rapor',
          description:
            'Template pengolahan nilai dan rekap rapor.',
        },

        folder_soal: {
          title: 'Folder Kosong Pengumpulan Soal',
          description:
            'Folder Google Drive untuk pengumpulan naskah soal guru.',
        },

        tracking_soal: {
          title: 'Tracking Pengumpulan Soal',
          description:
            'Menu internal untuk monitoring pengumpulan soal.',
        },
      };

      const editableTemplates = editableCategories
        .map((category) =>
          templates.find(
            (template) => template.category === category
          )
        )
        .filter(Boolean) as SchoolTemplateItem[];

      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {editableTemplates.map((tpl) => {
              const label = templateLabels[tpl.category];

              return (
                <div
                  key={tpl.id}
                  className="p-4 bg-[#12141D] border border-[#272D3E] rounded-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {tpl.fileFormat}
                      </span>

                      <span className="text-[10px] font-semibold text-emerald-400">
                        Google Drive
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-1">
                      {label.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {label.description}
                    </p>

                    <div className="px-3 py-2 rounded-xl bg-[#0D1018] border border-[#202535] mb-3">
                      <p className="text-[10px] text-slate-500 mb-1">
                        Tautan tersimpan
                      </p>

                      <p className="text-[11px] text-slate-300 truncate">
                        {tpl.driveUrl || 'Belum ada tautan'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#202535]">
                    <button
                      type="button"
                      onClick={() =>
                        openExternalDriveUrl(tpl.driveUrl)
                      }
                      disabled={!tpl.driveUrl}
                      className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka</span>
                    </button>

                    {onUpdateTemplate && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTemplateToEdit(tpl)
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1C2130] hover:bg-[#283044] text-amber-400 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Link</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tracking bukan template Drive */}
          <div className="mt-4 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-4 h-4" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">
                  Tracking Pengumpulan Soal
                </h4>

                <p className="text-xs text-slate-400 mt-1">
                  Menu ini merupakan fitur internal aplikasi,
                  bukan tautan Google Drive. Aksesnya langsung
                  melalui kartu Tracking pada Dashboard.
                </p>
              </div>
            </div>
          </div>
        </>
      );
    })()}
  </div>
)}

      {/* List Existing Documents in Admin */}
      <div className="bg-[#181B26] border border-[#262C3E] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <span>Daftar Semua Arsip</span>
              <span className="px-2 py-0.5 text-xs bg-[#242A3D] text-slate-200 rounded-full font-bold">
                {documents.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Edit metadata, pilih arsip untuk hapus massal, atau hapus berkas yang tidak digunakan
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Admin Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Cari arsip..."
                className="w-full pl-10 pr-3.5 py-2 bg-[#12141D] border border-[#272D3E] rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-400 transition-all font-medium"
              />
            </div>

            {documents.length > 0 && (
              <button
                onClick={() => setShowClearAllModal(true)}
                className="px-3 py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                title="Hapus seluruh arsip data"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Kosongkan Semua</span>
                <span className="sm:hidden">Kosongkan</span>
              </button>
            )}
          </div>
        </div>

        {/* Batch Selection Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-200">
              <CheckSquare className="w-4 h-4 text-rose-400" />
              <span>{selectedIds.length} arsip dipilih</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 bg-[#171A24] hover:bg-[#202534] text-slate-300 text-xs font-semibold rounded-xl border border-[#272D3E] cursor-pointer"
              >
                Batal Pilihan
              </button>
              <button
                onClick={() => setShowBatchDeleteModal(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedIds.length}) Arsip Terpilih</span>
              </button>
            </div>
          </div>
        )}

        {filteredAdminDocs.length === 0 ? (
          <div className="p-10 text-center bg-[#12141D] rounded-2xl border border-[#24293A] text-xs text-slate-400">
            <Folder className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">
              {documents.length === 0
                ? 'Belum ada data arsip yang tersimpan.'
                : 'Tidak ada dokumen yang sesuai dengan pencarian.'}
            </p>
            {documents.length === 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                Gunakan formulir di atas untuk mulai menambahkan folder Google Drive arsip sekolah.
              </p>
            )}
          </div>
        ) : (
          <div>
            {/* Table Selection Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#23293B] text-xs text-slate-400 px-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none font-semibold">
                <input
                  type="checkbox"
                  checked={
                    filteredAdminDocs.length > 0 &&
                    selectedIds.length === filteredAdminDocs.length
                  }
                  onChange={handleToggleSelectAll}
                  className="rounded border-[#2E364A] text-rose-500 focus:ring-rose-400 cursor-pointer w-4 h-4"
                />
                <span>Pilih Semua ({filteredAdminDocs.length})</span>
              </label>

              <span className="text-[11px] text-slate-500 font-medium">
                Aksi (Buka Drive • Edit • Hapus)
              </span>
            </div>

            {/* Document Row Items */}
            <div className="divide-y divide-[#222736]">
              {filteredAdminDocs.map((doc) => {
                const isSelected = selectedIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 rounded-2xl transition-colors ${
                      isSelected ? 'bg-rose-500/5' : 'hover:bg-[#1C202E]'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(doc.id)}
                        className="mt-1 sm:mt-0 rounded border-[#2E364A] text-rose-500 focus:ring-rose-400 cursor-pointer w-4 h-4 flex-shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                              doc.type === 'administrasi'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : doc.type === 'soal'
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : doc.type === 'sertifikat'
                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {doc.type === 'soal'
                              ? 'Bank Soal'
                              : doc.type === 'rapor'
                              ? 'Arsip Rapor'
                              : doc.type === 'sertifikat'
                              ? 'Sertifikat'
                              : 'Administrasi'}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-100 truncate">
                            {doc.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {doc.type === 'soal'
                            ? `${doc.examType || 'Bank Soal'} (Kelas 1-6) • T.P. ${doc.schoolYear}`
                            : doc.type === 'rapor'
                            ? `${doc.classLevel || 'Semua Kelas'} • ${doc.semester || 'Semester 1'} • T.P. ${doc.schoolYear}${
                                doc.category ? ` • ${doc.category}` : ''
                              }`
                            : `${doc.classLevel || doc.recipient} • ${doc.schoolYear}${
                                doc.category ? ` • ${doc.category}` : ''
                              }`}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openExternalDriveUrl(doc.driveUrl);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-[#13151F] rounded-xl transition-colors cursor-pointer"
                        title="Buka tautan Drive"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          populateForm(doc);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-2 text-slate-400 hover:text-amber-400 hover:bg-[#13151F] rounded-xl transition-colors cursor-pointer"
                        title="Edit Dokumen"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDocToDelete(doc)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-[#13151F] rounded-xl transition-colors cursor-pointer"
                        title="Hapus Arsip Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Single Archive Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setDocToDelete(null)}
          />
          <div className="relative w-full max-w-md bg-[#181B26] border border-rose-500/40 rounded-3xl p-6 shadow-2xl z-10 text-slate-100 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Hapus Data Arsip?</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Anda akan menghapus arsip berikut dari sistem:
            </p>

            <div className="p-3.5 bg-[#12141D] border border-[#272D3E] rounded-2xl mb-5 space-y-1">
              <div className="text-sm font-semibold text-white truncate">{docToDelete.title}</div>
              <div className="text-xs text-slate-400">
                {docToDelete.type === 'soal'
                  ? `Bank Soal • ${docToDelete.examType || 'Folder Induk'} • ${docToDelete.schoolYear}`
                  : docToDelete.type === 'rapor'
                  ? `Arsip Rapor • ${docToDelete.classLevel || ''} • ${docToDelete.semester || ''} • ${docToDelete.schoolYear}`
                  : `${docToDelete.category || docToDelete.recipient} • ${docToDelete.schoolYear}`}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Ya, Hapus Arsip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowBatchDeleteModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#181B26] border border-rose-500/40 rounded-3xl p-6 shadow-2xl z-10 text-slate-100 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Hapus {selectedIds.length} Arsip Terpilih?
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Semua data arsip yang dipilih ({selectedIds.length} item) akan dihapus dari daftar arsip digital SDIT AL FIKRI. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Hapus {selectedIds.length} Arsip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Archives Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowClearAllModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#181B26] border border-rose-500/40 rounded-3xl p-6 shadow-2xl z-10 text-slate-100 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Kosongkan Seluruh Data Arsip?</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Tindakan ini akan <strong>menghapus seluruh data arsip ({documents.length} dokumen)</strong>. Halaman arsip akan kembali bersih agar Anda dapat menginput link Google Drive dari awal.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Ya, Kosongkan Semua Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add School Year Modal */}
      {showAddYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowAddYearModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#181B26] border border-[#2A3144] rounded-3xl p-6 shadow-2xl z-10 text-slate-100">
            <button
              onClick={() => setShowAddYearModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#222738] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Tambah Tahun Pelajaran Baru</h3>
                <p className="text-xs text-slate-400">Tahun baru akan otomatis muncul di semua filter aplikasi</p>
              </div>
            </div>

            {yearSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{yearSuccessMsg}</span>
              </div>
            )}

            {yearErrorMsg && (
              <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{yearErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddNewSchoolYear} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Format Tahun Pelajaran <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="Contoh: 2026/2027 atau 2025-2026"
                  className="w-full bg-[#12141D] border border-[#282E40] text-sm text-slate-100 px-4 py-3 rounded-2xl focus:outline-none focus:border-emerald-400 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Bisa menggunakan format garis miring (2026/2027) maupun strip (2025-2026).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Tambahkan Tahun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Dialog Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowPasswordChangeModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#181B26] border border-[#2A3144] rounded-3xl p-6 shadow-2xl z-10 text-slate-100">
            <button
              onClick={() => setShowPasswordChangeModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#222738] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Ganti Kata Sandi Admin</h3>
                <p className="text-xs text-slate-400">Atur kata sandi baru untuk akses Pengaturan</p>
              </div>
            </div>

            {passChangeSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{passChangeSuccess}</span>
              </div>
            )}

            {passChangeError && (
              <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{passChangeError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showPassText ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 3 karakter"
                    className="w-full bg-[#12141D] border border-[#282E40] text-sm text-slate-100 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassText(!showPassText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type={showPassText ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full bg-[#12141D] border border-[#282E40] text-sm text-slate-100 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordChangeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Kata Sandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Link Modal for Admin */}
      {selectedTemplateToEdit && onUpdateTemplate && (
        <EditTemplateModal
          isOpen={!!selectedTemplateToEdit}
          template={selectedTemplateToEdit}
          onClose={() => setSelectedTemplateToEdit(null)}
          onSave={async (id, updates) => {
            await onUpdateTemplate(id, updates);
            setSelectedTemplateToEdit(null);
          }}
        />
      )}

      {/* Edit Exam Upload Config Modal for Admin */}
      {isEditExamConfigOpen && onUpdateExamConfig && (
        <EditExamConfigModal
          isOpen={isEditExamConfigOpen}
          config={examConfig}
          onClose={() => setIsEditExamConfigOpen(false)}
          onSave={async (updates) => {
            await onUpdateExamConfig(updates);
            setIsEditExamConfigOpen(false);
          }}
        />
      )}

      {/* Admin Token & License Manager Modal */}
      <AdminTokenManagerModal
        isOpen={showTokenManagerModal}
        onClose={() => setShowTokenManagerModal(false)}
      />

      {/* Admin Teacher Whitelist Manager Modal */}
      <AdminTeacherManagerModal
        isOpen={showTeacherManagerModal}
        onClose={() => setShowTeacherManagerModal(false)}
        onPreviewTeacher={onPreviewTeacher}
      />

      {/* Admin Logo & Branding Manager Modal */}
      <AdminLogoManagerModal
        isOpen={showLogoManagerModal}
        onClose={() => setShowLogoManagerModal(false)}
        currentBranding={branding}
        onBrandingUpdated={(newBranding) => {
          if (onBrandingUpdated) onBrandingUpdated(newBranding);
        }}
        showNotification={showNotification}
      />
    </div>
  );
};
