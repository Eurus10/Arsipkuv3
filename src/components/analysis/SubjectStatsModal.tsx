import React from 'react';
import {
  X,
  BarChart3,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  AnalysisSubject,
  AnalysisSession,
} from '../../types/analysisTypes';
import { Student } from '../../services/studentStorage';
import { calculateSubjectSummaryStats } from '../../services/analysis/analysisCalculationService';
import { exportSingleSubjectToExcel } from '../../services/analysis/analysisExcelService';
import { useModalNavigation } from '../../utils/modalNavigation';

interface SubjectStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AnalysisSession;
  subject: AnalysisSubject;
  students: Student[];
}

export const SubjectStatsModal: React.FC<SubjectStatsModalProps> = ({
  isOpen,
  onClose,
  session,
  subject,
  students,
}) => {
  // Intercept phone back button so modal closes gracefully without leaving web
  useModalNavigation('subject-stats', isOpen, onClose);

  if (!isOpen) return null;

  const stats = calculateSubjectSummaryStats(subject, students, session.kktp);

  const handleExportSingle = () => {
    exportSingleSubjectToExcel(session, subject, students);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95 sm:items-center sm:justify-center sm:p-4 sm:bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col bg-slate-900 border-0 sm:border sm:border-white/10 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 pt-[max(0.625rem,env(safe-area-inset-top))] bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.15)] shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-sky-400 font-bold">
                  {subject.subjectName}
                </span>
                <span className="text-[10px] bg-white/5 border border-white/10 text-slate-300 px-2.5 py-0.5 rounded-full">
                  Kelas {session.className} &bull; Guru: {subject.teacherName || session.teacherName || '-'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Statistik & Analisis Butir Soal
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportSingle}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Unduh Excel Khusus Mapel Ini"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Ekspor Excel Mapel</span>
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

        {/* Stats Grid Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-950/40 border-b border-white/10">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Nilai Rata-rata
            </span>
            <span className="text-xl sm:text-2xl font-black text-sky-300 tabular-nums">
              {stats.averageGrade.toFixed(2)}
            </span>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Tertinggi / Terendah
            </span>
            <span className="text-lg sm:text-xl font-black text-white tabular-nums">
              <span className="text-emerald-400">{stats.highestGrade}</span> /{' '}
              <span className="text-rose-400">{stats.lowestGrade}</span>
            </span>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Tingkat Kelulusan
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
              {stats.passedPercentage}%
            </span>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Status Input Data
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-200 mt-1 block">
              {stats.completedStudents} / {stats.totalStudents} Siswa
            </span>
          </div>
        </div>

        {/* Item Analysis List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 overscroll-contain">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              Tingkat Daya Serap per Nomor Soal
            </h4>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> &gt; 70% (Mudah/Tercapai)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> 50-70% (Sedang)
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> &lt; 50% (Sulit/Perlu Remidi)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {stats.itemAnalysis.map((item) => {
              const pct = item.percentage;
              let barColor = 'bg-emerald-500';
              let textColor = 'text-emerald-400';
              if (pct < 50) {
                barColor = 'bg-rose-500';
                textColor = 'text-rose-400';
              } else if (pct <= 70) {
                barColor = 'bg-amber-500';
                textColor = 'text-amber-400';
              }

              return (
                <div
                  key={item.label}
                  className="p-3.5 rounded-xl bg-slate-950/40 border border-white/10 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-200">{item.label}</span>
                      <span className={`text-xs font-black tabular-nums ${textColor}`}>
                        {item.correctCount} Siswa ({pct}%)
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/[0.03] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <span className="text-xs text-slate-400">
            KKTP: <strong className="text-white">{session.kktp}</strong> &bull; Skor Maksimal:{' '}
            <strong className="text-white">{subject.maxScore}</strong>
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
