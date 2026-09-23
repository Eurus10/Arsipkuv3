import React, { useMemo, useState } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  FileText,
  FileSpreadsheet,
  BookOpenCheck,
  GraduationCap,
  CalendarDays,
  UserRound,
  Layers,
  ListChecks,
  X,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

import {
  EvaluationBlueprint,
  EvaluationBlueprintItem,
} from '../../types/evaluationTypes';

import {
  getStoredBlueprints,
  deleteBlueprint,
} from '../../services/evaluation/evaluationStorageService';

import {
  exportBlueprintToExcel,
  exportBlueprintToWordDocx,
} from '../../services/evaluation/evaluationExportService';

interface EvaluationReviewKisiKisiViewProps {
  /**
   * Dipanggil ketika guru ingin membuka kisi-kisi
   * pada builder/editor utama.
   *
   * Callback ini sengaja optional agar modul ini
   * tetap bisa dipakai sendiri sebelum integrasi
   * dengan EvaluationLearningView selesai.
   */
  onEditBlueprint?: (blueprint: EvaluationBlueprint) => void;

  /**
   * Alias callback untuk membuka builder.
   * Jika onEditBlueprint tidak diberikan, callback
   * ini akan digunakan.
   */
  onOpenBuilder?: (blueprint: EvaluationBlueprint) => void;

  /**
   * Dipanggil ketika guru memilih kisi-kisi untuk langsung
   * melanjutkan ke generator naskah soal (Sub-Menu 2 / Step 3).
   */
  onSelectForQuestions?: (blueprint: EvaluationBlueprint) => void;

  /**
   * Callback opsional untuk kembali ke menu sebelumnya.
   */
  onBack?: () => void;
}

/* ============================================================
 * CONSTANTS
 * ============================================================ */

const ALL_VALUE = '__ALL__';

const COGNITIVE_LABELS: Record<string, string> = {
  C1: 'C1 • Mengingat',
  C2: 'C2 • Memahami',
  C3: 'C3 • Menerapkan',
  C4: 'C4 • Menganalisis',
  C5: 'C5 • Mengevaluasi',
  C6: 'C6 • Mencipta',
};

const QUESTION_FORM_LABELS: Record<string, string> = {
  PG: 'Pilihan Ganda',
  ISIAN: 'Isian',
  URAIAN: 'Uraian',
  ESSAY: 'Essay',
  MENJODOHKAN: 'Menjodohkan',
};

/* ============================================================
 * HELPERS
 * ============================================================ */

function safeText(value?: string | null): string {
  if (!value) return '-';
  return String(value).trim() || '-';
}

function formatDate(value?: string): string {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value?: string): string {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalize(value?: string): string {
  return (value || '').toLowerCase().trim();
}

function getExamShortLabel(examType?: string): string {
  const value = safeText(examType);

  if (value === '-') return '-';

  const normalized = normalize(value);

  if (normalized.includes('sts')) return 'STS';
  if (normalized.includes('sas')) return 'SAS';
  if (normalized.includes('sat')) return 'SAT';
  if (normalized.includes('ujian sekolah')) return 'US';
  if (normalized.includes('penilaian harian')) return 'PH';
  if (normalized.includes('try out')) return 'TRY OUT';

  return value.length > 18 ? `${value.slice(0, 18)}…` : value;
}

function getBlueprintItemCount(blueprint: EvaluationBlueprint): number {
  return Array.isArray(blueprint.items)
    ? blueprint.items.length
    : 0;
}

function getQuestionFormCounts(
  blueprint: EvaluationBlueprint
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const item of blueprint.items || []) {
    const key = item.questionForm || 'LAINNYA';
    counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}

function getCognitiveCounts(
  blueprint: EvaluationBlueprint
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const item of blueprint.items || []) {
    const key = item.cognitiveLevel || 'LAINNYA';
    counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}

/* ============================================================
 * COMPONENT
 * ============================================================ */

export const EvaluationReviewKisiKisiView: React.FC<
  EvaluationReviewKisiKisiViewProps
> = ({
  onEditBlueprint,
  onOpenBuilder,
  onSelectForQuestions,
  onBack,
}) => {
  /* ==========================================================
   * DATA STATE
   * ========================================================== */

  const [blueprints, setBlueprints] = useState<
    EvaluationBlueprint[]
  >(() => getStoredBlueprints());

  const [search, setSearch] = useState('');

  const [filterSubject, setFilterSubject] =
    useState(ALL_VALUE);

  const [filterClass, setFilterClass] =
    useState(ALL_VALUE);

  const [filterExamType, setFilterExamType] =
    useState(ALL_VALUE);

  const [filterSchoolYear, setFilterSchoolYear] =
    useState(ALL_VALUE);

  const [filterSemester, setFilterSemester] =
    useState(ALL_VALUE);

  const [sortMode, setSortMode] =
    useState<'newest' | 'oldest' | 'title'>(
      'newest'
    );

  const [selectedBlueprint, setSelectedBlueprint] =
    useState<EvaluationBlueprint | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<EvaluationBlueprint | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  /* ==========================================================
   * FILTER OPTIONS
   * ========================================================== */

  const subjectOptions = useMemo(() => {
    return (Array.from(
      new Set(
        blueprints
          .map((item) => item.subjectName)
          .filter(
            (value): value is string =>
              Boolean(value && value.trim())
          )
      )
    ) as string[]).sort((a, b) =>
      a.localeCompare(b, 'id')
    );
  }, [blueprints]);

  const classOptions = useMemo(() => {
    return (Array.from(
      new Set(
        blueprints
          .map((item) => item.className)
          .filter(
            (value): value is string =>
              Boolean(value && value.trim())
          )
      )
    ) as string[]).sort((a, b) =>
      a.localeCompare(b, 'id')
    );
  }, [blueprints]);

  const examTypeOptions = useMemo(() => {
    return (Array.from(
      new Set(
        blueprints
          .map((item) => item.examType)
          .filter(
            (value): value is string =>
              Boolean(value && value.trim())
          )
      )
    ) as string[]).sort((a, b) =>
      a.localeCompare(b, 'id')
    );
  }, [blueprints]);

  const schoolYearOptions = useMemo(() => {
    return (Array.from(
      new Set(
        blueprints
          .map((item) => item.schoolYear)
          .filter(
            (value): value is string =>
              Boolean(value && value.trim())
          )
      )
    ) as string[]).sort((a, b) =>
      b.localeCompare(a, 'id')
    );
  }, [blueprints]);

  const semesterOptions = useMemo(() => {
    return (Array.from(
      new Set(
        blueprints
          .map((item) => item.semester)
          .filter(
            (value): value is string =>
              Boolean(value && value.trim())
          )
      )
    ) as string[]).sort((a, b) =>
      a.localeCompare(b, 'id')
    );
  }, [blueprints]);

  /* ==========================================================
   * FILTERED DATA
   * ========================================================== */

  const filteredBlueprints = useMemo(() => {
    const query = normalize(search);

    const result = blueprints.filter(
      (blueprint) => {
        const searchableText = [
          blueprint.title,
          blueprint.subjectName,
          blueprint.className,
          blueprint.semester,
          blueprint.schoolYear,
          blueprint.examType,
          blueprint.teacherName,
          blueprint.materialContextSummary,
          ...(blueprint.items || []).flatMap(
            (item) => [
              item.material,
              item.curriculumGoal,
              item.indicator,
              item.cognitiveLevel,
              item.questionForm,
              item.questionNumber,
            ]
          ),
        ]
          .filter(Boolean)
          .join(' ');

        const matchesSearch =
          !query ||
          normalize(searchableText).includes(
            query
          );

        const matchesSubject =
          filterSubject === ALL_VALUE ||
          blueprint.subjectName ===
            filterSubject;

        const matchesClass =
          filterClass === ALL_VALUE ||
          blueprint.className ===
            filterClass;

        const matchesExamType =
          filterExamType === ALL_VALUE ||
          blueprint.examType ===
            filterExamType;

        const matchesSchoolYear =
          filterSchoolYear === ALL_VALUE ||
          blueprint.schoolYear ===
            filterSchoolYear;

        const matchesSemester =
          filterSemester === ALL_VALUE ||
          blueprint.semester ===
            filterSemester;

        return (
          matchesSearch &&
          matchesSubject &&
          matchesClass &&
          matchesExamType &&
          matchesSchoolYear &&
          matchesSemester
        );
      }
    );

    result.sort((a, b) => {
      if (sortMode === 'title') {
        return safeText(a.title).localeCompare(
          safeText(b.title),
          'id'
        );
      }

      const aTime = new Date(
        a.updatedAt || a.createdAt
      ).getTime();

      const bTime = new Date(
        b.updatedAt || b.createdAt
      ).getTime();

      if (sortMode === 'oldest') {
        return aTime - bTime;
      }

      return bTime - aTime;
    });

    return result;
  }, [
    blueprints,
    search,
    filterSubject,
    filterClass,
    filterExamType,
    filterSchoolYear,
    filterSemester,
    sortMode,
  ]);

  /* ==========================================================
   * SUMMARY
   * ========================================================== */

  const totalItems = useMemo(() => {
    return filteredBlueprints.reduce(
      (total, blueprint) =>
        total +
        getBlueprintItemCount(blueprint),
      0
    );
  }, [filteredBlueprints]);

  const totalBlueprints = filteredBlueprints.length;

  /* ==========================================================
   * ACTIONS
   * ========================================================== */

  const handleRefresh = () => {
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const latest =
        getStoredBlueprints();

      setBlueprints(latest);
      setSuccessMessage(
        'Data kisi-kisi berhasil diperbarui.'
      );

      window.setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
    } catch (error) {
      console.error(
        '[Review Kisi-Kisi] Failed to refresh:',
        error
      );

      setErrorMessage(
        'Gagal memuat ulang data kisi-kisi.'
      );
    } finally {
      window.setTimeout(() => {
        setIsRefreshing(false);
      }, 250);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    const targetId =
      deleteTarget.id;

    try {
      const deleted =
        deleteBlueprint(targetId);

      if (!deleted) {
        setErrorMessage(
          'Kisi-kisi tidak ditemukan atau gagal dihapus.'
        );
        setDeleteTarget(null);
        return;
      }

      setBlueprints((current) =>
        current.filter(
          (item) =>
            item.id !== targetId
        )
      );

      if (
        selectedBlueprint?.id ===
        targetId
      ) {
        setSelectedBlueprint(null);
      }

      setDeleteTarget(null);

      setSuccessMessage(
        'Kisi-kisi berhasil dihapus dari bank kisi-kisi.'
      );

      window.setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error(
        '[Review Kisi-Kisi] Failed to delete:',
        error
      );

      setErrorMessage(
        'Terjadi kesalahan saat menghapus kisi-kisi.'
      );
    }
  };

  const handleEdit = (
    blueprint: EvaluationBlueprint
  ) => {
    if (onEditBlueprint) {
      onEditBlueprint(blueprint);
      return;
    }

    if (onOpenBuilder) {
      onOpenBuilder(blueprint);
      return;
    }

    setSelectedBlueprint(blueprint);
    setErrorMessage(
      'Editor belum dihubungkan ke modul Review Kisi-Kisi.'
    );

    window.setTimeout(() => {
      setErrorMessage(null);
    }, 3500);
  };

  const handleExportExcel = (
    blueprint: EvaluationBlueprint
  ) => {
    try {
      exportBlueprintToExcel(
        blueprint
      );

      setSuccessMessage(
        `Export Excel untuk "${blueprint.title}" berhasil dimulai.`
      );

      window.setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error(
        '[Review Kisi-Kisi] Excel export failed:',
        error
      );

      setErrorMessage(
        'Gagal melakukan export Excel.'
      );
    }
  };

  const handleExportWord = async (
    blueprint: EvaluationBlueprint
  ) => {
    try {
      await exportBlueprintToWordDocx(
        blueprint
      );

      setSuccessMessage(
        `Export Word untuk "${blueprint.title}" berhasil dimulai.`
      );

      window.setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error(
        '[Review Kisi-Kisi] Word export failed:',
        error
      );

      setErrorMessage(
        'Gagal melakukan export Word.'
      );
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilterSubject(ALL_VALUE);
    setFilterClass(ALL_VALUE);
    setFilterExamType(ALL_VALUE);
    setFilterSchoolYear(ALL_VALUE);
    setFilterSemester(ALL_VALUE);
    setSortMode('newest');
  };

  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <div className="space-y-6">
      {/* ======================================================
       * HEADER
       * ====================================================== */}

      <header>
        <div className="relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0C1120] via-[#10172B] to-[#171330] border border-indigo-500/25 shadow-xl shadow-black/20">
          <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-start sm:items-center gap-3.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="group p-2.5 rounded-xl bg-[#141A29]/90 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-indigo-500 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer border border-slate-700/80 hover:border-indigo-400/50 shadow-md shadow-black/20 shrink-0 flex items-center justify-center"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              </button>
            )}

            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/10">
              <BookOpenCheck className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/35 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                  <ListChecks className="w-3 h-3" />
                  Bank Kisi-Kisi
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Tersimpan Otomatis
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
                Review & Bank Data Kisi-Kisi Soal
              </h1>

              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Kelola seluruh kisi-kisi terstruktur yang pernah dibuat. Cari, filter, preview, edit,
                atau export kembali naskah kisi-kisi tanpa harus mulai dari awal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="relative self-start lg:self-center inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-200 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
            <span>
              {isRefreshing
                ? 'Memuat...'
                : 'Refresh Data'}
            </span>
          </button>
        </div>
      </header>

      {/* ======================================================
       * NOTIFICATIONS
       * ====================================================== */}

      {successMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold shadow-sm">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ======================================================
       * SUMMARY CARDS
       * ====================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <BookOpenCheck className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                Total Kisi-Kisi
              </p>
              <p className="text-lg font-black text-white">
                {blueprints.length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Filter className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                Hasil Filter
              </p>
              <p className="text-lg font-black text-white">
                {totalBlueprints}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
              <ListChecks className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                Total Butir
              </p>
              <p className="text-lg font-black text-white">
                {totalItems}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                Mata Pelajaran
              </p>
              <p className="text-lg font-black text-white">
                {subjectOptions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
       * SEARCH + FILTER
       * ====================================================== */}

      <section className="p-4 sm:p-5 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Cari judul, mapel, kelas, guru, materi, indikator, atau jenis asesmen..."
              className="w-full h-11 bg-[#121624] border border-[#2B3144] focus:border-indigo-400 rounded-xl pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortMode}
                onChange={(e) =>
                  setSortMode(
                    e.target.value as
                      | 'newest'
                      | 'oldest'
                      | 'title'
                  )
                }
                className="h-11 appearance-none bg-[#121624] border border-[#2B3144] text-slate-200 text-xs rounded-xl pl-3 pr-9 focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="newest">
                  Terbaru
                </option>
                <option value="oldest">
                  Terlama
                </option>
                <option value="title">
                  Judul A-Z
                </option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="h-11 px-3.5 rounded-xl bg-[#121624] border border-[#2B3144] hover:bg-[#222838] text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              title="Reset semua filter"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mt-3">
          {/* Subject */}
          <div className="relative">
            <select
              value={filterSubject}
              onChange={(e) =>
                setFilterSubject(
                  e.target.value
                )
              }
              className="w-full h-10 appearance-none bg-[#12141D] border border-[#2B3144] text-slate-300 text-xs rounded-xl pl-3 pr-8 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value={ALL_VALUE}>
                Semua Mata Pelajaran
              </option>

              {subjectOptions.map(
                (subject) => (
                  <option
                    key={subject}
                    value={subject}
                  >
                    {subject}
                  </option>
                )
              )}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* Class */}
          <div className="relative">
            <select
              value={filterClass}
              onChange={(e) =>
                setFilterClass(
                  e.target.value
                )
              }
              className="w-full h-10 appearance-none bg-[#12141D] border border-[#2B3144] text-slate-300 text-xs rounded-xl pl-3 pr-8 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value={ALL_VALUE}>
                Semua Kelas / Rombel
              </option>

              {classOptions.map(
                (className) => (
                  <option
                    key={className}
                    value={className}
                  >
                    {className}
                  </option>
                )
              )}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* Exam Type */}
          <div className="relative">
            <select
              value={filterExamType}
              onChange={(e) =>
                setFilterExamType(
                  e.target.value
                )
              }
              className="w-full h-10 appearance-none bg-[#12141D] border border-[#2B3144] text-slate-300 text-xs rounded-xl pl-3 pr-8 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value={ALL_VALUE}>
                Semua Jenis Asesmen
              </option>

              {examTypeOptions.map(
                (examType) => (
                  <option
                    key={examType}
                    value={examType}
                  >
                    {examType}
                  </option>
                )
              )}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* School Year */}
          <div className="relative">
            <select
              value={filterSchoolYear}
              onChange={(e) =>
                setFilterSchoolYear(
                  e.target.value
                )
              }
              className="w-full h-10 appearance-none bg-[#12141D] border border-[#2B3144] text-slate-300 text-xs rounded-xl pl-3 pr-8 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value={ALL_VALUE}>
                Semua Tahun Pelajaran
              </option>

              {schoolYearOptions.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* Semester */}
          <div className="relative">
            <select
              value={filterSemester}
              onChange={(e) =>
                setFilterSemester(
                  e.target.value
                )
              }
              className="w-full h-10 appearance-none bg-[#12141D] border border-[#2B3144] text-slate-300 text-xs rounded-xl pl-3 pr-8 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value={ALL_VALUE}>
                Semua Semester
              </option>

              {semesterOptions.map(
                (semester) => (
                  <option
                    key={semester}
                    value={semester}
                  >
                    {semester}
                  </option>
                )
              )}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>
              Menampilkan{' '}
              <strong className="text-slate-300">
                {filteredBlueprints.length}
              </strong>{' '}
              dari{' '}
              <strong className="text-slate-300">
                {blueprints.length}
              </strong>{' '}
              kisi-kisi
            </span>
          </div>

          {search ||
          filterSubject !== ALL_VALUE ||
          filterClass !== ALL_VALUE ||
          filterExamType !== ALL_VALUE ||
          filterSchoolYear !== ALL_VALUE ||
          filterSemester !== ALL_VALUE ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Hapus filter aktif
            </button>
          ) : null}
        </div>
      </section>

      {/* ======================================================
       * EMPTY STATE
       * ====================================================== */}

      {filteredBlueprints.length === 0 && (
        <div className="rounded-2xl bg-[#0F1422] border border-slate-800/80 p-10 sm:p-14 text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            {blueprints.length === 0 ? (
              <BookOpenCheck className="w-7 h-7" />
            ) : (
              <Search className="w-7 h-7" />
            )}
          </div>

          {blueprints.length === 0 ? (
            <>
              <h2 className="text-base sm:text-lg font-black text-white">
                Belum Ada Kisi-Kisi Tersimpan
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                Kisi-kisi yang berhasil dibuat dan
                disimpan melalui modul Penyusunan
                Kisi-Kisi akan otomatis muncul di sini.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base sm:text-lg font-black text-white">
                Tidak Ada Kisi-Kisi yang Cocok
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                Coba ubah kata pencarian atau filter
                yang sedang digunakan.
              </p>

              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Pencarian & Filter
              </button>
            </>
          )}
        </div>
      )}

      {/* ======================================================
       * BLUEPRINT CARDS
       * ====================================================== */}

      {filteredBlueprints.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredBlueprints.map(
            (blueprint) => {
              const itemCount =
                getBlueprintItemCount(
                  blueprint
                );

              const formCounts =
                getQuestionFormCounts(
                  blueprint
                );

              const cognitiveCounts =
                getCognitiveCounts(
                  blueprint
                );

              return (
                <article
                  key={blueprint.id}
                  className="group relative overflow-hidden rounded-2xl bg-[#0F1422] border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 shadow-lg hover:shadow-indigo-500/5"
                >
                  {/* Ambient glow */}
                  <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />

                  <div className="relative p-5 sm:p-6">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/35 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                            <BookOpenCheck className="w-3 h-3" />
                            Kisi-Kisi
                          </span>

                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/35 text-amber-300 text-[10px] font-black">
                            {getExamShortLabel(
                              blueprint.examType
                            )}
                          </span>
                        </div>

                        <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                          {safeText(
                            blueprint.title
                          )}
                        </h2>

                        <p className="text-xs sm:text-sm text-indigo-300 font-semibold mt-1.5">
                          {safeText(
                            blueprint.subjectName
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBlueprint(
                              blueprint
                            )
                          }
                          className="w-9 h-9 rounded-xl bg-[#12141D] hover:bg-indigo-500/15 border border-[#2B3144] hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Preview kisi-kisi"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(
                              blueprint
                            )
                          }
                          className="w-9 h-9 rounded-xl bg-[#12141D] hover:bg-amber-500/15 border border-[#2B3144] hover:border-amber-500/30 text-slate-400 hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit kisi-kisi"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget(
                              blueprint
                            )
                          }
                          className="w-9 h-9 rounded-xl bg-[#12141D] hover:bg-rose-500/15 border border-[#2B3144] hover:border-rose-500/30 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Hapus kisi-kisi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-2 flex-wrap mt-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#12141D] border border-[#262C3E] text-[11px] text-slate-300">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                        {safeText(
                          blueprint.className
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#12141D] border border-[#262C3E] text-[11px] text-slate-300">
                        <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                        {safeText(
                          blueprint.schoolYear
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#12141D] border border-[#262C3E] text-[11px] text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        {safeText(
                          blueprint.semester
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#12141D] border border-[#262C3E] text-[11px] text-slate-300">
                        <UserRound className="w-3.5 h-3.5 text-cyan-400" />
                        {safeText(
                          blueprint.teacherName
                        )}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="p-3 rounded-2xl bg-[#12141D] border border-[#242A3D]">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                          Butir
                        </p>

                        <p className="text-lg font-black text-white mt-0.5">
                          {itemCount}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#12141D] border border-[#242A3D]">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                          Bentuk
                        </p>

                        <p className="text-xs font-black text-slate-200 mt-1 truncate">
                          {Object.entries(
                            formCounts
                          )
                            .map(
                              ([key, count]) =>
                                `${key} ${count}`
                            )
                            .join(' • ') ||
                            '-'}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#12141D] border border-[#242A3D]">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                          Kognitif
                        </p>

                        <p className="text-xs font-black text-slate-200 mt-1 truncate">
                          {Object.entries(
                            cognitiveCounts
                          )
                            .map(
                              ([key, count]) =>
                                `${key} ${count}`
                            )
                            .join(' • ') ||
                            '-'}
                        </p>
                      </div>
                    </div>

                    {/* Topic preview */}
                    {blueprint.topics &&
                      blueprint.topics.length >
                        0 && (
                        <div className="mt-4 p-3.5 rounded-2xl bg-[#12141D] border border-[#242A3D]">
                          <div className="flex items-center gap-2 mb-2">
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />

                            <span className="text-[10px] uppercase tracking-wider font-black text-slate-400">
                              Topik / Bab
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {blueprint.topics
                              .slice(0, 4)
                              .map(
                                (topic) => (
                                  <span
                                    key={
                                      topic.id
                                    }
                                    className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/15 text-indigo-300 text-[10px] font-semibold"
                                  >
                                    {
                                      topic.title
                                    }
                                  </span>
                                )
                              )}

                            {blueprint.topics
                              .length > 4 && (
                              <span className="px-2 py-1 rounded-lg bg-[#1B2030] border border-[#293047] text-slate-400 text-[10px] font-semibold">
                                +
                                {blueprint
                                  .topics
                                  .length -
                                  4}{' '}
                                lainnya
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Context summary */}
                    {blueprint.materialContextSummary && (
                      <p className="mt-3 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {blueprint.materialContextSummary}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-[#242A3A]">
                      <div className="text-[10px] text-slate-500">
                        <div>
                          Dibuat:{' '}
                          <span className="text-slate-400">
                            {formatDateTime(
                              blueprint.createdAt
                            )}
                          </span>
                        </div>

                        {blueprint.updatedAt &&
                          blueprint.updatedAt !==
                            blueprint.createdAt && (
                            <div className="mt-0.5">
                              Diperbarui:{' '}
                              <span className="text-slate-400">
                                {formatDateTime(
                                  blueprint.updatedAt
                                )}
                              </span>
                            </div>
                          )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBlueprint(
                              blueprint
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#12141D] hover:bg-[#222838] border border-[#2B3144] text-slate-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleExportWord(
                              blueprint
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/35 text-blue-300 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Word
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleExportExcel(
                              blueprint
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/35 text-emerald-300 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Excel
                        </button>

                        {onSelectForQuestions && (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectForQuestions(blueprint)
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-black shadow-md shadow-purple-600/25 hover:shadow-purple-600/40 transition-all cursor-pointer"
                            title="Lanjut buat naskah soal dari kisi-kisi ini"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Lanjut Buat Naskah Soal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            }
          )}
        </div>
      )}

      {/* ======================================================
       * PREVIEW MODAL
       * ====================================================== */}

      {selectedBlueprint && (
        <BlueprintPreviewModal
          blueprint={
            selectedBlueprint
          }
          onClose={() =>
            setSelectedBlueprint(null)
          }
          onEdit={() => {
            const target =
              selectedBlueprint;

            setSelectedBlueprint(null);

            handleEdit(target);
          }}
          onExportWord={() =>
            handleExportWord(
              selectedBlueprint
            )
          }
          onExportExcel={() =>
            handleExportExcel(
              selectedBlueprint
            )
          }
          onSelectForQuestions={
            onSelectForQuestions
              ? () => {
                  const target = selectedBlueprint;
                  setSelectedBlueprint(null);
                  onSelectForQuestions(target);
                }
              : undefined
          }
        />
      )}

      {/* ======================================================
       * DELETE CONFIRMATION
       * ====================================================== */}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#181B26] border border-[#30374B] shadow-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-black text-white">
              Hapus Kisi-Kisi?
            </h3>

            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              Anda akan menghapus kisi-kisi:
            </p>

            <div className="mt-3 p-3 rounded-2xl bg-[#12141D] border border-[#242A3D]">
              <p className="text-sm font-bold text-slate-200">
                {deleteTarget.title}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                {deleteTarget.subjectName} •{' '}
                {deleteTarget.className} •{' '}
                {deleteTarget.examType}
              </p>
            </div>

            <div className="flex items-start gap-2 mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />

              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Data kisi-kisi akan dihapus dari
                penyimpanan lokal. Data paket soal
                yang sudah dibuat tidak ikut dihapus
                pada tahap ini.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                className="px-4 py-2.5 rounded-xl bg-[#222838] hover:bg-[#2B3245] text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-black transition-colors cursor-pointer"
              >
                Ya, Hapus Kisi-Kisi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
 * PREVIEW MODAL
 * ============================================================ */

interface BlueprintPreviewModalProps {
  blueprint: EvaluationBlueprint;
  onClose: () => void;
  onEdit: () => void;
  onExportWord: () => void;
  onExportExcel: () => void;
  onSelectForQuestions?: () => void;
}

const BlueprintPreviewModal: React.FC<
  BlueprintPreviewModalProps
> = ({
  blueprint,
  onClose,
  onEdit,
  onExportWord,
  onExportExcel,
  onSelectForQuestions,
}) => {
  const [previewSearch, setPreviewSearch] =
    useState('');

  const filteredItems = useMemo(() => {
    const query =
      normalize(previewSearch);

    if (!query) {
      return blueprint.items || [];
    }

    return (blueprint.items || []).filter(
      (item) => {
        const text = [
          item.number,
          item.questionNumber,
          item.material,
          item.curriculumGoal,
          item.indicator,
          item.cognitiveLevel,
          item.questionForm,
          item.sectionLabel,
        ]
          .filter(Boolean)
          .join(' ');

        return normalize(
          String(text)
        ).includes(query);
      }
    );
  }, [
    blueprint.items,
    previewSearch,
  ]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-7xl max-h-[94vh] flex flex-col rounded-3xl bg-[#181B26] border border-[#30374B] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-[#292F40] flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                <BookOpenCheck className="w-3 h-3" />
                Preview Kisi-Kisi
              </span>

              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-black">
                {getExamShortLabel(
                  blueprint.examType
                )}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
              {safeText(
                blueprint.title
              )}
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {safeText(
                blueprint.subjectName
              )}{' '}
              •{' '}
              {safeText(
                blueprint.className
              )}{' '}
              •{' '}
              {safeText(
                blueprint.schoolYear
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#222838] hover:bg-[#2B3245] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metadata */}
        <div className="px-4 sm:px-6 py-3 border-b border-[#252B3B] bg-[#151821] flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <PreviewMeta
              icon={
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              }
              label="Kelas"
              value={blueprint.className}
            />

            <PreviewMeta
              icon={
                <Layers className="w-3.5 h-3.5 text-purple-400" />
              }
              label="Semester"
              value={blueprint.semester}
            />

            <PreviewMeta
              icon={
                <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
              }
              label="Tahun Pelajaran"
              value={blueprint.schoolYear}
            />

            <PreviewMeta
              icon={
                <FileText className="w-3.5 h-3.5 text-blue-400" />
              }
              label="Jenis Asesmen"
              value={blueprint.examType}
            />

            <PreviewMeta
              icon={
                <UserRound className="w-3.5 h-3.5 text-cyan-400" />
              }
              label="Guru"
              value={blueprint.teacherName}
            />

            <PreviewMeta
              icon={
                <ListChecks className="w-3.5 h-3.5 text-indigo-400" />
              }
              label="Jumlah Butir"
              value={`${blueprint.items?.length || 0} butir`}
            />
          </div>
        </div>

        {/* Preview Toolbar */}
        <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row gap-2 justify-between border-b border-[#252B3B] flex-shrink-0">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />

            <input
              type="text"
              value={previewSearch}
              onChange={(e) =>
                setPreviewSearch(
                  e.target.value
                )
              }
              placeholder="Cari materi, indikator, level kognitif..."
              className="w-full h-9 bg-[#12141D] border border-[#2B3144] rounded-xl pl-9 pr-3 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>

            <button
              type="button"
              onClick={onExportWord}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-300 text-[11px] font-bold transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Word
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[11px] font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>

            {onSelectForQuestions && (
              <button
                type="button"
                onClick={onSelectForQuestions}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-black shadow-md shadow-purple-600/25 hover:shadow-purple-600/40 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Lanjut Buat Naskah Soal
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[1050px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#202637] border-b border-[#333A4E]">
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-300 text-center w-[55px]">
                  No
                </th>

                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-300 text-left min-w-[190px]">
                  Materi Pokok / Bab
                </th>

                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-300 text-left min-w-[220px]">
                  CP / TP
                </th>

                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-300 text-left min-w-[300px]">
                  Indikator Soal
                </th>

                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-300 text-center min-w-[120px]">
                  Level
                </th>

                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-300 text-center min-w-[130px]">
                  Bentuk
                </th>

                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-300 text-center min-w-[120px]">
                  No. Soal
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-xs text-slate-500"
                  >
                    Tidak ada butir yang cocok
                    dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map(
                  (
                    item: EvaluationBlueprintItem,
                    index
                  ) => (
                    <tr
                      key={
                        item.id ||
                        `${blueprint.id}-${index}`
                      }
                      className="border-b border-[#252B3A] hover:bg-[#1D2230] transition-colors align-top"
                    >
                      <td className="px-3 py-3 text-center text-xs font-bold text-slate-300">
                        {item.number ??
                          index + 1}
                      </td>

                      <td className="px-3 py-3">
                        <p className="text-xs font-semibold text-slate-200 leading-relaxed">
                          {safeText(
                            item.material
                          )}
                        </p>

                        {item.sectionLabel && (
                          <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wide text-indigo-300 bg-indigo-500/10 border border-indigo-500/15 rounded-lg px-2 py-0.5">
                            {
                              item.sectionLabel
                            }
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-xs text-slate-400 leading-relaxed">
                        {safeText(
                          item.curriculumGoal
                        )}
                      </td>

                      <td className="px-3 py-3 text-xs text-slate-300 leading-relaxed">
                        {safeText(
                          item.indicator
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-black">
                          {item.cognitiveLevel ||
                            '-'}
                        </span>

                        {item.cognitiveLevel &&
                          COGNITIVE_LABELS[
                            item
                              .cognitiveLevel
                          ] && (
                            <p className="text-[9px] text-slate-500 mt-1">
                              {
                                COGNITIVE_LABELS[
                                  item
                                    .cognitiveLevel
                                ]
                              }
                            </p>
                          )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-black">
                          {item.questionForm ||
                            '-'}
                        </span>

                        {item.questionForm &&
                          QUESTION_FORM_LABELS[
                            item
                              .questionForm
                          ] && (
                            <p className="text-[9px] text-slate-500 mt-1">
                              {
                                QUESTION_FORM_LABELS[
                                  item
                                    .questionForm
                                ]
                              }
                            </p>
                          )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="text-xs font-black text-amber-300">
                          {safeText(
                            item.questionNumber
                          )}
                        </span>

                        {item.sectionNumber !==
                          undefined && (
                          <p className="text-[9px] text-slate-500 mt-1">
                            Bagian #{' '}
                            {
                              item.sectionNumber
                            }
                          </p>
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#292F40] bg-[#151821] flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-[10px] text-slate-500">
            Menampilkan{' '}
            <span className="text-slate-300 font-bold">
              {filteredItems.length}
            </span>{' '}
            dari{' '}
            <span className="text-slate-300 font-bold">
              {blueprint.items?.length ||
                0}
            </span>{' '}
            butir.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#222838] hover:bg-[#2B3245] text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup Preview
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
 * PREVIEW META
 * ============================================================ */

interface PreviewMetaProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
}

const PreviewMeta: React.FC<
  PreviewMetaProps
> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="p-2.5 rounded-xl bg-[#181D28] border border-[#252C3E] min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[9px] uppercase tracking-wide font-bold text-slate-500">
          {label}
        </span>
      </div>

      <p
        className="text-[10px] sm:text-[11px] font-semibold text-slate-200 truncate"
        title={safeText(value)}
      >
        {safeText(value)}
      </p>
    </div>
  );
};

export default EvaluationReviewKisiKisiView;