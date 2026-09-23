import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import type { TeacherUser } from '../types';
import {
  getEraporPinStatus,
  loginErapor,
  setEraporPin,
} from '../services/teacherEraporAuthService';

interface EraporAuthModalProps {
  isOpen: boolean;
  teacher: TeacherUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = 'loading' | 'create' | 'login';

export const EraporAuthModal: React.FC<EraporAuthModalProps> = ({
  isOpen,
  teacher,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<Mode>('loading');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !teacher) return;

    let cancelled = false;

    const loadStatus = async () => {
      setMode('loading');
      setPin('');
      setConfirmPin('');
      setErrorMessage(null);
      setInfoMessage(null);
      setShowPin(false);
      setShowConfirmPin(false);

      const result = await getEraporPinStatus(teacher.id);

      if (cancelled) return;

      if (!result.success) {
        setErrorMessage(result.message || 'Gagal memeriksa status PIN e-Rapor.');
        return;
      }

      setMode(result.hasPin ? 'login' : 'create');
    };

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [isOpen, teacher]);

  if (!isOpen || !teacher) return null;

  const handleClose = () => {
    if (isLoading) return;

    setPin('');
    setConfirmPin('');
    setErrorMessage(null);
    setInfoMessage(null);
    onClose();
  };

  const handleCreatePin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanPin = pin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanPin) {
      setErrorMessage('Silakan buat PIN e-Rapor.');
      return;
    }

    if (cleanPin.length < 4) {
      setErrorMessage('PIN minimal 4 karakter.');
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setErrorMessage('Konfirmasi PIN tidak sama.');
      return;
    }

    setIsLoading(true);

    try {
      const saveResult = await setEraporPin(teacher.id, cleanPin);

      if (!saveResult.success) {
        setErrorMessage(saveResult.message);
        return;
      }

      const loginResult = await loginErapor(teacher.id, cleanPin);

      if (!loginResult.success) {
        setErrorMessage(
          loginResult.message || 'PIN berhasil disimpan, tetapi login e-Rapor gagal.',
        );
        return;
      }

      onSuccess();
    } catch (error: any) {
      console.error('[e-Rapor Auth] Create PIN error:', error);
      setErrorMessage(error?.message || 'Terjadi kesalahan saat membuat PIN e-Rapor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanPin = pin.trim();

    if (!cleanPin) {
      setErrorMessage('Masukkan PIN e-Rapor.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginErapor(teacher.id, cleanPin);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      onSuccess();
    } catch (error: any) {
      console.error('[e-Rapor Auth] Login error:', error);
      setErrorMessage(error?.message || 'Terjadi kesalahan saat login e-Rapor.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPinInput = (
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>,
    visible: boolean,
    setVisible: React.Dispatch<React.SetStateAction<boolean>>,
    label: string,
    autoFocus = false,
  ) => (
    <div>
      <label className="block text-xs font-bold text-slate-300 mb-2">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setErrorMessage(null);
          }}
          autoFocus={autoFocus}
          autoComplete="off"
          disabled={isLoading}
          className="w-full h-12 rounded-2xl bg-slate-950/70 border border-slate-700 text-white px-4 pr-12 outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10 transition-all"
          placeholder="Masukkan PIN"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#171A24] border border-slate-800 rounded-[28px] shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-400" />

        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <LockKeyhole className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
                    e-Rapor
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-300">
                    Guru
                  </span>
                </div>
                <h2 className="text-lg font-black text-white mt-0.5">Akses e-Rapor</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-950/45 border border-slate-800 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <UserRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Guru aktif</p>
              <p className="text-sm font-bold text-white truncate">{teacher.name}</p>
              {teacher.roleTitle && (
                <p className="text-[11px] text-slate-400 truncate">{teacher.roleTitle}</p>
              )}
            </div>
          </div>

          {mode === 'loading' && (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <p className="text-xs">Memeriksa akses e-Rapor...</p>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreatePin} className="mt-6 space-y-4">
              <div className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4">
                <div className="flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">Buat PIN e-Rapor</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      PIN ini khusus untuk membuka e-Rapor dan mengamankan input nilai siswa.
                    </p>
                  </div>
                </div>
              </div>

              {renderPinInput(pin, setPin, showPin, setShowPin, 'PIN Baru', true)}
              {renderPinInput(confirmPin, setConfirmPin, showConfirmPin, setShowConfirmPin, 'Konfirmasi PIN')}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Simpan PIN & Masuk</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              {renderPinInput(pin, setPin, showPin, setShowPin, 'PIN e-Rapor', true)}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Masuk ke e-Rapor</span><ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="flex items-start gap-2 pt-1">
                <ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Lupa PIN? Silakan hubungi Administrator/TU untuk reset PIN e-Rapor.
                </p>
              </div>
            </form>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-xs text-red-300 leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {infoMessage && (
            <div className="mt-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
              <p className="text-xs text-emerald-300 leading-relaxed">{infoMessage}</p>
            </div>
          )}

          <p className="text-[10px] text-slate-600 text-center mt-5">
            PIN e-Rapor terpisah dari login utama aplikasi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EraporAuthModal;
