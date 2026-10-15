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
  const isImageLogo = Boolean((branding?.logoType === 'image' && branding?.logoImageUrl) || branding?.logoImageUrl);

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs print:hidden">
      <div
        className="flex items-center gap-2.5 cursor-pointer"
        onClick={() => onSelectTab('dashboard')}
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden ${
            isImageLogo
              ? 'bg-transparent shadow-none p-0'
              : 'bg-emerald-600 text-white font-black text-xs shadow-xs p-0.5'
          }`}
        >
          {isImageLogo ? (
            <img src={branding.logoImageUrl} alt="Logo Sekolah" className="w-full h-full object-contain filter drop-shadow-sm" />
          ) : (
            <span>{branding?.logoText || 'AF'}</span>
          )}
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none font-heading">
            Arsip Digital
          </h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
            SDIT AL FIKRI
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {onOpenQris && (
          <button
            type="button"
            onClick={onOpenQris}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition-all cursor-pointer shadow-xs"
            title="QRIS Personal"
          >
            <QrCode className="w-3 h-3 text-emerald-600" />
            <span>QRIS</span>
          </button>
        )}

        {isAdmin ? (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-700 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Admin</span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="ml-1 p-0.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                title="Keluar Mode Admin"
              >
                <LogOut className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : activeTeacher ? (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-700 shadow-xs">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            <span className="truncate max-w-[90px]">{activeTeacher.name}</span>
            {onLogoutTeacher && (
              <button
                onClick={onLogoutTeacher}
                className="ml-1 p-0.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                title="Keluar Sesi Guru"
              >
                <LogOut className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onRequestLogin}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors shadow-xs cursor-pointer"
            title="Masuk sebagai Admin"
          >
            <Lock className="w-3 h-3 text-amber-500" />
            <span>Login Admin</span>
          </button>
        )}
      </div>
    </header>
  );
};

