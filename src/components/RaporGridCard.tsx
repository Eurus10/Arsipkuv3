import React from 'react';
import {
  ExternalLink,
  Edit2,
  GraduationCap,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { DocumentItem } from '../types';
import {
  sanitizeDriveUrl,
  openProtectedExternalDriveUrl,
} from '../utils/driveHelpers';
import { getYearColorTheme } from '../utils/yearTheme';

interface RaporGridCardProps {
  doc: DocumentItem;
  onEdit?: (doc: DocumentItem) => void;
}

export const RaporGridCard: React.FC<
  RaporGridCardProps
> = ({ doc, onEdit }) => {
  const theme = getYearColorTheme(
    doc.schoolYear
  );

  const targetUrl = sanitizeDriveUrl(doc.driveUrl);

  /**
   * Membuka arsip rapor melalui JIT session verification.
   */
  const handleOpenDrive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    openProtectedExternalDriveUrl(doc.driveUrl);
  };

  /**
   * Klik seluruh kartu juga membuka berkas rapor
   */
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    openProtectedExternalDriveUrl(doc.driveUrl);
  };

  return (
    <div
      id={`rapor-card-${doc.id}`}
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between p-5 sm:p-6 rounded-[24px] border ${theme.cardBg} ${theme.cardBorder} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden`}
    >
      {/* Subtle Year Ambient Glow */}
      <div
        className={`absolute -top-10 -right-10 w-36 h-36 rounded-full bg-gradient-to-br ${theme.glowGradient} blur-2xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
      />

      <div>
        {/* Top Badges Bar: Year & Class Level */}
        <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Tahun Pelajaran Badge */}
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase border ${theme.yearBadgeBg} ${theme.yearBadgeText} ${theme.yearBadgeBorder}`}
              title={`Tahun Pelajaran ${doc.schoolYear}`}
            >
              T.P. {doc.schoolYear}
            </span>

            {/* Class Level Badge */}
            {doc.classLevel && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#181B26] text-[11px] font-semibold text-rose-300 border border-rose-500/30">
                {doc.classLevel}
              </span>
            )}

            {/* Semester Badge */}
            {doc.semester &&
              doc.semester !==
                'Semua Semester' && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#181B26] text-[10px] font-semibold text-slate-300 border border-[#2B3245]">
                  {doc.semester}
                </span>
              )}
          </div>

          {/* Quick Edit button for Admin */}
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(doc);
              }}
              className="p-1.5 rounded-xl bg-[#181B26]/80 hover:bg-[#272D3E] text-slate-400 hover:text-white border border-[#2B3245] transition-colors cursor-pointer"
              title="Edit arsip rapor ini"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Graduation/Rapor Icon & Document Info */}
        <div className="flex items-start gap-4 mb-4 relative z-10">
          {/* Large Stylized Rapor Icon */}
          <div
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl ${theme.iconBg} border ${theme.iconBorder} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-inner`}
          >
            <div className="relative flex items-center justify-center">
              <GraduationCap
                className={`w-7 h-7 sm:w-8 sm:h-8 ${theme.iconColor}`}
              />

              <FileSpreadsheet className="w-3 h-3 text-white absolute bottom-1.5" />
            </div>
          </div>

          {/* Title & Category Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug group-hover:text-amber-200 transition-colors line-clamp-2">
              {doc.title}
            </h3>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-300 mt-1.5 font-medium flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#181B26] text-slate-300 border border-[#2A3142]">
                <Layers className="w-3 h-3 text-rose-400" />

                <span>
                  {doc.category ||
                    'Arsip Rapor'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Optional note preview */}
        {doc.note && (
          <p className="text-[11px] text-slate-400/90 line-clamp-2 bg-[#12141D]/60 p-2.5 rounded-xl border border-[#222838] mb-4 relative z-10">
            {doc.note}
          </p>
        )}
      </div>

      {/* Bottom Action Button */}
      <div className="pt-2 relative z-10">
        <a
          href={targetUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpenDrive}
          className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${theme.buttonBg} ${theme.buttonHoverBg} ${theme.buttonText} ${theme.buttonShadow} shadow-md group-hover:shadow-lg`}
        >
          <span>Buka Rapor / Drive</span>

          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};