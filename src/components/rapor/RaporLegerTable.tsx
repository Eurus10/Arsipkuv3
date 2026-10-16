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
  const [sortByRank, setSortByRank] = useState(false);
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
    const sorted = [...list].sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.avg !== a.avg) return b.avg - a.avg;
      return a.student.name.localeCompare(b.student.name);
    });
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
    let list = computedStudents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.student.name.toLowerCase().includes(q) ||
          (item.student.nim && item.student.nim.toLowerCase().includes(q))
      );
    }
    if (sortByRank) {
      return [...list].sort((a, b) => {
        if (a.ranking > 0 && b.ranking > 0) {
          if (a.ranking !== b.ranking) return a.ranking - b.ranking;
          return a.student.name.localeCompare(b.student.name);
        }
        if (a.ranking > 0) return -1;
        if (b.ranking > 0) return 1;
        return a.student.name.localeCompare(b.student.name);
      });
    }
    return list;
  }, [computedStudents, searchQuery, sortByRank]);

  const handleExportExcel = () => {
    exportLegerToExcel(classData, students);
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Rekapitulasi Leger Nilai e-Rapor — Kelas {config.classLevel}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Semester {config.semester === '1' ? 'Ganjil' : 'Genap'} ({config.schoolYear}) • {students.length} Siswa Terdaftar
            {sortByRank && (
              <span className="ml-2 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                Mode Urut Peringkat Aktif
              </span>
            )}
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
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 w-44 transition-all"
            />
          </div>

          {/* Tombol Filter Peringkat */}
          <button
            type="button"
            onClick={() => setSortByRank((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              sortByRank
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title={sortByRank ? 'Kembalikan ke urutan daftar nama siswa' : 'Urutkan siswa berdasarkan peringkat & total nilai'}
          >
            <Trophy className={`w-4 h-4 ${sortByRank ? 'text-amber-500' : 'text-slate-400'}`} />
            <span>{sortByRank ? 'Urut Peringkat (Aktif)' : 'Filter Peringkat'}</span>
            {sortByRank && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          {/* Tombol Download Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title="Download Excel dengan 2 Sheet (Urut Nama & Urut Peringkat)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Leger Matrix Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 sticky top-0 z-20">
                <th className="py-3 px-2 text-center w-9 font-bold sticky left-0 z-30 bg-slate-50">
                  No
                </th>
                <th className="py-3 px-3 min-w-[170px] font-bold sticky left-9 z-30 bg-slate-50 border-r border-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.03)] text-slate-800">
                  Nama Siswa
                </th>
                <th className="py-3 px-2 text-center w-12 font-bold">L/P</th>
                {subjects.map((s) => (
                  <th
                    key={s.id}
                    className="py-3 px-2 text-center font-bold border-l border-slate-200 bg-slate-50 min-w-[65px]"
                    title={s.name}
                  >
                    <span className="text-amber-700 font-extrabold">{s.code}</span>
                  </th>
                ))}
                <th className="py-3 px-2 text-center font-bold text-sky-700 border-l border-slate-200 bg-slate-50 w-16">
                  Jumlah
                </th>
                <th className="py-3 px-2 text-center font-bold text-emerald-700 border-l border-slate-200 bg-slate-50 w-16">
                  Rerata
                </th>
                <th className="py-3 px-2 text-center font-bold text-amber-700 border-l border-slate-200 bg-slate-50 w-14">
                  Rank
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((item, idx) => (
                <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-2.5 px-2 text-center text-slate-600 font-medium sticky left-0 z-10 bg-white group-hover:bg-slate-50">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 sticky left-9 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.03)]">
                    {item.student.name}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-500">
                    {item.student.gender || '-'}
                  </td>
                  {subjects.map((s) => {
                    const sc = item.subjectScores[s.id];
                    return (
                      <td
                        key={s.id}
                        className="py-2.5 px-2 text-center font-semibold border-l border-slate-100"
                      >
                        {typeof sc === 'number' ? (
                          <span
                            className={
                              sc >= config.passingGrade
                                ? 'text-slate-800'
                                : 'text-rose-600 font-bold'
                            }
                          >
                            {sc}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-2 text-center font-bold text-sky-700 border-l border-slate-100 bg-sky-50/30">
                    {item.total > 0 ? item.total : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold text-emerald-700 border-l border-slate-100 bg-emerald-50/30">
                    {item.avg > 0 ? item.avg : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold text-amber-700 border-l border-slate-100 bg-amber-50/30">
                    {item.total > 0 ? (
                      item.ranking === 1 ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-300">
                          🥇 #1
                        </span>
                      ) : item.ranking === 2 ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px] border border-slate-300">
                          🥈 #2
                        </span>
                      ) : item.ranking === 3 ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-extrabold text-[11px] border border-amber-200">
                          🥉 #3
                        </span>
                      ) : (
                        `#${item.ranking}`
                      )
                    ) : (
                      '-'
                    )}
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
