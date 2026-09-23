import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Trophy,
  Award,
  Sparkles,
} from 'lucide-react';
import { RaporStsClassData } from '../../types/raporSts';
import { Student } from '../../services/studentStorage';
import { exportLegerToExcel } from '../../services/raporStsService';

interface RaporLegerTableProps {
  classData: RaporStsClassData;
  students: Student[];
}

export const RaporLegerTable: React.FC<RaporLegerTableProps> = ({
  classData,
  students,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { config, subjects, subjectRecords, additionalInfo } = classData;

  // Compute calculated values and rankings for each student
  const computedStudents = useMemo(() => {
    const list = students.map((st, idx) => {
      let total = 0;
      let count = 0;
      const subjectScores: Record<string, number | null> = {};

      subjects.forEach((subj) => {
        const score = subjectRecords[subj.id]?.scores[st.id]?.finalScore ?? null;
        subjectScores[subj.id] = score;
        if (typeof score === 'number' && !isNaN(score)) {
          total += score;
          count++;
        }
      });

      const avg = count > 0 ? parseFloat((total / count).toFixed(1)) : 0;

      return {
        student: st,
        originalIndex: idx + 1,
        subjectScores,
        total,
        avg,
      };
    });

    // Rank by total score descending
    const sorted = [...list].sort((a, b) => b.total - a.total);
    const rankMap: Record<string, number> = {};
    sorted.forEach((item, index) => {
      rankMap[item.student.id] = index + 1;
    });

    return list.map((item) => ({
      ...item,
      ranking: rankMap[item.student.id] || 0,
    }));
  }, [students, subjects, subjectRecords]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return computedStudents;
    const q = searchQuery.toLowerCase().trim();
    return computedStudents.filter(
      (item) =>
        item.student.name.toLowerCase().includes(q) ||
        (item.student.nim && item.student.nim.toLowerCase().includes(q))
    );
  }, [computedStudents, searchQuery]);

  const handleExportExcel = () => {
    exportLegerToExcel(classData, students);
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Rekapitulasi Leger Nilai e-Rapor — Kelas {config.classLevel}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Semester {config.semester === '1' ? 'Ganjil' : 'Genap'} ({config.schoolYear}) • {students.length} Siswa Terdaftar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-44"
            />
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Leger Matrix Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
        <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 sticky top-0 z-20">
                <th className="py-3 px-2 text-center w-8 font-bold">No</th>
                <th className="py-3 px-3 min-w-[150px] font-bold">Nama Siswa</th>
                <th className="py-3 px-2 text-center w-12 font-bold">L/P</th>
                {subjects.map((s) => (
                  <th
                    key={s.id}
                    className="py-3 px-2 text-center font-bold border-l border-slate-800/80 bg-slate-950/90 min-w-[65px]"
                    title={s.name}
                  >
                    <span className="text-amber-400 font-extrabold">{s.code}</span>
                  </th>
                ))}
                <th className="py-3 px-2 text-center font-black text-sky-400 border-l border-slate-800 bg-slate-950/90 w-16">
                  Jumlah
                </th>
                <th className="py-3 px-2 text-center font-black text-emerald-400 border-l border-slate-800 bg-slate-950/90 w-16">
                  Rerata
                </th>
                <th className="py-3 px-2 text-center font-black text-amber-300 border-l border-slate-800 bg-slate-950/90 w-12">
                  Rank
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredList.map((item, idx) => (
                <tr key={item.student.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-2 text-center text-slate-400 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white">
                    {item.student.name}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-400">
                    {item.student.gender || '-'}
                  </td>
                  {subjects.map((s) => {
                    const sc = item.subjectScores[s.id];
                    return (
                      <td
                        key={s.id}
                        className="py-2.5 px-2 text-center font-semibold border-l border-slate-800/40"
                      >
                        {typeof sc === 'number' ? (
                          <span
                            className={
                              sc >= config.passingGrade
                                ? 'text-slate-200'
                                : 'text-rose-400 font-bold'
                            }
                          >
                            {sc}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-2 text-center font-bold text-sky-300 border-l border-slate-800/60 bg-sky-950/10">
                    {item.total > 0 ? item.total : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-center font-black text-emerald-300 border-l border-slate-800/60 bg-emerald-950/10">
                    {item.avg > 0 ? item.avg : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-center font-black text-amber-300 border-l border-slate-800/60 bg-amber-950/10">
                    {item.total > 0 ? `#${item.ranking}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
