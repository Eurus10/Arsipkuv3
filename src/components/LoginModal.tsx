import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, Check, X } from 'lucide-react';
import { loginAdmin, loginAdminWithGoogle } from '../services/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
      setIsSubmitting(false);
      setIsGoogleSubmitting(false);
      // Auto focus password input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Silakan masukkan kata sandi admin.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const ok = await loginAdmin(password, rememberMe);
      setIsSubmitting(false);
      if (ok) {
        onSuccess();
      } else {
        setError('Kata sandi salah atau gagal autentikasi. Silakan coba lagi.');
      }
    } catch {
      setIsSubmitting(false);
      setError('Terjadi kesalahan saat masuk. Silakan coba lagi.');
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleSubmitting(true);
    setError(null);
    try {
      const res = await loginAdminWithGoogle(rememberMe);
      setIsGoogleSubmitting(false);
      if (res.success) {
        onSuccess();
      } else if (res.error) {
        setError(res.error);
      }
    } catch {
      setIsGoogleSubmitting(false);
      setError('Gagal masuk dengan akun Google Admin.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Blur Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-[#181B26] border border-[#2B3247] rounded-3xl p-6 sm:p-7 shadow-2xl z-10 text-slate-100 animate-scale-up"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-[#222738] rounded-xl transition-colors"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-400/10">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-heading">
              Autentikasi Pengelola
            </h3>
            <p className="text-xs text-slate-400">
              Khusus Administrator SDIT AL FIKRI
            </p>
          </div>
        </div>

        {/* Protection Note */}
        <div className="p-3.5 bg-[#12141D] rounded-2xl border border-[#232838] mb-5 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            Menu <strong className="text-amber-400">Pengaturan &amp; Kelola Data</strong> hanya dapat diakses oleh admin untuk mencegah perubahan atau penghapusan data arsip oleh publik.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kata Sandi Admin <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Masukkan kata sandi..."
                className="w-full bg-[#12141D] border border-[#282E40] text-sm text-slate-100 placeholder-slate-400 px-4 py-3 pr-11 rounded-2xl focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all font-medium"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me checkbox & Hint */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-md bg-[#12141D] border-[#2A3144] text-amber-400 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-amber-400"
              />
              <span>Ingat sesi di perangkat ini</span>
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl shadow-lg shadow-amber-400/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk Pengaturan</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Divider & Google Admin Sign-In for Cloud Security */}
        <div className="mt-5 pt-4 border-t border-[#262C3F]">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting || isGoogleSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-[#12141D] hover:bg-[#1E2333] border border-[#2C334A] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.14H1.02v3.14C3.05 21.2 7.21 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.03 14.03c-.25-.74-.39-1.54-.39-2.36s.14-1.62.39-2.36V6.17H1.02C.37 7.47 0 8.94 0 10.67c0 1.73.37 3.2 1.02 4.5l4.01-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.05 2.8 1.02 6.83l4.01 3.14c.98-2.95 3.73-5.22 6.97-5.22z"
              />
            </svg>
            <span>
              {isGoogleSubmitting
                ? 'Menghubungkan Akun Google...'
                : 'Masuk dengan Google Admin (Cloud Sync)'}
            </span>
          </button>
          <p className="mt-2 text-[10px] text-center text-slate-400 leading-relaxed">
            Direkomendasikan agar perubahan checklist Tracking Soal tersinkron aman ke Firestore.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
