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
    cardBg:
      'bg-[linear-gradient(145deg,rgba(16,37,78,0.72)_0%,rgba(9,20,43,0.84)_48%,rgba(5,12,27,0.96)_100%)]',
    cardBorder:
      'border-blue-300/20 hover:border-blue-300/45',
    glowOverlay:
      'from-blue-400/18 via-cyan-400/7 to-transparent',
    iconBg:
      'bg-blue-400/10',
    iconBorder:
      'border-blue-300/25',
    iconColor:
      'text-blue-200',
    badgeBg:
      'bg-blue-300/[0.07]',
    badgeBorder:
      'border-blue-200/20',
    badgeText:
      'text-blue-100',
    examBtnBg:
      'bg-blue-300/[0.045] hover:bg-blue-300/[0.10]',
    examBtnBorder:
      'border-blue-200/[0.12] hover:border-blue-200/35',
    examBtnHover:
      'hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(59,130,246,0.16)]',
    examBtnText:
      'text-white',
    examSubText:
      'text-blue-100/55',
    accentText:
      'text-blue-200',
    accentGlow:
      'bg-blue-400/20',
    accentSoft:
      'bg-blue-400/[0.08]',
  },
  {
    name: 'teal',
    cardBg:
      'bg-[linear-gradient(145deg,rgba(7,49,49,0.72)_0%,rgba(5,29,31,0.84)_48%,rgba(3,15,17,0.96)_100%)]',
    cardBorder:
      'border-teal-300/20 hover:border-teal-300/45',
    glowOverlay:
      'from-teal-400/18 via-emerald-400/7 to-transparent',
    iconBg:
      'bg-teal-400/10',
    iconBorder:
      'border-teal-300/25',
    iconColor:
      'text-teal-200',
    badgeBg:
      'bg-teal-300/[0.07]',
    badgeBorder:
      'border-teal-200/20',
    badgeText:
      'text-teal-100',
    examBtnBg:
      'bg-teal-300/[0.045] hover:bg-teal-300/[0.10]',
    examBtnBorder:
      'border-teal-200/[0.12] hover:border-teal-200/35',
    examBtnHover:
      'hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(20,184,166,0.16)]',
    examBtnText:
      'text-white',
    examSubText:
      'text-teal-100/55',
    accentText:
      'text-teal-200',
    accentGlow:
      'bg-teal-400/20',
    accentSoft:
      'bg-teal-400/[0.08]',
  },
  {
    name: 'purple',
    cardBg:
      'bg-[linear-gradient(145deg,rgba(39,20,69,0.74)_0%,rgba(23,11,42,0.86)_48%,rgba(12,6,23,0.96)_100%)]',
    cardBorder:
      'border-purple-300/20 hover:border-purple-300/45',
    glowOverlay:
      'from-purple-400/18 via-violet-400/7 to-transparent',
    iconBg:
      'bg-purple-400/10',
    iconBorder:
      'border-purple-300/25',
    iconColor:
      'text-purple-200',
    badgeBg:
      'bg-purple-300/[0.07]',
    badgeBorder:
      'border-purple-200/20',
    badgeText:
      'text-purple-100',
    examBtnBg:
      'bg-purple-300/[0.045] hover:bg-purple-300/[0.10]',
    examBtnBorder:
      'border-purple-200/[0.12] hover:border-purple-200/35',
    examBtnHover:
      'hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(168,85,247,0.18)]',
    examBtnText:
      'text-white',
    examSubText:
      'text-purple-100/55',
    accentText:
      'text-purple-200',
    accentGlow:
      'bg-purple-400/20',
    accentSoft:
      'bg-purple-400/[0.08]',
  },
  {
    name: 'amber',
    cardBg:
      'bg-[linear-gradient(145deg,rgba(67,37,9,0.72)_0%,rgba(36,20,6,0.86)_48%,rgba(19,10,3,0.96)_100%)]',
    cardBorder:
      'border-amber-300/20 hover:border-amber-300/45',
    glowOverlay:
      'from-amber-400/18 via-orange-400/7 to-transparent',
    iconBg:
      'bg-amber-400/10',
    iconBorder:
      'border-amber-300/25',
    iconColor:
      'text-amber-200',
    badgeBg:
      'bg-amber-300/[0.07]',
    badgeBorder:
      'border-amber-200/20',
    badgeText:
      'text-amber-100',
    examBtnBg:
      'bg-amber-300/[0.045] hover:bg-amber-300/[0.10]',
    examBtnBorder:
      'border-amber-200/[0.12] hover:border-amber-200/35',
    examBtnHover:
      'hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(245,158,11,0.16)]',
    examBtnText:
      'text-white',
    examSubText:
      'text-amber-100/55',
    accentText:
      'text-amber-200',
    accentGlow:
      'bg-amber-400/20',
    accentSoft:
      'bg-amber-400/[0.08]',
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
                px-2.5 py-1.5
                backdrop-blur-xl
                shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
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
                  border border-white/[0.09]
                  bg-white/[0.045]
                  text-slate-400
                  backdrop-blur-xl
                  transition-all
                  hover:border-white/[0.16]
                  hover:bg-white/[0.09]
                  hover:text-white
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
                      border border-white/[0.10]
                      bg-slate-950/90
                      p-1.5
                      shadow-2xl
                      backdrop-blur-2xl
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
                            text-slate-200
                            transition-all
                            hover:bg-white/[0.07]
                            hover:text-white
                            cursor-pointer
                          "
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
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
                          text-slate-200
                          transition-all
                          hover:bg-white/[0.07]
                          hover:text-white
                          cursor-pointer
                        "
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
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
          <h3 className="font-heading text-xl font-black tracking-tight text-white">
            T.P. {yearGroup.schoolYear}
          </h3>

          <div className="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <span>Kelas 1 – 6</span>

            <span className="h-1 w-1 rounded-full bg-slate-600" />

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
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-300/80">
              <CircleCheck className="h-3.5 w-3.5" />
              Semua tersedia
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-300/70">
              <CircleAlert className="h-3.5 w-3.5" />
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
                        border-white/[0.055]
                        bg-white/[0.012]
                        opacity-45
                        hover:-translate-y-0.5
                        hover:border-white/[0.12]
                        hover:bg-white/[0.035]
                        hover:opacity-75
                        hover:shadow-[0_8px_25px_rgba(255,255,255,0.035)]
                      `
                  }
                `}
              >
                {/* Shine only active */}
                {hasDriveLink && (
                  <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                )}

                {/* Ambient glow only active */}
                {hasDriveLink && (
                  <div
                    className={`
                      pointer-events-none absolute -right-5 -top-5
                      h-16 w-16 rounded-full
                      ${theme.accentGlow}
                      blur-2xl
                      opacity-0
                      transition-opacity duration-300
                      group-hover/exam:opacity-100
                    `}
                  />
                )}

                <div className="relative z-10 flex h-full flex-col justify-between">
                  {/* Icon */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`
                        flex h-7 w-7 items-center justify-center
                        rounded-[10px]
                        border
                        backdrop-blur-md
                        transition-all duration-300
                        ${
                          hasDriveLink
                            ? 'border-white/[0.08] bg-white/[0.055] group-hover/exam:bg-white/[0.10]'
                            : 'border-white/[0.045] bg-white/[0.02]'
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
                              : 'text-slate-600'
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
                            ? 'border-white/[0.07] bg-white/[0.035] text-slate-500 group-hover/exam:border-white/[0.14] group-hover/exam:bg-white/[0.08] group-hover/exam:text-white'
                            : 'border-white/[0.04] bg-white/[0.015] text-slate-700'
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
                            : 'text-slate-700'
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
            border-t border-white/[0.055]
            pt-3
          `}
        >
          {hasOtherExams ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-400/80" />

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
                        backdrop-blur-xl
                        transition-all
                        cursor-pointer

                        ${
                          hasDriveLink
                            ? 'border-white/[0.08] bg-white/[0.035] text-slate-400 hover:border-white/[0.15] hover:bg-white/[0.07] hover:text-white'
                            : 'border-white/[0.045] bg-white/[0.012] text-slate-700 hover:border-white/[0.10] hover:bg-white/[0.03] hover:text-slate-500'
                        }
                      `}
                    >
                      {hasDriveLink ? (
                        <GoogleDriveIcon className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
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
              <span className="text-[8px] font-medium text-slate-700">
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