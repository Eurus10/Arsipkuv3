import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  Database,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileJson,
  RefreshCw,
  Layers,
  Users,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import { AcademicPeriod } from '../../services/academicPeriodService';
import { fetchPeriods } from '../../services/eraporAdminDashboardService';
import {
  createEraporPeriodBackup,
  downloadJsonFile,
  validateEraporBackupFile,
  restoreEraporPeriodBackup,
  getLocalBackupHistory,
  BackupHistoryItem,
  BackupValidationResult,
  EraporBackupPayload,
} from '../../services/eraporBackupRestoreService';

interface BackupRestorePanelProps {
  showNotification?: (message: string, type?: 'success' | 'info') => void;
  onRefreshData?: () => void;
}

export const BackupRestorePanel: React.FC<BackupRestorePanelProps> = ({
  showNotification,
  onRefreshData,
}) => {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [isLoadingPeriods, setIsLoadingPeriods] = useState<boolean>(true);

  // Backup State
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);

  // Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [showConfirmRestoreModal, setShowConfirmRestoreModal] = useState<boolean>(false);
  const [restoreSummary, setRestoreSummary] = useState<{
    success: boolean;
    message: string;
    restoredRecords: Record<string, number>;
  } | null>(null);

  // Load Periods and Backup History on mount
  useEffect(() => {
    const loadInitial = async () => {
      setIsLoadingPeriods(true);
      try {
        const { activePeriod, allPeriods } = await fetchPeriods();
        setPeriods(allPeriods);
        const targetId = activePeriod?.id || allPeriods[0]?.id || '';
        setSelectedPeriodId(targetId);

        const history = getLocalBackupHistory();
        setBackupHistory(history);
        if (history.length > 0) {
          setLastBackupTime(history[0].createdAt);
        }
      } catch (err: any) {
        console.error('Failed to load periods for backup:', err);
      } finally {
        setIsLoadingPeriods(false);
      }
    };

    loadInitial();
  }, []);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // Trigger Backup Export
  const handleExecuteBackup = async () => {
    if (!selectedPeriodId) {
      showNotification?.('Pilih Tahun Pelajaran terlebih dahulu.', 'info');
      return;
    }

    setIsBackingUp(true);
    try {
      const { filename, jsonString, payload } = await createEraporPeriodBackup(selectedPeriodId);
      downloadJsonFile(jsonString, filename);

      const updatedHistory = getLocalBackupHistory();
      setBackupHistory(updatedHistory);
      setLastBackupTime(new Date().toISOString());

      showNotification?.(
        `Alhamdulillah, backup untuk ${payload.metadata.academic_period.label} berhasil diunduh (${filename}).`,
        'success'
      );
    } catch (err: any) {
      console.error('Backup error:', err);
      showNotification?.(`Backup gagal: ${err?.message || 'Terjadi kesalahan sistem'}`, 'info');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setRestoreSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setUploadedFileContent(text);
      const validation = validateEraporBackupFile(text);
      setValidationResult(validation);

      if (!validation.isValid) {
        showNotification?.(validation.errors[0] || 'File backup tidak valid.', 'info');
      } else {
        showNotification?.('File backup terverifikasi dan siap dipulihkan.', 'success');
      }
    };
    reader.onerror = () => {
      showNotification?.('Gagal membaca file backup dari perangkat.', 'info');
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleConfirmRestore = async () => {
    if (!validationResult?.payload) return;

    setIsRestoring(true);
    setShowConfirmRestoreModal(false);

    try {
      const res = await restoreEraporPeriodBackup(validationResult.payload);
      setRestoreSummary(res);

      if (res.success) {
        showNotification?.(res.message, 'success');
        onRefreshData?.();
      } else {
        showNotification?.(res.message, 'info');
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      setRestoreSummary({
        success: false,
        message: `Restore gagal: ${err?.message || 'Terjadi kesalahan internal'}`,
        restoredRecords: {},
      });
      showNotification?.(`Restore gagal: ${err?.message}`, 'info');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
              <Database className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Backup & Restore e-Rapor
                </h2>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  v1.0 • Snapshot Berbasis Periode
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300 max-w-2xl leading-relaxed">
                Kelola arsip cadangan data e-Rapor per Tahun Pelajaran secara aman, read-only, dan mandiri tanpa mengganggu alur kerja guru maupun tahun pelajaran lainnya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-400">
              {lastBackupTime ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Backup Terakhir:{' '}
                    {new Date(lastBackupTime).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              ) : (
                <span className="text-slate-500 italic text-[11px]">Belum ada riwayat backup</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns (Left: Backup Sekarang, Right: Restore) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ====================================================================
            COLUMN 1: BACKUP DATA SEKARANG
           ==================================================================== */}
        <section className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl p-5 sm:p-6 shadow-lg flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">1. Backup Data e-Rapor</h3>
                <p className="text-[11px] text-slate-400">Ekspor snapshot data semester aktif ke file JSON.</p>
              </div>
            </div>

            {/* Form Pilihan Periode */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Pilih Tahun Pelajaran & Semester:</span>
              </label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                disabled={isLoadingPeriods || isBackingUp}
                className="w-full h-10 px-3.5 rounded-xl border border-white/[0.10] bg-slate-900/90 text-xs font-bold text-white focus:outline-none focus:border-emerald-400/50 cursor-pointer disabled:opacity-40"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    T.A. {p.school_year} — Semester {p.semester} {p.is_active ? '★ (Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Information Notice */}
            <div className="rounded-xl border border-sky-400/20 bg-sky-500/[0.06] p-3 text-[11px] text-sky-200 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-300">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Cakupan Data yang Dibackup:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[10.5px]">
                <li>Data Master: Siswa, Guru, Rombel Kelas, Mata Pelajaran, & TP</li>
                <li>Data Penilaian: Nilai Mata Pelajaran (STS & Akhir), Capaian TP</li>
                <li>Data Penugasan: Wali Kelas & Guru Pengampu Semester Ini</li>
                <li>Data Karakter: Catatan Perkembangan Karakter Siswa</li>
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExecuteBackup}
            disabled={isBackingUp || !selectedPeriodId}
            className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isBackingUp ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sedang Menyiapkan & Mengunduh Backup...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh Backup JSON ({selectedPeriod?.school_year || 'Pilih Periode'})</span>
              </>
            )}
          </button>
        </section>

        {/* ====================================================================
            COLUMN 2: RESTORE DATA BACKUP
           ==================================================================== */}
        <section className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl p-5 sm:p-6 shadow-lg flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">2. Restore Data e-Rapor</h3>
                <p className="text-[11px] text-slate-400">Pulihkan arsip nilai e-Rapor dari file JSON valid.</p>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-4 text-center transition-all cursor-pointer ${
                validationResult?.isValid
                  ? 'border-emerald-400/40 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]'
                  : validationResult && !validationResult.isValid
                  ? 'border-rose-400/40 bg-rose-500/[0.04]'
                  : 'border-white/[0.12] bg-white/[0.02] hover:border-amber-400/40 hover:bg-amber-400/[0.03]'
              }`}
            >
              <FileJson
                className={`w-8 h-8 mx-auto mb-2 ${
                  validationResult?.isValid
                    ? 'text-emerald-400'
                    : validationResult && !validationResult.isValid
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              />
              <p className="text-xs font-bold text-white">
                {uploadedFileName || 'Klik untuk Memilih File Backup JSON'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Format yang didukung: <span className="text-slate-300 font-mono">.json</span> (v1.0)
              </p>
            </div>

            {/* Validation Feedback */}
            {validationResult && (
              <div
                className={`rounded-xl border p-3 text-xs leading-relaxed ${
                  validationResult.isValid
                    ? 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/[0.08] text-rose-200'
                }`}
              >
                {validationResult.isValid && validationResult.summary ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Backup Valid: {validationResult.summary.periodLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1 border-t border-emerald-500/20">
                      <div>• Siswa: <b>{validationResult.summary.studentCount}</b></div>
                      <div>• Guru: <b>{validationResult.summary.teacherCount}</b></div>
                      <div>• Rombel: <b>{validationResult.summary.classCount}</b></div>
                      <div>• Mapel: <b>{validationResult.summary.subjectCount}</b></div>
                      <div>• Nilai Mapel: <b>{validationResult.summary.scoreCount}</b></div>
                      <div>• Capaian TP: <b>{validationResult.summary.loScoreCount}</b></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-300">
                      <AlertCircle className="w-4 h-4" />
                      <span>File Backup Tidak Valid</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-rose-200">
                      {validationResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Success Report */}
            {restoreSummary && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  restoreSummary.success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {restoreSummary.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{restoreSummary.message}</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmRestoreModal(true)}
            disabled={!validationResult?.isValid || isRestoring}
            className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRestoring ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memulihkan Data ke Database...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Restore Data e-Rapor</span>
              </>
            )}
          </button>
        </section>
      </div>

      {/* ====================================================================
          SECTION 3: RIWAYAT BACKUP LOKAL
         ==================================================================== */}
      <section className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl p-5 sm:p-6 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Riwayat Ekspor Backup Perangkat Ini</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">
            {backupHistory.length} File Tercatat
          </span>
        </div>

        {backupHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            Belum ada arsip backup yang dibuat dari peramban ini.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05] max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {backupHistory.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-white truncate text-[13px]">{item.filename}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                    <span className="text-emerald-400 font-semibold">{item.academicPeriodLabel}</span>
                    <span>•</span>
                    <span>{item.statistics.students} Siswa</span>
                    <span>•</span>
                    <span>{item.statistics.scores} Nilai Mapel</span>
                    <span>•</span>
                    <span>{Math.round(item.sizeBytes / 1024)} KB</span>
                    <span>•</span>
                    <span className="text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-slate-300 font-medium">
                    Tersimpan
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ====================================================================
          MODAL KONFIRMASI RESTORE (SAFETY DIALOG)
         ==================================================================== */}
      {showConfirmRestoreModal && validationResult?.summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Konfirmasi Pemulihan Data</h3>
              <p className="text-xs text-slate-300">
                Anda akan memulihkan data e-Rapor untuk periode:
              </p>
              <p className="text-sm font-black text-amber-300">
                {validationResult.summary.periodLabel}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-3.5 text-xs text-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Siswa:</span>
                <span className="font-bold text-white">{validationResult.summary.studentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Guru:</span>
                <span className="font-bold text-white">{validationResult.summary.teacherCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nilai Mata Pelajaran:</span>
                <span className="font-bold text-white">{validationResult.summary.scoreCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Capaian TP:</span>
                <span className="font-bold text-white">{validationResult.summary.loScoreCount}</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-[11px] text-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
              <span>Proses menggunakan metode <b>UPSERT aman</b> dan tidak akan merusak tahun pelajaran lainnya.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmRestoreModal(false)}
                className="h-10 px-4 rounded-xl border border-white/[0.10] bg-white/[0.04] text-xs font-bold text-slate-300 hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Ya, Pulihkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupRestorePanel;
