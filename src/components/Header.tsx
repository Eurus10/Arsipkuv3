import React from 'react';
import { NavTab, TeacherUser } from '../types';
import { ShieldCheck, Lock, LogOut, UserCheck, QrCode } from 'lucide-react';
import { AppBranding } from '../services/brandingStorage';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isAdmin: boolean;
  onLogout?: () => void;
  onRequestLogin?: () => void;
  activeTeacher?: TeacherUser | null;
  onLogoutTeacher?: () => void;
  branding?: AppBranding;
  onOpenQris?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  isAdmin,
  onLogout,
  onRequestLogin,
  activeTeacher,
  onLogoutTeacher,
  branding,
  onOpenQris,
}) => {
  const isImageLogo = branding?.logoType === 'image' && branding?.logoImageUrl;

  return (
    <header className="md:hidden sticky top-0 z-30 bg-[#161822]/95 backdrop-blur-xl border-b border-[#25293A] px-4 py-3 flex items-center justify-between shadow-lg">
      <div
        className="flex items-center gap-2.5 cursor-pointer"
        onClick={() => onSelectTab('dashboard')}
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md shadow-emerald-500/20 overflow-hidden p-0.5">
          {isImageLogo ? (
            <img src={branding.logoImageUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
          ) : (
            <span>{branding?.logoText || 'AF'}</span>
          )}
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white leading-none font-heading">
            Arsip Digital
          </h1>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            SDIT AL FIKRI
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {onOpenQris && (
          <button
            type="button"
            onClick={onOpenQris}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/25 transition-all cursor-pointer"
            title="QRIS Personal"
          >
            <QrCode className="w-3 h-3 text-emerald-400" />
            <span>QRIS</span>
          </button>
        )}

        {isAdmin ? (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Admin</span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="ml-1 p-0.5 text-rose-400 hover:text-rose-300"
                title="Keluar Mode Admin"
              >
                <LogOut className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : activeTeacher ? (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-400">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            <span className="truncate max-w-[90px]">{activeTeacher.name}</span>
            {onLogoutTeacher && (
              <button
                onClick={onLogoutTeacher}
                className="ml-1 p-0.5 text-rose-400 hover:text-rose-300"
                title="Keluar Sesi Guru"
              >
                <LogOut className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onRequestLogin}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1F2332] hover:bg-[#282E40] text-slate-300 text-[11px] font-semibold border border-[#2D3346] transition-colors"
            title="Masuk sebagai Admin"
          >
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Login Admin</span>
          </button>
        )}
      </div>
    </header>
  );
};

