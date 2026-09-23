import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Type, RotateCcw, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { AppBranding, DEFAULT_BRANDING, processLogoImage, updateStoredBranding } from '../../services/brandingStorage';

interface AdminLogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBranding: AppBranding;
  onBrandingUpdated: (newBranding: AppBranding) => void;
  showNotification?: (message: string, type?: 'success' | 'info') => void;
}

export const AdminLogoManagerModal: React.FC<AdminLogoManagerModalProps> = ({
  isOpen,
  onClose,
  currentBranding,
  onBrandingUpdated,
  showNotification,
}) => {
  const [logoType, setLogoType] = useState<'text' | 'image'>(currentBranding.logoType || 'text');
  const [logoText, setLogoText] = useState<string>(currentBranding.logoText || 'AF');
  const [logoImageUrl, setLogoImageUrl] = useState<string>(currentBranding.logoImageUrl || '');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const compressedDataUrl = await processLogoImage(file);
      setLogoImageUrl(compressedDataUrl);
      setLogoType('image');
      if (showNotification) showNotification('Gambar logo berhasil dimuat. Klik Simpan untuk menerapkan.', 'info');
    } catch (err: any) {
      alert(err.message || 'Gagal memproses file gambar logo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (logoType === 'text' && !logoText.trim()) {
        alert('Inisial teks logo tidak boleh kosong.');
        return;
      }
      if (logoType === 'image' && !logoImageUrl) {
        alert('Silakan unggah gambar logo terlebih dahulu.');
        return;
      }

      const updated: AppBranding = {
        logoType,
        logoText: logoText.trim().toUpperCase().slice(0, 4) || 'AF',
        logoImageUrl: logoType === 'image' ? logoImageUrl : '',
      };

      await updateStoredBranding(updated);
      onBrandingUpdated(updated);
      if (showNotification) showNotification('Logo aplikasi berhasil diperbarui!', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to save branding:', err);
      alert('Gagal menyimpan logo. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = async () => {
    if (window.confirm('Kembalikan logo aplikasi ke tampilan inisial default "AF"?')) {
      try {
        setIsSaving(true);
        await updateStoredBranding(DEFAULT_BRANDING);
        setLogoType('text');
        setLogoText('AF');
        setLogoImageUrl('');
        onBrandingUpdated(DEFAULT_BRANDING);
        if (showNotification) showNotification('Logo dikembalikan ke standar default AF.', 'info');
        onClose();
      } catch (err) {
        console.error('Reset branding failed:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#161822] border border-[#2B3144] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#1B1E2D] border-b border-[#2B3144] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-teal-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Pengaturan Logo Aplikasi</h3>
              <p className="text-xs text-slate-400">Ganti logo "AF" dengan logo sekolah atau inisial kustom</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#23283A] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Option Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Pilih Tipe Logo
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-[#10121A] border border-[#23283A] rounded-2xl">
              <button
                type="button"
                onClick={() => setLogoType('image')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  logoType === 'image'
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Unggah Gambar Logo</span>
              </button>
              <button
                type="button"
                onClick={() => setLogoType('text')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  logoType === 'text'
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Inisial Teks Kustom</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Image Upload */}
          {logoType === 'image' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-300">
                Unggah File Gambar Logo Sekolah (PNG, JPG, SVG, WebP)
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  dragActive
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-[#2B3144] hover:border-amber-400/50 bg-[#12141E]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {logoImageUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-20 h-20 rounded-2xl p-2 bg-[#1A1D2B] border border-[#323950] flex items-center justify-center shadow-lg overflow-hidden">
                      <img src={logoImageUrl} alt="Pratinjau Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                    <span className="text-xs text-amber-400 font-medium">Klik atau seret gambar baru untuk mengganti</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-[#1D2132] border border-[#2E354A] flex items-center justify-center text-amber-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Klik untuk memilih berkas gambar logo</p>
                      <p className="text-[11px] text-slate-400 mt-1">Atau seret dan lepas file gambar ke area ini</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider bg-[#1A1D2B] px-2.5 py-1 rounded-full border border-[#2A3044]">
                      Rasio 1:1 Transparan Direkomendasikan
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Mode 2: Text Initials */}
          {logoType === 'text' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Inisial Teks Singkatan (Maksimal 3-4 Karakter)
              </label>
              <input
                type="text"
                value={logoText}
                onChange={(e) => setLogoText(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="Contoh: AF / SD / AL"
                className="w-full bg-[#10121A] border border-[#282E42] focus:border-amber-400 text-amber-400 text-lg font-black tracking-widest uppercase px-4 py-3 rounded-2xl outline-none transition-colors"
              />
              <p className="text-[11px] text-slate-400">
                Teks inisial akan ditampilkan dalam kotak gradien hijau-teal khas aplikasi jika gambar logo tidak digunakan.
              </p>
            </div>
          )}

          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-[#10121A] border border-[#23283A] space-y-3">
            <div className="flex items-center justify-between border-b border-[#202536] pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Pratinjau Tampilan Realtime
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Aktif
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center pt-1">
              {/* Desktop Sidebar Preview */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-[#161822] border border-[#23283A]">
                <span className="text-[10px] text-slate-400 mb-2">Tampilan Sidebar (Desktop)</span>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 overflow-hidden p-1">
                  {logoType === 'image' && logoImageUrl ? (
                    <img src={logoImageUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span>{logoText || 'AF'}</span>
                  )}
                </div>
              </div>

              {/* Mobile Header Preview */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-[#161822] border border-[#23283A]">
                <span className="text-[10px] text-slate-400 mb-2">Tampilan Header (Mobile)</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md overflow-hidden p-0.5">
                    {logoType === 'image' && logoImageUrl ? (
                      <img src={logoImageUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span>{logoText || 'AF'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-none">Arsip Digital</span>
                    <span className="text-[9px] text-slate-400 font-semibold">SDIT AL FIKRI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#1B1E2D] border-t border-[#2B3144] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefault}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#12141E] hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-[#282E42] hover:border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default AF</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#23283A] text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isUploading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Logo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
