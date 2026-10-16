import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Layers,
  BookOpen,
  Settings,
  Lock,
  Users,
  UserCheck,
  MoreHorizontal,
  QrCode,
  Bell,
  Shield,
  FileText,
  Award,
  ChevronDown,
  Search,
  X,
  GraduationCap
} from 'lucide-react';
import { NavTab, TeacherUser } from '../types';
import { AppBranding } from '../services/brandingStorage';
import { RaporNotificationPopover, RaporNotificationItem } from './rapor/RaporNotificationPopover';
import { RaporTeacherProfilePopover } from './rapor/RaporTeacherProfilePopover';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isAdmin: boolean;
  onLogout: () => void;
  onRequestLogin: () => void;
  activeTeacher: TeacherUser | null;
  onLogoutTeacher: () => void;
  pendingSubmissionsCount: number;
  pendingAnalysisCount: number;
  studentCount: number;
  branding: AppBranding;
  onOpenQris: () => void;
  documentCounts?: {
    total: number;
    administrasi: number;
    soal: number;
    sertifikat: number;
    rapor: number;
  };
  globalSearch: string;
  onGlobalSearchChange: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  isAdmin,
  onLogout,
  onRequestLogin,
  activeTeacher,
  onLogoutTeacher,
  pendingSubmissionsCount,
  pendingAnalysisCount,
  studentCount,
  branding,
  onOpenQris,
  documentCounts = { total: 0, administrasi: 0, soal: 0, sertifikat: 0, rapor: 0 },
  globalSearch,
  onGlobalSearchChange,
}) => {
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showArsipPopover, setShowArsipPopover] = useState(false);

  const arsipPopoverRef = useRef<HTMLDivElement>(null);

  // Close Arsip popover on outside click
  useEffect(() => {
    if (!showArsipPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (arsipPopoverRef.current && !arsipPopoverRef.current.contains(e.target as Node)) {
        setShowArsipPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showArsipPopover]);

  const totalDocuments = documentCounts.total || (documentCounts.administrasi + documentCounts.soal + documentCounts.sertifikat + documentCounts.rapor);

  const isBerandaActive = currentTab === 'dashboard';
  const isAdministrasiActive = ['administrasi'].includes(currentTab);
  const isRaporActive = currentTab === 'rapor_sts';
  const isArsipActive = [
    'soal',
    'tracking_soal',
    'sertifikat',
    'rapor',
  ].includes(currentTab);
  const isSiswaActive = ['student_db', 'academic_settings'].includes(currentTab);
  const isLainnyaActive = ['admin'].includes(currentTab);

  const handleMobileTabClick = (tabGroup: string) => {
    if (tabGroup === 'dashboard') onSelectTab('dashboard');
    else if (tabGroup === 'administrasi') onSelectTab('administrasi');
    else if (tabGroup === 'rapor_sts' || tabGroup === 'rapor') onSelectTab('rapor_sts');
    else if (tabGroup === 'akademik') setShowArsipPopover(true);
    else if (tabGroup === 'siswa' && isAdmin) onSelectTab('student_db');
    else if (tabGroup === 'admin' && isAdmin) onSelectTab('admin');
  };

  const sampleNotifications: RaporNotificationItem[] = [
    {
      id: '1',
      type: pendingSubmissionsCount > 0 ? 'warning' : 'success',
      title: pendingSubmissionsCount > 0 ? `${pendingSubmissionsCount} Nilai Belum Diverifikasi` : 'Semua Nilai Telah Diverifikasi',
      description: pendingSubmissionsCount > 0 ? 'Terdapat pengajuan nilai rapor yang menunggu persetujuan admin.' : 'Sistem akademik berjalan lancar tanpa kendala.',
      timestamp: 'Baru saja',
    },
    {
      id: '2',
      type: 'info',
      title: 'Database Siswa Aktif',
      description: `Total ${studentCount} siswa terdaftar dalam sistem akademik sekolah.`,
      timestamp: 'Hari ini',
    },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & School Branding */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => onSelectTab('dashboard')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#176B45] to-[#125335] text-white flex items-center justify-center font-bold shadow-sm ring-2 ring-emerald-500/20">
              {branding.logoImageUrl ? (
                <img src={branding.logoImageUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span className="text-sm font-bold text-white">{branding.logoText || 'AF'}</span>
              )}
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-0.5">
                Arsip Digital SDIT
              </h1>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] lg:max-w-xs">
                {branding.personalName ? `${branding.personalName} (${branding.personalRole})` : 'Sistem Administrasi & Akademik Terpadu'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            {/* 1. Beranda */}
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isBerandaActive
                  ? 'bg-white text-[#176B45] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Home className="w-4 h-4" />
              Beranda
            </button>

            {/* 2. Administrasi */}
            <button
              onClick={() => onSelectTab('administrasi')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isAdministrasiActive
                  ? 'bg-white text-[#176B45] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              Administrasi
            </button>

            {/* 3. e-Rapor (Modul e-Rapor STS Dashboard) */}
            <button
              onClick={() => onSelectTab('rapor_sts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isRaporActive
                  ? 'bg-white text-[#176B45] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              e-Rapor
            </button>

            {/* 4. Arsip (dengan Pop-up Pilihan Arsip) */}
            <div className="relative" ref={arsipPopoverRef}>
              <button
                onClick={() => {
                  setShowArsipPopover(!showArsipPopover);
                  setShowNotificationPopover(false);
                  setShowProfilePopover(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isArsipActive || showArsipPopover
                    ? 'bg-white text-[#176B45] shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Arsip
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showArsipPopover ? 'rotate-180' : ''}`} />
                {pendingSubmissionsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-0.5" />
                )}
              </button>

              {/* Pop-up Pilihan Arsip */}
              {showArsipPopover && (
                <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-2">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-800">Pilihan Arsip</p>
                    <p className="text-[10px] text-slate-500">Pilih kategori arsip yang ingin diakses</p>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        onSelectTab('soal');
                        setShowArsipPopover(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-[#176B45] text-xs font-medium transition-all text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#176B45] flex items-center justify-center shrink-0 group-hover:bg-[#176B45] group-hover:text-white transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">Arsip Bank Soal & Analisis</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Soal STS, SAS, SAT & Kisi-kisi</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onSelectTab('rapor');
                        setShowArsipPopover(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-[#176B45] text-xs font-medium transition-all text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#176B45] flex items-center justify-center shrink-0 group-hover:bg-[#176B45] group-hover:text-white transition-colors">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">Arsip Rapor Siswa (e-Rapor)</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Nilai sumatif, ekstrakurikuler & ledger</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onSelectTab('sertifikat');
                        setShowArsipPopover(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-[#176B45] text-xs font-medium transition-all text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#176B45] flex items-center justify-center shrink-0 group-hover:bg-[#176B45] group-hover:text-white transition-colors">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">Arsip Sertifikat</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Sertifikat penghargaan guru & siswa</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Siswa (Hanya untuk Admin) */}
            {isAdmin && (
              <button
                onClick={() => onSelectTab('student_db')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isSiswaActive
                    ? 'bg-white text-[#176B45] shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Users className="w-4 h-4" />
                Siswa
              </button>
            )}
          </nav>

          {/* Right Action Controls (Search, Notifications, QRIS, Profile/Login) */}
          <div className="flex items-center gap-2.5">
            {/* Global Search Bar */}
            <div className="relative hidden lg:block w-56">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => onGlobalSearchChange(e.target.value)}
                placeholder="Cari dokumen..."
                className="w-full bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 pl-9 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#176B45]/30 transition-all font-medium shadow-2xs"
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => onGlobalSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Bersihkan"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotificationPopover(!showNotificationPopover);
                  setShowProfilePopover(false);
                  setShowArsipPopover(false);
                }}
                className="relative p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                title="Notifikasi"
              >
                <Bell className="w-4 h-4" />
                {(pendingSubmissionsCount > 0 || pendingAnalysisCount > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
              <RaporNotificationPopover
                isOpen={showNotificationPopover}
                onClose={() => setShowNotificationPopover(false)}
                notifications={sampleNotifications}
                onSelectNotification={(item) => {
                  if (item.id === '1') onSelectTab('rapor');
                  setShowNotificationPopover(false);
                }}
              />
            </div>

            {/* QRIS / Donation Button (Diletakkan di samping tombol notifikasi) */}
            <button
              onClick={onOpenQris}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer"
              title="Donasi & QRIS App"
            >
              <QrCode className="w-4 h-4 text-[#176B45]" />
              <span className="hidden sm:inline">QRIS</span>
            </button>

            {/* Teacher / Admin Authentication Badge */}
            {isAdmin ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProfilePopover(!showProfilePopover);
                    setShowNotificationPopover(false);
                    setShowArsipPopover(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#176B45] text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-[#176B45]" />
                  <span className="hidden sm:inline">Administrator</span>
                </button>
                <RaporTeacherProfilePopover
                  isOpen={showProfilePopover}
                  onClose={() => setShowProfilePopover(false)}
                  teacherName="Administrator Utama"
                  teacherInitials="AD"
                  teacherRoleSubtitle="Full Access Control"
                  stats={{ totalClasses: 12, totalSubjects: 10, totalStudents: studentCount }}
                  onLogout={onLogout}
                  isAdmin={true}
                  onOpenAdmin={() => onSelectTab('admin')}
                />
              </div>
            ) : activeTeacher ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProfilePopover(!showProfilePopover);
                    setShowNotificationPopover(false);
                    setShowArsipPopover(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#176B45]" />
                  <span className="max-w-[100px] sm:max-w-[140px] truncate">{activeTeacher.name}</span>
                </button>
                <RaporTeacherProfilePopover
                  isOpen={showProfilePopover}
                  onClose={() => setShowProfilePopover(false)}
                  teacherName={activeTeacher.name}
                  teacherInitials={activeTeacher.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  teacherRoleSubtitle={activeTeacher.roleTitle || 'Guru Pengajar'}
                  academicPeriodName="Semua Rombel"
                  stats={{ totalClasses: 1, totalSubjects: 5, totalStudents: studentCount }}
                  onLogout={onLogoutTeacher}
                  isAdmin={false}
                />
              </div>
            ) : (
              <button
                onClick={onRequestLogin}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#176B45] text-white hover:bg-[#125335] text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Masuk Guru / Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around print:hidden">
        {/* 1. Beranda */}
        <button
          type="button"
          id="mobile-nav-beranda"
          onClick={() => handleMobileTabClick('dashboard')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
            isBerandaActive
              ? 'bg-[#E8F0E8] text-[#176B45] border border-[#D7E4D7] font-bold'
              : 'text-[#718174] hover:text-[#26372D]'
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
            <span className="w-1.5 h-1.5 rounded-full bg-[#176B45] mt-0.5" />
          )}
        </button>

        {/* 2. Administrasi */}
        <button
          type="button"
          id="mobile-nav-administrasi"
          onClick={() => handleMobileTabClick('administrasi')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all duration-300 cursor-pointer min-w-[56px] ${
            isAdministrasiActive
              ? 'bg-[#E8F0E8] text-[#176B45] border border-[#D7E4D7] font-bold'
              : 'text-[#718174] hover:text-[#26372D]'
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
            <span className="w-1.5 h-1.5 rounded-full bg-[#176B45] mt-0.5" />
          )}
        </button>

        {/* 3. e-Rapor (Modul e-Rapor STS) */}
        <button
          type="button"
          id="mobile-nav-rapor"
          onClick={() => handleMobileTabClick('rapor_sts')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all duration-300 cursor-pointer min-w-[56px] ${
            isRaporActive
              ? 'bg-[#E8F0E8] text-[#176B45] border border-[#D7E4D7] font-bold'
              : 'text-[#718174] hover:text-[#26372D]'
          }`}
        >
          <GraduationCap className="w-5 h-5 mb-0.5" />
          <span
            className={`text-[10.5px] leading-tight tracking-tight ${
              isRaporActive ? 'font-bold' : 'font-medium'
            }`}
          >
            e-Rapor
          </span>
          {isRaporActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#176B45] mt-0.5" />
          )}
        </button>

        {/* 4. Arsip */}
        <button
          type="button"
          id="mobile-nav-akademik"
          onClick={() => setShowArsipPopover(true)}
          className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all duration-300 cursor-pointer min-w-[56px] ${
            isArsipActive || showArsipPopover
              ? 'bg-[#E8F0E8] text-[#176B45] border border-[#D7E4D7] font-bold'
              : 'text-[#718174] hover:text-[#26372D]'
          }`}
        >
          <div className="relative">
            <BookOpen className="w-5 h-5 mb-0.5" />
            {pendingSubmissionsCount > 0 && !isArsipActive && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b] animate-pulse" />
            )}
          </div>
          <span
            className={`text-[10.5px] leading-tight tracking-tight truncate max-w-[70px] ${
              isArsipActive || showArsipPopover ? 'font-bold' : 'font-medium'
            }`}
          >
            Arsip
          </span>
          {isArsipActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#176B45] mt-0.5" />
          )}
        </button>

        {/* 4. Siswa (Hanya Admin) */}
        {isAdmin && (
          <button
            type="button"
            id="mobile-nav-student_db"
            onClick={() => handleMobileTabClick('siswa')}
            className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
              isSiswaActive
                ? 'bg-[#E8F0E8] text-[#176B45] border border-[#D7E4D7] font-bold'
                : 'text-[#718174] hover:text-[#26372D]'
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#176B45] mt-0.5" />
            )}
          </button>
        )}

        {/* 5. Admin (Hanya Admin) */}
        {isAdmin && (
          <button
            type="button"
            id="mobile-nav-lainnya"
            onClick={() => handleMobileTabClick('admin')}
            className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer min-w-[62px] ${
              isLainnyaActive
                ? 'bg-[#E8F0E8] text-[#176B45] border border-[#D7E4D7] font-bold'
                : 'text-[#718174] hover:text-[#26372D]'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span
              className={`text-[10.5px] leading-tight tracking-tight ${
                isLainnyaActive ? 'font-bold' : 'font-medium'
              }`}
            >
              Admin
            </span>
            {isLainnyaActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#176B45] mt-0.5" />
            )}
          </button>
        )}
      </nav>
    </>
  );
};
