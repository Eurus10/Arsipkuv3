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

type ViewMode = 'table' | 'tree';

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

  // Filters
  const [viewMode, setViewMode] = useState<ViewMode>('table');
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
                      onClick={() => setViewMode('table')}
                      className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Tabel Monitoring</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('tree')}
                      className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === 'tree'
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Per Rombel</span>
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
                  Semua Status ({statusCounts.total})
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
                  <span>Selesai ({statusCounts.completed})</span>
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
                  <span>Sedang Berjalan ({statusCounts.inProgress})</span>
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
                  <span>Belum Diisi ({statusCounts.notStarted})</span>
                </button>
              </div>
            </div>

            {/* View Mode 1: Table View */}
            {viewMode === 'table' && (
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
