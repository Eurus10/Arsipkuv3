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
      <section className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-sky-500/15 border border-sky-400/25 text-sky-300 flex items-center justify-center shrink-0 shadow-inner">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              Master 18 Karakter & Indikator Predikat (Lembar 2 Rapor)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola rumusan narasi capaian per predikat (A, B, C, D) yang ter-generate otomatis saat guru memilih predikat karakter siswa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading || isSaving}
            className="px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Bawaan</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-sky-500/20 disabled:opacity-40 active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Karakter'}</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-2.5 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Statistics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari karakter atau rumusan indikator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-white/[0.08] bg-slate-950/70 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/25"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl border border-white/[0.08] bg-slate-950/60 text-xs text-slate-400 font-medium">
            Total <strong className="text-white">{descriptors.length}</strong> Aspek Karakter
          </span>
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === 'all' ? null : 'all')}
            className="px-3 py-1.5 rounded-xl border border-white/[0.08] bg-slate-950/60 hover:bg-white/[0.05] text-xs text-slate-300 font-semibold cursor-pointer"
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
              className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl overflow-hidden shadow-lg transition-all"
            >
              {/* Card Header Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? 'none' : desc.id)}
                className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/25 text-sky-300 font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white tracking-wide truncate">
                      {desc.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      4 Indikator Predikat (A, B, C, D) terdefinisi
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block text-[10px] text-slate-500 font-mono">
                    ID: {desc.id}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Card Body: Indicators Editor */}
              {isExpanded && (
                <div className="p-4 pt-2 border-t border-white/[0.06] bg-slate-900/30 space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                      Nama Aspek Karakter:
                    </label>
                    <input
                      type="text"
                      value={desc.name}
                      onChange={(e) => handleUpdateName(desc.id, e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-white/[0.10] bg-slate-950 text-white font-semibold text-xs focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {/* 4 Predicates Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* [A] Sangat Baik */}
                    <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-950/15 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-300 inline-flex items-center justify-center text-[10px]">A</span>
                          <span>Predikat A — Sangat Baik</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Budaya Konsisten</span>
                      </div>
                      <textarea
                        rows={3}
                        value={desc.indicators.A}
                        onChange={(e) => handleUpdateIndicator(desc.id, 'A', e.target.value)}
                        className="w-full bg-slate-950 border border-emerald-500/20 p-2.5 rounded-lg text-white text-xs leading-relaxed focus:outline-none focus:border-emerald-400 resize-none custom-scrollbar"
                      />
                    </div>

                    {/* [B] Baik */}
                    <div className="p-3.5 rounded-xl border border-sky-500/25 bg-sky-950/15 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-sky-500/20 text-sky-300 inline-flex items-center justify-center text-[10px]">B</span>
                          <span>Predikat B — Baik</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Terbiasa Mandiri</span>
                      </div>
                      <textarea
                        rows={3}
                        value={desc.indicators.B}
                        onChange={(e) => handleUpdateIndicator(desc.id, 'B', e.target.value)}
                        className="w-full bg-slate-950 border border-sky-500/20 p-2.5 rounded-lg text-white text-xs leading-relaxed focus:outline-none focus:border-sky-400 resize-none custom-scrollbar"
                      />
                    </div>

                    {/* [C] Cukup */}
                    <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-950/15 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-300 inline-flex items-center justify-center text-[10px]">C</span>
                          <span>Predikat C — Cukup</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Perlu Pengingat</span>
                      </div>
                      <textarea
                        rows={3}
                        value={desc.indicators.C}
                        onChange={(e) => handleUpdateIndicator(desc.id, 'C', e.target.value)}
                        className="w-full bg-slate-950 border border-amber-500/20 p-2.5 rounded-lg text-white text-xs leading-relaxed focus:outline-none focus:border-amber-400 resize-none custom-scrollbar"
                      />
                    </div>

                    {/* [D] Perlu Bimbingan */}
                    <div className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-950/15 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-rose-500/20 text-rose-300 inline-flex items-center justify-center text-[10px]">D</span>
                          <span>Predikat D — Perlu Bimbingan</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Bimbingan Khusus</span>
                      </div>
                      <textarea
                        rows={3}
                        value={desc.indicators.D}
                        onChange={(e) => handleUpdateIndicator(desc.id, 'D', e.target.value)}
                        className="w-full bg-slate-950 border border-rose-500/20 p-2.5 rounded-lg text-white text-xs leading-relaxed focus:outline-none focus:border-rose-400 resize-none custom-scrollbar"
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
      <div className="p-4 rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl flex items-center justify-between gap-4">
        <span className="text-xs text-slate-400">
          Perubahan indikator akan langsung berlaku otomatis saat guru/wali kelas membuka menu Penilaian Karakter.
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Master 18 Karakter'}</span>
        </button>
      </div>
    </div>
  );
};

export default CharacterMasterPanel;
