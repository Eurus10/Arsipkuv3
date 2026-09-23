import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  DocumentItem,
  NavTab,
  SchoolTemplateItem,
  ExamUploadConfig,
  ExamSubmissionItem,
  DEFAULT_EXAM_CONFIG,
} from '../types';
import { DocumentCard } from './DocumentCard';
import { TemplateDownloadSection } from './TemplateDownloadSection';
import { EvaluationLearningView } from './evaluation/EvaluationLearningView';
import { PersonalQrisModal } from './PersonalQrisModal';
import { AppBranding, DEFAULT_BRANDING } from '../services/brandingStorage';

interface DashboardViewProps {
  documents: DocumentItem[];
  templates?: SchoolTemplateItem[];
  examConfig?: ExamUploadConfig;
  examSubmissions?: ExamSubmissionItem[];
  isAdmin?: boolean;
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
        <EvaluationLearningView
          onBack={() =>
            setShowEvaluationModule(false)
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 md:pb-12 text-slate-100 font-sans">
      {/* Top Welcome Header with Photo Banner */}
      <header className="relative mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-900 p-4 sm:p-6 lg:p-8 shadow-2xl group">
        {/* Background Photo Image - Vivid & Clear */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={branding?.headerBgImageUrl || '/assets/Templateadmin/dashboard_header_background.webp'}
            alt="Latar Belakang Portal"
            className="w-full h-full object-cover object-center transform scale-100 filter brightness-[0.85] contrast-[1.08] saturate-[1.1] transition-transform duration-700 group-hover:scale-105"
          />
          {/* Gentle Gradient Scrim: Crisp photo visibility while keeping text perfectly readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/20" />
        </div>

        {/* Content Over Banner */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          {/* Welcome Text and Title */}
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-950/75 backdrop-blur-md text-emerald-300 border border-emerald-400/40 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider shadow-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
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
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/75 hover:bg-slate-900 backdrop-blur-md text-amber-300 hover:text-white border border-amber-400/40 text-[10px] font-bold transition-all cursor-pointer shadow-md"
                  title="Ganti Foto Latar Belakang Banner (Khusus Admin)"
                >
                  <Camera className="w-3 h-3" />
                  <span className="hidden sm:inline">Ganti Banner</span>
                </button>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white font-heading leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
              Portal Arsip & AI Assistant Guru
            </h1>

            <p className="text-white font-medium text-xs sm:text-sm md:text-base max-w-3xl leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] line-clamp-2 sm:line-clamp-none">
              Pusat akses terpadu Administrasi Guru Kurikulum Merdeka, Folder Induk Bank Soal
              Ujian, Arsip Sertifikat & Piagam, serta Arsip Rapor & Leger Nilai Sekolah.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start lg:self-center flex-shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />

              <input
                id="dashboard-search-input"
                type="text"
                value={globalSearch}
                onChange={(e) =>
                  setGlobalSearch(e.target.value)
                }
                placeholder="Cari seluruh dokumen..."
                className="w-full bg-slate-950/85 backdrop-blur-md border border-slate-600/80 text-xs sm:text-sm text-white placeholder-slate-400 pl-11 pr-9 py-2.5 rounded-full focus:outline-none focus:border-amber-400 focus:bg-slate-950 transition-all font-medium shadow-lg"
              />

              {globalSearch && (
                <button
                  type="button"
                  onClick={() =>
                    setGlobalSearch('')
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title="Bersihkan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Pill */}
            <div className="hidden xl:flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#131724]/90 backdrop-blur-md border border-slate-700/80 text-xs font-bold text-slate-200 shadow-md">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{todayFormatted}</span>
            </div>

            {/* Tombol QRIS Pribadi (Sebelah Logo Pribadi) */}
            <button
              type="button"
              id="btn-personal-qris"
              onClick={() => {
                setQrisModalDefaultTab('view');
                setIsQrisModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/25 hover:from-emerald-500/35 hover:to-teal-500/35 backdrop-blur-md border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white transition-all duration-200 shadow-lg shadow-emerald-950/50 group/qris cursor-pointer active:scale-95 shrink-0"
              title="Scan QRIS Pribadi / Dukungan Pengembang"
            >
              <div className="w-5 h-5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover/qris:scale-110 transition-transform">
                <QrCode className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-black tracking-wide">QRIS</span>
            </button>

            {/* Logo & Identitas Pribadi (Pojok Kanan Atas) */}
            <button
              type="button"
              id="btn-personal-profile"
              onClick={() => {
                setQrisModalDefaultTab(isAdmin ? 'edit' : 'view');
                setIsQrisModalOpen(true);
              }}
              className="flex items-center gap-2.5 pl-1.5 pr-3 sm:pr-4 py-1 sm:py-1.5 rounded-full bg-[#131724]/90 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/50 hover:bg-[#1A2033] transition-all cursor-pointer group shadow-md shrink-0 text-left"
              title={isAdmin ? "Klik untuk Kelola Foto Profil, Identitas & QRIS Pribadi (Admin)" : "Lihat Profil & QRIS Pengembang"}
            >
              {/* Personal Avatar / Logo */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-md overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                {branding?.personalAvatarUrl ? (
                  <img
                    src={branding.personalAvatarUrl}
                    alt={branding.personalName || 'Personal'}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#0D1A18] flex items-center justify-center text-emerald-300 font-black text-[10px] sm:text-xs">
                    {branding?.personalName
                      ? branding.personalName.substring(0, 2).toUpperCase()
                      : 'AF'}
                  </div>
                )}
              </div>

              {/* Personal Name & Role */}
              <div className="flex flex-col text-left leading-tight pr-0.5">
                <span className="text-[11px] sm:text-xs font-black text-white group-hover:text-emerald-300 transition-colors truncate max-w-[110px] sm:max-w-[140px]">
                  {branding?.personalName || 'Pengembang'}
                </span>
                <span className="text-[9px] font-bold text-emerald-400/90 truncate max-w-[110px] sm:max-w-[140px]">
                  {branding?.personalRole || 'Guru / Inisiator'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Global Search Results */}
      {searchResults !== null ? (
        <div className="mb-8 sm:mb-10 animate-fade-in bg-[#181B26] border border-[#262C3E] rounded-3xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-heading">
                Hasil Pencarian Arsip (
                {searchResults.length})
              </h3>

              <p className="hidden sm:block text-xs text-slate-400">
                Menampilkan semua dokumen yang sesuai
                dengan kata kunci
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setGlobalSearch('')
              }
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              Tutup Hasil
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="p-6 sm:p-8 text-center bg-[#13151E] rounded-2xl border border-[#24293A]">
              <p className="text-sm font-medium text-slate-400">
                Tidak ada dokumen yang cocok dengan
                kata kunci.
              </p>

              <button
                type="button"
                onClick={() =>
                  setGlobalSearch('')
                }
                className="mt-3 px-4 py-2 text-xs font-semibold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-xl transition-colors cursor-pointer"
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
                <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <h2 className="text-base sm:text-xl font-bold text-white font-heading tracking-tight">
                  Menu Utama{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400">
                    Arsip Sekolah
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 pl-9 hidden sm:block">
                Akses cepat ke seluruh arsip dan dokumen akademik SDIT AL FIKRI
              </p>
            </div>

            <div className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-inner text-xs text-slate-300">
              <FolderArchive className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Total <strong className="text-white font-bold">{stats.total}</strong> Berkas
              </span>
            </div>
          </div>

          {/* 4 Thematic Menu Cards - Modern Dark Bento-Glass Luxury */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-10">
            {/* Administrasi */}
            <div
              id="menu-card-administrasi"
              onClick={() => onNavigate('administrasi')}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900/85 hover:bg-slate-900/95 backdrop-blur-xl p-4 sm:p-6 flex flex-col items-center justify-between text-center border border-white/10 hover:border-emerald-400/50 shadow-xl hover:shadow-[0_20px_45px_rgba(16,185,129,0.18)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer min-h-[220px] sm:min-h-[310px]"
            >
              {/* Ambient radial glow */}
              <div className="absolute -top-16 inset-x-0 h-40 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent blur-2xl pointer-events-none group-hover:from-emerald-500/35 transition-all duration-500" />

              {/* Watermark icon */}
              <FolderArchive className="absolute -bottom-6 -right-6 w-28 h-28 text-emerald-500/[0.04] group-hover:text-emerald-500/[0.08] pointer-events-none transition-all duration-500 rotate-12" />

              <div className="flex flex-col items-center relative z-10 w-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-400/25 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.12)] mb-3 sm:mb-4 text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:border-emerald-400/40 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all duration-300">
                  <FolderArchive className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-300" />
                </div>

                <h3 className="text-base sm:text-xl font-black text-white font-heading tracking-tight leading-snug group-hover:text-emerald-300 transition-colors">
                  Administrasi
                </h3>

                <p className="hidden sm:block text-slate-300/80 text-xs mt-2 font-normal leading-relaxed max-w-[240px]">
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
                  className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 hover:text-white border border-emerald-500/25 hover:border-emerald-400/40 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl backdrop-blur-md transition-all duration-300 shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer group-hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                >
                  <span>Buka</span>
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-200 group-hover:translate-x-1 group-hover:bg-emerald-400 group-hover:text-emerald-950 transition-all duration-300">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </span>
                </button>

                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-emerald-400/90 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{stats.administrasi} Dokumen</span>
                </div>
              </div>
            </div>

            {/* Bank Soal */}
            <div
              id="menu-card-soal"
              onClick={() => onNavigate('soal')}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900/85 hover:bg-slate-900/95 backdrop-blur-xl p-4 sm:p-6 flex flex-col items-center justify-between text-center border border-white/10 hover:border-sky-400/50 shadow-xl hover:shadow-[0_20px_45px_rgba(14,165,233,0.18)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer min-h-[220px] sm:min-h-[310px]"
            >
              {/* Ambient radial glow */}
              <div className="absolute -top-16 inset-x-0 h-40 bg-gradient-to-b from-sky-500/20 via-sky-500/5 to-transparent blur-2xl pointer-events-none group-hover:from-sky-500/35 transition-all duration-500" />

              {/* Watermark icon */}
              <BookOpenCheck className="absolute -bottom-6 -right-6 w-28 h-28 text-sky-500/[0.04] group-hover:text-sky-500/[0.08] pointer-events-none transition-all duration-500 rotate-12" />

              <div className="flex flex-col items-center relative z-10 w-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-sky-500/10 border border-sky-400/25 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.12)] mb-3 sm:mb-4 text-sky-400 group-hover:scale-110 group-hover:bg-sky-500/20 group-hover:border-sky-400/40 group-hover:shadow-[0_0_30px_rgba(14,165,233,0.25)] transition-all duration-300">
                  <BookOpenCheck className="w-6 h-6 sm:w-8 sm:h-8 text-sky-300" />
                </div>

                <h3 className="text-base sm:text-xl font-black text-white font-heading tracking-tight leading-snug group-hover:text-sky-300 transition-colors">
                  Bank Soal
                </h3>

                <p className="hidden sm:block text-slate-300/80 text-xs mt-2 font-normal leading-relaxed max-w-[240px]">
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
                  className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 hover:text-white border border-sky-500/25 hover:border-sky-400/40 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl backdrop-blur-md transition-all duration-300 shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer group-hover:shadow-[0_0_20px_rgba(14,165,233,0.25)]"
                >
                  <span>Buka</span>
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-200 group-hover:translate-x-1 group-hover:bg-sky-400 group-hover:text-sky-950 transition-all duration-300">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </span>
                </button>

                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-sky-400/90 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <span>{stats.soal} Folder Induk</span>
                </div>
              </div>
            </div>

            {/* Sertifikat */}
            <div
              id="menu-card-sertifikat"
              onClick={() => onNavigate('sertifikat')}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900/85 hover:bg-slate-900/95 backdrop-blur-xl p-4 sm:p-6 flex flex-col items-center justify-between text-center border border-white/10 hover:border-purple-400/50 shadow-xl hover:shadow-[0_20px_45px_rgba(168,85,247,0.18)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer min-h-[220px] sm:min-h-[310px]"
            >
              {/* Ambient radial glow */}
              <div className="absolute -top-16 inset-x-0 h-40 bg-gradient-to-b from-purple-500/20 via-purple-500/5 to-transparent blur-2xl pointer-events-none group-hover:from-purple-500/35 transition-all duration-500" />

              {/* Watermark icon */}
              <Award className="absolute -bottom-6 -right-6 w-28 h-28 text-purple-500/[0.04] group-hover:text-purple-500/[0.08] pointer-events-none transition-all duration-500 rotate-12" />

              <div className="flex flex-col items-center relative z-10 w-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-purple-500/10 border border-purple-400/25 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.12)] mb-3 sm:mb-4 text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 group-hover:border-purple-400/40 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] transition-all duration-300">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-purple-300" />
                </div>

                <h3 className="text-base sm:text-xl font-black text-white font-heading tracking-tight leading-snug group-hover:text-purple-300 transition-colors">
                  Sertifikat
                </h3>

                <p className="hidden sm:block text-slate-300/80 text-xs mt-2 font-normal leading-relaxed max-w-[240px]">
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
                  className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 hover:text-white border border-purple-500/25 hover:border-purple-400/40 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl backdrop-blur-md transition-all duration-300 shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer group-hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]"
                >
                  <span>Buka</span>
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-200 group-hover:translate-x-1 group-hover:bg-purple-400 group-hover:text-purple-950 transition-all duration-300">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </span>
                </button>

                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-purple-400/90 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  <span>{stats.sertifikat} Piagam</span>
                </div>
              </div>
            </div>

            {/* Rapor */}
            <div
              id="menu-card-rapor"
              onClick={() => onNavigate('rapor')}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900/85 hover:bg-slate-900/95 backdrop-blur-xl p-4 sm:p-6 flex flex-col items-center justify-between text-center border border-white/10 hover:border-rose-400/50 shadow-xl hover:shadow-[0_20px_45px_rgba(244,63,94,0.18)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer min-h-[220px] sm:min-h-[310px]"
            >
              {/* Ambient radial glow */}
              <div className="absolute -top-16 inset-x-0 h-40 bg-gradient-to-b from-rose-500/20 via-rose-500/5 to-transparent blur-2xl pointer-events-none group-hover:from-rose-500/35 transition-all duration-500" />

              {/* Watermark icon */}
              <GraduationCap className="absolute -bottom-6 -right-6 w-28 h-28 text-rose-500/[0.04] group-hover:text-rose-500/[0.08] pointer-events-none transition-all duration-500 rotate-12" />

              <div className="flex flex-col items-center relative z-10 w-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-400/25 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.12)] mb-3 sm:mb-4 text-rose-400 group-hover:scale-110 group-hover:bg-rose-500/20 group-hover:border-rose-400/40 group-hover:shadow-[0_0_30px_rgba(244,63,94,0.25)] transition-all duration-300">
                  <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-rose-300" />
                </div>

                <h3 className="text-base sm:text-xl font-black text-white font-heading tracking-tight leading-snug group-hover:text-rose-300 transition-colors">
                  Arsip Rapor
                </h3>

                <p className="hidden sm:block text-slate-300/80 text-xs mt-2 font-normal leading-relaxed max-w-[240px]">
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
                  className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 hover:text-white border border-rose-500/25 hover:border-rose-400/40 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl backdrop-blur-md transition-all duration-300 shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer group-hover:shadow-[0_0_20px_rgba(244,63,94,0.25)]"
                >
                  <span>Buka</span>
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-200 group-hover:translate-x-1 group-hover:bg-rose-400 group-hover:text-rose-950 transition-all duration-300">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </span>
                </button>

                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-rose-400/90 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  <span>{stats.rapor} Berkas</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Personal QRIS & Profile Management Modal */}
      <PersonalQrisModal
        isOpen={isQrisModalOpen}
        onClose={() => setIsQrisModalOpen(false)}
        branding={branding}
        onBrandingUpdated={onUpdateBranding}
        defaultTab={qrisModalDefaultTab}
        isAdmin={isAdmin}
      />
    </div>
  );
};