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
    <div className="space-y-5">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight font-heading">
                Periode Akademik e-Rapor
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Master Database
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Source of truth periode akademik e-Rapor SDIT AL FIKRI. Hanya satu periode yang dapat aktif pada satu waktu.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPeriods}
            disabled={isLoading || isProcessing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            title="Refresh Periode"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            disabled={isLoading || isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm shadow-emerald-700/10 transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Periode</span>
          </button>
        </div>
      </div>

      {/* Active Period Highlight Card */}
      {activePeriod && (
        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Periode Aktif Saat Ini</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{activePeriod.label}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-600 font-medium">Tahun Ajaran {activePeriod.school_year} • Semester {activePeriod.semester}</span>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Periods Table / Cards */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="text-xs font-semibold">Memuat periode akademik...</p>
          </div>
        ) : periods.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
            <p className="text-sm font-bold text-slate-800">Belum ada data periode akademik</p>
            <p className="text-xs text-slate-500 mt-1">Klik tombol &quot;Tambah Periode&quot; untuk menambahkan periode baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-4">Tahun Ajaran</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4">Label Periode</th>
                  <th className="py-3.5 px-4 text-center">Status Aktif</th>
                  <th className="py-3.5 px-4 text-center">Arsip</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {periods.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        p.is_active ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900">{p.school_year}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            p.semester === 'Ganjil'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {p.semester}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{p.label}</td>
                      <td className="py-3.5 px-4 text-center">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3" />
                            Aktif (e-Rapor)
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200">
                            Tidak Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {p.is_archived ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Archive className="w-3 h-3" />
                            Arsip
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Normal</span>
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
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer disabled:opacity-50"
                              title="Jadikan sebagai periode aktif"
                            >
                              Aktifkan
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200">
                              Sedang Aktif
                            </span>
                          )}

                          {/* Toggle Archive Button */}
                          {!p.is_active && (
                            <button
                              type="button"
                              onClick={() => handleToggleArchive(p)}
                              disabled={isProcessing}
                              className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-800 border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 ${
                                p.is_archived
                                  ? 'hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200'
                                  : 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
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
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 bg-white transition-all cursor-pointer disabled:opacity-50"
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
      <div className="p-4 rounded-2xl border border-slate-200/90 bg-white text-xs text-slate-600 shadow-xs space-y-1.5">
        <p className="font-bold text-slate-800">Catatan Pengelolaan Periode Akademik:</p>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500">
          <li>Pengelolaan periode akademik eksklusif untuk level <strong>Admin / TU</strong>.</li>
          <li>Akses guru ke e-Rapor dan penugasan guru secara otomatis merujuk ke periode berstatus <strong>Aktif</strong>.</li>
          <li>Mengaktifkan periode baru akan secara otomatis menonaktifkan periode aktif sebelumnya tanpa menghapus data nilainya.</li>
          <li>Periode yang telah memiliki data penugasan, rombel siswa, atau nilai e-Rapor dilindungi dari penghapusan permanen.</li>
        </ul>
      </div>

      {/* MODAL: Tambah Periode */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                Tambah Periode Akademik Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tahun Ajaran <span className="text-emerald-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="2026/2027"
                  value={formSchoolYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-500">Pilihan cepat:</span>
                  {['2026/2027', '2027/2028', '2028/2029'].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleYearChange(yr)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Semester <span className="text-emerald-700">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSemesterChange('Ganjil')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formSemester === 'Ganjil'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Ganjil
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSemesterChange('Genap')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formSemester === 'Genap'
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Genap
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Label otomatis: {formSchoolYear} - {formSemester}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 leading-relaxed">
                Periode baru akan disimpan dengan status <strong>Tidak Aktif</strong>. Periode aktif yang sedang berjalan akan tetap aktif hingga Anda sengaja mengaktifkannya.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm shadow-emerald-700/10 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfirmasi Pengaktifan Periode</h3>
                <p className="text-xs text-slate-500 mt-0.5">Hanya satu periode yang dapat aktif</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan mengaktifkan periode <strong className="text-slate-900">{confirmActivatePeriod.label}</strong>.
              {activePeriod && (
                <>
                  {' '}Periode yang sedang aktif saat ini (<strong className="text-emerald-700">{activePeriod.label}</strong>) akan dinonaktifkan secara otomatis.
                </>
              )}
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
              Akses guru ke e-Rapor dan penugasan mengajar akan langsung beralih ke periode yang baru diaktifkan ini.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmActivatePeriod(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleActivate(confirmActivatePeriod)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm shadow-emerald-700/10 cursor-pointer disabled:opacity-50"
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
