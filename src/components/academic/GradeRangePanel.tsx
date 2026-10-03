import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import {
  GradeRangeConfig,
  DEFAULT_GRADE_RANGE_CONFIG,
  fetchGradeRangeConfig,
  saveGradeRangeConfig,
  calculateScorePredicate,
  calculateMasteryLabel,
} from '../../services/academicGradeRangeService';

interface GradeRangePanelProps {
  showNotification?: (message: string, type?: 'success' | 'info') => void;
}

export const GradeRangePanel: React.FC<GradeRangePanelProps> = ({
  showNotification,
}) => {
  const [config, setConfig] = useState<GradeRangeConfig>(DEFAULT_GRADE_RANGE_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testScore, setTestScore] = useState<number | ''>(85);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchGradeRangeConfig();
        if (isMounted) setConfig(data);
      } catch (err) {
        console.error('Failed to load grade range config:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleKktpChange = (val: number) => {
    setConfig((prev) => ({
      ...prev,
      passingGrade: val,
      minC: val, // C minimum defaults to passing grade
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (config.minA <= config.minB) {
      setError('Nilai minimal Predikat A harus lebih besar dari Predikat B.');
      return;
    }
    if (config.minB <= config.minC) {
      setError('Nilai minimal Predikat B harus lebih besar dari Predikat C.');
      return;
    }
    if (config.minC < 0 || config.minA > 100) {
      setError('Nilai rentang harus berada dalam batas 0 s/d 100.');
      return;
    }

    setIsSaving(true);
    try {
      await saveGradeRangeConfig(config);
      showNotification?.('Standar Rentang Predikat & KKTP berhasil disimpan ke Cloud.', 'success');
    } catch (err) {
      setError('Gagal menyimpan pengaturan rentang predikat. Silakan coba kembali.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Kembalikan seluruh batas rentang predikat ke standar bawaan sekolah (A: ≥91, B: ≥81, C: ≥75, D: <75)?')) {
      setConfig(DEFAULT_GRADE_RANGE_CONFIG);
      showNotification?.('Rentang predikat dikembalikan ke standar bawaan.', 'info');
    }
  };

  // Live simulation test
  const simulatedPredicate =
    testScore === '' ? '-' : calculateScorePredicate(Number(testScore), config);
  const simulatedMastery =
    testScore === '' ? '-' : calculateMasteryLabel(simulatedPredicate, config);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Panel Header */}
      <section className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-cyan-500/15 border border-cyan-400/25 text-cyan-300 flex items-center justify-center shrink-0 shadow-inner">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              Standar Rentang Predikat & KKTP Akademik
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Atur ambang batas interval nilai angka ke huruf (A, B, C, D) dan 4 kategori status penguasaan materi untuk Rapor STS
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
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-40 active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Rentang'}</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-2.5 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 Cols): Configuration Form & Interval Table */}
        <div className="lg:col-span-8 space-y-5">
          <form onSubmit={handleSave} className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-2xl p-5 shadow-2xl space-y-5">
            {/* KKTP Passing Grade Input */}
            <div className="bg-slate-900/60 border border-white/[0.07] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Kriteria Ketercapaian Tujuan Pembelajaran (KKTP / KKM)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Nilai tuntas minimal sekolah dasar. Nilai di bawah KKTP secara otomatis menjadi Predikat D (Perlu Bimbingan).
                  </p>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min="50"
                    max="90"
                    value={config.passingGrade}
                    onChange={(e) => handleKktpChange(parseInt(e.target.value, 10) || 75)}
                    className="w-full h-10 px-3 rounded-xl border border-amber-400/40 bg-slate-950 text-amber-300 font-black text-center text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>
              </div>
            </div>

            {/* 4 Predicates Interval Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Ambang Batas Minimum per Predikat
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Predikat A */}
                <div className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-950/15 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Predikat A
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Maksimal 100</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Nilai Minimal:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="70"
                        max="100"
                        value={config.minA}
                        onChange={(e) => setConfig({ ...config, minA: parseInt(e.target.value, 10) || 91 })}
                        className="w-24 h-9 px-3 rounded-lg border border-emerald-500/30 bg-slate-950 text-white font-bold text-center text-xs focus:outline-none focus:border-emerald-400"
                      />
                      <span className="text-xs text-slate-400">s/d 100</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-medium text-slate-400">Label Status Penguasaan:</label>
                    <input
                      type="text"
                      value={config.labels.A}
                      onChange={(e) => setConfig({ ...config, labels: { ...config.labels, A: e.target.value } })}
                      className="w-full h-8 px-2.5 rounded-lg border border-emerald-500/20 bg-slate-950 text-emerald-300 text-xs font-semibold focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Predikat B */}
                <div className="p-4 rounded-2xl border border-cyan-500/25 bg-cyan-950/15 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      Predikat B
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">&lt; {config.minA}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Nilai Minimal:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="60"
                        max="99"
                        value={config.minB}
                        onChange={(e) => setConfig({ ...config, minB: parseInt(e.target.value, 10) || 81 })}
                        className="w-24 h-9 px-3 rounded-lg border border-cyan-500/30 bg-slate-950 text-white font-bold text-center text-xs focus:outline-none focus:border-cyan-400"
                      />
                      <span className="text-xs text-slate-400">s/d {config.minA - 1}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-medium text-slate-400">Label Status Penguasaan:</label>
                    <input
                      type="text"
                      value={config.labels.B}
                      onChange={(e) => setConfig({ ...config, labels: { ...config.labels, B: e.target.value } })}
                      className="w-full h-8 px-2.5 rounded-lg border border-cyan-500/20 bg-slate-950 text-cyan-300 text-xs font-semibold focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Predikat C */}
                <div className="p-4 rounded-2xl border border-amber-500/25 bg-amber-950/15 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      Predikat C
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">&lt; {config.minB}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Nilai Minimal (KKTP):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="50"
                        max="90"
                        value={config.minC}
                        onChange={(e) => setConfig({ ...config, minC: parseInt(e.target.value, 10) || 75 })}
                        className="w-24 h-9 px-3 rounded-lg border border-amber-500/30 bg-slate-950 text-white font-bold text-center text-xs focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-xs text-slate-400">s/d {config.minB - 1}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-medium text-slate-400">Label Status Penguasaan:</label>
                    <input
                      type="text"
                      value={config.labels.C}
                      onChange={(e) => setConfig({ ...config, labels: { ...config.labels, C: e.target.value } })}
                      className="w-full h-8 px-2.5 rounded-lg border border-amber-500/20 bg-slate-950 text-amber-300 text-xs font-semibold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Predikat D */}
                <div className="p-4 rounded-2xl border border-rose-500/25 bg-rose-950/15 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      Predikat D
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Bimbingan Khusus</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Rentang Nilai:</label>
                    <div className="flex items-center gap-2 h-9 text-xs text-rose-300 font-bold">
                      <span>0 s/d {config.minC - 1}</span>
                      <span className="text-[10px] text-slate-400 font-normal">(&lt; KKTP)</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-medium text-slate-400">Label Status Penguasaan:</label>
                    <input
                      type="text"
                      value={config.labels.D}
                      onChange={(e) => setConfig({ ...config, labels: { ...config.labels, D: e.target.value } })}
                      className="w-full h-8 px-2.5 rounded-lg border border-rose-500/20 bg-slate-950 text-rose-300 text-xs font-semibold focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isLoading || isSaving}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Standar</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (4 Cols): Summary Matrix & Live Interactive Tester */}
        <div className="lg:col-span-4 space-y-5">
          {/* Matriks Ringkasan Interval */}
          <div className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl space-y-3.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Matriks Interval Rapor</span>
            </h3>

            <div className="border border-white/[0.07] rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-white/[0.07]">
                  <tr>
                    <th className="py-2 px-3 font-semibold text-center w-12">Predikat</th>
                    <th className="py-2 px-3 font-semibold text-center">Interval Nilai</th>
                    <th className="py-2 px-3 font-semibold">Penguasaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <tr className="bg-emerald-950/10">
                    <td className="py-2 px-3 text-center font-bold text-emerald-400">A</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-200">{config.minA} – 100</td>
                    <td className="py-2 px-3 text-emerald-300 font-medium">{config.labels.A}</td>
                  </tr>
                  <tr className="bg-cyan-950/10">
                    <td className="py-2 px-3 text-center font-bold text-cyan-400">B</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-200">{config.minB} – {config.minA - 1}</td>
                    <td className="py-2 px-3 text-cyan-300 font-medium">{config.labels.B}</td>
                  </tr>
                  <tr className="bg-amber-950/10">
                    <td className="py-2 px-3 text-center font-bold text-amber-400">C</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-200">{config.minC} – {config.minB - 1}</td>
                    <td className="py-2 px-3 text-amber-300 font-medium">{config.labels.C}</td>
                  </tr>
                  <tr className="bg-rose-950/10">
                    <td className="py-2 px-3 text-center font-bold text-rose-400">D</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-200">0 – {config.minC - 1}</td>
                    <td className="py-2 px-3 text-rose-300 font-medium">{config.labels.D}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Simulator Tester */}
          <div className="rounded-2xl sm:rounded-3xl border border-cyan-400/20 bg-gradient-to-b from-cyan-950/20 to-slate-950/80 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-400/15 text-cyan-300 flex items-center justify-center font-bold">
                <Calculator className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Simulator Konversi Nilai
              </h3>
            </div>

            <p className="text-[11px] text-slate-400">
              Ketikkan contoh nilai siswa untuk memverifikasi kalkulasi otomatis:
            </p>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={testScore}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTestScore(v === '' ? '' : parseInt(v, 10));
                  }}
                  placeholder="Ketik nilai (0 - 100)..."
                  className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-slate-900 text-white font-black text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Output Result Card */}
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/70 flex items-center justify-between gap-3">
                <div className="leading-tight">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Predikat Hasil:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-xl font-black px-2 py-0.5 rounded-lg border ${
                        simulatedPredicate === 'A'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : simulatedPredicate === 'B'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : simulatedPredicate === 'C'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : simulatedPredicate === 'D'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {simulatedPredicate}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {simulatedMastery}
                    </span>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-400">
                  <span>KKTP: {config.passingGrade}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradeRangePanel;
