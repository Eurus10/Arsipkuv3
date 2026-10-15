import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  MoreVertical,
  ArrowUpRight,
  Edit2,
  ExternalLink,
  Layers,
  Sparkles,
  CircleCheck,
  CircleAlert,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { openProtectedExternalDriveUrl } from '../utils/driveHelpers';

export interface YearGroupData {
  schoolYear: string;
  sts1Doc?: DocumentItem;
  sas1Doc?: DocumentItem;
  sts2Doc?: DocumentItem;
  satDoc?: DocumentItem;
  otherDocs: DocumentItem[];
  allDocs: DocumentItem[];
  totalExamsCount: number;
}

export interface YearColorStyle {
  name: string;
  cardBg: string;
  cardBorder: string;
  glowOverlay: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  examBtnBg: string;
  examBtnBorder: string;
  examBtnHover: string;
  examBtnText: string;
  examSubText: string;
  accentText: string;
  accentGlow: string;
  accentSoft: string;
}

/* ============================================================
   THEME PER TAHUN PELAJARAN
   ============================================================ */

export const YEAR_COLOR_STYLES: YearColorStyle[] = [
  {
    name: 'blue',
    cardBg: 'bg-white hover:bg-blue-50/20',
    cardBorder: 'border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md',
    glowOverlay: 'from-blue-50/40 via-transparent to-transparent',
    iconBg: 'bg-blue-50',
    iconBorder: 'border-blue-200',
    iconColor: 'text-blue-700',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    badgeText: 'text-blue-800',
    examBtnBg: 'bg-blue-50/50 hover:bg-blue-50',
    examBtnBorder: 'border-blue-200 hover:border-blue-300',
    examBtnHover: 'hover:-translate-y-0.5 hover:shadow-xs',
    examBtnText: 'text-slate-900',
    examSubText: 'text-blue-700',
    accentText: 'text-blue-700',
    accentGlow: 'bg-blue-100/50',
    accentSoft: 'bg-blue-50',
  },
  {
    name: 'teal',
    cardBg: 'bg-white hover:bg-teal-50/20',
    cardBorder: 'border-slate-200 hover:border-teal-300 shadow-xs hover:shadow-md',
    glowOverlay: 'from-teal-50/40 via-transparent to-transparent',
    iconBg: 'bg-teal-50',
    iconBorder: 'border-teal-200',
    iconColor: 'text-teal-700',
    badgeBg: 'bg-teal-50',
    badgeBorder: 'border-teal-200',
    badgeText: 'text-teal-800',
    examBtnBg: 'bg-teal-50/50 hover:bg-teal-50',
    examBtnBorder: 'border-teal-200 hover:border-teal-300',
    examBtnHover: 'hover:-translate-y-0.5 hover:shadow-xs',
    examBtnText: 'text-slate-900',
    examSubText: 'text-teal-700',
    accentText: 'text-teal-700',
    accentGlow: 'bg-teal-100/50',
    accentSoft: 'bg-teal-50',
  },
  {
    name: 'purple',
    cardBg: 'bg-white hover:bg-purple-50/20',
    cardBorder: 'border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-md',
    glowOverlay: 'from-purple-50/40 via-transparent to-transparent',
    iconBg: 'bg-purple-50',
    iconBorder: 'border-purple-200',
    iconColor: 'text-purple-700',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
    badgeText: 'text-purple-800',
    examBtnBg: 'bg-purple-50/50 hover:bg-purple-50',
    examBtnBorder: 'border-purple-200 hover:border-purple-300',
    examBtnHover: 'hover:-translate-y-0.5 hover:shadow-xs',
    examBtnText: 'text-slate-900',
    examSubText: 'text-purple-700',
    accentText: 'text-purple-700',
    accentGlow: 'bg-purple-100/50',
    accentSoft: 'bg-purple-50',
  },
  {
    name: 'amber',
    cardBg: 'bg-white hover:bg-amber-50/20',
    cardBorder: 'border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md',
    glowOverlay: 'from-amber-50/40 via-transparent to-transparent',
    iconBg: 'bg-amber-50',
    iconBorder: 'border-amber-200',
    iconColor: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    examBtnBg: 'bg-amber-50/50 hover:bg-amber-50',
    examBtnBorder: 'border-amber-200 hover:border-amber-300',
    examBtnHover: 'hover:-translate-y-0.5 hover:shadow-xs',
    examBtnText: 'text-slate-900',
    examSubText: 'text-amber-700',
    accentText: 'text-amber-700',
    accentGlow: 'bg-amber-100/50',
    accentSoft: 'bg-amber-50',
  },
];

/* ============================================================
   WARNA BERDASARKAN TAHUN
   Supaya warna tidak berubah ketika search/filter.
   ============================================================ */

export function getYearStyleByIndex(
  index: number,
  yearStr: string
): YearColorStyle {
  const match = yearStr.match(/\d{4}/);

  if (match) {
    const yearNum = parseInt(match[0], 10);

    const yearThemeMap: Record<number, number> = {
      2026: 0,
      2025: 1,
      2024: 2,
      2023: 3,
    };

    if (yearThemeMap[yearNum] !== undefined) {
      return YEAR_COLOR_STYLES[yearThemeMap[yearNum]];
    }
  }

  return YEAR_COLOR_STYLES[index % YEAR_COLOR_STYLES.length];
}

/* ============================================================
   GOOGLE DRIVE ICON
   ============================================================ */

export const GoogleDriveIcon: React.FC<{
  className?: string;
}> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 87.3 78"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z"
      fill="#0066DA"
    />
    <path
      d="M43.65 25 29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z"
      fill="#00AC47"
    />
    <path
      d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l5.4-9.35c.8-1.4 1.2-2.95 1.2-4.5H55.95l6.75 11.65 10.85 5.5z"
      fill="#EA4335"
    />
    <path
      d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2L43.65 25z"
      fill="#00832D"
    />
    <path
      d="M55.95 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2L55.95 53z"
      fill="#2684FC"
    />
    <path
      d="m86.1 48.5-14.7-25.5L57.4 1.2C56.05.4 54.5 0 52.95 0h-.05l14.85 25.7 13.55 23.5c.8 1.4 1.2 2.95 1.2 4.5 0-1.75-.4-3.35-1.2-4.7z"
      fill="#FFBA00"
    />
  </svg>
);

/* ============================================================
   CARD PROPS
   ============================================================ */

interface SoalGridCardProps {
  yearGroup: YearGroupData;
  index: number;
  onEditDocument?: (doc: DocumentItem) => void;
  onSelectYearModal?: (yearGroup: YearGroupData) => void;
}

/* ============================================================
   MAIN CARD
   ============================================================ */

export const SoalGridCard: React.FC<SoalGridCardProps> = ({
  yearGroup,
  index,
  onEditDocument,
  onSelectYearModal,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const theme = getYearStyleByIndex(
    index,
    yearGroup.schoolYear
  );

  const handleOpenExam = (
    e: React.MouseEvent,
    doc?: DocumentItem,
    fallbackLabel?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (doc?.driveUrl) {
      openProtectedExternalDriveUrl(doc.driveUrl);
      return;
    }

    if (onSelectYearModal) {
      onSelectYearModal(yearGroup);
      return;
    }

    alert(
      `Tautan folder ${
        fallbackLabel || 'ujian'
      } untuk T.P. ${yearGroup.schoolYear} belum dikonfigurasi.`
    );
  };

  const examButtons = [
    {
      label: 'STS 1',
      subLabel: 'Tengah Semester 1',
      doc: yearGroup.sts1Doc,
      fallbackLabel: 'STS 1 (Ganjil)',
    },
    {
      label: 'SAS 1',
      subLabel: 'Akhir Semester 1',
      doc: yearGroup.sas1Doc,
      fallbackLabel: 'SAS 1 (Ganjil)',
    },
    {
      label: 'STS 2',
      subLabel: 'Tengah Semester 2',
      doc: yearGroup.sts2Doc,
      fallbackLabel: 'STS 2 (Genap)',
    },
    {
      label: 'SAT',
      subLabel: 'Akhir Tahun',
      doc: yearGroup.satDoc,
      fallbackLabel: 'SAT (Akhir Tahun)',
    },
  ];

  const configuredCount = examButtons.filter(
    (item) => Boolean(item.doc?.driveUrl)
  ).length;

  const hasOtherExams = yearGroup.otherDocs.length > 0;

  return (
    <div
      className={`
        group relative flex h-full min-h-[410px] flex-col
        overflow-hidden rounded-[26px]
        border
        ${theme.cardBg}
        ${theme.cardBorder}
        backdrop-blur-2xl
        shadow-[0_18px_55px_rgba(0,0,0,0.20)]
        transition-all duration-300
        hover:-translate-y-1
        hover:shadow-[0_24px_65px_rgba(0,0,0,0.32)]
      `}
    >
      {/* ======================================================
          ATMOSPHERIC GLOW
          ====================================================== */}

      <div
        className={`
          pointer-events-none absolute inset-x-0 top-0 h-40
          bg-gradient-to-b ${theme.glowOverlay}
        `}
      />

      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/[0.045] blur-3xl" />

      <div className="pointer-events-none absolute -left-16 bottom-16 h-32 w-32 rounded-full bg-white/[0.025] blur-3xl" />

      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* ======================================================
          CARD CONTENT
          ====================================================== */}

      <div className="relative z-10 flex flex-1 flex-col p-5">

        {/* ====================================================
            HEADER
            ==================================================== */}

        <div className="flex items-start justify-between gap-3">
          {/* Folder icon */}
          <div
            className={`
              relative flex h-12 w-12 shrink-0
              items-center justify-center
              rounded-[17px]
              ${theme.iconBg}
              border ${theme.iconBorder}
              backdrop-blur-xl
              shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]
              transition-all duration-300
              group-hover:scale-[1.04]
            `}
          >
            <div
              className={`
                absolute inset-0 rounded-[17px]
                ${theme.accentGlow}
                blur-xl opacity-50
              `}
            />

            <BookOpen
              className={`relative z-10 h-6 w-6 ${theme.iconColor}`}
              strokeWidth={1.8}
            />
          </div>

          {/* Header controls */}
          <div className="flex items-center gap-2">
            <div
              className={`
                inline-flex items-center gap-1.5
                rounded-full
                border
                ${theme.badgeBorder}
                ${theme.badgeBg}
                px-2.5 py-1
                shadow-xs
              `}
            >
              <Layers
                className={`h-3.5 w-3.5 ${theme.badgeText}`}
              />

              <span
                className={`text-[10px] font-bold tracking-wide ${theme.badgeText}`}
              >
                4 Ujian
              </span>
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((prev) => !prev);
                }}
                className="
                  flex h-8 w-8 items-center justify-center
                  rounded-xl
                  border border-slate-200
                  bg-slate-100
                  text-slate-600
                  transition-all
                  hover:bg-slate-200
                  hover:text-slate-900
                  cursor-pointer
                "
                title="Opsi Tahun Pelajaran"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />

                  <div
                    className="
                      absolute right-0 top-full z-40 mt-2 w-52
                      overflow-hidden rounded-2xl
                      border border-slate-200
                      bg-white
                      p-1.5
                      shadow-xl
                    "
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onEditDocument &&
                      yearGroup.allDocs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            onEditDocument(
                              yearGroup.allDocs[0]
                            );
                          }}
                          className="
                            flex w-full items-center gap-2.5
                            rounded-xl px-3 py-2.5
                            text-left text-xs font-semibold
                            text-slate-700
                            transition-all
                            hover:bg-slate-100
                            hover:text-slate-900
                            cursor-pointer
                          "
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                            <Edit2 className="h-3.5 w-3.5" />
                          </span>

                          <span>Kelola Link Drive</span>
                        </button>
                      )}

                    {onSelectYearModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onSelectYearModal(yearGroup);
                        }}
                        className="
                          flex w-full items-center gap-2.5
                          rounded-xl px-3 py-2.5
                          text-left text-xs font-semibold
                          text-slate-700
                          transition-all
                          hover:bg-slate-100
                          hover:text-slate-900
                          cursor-pointer
                        "
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </span>

                        <span>Lihat Detail Link</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================
            TITLE
            ==================================================== */}

        <div className="mt-4">
          <h3 className="font-heading text-xl font-black tracking-tight text-slate-900">
            T.P. {yearGroup.schoolYear}
          </h3>

          <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span>Kelas 1 – 6</span>

            <span className="h-1 w-1 rounded-full bg-slate-300" />

            <span>Semua Mata Pelajaran</span>
          </div>
        </div>

        {/* ====================================================
            EXAM STATUS
            ==================================================== */}

        <div className="mb-2.5 mt-4 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Jenis Ujian
          </span>

          {configuredCount === 4 ? (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-700">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
              Semua tersedia
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-700">
              <CircleAlert className="h-3.5 w-3.5 text-amber-600" />
              {configuredCount}/4 tersedia
            </span>
          )}
        </div>

        {/* ====================================================
            4 MAIN EXAM BUTTONS
            ==================================================== */}

        <div className="grid grid-cols-2 gap-2.5">
          {examButtons.map((btn) => {
            const hasDriveLink = Boolean(
              btn.doc?.driveUrl
            );

            return (
              <button
                key={btn.label}
                type="button"
                onClick={(e) =>
                  handleOpenExam(
                    e,
                    btn.doc,
                    btn.fallbackLabel
                  )
                }
                title={
                  hasDriveLink
                    ? `Buka folder ${btn.label} di Google Drive`
                    : `${btn.label} belum memiliki tautan Drive`
                }
                className={`
                  group/exam
                  relative flex min-h-[82px]
                  flex-col justify-between
                  overflow-hidden rounded-[18px]
                  border p-3
                  text-left
                  backdrop-blur-2xl
                  transition-all duration-250
                  cursor-pointer

                  ${
                    hasDriveLink
                      ? `
                        ${theme.examBtnBorder}
                        ${theme.examBtnBg}
                        ${theme.examBtnHover}
                        opacity-100
                      `
                      : `
                        border-slate-200
                        bg-slate-50/70
                        opacity-70
                        hover:-translate-y-0.5
                        hover:border-slate-300
                        hover:bg-slate-100
                        hover:opacity-100
                        hover:shadow-xs
                      `
                  }
                `}
              >
                {/* Shine only active */}
                {hasDriveLink && (
                  <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                )}

                <div className="relative z-10 flex h-full flex-col justify-between">
                  {/* Icon */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`
                        flex h-7 w-7 items-center justify-center
                        rounded-[10px]
                        border
                        transition-all duration-300
                        ${
                          hasDriveLink
                            ? 'border-white/40 bg-white/60 shadow-xs'
                            : 'border-slate-200 bg-slate-100'
                        }
                      `}
                    >
                      {hasDriveLink ? (
                        <GoogleDriveIcon className="h-4 w-4" />
                      ) : (
                        <FileText
                          className={`h-4 w-4 ${
                            hasDriveLink
                              ? theme.accentText
                              : 'text-slate-400'
                          }`}
                          strokeWidth={1.8}
                        />
                      )}
                    </span>

                    {/* Arrow */}
                    <span
                      className={`
                        flex h-6 w-6 items-center justify-center
                        rounded-full
                        border
                        ${
                          hasDriveLink
                            ? 'border-slate-200 bg-white text-slate-600 shadow-xs group-hover/exam:border-slate-300 group-hover/exam:text-slate-900'
                            : 'border-slate-200 bg-slate-100 text-slate-400'
                        }
                        transition-all duration-300
                      `}
                    >
                      <ArrowUpRight
                        className={`
                          h-3.5 w-3.5
                          ${
                            hasDriveLink
                              ? 'transition-transform duration-300 group-hover/exam:translate-x-0.5 group-hover/exam:-translate-y-0.5'
                              : ''
                          }
                        `}
                      />
                    </span>
                  </div>

                  {/* Label */}
                  <div className="mt-2">
                    <div
                      className={`
                        text-sm font-black tracking-tight
                        ${
                          hasDriveLink
                            ? theme.examBtnText
                            : 'text-slate-500'
                        }
                      `}
                    >
                      {btn.label}
                    </div>

                    <div
                      className={`
                        mt-0.5 truncate text-[9px] font-semibold
                        ${
                          hasDriveLink
                            ? theme.examSubText
                            : 'text-slate-400'
                        }
                      `}
                    >
                      {hasDriveLink
                        ? btn.subLabel
                        : 'Link belum tersedia'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ====================================================
            OTHER EXAMS — FIXED HEIGHT SLOT
            ==================================================== */}

        <div
          className={`
            mt-3 flex min-h-[58px] flex-1 flex-col
            justify-end
            border-t border-slate-100
            pt-3
          `}
        >
          {hasOtherExams ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-500" />

                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Ujian Lainnya
                  </span>
                </div>

                <span className="text-[9px] font-bold text-slate-600">
                  {yearGroup.otherDocs.length}
                </span>
              </div>

              <div className="flex min-h-[24px] flex-wrap gap-1.5">
                {yearGroup.otherDocs.map((doc) => {
                  const hasDriveLink = Boolean(
                    doc.driveUrl
                  );

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={(e) =>
                        handleOpenExam(
                          e,
                          doc,
                          doc.examType || doc.title
                        )
                      }
                      title={
                        hasDriveLink
                          ? `Buka ${
                              doc.examType || doc.title
                            }`
                          : `${
                              doc.examType || doc.title
                            } belum memiliki tautan Drive`
                      }
                      className={`
                        inline-flex items-center gap-1.5
                        rounded-xl
                        border
                        px-2.5 py-1.5
                        text-[9px] font-bold
                        transition-all
                        cursor-pointer

                        ${
                          hasDriveLink
                            ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 text-slate-400 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600'
                        }
                      `}
                    >
                      {hasDriveLink ? (
                        <GoogleDriveIcon className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3 text-slate-400" />
                      )}

                      <span className="max-w-[100px] truncate">
                        {doc.examType || doc.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex min-h-[38px] items-end">
              <span className="text-[9px] font-medium text-slate-400">
                Tidak ada ujian tambahan
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom glass highlight */}
      <div className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent" />
    </div>
  );
};

export default SoalGridCard;