import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  X,
  Lock,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  Loader2,
  LogOut,
  Building2,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import {
  AccessToken,
  activateUserToken,
  getUserActivatedToken,
  deactivateUserToken,
} from '../../services/tokenAuthService';

interface TokenAccessModalProps {
  isOpen: boolean;
  featureName?: string;
  onClose: () => void;
  onSuccess: (token: AccessToken) => void;
  onRequestAdminLogin?: () => void;
}

export const TokenAccessModal: React.FC<TokenAccessModalProps> = ({
  isOpen,
  featureName = 'Modul Evaluasi & Generator Analisis Soal',
  onClose,
  onSuccess,
  onRequestAdminLogin,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [activeToken, setActiveToken] = useState<AccessToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = getUserActivatedToken();
      setActiveToken(current);
      setError('');
      setSuccessMessage('');
      setTokenInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Silakan masukkan kode token lisensi Anda.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await activateUserToken(tokenInput);
      if (result.success && result.token) {
        setActiveToken(result.token);
        setSuccessMessage(result.message);
        setTimeout(() => {
          onSuccess(result.token!);
        }, 1200);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memvalidasi token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = () => {
    deactivateUserToken();
    setActiveToken(null);
    setSuccessMessage('Token lisensi berhasil dinonaktifkan dari perangkat ini.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const formatExpiry = (expiresAt: string) => {
    if (expiresAt === 'lifetime') return 'Permanen (Seumur Hidup)';
    try {
      const d = new Date(expiresAt);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return expiresAt;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-slate-100"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-[28px] bg-[#141824] border border-[#2A334A] shadow-2xl shadow-black/80 overflow-hidden animate-scale-up">
        {/* Header with gradient accent */}
        <div className="relative px-6 py-5 border-b border-[#242D42] bg-gradient-to-r from-amber-950/40 via-[#181E2E] to-[#141824]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Aktivasi Lisensi / Token Akses</span>
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Pro Tools
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Akses Fitur {featureName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Active Token Info Card if already activated */}
          {activeToken ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">
                    Lisensi Perangkat Aktif
                  </span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeToken.code}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Pemilik Lisensi:</span>
                  <span className="font-bold text-white">{activeToken.clientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Masa Berlaku:</span>
                  <span className="font-bold text-emerald-300">{formatExpiry(activeToken.expiresAt)}</span>
                </div>
              </div>
              <div className="pt-2 flex items-center justify-between border-t border-emerald-500/20 text-xs">
                <button
                  type="button"
                  onClick={() => onSuccess(activeToken)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer shadow-md transition-all"
                >
                  Lanjut Buka Fitur
                </button>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="text-slate-400 hover:text-rose-300 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Ganti Token / Keluar</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Feature Perks Highlights */}
              <div className="rounded-2xl border border-[#252E44] bg-[#0E121B] p-4 space-y-2.5">
                <div className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fitur Unggulan yang Didapatkan:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Generator Kisi-Kisi & Soal Otomatis</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Analisis Butir Soal Kelas & Guru Bidang</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Export Berkas Resmi Excel Siap Cetak</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Multi-Sekolah & Bebas Input Siswa</span>
                  </div>
                </div>
              </div>

              {/* Activation Form */}
              <form onSubmit={handleActivate} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Masukkan Token Lisensi / Voucher Anda
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                      placeholder="Contoh: AF-PRO-2026 atau AF-X9K2-7M3Q"
                      className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-4 py-3 text-xs sm:text-sm font-mono font-bold tracking-wider text-amber-300 placeholder-slate-600 outline-none focus:border-amber-400 uppercase transition-all"
                    />
                    <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isLoading ? 'Memvalidasi Token...' : 'Aktivasi Akses Sekarang'}</span>
                </button>
              </form>

              {/* Need Token / Contact Section */}
              <div className="rounded-xl border border-[#232B3D] bg-[#11141F] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-200">Belum memiliki Token Lisensi?</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Hubungi Admin untuk aktivasi lisensi sekolah atau berlangganan.
                  </div>
                </div>
                <a
                  href="https://wa.me/6281388139377?text=Halo%20Admin%2C%20saya%20tertarik%20untuk%20membeli%20Token%20Lisensi%20Modul%20Evaluasi%20dan%20Analisis%20Soal%20SDIT."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all cursor-pointer flex-shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hubungi Admin (WhatsApp)</span>
                </a>
              </div>
            </>
          )}

          {/* Admin Login Link at bottom */}
          {onRequestAdminLogin && (
            <div className="pt-2 border-t border-[#232B3D] flex items-center justify-between text-[11px] text-slate-400">
              <span>Admin SDIT AL FIKRI?</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestAdminLogin();
                }}
                className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer hover:underline"
              >
                Masuk via Password Admin ➔
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
