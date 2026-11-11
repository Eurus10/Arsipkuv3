import React, { useState, useEffect } from 'react';
import { X, Save, Globe, ExternalLink, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ExamUploadConfig } from '../types';

interface EditCustomWebLinkModalProps {
  isOpen: boolean;
  config?: ExamUploadConfig;
  onClose: () => void;
  onSave: (updates: Partial<ExamUploadConfig>) => Promise<void>;
}

export const EditCustomWebLinkModal: React.FC<EditCustomWebLinkModalProps> = ({
  isOpen,
  config,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(config?.customWebLinkTitle || 'Tautan Web');
      setSubtitle(config?.customWebLinkSubtitle || 'Akses halaman web eksternal');
      setUrl(config?.customWebLinkUrl || '');
      setEnabled(config?.customWebLinkEnabled ?? true);
      setStatusMsg(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleTestLink = () => {
    if (!url.trim()) {
      alert('Silakan masukkan URL tujuan terlebih dahulu.');
      return;
    }
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    let finalUrl = url.trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      await onSave({
        customWebLinkTitle: title.trim() || 'Tautan Web',
        customWebLinkSubtitle: subtitle.trim() || 'Akses halaman web eksternal',
        customWebLinkUrl: finalUrl,
        customWebLinkEnabled: enabled,
      });

      setStatusMsg({
        type: 'success',
        message: 'Pengaturan tautan web berhasil disimpan dan tersinkronisasi.',
      });

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        message: 'Gagal menyimpan pengaturan: ' + (err?.message || 'Terjadi kesalahan.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn font-sans"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-200">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight leading-snug">
                Pengaturan Tautan Web Eksternal
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Khusus Admin &bull; Sesuaikan tombol navigasi fleksibel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status Visibility Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-800 block">Tampilkan Tombol untuk Guru</span>
              <span className="text-[11px] text-slate-500 block">
                {enabled ? 'Tombol aktif dan terlihat di barisan menu.' : 'Tombol disembunyikan dari tampilan guru.'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Tombol (Judul)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: E-Rapor SDIT / Portal Asesmen"
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all"
              required
            />
          </div>

          {/* Subtitle Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Keterangan Singkat (Subtitle)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Contoh: Akses cepat ke portal e-rapor"
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 outline-none transition-all"
            />
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              URL Web Tujuan
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://erapor.sdit.sch.id"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl pl-10 pr-24 py-2.5 text-xs font-mono text-slate-800 outline-none transition-all"
              />
              <button
                type="button"
                onClick={handleTestLink}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                title="Buka link di tab baru untuk menguji"
              >
                <span>Uji Coba</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Masukkan alamat web lengkap (misal: <code>https://...</code>).
            </p>
          </div>

          {/* Notification Msg */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.message}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-150 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
