import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  School,
  BookOpen,
  Users,
  Settings,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Award,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from 'lucide-react';
import {
  fetchEraporDashboardSummary,
  fetchEraporMonitoringData,
  fetchClassSubjectTree,
  fetchPeriods,
  EraporPeriodSummary,
  EraporMonitoringRow,
  ClassSubjectTreeItem,
  MonitoringStatus,
} from '../../services/eraporAdminDashboardService';
import { fetchAllTeachers } from '../../services/teacherStorage';
import { AcademicPeriod } from '../../services/academicPeriodService';
import type { TeacherUser } from '../../types';

interface EraporAdminDashboardProps {
  onBack: () => void;
  onPreviewTeacher: (teacher: TeacherUser) => void;
  onNavigate: (tab: string) => void;
  showNotification?: (message: string, type?: 'success' | 'info') => void;
}

type ViewMode = 'compact' | 'flat' | 'tree';

export interface RombelSummaryItem {
  classId: string;
  className: string;
  grade: number;
  homeroomTeacherName?: string;
  totalStudents: number;
  totalSubjects: number;
  completedSubjects: number;
  inProgressSubjects: number;
  notStartedSubjects: number;
  avgProgress: number;
  status: MonitoringStatus;
  subjects: ClassSubjectTreeItem['subjects'];
}

export const EraporAdminDashboard: React.FC<EraporAdminDashboardProps> = ({
  onBack,
  onPreviewTeacher,
  onNavigate,
  showNotification,
}) => {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [summary, setSummary] = useState<EraporPeriodSummary | null>(null);
  const [monitoringRows, setMonitoringRows] = useState<EraporMonitoringRow[]>([]);
  const [classTree, setClassTree] = useState<ClassSubjectTreeItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Views
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | MonitoringStatus>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Load periods initially
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { activePeriod, allPeriods } = await fetchPeriods();
      setPeriods(allPeriods);

      const targetPeriodId = activePeriod?.id || allPeriods[0]?.id || '';
      setSelectedPeriodId(targetPeriodId);

      const teachersList = await fetchAllTeachers();
      setTeachers(teachersList);

      if (targetPeriodId) {
        const [sumData, monData, treeData] = await Promise.all([
          fetchEraporDashboardSummary(targetPeriodId),
          fetchEraporMonitoringData(targetPeriodId),
          fetchClassSubjectTree(targetPeriodId),
        ]);
        setSummary(sumData);
        setMonitoringRows(monData);
        setClassTree(treeData);
      }
    } catch (err: any) {
      console.error('Error loading Erapor Admin Dashboard data:', err);
      setError(err?.message || 'Gagal memuat data monitoring e-Rapor.');
      showNotification?.(err?.message || 'Gagal memuat data monitoring e-Rapor.', 'info');
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // When period selection changes
  const handlePeriodChange = async (periodId: string) => {
    setSelectedPeriodId(periodId);
    setIsRefreshing(true);
    try {
      const [sumData, monData, treeData] = await Promise.all([
        fetchEraporDashboardSummary(periodId),
        fetchEraporMonitoringData(periodId),
        fetchClassSubjectTree(periodId),
      ]);
      setSummary(sumData);
      setMonitoringRows(monData);
      setClassTree(treeData);
    } catch (err: any) {
      console.error('Error switching period:', err);
      showNotification?.('Gagal memuat data periode yang dipilih.', 'info');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedPeriodId) return;
    setIsRefreshing(true);
    try {
      const [sumData, monData, treeData, teachersList] = await Promise.all([
        fetchEraporDashboardSummary(selectedPeriodId),
        fetchEraporMonitoringData(selectedPeriodId),
        fetchClassSubjectTree(selectedPeriodId),
        fetchAllTeachers(),
      ]);
      setSummary(sumData);
      setMonitoringRows(monData);
      setClassTree(treeData);
      setTeachers(teachersList);
      showNotification?.('Data monitoring berhasil disinkronkan.', 'success');
    } catch (err: any) {
      console.error('Error refreshing monitoring:', err);
      showNotification?.('Gagal menyinkronkan data monitoring.', 'info');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePreviewAsTeacher = (teacherId: string | null) => {
    if (!teacherId) {
      showNotification?.('Guru belum ditugaskan untuk mapel ini.', 'info');
      return;
    }
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) {
      showNotification?.('Data guru tidak ditemukan.', 'info');
      return;
    }
    onPreviewTeacher(teacher);
  };

  // Distinct class list for filter dropdown
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    monitoringRows.forEach((r) => set.add(r.className));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [monitoringRows]);

  // Filtered monitoring rows
  const filteredRows = useMemo(() => {
    return monitoringRows.filter((row) => {
      // Status filter
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }
      // Class filter
      if (classFilter !== 'all' && row.className !== classFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchClass = row.className.toLowerCase().includes(q);
        const matchSubject = row.subjectName.toLowerCase().includes(q);
        const matchTeacher = row.teacherName.toLowerCase().includes(q);
        const matchCode = (row.subjectCode || '').toLowerCase().includes(q);
        return matchClass || matchSubject || matchTeacher || matchCode;
      }
      return true;
    });
  }, [monitoringRows, statusFilter, classFilter, searchQuery]);

  // Filtered tree
  const filteredTree = useMemo(() => {
    return classTree
      .filter((cls) => {
        if (classFilter !== 'all' && cls.className !== classFilter) return false;
        return true;
      })
      .map((cls) => {
        const filteredSubjects = cls.subjects.filter((subj) => {
          if (statusFilter !== 'all' && subj.status !== statusFilter) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return (
              subj.subjectName.toLowerCase().includes(q) ||
              subj.teacherName.toLowerCase().includes(q) ||
              cls.className.toLowerCase().includes(q)
            );
          }
          return true;
        });
        return { ...cls, subjects: filteredSubjects };
      })
      .filter((cls) => cls.subjects.length > 0);
  }, [classTree, classFilter, statusFilter, searchQuery]);

  // Calculate status counters
  const statusCounts = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    for (const r of monitoringRows) {
      if (r.status === 'completed') completed++;
      else if (r.status === 'in_progress') inProgress++;
      else notStarted++;
    }
    return { completed, inProgress, notStarted, total: monitoringRows.length };
  }, [monitoringRows]);

  // Aggregate Rombel Summaries for Compact Per-Class View
  const rombelSummaries = useMemo<RombelSummaryItem[]>(() => {
    return classTree
      .map((cls) => {
        const totalSubjects = cls.subjects.length;
        let completedSubjects = 0;
        let inProgressSubjects = 0;
        let notStartedSubjects = 0;
        let totalProgressSum = 0;

        for (const s of cls.subjects) {
          if (s.status === 'completed') completedSubjects++;
          else if (s.status === 'in_progress') inProgressSubjects++;
          else notStartedSubjects++;
          totalProgressSum += s.progressPercentage;
        }

        const avgProgress =
          totalSubjects > 0 ? Math.round(totalProgressSum / totalSubjects) : 0;

        let status: MonitoringStatus = 'not_started';
        if (totalSubjects > 0 && completedSubjects === totalSubjects) {
          status = 'completed';
        } else if (completedSubjects > 0 || inProgressSubjects > 0) {
          status = 'in_progress';
        }

        return {
          classId: cls.classId,
          className: cls.className,
          grade: cls.grade,
          homeroomTeacherName: cls.homeroomTeacherName,
          totalStudents: cls.totalStudents,
          totalSubjects,
          completedSubjects,
          inProgressSubjects,
          notStartedSubjects,
          avgProgress,
          status,
          subjects: cls.subjects,
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
  }, [classTree]);

  // Filtered Rombel Summaries
  const filteredRombelList = useMemo(() => {
    return rombelSummaries.filter((rombel) => {
      if (classFilter !== 'all' && rombel.className !== classFilter) {
        return false;
      }
      if (statusFilter !== 'all' && rombel.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchClass = rombel.className.toLowerCase().includes(q);
        const matchTeacher = (rombel.homeroomTeacherName || '').toLowerCase().includes(q);
        const matchSubject = rombel.subjects.some(
          (s) =>
            s.subjectName.toLowerCase().includes(q) ||
            s.teacherName.toLowerCase().includes(q) ||
            (s.subjectCode || '').toLowerCase().includes(q)
        );
        return matchClass || matchTeacher || matchSubject;
      }
      return true;
    });
  }, [rombelSummaries, classFilter, statusFilter, searchQuery]);

  // Status counts per rombel
  const rombelStatusCounts = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    for (const r of rombelSummaries) {
      if (r.status === 'completed') completed++;
      else if (r.status === 'in_progress') inProgress++;
      else notStarted++;
    }
    return { completed, inProgress, notStarted, total: rombelSummaries.length };
  }, [rombelSummaries]);

  // Expand / collapse handlers
  const toggleClassExpand = (classId: string) => {
    setExpandedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set(filteredRombelList.map((r) => r.classId));
    setExpandedClassIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedClassIds(new Set());
  };

  // Helper to filter inner subjects of an expanded rombel when searching
  const getDisplayedSubjects = (rombel: RombelSummaryItem) => {
    if (!searchQuery.trim()) return rombel.subjects;
    const q = searchQuery.toLowerCase();
    const matches = rombel.subjects.filter(
      (s) =>
        s.subjectName.toLowerCase().includes(q) ||
        s.teacherName.toLowerCase().includes(q) ||
        (s.subjectCode || '').toLowerCase().includes(q)
    );
    if (
      matches.length === 0 &&
      (rombel.className.toLowerCase().includes(q) ||
        (rombel.homeroomTeacherName || '').toLowerCase().includes(q))
    ) {
      return rombel.subjects;
    }
    return matches;
  };

  return (
    <div className="relative min-h-[calc(100vh-2rem)] text-slate-100 font-sans selection:bg-amber-400/30 selection:text-amber-100">
      {/* Background Ambience */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-[8%] h-[30rem] w-[30rem] rounded-full bg-amber-400/[0.04] blur-[120px]" />
        <div className="absolute top-[35%] right-[4%] h-[26rem] w-[26rem] rounded-full bg-emerald-500/[0.035] blur-[130px]" />
        <div className="absolute -bottom-24 left-[42%] h-[24rem] w-[24rem] rounded-full bg-sky-500/[0.025] blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-[1680px] px-2.5 sm:px-4 lg:px-5 xl:px-6 py-2.5 sm:py-3 pb-20 md:pb-6">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 mb-3 rounded-2xl border border-white/[0.09] bg-slate-950/90 backdrop-blur-xl shadow-lg shadow-black/20">
          <div className="h-14 sm:h-[60px] px-2.5 sm:px-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={onBack}
                className="group shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.08] hover:border-white/[0.16] text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>

              <div className="min-w-0 flex items-center gap-2.5">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.08] text-amber-300 text-[10px] font-black uppercase tracking-[0.14em] shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Admin e-Rapor
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h1 className="text-sm sm:text-[15px] font-extrabold text-white tracking-tight truncate">
                      Monitoring & Rekapitulasi e-Rapor
                    </h1>
                    <span className="hidden lg:inline text-slate-700">•</span>
                    <span className="hidden lg:inline text-[11px] text-slate-400 truncate">
                      SDIT AL FIKRI
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Period Selector Dropdown */}
              {periods.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-white/[0.09] bg-slate-900/90 text-white text-xs font-bold focus:outline-none focus:border-amber-400/50 cursor-pointer"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-950 text-white">
                        {p.school_year} • Semester {p.semester} {p.is_active ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 sm:w-auto sm:px-3 rounded-xl border border-white/[0.09] bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                title="Sinkronkan & segarkan data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden sm:inline">Segarkan</span>
              </button>

              {/* Quick Link to Academic Settings */}
              <button
                type="button"
                onClick={() => onNavigate('academic_settings')}
                className="h-9 px-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.10] hover:bg-amber-400/[0.18] text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Buka Pengaturan Akademik & Penugasan Guru"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Pengaturan Akademik</span>
              </button>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="min-h-[55vh] flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-slate-950/55 backdrop-blur-xl px-6 py-12 text-center shadow-2xl">
              <div className="w-10 h-10 border-[3px] border-amber-400/25 border-t-amber-400 rounded-full animate-spin mx-auto" />
              <p className="mt-5 text-sm font-bold text-slate-200">Memuat Dashboard Monitoring e-Rapor...</p>
              <p className="mt-1 text-xs text-slate-400">Menghitung progres pengisian nilai guru.</p>
            </div>
          </div>
        ) : error ? (
          <div className="my-10 rounded-2xl border border-rose-500/25 bg-rose-500/[0.08] p-6 text-center max-w-xl mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Gagal Memuat Data</h3>
            <p className="text-xs text-rose-200 mb-4">{error}</p>
            <button
              onClick={loadInitialData}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <main className="space-y-4">
            {/* KPI Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Progres Keseluruhan */}
                <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Progres e-Rapor
                    </p>
                    <div className="w-8 h-8 rounded-xl border border-amber-400/20 bg-amber-400/[0.08] flex items-center justify-center text-amber-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-2xl sm:text-3xl font-black text-white">{summary.overallProgress}%</p>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {summary.totalScored} / {summary.totalTargets} siswa
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-700"
                      style={{ width: `${summary.overallProgress}%` }}
                    />
                  </div>
                </div>

                {/* 2. Total Rombel */}
                <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Total Rombel
                    </p>
                    <div className="w-8 h-8 rounded-xl border border-sky-400/20 bg-sky-400/[0.08] flex items-center justify-center text-sky-400">
                      <School className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-2xl sm:text-3xl font-black text-white">{summary.totalClasses}</p>
                    <span className="text-[10px] text-slate-400 font-bold">Kelas Aktif</span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 font-medium truncate">
                    Tingkat 1 sampai Tingkat 6
                  </p>
                </div>

                {/* 3. Penugasan Guru */}
                <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Penugasan Guru
                    </p>
                    <div className="w-8 h-8 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] flex items-center justify-center text-emerald-400">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-2xl sm:text-3xl font-black text-white">
                      {summary.totalTeacherAssignments}
                    </p>
                    <span className="text-[10px] text-slate-400 font-bold">Assignment</span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 font-medium truncate">
                    Wali Kelas & Guru Mapel
                  </p>
                </div>

                {/* 4. Mata Pelajaran */}
                <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Mata Pelajaran
                    </p>
                    <div className="w-8 h-8 rounded-xl border border-purple-400/20 bg-purple-400/[0.08] flex items-center justify-center text-purple-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-2xl sm:text-3xl font-black text-white">{summary.totalSubjects}</p>
                    <span className="text-[10px] text-slate-400 font-bold">Mapel Aktif</span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 font-medium truncate">
                    Kurikulum Merdeka SDIT
                  </p>
                </div>
              </div>
            )}

            {/* Filter & Toolbar */}
            <div className="rounded-2xl border border-white/[0.09] bg-slate-950/65 backdrop-blur-xl p-3 sm:p-4 shadow-lg space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kelas, mata pelajaran, atau nama guru..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.035] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Rombel & View Toggle */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Class Filter */}
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-white/[0.08] bg-slate-900 text-white text-xs font-bold focus:outline-none focus:border-amber-400/50 cursor-pointer"
                  >
                    <option value="all">Semua Rombel ({uniqueClasses.length})</option>
                    {uniqueClasses.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>

                  {/* View Mode Toggle */}
                  <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode('compact')}
                      className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === 'compact'
                          ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Tampilan ringkas per rombel dengan rincian mapel interaktif"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Ringkas Rombel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('flat')}
                      className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === 'flat'
                          ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Daftar panjang seluruh mata pelajaran"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Semua Mapel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('tree')}
                      className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === 'tree'
                          ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Tampilan kartu grid per rombel"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Kartu Grid</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Chips Filter */}
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'all'
                      ? 'border-amber-400/40 bg-amber-400/[0.15] text-amber-300'
                      : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-white'
                  }`}
                >
                  Semua Status ({viewMode === 'compact' ? rombelStatusCounts.total : statusCounts.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'completed'
                      ? 'border-emerald-400/40 bg-emerald-400/[0.15] text-emerald-300'
                      : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Selesai ({viewMode === 'compact' ? rombelStatusCounts.completed : statusCounts.completed})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('in_progress')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'in_progress'
                      ? 'border-amber-400/40 bg-amber-400/[0.15] text-amber-300'
                      : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sedang Berjalan ({viewMode === 'compact' ? rombelStatusCounts.inProgress : statusCounts.inProgress})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('not_started')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'not_started'
                      ? 'border-rose-400/40 bg-rose-400/[0.15] text-rose-300'
                      : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-white'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Belum Diisi ({viewMode === 'compact' ? rombelStatusCounts.notStarted : statusCounts.notStarted})</span>
                </button>
              </div>

              {/* Sub-toolbar for Compact Mode */}
              {viewMode === 'compact' && (
                <div className="flex items-center justify-between gap-3 pt-2 text-xs flex-wrap border-t border-white/[0.05]">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-slate-200 font-bold">
                      {filteredRombelList.length} Rombel Terpantau
                    </span>
                    <span className="hidden sm:inline text-[11px] text-slate-500">
                      • Klik baris atau tombol "Lihat Mapel" untuk melihat detail
                    </span>
                  </div>

                  {filteredRombelList.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExpandAll}
                        className="px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Buka rincian mapel untuk semua rombel"
                      >
                        <ChevronDown className="w-3 h-3 text-amber-400" />
                        <span>Buka Semua Mapel</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCollapseAll}
                        className="px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Tutup semua rincian mapel"
                      >
                        <ChevronUp className="w-3 h-3 text-slate-400" />
                        <span>Tutup Semua</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* View Mode 1: Compact Table per Rombel with Expandable Subject Details */}
            {viewMode === 'compact' && (
              <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.03] text-[10px] sm:text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                        <th className="py-3 px-4 w-36">Kelas / Rombel</th>
                        <th className="py-3 px-4">Wali Kelas</th>
                        <th className="py-3 px-4 text-center">Jumlah Siswa</th>
                        <th className="py-3 px-4 text-center">Kelengkapan Mapel</th>
                        <th className="py-3 px-4 min-w-[160px]">Rerata Progres</th>
                        <th className="py-3 px-4 text-center">Status Rombel</th>
                        <th className="py-3 px-4 text-right">Rincian Mapel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] text-xs">
                      {filteredRombelList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500">
                            Tidak ada data rombel yang sesuai kriteria pencarian / filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRombelList.map((rombel) => {
                          const isExpanded = expandedClassIds.has(rombel.classId);
                          const displayedSubjects = getDisplayedSubjects(rombel);

                          return (
                            <React.Fragment key={rombel.classId}>
                              <tr
                                onClick={() => toggleClassExpand(rombel.classId)}
                                className={`hover:bg-white/[0.03] transition-colors cursor-pointer group ${
                                  isExpanded ? 'bg-white/[0.02]' : ''
                                }`}
                              >
                                {/* Kelas / Rombel */}
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/25 text-amber-300 flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                                      {rombel.grade || rombel.className[0]}
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-white text-sm block">
                                        Kelas {rombel.className}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        Jenjang {rombel.grade || rombel.className[0]}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Wali Kelas */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2">
                                    {rombel.homeroomTeacherName ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-200">
                                          {rombel.homeroomTeacherName}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] text-[9px] font-bold text-emerald-300">
                                          Wali Kelas
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-500 italic">Belum Ditugaskan</span>
                                    )}
                                  </div>
                                </td>

                                {/* Jumlah Siswa */}
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-200">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{rombel.totalStudents} Siswa</span>
                                  </span>
                                </td>

                                {/* Kelengkapan Mapel */}
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      rombel.completedSubjects === rombel.totalSubjects && rombel.totalSubjects > 0
                                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                        : rombel.completedSubjects > 0
                                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                                        : 'bg-slate-800 border border-white/[0.08] text-slate-400'
                                    }`}
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>
                                      {rombel.completedSubjects} / {rombel.totalSubjects} Selesai
                                    </span>
                                  </span>
                                </td>

                                {/* Rerata Progres */}
                                <td className="py-3.5 px-4 min-w-[160px]">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                      <span
                                        className={
                                          rombel.status === 'completed'
                                            ? 'text-emerald-300'
                                            : rombel.status === 'in_progress'
                                            ? 'text-amber-300'
                                            : 'text-slate-500'
                                        }
                                      >
                                        {rombel.avgProgress}%
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-normal">Rerata</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          rombel.status === 'completed'
                                            ? 'bg-emerald-400'
                                            : rombel.status === 'in_progress'
                                            ? 'bg-amber-400'
                                            : 'bg-slate-700'
                                        }`}
                                        style={{ width: `${rombel.avgProgress}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                {/* Status Rombel */}
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      rombel.status === 'completed'
                                        ? 'border border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-300'
                                        : rombel.status === 'in_progress'
                                        ? 'border border-amber-400/25 bg-amber-500/[0.10] text-amber-300'
                                        : 'border border-rose-400/25 bg-rose-500/[0.10] text-rose-300'
                                    }`}
                                  >
                                    {rombel.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                    {rombel.status === 'in_progress' && <Clock className="w-3 h-3" />}
                                    {rombel.status === 'not_started' && <AlertCircle className="w-3 h-3" />}
                                    <span>
                                      {rombel.status === 'completed'
                                        ? 'Selesai'
                                        : rombel.status === 'in_progress'
                                        ? 'Proses'
                                        : 'Belum'}
                                    </span>
                                  </span>
                                </td>

                                {/* Aksi: Buka / Tutup Mapel */}
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleClassExpand(rombel.classId);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                      isExpanded
                                        ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                                        : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    <span>
                                      {isExpanded ? 'Tutup Mapel' : `Lihat Mapel (${rombel.subjects.length})`}
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded Row for Subject Details */}
                              {isExpanded && (
                                <tr className="bg-slate-900/60 border-b border-white/[0.08]">
                                  <td colSpan={7} className="p-3 sm:p-4 md:p-5">
                                    <div className="rounded-2xl border border-white/[0.08] bg-slate-950/80 p-4 space-y-3 shadow-inner">
                                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-white/[0.06]">
                                        <div className="flex items-center gap-2">
                                          <BookOpen className="w-4 h-4 text-amber-400" />
                                          <h4 className="text-xs font-black text-white uppercase tracking-wider">
                                            Rincian {displayedSubjects.length} Mata Pelajaran — Kelas {rombel.className}
                                          </h4>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400">
                                          <span>
                                            Selesai:{' '}
                                            <strong className="text-emerald-300">{rombel.completedSubjects}</strong>
                                          </span>
                                          <span>•</span>
                                          <span>
                                            Proses:{' '}
                                            <strong className="text-amber-300">{rombel.inProgressSubjects}</strong>
                                          </span>
                                          <span>•</span>
                                          <span>
                                            Belum:{' '}
                                            <strong className="text-rose-300">{rombel.notStartedSubjects}</strong>
                                          </span>
                                        </div>
                                      </div>

                                      <div className="border border-white/[0.07] rounded-xl overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] uppercase font-bold text-slate-400">
                                            <tr>
                                              <th className="py-2.5 px-3">Mata Pelajaran</th>
                                              <th className="py-2.5 px-3">Guru Pengampu</th>
                                              <th className="py-2.5 px-3 text-center">Siswa Dinilai</th>
                                              <th className="py-2.5 px-3 min-w-[130px]">Progres</th>
                                              <th className="py-2.5 px-3 text-center">Status</th>
                                              <th className="py-2.5 px-3 text-right">Aksi</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-white/[0.04]">
                                            {displayedSubjects.length === 0 ? (
                                              <tr>
                                                <td colSpan={6} className="py-6 text-center text-slate-500">
                                                  Tidak ada mata pelajaran yang cocok dengan pencarian di kelas ini.
                                                </td>
                                              </tr>
                                            ) : (
                                              displayedSubjects.map((subj) => (
                                                <tr
                                                  key={subj.subjectId}
                                                  className="hover:bg-white/[0.02] transition-colors"
                                                >
                                                  {/* Subject */}
                                                  <td className="py-2.5 px-3 font-semibold text-white">
                                                    <div className="flex items-center gap-1.5">
                                                      <span>{subj.subjectName}</span>
                                                      {subj.subjectCode && (
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                          ({subj.subjectCode})
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>

                                                  {/* Teacher */}
                                                  <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-1.5">
                                                      <span
                                                        className={
                                                          subj.teacherId
                                                            ? 'text-slate-200 font-medium'
                                                            : 'text-rose-300 italic'
                                                        }
                                                      >
                                                        {subj.teacherName}
                                                      </span>
                                                      {subj.assignmentType === 'homeroom_teacher' && (
                                                        <span className="px-1.5 py-0.2 rounded border border-emerald-400/20 bg-emerald-400/[0.08] text-[9px] font-bold text-emerald-300">
                                                          Wali Kelas
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>

                                                  {/* Scored Students */}
                                                  <td className="py-2.5 px-3 text-center">
                                                    <span className="font-bold text-white">{subj.scoredStudents}</span>
                                                    <span className="text-slate-500"> / {subj.totalStudents}</span>
                                                  </td>

                                                  {/* Progress Bar */}
                                                  <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2">
                                                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                                                        <div
                                                          className={`h-full rounded-full ${
                                                            subj.status === 'completed'
                                                              ? 'bg-emerald-400'
                                                              : subj.status === 'in_progress'
                                                              ? 'bg-amber-400'
                                                              : 'bg-slate-700'
                                                          }`}
                                                          style={{ width: `${subj.progressPercentage}%` }}
                                                        />
                                                      </div>
                                                      <span className="text-[10px] font-bold text-slate-300 w-8 text-right">
                                                        {subj.progressPercentage}%
                                                      </span>
                                                    </div>
                                                  </td>

                                                  {/* Status Badge */}
                                                  <td className="py-2.5 px-3 text-center">
                                                    <span
                                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                        subj.status === 'completed'
                                                          ? 'bg-emerald-400/15 text-emerald-300'
                                                          : subj.status === 'in_progress'
                                                          ? 'bg-amber-400/15 text-amber-300'
                                                          : 'bg-rose-400/15 text-rose-300'
                                                      }`}
                                                    >
                                                      {subj.status === 'completed'
                                                        ? 'Selesai'
                                                        : subj.status === 'in_progress'
                                                        ? 'Proses'
                                                        : 'Belum'}
                                                    </span>
                                                  </td>

                                                  {/* Action Button */}
                                                  <td className="py-2.5 px-3 text-right">
                                                    <button
                                                      type="button"
                                                      onClick={() => handlePreviewAsTeacher(subj.teacherId)}
                                                      disabled={!subj.teacherId}
                                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-amber-400/[0.15] hover:border-amber-400/35 hover:text-amber-200 text-slate-300 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                      title="Buka lembar penilaian guru ini"
                                                    >
                                                      <Eye className="w-3 h-3" />
                                                      <span>Buka Rapor</span>
                                                    </button>
                                                  </td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View Mode 2: Flat Table for All Subjects */}
            {viewMode === 'flat' && (
              <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.03] text-[10px] sm:text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4">Mata Pelajaran</th>
                        <th className="py-3 px-4">Guru Pengampu</th>
                        <th className="py-3 px-4 text-center">Siswa Dinilai</th>
                        <th className="py-3 px-4">Progres</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] text-xs">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500">
                            Tidak ada data monitoring yang sesuai filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row) => (
                          <tr
                            key={row.id}
                            className="hover:bg-white/[0.025] transition-colors group"
                          >
                            {/* Class */}
                            <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                              Kelas {row.className}
                            </td>

                            {/* Subject */}
                            <td className="py-3 px-4 font-semibold text-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span>{row.subjectName}</span>
                                {row.subjectCode && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    ({row.subjectCode})
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Teacher */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold ${
                                    row.teacherId ? 'text-slate-200' : 'text-rose-300 italic'
                                  }`}
                                >
                                  {row.teacherName}
                                </span>
                                {row.assignmentType === 'homeroom_teacher' && (
                                  <span className="px-1.5 py-0.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] text-[9px] font-bold text-emerald-300">
                                    Wali Kelas
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Scored Students */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className="font-extrabold text-white">
                                {row.scoredStudents}
                              </span>
                              <span className="text-slate-500 font-medium"> / {row.totalStudents}</span>
                            </td>

                            {/* Progress */}
                            <td className="py-3 px-4 min-w-[140px]">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span
                                    className={
                                      row.status === 'completed'
                                        ? 'text-emerald-300'
                                        : row.status === 'in_progress'
                                        ? 'text-amber-300'
                                        : 'text-slate-500'
                                    }
                                  >
                                    {row.progressPercentage}%
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      row.status === 'completed'
                                        ? 'bg-emerald-400'
                                        : row.status === 'in_progress'
                                        ? 'bg-amber-400'
                                        : 'bg-slate-700'
                                    }`}
                                    style={{ width: `${row.progressPercentage}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  row.status === 'completed'
                                    ? 'border border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-300'
                                    : row.status === 'in_progress'
                                    ? 'border border-amber-400/25 bg-amber-500/[0.10] text-amber-300'
                                    : 'border border-rose-400/25 bg-rose-500/[0.10] text-rose-300'
                                }`}
                              >
                                {row.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                {row.status === 'in_progress' && <Clock className="w-3 h-3" />}
                                {row.status === 'not_started' && <AlertCircle className="w-3 h-3" />}
                                <span>
                                  {row.status === 'completed'
                                    ? 'Selesai'
                                    : row.status === 'in_progress'
                                    ? 'Proses'
                                    : 'Belum'}
                                </span>
                              </span>
                            </td>

                            {/* Action: Preview As Teacher */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handlePreviewAsTeacher(row.teacherId)}
                                disabled={!row.teacherId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.09] bg-white/[0.04] hover:bg-amber-400/[0.15] hover:border-amber-400/35 hover:text-amber-200 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Lihat/Buka workspace sebagai guru ini"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Buka Rapor</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View Mode 2: Tree View per Class */}
            {viewMode === 'tree' && (
              <div className="space-y-3">
                {filteredTree.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-12 text-center text-slate-500">
                    Tidak ada rombel yang sesuai filter.
                  </div>
                ) : (
                  filteredTree.map((cls) => (
                    <article
                      key={cls.classId}
                      className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl p-4 sm:p-5 shadow-lg space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.07]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl border border-amber-400/20 bg-amber-400/[0.08] flex items-center justify-center text-amber-300 font-extrabold text-sm">
                            {cls.grade || cls.className[0]}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-white">Kelas {cls.className}</h3>
                            <p className="text-[11px] text-slate-400 font-medium">
                              Wali Kelas: {cls.homeroomTeacherName || 'Belum Ditugaskan'} • {cls.totalStudents} Siswa
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-slate-400">
                          {cls.subjects.length} Mata Pelajaran
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {cls.subjects.map((subj) => (
                          <div
                            key={subj.subjectId}
                            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col justify-between hover:border-amber-400/25 transition-all"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-white leading-tight">
                                  {subj.subjectName}
                                </h4>
                                <span
                                  className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    subj.status === 'completed'
                                      ? 'bg-emerald-400/15 text-emerald-300'
                                      : subj.status === 'in_progress'
                                      ? 'bg-amber-400/15 text-amber-300'
                                      : 'bg-rose-400/15 text-rose-300'
                                  }`}
                                >
                                  {subj.status === 'completed'
                                    ? 'Selesai'
                                    : subj.status === 'in_progress'
                                    ? 'Proses'
                                    : 'Belum'}
                                </span>
                              </div>

                              <p className="mt-1 text-[11px] text-slate-400 truncate">
                                {subj.teacherName}
                              </p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-white/[0.05] flex items-center justify-between gap-2">
                              <div className="text-[10px] text-slate-400">
                                <span className="font-bold text-white">{subj.scoredStudents}</span> /{' '}
                                {subj.totalStudents} ({subj.progressPercentage}%)
                              </div>

                              <button
                                type="button"
                                onClick={() => handlePreviewAsTeacher(subj.teacherId)}
                                disabled={!subj.teacherId}
                                className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-amber-400/[0.15] text-slate-300 hover:text-amber-200 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-30"
                              >
                                Buka Rapor
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
};
