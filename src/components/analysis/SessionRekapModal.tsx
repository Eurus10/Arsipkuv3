import React from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Award,
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { AnalysisSession } from '../../types/analysisTypes';
import { Student } from '../../services/studentStorage';
import { calculateSessionRekap } from '../../services/analysis/analysisCalculationService';
import { exportAnalysisProjectToExcel } from '../../services/analysis/analysisExcelService';
import { useModalNavigation } from '../../utils/modalNavigation';

interface SessionRekapModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AnalysisSession;
  students: Student[];
}

export const SessionRekapModal: React.FC<SessionRekapModalProps> = ({
  isOpen,
  onClose,
  session,
  students,
}) => {
  // Intercept phone back button so modal closes gracefully without leaving web
  useModalNavigation('session-rekap', isOpen, onClose);

  if (!isOpen) return null;

  const sortedStudents = [...students].sort((a, b) =>
    a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
  );

  const rekap = calculateSessionRekap(session, sortedStudents);

  const handleExport = () => {
    exportAnalysisProjectToExcel(session, sortedStudents);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95 sm:items-center sm:justify-center sm:p-4 sm:bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col bg-slate-900 border-0 sm:border sm:border-white/10 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 pt-[max(0.625rem,env(safe-area-inset-top))] bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                  Rekapitulasi Nilai Ujian
                </span>
                <span className="text-[10px] bg-white/5 border border-white/10 text-slate-300 px-2.5 py-0.5 rounded-full">
                  Kelas {session.className} &bull; {session.examType}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Leger & Capaian Hasil Analisis Butir Soal
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)] cursor-pointer transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Unduh Excel Lengkap</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-950/40 border-b border-white/10">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Rata-rata Kelas
            </span>
            <span className="text-xl sm:text-2xl font-black text-sky-300 tabular-nums">
              {rekap.totalClassAverage.toFixed(2)}
            </span>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Siswa Tuntas (&ge; {session.kktp})
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
              {rekap.totalPassedStudents}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {sortedStudents.length}</span>
            </span>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Siswa Remidi (&lt; {session.kktp})
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-400 tabular-nums">
              {rekap.totalFailedStudents}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {sortedStudents.length}</span>
            </span>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Total Mata Pelajaran
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-300 tabular-nums">
              {session.subjects.length} Mapel
            </span>
          </div>
        </div>

        {/* Rekap Table */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="border border-white/10 rounded-2xl overflow-hidden shadow-md bg-slate-950/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 text-slate-200 border-b border-white/10">
                  <th className="py-3 px-3 w-10 text-center font-bold">No</th>
                  <th className="py-3 px-4 min-w-[180px] font-bold">Nama Peserta Didik</th>
                  {session.subjects.map((subj) => (
                    <th
                      key={subj.subjectId}
                      className="py-3 px-3 text-center min-w-[100px] font-bold text-slate-300"
                    >
                      <div className="truncate max-w-[120px]" title={subj.subjectName}>
                        {subj.subjectName}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-24 font-black text-sky-300 bg-sky-500/10">
                    Rata-Rata
                  </th>
                  <th className="py-3 px-3 text-center w-20 font-bold text-emerald-400">
                    Lulus
                  </th>
                  <th className="py-3 px-3 text-center w-20 font-bold text-rose-400">
                    Remidi
                  </th>
                  <th className="py-3 px-3 text-center w-24 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-slate-950/20">
                {rekap.rows.map((row, idx) => {
                  const isPassed = row.overallStatus === 'L';
                  return (
                    <tr key={row.studentId} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white whitespace-nowrap">
                        {row.studentName}
                      </td>
                      {session.subjects.map((subj) => {
                        const grade = row.grades[subj.subjectId];
                        return (
                          <td
                            key={subj.subjectId}
                            className="py-2.5 px-3 text-center tabular-nums"
                          >
                            {grade !== null && grade !== undefined ? (
                              <span
                                className={`font-semibold ${
                                  grade >= session.kktp ? 'text-slate-200' : 'text-rose-400'
                                }`}
                              >
                                {grade.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-center font-black text-sky-300 bg-sky-500/5 tabular-nums">
                        {row.averageGrade.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-emerald-400 font-bold tabular-nums">
                        {row.passedCount}
                      </td>
                      <td className="py-2.5 px-3 text-center text-rose-400 font-bold tabular-nums">
                        {row.failedCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            isPassed
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isPassed ? 'TUNTAS' : 'REMIDI'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Bottom Averages */}
              <tfoot>
                <tr className="bg-white/5 text-slate-200 border-t-2 border-white/10 font-bold">
                  <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                    Rata-rata Nilai Mata Pelajaran:
                  </td>
                  {session.subjects.map((subj) => {
                    const avg = rekap.subjectAverages[subj.subjectId] || 0;
                    return (
                      <td key={subj.subjectId} className="py-3 px-3 text-center text-sky-300 font-mono">
                        {avg > 0 ? avg.toFixed(2) : '-'}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-center text-sky-300 font-black text-sm bg-sky-500/10">
                    {rekap.totalClassAverage.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-black">
                    {rekap.totalPassedStudents}
                  </td>
                  <td className="py-3 px-3 text-center text-rose-400 font-black">
                    {rekap.totalFailedStudents}
                  </td>
                  <td className="py-3 px-3 text-center text-[11px] text-slate-400">
                    {sortedStudents.length > 0
                      ? `${Math.round((rekap.totalPassedStudents / sortedStudents.length) * 100)}% Lulus`
                      : '-'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/[0.03] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <span className="text-xs text-slate-400">
            KKTP Standar: <strong className="text-white">{session.kktp}</strong> &bull; Guru / Walas:{' '}
            <strong className="text-white">{session.teacherName || '-'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
