import React, { useState } from 'react';
import {
  ArrowLeftRight,
  UserCheck,
  Calendar,
  Clock3,
  Sparkles,
  AlertCircle,
  Check,
  X,
  Building2,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { ExamScheduleRow, ExamProctorCodeItem } from '../types';
import {
  SwapRecommendation,
  generateSwapRecommendations,
} from '../utils/examScheduleSwapEngine';

interface SmartSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRows: ExamScheduleRow[];
  proctorCodes: ExamProctorCodeItem[];
  sourceRowIndex: number;
  sourceRoom: string;
  sourceTeacherCode: string;
  onApplySwap: (recommendation: SwapRecommendation) => void;
}

export const SmartSwapModal: React.FC<SmartSwapModalProps> = ({
  isOpen,
  onClose,
  currentRows,
  proctorCodes,
  sourceRowIndex,
  sourceRoom,
  sourceTeacherCode,
  onApplySwap,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'swap' | 'substitute'>('all');

  if (!isOpen) return null;

  const sourceRow = currentRows[sourceRowIndex];
  const upperSourceCode = (sourceTeacherCode || '').trim().toUpperCase();
  const sourceTeacher = proctorCodes.find(
    (p) => p.code.trim().toUpperCase() === upperSourceCode
  );

  const recommendations = generateSwapRecommendations({
    currentRows,
    proctorCodes,
    sourceRowIndex,
    sourceRoom,
    sourceTeacherCode,
  });

  const filteredRecs = recommendations.filter((r) => {
    if (activeSubTab === 'all') return true;
    return r.type === activeSubTab;
  });

  return (
    <div className="fixed inset-0 z-70 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#141824] border border-[#2B3349] rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-5 space-y-4 text-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#252C3F] pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Rekomendasi Cerdas Tukar Pengawas</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-semibold border border-emerald-500/30">
                  Anti-Bentrok
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Pilih pertukaran 1-ke-1 (Zero-Sum) atau substitusi guru untuk pemerataan beban.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Duty Context Card */}
        {sourceRow && (
          <div className="bg-[#0F121A] border border-[#252C3F] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm font-black flex items-center justify-center flex-shrink-0">
                {upperSourceCode}
              </span>
              <div>
                <div className="text-xs text-rose-300 font-bold flex items-center gap-1.5">
                  <span>Guru yang Berhalangan:</span>
                  <span className="text-white">{sourceTeacher?.name || `Guru [${upperSourceCode}]`}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    {sourceRow.day}, {sourceRow.date || ''}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300 font-mono">
                    <Clock3 className="w-3 h-3 text-emerald-400" />
                    {sourceRow.session}
                  </span>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">
                    Ruang {sourceRoom}
                  </span>
                  <span>•</span>
                  <span className="text-slate-300 truncate max-w-[150px]">
                    {sourceRow.subject}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Subtabs */}
        <div className="flex items-center justify-between gap-2 flex-shrink-0 border-b border-[#202638] pb-2">
          <div className="flex items-center gap-1.5 bg-[#0F121A] p-1 rounded-xl border border-[#222839]">
            <button
              type="button"
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua ({recommendations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('swap')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'swap'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tukar Sesi Silang (1-on-1)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('substitute')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'substitute'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pengganti Bebas (Substitusi)
            </button>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Diurutkan dari yang paling optimal
          </span>
        </div>

        {/* Recommendations List */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-[220px]">
          {filteredRecs.length > 0 ? (
            filteredRecs.map((rec, rIdx) => {
              const isSwap = rec.type === 'swap';

              return (
                <div
                  key={rIdx}
                  className={`bg-[#0F121A] border ${
                    rIdx === 0 ? 'border-amber-500/50 bg-[#161924]' : 'border-[#262E40]'
                  } hover:border-amber-500/60 rounded-xl p-3 sm:p-3.5 space-y-2.5 transition-all shadow-xs`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Teacher Target Info */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        {rec.targetTeacherCode}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs sm:text-sm">
                            {rec.targetTeacherName}
                          </span>
                          {rIdx === 0 && (
                            <span className="px-2 py-0.2 rounded-md bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              Rekomendasi Terbaik
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-bold border ${
                              isSwap
                                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                            }`}
                          >
                            {isSwap ? 'Tukar Sesi Silang' : 'Pengganti Langsung'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                          {rec.reason}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => onApplySwap(rec)}
                      className="self-end sm:self-center px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Terapkan</span>
                    </button>
                  </div>

                  {/* Swap Details Preview */}
                  {isSwap && rec.swapWith && (
                    <div className="bg-[#141824] p-2 rounded-lg border border-[#23293C] text-[10px] text-slate-300 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-400 font-medium">Jadwal yang diambil alih:</span>
                        <span className="font-bold text-white">{rec.swapWith.day}</span>
                        <span className="font-mono text-emerald-300">({rec.swapWith.session})</span>
                        <span className="text-amber-300 font-bold">Ruang {rec.swapWith.room}</span>
                        <span className="text-slate-400 truncate max-w-[140px]">({rec.swapWith.subject})</span>
                      </div>
                      <span className="text-emerald-400 font-bold text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Beban Tetap Imbang
                      </span>
                    </div>
                  )}

                  {/* Load balance preview */}
                  {!isSwap && (
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                      <span>Beban Guru Pengganti: {rec.targetBeforeLoad} sesi ➔ <strong className="text-emerald-300">{rec.targetAfterLoad} sesi</strong></span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-[#0F121A] rounded-xl border border-[#232839] space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs font-bold text-slate-300">
                Tidak ada rekomendasi pertukaran yang valid
              </div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Seluruh guru lainnya mungkin sedang bertugas di jam yang sama (bentrok). Anda bisa mengubah manual atau menambah guru baru.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-[#252C3F] flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <span>*Seluruh rekomendasi dijamin bebas bentrok jam pengawasan.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
