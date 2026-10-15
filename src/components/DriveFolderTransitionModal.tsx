import React, { useEffect, useState } from 'react';
import {
  FolderOpen,
  ArrowRight,
  Sparkles,
  Info,
  FileText,
  Copy,
  Check,
  Clock,
  X,
} from 'lucide-react';
import { sanitizeDriveUrl } from '../utils/driveHelpers';

interface DriveFolderTransitionModalProps {
  isOpen: boolean;
  targetUrl: string;
  onClose: () => void;
  folderTitle?: string;
  durationSeconds?: number;
}

export const DriveFolderTransitionModal: React.FC<DriveFolderTransitionModalProps> = ({
  isOpen,
  targetUrl,
  onClose,
  folderTitle = 'Folder Kosong Pengumpulan Soal',
  durationSeconds = 4,
}) => {
  const [countdown, setCountdown] = useState(durationSeconds);
  const [copiedExample, setCopiedExample] = useState(false);

  const handleOpenNow = () => {
    const cleanUrl = sanitizeDriveUrl(targetUrl);
    if (cleanUrl) {
      window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setCountdown(durationSeconds);
      setCopiedExample(false);
      return;
    }

    setCountdown(durationSeconds);
    setCopiedExample(false);

    const timer = setTimeout(() => {
      handleOpenNow();
    }, durationSeconds * 1000);

    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isOpen, targetUrl, durationSeconds]);

  if (!isOpen) return null;

  const handleCopyExample = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden">
        {/* Soft Ambient Accents */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Tutup dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Icon & Countdown */}
        <div className="flex items-start justify-between gap-3 mb-4 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Menuju Google Drive</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading leading-tight">
                {folderTitle}
              </h3>
            </div>
          </div>

          {/* Countdown Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 shrink-0 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationDuration: `${durationSeconds}s` }} />
            <span className="text-xs font-black font-mono">{countdown}s</span>
          </div>
        </div>

        {/* Progress Bar (smooth transition) */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${((durationSeconds - countdown) / durationSeconds) * 100}%` }}
          />
        </div>

        {/* Core Instruction Box */}
        <div className="bg-slate-50 border border-amber-200/80 rounded-2xl p-4 mb-4 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-black uppercase tracking-wider">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Format Penamaan File Naskah Soal</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Agar sistem dapat <strong className="text-emerald-700 font-bold">otomatis mengenali & menceklis hijau</strong> pengumpulan soal Anda, beri nama file naskah dengan memuat <strong className="text-slate-900">Nama/Kode Mapel</strong> dan <strong className="text-slate-900">Kelas</strong>:
          </p>

          {/* Examples Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-mono font-bold text-slate-800 truncate">
                  BSA 1A.docx
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyExample('BSA 1A.docx')}
                className="text-[10px] text-slate-500 hover:text-amber-600 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                title="Salin contoh"
              >
                {copiedExample ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="text-xs font-mono font-bold text-slate-800 truncate">
                  MATEMATIKA 4B.docx
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyExample('MATEMATIKA 4B.docx')}
                className="text-[10px] text-slate-500 hover:text-amber-600 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                title="Salin contoh"
              >
                {copiedExample ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 leading-normal pt-1 border-t border-slate-200/80">
            💡 <em>Kode rekomendasi: <strong>BSA</strong> / <strong>B. ARAB</strong> untuk Bahasa Arab, <strong>PAI</strong>, <strong>MTK</strong>, <strong>IPAS</strong>, <strong>PJOK</strong>, dll.</em>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-slate-500 font-medium">
            Membuka otomatis dalam <strong className="text-amber-700 font-bold">{countdown}</strong> detik...
          </span>

          <button
            type="button"
            onClick={handleOpenNow}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <span>Buka Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
