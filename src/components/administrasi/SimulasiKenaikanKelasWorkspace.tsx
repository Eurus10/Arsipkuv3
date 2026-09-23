import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shuffle,
  Lock,
  Unlock,
  CheckCircle2,
  Download,
  RotateCcw,
  Sparkles,
  Radio,
  Filter,
  Search,
  Tag,
  ArrowUpDown,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';
import { updateStudent, type Student } from '../../services/studentStorage';
import { StudentCriteriaModal, type StudentCriteria } from './StudentCriteriaModal';
import * as XLSX from 'xlsx';

interface SimulasiKenaikanKelasWorkspaceProps {
  studentsList: Student[];
  onBack: () => void;
}

const CRITERIA_STORAGE_KEY = 'sdit_simulasi_student_criteria';
const AVAILABLE_ROMBEL_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const SimulasiKenaikanKelasWorkspace: React.FC<SimulasiKenaikanKelasWorkspaceProps> = ({
  studentsList,
  onBack,
}) => {
  // Hanya kelas 1 sampai 4 yang naik kelas dengan pengacakan/pemetaan (kelas 5 ke 6 tidak diacak)
  const [sourceGrade, setSourceGrade] = useState<'1' | '2' | '3' | '4'>('1');
  
  // Target rombel checkboxes (e.g. ['A', 'B', 'C'])
  const [selectedRombelLetters, setSelectedRombelLetters] = useState<string[]>(['A', 'B', 'C']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [criteriaFilter, setCriteriaFilter] = useState<
    'all' | 'ranked' | 'learning' | 'financial' | 'separation' | 'any_flag'
  >('all');
  const [sortOrder, setSortOrder] = useState<'default' | 'name-asc' | 'name-desc'>('default');

  // Criteria Modal State & Storage
  const [criteriaMap, setCriteriaMap] = useState<Record<string, StudentCriteria>>(() => {
    try {
      const raw = localStorage.getItem(CRITERIA_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [selectedStudentForCriteria, setSelectedStudentForCriteria] = useState<Student | null>(null);

  // Target Grade number (e.g., '1' -> 2, '2' -> 3, '3' -> 4, '4' -> 5)
  const targetGradeNum = Number(sourceGrade) + 1;

  // Save criteria map to localStorage
  const handleSaveCriteria = (studentId: string, updatedCriteria: StudentCriteria) => {
    setCriteriaMap((prev) => {
      const next = { ...prev, [studentId]: updatedCriteria };
      try {
        localStorage.setItem(CRITERIA_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save criteria to local storage', err);
      }
      return next;
    });
  };

  // Source students from selected grade
  const sourceStudents = useMemo(() => {
    return studentsList.filter((s) => s.classId.startsWith(sourceGrade));
  }, [studentsList, sourceGrade]);

  // Target rombel names (e.g. ['2A', '2B', '2C'])
  const targetRombels = useMemo(() => {
    const letters = selectedRombelLetters.length > 0 ? selectedRombelLetters : ['A'];
    return letters.map((l) => `${targetGradeNum}${l}`);
  }, [targetGradeNum, selectedRombelLetters]);

  // Rombel Mapping: { rombelName -> studentId[] }
  const [rombelMap, setRombelMap] = useState<Record<string, string[]>>({});
  // Locked students map: { studentId -> boolean }
  const [lockedStudents, setLockedStudents] = useState<Record<string, boolean>>({});

  // Toggle Rombel Letter Checkbox (A, B, C, D, E)
  const handleToggleRombelLetter = (letter: string) => {
    setSelectedRombelLetters((prev) => {
      if (prev.includes(letter)) {
        if (prev.length <= 1) return prev; // Minimal 1 rombel terpilih
        return prev.filter((l) => l !== letter);
      } else {
        return [...prev, letter].sort();
      }
    });
  };

  // Intelligent distribution & auto-balance algorithm
  const handleAutoBalance = () => {
    if (targetRombels.length === 0 || sourceStudents.length === 0) return;

    const newMap: Record<string, string[]> = {};
    targetRombels.forEach((r) => (newMap[r] = []));

    // Keep locked students in their assigned rombels if the rombel still exists
    Object.entries(rombelMap).forEach(([rombel, stIds]) => {
      stIds.forEach((id) => {
        if (lockedStudents[id] && newMap[rombel]) {
          newMap[rombel].push(id);
        }
      });
    });

    // Unlocked students only
    const unlocked = sourceStudents.filter((s) => !lockedStudents[s.id]);

    const placedStudentIds = new Set<string>();

    // Helper: Find rombel with minimum student count
    const getLeastFilledRombel = (excludeRombels: string[] = []): string => {
      let minRombel = targetRombels[0];
      let minCount = Infinity;

      for (const r of targetRombels) {
        if (excludeRombels.includes(r)) continue;
        const count = newMap[r].length;
        if (count < minCount) {
          minCount = count;
          minRombel = r;
        }
      }
      return minRombel;
    };

    // Step A: Handle students with separation constraints first
    const separationStudents = unlocked.filter((s) => {
      const crit = criteriaMap[s.id];
      return crit?.needsSeparation && (crit.separateFromStudentIds?.length || 0) > 0;
    });

    // Process separation rules
    separationStudents.forEach((st) => {
      if (placedStudentIds.has(st.id)) return;
      const crit = criteriaMap[st.id];
      const separatedTargetIds = crit?.separateFromStudentIds || [];

      // Find rombels where separated partners are already placed
      const forbiddenRombels: string[] = [];
      separatedTargetIds.forEach((partnerId) => {
        Object.entries(newMap).forEach(([rombel, ids]) => {
          if (ids.includes(partnerId) && !forbiddenRombels.includes(rombel)) {
            forbiddenRombels.push(rombel);
          }
        });
      });

      const chosenRombel = getLeastFilledRombel(forbiddenRombels);
      newMap[chosenRombel].push(st.id);
      placedStudentIds.add(st.id);
    });

    // Step B: Distribute students with ANY barriers (Financial SPP, Learning issue, Medical) evenly across rombels
    // Helper to count barriers already placed in a rombel
    const getRombelBarrierCount = (rombel: string): number => {
      return newMap[rombel].filter((id) => {
        const c = criteriaMap[id];
        return c?.hasFinancialIssue || c?.hasLearningIssue || c?.hasMedicalIssue;
      }).length;
    };

    // Sub-Step B1: Siswa dengan kendala biaya SPP (diprioritaskan agar terdistribusi merata per rombel)
    const financialIssueStudents = unlocked
      .filter((s) => !placedStudentIds.has(s.id) && criteriaMap[s.id]?.hasFinancialIssue)
      .sort(() => Math.random() - 0.5);

    financialIssueStudents.forEach((st) => {
      // Cari rombel dengan jumlah kendala SPP paling sedikit, jika sama cari rombel paling sedikit total siswa
      const targetRombel = [...targetRombels].sort((a, b) => {
        const sppA = newMap[a].filter((id) => criteriaMap[id]?.hasFinancialIssue).length;
        const sppB = newMap[b].filter((id) => criteriaMap[id]?.hasFinancialIssue).length;
        if (sppA !== sppB) return sppA - sppB;
        return newMap[a].length - newMap[b].length;
      })[0];

      newMap[targetRombel].push(st.id);
      placedStudentIds.add(st.id);
    });

    // Sub-Step B2: Siswa dengan hambatan belajar / kebutuhan khusus lainnya (didistribusikan merata)
    const otherBarrierStudents = unlocked
      .filter((s) => {
        if (placedStudentIds.has(s.id)) return false;
        const c = criteriaMap[s.id];
        return c?.hasLearningIssue || c?.hasMedicalIssue;
      })
      .sort(() => Math.random() - 0.5);

    otherBarrierStudents.forEach((st) => {
      const targetRombel = [...targetRombels].sort((a, b) => {
        const barrierA = getRombelBarrierCount(a);
        const barrierB = getRombelBarrierCount(b);
        if (barrierA !== barrierB) return barrierA - barrierB;
        return newMap[a].length - newMap[b].length;
      })[0];

      newMap[targetRombel].push(st.id);
      placedStudentIds.add(st.id);
    });

    // Step C: Distribute high achievers (Rank 1-3, Top 10, Achievers) evenly
    const achieverStudents = unlocked
      .filter((s) => {
        if (placedStudentIds.has(s.id)) return false;
        const c = criteriaMap[s.id];
        return c?.isRank1To3 || c?.isTop10 || c?.isAchiever || (c?.customRank && c.customRank <= 10);
      })
      .sort(() => Math.random() - 0.5);

    achieverStudents.forEach((st) => {
      // Cari rombel dengan achiever paling sedikit
      const targetRombel = [...targetRombels].sort((a, b) => {
        const achA = newMap[a].filter((id) => {
          const c = criteriaMap[id];
          return c?.isRank1To3 || c?.isTop10 || c?.isAchiever || (c?.customRank && c.customRank <= 10);
        }).length;
        const achB = newMap[b].filter((id) => {
          const c = criteriaMap[id];
          return c?.isRank1To3 || c?.isTop10 || c?.isAchiever || (c?.customRank && c.customRank <= 10);
        }).length;
        if (achA !== achB) return achA - achB;
        return newMap[a].length - newMap[b].length;
      })[0];

      newMap[targetRombel].push(st.id);
      placedStudentIds.add(st.id);
    });

    // Step D: Distribute remaining students evenly
    const remainingStudents = unlocked
      .filter((s) => !placedStudentIds.has(s.id))
      .sort(() => Math.random() - 0.5);

    remainingStudents.forEach((st) => {
      const chosenRombel = getLeastFilledRombel();
      newMap[chosenRombel].push(st.id);
      placedStudentIds.add(st.id);
    });

    setRombelMap(newMap);
  };

  // Run initial distribution on mount or when sourceGrade/targetRombels change
  useEffect(() => {
    handleAutoBalance();
  }, [sourceGrade, selectedRombelLetters.join(','), sourceStudents.length]);

  const toggleLock = (studentId: string) => {
    setLockedStudents((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const moveStudent = (studentId: string, toRombel: string) => {
    setRombelMap((prev) => {
      const nextMap: Record<string, string[]> = {};
      Object.keys(prev).forEach((r) => {
        nextMap[r] = prev[r].filter((id) => id !== studentId);
      });
      if (nextMap[toRombel]) {
        nextMap[toRombel].push(studentId);
      }
      return nextMap;
    });
  };

  // Official promotion commit to Student Database
  const handleCommitPromotion = async () => {
    if (!window.confirm('Apakah Anda yakin ingin meresmikan pembagian rombel ini ke Database Siswa Utama?')) return;
    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      let count = 0;
      for (const [rombel, studentIds] of Object.entries(rombelMap)) {
        for (const stId of studentIds) {
          const st = studentsList.find((s) => s.id === stId);
          if (st) {
            await updateStudent(stId, { name: st.name, classId: rombel });
            count++;
          }
        }
      }
      setSuccessMsg(`Berhasil meresmikan ${count} siswa ke rombel kelas baru!`);
    } catch (err: any) {
      alert('Gagal memperbarui rombel: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Rombel to Excel (including criteria & ranking notes)
  const handleExportRombelExcel = () => {
    const wb = XLSX.utils.book_new();

    Object.entries(rombelMap).forEach(([rombel, studentIds]) => {
      const rows = studentIds.map((stId, idx) => {
        const st = studentsList.find((s) => s.id === stId);
        const crit = criteriaMap[stId];

        // Format criteria labels
        const flags: string[] = [];
        if (crit?.isRank1To3) flags.push('Rank 1-3');
        if (crit?.isTop10) flags.push('Top 10');
        if (crit?.isAchiever) flags.push('Juara/Prestasi');
        if (crit?.customRank) flags.push(`Rank ${crit.customRank}`);

        const issues: string[] = [];
        if (crit?.hasLearningIssue) issues.push('Hambatan Belajar');
        if (crit?.hasFinancialIssue) issues.push('Kendala SPP/Biaya');
        if (crit?.hasMedicalIssue) issues.push('Perhatian Medis');
        if (crit?.needsSeparation && crit.separateFromStudentIds?.length) {
          const partnerNames = crit.separateFromStudentIds
            .map((pid) => studentsList.find((s) => s.id === pid)?.name)
            .filter(Boolean)
            .join(', ');
          issues.push(`Pisah Rombel dg: ${partnerNames}`);
        }

        return {
          No: idx + 1,
          'Nama Siswa': st?.name || '-',
          'Kelas Asal': st?.classId || '-',
          'Rombel Baru': rombel,
          'Peringkat / Prestasi': flags.join(', ') || '-',
          'Hambatan / Kriteria Khusus': issues.join(', ') || '-',
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `Kelas ${rombel}`);
    });

    XLSX.writeFile(wb, `Simulasi_Kenaikan_Kelas_Tingkat_${targetGradeNum}.xlsx`);
  };

  // Helper to filter and sort students for display in each rombel
  const getFilteredStudentIds = (studentIds: string[]) => {
    let filtered = studentIds.map((id) => {
      const st = studentsList.find((s) => s.id === id);
      return { id, student: st, criteria: criteriaMap[id] };
    });

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.student?.name.toLowerCase().includes(q) ||
          item.student?.classId.toLowerCase().includes(q)
      );
    }

    // Criteria filter
    if (criteriaFilter === 'ranked') {
      filtered = filtered.filter(
        (item) =>
          item.criteria?.isRank1To3 ||
          item.criteria?.isTop10 ||
          item.criteria?.isAchiever ||
          item.criteria?.customRank
      );
    } else if (criteriaFilter === 'learning') {
      filtered = filtered.filter((item) => item.criteria?.hasLearningIssue);
    } else if (criteriaFilter === 'financial') {
      filtered = filtered.filter((item) => item.criteria?.hasFinancialIssue);
    } else if (criteriaFilter === 'separation') {
      filtered = filtered.filter((item) => item.criteria?.needsSeparation);
    } else if (criteriaFilter === 'any_flag') {
      filtered = filtered.filter(
        (item) =>
          item.criteria?.isRank1To3 ||
          item.criteria?.isTop10 ||
          item.criteria?.isAchiever ||
          item.criteria?.customRank ||
          item.criteria?.hasLearningIssue ||
          item.criteria?.hasFinancialIssue ||
          item.criteria?.hasMedicalIssue ||
          item.criteria?.needsSeparation ||
          Boolean(item.criteria?.notes?.trim())
      );
    }

    // Sorting A-Z / Z-A
    if (sortOrder === 'name-asc') {
      filtered.sort((a, b) => (a.student?.name || '').localeCompare(b.student?.name || ''));
    } else if (sortOrder === 'name-desc') {
      filtered.sort((a, b) => (b.student?.name || '').localeCompare(a.student?.name || ''));
    }

    return filtered.map((f) => f.id);
  };

  // Check separation conflicts for a given rombel
  const getSeparationConflictsInRombel = (studentIds: string[]): { stAId: string; stBId: string }[] => {
    const conflicts: { stAId: string; stBId: string }[] = [];
    const studentIdSet = new Set(studentIds);

    studentIds.forEach((stId) => {
      const crit = criteriaMap[stId];
      if (crit?.needsSeparation && crit.separateFromStudentIds) {
        crit.separateFromStudentIds.forEach((partnerId) => {
          if (studentIdSet.has(partnerId) && stId < partnerId) {
            conflicts.push({ stAId: stId, stBId: partnerId });
          }
        });
      }
    });

    return conflicts;
  };

  const isFilterActive = searchQuery.trim() !== '' || criteriaFilter !== 'all' || sortOrder !== 'default';

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="bg-gradient-to-r from-indigo-950 via-[#13192B] to-purple-950 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Shuffle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white">Simulasi Kenaikan Kelas &amp; Pemetaan Rombel</h1>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Simulasi pemetaan kenaikan kelas (Tingkat 1 sampai 4) dengan pilihan rombel instan, sortir nama, dan penandaan kriteria khusus siswa.
              </p>
            </div>
          </div>

          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer self-start md:self-auto"
          >
            ← Kembali ke Administrasi
          </button>
        </div>

        {/* Primary Filter Controls */}
        <div className="mt-5 pt-4 border-t border-indigo-500/20 grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Tingkat Kelas Asal (Hanya 1-4) */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tingkat Kelas Asal</label>
            <select
              value={sourceGrade}
              onChange={(e) => setSourceGrade(e.target.value as any)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 outline-none"
            >
              <option value="1">Tingkat 1 (Lulus ke Tingkat 2) - {studentsList.filter(s => s.classId.startsWith('1')).length} Siswa</option>
              <option value="2">Tingkat 2 (Lulus ke Tingkat 3) - {studentsList.filter(s => s.classId.startsWith('2')).length} Siswa</option>
              <option value="3">Tingkat 3 (Lulus ke Tingkat 4) - {studentsList.filter(s => s.classId.startsWith('3')).length} Siswa</option>
              <option value="4">Tingkat 4 (Lulus ke Tingkat 5) - {studentsList.filter(s => s.classId.startsWith('4')).length} Siswa</option>
            </select>
          </div>

          {/* Target Rombel Checkboxes (A, B, C, dst.) */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Pilihan Target Rombel (Centang Rombel):
            </label>
            <div className="flex flex-wrap items-center gap-1.5 bg-[#0F131F] border border-slate-700 rounded-xl p-1.5 min-h-[38px]">
              {AVAILABLE_ROMBEL_LETTERS.map((letter) => {
                const rombelName = `${targetGradeNum}${letter}`;
                const isChecked = selectedRombelLetters.includes(letter);
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleToggleRombelLetter(letter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                      isChecked
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm shadow-indigo-600/30'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{rombelName}</span>
                    {isChecked && <Check className="w-3 h-3 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={handleAutoBalance}
              className="w-full px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
              title="Mendistribusikan siswa secara seimbang, memisahkan siswa bertanda khusus, dan menyebar ranking"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Acak Rombel</span>
            </button>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              onClick={handleExportRombelExcel}
              className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-500/30 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & SORTING TOOLBAR (Clean, without horizontal A-Z bar) */}
      <div className="bg-[#121624] border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa atau kelas asal..."
              className="w-full bg-[#0B0E17] border border-slate-700 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls Right: Sort & Criteria Filter */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Sort Order (Sort Nama A-Z / Z-A) */}
            <div className="flex items-center gap-1.5 bg-[#0B0E17] border border-slate-700 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer pr-1"
              >
                <option value="default" className="bg-[#0F131F]">Urutan Acak / Alokasi</option>
                <option value="name-asc" className="bg-[#0F131F]">Nama A - Z</option>
                <option value="name-desc" className="bg-[#0F131F]">Nama Z - A</option>
              </select>
            </div>

            {/* Quick Criteria Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0B0E17] border border-slate-700 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Kriteria:</span>
              <select
                value={criteriaFilter}
                onChange={(e) => setCriteriaFilter(e.target.value as any)}
                className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[#0F131F]">Semua Siswa</option>
                <option value="ranked" className="bg-[#0F131F]">🏆 Peringkat &amp; Prestasi</option>
                <option value="learning" className="bg-[#0F131F]">📕 Hambatan Belajar</option>
                <option value="financial" className="bg-[#0F131F]">💳 Kendala Biaya/SPP</option>
                <option value="separation" className="bg-[#0F131F]">👥 Perlu Dipisah Rombel</option>
                <option value="any_flag" className="bg-[#0F131F]">⚠️ Semua yang Bertanda Khusus</option>
              </select>
            </div>

            {isFilterActive && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCriteriaFilter('all');
                  setSortOrder('default');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Rombels Workspace Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {targetRombels.map((rombel) => {
          const totalInRombel = rombelMap[rombel] || [];
          const visibleStudentIds = getFilteredStudentIds(totalInRombel);
          const conflicts = getSeparationConflictsInRombel(totalInRombel);

          return (
            <div
              key={rombel}
              className="bg-[#121624] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg"
            >
              <div>
                {/* Rombel Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                    <h3 className="text-base font-black text-white">Kelas {rombel}</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {conflicts.length > 0 && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse"
                        title={`${conflicts.length} pasangan siswa bertanda pisah rombel berada di kelas yang sama!`}
                      >
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        <span>{conflicts.length} Konflik Pisah</span>
                      </span>
                    )}

                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {isFilterActive
                        ? `${visibleStudentIds.length} / ${totalInRombel.length} Siswa`
                        : `${totalInRombel.length} Siswa`}
                    </span>
                  </div>
                </div>

                {/* List Siswa */}
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {visibleStudentIds.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500 italic">
                      {totalInRombel.length === 0
                        ? 'Belum ada siswa dialokasikan'
                        : 'Tidak ada siswa yang cocok dengan filter saat ini'}
                    </div>
                  ) : (
                    visibleStudentIds.map((stId, idx) => {
                      const st = studentsList.find((s) => s.id === stId);
                      const isLocked = lockedStudents[stId];
                      const crit = criteriaMap[stId];

                      // Separation conflict detection for this student
                      const isConflicted = conflicts.some((c) => c.stAId === stId || c.stBId === stId);

                      // Separated partner names
                      const separatedNames = (crit?.separateFromStudentIds || [])
                        .map((id) => studentsList.find((s) => s.id === id)?.name)
                        .filter(Boolean);

                      return (
                        <div
                          key={stId}
                          className={`p-2.5 bg-[#181D2F] border rounded-xl flex flex-col gap-1.5 group transition-all ${
                            isConflicted
                              ? 'border-rose-500/50 bg-rose-950/20 shadow-sm'
                              : isLocked
                              ? 'border-amber-500/30 bg-[#1a1c29]'
                              : 'border-slate-800 hover:border-indigo-500/40'
                          }`}
                        >
                          {/* Student Main Row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden min-w-0">
                              <span className="text-[10px] font-bold text-slate-500 w-4 shrink-0">
                                {idx + 1}.
                              </span>
                              <div className="truncate min-w-0">
                                <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                  <span>{st?.name || 'Siswa'}</span>
                                  {isConflicted && (
                                    <span
                                      className="text-[9px] font-bold text-rose-400 bg-rose-500/20 px-1 py-0.2 rounded border border-rose-500/30"
                                      title="Konflik Pemisahan Rombel!"
                                    >
                                      ⚠️ Konflik
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400">Asal: Kelas {st?.classId}</p>
                              </div>
                            </div>

                            {/* Actions Right */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Quick Criteria Tag Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForCriteria(st || null)}
                                title="Atur Peringkat & Hambatan Khusus"
                                className={`p-1.5 rounded-lg text-xs cursor-pointer transition-all border ${
                                  crit && (crit.isRank1To3 || crit.isTop10 || crit.isAchiever || crit.hasLearningIssue || crit.hasFinancialIssue || crit.needsSeparation || crit.notes)
                                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/50'
                                    : 'bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:border-slate-600'
                                }`}
                              >
                                <Tag className="w-3.5 h-3.5" />
                              </button>

                              {/* Lock Toggle */}
                              <button
                                onClick={() => toggleLock(stId)}
                                title={isLocked ? 'Buka Kunci' : 'Kunci Siswa di Rombel ini'}
                                className={`p-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                                  isLocked ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>

                              {/* Move to Rombel selector */}
                              <select
                                value={rombel}
                                onChange={(e) => moveStudent(stId, e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-1.5 py-1 font-bold outline-none cursor-pointer"
                              >
                                {targetRombels.map((targetR) => (
                                  <option key={targetR} value={targetR}>
                                    Ke {targetR}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Student Criteria Badges Row (if any criteria present) */}
                          {crit && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-800/80">
                              {crit.isRank1To3 && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/25 to-amber-500/10 text-amber-300 border border-amber-500/40 shadow-xs flex items-center gap-1">
                                  <span>🥇</span> Rank 1-3
                                </span>
                              )}
                              {crit.customRank && !crit.isRank1To3 && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/25 to-amber-500/10 text-amber-300 border border-amber-500/40 shadow-xs flex items-center gap-1">
                                  <span>🏆</span> Rank {crit.customRank}
                                </span>
                              )}
                              {crit.isTop10 && !crit.isRank1To3 && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-500/25 to-purple-500/10 text-purple-300 border border-purple-500/40 shadow-xs flex items-center gap-1">
                                  <span>🌟</span> Top 10
                                </span>
                              )}
                              {crit.isAchiever && !crit.isRank1To3 && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-500/25 to-emerald-500/10 text-emerald-300 border border-emerald-500/40 shadow-xs flex items-center gap-1">
                                  <span>🎖️</span> Prestasi
                                </span>
                              )}
                              {crit.hasLearningIssue && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gradient-to-r from-rose-500/25 to-rose-500/10 text-rose-300 border border-rose-500/40 shadow-xs flex items-center gap-1">
                                  <span>📕</span> Belajar
                                </span>
                              )}
                              {crit.hasFinancialIssue && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/30 to-amber-600/15 text-amber-300 border border-amber-500/50 shadow-xs flex items-center gap-1">
                                  <span>💳</span> SPP
                                </span>
                              )}
                              {crit.hasMedicalIssue && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gradient-to-r from-cyan-500/25 to-cyan-500/10 text-cyan-300 border border-cyan-500/40 shadow-xs flex items-center gap-1">
                                  <span>🩺</span> Medis
                                </span>
                              )}
                              {crit.needsSeparation && (
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shadow-xs flex items-center gap-1 ${
                                    isConflicted
                                      ? 'bg-rose-500/30 text-rose-200 border-rose-500/70 animate-pulse'
                                      : 'bg-gradient-to-r from-indigo-500/25 to-indigo-500/10 text-indigo-300 border border-indigo-500/40'
                                  }`}
                                  title={`Harus dipisah dari: ${separatedNames.join(', ') || 'Siswa tertentu'}`}
                                >
                                  <span>👥</span> Pisah {separatedNames.length ? `(${separatedNames[0]}${separatedNames.length > 1 ? ` +${separatedNames.length - 1}` : ''})` : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-5 bg-[#121624] border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-white">Resmikan Kenaikan Kelas ke Database</p>
          <p className="text-[11px] text-slate-400">
            Setelah pembagian rombel disetujui, tekan tombol untuk memperbarui status kelas seluruh siswa secara resmi.
          </p>
        </div>

        <button
          onClick={handleCommitPromotion}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all shrink-0 active:scale-[0.98]"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isSubmitting ? 'Memproses...' : 'Resmikan Ke Database Siswa'}</span>
        </button>
      </div>

      {/* Quick Criteria & Student Tags Modal */}
      <StudentCriteriaModal
        isOpen={Boolean(selectedStudentForCriteria)}
        student={selectedStudentForCriteria}
        allGradeStudents={sourceStudents}
        initialCriteria={selectedStudentForCriteria ? criteriaMap[selectedStudentForCriteria.id] : undefined}
        onSave={handleSaveCriteria}
        onClose={() => setSelectedStudentForCriteria(null)}
      />
    </div>
  );
};
