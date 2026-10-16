import React, { useEffect, useRef } from 'react';
import {
  User,
  Shield,
  LogOut,
  X,
  Layers,
  BookOpen,
  Users,
  ChevronRight,
  Sparkles,
  Settings,
} from 'lucide-react';

interface RaporTeacherProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName: string;
  teacherInitials: string;
  teacherRoleSubtitle: string;
  academicPeriodName?: string;
  stats: {
    totalClasses: number;
    totalSubjects: number;
    totalStudents: number;
  };
  onLogout: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

export const RaporTeacherProfilePopover: React.FC<RaporTeacherProfilePopoverProps> = ({
  isOpen,
  onClose,
  teacherName,
  teacherInitials,
  teacherRoleSubtitle,
  academicPeriodName,
  stats,
  onLogout,
  isAdmin = false,
  onOpenAdmin,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2.5 w-76 sm:w-84 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Popover Header with Teacher Info */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar Initials */}
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              {teacherInitials}
            </div>

            {/* Name & Role */}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                {teacherName}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                  {teacherRoleSubtitle}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {academicPeriodName && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="truncate">{academicPeriodName}</span>
          </div>
        )}
      </div>

      {/* Teaching Load Summary Stats */}
      <div className="p-3 bg-white">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1 mb-2">
          Beban Akademik Periode Ini
        </p>

        <div className="grid grid-cols-3 gap-2">
          {/* Kelas Binaan */}
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <div className="flex items-center justify-center text-amber-500 mb-1">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <p className="text-base font-bold text-slate-900 leading-tight">
              {stats.totalClasses}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Kelas</p>
          </div>

          {/* Mapel Diampu */}
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <div className="flex items-center justify-center text-emerald-600 mb-1">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <p className="text-base font-bold text-slate-900 leading-tight">
              {stats.totalSubjects}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Mapel</p>
          </div>

          {/* Peserta Didik */}
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <div className="flex items-center justify-center text-sky-600 mb-1">
              <Users className="w-3.5 h-3.5" />
            </div>
            <p className="text-base font-bold text-slate-900 leading-tight">
              {stats.totalStudents}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Siswa</p>
          </div>
        </div>
      </div>

      {/* Admin Quick Menu */}
      {isAdmin && onOpenAdmin && (
        <div className="px-2 py-1.5 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAdmin();
            }}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-[#176B45] hover:bg-emerald-50 border border-emerald-200 transition-all flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-[#176B45]" />
              <span>Panel Admin & Pengaturan</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Informational Menu Items (Coming Soon indicator as per Phase 7A rules) */}
      <div className="px-2 py-1.5 border-t border-slate-200 space-y-0.5 bg-white">
        <div className="px-3 py-2 rounded-xl flex items-center justify-between text-slate-500 text-xs">
          <div className="flex items-center gap-2.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Profil Lengkap Guru</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-medium text-slate-500">
            Segera Hadir
          </span>
        </div>

        <div className="px-3 py-2 rounded-xl flex items-center justify-between text-slate-500 text-xs">
          <div className="flex items-center gap-2.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Keamanan & PIN e-Rapor</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-medium text-slate-500">
            Segera Hadir
          </span>
        </div>
      </div>

      {/* Logout Action */}
      <div className="p-2 border-t border-slate-200 bg-slate-50/80">
        <button
          type="button"
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Keluar Sesi Guru</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
