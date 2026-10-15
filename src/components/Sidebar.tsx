import React, { useState } from 'react';
import {
  LayoutDashboard,
  Home,
  FolderArchive,
  Layers,
  BookOpen,
  BookOpenCheck,
  Award,
  GraduationCap,
  Settings,
  ExternalLink,
  Lock,
  LogOut,
  ListChecks,
  Users,
  UserCheck,
  MoreHorizontal,
  X,
  ChevronRight,
  QrCode,
  Sparkles,
  ShieldCheck,
  FolderUp,
} from 'lucide-react';
import { NavTab, TeacherUser } from '../types';
import { AppBranding } from '../services/brandingStorage';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isAdmin: boolean;
  onLogout?: () => void;
  onRequestLogin?: () => void;
  activeTeacher?: TeacherUser | null;
  onLogoutTeacher?: () => void;
  pendingSubmissionsCount?: number;
  pendingAnalysisCount?: number;
  studentCount?: number;
  branding?: AppBranding;
  onOpenQris?: () => void;
  documentCounts: {
    total: number;
    administrasi: number;
    soal: number;
    sertifikat: number;
    rapor: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isAdmin,
  onLogout,
  onRequestLogin,
  activeTeacher,
  onLogoutTeacher,
  pendingSubmissionsCount = 0,
  pendingAnalysisCount = 0,
  studentCount = 0,
  branding,
  onOpenQris,
  documentCounts,
}) => {
  const [isAkademikSheetOpen, setIsAkademikSheetOpen] = useState(false);
  const [isLainnyaSheetOpen, setIsLainnyaSheetOpen] = useState(false);

  const isImageLogo = Boolean((branding?.logoType === 'image' && branding?.logoImageUrl) || branding?.logoImageUrl);

  // Desktop Navigation Items (Preserved 100% Intact)
  const desktopNavItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      activeColor: 'text-emerald-700',
      activeBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      count: documentCounts.total,
    },
    {
      id: 'administrasi' as NavTab,
      label: 'Administrasi',
      icon: FolderArchive,
      activeColor: 'text-emerald-700',
      activeBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      count: documentCounts.administrasi,
    },
    {
      id: 'soal' as NavTab,
      label: 'Bank Soal',
      icon: BookOpenCheck,
      activeColor: 'text-blue-700',
      activeBg: 'bg-blue-50 text-blue-700 border border-blue-200/80',
      count: documentCounts.soal,
    },
    {
      id: 'tracking_soal' as NavTab,
      label: 'Tracking Soal',
      icon: ListChecks,
      activeColor: 'text-cyan-700',
      activeBg: 'bg-cyan-50 text-cyan-700 border border-cyan-200/80',
      count: pendingSubmissionsCount,
      isHighlight: true,
    },
    ...(isAdmin
      ? [
          {
            id: 'student_db' as NavTab,
            label: 'Data Siswa',
            icon: Users,
            activeColor: 'text-teal-700',
            activeBg: 'bg-teal-50 text-teal-700 border border-teal-200/80',
            count: studentCount,
            isHighlight: true,
          },
        ]
      : []),
    {
      id: 'rapor_sts' as NavTab,
      label: 'e-Rapor',
      icon: BookOpenCheck,
      activeColor: 'text-indigo-700',
      activeBg: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
      isHighlight: true,
    },
    {
      id: 'sertifikat' as NavTab,
      label: 'Sertifikat',
      icon: Award,
      activeColor: 'text-purple-700',
      activeBg: 'bg-purple-50 text-purple-700 border border-purple-200/80',
      count: documentCounts.sertifikat,
    },
    {
      id: 'rapor' as NavTab,
      label: 'Arsip Rapor',
      icon: GraduationCap,
      activeColor: 'text-rose-700',
      activeBg: 'bg-rose-50 text-rose-700 border border-rose-200/80',
      count: documentCounts.rapor,
    },
    {
      id: 'admin' as NavTab,
      label: 'Pengaturan',
      icon: Settings,
      activeColor: 'text-slate-700',
      activeBg: 'bg-slate-100 text-slate-800 border border-slate-200/80',
      isProtected: true,
      count: isAdmin && pendingAnalysisCount > 0 ? pendingAnalysisCount : undefined,
    },
  ];

  // Mobile Active States
  const isBerandaActive = currentTab === 'dashboard';
  const isAdministrasiActive = currentTab === 'administrasi';
  const isAkademikActive =
    ['soal', 'tracking_soal', 'sertifikat', 'rapor', 'rapor_sts'].includes(currentTab) ||
    isAkademikSheetOpen;
  const isSiswaActive = currentTab === 'student_db';
  const isLainnyaActive = currentTab === 'admin' || isLainnyaSheetOpen;

  const handleMobileTabClick = (tab: 'dashboard' | 'administrasi' | 'akademik' | 'siswa' | 'lainnya') => {
    if (tab === 'dashboard') {
      setIsAkademikSheetOpen(false);
      setIsLainnyaSheetOpen(false);
      onSelectTab('dashboard');
    } else if (tab === 'administrasi') {
      setIsAkademikSheetOpen(false);
      setIsLainnyaSheetOpen(false);
      onSelectTab('administrasi');
    } else if (tab === 'akademik') {
      setIsLainnyaSheetOpen(false);
      setIsAkademikSheetOpen((prev) => !prev);
    } else if (tab === 'siswa') {
      setIsAkademikSheetOpen(false);
      setIsLainnyaSheetOpen(false);
      onSelectTab('student_db');
    } else if (tab === 'lainnya') {
      setIsAkademikSheetOpen(false);
      setIsLainnyaSheetOpen((prev) => !prev);
    }
  };

  const handleAkademikSubSelect = (subTab: NavTab) => {
    setIsAkademikSheetOpen(false);
    onSelectTab(subTab);
  };

  const handleLainnyaAdminClick = () => {
    setIsLainnyaSheetOpen(false);
    if (!isAdmin && onRequestLogin) {
      onRequestLogin();
    } else {
      onSelectTab('admin');
    }
  };

  const handleLainnyaQrisClick = () => {
    setIsLainnyaSheetOpen(false);
    if (onOpenQris) onOpenQris();
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (CLEAN, BRIGHT & ELEGANT DESIGN)                          */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-20 bg-white border-r border-slate-200 min-h-screen py-6 items-center justify-between select-none z-30 flex-shrink-0 shadow-xs print:hidden">
        {/* Top Logo */}
        <div className="flex flex-col items-center gap-8 w-full">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-105 transition-all group cursor-pointer overflow-hidden ${
              isImageLogo
                ? 'bg-transparent shadow-none p-0'
                : 'bg-emerald-600 text-white font-black text-sm shadow-xs p-1'
            }`}
            title="SDIT AL FIKRI - Beranda"
          >
            {isImageLogo ? (
              <img
                src={branding.logoImageUrl}
                alt="Logo Sekolah"
                className="w-full h-full object-contain filter drop-shadow-sm"
              />
            ) : (
              <span>{branding?.logoText || 'AF'}</span>
            )}
          </button>

          {/* Navigation Icon List */}
          <nav className="flex flex-col items-center gap-3.5 w-full px-3">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const isPengaturanLocked = item.id === 'admin' && !isAdmin;

              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  title={
                    item.id === 'admin'
                      ? isAdmin
                        ? 'Pengaturan (Admin Aktif)'
                        : 'Pengaturan (Khusus Admin)'
                      : item.label
                  }
                  className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group cursor-pointer ${
                    isActive
                      ? item.activeBg + ' shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />

                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute -left-1.5 w-1 h-5 rounded-full bg-emerald-600 shadow-xs"></span>
                  )}

                  {/* Lock Indicator for Pengaturan if not authenticated */}
                  {isPengaturanLocked && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-50 border border-amber-300 text-amber-700 flex items-center justify-center shadow-xs"
                      title="Perlu Login Admin"
                    >
                      <Lock className="w-2.5 h-2.5" />
                    </span>
                  )}

                  {/* Badge Counter for Regular items */}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-100 text-[9px] font-bold text-slate-700 border border-slate-200 flex items-center justify-center shadow-xs">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-3">
          {/* Teacher Logged In Profile Pill (if active and not admin) */}
          {activeTeacher && !isAdmin && onLogoutTeacher && (
            <button
              onClick={onLogoutTeacher}
              title={`Sesi Guru: ${activeTeacher.name} (Klik untuk Logout)`}
              className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex flex-col items-center justify-center transition-all cursor-pointer group shadow-xs"
            >
              <UserCheck className="w-4 h-4 group-hover:hidden" />
              <LogOut className="w-4 h-4 hidden group-hover:block" />
            </button>
          )}

          {/* Admin Login Button if not logged in */}
          {!isAdmin && onRequestLogin && (
            <button
              onClick={onRequestLogin}
              title="Masuk sebagai Administrator"
              className="w-11 h-11 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-500 hover:text-amber-700 flex items-center justify-center transition-all cursor-pointer group shadow-xs"
            >
              <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* Admin Logout Button if logged in */}
          {isAdmin && onLogout && (
            <button
              onClick={onLogout}
              title="Logout Mode Admin (Aktif)"
              className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all cursor-pointer group shadow-xs"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}

          <a
            href="https://drive.google.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Akses Google Drive Sekolah"
            className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-300 flex items-center justify-center transition-all group shadow-xs"
          >
            <ExternalLink className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </a>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE AKADEMIK BOTTOM SHEET (HUB RINGKASAN AKADEMIK)                     */}
      {/* ========================================================================= */}
      {isAkademikSheetOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs animate-fade-in flex flex-col justify-end print:hidden">
          {/* Backdrop Touch Dismiss */}
          <div
            className="flex-1 w-full"
            onClick={() => setIsAkademikSheetOpen(false)}
          />

          <div className="relative z-50 bg-white/98 backdrop-blur-2xl border-t border-slate-200 rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] p-4 sm:p-5 pb-24 animate-slide-up space-y-3.5">
            {/* Grabber Handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 opacity-80" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Menu & Arsip Akademik</h4>
                  <p className="text-[10.5px] text-slate-500">Pilih modul akademik yang ingin dibuka</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAkademikSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* e-Rapor Highlight Card */}
            <button
              type="button"
              onClick={() => handleAkademikSubSelect('rapor_sts')}
              className={`w-full p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between group ${
                currentTab === 'rapor_sts'
                  ? 'bg-indigo-50 border-indigo-300 shadow-xs'
                  : 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    currentTab === 'rapor_sts'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  <BookOpenCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-bold text-indigo-950 group-hover:text-indigo-700 transition-colors">
                      e-Rapor Kurikulum Merdeka
                    </h5>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                      Utama
                    </span>
                  </div>
                  <p className="text-[10px] text-indigo-700/80">Input Nilai, TP, & Leger Nilai</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 4 Cards Grid (2x2) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Bank Soal */}
              <button
                type="button"
                onClick={() => handleAkademikSubSelect('soal')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group min-h-[92px] ${
                  currentTab === 'soal'
                    ? 'bg-blue-50 border-blue-300 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentTab === 'soal'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <BookOpenCheck className="w-4 h-4" />
                  </div>
                  {documentCounts.soal > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                      {documentCounts.soal}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    Bank Soal
                  </h5>
                  <p className="text-[9.5px] text-slate-500 truncate">Soal STS, SAS, SAT</p>
                </div>
              </button>

              {/* 2. Tracking Soal */}
              <button
                type="button"
                onClick={() => handleAkademikSubSelect('tracking_soal')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group min-h-[92px] ${
                  currentTab === 'tracking_soal'
                    ? 'bg-cyan-50 border-cyan-300 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentTab === 'tracking_soal'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-cyan-100 text-cyan-700'
                    }`}
                  >
                    <ListChecks className="w-4 h-4" />
                  </div>
                  {pendingSubmissionsCount > 0 && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-white shadow-xs animate-pulse">
                      {pendingSubmissionsCount}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">
                    Tracking Soal
                  </h5>
                  <p className="text-[9.5px] text-slate-500 truncate">Monitoring & Print</p>
                </div>
              </button>

              {/* 3. Arsip Rapor */}
              <button
                type="button"
                onClick={() => handleAkademikSubSelect('rapor')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group min-h-[92px] ${
                  currentTab === 'rapor'
                    ? 'bg-rose-50 border-rose-300 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentTab === 'rapor'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  {documentCounts.rapor > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                      {documentCounts.rapor}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                    Arsip Rapor
                  </h5>
                  <p className="text-[9.5px] text-slate-500 truncate">Rekap Nilai & Leger</p>
                </div>
              </button>

              {/* 4. Sertifikat & Piagam */}
              <button
                type="button"
                onClick={() => handleAkademikSubSelect('sertifikat')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group min-h-[92px] ${
                  currentTab === 'sertifikat'
                    ? 'bg-purple-50 border-purple-300 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentTab === 'sertifikat'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                  </div>
                  {documentCounts.sertifikat > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                      {documentCounts.sertifikat}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    Sertifikat
                  </h5>
                  <p className="text-[9.5px] text-slate-500 truncate">Piagam & Prestasi</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE LAINNYA BOTTOM SHEET (HUB UTILITAS & ADMIN)                         */}
      {/* ========================================================================= */}
      {isLainnyaSheetOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs animate-fade-in flex flex-col justify-end print:hidden">
          {/* Backdrop Touch Dismiss */}
          <div
            className="flex-1 w-full"
            onClick={() => setIsLainnyaSheetOpen(false)}
          />

          <div className="relative z-50 bg-white/98 backdrop-blur-2xl border-t border-slate-200 rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] p-4 sm:p-5 pb-24 animate-slide-up space-y-3">
            {/* Grabber Handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 opacity-80" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Menu Lainnya</h4>
                  <p className="text-[10.5px] text-slate-500">Pengaturan, QRIS, & Akses Eksternal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLainnyaSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Actions List */}
            <div className="space-y-2">
              {/* 1. Pengaturan / Admin Panel */}
              <button
                type="button"
                onClick={handleLainnyaAdminClick}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isAdmin
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {isAdmin ? 'Panel Pengaturan Admin' : 'Login Administrator'}
                      </span>
                      {isAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Aktif
                          </span>
                          {pendingAnalysisCount > 0 && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-white animate-pulse">
                              {pendingAnalysisCount} Setoran Baru
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 border border-amber-200">
                          Terkunci
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {isAdmin
                        ? 'Kelola branding, logo, dan arsip dokumen'
                        : 'Masuk dengan PIN untuk kelola sistem'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 2. QRIS Dukungan */}
              <button
                type="button"
                onClick={handleLainnyaQrisClick}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      QRIS & Profil Pengembang
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Apresiasi & donasi pengembangan portal
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 3. Google Drive Sekolah */}
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsLainnyaSheetOpen(false)}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      Google Drive Sekolah
                    </span>
                    <p className="text-[10px] text-slate-500">Buka cloud storage induk Drive</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* 4. Sesi Login Guru / Admin Logout */}
              {activeTeacher && !isAdmin && onLogoutTeacher && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate block">
                        {activeTeacher.name}
                      </span>
                      <p className="text-[10px] text-emerald-700">Sesi Guru Terverifikasi</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLainnyaSheetOpen(false);
                      onLogoutTeacher();
                    }}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}

              {isAdmin && onLogout && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate block">
                        Administrator
                      </span>
                      <p className="text-[10px] text-rose-700">Mode Admin Aktif</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLainnyaSheetOpen(false);
                      onLogout();
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION DOCK (5 MINIMALIS & ELEGAN SESUAI REFERENSI)      */}
      {/* ========================================================================= */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-2.5 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none print:hidden"
      >
        {/* 1. BERANDA */}
        <button
          type="button"
          id="mobile-nav-dashboard"
          onClick={() => handleMobileTabClick('dashboard')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isBerandaActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span
            className={`text-[10.5px] leading-tight tracking-tight ${
              isBerandaActive ? 'font-bold' : 'font-medium'
            }`}
          >
            Beranda
          </span>
          {isBerandaActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.4)] mt-0.5 animate-pulse" />
          )}
        </button>

        {/* 2. ADMINISTRASI */}
        <button
          type="button"
          id="mobile-nav-administrasi"
          onClick={() => handleMobileTabClick('administrasi')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isAdministrasiActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span
            className={`text-[10.5px] leading-tight tracking-tight ${
              isAdministrasiActive ? 'font-bold' : 'font-medium'
            }`}
          >
            Administrasi
          </span>
          {isAdministrasiActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.4)] mt-0.5 animate-pulse" />
          )}
        </button>

        {/* 3. AKADEMIK (MODUL RINGKASAN) */}
        <button
          type="button"
          id="mobile-nav-akademik"
          onClick={() => handleMobileTabClick('akademik')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isAkademikActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <BookOpen className="w-5 h-5 mb-0.5" />
            {pendingSubmissionsCount > 0 && !isAkademikActive && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b] animate-pulse" />
            )}
          </div>
          <span
            className={`text-[10.5px] leading-tight tracking-tight ${
              isAkademikActive ? 'font-bold' : 'font-medium'
            }`}
          >
            Akademik
          </span>
          {isAkademikActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.4)] mt-0.5 animate-pulse" />
          )}
        </button>

        {/* 4. SISWA */}
        <button
          type="button"
          id="mobile-nav-student_db"
          onClick={() => handleMobileTabClick('siswa')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isSiswaActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span
            className={`text-[10.5px] leading-tight tracking-tight ${
              isSiswaActive ? 'font-bold' : 'font-medium'
            }`}
          >
            Siswa
          </span>
          {isSiswaActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.4)] mt-0.5 animate-pulse" />
          )}
        </button>

        {/* 5. LAINNYA */}
        <button
          type="button"
          id="mobile-nav-lainnya"
          onClick={() => handleMobileTabClick('lainnya')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isLainnyaActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span
            className={`text-[10.5px] leading-tight tracking-tight ${
              isLainnyaActive ? 'font-bold' : 'font-medium'
            }`}
          >
            Lainnya
          </span>
          {isLainnyaActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.4)] mt-0.5 animate-pulse" />
          )}
        </button>
      </nav>
    </>
  );
};

