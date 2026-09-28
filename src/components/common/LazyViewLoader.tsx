import React from 'react';
import { Loader2 } from 'lucide-react';

interface LazyViewLoaderProps {
  label?: string;
  minHeight?: string;
}

export const LazyViewLoader: React.FC<LazyViewLoaderProps> = ({
  label = 'Memuat modul...',
  minHeight = 'min-h-[400px]',
}) => {
  return (
    <div
      className={`w-full ${minHeight} flex flex-col items-center justify-center p-8 text-center animate-fade-in`}
    >
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 blur-lg animate-pulse" />
      </div>
      <p className="text-xs sm:text-sm font-semibold text-slate-300 tracking-wide">
        {label}
      </p>
      <p className="text-[11px] text-slate-500 mt-1">
        Mengoptimalkan performa halaman...
      </p>
    </div>
  );
};

export const LazyModalLoader: React.FC<{ title?: string }> = ({
  title = 'Memuat Generator...',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181B26] border border-[#272D3E] rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
        <p className="text-xs text-slate-400">Menyiapkan lembar kerja...</p>
      </div>
    </div>
  );
};
