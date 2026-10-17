import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Save,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  CharacterDescriptor,
  DEFAULT_CHARACTER_DESCRIPTORS,
} from '../../types/raporSts';
import {
  fetchCharacterDescriptors,
  saveCharacterDescriptors,
} from '../../services/raporCharacterService';

interface CharacterMasterPanelProps {
  showNotification?: (message: string, type?: 'success' | 'info') => void;
}

export const CharacterMasterPanel: React.FC<CharacterMasterPanelProps> = ({
  showNotification,
}) => {
  const [descriptors, setDescriptors] = useState<CharacterDescriptor[]>(DEFAULT_CHARACTER_DESCRIPTORS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchCharacterDescriptors();
        if (isMounted) setDescriptors(data);
      } catch (err) {
        console.error('Failed to load character descriptors:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateName = (id: string, newName: string) => {
    setDescriptors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name: newName } : d))
    );
  };

  const handleUpdateIndicator = (id: string, pred: 'A' | 'B' | 'C' | 'D', text: string) => {
    setDescriptors((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              indicators: {
                ...d.indicators,
                [pred]: text,
              },
            }
          : d
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await saveCharacterDescriptors(descriptors);
      showNotification?.('Master 18 Aspek Karakter & Indikator Predikat berhasil disimpan ke Cloud.', 'success');
    } catch (err) {
      setError('Gagal menyimpan master karakter. Silakan coba kembali.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Kembalikan seluruh 18 karakter dan deskripsi indikator ke standar kurikulum bawaan sekolah?')) {
      setDescriptors(DEFAULT_CHARACTER_DESCRIPTORS);
      showNotification?.('Karakter dikembalikan ke format standar bawaan.', 'info');
    }
  };

  const filteredList = descriptors.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      Object.values(d.indicators).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Panel Header */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0 shadow-xs">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-heading">
              Master 18 Karakter & Indikator Predikat (Lembar 2 Rapor)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola rumusan narasi capaian per predikat (A, B, C, D) yang ter-generate otomatis saat guru memilih predikat karakter siswa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading || isSaving}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Bawaan</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-700/20 disabled:opacity-40 active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Karakter'}</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 flex items-start gap-2.5 text-xs text-rose-800 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Statistics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari karakter atau rumusan indikator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 font-medium shadow-xs">
            Total <strong className="text-slate-900 font-bold">{descriptors.length}</strong> Aspek Karakter
          </span>
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === 'all' ? null : 'all')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 font-semibold cursor-pointer shadow-xs transition-colors"
          >
            {expandedId === 'all' ? 'Tutup Semua' : 'Buka Semua'}
          </button>
        </div>
      </div>

      {/* Character Cards List */}
      <div className="space-y-3.5">
        {filteredList.map((desc, idx) => {
          const isExpanded =
            expandedId === 'all' || expandedId === desc.id || (filteredList.length <= 2 && expandedId !== 'none');

          return (
            <div
              key={desc.id}
              className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs transition-all"
            >
              {/* Card Header Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? 'none' : desc.id)}
                className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 select-none transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                      {desc.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      4 Indikator Predikat (A, B, C, D) terdefinisi
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono">
                    ID: {desc.id}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Card Body: Indicators Editor */}
              {isExpanded && (
                <div className="p-4 pt-3 border-t border-slate-200 bg-slate-50/50 space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      Nama Aspek Karakter:
                    </label>
                    <input
                      type="text"
                      value={desc.name}
                      onChange={(e) => handleUpdateName(desc.id, e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold text-xs focus:outline-none focus:border-emerald-500 shadow-xs"
                    />
                  </div>

                  {/* 4 Predicates Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* [A] Sangat Baik */}
                    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-emerald-200 text-emerald-900 inline-flex items-center justify-center text-[10px] font-black">A</span>
                          <span>Predikat A — Sangat Baik</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Budaya Konsisten</span>
                      </div>
                      <textarea
                        rows={3}
                        value={desc.indicators.A}
                        onChange={(e) => handleUpdateIndicator(desc.id, 'A', e.target.value)}
                        className="w-full bg-white border border-emerald-300 p-2.5 rounded-lg text-slate-900 text-xs leading-relaxed focus:outline-none focus:border-emerald-500 resize-none shadow-xs"
                      />
                    </div>

                    {/* [B] Baik */}
                    <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/40 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-sky-200 text-sky-900 inline-flex items-center justify-center text-[10px] font-black">B</span>
                          <span>Predikat B — Baik</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Terbiasa Mandiri</span>
                      </div>
                      <textarea
                        rows={3}
                        value={desc.indicators.B}
                        onChange={(e) => handleUpdateIndicator(desc.id, 'B', e.target.value)}
                        className="w-full bg-white border border-sky-300 p-2.5 rounded-lg text-slate-900 text-xs leading-relaxed focus:outline-none focus:border-sky-500 resize-none shadow-xs"
                      />
                    </div>

                    {/* [C] Cukup */}
                    <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-amber-200 text-amber-900 inline-flex items-center justify-center text-[10px] font-black">C</span>
                          <span>Predikat C — Cukup</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Perlu Pengingat</span>
                      </div>
                      <textarea
                        rows={3}
                        value={desc.indicators.C}
                        onChange={(e) => handleUpdateIndicator(desc.id, 'C', e.target.value)}
                        className="w-full bg-white border border-amber-300 p-2.5 rounded-lg text-slate-900 text-xs leading-relaxed focus:outline-none focus:border-amber-500 resize-none shadow-xs"
                      />
                    </div>

                    {/* [D] Perlu Bimbingan */}
                    <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-rose-200 text-rose-900 inline-flex items-center justify-center text-[10px] font-black">D</span>
                          <span>Predikat D — Perlu Bimbingan</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Bimbingan Khusus</span>
                      </div>
                      <textarea
                        rows={3}
                        value={desc.indicators.D}
                        onChange={(e) => handleUpdateIndicator(desc.id, 'D', e.target.value)}
                        className="w-full bg-white border border-rose-300 p-2.5 rounded-lg text-slate-900 text-xs leading-relaxed focus:outline-none focus:border-rose-500 resize-none shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Save Bar */}
      <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex items-center justify-between gap-4">
        <span className="text-xs text-slate-500">
          Perubahan indikator akan langsung berlaku otomatis saat guru/wali kelas membuka menu Penilaian Karakter.
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-700/20 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Perubahan Karakter</span>
        </button>
      </div>
    </div>
  );
};

export default CharacterMasterPanel;
