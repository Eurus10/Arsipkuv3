import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Calendar,
  Check,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  AcademicPeriod,
  fetchAcademicPeriods,
  createAcademicPeriod,
  setActiveAcademicPeriod,
  toggleArchiveAcademicPeriod,
  deleteAcademicPeriod,
} from '../../services/academicPeriodService';

interface AcademicPeriodPanelProps {
  showNotification?: (message: string, type?: 'success' | 'info') => void;
}

export const AcademicPeriodPanel: React.FC<AcademicPeriodPanelProps> = ({ showNotification }) => {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formSchoolYear, setFormSchoolYear] = useState('2026/2027');
  const [formSemester, setFormSemester] = useState<'Ganjil' | 'Genap'>('Genap');
  const [formLabel, setFormLabel] = useState('2026/2027 - Genap');
  const [isCustomLabel, setIsCustomLabel] = useState(false);

  // Confirmation Modal State for activating period
  const [confirmActivatePeriod, setConfirmActivatePeriod] = useState<AcademicPeriod | null>(null);

  const activePeriod = useMemo(() => periods.find((p) => p.is_active) || null, [periods]);

  const notify = (msg: string, type: 'success' | 'info' = 'success') => {
    showNotification?.(msg, type);
  };

  const loadPeriods = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAcademicPeriods();
      setPeriods(data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar periode akademik.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  // Update default label when schoolYear or semester changes unless custom label is typed
  const handleYearChange = (val: string) => {
    setFormSchoolYear(val);
    if (!isCustomLabel) {
      setFormLabel(`${val.trim()} - ${formSemester}`);
    }
  };

  const handleSemesterChange = (sem: 'Ganjil' | 'Genap') => {
    setFormSemester(sem);
    if (!isCustomLabel) {
      setFormLabel(`${formSchoolYear.trim()} - ${sem}`);
    }
  };

  const openAddModal = () => {
    // If active period exists, propose next semester or next year
    if (activePeriod) {
      if (activePeriod.semester === 'Ganjil') {
        setFormSchoolYear(activePeriod.school_year);
        setFormSemester('Genap');
        setFormLabel(`${activePeriod.school_year} - Genap`);
      } else {
        const [y1, y2] = activePeriod.school_year.split('/').map((y) => parseInt(y, 10));
        const nextYear = `${y1 + 1}/${y2 + 1}`;
        setFormSchoolYear(nextYear);
        setFormSemester('Ganjil');
        setFormLabel(`${nextYear} - Ganjil`);
      }
    } else {
      setFormSchoolYear('2026/2027');
      setFormSemester('Ganjil');
      setFormLabel('2026/2027 - Ganjil');
    }
    setIsCustomLabel(false);
    setIsAddModalOpen(true);
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    try {
      await createAcademicPeriod({
        school_year: formSchoolYear.trim(),
        semester: formSemester,
        label: formLabel.trim(),
      });
      notify(`Periode akademik ${formLabel} berhasil dibuat. Status awal: Tidak Aktif.`);
      setIsAddModalOpen(false);
      await loadPeriods();
    } catch (err: any) {
      setError(err?.message || 'Gagal menambahkan periode akademik.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivate = async (period: AcademicPeriod) => {
    setIsProcessing(true);
    setError(null);
    try {
      await setActiveAcademicPeriod(period.id);
      notify(`Periode ${period.label} sekarang menjadi Periode Aktif e-Rapor.`);
      setConfirmActivatePeriod(null);
      await loadPeriods();
    } catch (err: any) {
      setError(err?.message || 'Gagal mengaktifkan periode akademik.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleArchive = async (period: AcademicPeriod) => {
    if (period.is_active) {
      setError('Periode aktif tidak dapat diarsipkan. Silakan aktifkan periode lain terlebih dahulu.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const nextArchiveStatus = !period.is_archived;
      await toggleArchiveAcademicPeriod(period.id, nextArchiveStatus);
      notify(
        nextArchiveStatus
          ? `Periode ${period.label} telah diarsipkan.`
          : `Periode ${period.label} dikembalikan dari arsip.`
      );
      await loadPeriods();
    } catch (err: any) {
      setError(err?.message || 'Gagal mengubah status arsip.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (period: AcademicPeriod) => {
    if (period.is_active) {
      setError('Periode aktif tidak dapat dihapus.');
      return;
    }
    if (!window.confirm(`Yakin ingin menghapus periode "${period.label}"? Tindakan ini hanya berhasil jika periode belum digunakan pada data akademik.`)) {
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await deleteAcademicPeriod(period.id);
      notify(`Periode ${period.label} berhasil dihapus.`);
      await loadPeriods();
    } catch (err: any) {
      setError(err?.message || 'Gagal menghapus periode akademik.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-white">Periode Akademik e-Rapor</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Supabase Core
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Source of truth periode akademik e-Rapor SDIT AL FIKRI dimulai dari <strong className="text-white">2026/2027 Ganjil</strong>. Hanya satu periode yang dapat aktif pada satu waktu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPeriods}
            disabled={isLoading || isProcessing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Periode"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            disabled={isLoading || isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-md shadow-cyan-400/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Periode</span>
          </button>
        </div>
      </div>

      {/* Active Period Highlight Card */}
      {activePeriod && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Periode Aktif Saat Ini</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-sm font-black text-white mt-0.5">{activePeriod.label}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Tahun Ajaran {activePeriod.school_year} • Semester {activePeriod.semester}</span>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Periods Table / Cards */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <p className="text-xs font-semibold">Memuat periode akademik dari Supabase...</p>
          </div>
        ) : periods.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
            <p className="text-sm font-bold text-white">Belum ada data periode akademik</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol &quot;Tambah Periode&quot; untuk menambahkan periode baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Tahun Ajaran</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4">Label Periode</th>
                  <th className="py-3.5 px-4 text-center">Status Aktif</th>
                  <th className="py-3.5 px-4 text-center">Arsip</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {periods.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        p.is_active ? 'bg-emerald-500/[0.03]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-black text-white">{p.school_year}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            p.semester === 'Ganjil'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {p.semester}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">{p.label}</td>
                      <td className="py-3.5 px-4 text-center">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Check className="w-3 h-3" />
                            Aktif (e-Rapor)
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-500 bg-white/[0.02] border border-white/[0.05]">
                            Tidak Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {p.is_archived ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <Archive className="w-3 h-3" />
                            Arsip
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">Normal</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Activate Button */}
                          {!p.is_active ? (
                            <button
                              type="button"
                              onClick={() => setConfirmActivatePeriod(p)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-black text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
                              title="Jadikan sebagai periode aktif"
                            >
                              Aktifkan
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 bg-white/[0.02] border border-white/[0.05]">
                              Sedang Aktif
                            </span>
                          )}

                          {/* Toggle Archive Button */}
                          {!p.is_active && (
                            <button
                              type="button"
                              onClick={() => handleToggleArchive(p)}
                              disabled={isProcessing}
                              className={`p-1.5 rounded-lg text-slate-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer disabled:opacity-50 ${
                                p.is_archived
                                  ? 'hover:bg-cyan-500/20 hover:text-cyan-300'
                                  : 'hover:bg-amber-500/20 hover:text-amber-300'
                              }`}
                              title={p.is_archived ? 'Batalkan Arsip' : 'Arsipkan Periode'}
                            >
                              {p.is_archived ? (
                                <ArchiveRestore className="w-3.5 h-3.5" />
                              ) : (
                                <Archive className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Safe Delete Button */}
                          {!p.is_active && (
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              disabled={isProcessing}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.08] transition-all cursor-pointer disabled:opacity-50"
                              title="Hapus periode (hanya jika belum digunakan)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card on Access and Scope */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-slate-900/40 text-xs text-slate-400 space-y-1.5">
        <p className="font-bold text-slate-300">Catatan Pengelolaan Periode Akademik:</p>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
          <li>Pengelolaan periode akademik eksklusif untuk level <strong>Admin / TU</strong>.</li>
          <li>Akses guru ke e-Rapor dan penugasan guru secara otomatis merujuk ke periode berstatus <strong>Aktif</strong>.</li>
          <li>Mengaktifkan periode baru akan secara otomatis menonaktifkan periode aktif sebelumnya tanpa menghapus data nilainya.</li>
          <li>Periode yang telah memiliki data penugasan, rombel siswa, atau nilai e-Rapor dilindungi dari penghapusan permanen.</li>
        </ul>
      </div>

      {/* MODAL: Tambah Periode */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Tambah Periode Akademik Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tahun Ajaran <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="2026/2027"
                  value={formSchoolYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/60 border border-white/[0.1] text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
                />
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-500">Pilihan cepat:</span>
                  {['2026/2027', '2027/2028', '2028/2029'].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleYearChange(yr)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] cursor-pointer"
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Semester <span className="text-cyan-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSemesterChange('Ganjil')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formSemester === 'Ganjil'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    Ganjil
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSemesterChange('Genap')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formSemester === 'Genap'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    Genap
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Label Tampilan Periode
                </label>
                <input
                  type="text"
                  required
                  value={formLabel}
                  onChange={(e) => {
                    setFormLabel(e.target.value);
                    setIsCustomLabel(true);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/60 border border-white/[0.1] text-xs font-medium text-white focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Label otomatis: {formSchoolYear} - {formSemester}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20 text-[11px] text-cyan-300">
                Periode baru akan disimpan dengan status <strong>Tidak Aktif</strong>. Periode <strong>2026/2027 Ganjil</strong> akan tetap aktif hingga Anda secara sengaja mengaktifkan periode ini.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-md shadow-cyan-400/20 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Periode</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Pengaktifan Periode */}
      {confirmActivatePeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Konfirmasi Pengaktifan Periode</h3>
                <p className="text-xs text-slate-400 mt-0.5">Hanya satu periode yang dapat aktif</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anda akan mengaktifkan periode <strong className="text-white">{confirmActivatePeriod.label}</strong>.
              {activePeriod && (
                <>
                  {' '}Periode yang sedang aktif saat ini (<strong className="text-emerald-400">{activePeriod.label}</strong>) akan dinonaktifkan secara otomatis.
                </>
              )}
            </p>

            <div className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-[11px] text-amber-300">
              Akses guru ke e-Rapor dan penugasan mengajar akan langsung beralih ke periode yang baru diaktifkan ini.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmActivatePeriod(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/[0.04] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleActivate(confirmActivatePeriod)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-400/20 cursor-pointer disabled:opacity-50"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Aktifkan Periode Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicPeriodPanel;
