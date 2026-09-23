import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  User,
  UserCheck,
  Users,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  RotateCcw,
  Thermometer,
  FileText,
  ChevronDown,
  Copy,
  Edit3,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Plus,
  Minus,
} from 'lucide-react';
import {
  getStoredStudentsLocal,
  subscribeToStudents,
  type Student,
} from '../../services/studentStorage';
import {
  exportGrafikKehadiranToExcel,
  type GrafikKehadiranRow,
} from '../../services/administrasiExcelService';

interface AbsensiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: Student[];
}

export const AbsensiGeneratorModal: React.FC<AbsensiGeneratorModalProps> = ({
  isOpen,
  onClose,
  studentsList,
}) => {
  const [chartPeriod, setChartPeriod] = useState<'month' | 'semester' | 'year'>('month');

  // Local student state with Firestore subscription & localStorage fallback
  const [students, setStudents] = useState<Student[]>(() => {
    if (studentsList && studentsList.length > 0) return studentsList;
    return getStoredStudentsLocal();
  });

  useEffect(() => {
    if (studentsList && studentsList.length > 0) {
      setStudents(studentsList);
    } else {
      const unsub = subscribeToStudents((list) => {
        if (list && list.length > 0) {
          setStudents(list);
        }
      });
      return () => unsub();
    }
  }, [studentsList]);

  // Selected filters
  const [selectedClass, setSelectedClass] = useState('1B');
  const [selectedMonth, setSelectedMonth] = useState('Juli');
  const [selectedYear, setSelectedYear] = useState('2026');
  const monthName = `${selectedMonth} ${selectedYear}`;
  const [schoolYear, setSchoolYear] = useState('TP 2026/2027');
  const [headmasterName, setHeadmasterName] = useState('H. M. HALIM MUSTOMI, S.Pd.');
  const [teacherName, setTeacherName] = useState('');
  const [effectiveDays, setEffectiveDays] = useState(22);

  // Helper normalize class string
  const normalizeClassId = (cls: string): string => {
    return (cls || '')
      .trim()
      .toUpperCase()
      .replace(/^KELAS\s+/i, '')
      .replace(/[^A-Z0-9]/g, '');
  };

  // Available classes list from database & standard school grades
  const availableClasses = useMemo(() => {
    const standard = ['1A', '1B', '2A', '2B', '3A', '3B', '3C', '4A', '4B', '5A', '5B', '6A', '6B'];
    const extracted = new Set<string>();

    students.forEach((s) => {
      if (s.classId) {
        const clean = normalizeClassId(s.classId);
        if (clean) extracted.add(clean);
      }
    });

    const combined = Array.from(new Set([...standard, ...extracted])).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
    return combined;
  }, [students]);

  // Filter students strictly by selected class
  const filteredStudents = useMemo(() => {
    if (!selectedClass || selectedClass === 'Semua Kelas') {
      return students;
    }
    const target = normalizeClassId(selectedClass);
    return students.filter((s) => normalizeClassId(s.classId) === target);
  }, [students, selectedClass]);

  // Matrix input state for Semester & Yearly custom data
  interface MatrixMonthData {
    effectiveDays?: number;
    sakit?: number | string;
    izin?: number | string;
    alpha?: number | string;
  }
  const [selectedSemesterType, setSelectedSemesterType] = useState<'ganjil' | 'genap'>('ganjil');
  const [matrixData, setMatrixData] = useState<Record<string, MatrixMonthData>>({});

  // Quick custom attendance input states for monthly recap
  const [customSakit, setCustomSakit] = useState<number | string>(2);
  const [customIzin, setCustomIzin] = useState<number | string>(1);
  const [customAlpha, setCustomAlpha] = useState<number | string>(0);
  const [autoCalculateHadir, setAutoCalculateHadir] = useState(true);
  const [customHadirOverride, setCustomHadirOverride] = useState<number | string>('');

  // Total student count (if class has 0 students registered yet in DB, default to 32 for realistic simulation)
  const activeStudentCount = filteredStudents.length > 0 ? filteredStudents.length : 32;

  // Active stats used by charts and export (for monthly mode)
  const activeStats = useMemo(() => {
    const totalPossible = activeStudentCount * (effectiveDays || 1);
    const s = Math.max(0, parseInt(String(customSakit), 10) || 0);
    const i = Math.max(0, parseInt(String(customIzin), 10) || 0);
    const a = Math.max(0, parseInt(String(customAlpha), 10) || 0);
    const totalAbs = s + i + a;

    let h = 0;
    if (!autoCalculateHadir && customHadirOverride !== '') {
      h = Math.max(0, parseInt(String(customHadirOverride), 10) || 0);
    } else {
      h = Math.max(0, totalPossible - totalAbs);
    }

    const attendanceRate = totalPossible > 0 ? ((h / totalPossible) * 100).toFixed(1) : '100.0';

    return {
      totalH: h,
      totalS: s,
      totalI: i,
      totalA: a,
      totalPossible,
      attendanceRate,
    };
  }, [
    activeStudentCount,
    effectiveDays,
    customSakit,
    customIzin,
    customAlpha,
    autoCalculateHadir,
    customHadirOverride,
  ]);

  const handleResetData = () => {
    setCustomSakit(0);
    setCustomIzin(0);
    setCustomAlpha(0);
    setAutoCalculateHadir(true);
    setCustomHadirOverride('');
    setEffectiveDays(22);
    setTeacherName('');
    setMatrixData({});
  };

  // Dynamic semester / yearly trends based on active attendance statistics and flexible matrix data
  const activePeriodMonths = useMemo(() => {
    if (chartPeriod === 'semester') {
      return selectedSemesterType === 'ganjil'
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    }
    if (chartPeriod === 'year') {
      return ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    }
    return [selectedMonth];
  }, [chartPeriod, selectedSemesterType, selectedMonth]);

  const periodRecapRows = useMemo(() => {
    const totalStudents = activeStudentCount;

    return activePeriodMonths.map((m) => {
      const custom = matrixData[m];
      const mEffectiveDays = custom?.effectiveDays !== undefined
        ? custom.effectiveDays
        : (m === selectedMonth ? effectiveDays : (m === 'Desember' ? 14 : m === 'Juni' ? 15 : 22));

      let s: number;
      let i: number;
      let a: number;

      if (custom?.sakit !== undefined && custom.sakit !== '') {
        s = Math.max(0, parseInt(String(custom.sakit), 10) || 0);
      } else if (m === selectedMonth) {
        s = activeStats.totalS;
      } else {
        s = Math.max(0, Math.round(activeStats.totalS + (m === 'Agustus' || m === 'Maret' ? 1 : m === 'November' ? 2 : 0)));
      }

      if (custom?.izin !== undefined && custom.izin !== '') {
        i = Math.max(0, parseInt(String(custom.izin), 10) || 0);
      } else if (m === selectedMonth) {
        i = activeStats.totalI;
      } else {
        i = Math.max(0, Math.round(activeStats.totalI + (m === 'September' || m === 'Februari' ? 1 : 0)));
      }

      if (custom?.alpha !== undefined && custom.alpha !== '') {
        a = Math.max(0, parseInt(String(custom.alpha), 10) || 0);
      } else if (m === selectedMonth) {
        a = activeStats.totalA;
      } else {
        a = Math.max(0, Math.round(activeStats.totalA));
      }

      const totalPossible = totalStudents * mEffectiveDays;
      const totalAbs = s + i + a;
      const totalH = Math.max(0, totalPossible - totalAbs);
      const rate = totalPossible > 0 ? (totalH / totalPossible) * 100 : 100;
      const sPct = totalPossible > 0 ? (s / totalPossible) * 100 : 0;
      const iPct = totalPossible > 0 ? (i / totalPossible) * 100 : 0;
      const aPct = totalPossible > 0 ? (a / totalPossible) * 100 : 0;

      return {
        month: m,
        effectiveDays: mEffectiveDays,
        totalPossible,
        totalStudents,
        sakit: s,
        izin: i,
        alpha: a,
        totalAbs,
        totalH,
        rate,
        sPct: Number(sPct.toFixed(1)),
        iPct: Number(iPct.toFixed(1)),
        aPct: Number(aPct.toFixed(1)),
      };
    });
  }, [activePeriodMonths, activeStudentCount, matrixData, effectiveDays, selectedMonth, activeStats]);

  const periodTotals = useMemo(() => {
    let sumEffectiveDays = 0;
    let sumPossible = 0;
    let sumS = 0;
    let sumI = 0;
    let sumA = 0;
    let sumH = 0;

    periodRecapRows.forEach((r) => {
      sumEffectiveDays += r.effectiveDays;
      sumPossible += r.totalPossible;
      sumS += r.sakit;
      sumI += r.izin;
      sumA += r.alpha;
      sumH += r.totalH;
    });

    const sumAbs = sumS + sumI + sumA;
    const avgRate = sumPossible > 0 ? ((sumH / sumPossible) * 100).toFixed(1) : '100.0';

    return {
      sumEffectiveDays,
      sumPossible,
      sumS,
      sumI,
      sumA,
      sumAbs,
      sumH,
      avgRate,
    };
  }, [periodRecapRows]);

  const handleUpdateMatrix = (month: string, field: 'effectiveDays' | 'sakit' | 'izin' | 'alpha', val: number | string) => {
    setMatrixData((prev) => {
      const current = prev[month] || {};
      return {
        ...prev,
        [month]: {
          ...current,
          [field]: val === '' ? '' : Math.max(0, parseInt(String(val), 10) || 0),
        },
      };
    });
  };

  const handleCopyMonthToAll = () => {
    const newMatrix: Record<string, MatrixMonthData> = {};
    activePeriodMonths.forEach((m) => {
      newMatrix[m] = {
        effectiveDays,
        sakit: activeStats.totalS,
        izin: activeStats.totalI,
        alpha: activeStats.totalA,
      };
    });
    setMatrixData(newMatrix);
  };

  const handleResetMatrix = () => {
    setMatrixData({});
  };

  const handleExportGrafikExcel = async () => {
    let rows: GrafikKehadiranRow[] = [];
    let periodLabel = 'Bulanan';

    if (chartPeriod === 'month') {
      periodLabel = `Bulanan (${monthName})`;
      rows = [
        {
          periode: monthName,
          totalSiswa: activeStudentCount,
          hariEfektif: effectiveDays,
          totalHadir: activeStats.totalH,
          sakit: activeStats.totalS,
          izin: activeStats.totalI,
          alpha: activeStats.totalA,
          rate: parseFloat(activeStats.attendanceRate) || 100.0,
        },
      ];
    } else if (chartPeriod === 'semester') {
      periodLabel = `Semester ${selectedSemesterType === 'ganjil' ? 'Ganjil' : 'Genap'} (${schoolYear})`;
      rows = periodRecapRows.map((r) => ({
        periode: r.month,
        totalSiswa: r.totalStudents,
        hariEfektif: r.effectiveDays,
        totalHadir: r.totalH,
        sakit: r.sakit,
        izin: r.izin,
        alpha: r.alpha,
        rate: r.rate,
      }));
    } else {
      periodLabel = `1 Tahun Ajaran (${schoolYear})`;
      rows = periodRecapRows.map((r) => ({
        periode: r.month,
        totalSiswa: r.totalStudents,
        hariEfektif: r.effectiveDays,
        totalHadir: r.totalH,
        sakit: r.sakit,
        izin: r.izin,
        alpha: r.alpha,
        rate: r.rate,
      }));
    }

    try {
      await exportGrafikKehadiranToExcel({
        schoolName: 'SEKOLAH DASAR ISLAM TERPADU AL FIKRI',
        schoolYear: `TAHUN PELAJARAN ${schoolYear.replace(/^TP\s*/i, '')}`,
        classLevel: selectedClass === 'Semua Kelas' ? 'Semua Kelas' : `Kelas ${selectedClass}`,
        periodType: chartPeriod,
        periodLabel,
        headmasterName,
        teacherName: teacherName || 'Wali Kelas',
        rows,
      });
    } catch (err) {
      console.error('Error saat export grafik Excel:', err);
    }
  };

  // Dynamic Rate for Circular Progress Gauge based on active period
  const displayRate = chartPeriod === 'month' ? activeStats.attendanceRate : periodTotals.avgRate;
  const attendanceNumeric = Math.min(100, Math.max(0, parseFloat(displayRate) || 0));
  const circleRadius = 46;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (attendanceNumeric / 100) * circumference;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b101e] border border-[#1b253b] rounded-2xl sm:rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* ========================================================================= */}
        {/* HEADER MODAL */}
        {/* ========================================================================= */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-r from-[#0b1120] via-[#0e162a] to-[#0b1120] border-b border-[#1b253b] flex items-center justify-between gap-4">
          {/* Left: Generator Title */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                Generator Absensi &amp; Rekap Kehadiran
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Input Presensi Bulanan, Semester &amp; Tahunan dengan Ekspor Excel Resmi
              </p>
            </div>
          </div>

          {/* Right: School Branding & Close */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-right">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-blue-400/20 to-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 relative shrink-0 shadow-sm">
                <BookOpen className="w-5 h-5 text-blue-300" />
                <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-white tracking-tight">SDIT Al Fikri</h3>
                <p className="text-[11px] text-slate-400">Bersama Mendidik, Meraih Prestasi</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer ml-2"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL BODY CONTENT */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 bg-[#080d1a] custom-scrollbar">

          {/* 1. TOP FILTER BAR (METODE PERIODE DI POSISI UTAMA PALING ATAS) */}
          <div className="bg-[#0d1424] border border-[#1b253b] p-4 sm:p-5 rounded-2xl shadow-sm space-y-3.5">
            
            {/* ROW 1: METODE PEMILIHAN PERIODE (BULANAN, SEMESTER, 1 TAHUN) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b253b]/80">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Mode Periode Laporan:
                </span>
              </div>

              {/* Segmented Period Tabs Switcher */}
              <div className="flex items-center flex-wrap gap-2">
                <div className="flex items-center bg-[#080d19] p-1 rounded-xl border border-[#1b253b] shadow-inner">
                  <button
                    type="button"
                    onClick={() => setChartPeriod('month')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartPeriod === 'month'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Bulanan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartPeriod('semester')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartPeriod === 'semester'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Semester (6 Bln)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartPeriod('year')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartPeriod === 'year'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>1 Tahun (12 Bln)</span>
                  </button>
                </div>

                {/* Sub-toggle untuk Semester (Ganjil vs Genap) */}
                {chartPeriod === 'semester' && (
                  <div className="flex items-center bg-[#080d19] p-1 rounded-xl border border-[#1b253b]">
                    <button
                      type="button"
                      onClick={() => setSelectedSemesterType('ganjil')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        selectedSemesterType === 'ganjil'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Ganjil (Jul - Des)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSemesterType('genap')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        selectedSemesterType === 'genap'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Genap (Jan - Jun)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ROW 2: FILTERS (Kelas, Bulan/Periode, Tahun, Tahun Pelajaran, Wali Kelas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              
              {/* Filter 1: Kelas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kelas</span>
                  </div>
                  <span className="text-[10px] text-blue-400 font-bold">
                    {filteredStudents.length} Siswa
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-[#080d19] border border-[#1b253b] hover:border-slate-600 focus:border-blue-500 text-white font-bold rounded-xl px-3 py-2.5 text-xs appearance-none outline-none cursor-pointer transition-colors pr-8"
                  >
                    <option value="Semua Kelas">Semua Kelas ({students.length} Siswa)</option>
                    {availableClasses.map((cls) => {
                      const count = students.filter((s) => normalizeClassId(s.classId) === cls).length;
                      return (
                        <option key={cls} value={cls}>
                          Kelas {cls} {count > 0 ? `(${count} Siswa)` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Filter 2: Bulan (Khusus mode Bulanan) / Info Periode */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{chartPeriod === 'month' ? 'Pilih Bulan' : 'Cakupan Bulan'}</span>
                </div>
                {chartPeriod === 'month' ? (
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-[#080d19] border border-[#1b253b] hover:border-slate-600 focus:border-blue-500 text-white font-bold rounded-xl px-3 py-2.5 text-xs appearance-none outline-none cursor-pointer transition-colors pr-8"
                    >
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                ) : (
                  <div className="w-full bg-[#080d19]/80 border border-[#1b253b] text-blue-300 font-bold rounded-xl px-3 py-2.5 text-xs flex items-center justify-between">
                    <span className="truncate">
                      {chartPeriod === 'semester'
                        ? selectedSemesterType === 'ganjil'
                          ? 'Juli - Desember'
                          : 'Januari - Juni'
                        : '12 Bulan (Juli - Juni)'}
                    </span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
                      {chartPeriod === 'semester' ? '6 Bln' : '12 Bln'}
                    </span>
                  </div>
                )}
              </div>

              {/* Filter 3: Tahun Kalender */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tahun</span>
                </div>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-[#080d19] border border-[#1b253b] hover:border-slate-600 focus:border-blue-500 text-white font-bold rounded-xl px-3 py-2.5 text-xs appearance-none outline-none cursor-pointer transition-colors pr-8"
                  >
                    {['2024', '2025', '2026', '2027', '2028', '2029', '2030'].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Filter 4: Tahun Pelajaran */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tahun Pelajaran</span>
                </div>
                <div className="relative">
                  <select
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full bg-[#080d19] border border-[#1b253b] hover:border-slate-600 focus:border-blue-500 text-white font-bold rounded-xl px-3 py-2.5 text-xs appearance-none outline-none cursor-pointer transition-colors pr-8"
                  >
                    {['2024/2025', '2025/2026', '2026/2027', '2027/2028', '2028/2029'].map((yr) => (
                      <option key={yr} value={`TP ${yr}`}>
                        TP {yr}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Filter 5: Nama Wali Kelas */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nama Wali Kelas</span>
                </div>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Ketik nama wali kelas..."
                  className="w-full bg-[#080d19] border border-[#1b253b] hover:border-slate-600 focus:border-blue-500 text-white font-medium rounded-xl px-3 py-2.5 text-xs placeholder:text-slate-500 outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* 2. DUA KARTU UTAMA: FORM INPUT DATA KEHADIRAN (KIRI) & PERSENTASE KEHADIRAN (KANAN) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
            
            {/* KARTU KIRI: Input Data Kehadiran (lg:col-span-7) */}
            <div className="lg:col-span-7 bg-[#0d1424] border border-[#1b253b] rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-sm">
              
              {/* Header Kartu Kiri */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      {chartPeriod === 'month'
                        ? `Input Presensi Bulan ${selectedMonth}`
                        : chartPeriod === 'semester'
                        ? `Input Presensi Semester ${selectedSemesterType === 'ganjil' ? 'Ganjil' : 'Genap'} (6 Bulan)`
                        : `Input Presensi 1 Tahun Ajaran (12 Bulan)`}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {chartPeriod === 'month'
                        ? 'Isi data hari efektif dan rincian sakit, izin, alpha bulan ini.'
                        : 'Isi tabel ringkas tiap bulan di bawah. Nilai hadir dan persentase dihitung otomatis.'}
                    </p>
                  </div>
                </div>

                {/* Quick actions for multi-month modes */}
                {chartPeriod !== 'month' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyMonthToAll}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg transition-all cursor-pointer"
                      title="Salin template nilai ke semua bulan"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Terapkan Cepat</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetMatrix}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-all cursor-pointer"
                      title="Reset input tabel"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                )}
              </div>

              {/* =================================================================== */}
              {/* TAMPILAN FORM: MODE BULANAN (4 KOTAK BESAR DENGAN STEPPER) */}
              {/* =================================================================== */}
              {chartPeriod === 'month' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-1">
                  
                  {/* 1. Hari Efektif */}
                  <div className="bg-[#080d19] border border-[#1b253b] hover:border-blue-500/40 rounded-xl p-3 flex flex-col justify-between space-y-2 transition-all shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">Hari Efektif</span>
                    </div>
                    
                    {/* Large Number & Unit Display */}
                    <div className="py-1 flex items-baseline justify-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={effectiveDays}
                        onChange={(e) => setEffectiveDays(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                        className="w-14 bg-transparent text-center text-2xl sm:text-3xl font-black text-white outline-none focus:bg-slate-800/40 rounded transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs font-medium text-slate-400 select-none">hari</span>
                    </div>

                    {/* Dual Stepper Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#1b253b]/60">
                      <button
                        type="button"
                        onClick={() => setEffectiveDays((prev) => Math.max(1, prev - 1))}
                        disabled={effectiveDays <= 1}
                        className="h-7 sm:h-8 rounded-lg bg-[#0d1527] hover:bg-blue-600/20 active:bg-blue-600/30 border border-[#1d2a45] hover:border-blue-500/50 text-slate-300 hover:text-blue-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Kurangi 1 Hari"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEffectiveDays((prev) => Math.min(31, prev + 1))}
                        disabled={effectiveDays >= 31}
                        className="h-7 sm:h-8 rounded-lg bg-[#0d1527] hover:bg-blue-600/20 active:bg-blue-600/30 border border-[#1d2a45] hover:border-blue-500/50 text-slate-300 hover:text-blue-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Tambah 1 Hari"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Sakit */}
                  <div className="bg-[#080d19] border border-[#1b253b] hover:border-amber-500/40 rounded-xl p-3 flex flex-col justify-between space-y-2 transition-all shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <Thermometer className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">Sakit</span>
                    </div>

                    {/* Large Number & Unit Display */}
                    <div className="py-1 flex items-baseline justify-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={customSakit}
                        onChange={(e) => setCustomSakit(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-14 bg-transparent text-center text-2xl sm:text-3xl font-black text-amber-300 outline-none focus:bg-slate-800/40 rounded transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs font-medium text-slate-400 select-none">siswa</span>
                    </div>

                    {/* Dual Stepper Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#1b253b]/60">
                      <button
                        type="button"
                        onClick={() => setCustomSakit((prev) => Math.max(0, (parseInt(String(prev), 10) || 0) - 1))}
                        disabled={(parseInt(String(customSakit), 10) || 0) <= 0}
                        className="h-7 sm:h-8 rounded-lg bg-[#0d1527] hover:bg-amber-600/20 active:bg-amber-600/30 border border-[#1d2a45] hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Kurangi 1 Siswa Sakit"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomSakit((prev) => (parseInt(String(prev), 10) || 0) + 1)}
                        className="h-7 sm:h-8 rounded-lg bg-[#0d1527] hover:bg-amber-600/20 active:bg-amber-600/30 border border-[#1d2a45] hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none"
                        title="Tambah 1 Siswa Sakit"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 3. Izin */}
                  <div className="bg-[#080d19] border border-[#1b253b] hover:border-blue-500/40 rounded-xl p-3 flex flex-col justify-between space-y-2 transition-all shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <span className="truncate">Izin</span>
                    </div>

                    {/* Large Number & Unit Display */}
                    <div className="py-1 flex items-baseline justify-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={customIzin}
                        onChange={(e) => setCustomIzin(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-14 bg-transparent text-center text-2xl sm:text-3xl font-black text-blue-300 outline-none focus:bg-slate-800/40 rounded transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs font-medium text-slate-400 select-none">siswa</span>
                    </div>

                    {/* Dual Stepper Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#1b253b]/60">
                      <button
                        type="button"
                        onClick={() => setCustomIzin((prev) => Math.max(0, (parseInt(String(prev), 10) || 0) - 1))}
                        disabled={(parseInt(String(customIzin), 10) || 0) <= 0}
                        className="h-7 sm:h-8 rounded-lg bg-[#0d1527] hover:bg-blue-600/20 active:bg-blue-600/30 border border-[#1d2a45] hover:border-blue-500/50 text-slate-300 hover:text-blue-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Kurangi 1 Siswa Izin"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomIzin((prev) => (parseInt(String(prev), 10) || 0) + 1)}
                        className="h-7 sm:h-8 rounded-lg bg-[#0d1527] hover:bg-blue-600/20 active:bg-blue-600/30 border border-[#1d2a45] hover:border-blue-500/50 text-slate-300 hover:text-blue-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none"
                        title="Tambah 1 Siswa Izin"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 4. Alpha */}
                  <div className="bg-[#080d19] border border-[#1b253b] hover:border-rose-500/40 rounded-xl p-3 flex flex-col justify-between space-y-2 transition-all shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-[10px] font-black shrink-0">
                        !
                      </div>
                      <span className="truncate">Alpha</span>
                    </div>

                    {/* Large Number & Unit Display */}
                    <div className="py-1 flex items-baseline justify-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={customAlpha}
                        onChange={(e) => setCustomAlpha(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-14 bg-transparent text-center text-2xl sm:text-3xl font-black text-rose-300 outline-none focus:bg-slate-800/40 rounded transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs font-medium text-slate-400 select-none">siswa</span>
                    </div>

                    {/* Dual Stepper Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#1b253b]/60">
                      <button
                        type="button"
                        onClick={() => setCustomAlpha((prev) => Math.max(0, (parseInt(String(prev), 10) || 0) - 1))}
                        disabled={(parseInt(String(customAlpha), 10) || 0) <= 0}
                        className="h-7 sm:h-8 rounded-lg bg-[#0d1527] hover:bg-rose-600/20 active:bg-rose-600/30 border border-[#1d2a45] hover:border-rose-500/50 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Kurangi 1 Siswa Alpha"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomAlpha((prev) => (parseInt(String(prev), 10) || 0) + 1)}
                        className="h-7 sm:h-8 rounded-lg bg-[#0d1527] hover:bg-rose-600/20 active:bg-rose-600/30 border border-[#1d2a45] hover:border-rose-500/50 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none"
                        title="Tambah 1 Siswa Alpha"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* =================================================================== */
                /* TAMPILAN FORM: MODE SEMESTER (6 BULAN) & 1 TAHUN (12 BULAN)         */
                /* =================================================================== */
                <div className="border border-[#1b253b] rounded-xl overflow-hidden bg-[#080d19]">
                  <div className="max-h-64 sm:max-h-72 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#0b1120] text-slate-400 uppercase text-[10px] font-bold sticky top-0 z-10 border-b border-[#1b253b]">
                        <tr>
                          <th className="py-2.5 px-3">Bulan</th>
                          <th className="py-2.5 px-1.5 text-center">Hari Efektif</th>
                          <th className="py-2.5 px-1.5 text-center text-amber-400">Sakit (S)</th>
                          <th className="py-2.5 px-1.5 text-center text-blue-400">Izin (I)</th>
                          <th className="py-2.5 px-1.5 text-center text-rose-400">Alpha (A)</th>
                          <th className="py-2.5 px-1.5 text-center text-[#00D084]">Hadir</th>
                          <th className="py-2.5 px-2 text-center text-[#00D084]">% Hadir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1b253b]/60 font-medium">
                        {periodRecapRows.map((r) => {
                          const isCurrentMonth = r.month === selectedMonth;
                          return (
                            <tr
                              key={r.month}
                              className={`hover:bg-[#0f172a] transition-colors ${
                                isCurrentMonth ? 'bg-blue-950/20' : ''
                              }`}
                            >
                              <td className="py-2 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white text-xs">{r.month}</span>
                                  {isCurrentMonth && (
                                    <span className="text-[8px] font-bold bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded border border-blue-500/30">
                                      Bulan Ini
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-1 px-1.5 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={31}
                                  value={r.effectiveDays}
                                  onChange={(e) => handleUpdateMatrix(r.month, 'effectiveDays', e.target.value)}
                                  className="w-12 bg-[#0c1222] border border-[#1b253b] focus:border-blue-400 rounded-lg py-1 px-1 text-center text-xs font-bold text-white outline-none"
                                />
                              </td>
                              <td className="py-1 px-1.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={r.sakit}
                                  onChange={(e) => handleUpdateMatrix(r.month, 'sakit', e.target.value)}
                                  className="w-11 bg-[#0c1222] border border-[#1b253b] focus:border-amber-400 rounded-lg py-1 px-1 text-center text-xs font-bold text-amber-300 outline-none"
                                />
                              </td>
                              <td className="py-1 px-1.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={r.izin}
                                  onChange={(e) => handleUpdateMatrix(r.month, 'izin', e.target.value)}
                                  className="w-11 bg-[#0c1222] border border-[#1b253b] focus:border-blue-400 rounded-lg py-1 px-1 text-center text-xs font-bold text-blue-300 outline-none"
                                />
                              </td>
                              <td className="py-1 px-1.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={r.alpha}
                                  onChange={(e) => handleUpdateMatrix(r.month, 'alpha', e.target.value)}
                                  className="w-11 bg-[#0c1222] border border-[#1b253b] focus:border-rose-400 rounded-lg py-1 px-1 text-center text-xs font-bold text-rose-300 outline-none"
                                />
                              </td>
                              <td className="py-1 px-1.5 text-center font-bold text-[#00D084] font-mono text-xs">
                                {r.totalH}
                              </td>
                              <td className="py-1 px-2 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-[#00D084]/15 border border-[#00D084]/30 text-[11px] font-black text-[#00D084] font-mono">
                                  {r.rate.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-[#0b1120] font-bold text-white border-t border-[#1b253b] text-xs">
                        <tr>
                          <td className="py-2.5 px-3 text-slate-300">Total / Rerata</td>
                          <td className="py-2.5 px-1.5 text-center text-slate-300">{periodTotals.sumEffectiveDays} hr</td>
                          <td className="py-2.5 px-1.5 text-center text-amber-400">{periodTotals.sumS}</td>
                          <td className="py-2.5 px-1.5 text-center text-blue-400">{periodTotals.sumI}</td>
                          <td className="py-2.5 px-1.5 text-center text-rose-400">{periodTotals.sumA}</td>
                          <td className="py-2.5 px-1.5 text-center text-[#00D084] font-mono">{periodTotals.sumH}</td>
                          <td className="py-2.5 px-2 text-center text-[#00D084] font-black font-mono">
                            {periodTotals.avgRate}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Catatan Bantuan Bawah Kartu Input */}
              <div className="pt-2 border-t border-[#1b253b]/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {chartPeriod === 'month'
                    ? `* Nilai kehadiran otomatis dihitung dari ${activeStudentCount} siswa x ${effectiveDays} hari efektif.`
                    : `* Rekapitulasi ${chartPeriod === 'semester' ? '6 bulan' : '12 bulan'} terhitung dari ${activeStudentCount} siswa terdaftar.`}
                </span>
              </div>
            </div>

            {/* KARTU KANAN: Persentase Kehadiran (lg:col-span-5) */}
            <div className="lg:col-span-5 bg-[#0d1424] border border-[#1b253b] rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-sm">
              
              {/* Header Kartu Kanan */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Persentase Kehadiran
                    </h3>
                    <p className="text-xs text-slate-400">
                      {chartPeriod === 'month'
                        ? `Bulan ${selectedMonth} ${selectedYear}`
                        : chartPeriod === 'semester'
                        ? `Semester ${selectedSemesterType === 'ganjil' ? 'Ganjil' : 'Genap'}`
                        : `1 Tahun Ajaran ${schoolYear}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Radial Gauge & Ringkasan Metrik */}
              <div className="flex items-center justify-around gap-3 sm:gap-4 my-auto py-2">
                
                {/* 1. Large Circular Progress Gauge */}
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
                    {/* Background Circle */}
                    <circle
                      cx="55"
                      cy="55"
                      r={circleRadius}
                      className="text-[#0c1626] stroke-current"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    {/* Glowing Progress Circle */}
                    <circle
                      cx="55"
                      cy="55"
                      r={circleRadius}
                      className="text-[#00D084] stroke-current transition-all duration-700 ease-out"
                      strokeWidth="9"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      style={{
                        filter: 'drop-shadow(0 0 6px rgba(0, 208, 132, 0.45))',
                      }}
                    />
                  </svg>
                  
                  {/* Center Text in Gauge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#00D084] tracking-tight font-mono">
                      {displayRate}%
                    </span>
                    <span className="text-xs font-semibold text-slate-300 mt-0.5">
                      {chartPeriod === 'month' ? 'Hadir' : 'Rata-rata'}
                    </span>
                  </div>
                </div>

                {/* 2. Jumlah Siswa & Status Rinci */}
                <div className="flex flex-col justify-center space-y-3">
                  {/* Jumlah Siswa */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <Users className="w-4 h-4 text-[#00D084]" />
                      <span>Jumlah Siswa</span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {activeStudentCount}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">siswa</span>
                    </div>
                  </div>

                  {/* Hari Efektif Periode */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span>Total Hari Efektif</span>
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {chartPeriod === 'month' ? `${effectiveDays} hari` : `${periodTotals.sumEffectiveDays} hari`}
                    </div>
                  </div>

                  {/* Status Pill Badge */}
                  <div className="bg-[#00D084]/15 border border-[#00D084]/30 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-[#00D084]">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00D084]" />
                    <span className="truncate">
                      {attendanceNumeric >= 95
                        ? 'Kehadiran sangat optimal'
                        : attendanceNumeric >= 90
                        ? 'Kehadiran baik & terjaga'
                        : 'Perlu evaluasi presensi'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rincian Singkat Hadir & Tidak Hadir */}
              <div className="pt-3 border-t border-[#1b253b] grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#080d19] p-2 rounded-lg border border-[#1b253b] flex items-center justify-between">
                  <span className="text-slate-400">Total Hadir:</span>
                  <span className="font-bold text-[#00D084] font-mono">
                    {chartPeriod === 'month' ? activeStats.totalH : periodTotals.sumH}
                  </span>
                </div>
                <div className="bg-[#080d19] p-2 rounded-lg border border-[#1b253b] flex items-center justify-between">
                  <span className="text-slate-400">Tidak Hadir (S+I+A):</span>
                  <span className="font-bold text-amber-300 font-mono">
                    {chartPeriod === 'month'
                      ? activeStats.totalS + activeStats.totalI + activeStats.totalA
                      : periodTotals.sumAbs}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER ACTIONS */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 bg-[#0a0f1d] border-t border-[#1b253b] flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Reset Data */}
          <div>
            <button
              onClick={handleResetData}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#0d1424] hover:bg-[#141e34] text-slate-300 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-[#1b253b] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Reset Data</span>
            </button>
          </div>

          {/* Right: Cetak / PDF & Download Excel */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => window.print()}
              className="px-4 sm:px-5 py-2.5 bg-[#0d1424] hover:bg-[#141e34] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-[#1b253b] transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={handleExportGrafikExcel}
              className="px-5 sm:px-6 py-2.5 bg-[#00D084] hover:bg-[#00BF79] text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#00D084]/20 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
