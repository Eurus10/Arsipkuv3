import React, { useState } from 'react';
import {
  UserCheck,
  Sparkles,
  X,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Building2,
  Lock,
} from 'lucide-react';
import { loginTeacherByName } from '../services/teacherStorage';
import { TeacherUser } from '../types';

interface TeacherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (teacher: TeacherUser) => void;
  targetFeatureName?: string;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetFeatureName = 'Arsip Guru',
}) => {
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setError('Harap masukkan nama Anda.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await loginTeacherByName(nameInput);
      if (result.success && result.teacher) {
        onSuccess(result.teacher);
        setNameInput('');
      } else {
        setError(result.message || 'Nama tidak ditemukan dalam whitelist guru.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#181B26] border border-[#272D3E] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1F2332] hover:bg-[#2A3044] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/10">
            <UserCheck className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Identitas Guru SDIT AL FIKRI</span>
          </div>
          <h2 className="text-xl font-bold text-white font-heading">
            Masuk Akses {targetFeatureName}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Silakan masukkan nama guru / pendidik Anda yang terdaftar pada whitelist SDIT AL FIKRI.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nama Guru / Pendidik
            </label>
            <div className="relative">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setError('');
                }}
                placeholder="Masukkan nama guru..."
                autoFocus
                className="w-full bg-[#12141D] border border-[#2B3144] focus:border-emerald-400 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
              Sistem akan otomatis mengingat identitas Anda di perangkat ini.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Memeriksa Whitelist...</span>
            ) : (
              <>
                <span>Buka Akses Dokumen</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-[#23293B] text-center">
          <p className="text-[11px] text-slate-400">
            Nama Anda belum terdaftar di whitelist? Hubungi{' '}
            <span className="text-slate-200 font-semibold">Administrator SDIT AL FIKRI</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
