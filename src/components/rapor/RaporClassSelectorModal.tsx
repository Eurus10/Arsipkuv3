import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  BookOpen,
  ArrowRight,
  AlertCircle,
  School,
  X,
  Sparkles,
  Plus,
} from 'lucide-react';
import {
  verifyClassPin,
  setActiveRaporSession,
  DEFAULT_CLASS_PINS,
  getStoredRaporSchoolYears,
  saveStoredRaporSchoolYears,
} from '../../services/raporStsService';

const CLASS_OPTIONS = [
  '1A', '1B', '2A', '2B', '2C', '3A', '3B', '3C',
  '4A', '4B', '5A', '5B', '6A', '6B',
];

interface RaporClassSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (classLevel: string, semester: '1' | '2', schoolYear: string) => void;
  isAdmin?: boolean;
  currentClass?: string;
  currentSemester?: '1' | '2';
  currentSchoolYear?: string;
}

export const RaporClassSelectorModal: React.FC<RaporClassSelectorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isAdmin = false,
  currentClass = '1A',
  currentSemester = '2',
  currentSchoolYear = '2026/2027',
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(currentClass || '1A');
  const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>(currentSemester || '2');

  // School Year Options (Starts from 2026/2027)
  const [schoolYearOptions, setSchoolYearOptions] = useState<string[]>(() => getStoredRaporSchoolYears());
  const initialYear = currentSchoolYear && currentSchoolYear !== '2024/2025'
    ? currentSchoolYear
    : (schoolYearOptions[0] || '2026/2027');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(initialYear);

  // Admin Add School Year State
  const [isAddingYear, setIsAddingYear] = useState<boolean>(false);
  const [newYearInput, setNewYearInput] = useState<string>('');
  const [yearError, setYearError] = useState<string | null>(null);

  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddNewYear = () => {
    const trimmed = newYearInput.trim();
    if (!trimmed) {
      setYearError('Masukkan format tahun ajaran, misal: 2027/2028');
      return;
    }
    // Format dash to slash if typed 2026-2027
    const formatted = trimmed.includes('-') && !trimmed.includes('/')
      ? trimmed.replace('-', '/')
      : trimmed;

    if (schoolYearOptions.includes(formatted)) {
      setSelectedSchoolYear(formatted);
      setIsAddingYear(false);
      setNewYearInput('');
      setYearError(null);
      return;
    }

    const updated = [formatted, ...schoolYearOptions.filter((y) => y !== formatted)];
    setSchoolYearOptions(updated);
    saveStoredRaporSchoolYears(updated);
    setSelectedSchoolYear(formatted);
    setIsAddingYear(false);
    setNewYearInput('');
    setYearError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await verifyClassPin(selectedClass, pin, isAdmin);

      if (result.success) {
        setActiveRaporSession(selectedClass, selectedSemester, selectedSchoolYear);
        onSuccess(selectedClass, selectedSemester, selectedSchoolYear);
      } else {
        setErrorMessage(result.message || 'Kata sandi atau PIN kelas salah.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan verifikasi autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        id="rapor-sts-class-gatekeeper-modal"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Top Header Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500" />

        {/* Modal Header */}
        <div className="p-6 sm:p-7 pb-4 border-b border-slate-800/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                  E-Rapor
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    Admin Master
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-white font-heading mt-0.5">
                Pilih Kelas & Autentikasi Akses
              </h2>
              <p className="text-xs text-slate-400">
                SDIT Al Fikri • Kurikulum Merdeka
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup & Kembali"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
          {/* Class Grid Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              1. Pilih Kelas yang Akan Dikerjakan:
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {CLASS_OPTIONS.map((c) => {
                const isSelected = selectedClass === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedClass(c);
                      setErrorMessage(null);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                        : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Semester & School Year Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Semester */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                2. Semester:
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedSemester('1')}
                  className={`py-2 rounded-lg transition-all ${
                    selectedSemester === '1'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1 (Ganjil)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSemester('2')}
                  className={`py-2 rounded-lg transition-all ${
                    selectedSemester === '2'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2 (Genap)
                </button>
              </div>
            </div>

            {/* Tahun Ajaran */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  3. Tahun Ajaran:
                </label>
                {isAdmin && !isAddingYear && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingYear(true);
                      setNewYearInput('');
                      setYearError(null);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Admin: Tambah pilihan tahun ajaran baru"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Tahun</span>
                  </button>
                )}
              </div>

              {isAddingYear ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newYearInput}
                      onChange={(e) => {
                        setNewYearInput(e.target.value);
                        setYearError(null);
                      }}
                      placeholder="Contoh: 2027/2028"
                      className="flex-1 bg-slate-950/90 border border-amber-500/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddNewYear}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingYear(false);
                        setYearError(null);
                      }}
                      className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                  {yearError && (
                    <p className="text-[10px] text-rose-400 font-semibold">{yearError}</p>
                  )}
                </div>
              ) : (
                <select
                  value={selectedSchoolYear}
                  onChange={(e) => setSelectedSchoolYear(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-500/60 cursor-pointer"
                >
                  {schoolYearOptions.map((yr) => (
                    <option key={yr} value={yr} className="bg-slate-900 text-white">
                      {yr}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* PIN / Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>4. Kata Sandi / PIN Kelas {selectedClass}:</span>
              </label>
              {isAdmin && (
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Bypass Admin Aktif
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder={
                  isAdmin
                    ? 'Admin dapat langsung klik Masuk (atau gunakan PIN)'
                    : `Masukkan PIN Kelas ${selectedClass}...`
                }
                className="w-full bg-slate-950/90 border border-slate-700/90 rounded-xl pl-3.5 pr-11 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={showPin ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick helper tip */}
            <div className="mt-2 text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">
                  Default PIN: <code className="text-amber-300 font-mono px-1 py-0.5 bg-slate-900 rounded">{selectedClass.toLowerCase()}</code> atau <code className="text-amber-300 font-mono px-1 py-0.5 bg-slate-900 rounded">1234</code>
                </p>
                <p className="text-slate-400 mt-0.5">
                  Admin dapat mengganti kata sandi tiap kelas melalui menu Pengaturan Rapor.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Kembali ke Dashboard
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Buka Lembar Kerja Rapor Kelas {selectedClass}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
