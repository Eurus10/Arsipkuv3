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
      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-heading">
              Standar Rentang Predikat & KKTP Akademik
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur ambang batas interval nilai angka ke huruf (A, B, C, D) dan 4 kategori status penguasaan materi untuk Rapor STS
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
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Bawaan</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-700/10 disabled:opacity-40 active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Rentang'}</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 Cols): Configuration Form & Interval Table */}
        <div className="lg:col-span-8 space-y-5">
          <form onSubmit={handleSave} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-5">
            {/* KKTP Passing Grade Input */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>Kriteria Ketercapaian Tujuan Pembelajaran (KKTP / KKM)</span>
                  </h3>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">
                    Nilai tuntas minimal sekolah dasar. Nilai di bawah KKTP secara otomatis menjadi Predikat D (Perlu Bimbingan).
                  </p>
                </div>
                <div className="w-24 shrink-0">
                  <input
                    type="number"
                    min="50"
                    max="90"
                    value={config.passingGrade}
                    onChange={(e) => handleKktpChange(parseInt(e.target.value, 10) || 75)}
                    className="w-full h-10 px-3 rounded-xl border border-amber-300 bg-white text-amber-900 font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* 4 Predicates Interval Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ambang Batas Minimum per Predikat
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Predikat A */}
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Predikat A
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Maksimal 100</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Nilai Minimal:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="70"
                        max="100"
                        value={config.minA}
                        onChange={(e) => setConfig({ ...config, minA: parseInt(e.target.value, 10) || 91 })}
                        className="w-24 h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold text-center text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs"
                      />
                      <span className="text-xs text-slate-500 font-medium">s/d 100</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-medium text-slate-500">Label Status Penguasaan:</label>
                    <input
                      type="text"
                      value={config.labels.A}
                      onChange={(e) => setConfig({ ...config, labels: { ...config.labels, A: e.target.value } })}
                      className="w-full h-8.5 px-2.5 rounded-xl border border-slate-200 bg-white text-emerald-800 text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs"
                    />
                  </div>
                </div>

                {/* Predikat B */}
                <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/40 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      Predikat B
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">&lt; {config.minA}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Nilai Minimal:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="60"
                        max="99"
                        value={config.minB}
                        onChange={(e) => setConfig({ ...config, minB: parseInt(e.target.value, 10) || 81 })}
                        className="w-24 h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold text-center text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 shadow-xs"
                      />
                      <span className="text-xs text-slate-500 font-medium">s/d {config.minA - 1}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-medium text-slate-500">Label Status Penguasaan:</label>
                    <input
                      type="text"
                      value={config.labels.B}
                      onChange={(e) => setConfig({ ...config, labels: { ...config.labels, B: e.target.value } })}
                      className="w-full h-8.5 px-2.5 rounded-xl border border-slate-200 bg-white text-sky-800 text-xs font-semibold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 shadow-xs"
                    />
                  </div>
                </div>

                {/* Predikat C */}
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Predikat C
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">&lt; {config.minB}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Nilai Minimal (KKTP):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="50"
                        max="90"
                        value={config.minC}
                        onChange={(e) => setConfig({ ...config, minC: parseInt(e.target.value, 10) || 75 })}
                        className="w-24 h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold text-center text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 shadow-xs"
                      />
                      <span className="text-xs text-slate-500 font-medium">s/d {config.minB - 1}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-medium text-slate-500">Label Status Penguasaan:</label>
                    <input
                      type="text"
                      value={config.labels.C}
                      onChange={(e) => setConfig({ ...config, labels: { ...config.labels, C: e.target.value } })}
                      className="w-full h-8.5 px-2.5 rounded-xl border border-slate-200 bg-white text-amber-900 text-xs font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 shadow-xs"
                    />
                  </div>
                </div>

                {/* Predikat D */}
                <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Predikat D
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Bimbingan Khusus</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Rentang Nilai:</label>
                    <div className="flex items-center gap-2 h-9 text-xs text-rose-800 font-bold">
                      <span>0 s/d {config.minC - 1}</span>
                      <span className="text-[10px] text-slate-500 font-normal">(&lt; KKTP)</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-medium text-slate-500">Label Status Penguasaan:</label>
                    <input
                      type="text"
                      value={config.labels.D}
                      onChange={(e) => setConfig({ ...config, labels: { ...config.labels, D: e.target.value } })}
                      className="w-full h-8.5 px-2.5 rounded-xl border border-slate-200 bg-white text-rose-900 text-xs font-semibold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isLoading || isSaving}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-700/20 cursor-pointer disabled:opacity-40 transition-all active:scale-95"
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
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Matriks Interval Rapor</span>
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-center w-14">Predikat</th>
                    <th className="py-2.5 px-3 font-bold text-center">Interval Nilai</th>
                    <th className="py-2.5 px-3 font-bold">Penguasaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors">
                    <td className="py-2 px-3 text-center font-black text-emerald-700">A</td>
                    <td className="py-2 px-3 text-center font-bold text-slate-800">{config.minA} – 100</td>
                    <td className="py-2 px-3 text-emerald-800 font-semibold">{config.labels.A}</td>
                  </tr>
                  <tr className="bg-sky-50/30 hover:bg-sky-50/60 transition-colors">
                    <td className="py-2 px-3 text-center font-black text-sky-700">B</td>
                    <td className="py-2 px-3 text-center font-bold text-slate-800">{config.minB} – {config.minA - 1}</td>
                    <td className="py-2 px-3 text-sky-800 font-semibold">{config.labels.B}</td>
                  </tr>
                  <tr className="bg-amber-50/30 hover:bg-amber-50/60 transition-colors">
                    <td className="py-2 px-3 text-center font-black text-amber-700">C</td>
                    <td className="py-2 px-3 text-center font-bold text-slate-800">{config.minC} – {config.minB - 1}</td>
                    <td className="py-2 px-3 text-amber-800 font-semibold">{config.labels.C}</td>
                  </tr>
                  <tr className="bg-rose-50/30 hover:bg-rose-50/60 transition-colors">
                    <td className="py-2 px-3 text-center font-black text-rose-700">D</td>
                    <td className="py-2 px-3 text-center font-bold text-slate-800">0 – {config.minC - 1}</td>
                    <td className="py-2 px-3 text-rose-800 font-semibold">{config.labels.D}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Simulator Tester */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                <Calculator className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Simulator Konversi Nilai
              </h3>
            </div>

            <p className="text-[11px] text-slate-500">
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
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold text-sm focus:outline-none focus:border-emerald-500 focus:bg-white shadow-xs transition-colors"
                />
              </div>

              {/* Output Result Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
                <div className="leading-tight">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Predikat Hasil:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-xl font-black px-2.5 py-0.5 rounded-lg border ${
                        simulatedPredicate === 'A'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : simulatedPredicate === 'B'
                          ? 'bg-sky-100 text-sky-800 border-sky-300'
                          : simulatedPredicate === 'C'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : simulatedPredicate === 'D'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}
                    >
                      {simulatedPredicate}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {simulatedMastery}
                    </span>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-500 font-medium">
                  <span>KKTP: <strong className="text-slate-800">{config.passingGrade}</strong></span>
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
