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
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { AnalysisSession } from '../../types/analysisTypes';
import { MasterClass } from '../../data/masterExamData';
import {
  getAllClassSessions,
  deleteClassSession,
} from '../../services/analysis/analysisSessionService';

interface AnalysisSessionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: AnalysisSession | null;
  onSelectSession: (session: AnalysisSession) => void;
  onCreateNewSession: () => void;
  onSessionDeleted?: (session: AnalysisSession) => void;
  masterClasses: MasterClass[];
}

export const AnalysisSessionManagerModal: React.FC<AnalysisSessionManagerModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  onSelectSession,
  onCreateNewSession,
  onSessionDeleted,
  masterClasses,
}) => {
  const [sessionsMap, setSessionsMap] = useState<Record<string, AnalysisSession>>({});
  const [sessionToDelete, setSessionToDelete] = useState<AnalysisSession | null>(null);

  useEffect(() => {
    if (isOpen) {
      const all = getAllClassSessions(true);
      setSessionsMap(all);
    }
  }, [isOpen]);

  const handleConfirmDelete = (session: AnalysisSession) => {
    deleteClassSession(session.classId, session.sessionId);
    onSessionDeleted?.(session);
    const updated = getAllClassSessions(true);
    setSessionsMap(updated);
    setSessionToDelete(null);
  };

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
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xl text-slate-800 flex flex-col max-h-[90vh] overflow-hidden font-sans">
        {/* Header Modal Formal */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600 shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Pilih &amp; Beralih Sesi Analisis
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Beralih antar kelas yang pernah dibuat tanpa risiko kehilangan data
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-white">
          {/* Info Banner Keamanan Data */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-900 leading-relaxed">
              <strong className="text-emerald-950 font-bold">Data Progres Tersimpan Aman:</strong> Seluruh nilai, mata pelajaran, dan konfigurasi butir soal yang telah Anda isi tersimpan otomatis di perangkat dan tidak akan hilang saat beralih sesi.
            </p>
          </div>

          {/* Daftar Riwayat Sesi */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Sesi Kelas Tersimpan ({savedSessionsList.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Klik &quot;Buka Sesi Ini&quot; untuk beralih
              </span>
            </div>

            {savedSessionsList.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Belum Ada Sesi Tersimpan</p>
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
                          ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-300/50 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900">
                            Kelas {item.className || item.classId}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200">
                            {item.examType || 'STS'}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-sky-600" />
                              Sedang Aktif
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                          {item.teacherName && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>{item.teacherName}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-slate-700">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{item.subjects.length} Mapel</span>
                          </span>
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <span>{totalCompletedScores} Nilai Terisi</span>
                          </span>
                        </div>

                        {item.subjects.length > 0 && (
                          <div className="text-[11px] text-slate-500 truncate max-w-md">
                            Mapel: {item.subjects.map((s) => s.subjectName).join(', ')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionToDelete(item);
                          }}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/90 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          title={`Hapus sesi Kelas ${item.className || item.classId} (${item.examType}) dari memori`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {!isCurrent ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSession(item);
                              onClose();
                            }}
                            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          >
                            <span>Buka Sesi Ini</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-100 rounded-lg">
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
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-slate-900">Ingin Menganalisis Kelas Baru?</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sesi kelas aktif saat ini tetap tersimpan aman di riwayat dan dapat dibuka kembali.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onCreateNewSession();
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-slate-100 active:scale-95 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-sky-600" />
              <span>+ Konfigurasi Sesi Baru</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all shadow-xs"
          >
            Tutup (Tetap di Sesi Saat Ini)
          </button>
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Sesi Kelas */}
      {sessionToDelete && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSessionToDelete(null);
          }}
        >
          <div className="w-full max-w-md bg-white border border-rose-200 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-800 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Hapus Sesi Kelas {sessionToDelete.className || sessionToDelete.classId}?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Sesi ujian <strong className="text-slate-800 font-bold">{sessionToDelete.examType}</strong> untuk kelas{' '}
                  <strong className="text-slate-800 font-bold">{sessionToDelete.className || sessionToDelete.classId}</strong>{' '}
                  beserta <strong className="text-slate-800 font-bold">{sessionToDelete.subjects?.length || 0} mata pelajaran</strong>{' '}
                  akan dihapus permanen dari memori browser lokal perangkat ini.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Pastikan Anda telah mengunduh berkas Excel rekap jika data nilai masih diperlukan.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(sessionToDelete)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
