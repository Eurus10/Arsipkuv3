import React, { useState, useRef } from 'react';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Edit3,
  Upload,
  User,
  Heart,
  Coffee,
  X,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Trash2,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import {
  AppBranding,
  DEFAULT_BRANDING,
  processLogoImage,
  processBannerImage,
  processQrisImage,
  updateStoredBranding,
} from '../services/brandingStorage';

interface PersonalQrisModalProps {
  isOpen: boolean;
  onClose: () => void;
  branding?: AppBranding;
  onBrandingUpdated?: (newBranding: AppBranding) => void;
  defaultTab?: 'view' | 'edit';
  isAdmin?: boolean;
}

export const PersonalQrisModal: React.FC<PersonalQrisModalProps> = ({
  isOpen,
  onClose,
  branding = DEFAULT_BRANDING,
  onBrandingUpdated,
  defaultTab = 'view',
  isAdmin = false,
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>(isAdmin ? defaultTab : 'view');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit Form State
  const [formData, setFormData] = useState<Partial<AppBranding>>({
    personalName: branding.personalName || DEFAULT_BRANDING.personalName,
    personalRole: branding.personalRole || DEFAULT_BRANDING.personalRole,
    personalAvatarUrl: branding.personalAvatarUrl || '',
    personalEmail: branding.personalEmail || DEFAULT_BRANDING.personalEmail,
    personalQrisImageUrl: branding.personalQrisImageUrl || '',
    personalQrisMerchantName:
      branding.personalQrisMerchantName || DEFAULT_BRANDING.personalQrisMerchantName,
    personalQrisNmid: branding.personalQrisNmid || DEFAULT_BRANDING.personalQrisNmid,
    personalQrisBankName: branding.personalQrisBankName || DEFAULT_BRANDING.personalQrisBankName,
    personalQrisAccountNumber: branding.personalQrisAccountNumber || '',
    personalQrisDescription:
      branding.personalQrisDescription || DEFAULT_BRANDING.personalQrisDescription,
    headerBgImageUrl: branding.headerBgImageUrl || DEFAULT_BRANDING.headerBgImageUrl,
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const qrisInputRef = useRef<HTMLInputElement>(null);
  const headerBgInputRef = useRef<HTMLInputElement>(null);
  const qrisCardRef = useRef<HTMLDivElement>(null);

  // Sync formData when branding prop updates or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        personalName: branding.personalName || DEFAULT_BRANDING.personalName,
        personalRole: branding.personalRole || DEFAULT_BRANDING.personalRole,
        personalAvatarUrl: branding.personalAvatarUrl || '',
        personalEmail: branding.personalEmail || DEFAULT_BRANDING.personalEmail,
        personalQrisImageUrl: branding.personalQrisImageUrl || '',
        personalQrisMerchantName:
          branding.personalQrisMerchantName || DEFAULT_BRANDING.personalQrisMerchantName,
        personalQrisNmid: branding.personalQrisNmid || DEFAULT_BRANDING.personalQrisNmid,
        personalQrisBankName: branding.personalQrisBankName || DEFAULT_BRANDING.personalQrisBankName,
        personalQrisAccountNumber: branding.personalQrisAccountNumber || '',
        personalQrisDescription:
          branding.personalQrisDescription || DEFAULT_BRANDING.personalQrisDescription,
        headerBgImageUrl: branding.headerBgImageUrl || DEFAULT_BRANDING.headerBgImageUrl,
      });
      setActiveTab(isAdmin ? defaultTab : 'view');
      setSaveSuccess(false);
    }
  }, [isOpen, branding, defaultTab, isAdmin]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processLogoImage(file);
      setFormData((prev) => ({ ...prev, personalAvatarUrl: dataUrl }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal memproses gambar avatar.');
    }
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processQrisImage(file);
      setFormData((prev) => ({ ...prev, personalQrisImageUrl: dataUrl }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal memproses gambar QRIS.');
    }
  };

  const handleHeaderBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processBannerImage(file);
      setFormData((prev) => ({ ...prev, headerBgImageUrl: dataUrl }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal memproses foto banner.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated: AppBranding = {
        ...branding,
        personalName: formData.personalName?.trim() || DEFAULT_BRANDING.personalName,
        personalRole: formData.personalRole?.trim() || DEFAULT_BRANDING.personalRole,
        personalAvatarUrl: formData.personalAvatarUrl || '',
        personalEmail: formData.personalEmail?.trim() || DEFAULT_BRANDING.personalEmail,
        personalQrisImageUrl: formData.personalQrisImageUrl || '',
        personalQrisMerchantName:
          formData.personalQrisMerchantName?.trim() || DEFAULT_BRANDING.personalQrisMerchantName,
        personalQrisNmid:
          formData.personalQrisNmid?.trim() || DEFAULT_BRANDING.personalQrisNmid,
        personalQrisBankName:
          formData.personalQrisBankName?.trim() || DEFAULT_BRANDING.personalQrisBankName,
        personalQrisAccountNumber: formData.personalQrisAccountNumber?.trim() || '',
        personalQrisDescription:
          formData.personalQrisDescription?.trim() || DEFAULT_BRANDING.personalQrisDescription,
        headerBgImageUrl:
          formData.headerBgImageUrl || DEFAULT_BRANDING.headerBgImageUrl,
      };

      await updateStoredBranding(updated);
      if (onBrandingUpdated) {
        onBrandingUpdated(updated);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab('view');
      }, 1000);
    } catch (err) {
      console.error('Failed to save personal profile/QRIS:', err);
      alert('Gagal menyimpan perubahan. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadQris = () => {
    if (formData.personalQrisImageUrl) {
      const link = document.createElement('a');
      link.href = formData.personalQrisImageUrl;
      link.download = `QRIS-Pribadi-${(formData.personalName || 'Personal').replace(/\s+/g, '-')}.png`;
      link.click();
    } else {
      alert('Silakan upload gambar QRIS asli Anda pada menu "Edit QRIS & Profil" untuk mengunduh versi gambar cetak.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-[440px] bg-gradient-to-b from-[#161B29] via-[#121622] to-[#0D101A] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-20 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 px-4 sm:px-5 pt-3.5 pb-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-md shadow-emerald-500/20 text-slate-950">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">QRIS & Profil Personal</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Dukungan
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pindai QRIS untuk memberikan dukungan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Selector (Hanya Muncul untuk Akun Admin) */}
        {isAdmin && (
          <div className="relative z-10 px-4 sm:px-5 pt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 w-full">
              <button
                type="button"
                onClick={() => setActiveTab('view')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'view'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Tampilan QRIS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit QRIS & Profil</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: VIEW QRIS CARD */}
        {activeTab === 'view' && (
          <div className="relative z-10 p-3 sm:p-4 space-y-2.5">
            {/* The QRIS Display - Full Image Focus without Redundant Outer Headers */}
            <div
              ref={qrisCardRef}
              className="bg-white rounded-2xl p-1.5 sm:p-2 text-slate-900 shadow-xl border border-slate-200/90 flex flex-col items-center justify-center relative overflow-hidden w-full"
            >
              {formData.personalQrisImageUrl ? (
                <img
                  src={formData.personalQrisImageUrl}
                  alt="QRIS Pribadi"
                  className="w-full h-auto max-h-[58vh] object-contain rounded-xl block shadow-sm"
                />
              ) : (
                /* High Fidelity Realistic QRIS SVG Placeholder */
                <div className="w-full py-8 flex flex-col items-center justify-center text-center p-4">
                  <svg viewBox="0 0 100 100" className="w-48 h-48 text-slate-900 fill-current">
                    {/* Standard 3 Position Markers */}
                    <rect x="5" y="5" width="28" height="28" fill="#111827" rx="3" />
                    <rect x="10" y="10" width="18" height="18" fill="#ffffff" rx="2" />
                    <rect x="14" y="14" width="10" height="10" fill="#111827" rx="1.5" />

                    <rect x="67" y="5" width="28" height="28" fill="#111827" rx="3" />
                    <rect x="72" y="10" width="18" height="18" fill="#ffffff" rx="2" />
                    <rect x="76" y="14" width="10" height="10" fill="#111827" rx="1.5" />

                    <rect x="5" y="67" width="28" height="28" fill="#111827" rx="3" />
                    <rect x="10" y="72" width="18" height="18" fill="#ffffff" rx="2" />
                    <rect x="14" y="76" width="10" height="10" fill="#111827" rx="1.5" />

                    {/* Data Pattern Modules */}
                    <rect x="38" y="8" width="5" height="5" />
                    <rect x="48" y="8" width="5" height="5" />
                    <rect x="58" y="8" width="5" height="5" />
                    <rect x="38" y="18" width="5" height="5" />
                    <rect x="48" y="24" width="5" height="5" />
                    <rect x="58" y="18" width="5" height="5" />
                    <rect x="8" y="38" width="5" height="5" />
                    <rect x="18" y="38" width="5" height="5" />
                    <rect x="28" y="38" width="5" height="5" />
                    <rect x="8" y="48" width="5" height="5" />
                    <rect x="18" y="58" width="5" height="5" />
                    <rect x="38" y="38" width="24" height="24" fill="#059669" rx="4" />
                    <circle cx="50" cy="50" r="7" fill="#ffffff" />
                    <rect x="68" y="38" width="6" height="6" />
                    <rect x="78" y="48" width="6" height="6" />
                    <rect x="88" y="38" width="6" height="6" />
                    <rect x="38" y="68" width="6" height="6" />
                    <rect x="48" y="78" width="6" height="6" />
                    <rect x="58" y="68" width="6" height="6" />
                    <rect x="68" y="68" width="8" height="8" />
                    <rect x="82" y="82" width="8" height="8" />
                    <rect x="82" y="68" width="8" height="8" />
                    <rect x="68" y="82" width="8" height="8" />
                  </svg>
                  <span className="text-[10px] font-bold text-emerald-700 mt-2">
                    {isAdmin
                      ? "(Klik 'Ganti QRIS' untuk unggah barcode asli)"
                      : 'Kode QRIS Resmi'}
                  </span>
                </div>
              )}
            </div>

            {/* Optional Direct Account Number / E-Wallet Info */}
            {formData.personalQrisAccountNumber && (
              <div className="p-2.5 rounded-xl bg-[#141A29] border border-slate-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400">
                      {formData.personalQrisBankName || 'Transfer Manual'}:
                    </p>
                    <p className="text-xs font-black text-white tracking-wider truncate font-mono">
                      {formData.personalQrisAccountNumber}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(formData.personalQrisAccountNumber || '', 'account_no')
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {copiedField === 'account_no' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadQris}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unduh Gambar QRIS</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Ganti QRIS & Foto</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EDIT QRIS & PROFILE (HANYA UNTUK ADMIN) */}
        {isAdmin && activeTab === 'edit' && (
          <form onSubmit={handleSave} className="relative z-10 p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4" /> Perubahan berhasil disimpan!
              </div>
            )}

            {/* Profile Section */}
            <div className="space-y-3 pb-4 border-b border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Informasi Identitas Pribadi
              </h4>

              {/* Avatar Uploader */}
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-full bg-slate-800 border-2 border-emerald-500/40 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                  {formData.personalAvatarUrl ? (
                    <img
                      src={formData.personalAvatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Unggah Foto Profil</span>
                    </button>
                    {formData.personalAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, personalAvatarUrl: '' }))}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 cursor-pointer"
                        title="Hapus Foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Akan tampil pada logo avatar di pojok kanan atas.
                  </p>
                </div>
              </div>

              {/* Name & Role Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nama Pribadi / Inisiator
                  </label>
                  <input
                    type="text"
                    value={formData.personalName || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, personalName: e.target.value }))
                    }
                    placeholder="Nama Lengkap / Panggilan"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Peran / Status
                  </label>
                  <input
                    type="text"
                    value={formData.personalRole || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, personalRole: e.target.value }))
                    }
                    placeholder="Contoh: Pengembang / Guru"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* QRIS Configuration Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" /> Konfigurasi QRIS Pribadi
              </h4>

              {/* QRIS Image Upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Gambar Barcode QRIS Asli (PNG/JPG)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-300 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {formData.personalQrisImageUrl ? (
                      <img
                        src={formData.personalQrisImageUrl}
                        alt="Preview QRIS"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <QrCode className="w-8 h-8 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      type="file"
                      ref={qrisInputRef}
                      onChange={handleQrisUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => qrisInputRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih Gambar QRIS</span>
                      </button>
                      {formData.personalQrisImageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, personalQrisImageUrl: '' }))
                          }
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 cursor-pointer"
                          title="Hapus QRIS"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Upload tangkapan layar/file QRIS m-banking atau e-wallet Anda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Merchant / NMID Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nama Merchant / Pemilik
                  </label>
                  <input
                    type="text"
                    value={formData.personalQrisMerchantName || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        personalQrisMerchantName: e.target.value,
                      }))
                    }
                    placeholder="DUKUNGAN PENGEMBANG"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    NMID / Kode QRIS
                  </label>
                  <input
                    type="text"
                    value={formData.personalQrisNmid || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, personalQrisNmid: e.target.value }))
                    }
                    placeholder="ID1020304050607"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Manual Bank/E-Wallet Option */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nama Bank / E-Wallet (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.personalQrisBankName || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, personalQrisBankName: e.target.value }))
                    }
                    placeholder="BSI / DANA / BCA / Mandiri"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nomor Rekening / No HP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.personalQrisAccountNumber || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        personalQrisAccountNumber: e.target.value,
                      }))
                    }
                    placeholder="08123456789 atau 7123456789"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Support Description Note */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Pesan / Catatan Apresiasi
                </label>
                <textarea
                  rows={2}
                  value={formData.personalQrisDescription || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      personalQrisDescription: e.target.value,
                    }))
                  }
                  placeholder="Pesan terima kasih atas dukungan..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            {/* Dashboard Header Banner Background Photo Section */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> Foto Latar Belakang Banner "Portal Arsip & AI"
              </h4>

              <div className="space-y-2">
                <input
                  type="file"
                  ref={headerBgInputRef}
                  onChange={handleHeaderBgUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* Banner Preview */}
                <div className="relative w-full h-24 sm:h-28 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner group">
                  <img
                    src={formData.headerBgImageUrl || DEFAULT_BRANDING.headerBgImageUrl}
                    alt="Banner Preview"
                    className="w-full h-full object-cover object-center brightness-75 group-hover:brightness-90 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent flex items-center p-3 sm:p-4 pointer-events-none">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                        Pratinjau Banner
                      </span>
                      <h5 className="text-xs sm:text-sm font-extrabold text-white leading-tight">
                        Portal Arsip & AI Assistant Guru
                      </h5>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => headerBgInputRef.current?.click()}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ganti Foto Banner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        headerBgImageUrl: DEFAULT_BRANDING.headerBgImageUrl,
                      }))
                    }
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Gunakan Foto Template Asli"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Foto Default Template</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Foto ini akan menjadi latar belakang judul utama dashboard dengan efek overlay gelap transparan sehingga teks tetap jelas dan tajam di komputer maupun ponsel.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('view')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan QRIS & Profil'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
