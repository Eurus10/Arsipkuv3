import React, { useState, useEffect } from 'react';
import { X, Save, ExternalLink, Link as LinkIcon, FileSpreadsheet, LayoutTemplate, GraduationCap } from 'lucide-react';
import { SchoolTemplateItem } from '../types';
import { sanitizeDriveUrl, isValidUrl } from '../utils/driveHelpers';

interface EditTemplateModalProps {
  isOpen: boolean;
  template: SchoolTemplateItem | null;
  onClose: () => void;
  onSave: (templateId: string, updates: Partial<SchoolTemplateItem>) => Promise<void>;
}

export const EditTemplateModal: React.FC<EditTemplateModalProps> = ({
  isOpen,
  template,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileFormat, setFileFormat] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setTitle(template.title || '');
      setDescription(template.description || '');
      setFileFormat(template.fileFormat || 'Excel (.xlsx)');
      setDriveUrl(template.driveUrl || '');
      setErrorMsg(null);
    }
  }, [template, isOpen]);

  if (!isOpen || !template) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Nama template tidak boleh kosong.');
      return;
    }
    if (!driveUrl.trim() || !isValidUrl(driveUrl)) {
      setErrorMsg('Masukkan tautan Google Drive / Docs / Sheets yang valid.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      await onSave(template.id, {
        title: title.trim(),
        description: description.trim(),
        fileFormat: fileFormat.trim(),
        driveUrl: sanitizeDriveUrl(driveUrl),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg('Gagal menyimpan link template: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSaving(false);
    }
  };

  const getTemplateIcon = () => {
    switch (template.category as string) {
      case 'analisis_soal':
        return <FileSpreadsheet className="w-5 h-5 text-cyan-400" />;
      case 'rapor':
        return <GraduationCap className="w-5 h-5 text-amber-400" />;
      case 'kop_soal':
      default:
        return <LayoutTemplate className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        id="modal-edit-template"
        className="w-full max-w-lg bg-[#181B26] border border-[#2B3245] rounded-3xl p-6 sm:p-7 shadow-2xl relative text-slate-100"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#252B3B] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#24293A]">
          <div className="w-10 h-10 rounded-2xl bg-[#12141D] border border-[#2B3245] flex items-center justify-center flex-shrink-0 shadow-inner">
            {getTemplateIcon()}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white font-heading">
              Edit Link Unduhan Template
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ubah tautan file template Google Docs/Sheets/Drive untuk guru
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Judul Template <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Deskripsi Singkat
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Format analisis butir soal & kisi-kisi asesmen"
              className="w-full px-3.5 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Format File
              </label>
              <input
                type="text"
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value)}
                placeholder="Contoh: Excel (.xlsx) / Word (.docx)"
                className="w-full px-3.5 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kategori
              </label>
              <input
                type="text"
                disabled
                value={template.category.replace('_', ' ').toUpperCase()}
                className="w-full px-3.5 py-2.5 bg-[#12141D]/60 border border-[#272D3E] rounded-xl text-sm text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tautan Google Drive / Docs / Sheets <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="url"
                required
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="w-full pl-10 pr-4 py-2.5 bg-[#12141D] border border-[#272D3E] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all font-mono text-xs"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Pastikan akses Google Drive / Docs diatur ke <em>"Siapa saja yang memiliki link dapat melihat/mengunduh"</em>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
