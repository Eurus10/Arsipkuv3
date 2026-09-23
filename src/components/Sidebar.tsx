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
  studentCount = 0,
  branding,
  onOpenQris,
  documentCounts,
}) => {
  const [isAkademikSheetOpen, setIsAkademikSheetOpen] = useState(false);
  const [isLainnyaSheetOpen, setIsLainnyaSheetOpen] = useState(false);

  const isImageLogo = branding?.logoType === 'image' && branding?.logoImageUrl;

  // Desktop Navigation Items (Preserved 100% Intact)
  const desktopNavItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      activeColor: 'text-amber-400',
      activeBg: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
      count: documentCounts.total,
    },
    {
      id: 'administrasi' as NavTab,
      label: 'Administrasi',
      icon: FolderArchive,
      activeColor: 'text-emerald-400',
      activeBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      count: documentCounts.administrasi,
    },
    {
      id: 'soal' as NavTab,
      label: 'Bank Soal',
      icon: BookOpenCheck,
      activeColor: 'text-blue-400',
      activeBg: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      count: documentCounts.soal,
    },
    {
      id: 'tracking_soal' as NavTab,
      label: 'Tracking Soal',
      icon: ListChecks,
      activeColor: 'text-cyan-400',
      activeBg: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
      count: pendingSubmissionsCount,
      isHighlight: true,
    },
    ...(isAdmin
      ? [
          {
            id: 'student_db' as NavTab,
            label: 'Data Siswa',
            icon: Users,
            activeColor: 'text-teal-400',
            activeBg: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
            count: studentCount,
            isHighlight: true,
          },
        ]
      : []),
    {
      id: 'rapor_sts' as NavTab,
      label: 'e-Rapor',
      icon: BookOpenCheck,
      activeColor: 'text-indigo-400',
      activeBg: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      isHighlight: true,
    },
    {
      id: 'sertifikat' as NavTab,
      label: 'Sertifikat',
      icon: Award,
      activeColor: 'text-purple-400',
      activeBg: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      count: documentCounts.sertifikat,
    },
    {
      id: 'rapor' as NavTab,
      label: 'Arsip Rapor',
      icon: GraduationCap,
      activeColor: 'text-rose-400',
      activeBg: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      count: documentCounts.rapor,
    },
    {
      id: 'admin' as NavTab,
      label: 'Pengaturan',
      icon: Settings,
      activeColor: 'text-sky-400',
      activeBg: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      isProtected: true,
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
      {/* DESKTOP SIDEBAR (100% PRESERVED & UNCHANGED)                               */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-20 bg-[#161822] border-r border-[#242838] min-h-screen py-6 items-center justify-between select-none z-30 flex-shrink-0">
        {/* Top Logo */}
        <div className="flex flex-col items-center gap-8 w-full">
          <button
            onClick={() => onSelectTab('dashboard')}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 hover:scale-105 transition-all group cursor-pointer overflow-hidden p-1"
            title="SDIT AL FIKRI - Beranda"
          >
            {isImageLogo ? (
              <img
                src={branding.logoImageUrl}
                alt="Logo Sekolah"
                className="w-full h-full object-contain"
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
                      ? item.activeBg + ' shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2332]'
                  }`}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />

                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute -left-1.5 w-1 h-5 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
                  )}

                  {/* Lock Indicator for Pengaturan if not authenticated */}
                  {isPengaturanLocked && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center"
                      title="Perlu Login Admin"
                    >
                      <Lock className="w-2.5 h-2.5" />
                    </span>
                  )}

                  {/* Badge Counter for Regular items */}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#11131A] text-[9px] font-bold text-slate-300 border border-[#2B3142] flex items-center justify-center">
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
              className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 flex flex-col items-center justify-center transition-all cursor-pointer group"
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
              className="w-11 h-11 rounded-2xl bg-[#1D202D] hover:bg-amber-500/20 border border-[#282D3E] hover:border-amber-500/40 text-slate-400 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer group"
            >
              <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* Admin Logout Button if logged in */}
          {isAdmin && onLogout && (
            <button
              onClick={onLogout}
              title="Logout Mode Admin (Aktif)"
              className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer group"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}

          <a
            href="https://drive.google.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Akses Google Drive Sekolah"
            className="w-11 h-11 rounded-2xl bg-[#1D202D] border border-[#282D3E] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 flex items-center justify-center transition-all group"
          >
            <ExternalLink className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </a>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE AKADEMIK BOTTOM SHEET (HUB RINGKASAN AKADEMIK)                     */}
      {/* ========================================================================= */}
      {isAkademikSheetOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in flex flex-col justify-end">
          {/* Backdrop Touch Dismiss */}
          <div
            className="flex-1 w-full"
            onClick={() => setIsAkademikSheetOpen(false)}
          />

          <div className="relative z-50 bg-[#0E1424]/98 backdrop-blur-2xl border-t border-slate-700/80 rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.7)] p-4 sm:p-5 pb-24 animate-slide-up space-y-3.5">
            {/* Grabber Handle */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-2 opacity-60" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-inner">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Menu & Arsip Akademik</h4>
                  <p className="text-[10.5px] text-slate-400">Pilih modul akademik yang ingin dibuka</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAkademikSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
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
                  ? 'bg-indigo-500/20 border-indigo-500/60 shadow-lg shadow-indigo-500/20'
                  : 'bg-indigo-950/40 border-indigo-500/30 hover:border-indigo-500/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    currentTab === 'rapor_sts'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}
                >
                  <BookOpenCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">
                      e-Rapor Kurikulum Merdeka
                    </h5>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Utama
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300">Input Nilai, TP, & Leger Nilai</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 4 Cards Grid (2x2) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Bank Soal */}
              <button
                type="button"
                onClick={() => handleAkademikSubSelect('soal')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group min-h-[92px] ${
                  currentTab === 'soal'
                    ? 'bg-blue-500/15 border-blue-500/50 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentTab === 'soal'
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    <BookOpenCheck className="w-4 h-4" />
                  </div>
                  {documentCounts.soal > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {documentCounts.soal}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    Bank Soal
                  </h5>
                  <p className="text-[9.5px] text-slate-400 truncate">Soal STS, SAS, SAT</p>
                </div>
              </button>

              {/* 2. Tracking Soal */}
              <button
                type="button"
                onClick={() => handleAkademikSubSelect('tracking_soal')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group min-h-[92px] ${
                  currentTab === 'tracking_soal'
                    ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentTab === 'tracking_soal'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-cyan-500/20 text-cyan-400'
                    }`}
                  >
                    <ListChecks className="w-4 h-4" />
                  </div>
                  {pendingSubmissionsCount > 0 && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                      {pendingSubmissionsCount}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Tracking Soal
                  </h5>
                  <p className="text-[9.5px] text-slate-400 truncate">Monitoring & Print</p>
                </div>
              </button>

              {/* 3. Arsip Rapor */}
              <button
                type="button"
                onClick={() => handleAkademikSubSelect('rapor')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group min-h-[92px] ${
                  currentTab === 'rapor'
                    ? 'bg-rose-500/15 border-rose-500/50 shadow-md shadow-rose-500/10'
                    : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentTab === 'rapor'
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  {documentCounts.rapor > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {documentCounts.rapor}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                    Arsip Rapor
                  </h5>
                  <p className="text-[9.5px] text-slate-400 truncate">Rekap Nilai & Leger</p>
                </div>
              </button>

              {/* 4. Sertifikat & Piagam */}
              <button
                type="button"
                onClick={() => handleAkademikSubSelect('sertifikat')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group min-h-[92px] ${
                  currentTab === 'sertifikat'
                    ? 'bg-purple-500/15 border-purple-500/50 shadow-md shadow-purple-500/10'
                    : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentTab === 'sertifikat'
                        ? 'bg-purple-500 text-white'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                  </div>
                  {documentCounts.sertifikat > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {documentCounts.sertifikat}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                    Sertifikat
                  </h5>
                  <p className="text-[9.5px] text-slate-400 truncate">Piagam & Prestasi</p>
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
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in flex flex-col justify-end">
          {/* Backdrop Touch Dismiss */}
          <div
            className="flex-1 w-full"
            onClick={() => setIsLainnyaSheetOpen(false)}
          />

          <div className="relative z-50 bg-[#0E1424]/98 backdrop-blur-2xl border-t border-slate-700/80 rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.7)] p-4 sm:p-5 pb-24 animate-slide-up space-y-3">
            {/* Grabber Handle */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-2 opacity-60" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Menu Lainnya</h4>
                  <p className="text-[10.5px] text-slate-400">Pengaturan, QRIS, & Akses Eksternal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLainnyaSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
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
                className="w-full p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isAdmin
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        {isAdmin ? 'Panel Pengaturan Admin' : 'Login Administrator'}
                      </span>
                      {isAdmin ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Terkunci
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {isAdmin
                        ? 'Kelola branding, logo, dan arsip dokumen'
                        : 'Masuk dengan PIN untuk kelola sistem'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 2. QRIS Dukungan */}
              <button
                type="button"
                onClick={handleLainnyaQrisClick}
                className="w-full p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                      QRIS & Profil Pengembang
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Apresiasi & donasi pengembangan portal
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 3. Google Drive Sekolah */}
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsLainnyaSheetOpen(false)}
                className="w-full p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                      Google Drive Sekolah
                    </span>
                    <p className="text-[10px] text-slate-400">Buka cloud storage induk Drive</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* 4. Sesi Login Guru / Admin Logout */}
              {activeTeacher && !isAdmin && onLogoutTeacher && (
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white truncate block">
                        {activeTeacher.name}
                      </span>
                      <p className="text-[10px] text-emerald-300">Sesi Guru Terverifikasi</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLainnyaSheetOpen(false);
                      onLogoutTeacher();
                    }}
                    className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}

              {isAdmin && onLogout && (
                <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white truncate block">
                        Administrator
                      </span>
                      <p className="text-[10px] text-rose-300">Mode Admin Aktif</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLainnyaSheetOpen(false);
                      onLogout();
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-1"
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B101D]/92 backdrop-blur-2xl border-t border-slate-800/90 rounded-t-[26px] shadow-[0_-10px_35px_rgba(0,0,0,0.65)] px-2.5 pt-2 pb-2.5 flex items-center justify-around select-none"
      >
        {/* 1. BERANDA */}
        <button
          type="button"
          id="mobile-nav-dashboard"
          onClick={() => handleMobileTabClick('dashboard')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isBerandaActive
              ? 'bg-gradient-to-b from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.15)] text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
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
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] mt-0.5 animate-pulse" />
          )}
        </button>

        {/* 2. ADMINISTRASI */}
        <button
          type="button"
          id="mobile-nav-administrasi"
          onClick={() => handleMobileTabClick('administrasi')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isAdministrasiActive
              ? 'bg-gradient-to-b from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.15)] text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
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
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] mt-0.5 animate-pulse" />
          )}
        </button>

        {/* 3. AKADEMIK (MODUL RINGKASAN) */}
        <button
          type="button"
          id="mobile-nav-akademik"
          onClick={() => handleMobileTabClick('akademik')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isAkademikActive
              ? 'bg-gradient-to-b from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.15)] text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <BookOpen className="w-5 h-5 mb-0.5" />
            {pendingSubmissionsCount > 0 && !isAkademikActive && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#facc15] animate-pulse" />
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
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] mt-0.5 animate-pulse" />
          )}
        </button>

        {/* 4. SISWA */}
        <button
          type="button"
          id="mobile-nav-student_db"
          onClick={() => handleMobileTabClick('siswa')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isSiswaActive
              ? 'bg-gradient-to-b from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.15)] text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
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
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] mt-0.5 animate-pulse" />
          )}
        </button>

        {/* 5. LAINNYA */}
        <button
          type="button"
          id="mobile-nav-lainnya"
          onClick={() => handleMobileTabClick('lainnya')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isLainnyaActive
              ? 'bg-gradient-to-b from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.15)] text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
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
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] mt-0.5 animate-pulse" />
          )}
        </button>
      </nav>
    </>
  );
};

