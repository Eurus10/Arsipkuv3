import React, { useMemo } from 'react';
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

  const stats = useMemo(() => {
    if (!isOpen) return null;
    return calculateSubjectSummaryStats(subject, students, session.kktp);
  }, [isOpen, subject, students, session.kktp]);

  if (!isOpen || !stats) return null;

  const handleExportSingle = () => {
    exportSingleSubjectToExcel(session, subject, students);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-900/60 sm:items-center sm:justify-center sm:p-4 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col bg-white border-0 sm:border sm:border-slate-200/90 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden font-sans text-slate-800">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 pt-[max(0.625rem,env(safe-area-inset-top))] bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600 shadow-xs shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-sky-700 font-bold">
                  {subject.subjectName}
                </span>
                <span className="text-[10px] bg-slate-200/70 border border-slate-300 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                  Kelas {session.className} &bull; Guru: {subject.teacherName || session.teacherName || '-'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Statistik &amp; Analisis Butir Soal
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportSingle}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Unduh Excel Khusus Mapel Ini"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Ekspor Excel Mapel</span>
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

        {/* Stats Grid Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-white border-b border-slate-200/80">
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[10px] text-sky-700 uppercase tracking-wider font-bold block">
              Nilai Rata-rata
            </span>
            <span className="text-xl sm:text-2xl font-black text-sky-800 tabular-nums">
              {stats.averageGrade.toFixed(2)}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
              Tertinggi / Terendah
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-800 tabular-nums">
              <span className="text-emerald-700">{stats.highestGrade}</span> /{' '}
              <span className="text-rose-700">{stats.lowestGrade}</span>
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold block">
              Tingkat Kelulusan
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 tabular-nums">
              {stats.passedPercentage}%
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
              Status Input Data
            </span>
            <span className="text-sm sm:text-base font-black text-slate-800 mt-1 block">
              {stats.completedStudents} / {stats.totalStudents} Siswa
            </span>
          </div>
        </div>

        {/* Item Analysis List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 overscroll-contain bg-slate-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              Tingkat Daya Serap per Nomor Soal
            </h4>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> &gt; 70% (Mudah/Tercapai)
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> 50-70% (Sedang)
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> &lt; 50% (Sulit/Perlu Remidi)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {stats.itemAnalysis.map((item) => {
              const pct = item.percentage;
              let barColor = 'bg-emerald-500';
              let textColor = 'text-emerald-700';
              if (pct < 50) {
                barColor = 'bg-rose-500';
                textColor = 'text-rose-700';
              } else if (pct <= 70) {
                barColor = 'bg-amber-500';
                textColor = 'text-amber-700';
              }

              return (
                <div
                  key={item.label}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/90 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800">{item.label}</span>
                      <span className={`text-xs font-black tabular-nums ${textColor}`}>
                        {item.correctCount} Siswa ({pct}%)
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
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
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-50/90 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <span className="text-xs text-slate-600">
            KKTP: <strong className="text-slate-800">{session.kktp}</strong> &bull; Skor Maksimal:{' '}
            <strong className="text-slate-800">{subject.maxScore}</strong>
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
