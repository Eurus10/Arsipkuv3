import React, { useState, useEffect } from 'react';
import {
  Database,
  Eye,
  Edit3,
  Trash2,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import {
  DailyQuotaUsage,
  FIRESTORE_DAILY_LIMITS,
  getDailyQuotaUsage,
  subscribeToQuotaUpdates,
  resetDailyQuotaUsage,
} from '../../services/quotaTracker';

interface FirestoreQuotaWidgetProps {
  compact?: boolean;
}

export const FirestoreQuotaWidget: React.FC<FirestoreQuotaWidgetProps> = ({ compact = false }) => {
  const [quota, setQuota] = useState<DailyQuotaUsage>(() => getDailyQuotaUsage());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToQuotaUpdates((newUsage) => {
      setQuota(newUsage);
    });
    return () => unsub();
  }, []);

  const handleReset = () => {
    resetDailyQuotaUsage();
    setShowResetConfirm(false);
    setResetMessage('Counter kuota lokal berhasil direset.');
    setTimeout(() => setResetMessage(null), 3000);
  };

  const calcPercent = (val: number, max: number): number => {
    if (!max || max <= 0) return 0;
    const pct = (val / max) * 100;
    return Math.min(100, Math.round(pct * 10) / 10);
  };

  const getBarColor = (pct: number): string => {
    if (pct >= 85) return 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-200';
    if (pct >= 60) return 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-amber-100';
    return 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-emerald-100';
  };

  const getBadgeColor = (pct: number): string => {
    if (pct >= 85) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (pct >= 60) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  const readsPct = calcPercent(quota.reads, FIRESTORE_DAILY_LIMITS.reads);
  const writesPct = calcPercent(quota.writes, FIRESTORE_DAILY_LIMITS.writes);
  const deletesPct = calcPercent(quota.deletes, FIRESTORE_DAILY_LIMITS.deletes);

  const highestPct = Math.max(readsPct, writesPct, deletesPct);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-sm">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              Status Kuota Harian Firestore
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getBadgeColor(
                  highestPct
                )}`}
              >
                {highestPct >= 85 ? 'Peringatan Tinggi' : highestPct >= 60 ? 'Meningkat' : 'Aman & Hemat'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Estimasi penggunaan batas kuota gratis Firestore (Spark Plan) per hari ({quota.dateKey})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showResetConfirm ? (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
              <span className="text-xs text-slate-600 font-medium hidden sm:inline">Reset counter?</span>
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
              >
                Ya, Reset
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              title="Reset hitungan lokal hari ini"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {resetMessage && (
        <div className="px-5 py-2.5 bg-emerald-50 text-emerald-700 text-xs font-medium flex items-center gap-2 border-b border-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {resetMessage}
        </div>
      )}

      {/* Progress Bars Container */}
      <div className="p-5 space-y-5">
        {/* Item 1: READS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-500" />
              Document Reads (Pembacaan)
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-800 font-medium">
                {quota.reads.toLocaleString('id-ID')}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500">
                {FIRESTORE_DAILY_LIMITS.reads.toLocaleString('id-ID')}
              </span>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${getBadgeColor(readsPct)}`}
              >
                {readsPct}%
              </span>
            </div>
          </div>
          {/* Bar track */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(readsPct)}`}
              style={{ width: `${Math.max(readsPct, 1)}%` }}
            />
          </div>
        </div>

        {/* Item 2: WRITES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-blue-500" />
              Document Writes (Penulisan)
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-800 font-medium">
                {quota.writes.toLocaleString('id-ID')}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500">
                {FIRESTORE_DAILY_LIMITS.writes.toLocaleString('id-ID')}
              </span>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${getBadgeColor(writesPct)}`}
              >
                {writesPct}%
              </span>
            </div>
          </div>
          {/* Bar track */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(writesPct)}`}
              style={{ width: `${Math.max(writesPct, 1)}%` }}
            />
          </div>
        </div>

        {/* Item 3: DELETES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-amber-500" />
              Document Deletes (Penghapusan)
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-800 font-medium">
                {quota.deletes.toLocaleString('id-ID')}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500">
                {FIRESTORE_DAILY_LIMITS.deletes.toLocaleString('id-ID')}
              </span>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${getBadgeColor(deletesPct)}`}
              >
                {deletesPct}%
              </span>
            </div>
          </div>
          {/* Bar track */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(deletesPct)}`}
              style={{ width: `${Math.max(deletesPct, 1)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-500 flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-700">Optimasi Hemat Aktif:</span> Polling redundan 10 detik &amp; listener global telah dinonaktifkan. Kuota harian gratis di-reset otomatis oleh Google Firebase setiap hari pada pukul 00:00 PST.
        </div>
      </div>
    </div>
  );
};
