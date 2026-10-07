import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Calendar,
  UserCheck,
  BookOpen,
  ArrowRight,
  Plus,
  X,
  Sparkles,
  ShieldCheck,
  FolderOpen,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { AnalysisSession } from '../../types/analysisTypes';
import { MasterClass } from '../../data/masterExamData';
import { getAllClassSessions } from '../../services/analysis/analysisSessionService';

interface AnalysisSessionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: AnalysisSession | null;
  onSelectSession: (session: AnalysisSession) => void;
  onCreateNewSession: () => void;
  masterClasses: MasterClass[];
}

export const AnalysisSessionManagerModal: React.FC<AnalysisSessionManagerModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  onSelectSession,
  onCreateNewSession,
  masterClasses,
}) => {
  const [sessionsMap, setSessionsMap] = useState<Record<string, AnalysisSession>>({});

  useEffect(() => {
    if (isOpen) {
      const all = getAllClassSessions(true);
      setSessionsMap(all);
    }
  }, [isOpen]);

  const savedSessionsList = useMemo(() => {
    return Object.values(sessionsMap).sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [sessionsMap]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Modal Formal */}
        <div className="px-5 sm:px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-sm">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Pilih &amp; Beralih Sesi Analisis
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Beralih antar kelas yang pernah dibuat tanpa risiko kehilangan data
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Info Banner Keamanan Data */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              <strong className="text-emerald-200">Data Progres Tersimpan Aman:</strong> Seluruh nilai, mata pelajaran, dan konfigurasi butir soal yang telah Anda isi tersimpan otomatis di perangkat dan tidak akan hilang saat beralih sesi.
            </p>
          </div>

          {/* Daftar Riwayat Sesi */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Sesi Kelas Tersimpan ({savedSessionsList.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Klik &quot;Buka Sesi Ini&quot; untuk beralih
              </span>
            </div>

            {savedSessionsList.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <FolderOpen className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-slate-300">Belum Ada Sesi Tersimpan</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Silakan buat sesi analisis pertama Anda dengan menekan tombol buat sesi baru di bawah.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {savedSessionsList.map((item) => {
                  const isCurrent =
                    activeSession &&
                    (activeSession.sessionId === item.sessionId ||
                      activeSession.classId.toLowerCase() === item.classId.toLowerCase());

                  // Total completed student results across all subjects
                  const totalCompletedScores = item.subjects.reduce((acc, subj) => {
                    return acc + Object.keys(subj.studentResults || {}).length;
                  }, 0);

                  return (
                    <div
                      key={item.sessionId || item.classId}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-sky-500/15 border-sky-400/40 ring-1 ring-sky-400/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/90'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-white">
                            Kelas {item.className || item.classId}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/30">
                            {item.examType || 'STS'}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/25 text-sky-300 border border-sky-400/30 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Sedang Aktif
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                          {item.teacherName && (
                            <span className="flex items-center gap-1 text-slate-300">
                              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                              <span>{item.teacherName}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-slate-300">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{item.subjects.length} Mapel</span>
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <span>{totalCompletedScores} Nilai Terisi</span>
                          </span>
                        </div>

                        {item.subjects.length > 0 && (
                          <div className="text-[11px] text-slate-400 truncate max-w-md">
                            Mapel: {item.subjects.map((s) => s.subjectName).join(', ')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {!isCurrent ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSession(item);
                              onClose();
                            }}
                            className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 active:scale-95 border border-sky-400/35 text-sky-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <span>Buka Sesi Ini</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-bold text-sky-300 bg-sky-500/10 rounded-lg">
                            Sesi Terpilih
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Opsi Buat Sesi Baru */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-white">Ingin Menganalisis Kelas Baru?</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sesi kelas aktif saat ini tetap tersimpan aman di riwayat dan dapat dibuka kembali.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onCreateNewSession();
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/15 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-sky-300" />
              <span>+ Konfigurasi Sesi Baru</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-all"
          >
            Tutup (Tetap di Sesi Saat Ini)
          </button>
        </div>
      </div>
    </div>
  );
};
