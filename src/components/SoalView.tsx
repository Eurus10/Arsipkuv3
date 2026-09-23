import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  X,
  BookOpen,
  LayoutGrid,
  List,
  Info,
  ArrowUpDown,
  FolderOpen,
  ExternalLink,
  Edit2,
  FileText,
  GraduationCap,
  CircleCheck,
  CircleAlert,
} from 'lucide-react';

import { DocumentItem } from '../types';
import {
  SoalGridCard,
  YearGroupData,
  GoogleDriveIcon,
} from './SoalGridCard';
import { getAllSchoolYears } from '../services/storage';
import { openProtectedExternalDriveUrl } from '../utils/driveHelpers';

interface SoalViewProps {
  documents: DocumentItem[];
  onEditDocument?: (doc: DocumentItem) => void;
  onNavigateToUpload?: () => void;
  onNavigateToTracking?: () => void;
}

/* ============================================================
   DEFAULT TAHUN PELAJARAN
   ============================================================ */

const DEFAULT_YEARS_FALLBACK = [
  '2026/2027',
  '2025/2026',
  '2024/2025',
  '2023/2024',
];

/* ============================================================
   MAIN VIEW
   ============================================================ */

export const SoalView: React.FC<SoalViewProps> = ({
  documents,
  onEditDocument,
  onNavigateToUpload,
  onNavigateToTracking,
}) => {
  const [search, setSearch] = useState('');

  const [sortOrder, setSortOrder] =
    useState<'newest' | 'oldest'>('newest');

  const [viewMode, setViewMode] =
    useState<'grid' | 'list'>('grid');

  const [showInfoBanner, setShowInfoBanner] =
    useState(true);

  const [selectedYearModal, setSelectedYearModal] =
    useState<YearGroupData | null>(null);

  /* ==========================================================
     FILTER SOAL
     ========================================================== */

  const soalDocs = useMemo(() => {
    return documents.filter(
      (doc) => doc.type === 'soal'
    );
  }, [documents]);

  /* ==========================================================
     ALL SCHOOL YEARS
     ========================================================== */

  const allSchoolYears = useMemo(() => {
    const extracted =
      getAllSchoolYears(documents);

    const set = new Set<string>([
      ...extracted,
      ...DEFAULT_YEARS_FALLBACK,
    ]);

    return Array.from(set);
  }, [documents]);

  /* ==========================================================
     BUILD YEAR GROUP
     ========================================================== */

  const yearGroups = useMemo(() => {
    return allSchoolYears.map((year): YearGroupData => {
      const docsInYear = soalDocs.filter((d) => {
        const normYear = (d.schoolYear || '')
          .replace('-', '/')
          .trim();

        const targetNorm = year
          .replace('-', '/')
          .trim();

        return (
          normYear === targetNorm ||
          normYear.includes(targetNorm)
        );
      });

      /* ------------------------------------------------------
         STS 1
         ------------------------------------------------------ */

      const sts1 = docsInYear.find((d) => {
        const t =
          `${d.examType || ''} ${d.title || ''}`
            .toLowerCase();

        return (
          t.includes('sts 1') ||
          t.includes('sts (ganjil)') ||
          t.includes('sts ganjil') ||
          t.includes(
            'sumatif tengah semester ganjil'
          ) ||
          t.includes(
            'sumatif tengah semester 1'
          )
        );
      });

      /* ------------------------------------------------------
         SAS 1
         ------------------------------------------------------ */

      const sas1 = docsInYear.find((d) => {
        const t =
          `${d.examType || ''} ${d.title || ''}`
            .toLowerCase();

        return (
          t.includes('sas 1') ||
          t.includes('sas (ganjil)') ||
          t.includes('sas ganjil') ||
          t.includes('pas') ||
          t.includes(
            'sumatif akhir semester ganjil'
          ) ||
          t.includes(
            'sumatif akhir semester 1'
          )
        );
      });

      /* ------------------------------------------------------
         STS 2
         ------------------------------------------------------ */

      const sts2 = docsInYear.find((d) => {
        const t =
          `${d.examType || ''} ${d.title || ''}`
            .toLowerCase();

        return (
          t.includes('sts 2') ||
          t.includes('sts (genap)') ||
          t.includes('sts genap') ||
          t.includes(
            'sumatif tengah semester genap'
          ) ||
          t.includes(
            'sumatif tengah semester 2'
          )
        );
      });

      /* ------------------------------------------------------
         SAT
         ------------------------------------------------------ */

      const sat = docsInYear.find((d) => {
        const t =
          `${d.examType || ''} ${d.title || ''}`
            .toLowerCase();

        return (
          t.includes('sat') ||
          t.includes('pat') ||
          t.includes(
            'sumatif akhir tahun'
          ) ||
          t.includes('sas 2') ||
          t.includes('sas genap')
        );
      });

      /* ------------------------------------------------------
         OTHER EXAMS
         ------------------------------------------------------ */

      const matchedIds = new Set(
        [
          sts1?.id,
          sas1?.id,
          sts2?.id,
          sat?.id,
        ].filter(Boolean)
      );

      const otherDocs = docsInYear.filter(
        (d) => !matchedIds.has(d.id)
      );

      /* ------------------------------------------------------
         COUNT LINK AKTIF
         ------------------------------------------------------ */

      const configuredCount = [
        sts1,
        sas1,
        sts2,
        sat,
        ...otherDocs,
      ].filter(
        (d) => d && d.driveUrl
      ).length;

      return {
        schoolYear: year,

        sts1Doc: sts1,
        sas1Doc: sas1,
        sts2Doc: sts2,
        satDoc: sat,

        otherDocs,
        allDocs: docsInYear,

        totalExamsCount:
          configuredCount > 0
            ? Math.max(configuredCount, 4)
            : 4,
      };
    });
  }, [allSchoolYears, soalDocs]);

  /* ==========================================================
     SEARCH + SORT
     ========================================================== */

  const filteredYearGroups = useMemo(() => {
    let result = [...yearGroups];

    if (search.trim()) {
      const q = search
        .toLowerCase()
        .trim();

      result = result.filter((g) => {
        const matchYear =
          g.schoolYear
            .toLowerCase()
            .includes(q);

        const matchDocs =
          g.allDocs.some((d) => {
            const title =
              d.title?.toLowerCase() || '';

            const examType =
              d.examType?.toLowerCase() || '';

            const note =
              d.note?.toLowerCase() || '';

            return (
              title.includes(q) ||
              examType.includes(q) ||
              note.includes(q)
            );
          });

        return matchYear || matchDocs;
      });
    }

    result.sort((a, b) => {
      const yearA = parseInt(
        (
          a.schoolYear.match(/\d{4}/) || ['0']
        )[0],
        10
      );

      const yearB = parseInt(
        (
          b.schoolYear.match(/\d{4}/) || ['0']
        )[0],
        10
      );

      return sortOrder === 'newest'
        ? yearB - yearA
        : yearA - yearB;
    });

    return result;
  }, [
    yearGroups,
    search,
    sortOrder,
  ]);

  const toggleSortOrder = () => {
    setSortOrder((prev) =>
      prev === 'newest'
        ? 'oldest'
        : 'newest'
    );
  };

  /* ==========================================================
     MODAL DATA
     ========================================================== */

  const getModalExamItems = (
    group: YearGroupData
  ) => [
    {
      label: 'STS 1',
      description:
        'Sumatif Tengah Semester Ganjil',
      doc: group.sts1Doc,
    },
    {
      label: 'SAS 1',
      description:
        'Sumatif Akhir Semester Ganjil',
      doc: group.sas1Doc,
    },
    {
      label: 'STS 2',
      description:
        'Sumatif Tengah Semester Genap',
      doc: group.sts2Doc,
    },
    {
      label: 'SAT',
      description:
        'Sumatif Akhir Tahun',
      doc: group.satDoc,
    },
    ...group.otherDocs.map((doc) => ({
      label:
        doc.examType || doc.title,
      description:
        'Ujian lainnya',
      doc,
    })),
  ];

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div
      className="
        mx-auto max-w-[1440px]
        px-4 py-5
        text-slate-100
        sm:px-6 sm:py-7
        lg:px-8
        xl:px-10
      "
    >
      {/* ======================================================
          HERO
          ====================================================== */}

      <section
        className="
          relative overflow-hidden
          rounded-[28px]
          border border-white/[0.09]
          bg-[linear-gradient(135deg,rgba(18,24,42,0.88),rgba(11,17,31,0.94))]
          shadow-[0_20px_70px_rgba(0,0,0,0.22)]
          backdrop-blur-2xl
        "
      >
        <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-fuchsia-500/[0.08] blur-3xl" />

        <div className="pointer-events-none absolute -right-20 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-blue-500/[0.10] blur-3xl" />

        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between gap-5 p-5 sm:p-7 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div
              className="
                mb-3 inline-flex items-center gap-2
                rounded-full
                border border-fuchsia-300/20
                bg-fuchsia-400/[0.07]
                px-3 py-1.5
                text-[10px] font-black uppercase
                tracking-[0.16em]
                text-fuchsia-200
                backdrop-blur-xl
              "
            >
              <FolderOpen className="h-3.5 w-3.5" />

              <span>Galeri Bank Soal</span>
            </div>

            <h1
              className="
                font-heading
                text-2xl font-black
                tracking-tight text-white
                sm:text-4xl
              "
            >
              Bank Soal & Naskah Evaluasi
            </h1>

            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
              Akses langsung naskah soal ujian
              berdasarkan tahun pelajaran dan
              jenis ujian.
            </p>
          </div>

          {/* School identity */}
          <div
            className="
              shrink-0
              rounded-2xl
              border border-white/[0.09]
              bg-white/[0.035]
              p-4
              backdrop-blur-2xl
              shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
              lg:min-w-[290px]
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-10 w-10 shrink-0
                  items-center justify-center
                  rounded-xl
                  border border-cyan-300/20
                  bg-cyan-400/[0.08]
                  text-cyan-200
                "
              >
                <GraduationCap className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-black tracking-wide text-white">
                  SDIT AL FIKRI
                </h3>

                <p className="mt-0.5 text-[9px] leading-relaxed text-cyan-200/65">
                  Religius, Berprestasi dan
                  Berwawasan Lingkungan
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          INFO BANNER
          ====================================================== */}

      {showInfoBanner && (
        <div
          className="
            relative mt-4
            flex items-center justify-between gap-3
            overflow-hidden
            rounded-2xl
            border border-blue-300/15
            bg-blue-400/[0.055]
            p-3.5
            backdrop-blur-xl
            shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-xl
                border border-blue-300/20
                bg-blue-400/[0.08]
                text-blue-200
              "
            >
              <Info className="h-4 w-4" />
            </div>

            <p className="text-[11px] leading-relaxed text-blue-100/75 sm:text-xs">
              Setiap tahun pelajaran memiliki{' '}
              <strong className="text-blue-100">
                4 jenis ujian utama
              </strong>
              : STS 1, SAS 1, STS 2, dan SAT
              untuk seluruh kelas 1–6 dan semua
              mata pelajaran.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowInfoBanner(false)
            }
            className="
              shrink-0 rounded-lg
              p-1.5
              text-blue-200/50
              transition-all
              hover:bg-blue-400/10
              hover:text-white
              cursor-pointer
            "
            title="Tutup informasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ======================================================
          TOOLBAR
          ====================================================== */}

      <section className="mt-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <div
              className="
                flex items-center
                rounded-2xl
                border border-white/[0.08]
                bg-white/[0.035]
                p-1
                backdrop-blur-xl
              "
            >
              <button
                type="button"
                onClick={() =>
                  setSortOrder('newest')
                }
                className={`
                  rounded-xl
                  px-3.5 py-2
                  text-[11px] font-bold
                  transition-all
                  cursor-pointer
                  ${
                    sortOrder === 'newest'
                      ? 'bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
                      : 'text-slate-500 hover:text-slate-200'
                  }
                `}
              >
                Terbaru
              </button>

              <button
                type="button"
                onClick={() =>
                  setSortOrder('oldest')
                }
                className={`
                  rounded-xl
                  px-3.5 py-2
                  text-[11px] font-bold
                  transition-all
                  cursor-pointer
                  ${
                    sortOrder === 'oldest'
                      ? 'bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
                      : 'text-slate-500 hover:text-slate-200'
                  }
                `}
              >
                Terlama
              </button>
            </div>

            <button
              type="button"
              onClick={toggleSortOrder}
              className="
                flex h-10 w-10
                items-center justify-center
                rounded-xl
                border border-white/[0.08]
                bg-white/[0.035]
                text-slate-400
                backdrop-blur-xl
                transition-all
                hover:border-white/[0.15]
                hover:bg-white/[0.07]
                hover:text-white
                cursor-pointer
              "
              title="Balik urutan"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Cari tahun pelajaran, STS, SAS, SAT..."
              className="
                h-11 w-full
                rounded-2xl
                border border-white/[0.08]
                bg-white/[0.035]
                pl-11 pr-11
                text-xs font-medium
                text-white
                placeholder:text-slate-600
                outline-none
                backdrop-blur-xl
                transition-all
                focus:border-blue-300/30
                focus:bg-white/[0.05]
                focus:ring-2
                focus:ring-blue-400/[0.08]
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="
                  absolute right-3.5 top-1/2
                  -translate-y-1/2
                  rounded-lg p-1
                  text-slate-500
                  transition-colors
                  hover:bg-white/[0.07]
                  hover:text-white
                  cursor-pointer
                "
                title="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* View mode */}
          <div
            className="
              flex items-center
              self-start
              rounded-2xl
              border border-white/[0.08]
              bg-white/[0.035]
              p-1
              backdrop-blur-xl
              xl:self-auto
            "
          >
            <button
              type="button"
              onClick={() =>
                setViewMode('grid')
              }
              className={`
                flex h-8 w-9 items-center
                justify-center
                rounded-xl
                transition-all
                cursor-pointer
                ${
                  viewMode === 'grid'
                    ? 'bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
                    : 'text-slate-500 hover:text-slate-200'
                }
              `}
              title="Tampilan Grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setViewMode('list')
              }
              className={`
                flex h-8 w-9 items-center
                justify-center
                rounded-xl
                transition-all
                cursor-pointer
                ${
                  viewMode === 'list'
                    ? 'bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
                    : 'text-slate-500 hover:text-slate-200'
                }
              `}
              title="Tampilan List"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================
          SECTION TITLE
          ====================================================== */}

      <div className="mt-6 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div
            className="
              flex h-8 w-8 items-center
              justify-center
              rounded-xl
              border border-purple-300/15
              bg-purple-400/[0.07]
              text-purple-200
            "
          >
            <BookOpen className="h-4 w-4" />
          </div>

          <div>
            <h2 className="font-heading text-xs font-black uppercase tracking-[0.14em] text-slate-200 sm:text-sm">
              Daftar Tahun Pelajaran
            </h2>

            <p className="mt-0.5 hidden text-[10px] text-slate-600 sm:block">
              Pilih jenis ujian langsung dari
              kartu tahun
            </p>
          </div>
        </div>

        <div
          className="
            inline-flex items-center gap-1.5
            rounded-full
            border border-white/[0.07]
            bg-white/[0.025]
            px-3 py-1.5
            text-[10px] font-bold
            text-slate-500
            backdrop-blur-xl
          "
        >
          <LayoutGrid className="h-3 w-3 text-cyan-400" />

          <span>
            {filteredYearGroups.length} Tahun
          </span>
        </div>
      </div>

      {/* ======================================================
          NO RESULT
          ====================================================== */}

      {filteredYearGroups.length === 0 ? (
        <div
          className="
            mt-4 rounded-[26px]
            border border-white/[0.08]
            bg-white/[0.025]
            p-12
            text-center
            backdrop-blur-xl
          "
        >
          <div
            className="
              mx-auto mb-4
              flex h-14 w-14
              items-center justify-center
              rounded-2xl
              border border-blue-300/15
              bg-blue-400/[0.07]
              text-blue-200
            "
          >
            <BookOpen className="h-7 w-7" />
          </div>

          <p className="text-base font-bold text-slate-200">
            Tahun Pelajaran Tidak Ditemukan
          </p>

          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            Tidak ada tahun pelajaran yang cocok
            dengan kata kunci &quot;{search}&quot;.
          </p>

          <button
            type="button"
            onClick={() => setSearch('')}
            className="
              mt-4 inline-flex items-center gap-2
              rounded-xl
              border border-blue-300/15
              bg-blue-400/[0.07]
              px-4 py-2
              text-xs font-bold
              text-blue-200
              transition-all
              hover:bg-blue-400/[0.12]
              cursor-pointer
            "
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Pencarian
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ====================================================
           GRID VIEW
           ==================================================== */

        <div
          className="
            mt-4 grid
            grid-cols-1
            items-stretch
            gap-4
            md:grid-cols-2
            xl:grid-cols-4
          "
        >
          {filteredYearGroups.map(
            (group, idx) => (
              <SoalGridCard
                key={group.schoolYear}
                yearGroup={group}
                index={idx}
                onEditDocument={
                  onEditDocument
                }
                onSelectYearModal={
                  setSelectedYearModal
                }
              />
            )
          )}
        </div>
      ) : (
        /* ====================================================
           LIST VIEW
           ==================================================== */

        <div className="mt-4 space-y-3">
          {filteredYearGroups.map(
            (group) => {
              const examItems = [
                {
                  label: 'STS 1',
                  doc: group.sts1Doc,
                },
                {
                  label: 'SAS 1',
                  doc: group.sas1Doc,
                },
                {
                  label: 'STS 2',
                  doc: group.sts2Doc,
                },
                {
                  label: 'SAT',
                  doc: group.satDoc,
                },
              ];

              const configuredCount =
                examItems.filter(
                  (item) =>
                    Boolean(
                      item.doc?.driveUrl
                    )
                ).length;

              return (
                <div
                  key={group.schoolYear}
                  className="
                    group relative overflow-hidden
                    rounded-[22px]
                    border border-white/[0.08]
                    bg-white/[0.025]
                    p-4
                    backdrop-blur-2xl
                    shadow-[0_14px_45px_rgba(0,0,0,0.14)]
                    transition-all duration-300
                    hover:border-white/[0.14]
                    hover:bg-white/[0.035]
                  "
                >
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    {/* Year */}
                    <div className="flex min-w-[220px] items-center gap-3">
                      <div
                        className="
                          flex h-11 w-11 shrink-0
                          items-center justify-center
                          rounded-2xl
                          border border-white/[0.08]
                          bg-white/[0.045]
                          text-purple-200
                        "
                      >
                        <BookOpen className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-white">
                          T.P. {group.schoolYear}
                        </h3>

                        <p className="mt-1 text-[10px] font-medium text-slate-500">
                          Kelas 1–6 • Semua
                          Mata Pelajaran
                        </p>
                      </div>
                    </div>

                    {/* Exam buttons */}
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {examItems.map(
                        (item) => {
                          const hasDriveLink =
                            Boolean(
                              item.doc
                                ?.driveUrl
                            );

                          return (
                            <button
                              key={
                                item.label
                              }
                              type="button"
                              onClick={() => {
                                if (
                                  item.doc
                                    ?.driveUrl
                                ) {
                                  openProtectedExternalDriveUrl(
                                    item
                                      .doc
                                      .driveUrl
                                  );
                                } else {
                                  setSelectedYearModal(
                                    group
                                  );
                                }
                              }}
                              className={`
                                group/exam
                                inline-flex
                                items-center gap-2
                                rounded-xl
                                border
                                px-3.5 py-2
                                text-xs font-bold
                                backdrop-blur-xl
                                transition-all
                                cursor-pointer

                                ${
                                  hasDriveLink
                                    ? 'border-white/[0.10] bg-white/[0.045] text-slate-200 hover:-translate-y-0.5 hover:border-blue-300/25 hover:bg-blue-300/[0.07] hover:text-white'
                                    : 'border-white/[0.045] bg-white/[0.012] text-slate-600 opacity-50 hover:border-white/[0.10] hover:bg-white/[0.03] hover:text-slate-400 hover:opacity-75'
                                }
                              `}
                              title={
                                hasDriveLink
                                  ? `Buka ${item.label}`
                                  : `${item.label} belum memiliki link Drive`
                              }
                            >
                              {hasDriveLink ? (
                                <GoogleDriveIcon className="h-3.5 w-3.5" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" />
                              )}

                              <span>
                                {
                                  item.label
                                }
                              </span>

                              <ArrowUpDown className="hidden h-3 w-3 rotate-90 opacity-30 sm:block" />
                            </button>
                          );
                        }
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex shrink-0 items-center gap-2">
                      {configuredCount ===
                      4 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/10 bg-emerald-400/[0.05] px-2.5 py-1.5 text-[9px] font-bold text-emerald-300">
                          <CircleCheck className="h-3 w-3" />
                          Lengkap
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/10 bg-amber-400/[0.05] px-2.5 py-1.5 text-[9px] font-bold text-amber-300">
                          <CircleAlert className="h-3 w-3" />
                          {configuredCount}/4
                        </span>
                      )}

                      {onEditDocument &&
                        group.allDocs
                          .length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onEditDocument(
                                group
                                  .allDocs[0]
                              )
                            }
                            className="
                              flex h-8 w-8
                              items-center justify-center
                              rounded-xl
                              border border-white/[0.08]
                              bg-white/[0.035]
                              text-slate-500
                              transition-all
                              hover:border-white/[0.15]
                              hover:bg-white/[0.07]
                              hover:text-white
                              cursor-pointer
                            "
                            title="Kelola Link Drive"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Other exams in list */}
                  {group.otherDocs.length >
                    0 && (
                    <div className="mt-3 flex items-center gap-2 border-t border-white/[0.055] pt-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
                        Ujian Lainnya
                      </span>

                      <div className="flex flex-wrap gap-1.5">
                        {group.otherDocs.map(
                          (doc) => {
                            const hasDrive =
                              Boolean(
                                doc.driveUrl
                              );

                            return (
                              <button
                                key={
                                  doc.id
                                }
                                type="button"
                                onClick={() => {
                                  if (
                                    doc.driveUrl
                                  ) {
                                    openProtectedExternalDriveUrl(
                                      doc.driveUrl
                                    );
                                  } else {
                                    setSelectedYearModal(
                                      group
                                    );
                                  }
                                }}
                                className={`
                                  inline-flex
                                  items-center
                                  gap-1.5
                                  rounded-lg
                                  border
                                  px-2 py-1
                                  text-[9px]
                                  font-bold
                                  transition-all
                                  cursor-pointer
                                  ${
                                    hasDrive
                                      ? 'border-white/[0.08] bg-white/[0.035] text-slate-400 hover:bg-white/[0.07] hover:text-white'
                                      : 'border-white/[0.04] bg-white/[0.01] text-slate-700 opacity-50 hover:opacity-75'
                                  }
                                `}
                              >
                                {hasDrive ? (
                                  <GoogleDriveIcon className="h-3 w-3" />
                                ) : (
                                  <FileText className="h-3 w-3" />
                                )}

                                <span>
                                  {doc.examType ||
                                    doc.title}
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

      {/* ======================================================
          MODAL DETAIL UJIAN
          ====================================================== */}

      {selectedYearModal && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-slate-950/75
            p-4
            backdrop-blur-md
          "
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setSelectedYearModal(null);
            }
          }}
        >
          <div
            className="
              relative w-full max-w-xl
              overflow-hidden
              rounded-[28px]
              border border-white/[0.10]
              bg-[linear-gradient(145deg,rgba(20,27,46,0.97),rgba(8,13,24,0.98))]
              p-5
              shadow-[0_30px_100px_rgba(0,0,0,0.50)]
              backdrop-blur-2xl
              sm:p-6
            "
          >
            {/* Glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-purple-500/[0.08] blur-3xl" />

            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Header */}
            <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex h-11 w-11
                    shrink-0 items-center
                    justify-center
                    rounded-2xl
                    border border-purple-300/20
                    bg-purple-400/[0.08]
                    text-purple-200
                  "
                >
                  <BookOpen className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-base font-black text-white sm:text-lg">
                    Ujian T.P.{' '}
                    {
                      selectedYearModal.schoolYear
                    }
                  </h3>

                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Status dan tautan setiap
                    jenis ujian
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedYearModal(null)
                }
                className="
                  flex h-8 w-8
                  items-center justify-center
                  rounded-xl
                  border border-white/[0.08]
                  bg-white/[0.035]
                  text-slate-500
                  transition-all
                  hover:bg-white/[0.08]
                  hover:text-white
                  cursor-pointer
                "
                title="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Exam list */}
            <div className="relative z-10 mt-4 max-h-[60vh] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
              {getModalExamItems(
                selectedYearModal
              ).map((item, i) => {
                const hasDrive =
                  Boolean(
                    item.doc?.driveUrl
                  );

                return (
                  <div
                    key={`${item.label}-${i}`}
                    className="
                      group
                      flex items-center
                      justify-between
                      gap-3
                      rounded-2xl
                      border border-white/[0.07]
                      bg-white/[0.025]
                      p-3
                      backdrop-blur-xl
                      transition-all
                      hover:border-white/[0.12]
                      hover:bg-white/[0.045]
                    "
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`
                          flex h-9 w-9 shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          border
                          ${
                            hasDrive
                              ? 'border-emerald-300/15 bg-emerald-400/[0.06] text-emerald-300'
                              : 'border-white/[0.07] bg-white/[0.025] text-slate-600'
                          }
                        `}
                      >
                        {hasDrive ? (
                          <CircleCheck className="h-4 w-4" />
                        ) : (
                          <CircleAlert className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="truncate text-xs font-bold text-white">
                          {item.label}
                        </h4>

                        <p className="mt-0.5 truncate text-[9px] text-slate-500">
                          {item.description}
                        </p>

                        <p
                          className={`mt-0.5 text-[9px] font-semibold ${
                            hasDrive
                              ? 'text-emerald-300/70'
                              : 'text-slate-600'
                          }`}
                        >
                          {hasDrive
                            ? 'Tautan Google Drive aktif'
                            : 'Tautan belum diatur'}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {hasDrive && (
                        <button
                          type="button"
                          onClick={() =>
                            openProtectedExternalDriveUrl(
                              item.doc?.driveUrl
                            )
                          }
                          className="
                            inline-flex
                            items-center gap-1.5
                            rounded-xl
                            border border-blue-300/15
                            bg-blue-400/[0.07]
                            px-3 py-2
                            text-[10px] font-bold
                            text-blue-200
                            transition-all
                            hover:border-blue-300/25
                            hover:bg-blue-400/[0.12]
                            hover:text-white
                            cursor-pointer
                          "
                        >
                          <span>
                            Buka Drive
                          </span>

                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}

                      {onEditDocument &&
                        item.doc && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedYearModal(
                                null
                              );

                              onEditDocument(
                                item.doc!
                              );
                            }}
                            className="
                              flex h-8 w-8
                              items-center
                              justify-center
                              rounded-xl
                              border border-white/[0.08]
                              bg-white/[0.035]
                              text-slate-500
                              transition-all
                              hover:bg-white/[0.08]
                              hover:text-white
                              cursor-pointer
                            "
                            title="Edit tautan"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="relative z-10 mt-4 flex justify-end border-t border-white/[0.07] pt-4">
              <button
                type="button"
                onClick={() =>
                  setSelectedYearModal(null)
                }
                className="
                  rounded-xl
                  border border-white/[0.08]
                  bg-white/[0.045]
                  px-4 py-2
                  text-xs font-bold
                  text-slate-300
                  transition-all
                  hover:bg-white/[0.08]
                  hover:text-white
                  cursor-pointer
                "
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoalView;