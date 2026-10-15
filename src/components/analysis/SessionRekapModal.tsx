import React, { useMemo } from 'react';
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

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) =>
      a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
    );
  }, [students]);

  const rekap = useMemo(() => {
    if (!isOpen) return null;
    return calculateSessionRekap(session, sortedStudents);
  }, [isOpen, session, sortedStudents]);

  if (!isOpen || !rekap) return null;

  const handleExport = () => {
    exportAnalysisProjectToExcel(session, sortedStudents);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-900/60 sm:items-center sm:justify-center sm:p-4 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col bg-white border-0 sm:border sm:border-slate-200/90 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden font-sans text-slate-800">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 pt-[max(0.625rem,env(safe-area-inset-top))] bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-amber-700 font-bold">
                  Rekapitulasi Nilai Ujian
                </span>
                <span className="text-[10px] bg-slate-200/70 border border-slate-300 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                  Kelas {session.className} &bull; {session.examType}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Leger &amp; Capaian Hasil Analisis Butir Soal
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-98 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              <span className="hidden sm:inline">Unduh Excel Lengkap</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-white border-b border-slate-200/80">
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[10px] text-sky-700 uppercase tracking-wider font-bold block">
              Rata-rata Kelas
            </span>
            <span className="text-xl sm:text-2xl font-black text-sky-800 tabular-nums">
              {rekap.totalClassAverage.toFixed(2)}
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold block">
              Siswa Tuntas (&ge; {session.kktp})
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 tabular-nums">
              {rekap.totalPassedStudents}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {sortedStudents.length}</span>
            </span>
          </div>

          <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[10px] text-rose-700 uppercase tracking-wider font-bold block">
              Siswa Remidi (&lt; {session.kktp})
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-800 tabular-nums">
              {rekap.totalFailedStudents}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {sortedStudents.length}</span>
            </span>
          </div>

          <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[10px] text-purple-700 uppercase tracking-wider font-bold block">
              Total Mata Pelajaran
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-800 tabular-nums">
              {session.subjects.length} Mapel
            </span>
          </div>
        </div>

        {/* Rekap Table */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/40">
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200/90 font-bold">
                  <th className="py-3 px-3 w-10 text-center font-bold">No</th>
                  <th className="py-3 px-4 min-w-[180px] font-bold">Nama Peserta Didik</th>
                  {session.subjects.map((subj) => (
                    <th
                      key={subj.subjectId}
                      className="py-3 px-3 text-center min-w-[100px] font-bold text-slate-700"
                    >
                      <div className="truncate max-w-[120px]" title={subj.subjectName}>
                        {subj.subjectName}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-24 font-black text-sky-800 bg-sky-50">
                    Rata-Rata
                  </th>
                  <th className="py-3 px-3 text-center w-20 font-bold text-emerald-700">
                    Lulus
                  </th>
                  <th className="py-3 px-3 text-center w-20 font-bold text-rose-700">
                    Remidi
                  </th>
                  <th className="py-3 px-3 text-center w-24 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rekap.rows.map((row, idx) => {
                  const isPassed = row.overallStatus === 'L';
                  return (
                    <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800 whitespace-nowrap">
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
                                  grade >= session.kktp ? 'text-slate-800' : 'text-rose-600 font-bold'
                                }`}
                              >
                                {grade.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-center font-black text-sky-700 bg-sky-50/50 tabular-nums">
                        {row.averageGrade.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold tabular-nums">
                        {row.passedCount}
                      </td>
                      <td className="py-2.5 px-3 text-center text-rose-700 font-bold tabular-nums">
                        {row.failedCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
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
                <tr className="bg-slate-100/90 text-slate-800 border-t-2 border-slate-200 font-bold">
                  <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                    Rata-rata Nilai Mata Pelajaran:
                  </td>
                  {session.subjects.map((subj) => {
                    const avg = rekap.subjectAverages[subj.subjectId] || 0;
                    return (
                      <td key={subj.subjectId} className="py-3 px-3 text-center text-sky-800 font-mono">
                        {avg > 0 ? avg.toFixed(2) : '-'}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-center text-sky-800 font-black text-sm bg-sky-100/60">
                    {rekap.totalClassAverage.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-700 font-black">
                    {rekap.totalPassedStudents}
                  </td>
                  <td className="py-3 px-3 text-center text-rose-700 font-black">
                    {rekap.totalFailedStudents}
                  </td>
                  <td className="py-3 px-3 text-center text-[11px] text-slate-600 font-bold">
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
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-50/90 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <span className="text-xs text-slate-600">
            KKTP Standar: <strong className="text-slate-800">{session.kktp}</strong> &bull; Guru / Walas:{' '}
            <strong className="text-slate-800">{session.teacherName || '-'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
