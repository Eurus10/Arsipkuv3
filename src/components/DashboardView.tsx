import React, { useState, useMemo, lazy, Suspense } from 'react';
import {
  Search,
  Calendar,
  Award,
  BookOpenCheck,
  FolderArchive,
  GraduationCap,
  ArrowRight,
  X,
  ShieldCheck,
  Sparkles,
  QrCode,
  User,
  Camera,
  Image as ImageIcon,
  LogOut,
} from 'lucide-react';
import {
  DocumentItem,
  NavTab,
  SchoolTemplateItem,
  ExamUploadConfig,
  ExamSubmissionItem,
  TeacherUser,
  DEFAULT_EXAM_CONFIG,
} from '../types';
import { DocumentCard } from './DocumentCard';
import { TemplateDownloadSection } from './TemplateDownloadSection';
import { AppBranding, DEFAULT_BRANDING } from '../services/brandingStorage';
import { LazyViewLoader } from './common/LazyViewLoader';
import {
  TeacherDashboardNotificationBanner,
  TeacherNotificationBell,
} from './dashboard/TeacherDashboardNotificationBanner';

const EvaluationLearningView = lazy(() =>
  import('./evaluation/EvaluationLearningView').then((m) => ({
    default: m.EvaluationLearningView,
  }))
);

const PersonalQrisModal = lazy(() =>
  import('./PersonalQrisModal').then((m) => ({
    default: m.PersonalQrisModal,
  }))
);

interface DashboardViewProps {
  documents: DocumentItem[];
  templates?: SchoolTemplateItem[];
  examConfig?: ExamUploadConfig;
  examSubmissions?: ExamSubmissionItem[];
  isAdmin?: boolean;
  activeTeacher?: TeacherUser | null;
  onLogout?: () => void;
  onRequestLogin?: () => void;
  onLogoutTeacher?: () => void;
  onRequestTeacherAuth?: (
    targetName: string,
    onSuccessCallback?: () => void
  ) => void;
  onNavigate: (tab: NavTab) => void;
  onEditDocument?: (doc: DocumentItem) => void;
  onUpdateTemplate?: (
    templateId: string,
    updates: Partial<SchoolTemplateItem>
  ) => Promise<void>;
  onUpdateExamConfig?: (
    updates: Partial<ExamUploadConfig>
  ) => Promise<void>;
  onOpenUploadModal?: () => void;
  onOpenRaporSts?: () => void;
  branding?: AppBranding;
  onUpdateBranding?: (newBranding: AppBranding) => Promise<void> | void;
}

export const DashboardView: React.FC<
  DashboardViewProps
> = ({
  documents,
  templates = [],
  examConfig = DEFAULT_EXAM_CONFIG,
  examSubmissions = [],
  isAdmin = false,
  activeTeacher = null,
  onLogout,
  onRequestLogin,
  onLogoutTeacher,
  onRequestTeacherAuth,
  onNavigate,
  onEditDocument,
  onUpdateTemplate,
  onUpdateExamConfig,
  onOpenUploadModal,
  onOpenRaporSts,
  branding = DEFAULT_BRANDING,
  onUpdateBranding,
}) => {
  const [showEvaluationModule, setShowEvaluationModule] =
    useState(false);

  const [globalSearch, setGlobalSearch] =
    useState('');

  // Personal QRIS & Profile Modal State
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);
  const [qrisModalDefaultTab, setQrisModalDefaultTab] = useState<'view' | 'edit'>('view');

  // Statistics calculation for all 4 school archive categories
  const stats = useMemo(() => {
    const total = documents.length;

    const administrasi = documents.filter(
      (d) => d.type === 'administrasi'
    ).length;

    const soal = documents.filter(
      (d) => d.type === 'soal'
    ).length;

    const sertifikat = documents.filter(
      (d) => d.type === 'sertifikat'
    ).length;

    const rapor = documents.filter(
      (d) => d.type === 'rapor'
    ).length;

    return {
      total,
      administrasi,
      soal,
      sertifikat,
      rapor,
    };
  }, [documents]);

  // Direct instant search matching results
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return null;

    const query = globalSearch
      .toLowerCase()
      .trim();

    return documents.filter((doc) => {
      return (
        doc.title
          .toLowerCase()
          .includes(query) ||
        (doc.subject &&
          doc.subject
            .toLowerCase()
            .includes(query)) ||
        (doc.category &&
          doc.category
            .toLowerCase()
            .includes(query)) ||
        (doc.classLevel &&
          doc.classLevel
            .toLowerCase()
            .includes(query)) ||
        (doc.examType &&
          doc.examType
            .toLowerCase()
            .includes(query)) ||
        (doc.recipient &&
          doc.recipient
            .toLowerCase()
            .includes(query)) ||
        (doc.semester &&
          doc.semester
            .toLowerCase()
            .includes(query)) ||
        (doc.certificateNumber &&
          doc.certificateNumber
            .toLowerCase()
            .includes(query)) ||
        doc.schoolYear
          .toLowerCase()
          .includes(query)
      );
    });
  }, [documents, globalSearch]);

  // Format today's date in Indonesian
  const todayFormatted = useMemo(() => {
    const now = new Date();

    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    return `${now.getDate()} ${
      months[now.getMonth()]
    } ${now.getFullYear()}`;
  }, []);

  if (showEvaluationModule) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 md:pb-12 text-slate-100 font-sans">
        <Suspense fallback={<LazyViewLoader label="Memuat Modul Evaluasi Pembelajaran..." />}>
          <EvaluationLearningView
            onBack={() =>
              setShowEvaluationModule(false)
            }
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 md:pb-12 text-slate-100 font-sans">
      {/* Top Welcome Header with Photo Banner */}
      <header className="relative mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl overflow-hidden border border-emerald-900/15 bg-emerald-950 p-4 sm:p-6 lg:p-8 shadow-xl group">
        {/* Background Photo Image - Vivid & Clear with Rich Islamic Green Accent */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={branding?.headerBgImageUrl || '/assets/Templateadmin/dashboard_header_background.webp'}
            alt="Latar Belakang Portal"
            className="w-full h-full object-cover object-center transform scale-100 sm:filter sm:brightness-[0.88] sm:contrast-[1.05] sm:saturate-[1.1] transition-transform duration-700 group-hover:scale-105"
          />
          {/* Subtle Deep Emerald scrim for crisp typography readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/70 to-slate-900/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-black/30" />
        </div>

        {/* Content Over Banner */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          {/* Welcome Text and Title */}
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/60 backdrop-blur-md text-emerald-200 border border-emerald-400/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Portal Arsip & AI SDIT AL FIKRI</span>
              </div>

              {/* Admin Quick Action to Change Banner */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setQrisModalDefaultTab('edit');
                    setIsQrisModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/70 hover:bg-slate-900 backdrop-blur-md text-amber-200 hover:text-white border border-amber-400/30 text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                  title="Ganti Foto Latar Belakang Banner (Khusus Admin)"
                >
                  <Camera className="w-3 h-3" />
                  <span className="hidden sm:inline">Ganti Banner</span>
                </button>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white font-heading leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              Portal Arsip & AI Assistant Guru
            </h1>

            <p className="text-emerald-50/90 font-medium text-xs sm:text-sm md:text-base max-w-3xl leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] line-clamp-2 sm:line-clamp-none">
              Pusat akses terpadu Administrasi Guru Kurikulum Merdeka, Folder Induk Bank Soal
              Ujian, Arsip Sertifikat & Piagam, serta Arsip Rapor & Leger Nilai Sekolah.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start lg:self-center flex-shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

              <input
                id="dashboard-search-input"
                type="text"
                value={globalSearch}
                onChange={(e) =>
                  setGlobalSearch(e.target.value)
                }
                placeholder="Cari seluruh dokumen..."
                className="w-full bg-white/95 backdrop-blur-md border border-white/20 text-xs sm:text-sm text-slate-800 placeholder-slate-400 pl-11 pr-9 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all font-medium shadow-md"
              />

              {globalSearch && (
                <button
                  type="button"
                  onClick={() =>
                    setGlobalSearch('')
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Bersihkan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Pill */}
            <div className="hidden xl:flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-white/40 text-xs font-bold text-slate-700 shadow-md">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>{todayFormatted}</span>
            </div>

            {/* Tombol Terpadu Muzaki & QRIS */}
            <button
              type="button"
              id="btn-developer-qris"
              onClick={() => {
                setQrisModalDefaultTab(isAdmin ? 'edit' : 'view');
                setIsQrisModalOpen(true);
              }}
              className="flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-emerald-200 text-slate-700 hover:text-emerald-700 transition-all duration-200 shadow-md group/dev cursor-pointer active:scale-95 shrink-0"
              title="Profil Pengembang Muzaki & QRIS Dukungan"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 flex items-center justify-center shadow-xs overflow-hidden shrink-0 group-hover/dev:scale-105 transition-transform">
                {branding?.personalAvatarUrl ? (
                  <img
                    src={branding.personalAvatarUrl}
                    alt={branding.personalName || 'Muzaki'}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-emerald-800 flex items-center justify-center text-white font-black text-[9px]">
                    {branding?.personalName ? branding.personalName.substring(0, 2).toUpperCase() : 'MZ'}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-left">
                <span className="text-xs font-bold tracking-tight text-slate-800 group-hover/dev:text-emerald-700 transition-colors">
                  {branding?.personalName || 'Muzaki'}
                </span>
                <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <QrCode className="w-2.5 h-2.5" />
                </div>
              </div>
            </button>

            {/* Notification Bell (Lonceng Notifikasi Guru & Admin) */}
            <TeacherNotificationBell
              activeTeacher={activeTeacher}
              isAdmin={isAdmin}
              onNavigate={onNavigate}
              onOpenRaporSts={onOpenRaporSts}
            />

            {/* Tombol Logout Sesi Aktif Guru & Admin (Tampilan Desktop & Tablet) */}
            {(activeTeacher || isAdmin) && (
              <button
                type="button"
                id="btn-dashboard-logout"
                onClick={isAdmin ? onLogout : onLogoutTeacher}
                className="flex items-center gap-1.5 px-3 py-2 sm:py-2 rounded-full bg-rose-50 hover:bg-rose-100 active:scale-95 border border-rose-200 text-rose-700 hover:text-rose-800 transition-all duration-200 cursor-pointer shadow-xs text-xs font-bold shrink-0"
                title={isAdmin ? "Keluar Mode Admin" : `Keluar Sesi Guru: ${activeTeacher?.name}`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Prominent Teacher Dashboard Notification Alert Banner (Muncul saat guru buka web jika ada info cetak/revisi/pesan) */}
      <TeacherDashboardNotificationBanner
        activeTeacher={activeTeacher}
        isAdmin={isAdmin}
        onNavigate={onNavigate}
        onOpenRaporSts={onOpenRaporSts}
      />

      {/* Global Search Results */}
      {searchResults !== null ? (
        <div className="mb-8 sm:mb-10 animate-fade-in bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 sm:mb-5 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 font-heading">
                Hasil Pencarian Arsip (
                {searchResults.length})
              </h3>

              <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                Menampilkan semua dokumen yang sesuai
                dengan kata kunci
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setGlobalSearch('')
              }
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer px-3 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Tutup Hasil
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="p-8 sm:p-10 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-sm font-medium text-slate-500">
                Tidak ada dokumen yang cocok dengan kata kunci.
              </p>

              <button
                type="button"
                onClick={() =>
                  setGlobalSearch('')
                }
                className="mt-3 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
              >
                Reset Pencarian
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onEdit={onEditDocument}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Template / Utility Modules */}
          <TemplateDownloadSection
            templates={templates}
            examBreakdowns={examConfig.examBreakdowns}
            examSchedules={examConfig.examSchedules}
            activeExamSchedule={examConfig.activeExamSchedule}
            isAdmin={isAdmin}
            onRequestTeacherAuth={
              onRequestTeacherAuth
            }
            onUpdateTemplate={
              onUpdateTemplate
            }
            onUpdateExamConfig={
              onUpdateExamConfig
            }
            onNavigateToTracking={() =>
              onNavigate('tracking_soal')
            }
            onOpenEvaluation={() =>
              setShowEvaluationModule(true)
            }
            onOpenRaporSts={onOpenRaporSts}
          />

          {/* Section Title & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-base sm:text-xl font-bold text-slate-800 font-heading tracking-tight">
                  Menu Utama{' '}
                  <span className="text-emerald-700">
                    Arsip Sekolah
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 pl-9 hidden sm:block">
                Akses cepat ke seluruh arsip dan dokumen akademik SDIT AL FIKRI
              </p>
            </div>

            <div className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs text-xs text-slate-600 font-medium">
              <FolderArchive className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Total <strong className="text-slate-900 font-bold">{stats.total}</strong> Berkas
              </span>
            </div>
          </div>

          {/* 4 Thematic Menu Cards - Clean White Modern Cards with Elegant Pastel Accents */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-10">
            {/* Administrasi */}
            <div
              id="menu-card-administrasi"
              onClick={() => onNavigate('administrasi')}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white hover:bg-slate-50/80 mobile-smooth-card p-4 sm:p-6 flex flex-col items-center justify-between text-center border border-slate-200/90 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer min-h-[220px] sm:min-h-[300px]"
            >
              {/* Soft decorative accent */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80" />

              <div className="flex flex-col items-center relative z-10 w-full pt-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-xs mb-3 sm:mb-4 text-emerald-600 group-hover:scale-105 group-hover:bg-emerald-100/70 transition-all duration-300">
                  <FolderArchive className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-800 font-heading tracking-tight leading-snug group-hover:text-emerald-700 transition-colors">
                  Administrasi
                </h3>

                <p className="hidden sm:block text-slate-500 text-xs mt-2 font-normal leading-relaxed max-w-[240px]">
                  Perangkat ajar, modul Kurikulum Merdeka, Prota, Promes, & administrasi guru kelas 1–6.
                </p>
              </div>

              <div className="mt-4 sm:mt-6 w-full relative z-10 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('administrasi');
                  }}
                  className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all duration-200 shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Buka</span>
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 group-hover:bg-white/20 flex items-center justify-center text-emerald-700 group-hover:text-white group-hover:translate-x-1 transition-all duration-200">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </span>
                </button>

                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-emerald-700 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{stats.administrasi} Dokumen</span>
                </div>
              </div>
            </div>

            {/* Bank Soal */}
            <div
              id="menu-card-soal"
              onClick={() => onNavigate('soal')}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white hover:bg-slate-50/80 mobile-smooth-card p-4 sm:p-6 flex flex-col items-center justify-between text-center border border-slate-200/90 hover:border-sky-300 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer min-h-[220px] sm:min-h-[300px]"
            >
              {/* Soft decorative accent */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 to-blue-500 opacity-80" />

              <div className="flex flex-col items-center relative z-10 w-full pt-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shadow-xs mb-3 sm:mb-4 text-sky-600 group-hover:scale-105 group-hover:bg-sky-100/70 transition-all duration-300">
                  <BookOpenCheck className="w-6 h-6 sm:w-8 sm:h-8 text-sky-600" />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-800 font-heading tracking-tight leading-snug group-hover:text-sky-700 transition-colors">
                  Bank Soal
                </h3>

                <p className="hidden sm:block text-slate-500 text-xs mt-2 font-normal leading-relaxed max-w-[240px]">
                  Folder induk naskah STS, SAS, & SAT seluruh mata pelajaran kelas 1–6 SDIT AL FIKRI.
                </p>
              </div>

              <div className="mt-4 sm:mt-6 w-full relative z-10 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('soal');
                  }}
                  className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 hover:border-sky-600 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all duration-200 shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Buka</span>
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sky-100 group-hover:bg-white/20 flex items-center justify-center text-sky-700 group-hover:text-white group-hover:translate-x-1 transition-all duration-200">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </span>
                </button>

                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-sky-700 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>{stats.soal} Folder Induk</span>
                </div>
              </div>
            </div>

            {/* Sertifikat */}
            <div
              id="menu-card-sertifikat"
              onClick={() => onNavigate('sertifikat')}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white hover:bg-slate-50/80 mobile-smooth-card p-4 sm:p-6 flex flex-col items-center justify-between text-center border border-slate-200/90 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer min-h-[220px] sm:min-h-[300px]"
            >
              {/* Soft decorative accent */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-400 to-indigo-500 opacity-80" />

              <div className="flex flex-col items-center relative z-10 w-full pt-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shadow-xs mb-3 sm:mb-4 text-purple-600 group-hover:scale-105 group-hover:bg-purple-100/70 transition-all duration-300">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-800 font-heading tracking-tight leading-snug group-hover:text-purple-700 transition-colors">
                  Sertifikat
                </h3>

                <p className="hidden sm:block text-slate-500 text-xs mt-2 font-normal leading-relaxed max-w-[240px]">
                  Koleksi sertifikat pelatihan guru, piagam prestasi santri, dokumen akreditasi & kelulusan.
                </p>
              </div>

              <div className="mt-4 sm:mt-6 w-full relative z-10 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('sertifikat');
                  }}
                  className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 hover:border-purple-600 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all duration-200 shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Buka</span>
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-100 group-hover:bg-white/20 flex items-center justify-center text-purple-700 group-hover:text-white group-hover:translate-x-1 transition-all duration-200">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </span>
                </button>

                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-purple-700 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span>{stats.sertifikat} Piagam</span>
                </div>
              </div>
            </div>

            {/* Rapor */}
            <div
              id="menu-card-rapor"
              onClick={() => onNavigate('rapor')}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white hover:bg-slate-50/80 mobile-smooth-card p-4 sm:p-6 flex flex-col items-center justify-between text-center border border-slate-200/90 hover:border-rose-300 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer min-h-[220px] sm:min-h-[300px]"
            >
              {/* Soft decorative accent */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-400 to-amber-500 opacity-80" />

              <div className="flex flex-col items-center relative z-10 w-full pt-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-xs mb-3 sm:mb-4 text-rose-600 group-hover:scale-105 group-hover:bg-rose-100/70 transition-all duration-300">
                  <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-rose-600" />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-800 font-heading tracking-tight leading-snug group-hover:text-rose-700 transition-colors">
                  Arsip Rapor
                </h3>

                <p className="hidden sm:block text-slate-500 text-xs mt-2 font-normal leading-relaxed max-w-[240px]">
                  Buku rapor semester ganjil/genap, rapor P5 Kurikulum Merdeka, & leger nilai siswa.
                </p>
              </div>

              <div className="mt-4 sm:mt-6 w-full relative z-10 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('rapor');
                  }}
                  className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all duration-200 shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Buka</span>
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-100 group-hover:bg-white/20 flex items-center justify-center text-rose-700 group-hover:text-white group-hover:translate-x-1 transition-all duration-200">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </span>
                </button>

                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-rose-700 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>{stats.rapor} Berkas</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Personal QRIS & Profile Management Modal */}
      {isQrisModalOpen && (
        <Suspense fallback={null}>
          <PersonalQrisModal
            isOpen={true}
            onClose={() => setIsQrisModalOpen(false)}
            branding={branding}
            onBrandingUpdated={onUpdateBranding}
            defaultTab={qrisModalDefaultTab}
            isAdmin={isAdmin}
          />
        </Suspense>
      )}
    </div>
  );
};