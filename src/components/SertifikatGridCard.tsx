import React from 'react';
import {
  ExternalLink,
  Edit2,
  Award,
  UserCheck,
  Hash,
  Tag,
} from 'lucide-react';
import { DocumentItem } from '../types';
import {
  sanitizeDriveUrl,
  openProtectedExternalDriveUrl,
} from '../utils/driveHelpers';
import { getYearColorTheme } from '../utils/yearTheme';

interface SertifikatGridCardProps {
  doc: DocumentItem;
  onEdit?: (doc: DocumentItem) => void;
}

export const SertifikatGridCard: React.FC<
  SertifikatGridCardProps
> = ({ doc, onEdit }) => {
  const theme = getYearColorTheme(
    doc.schoolYear
  );

  const targetUrl = sanitizeDriveUrl(
    doc.driveUrl
  );

  /**
   * Membuka sertifikat/piagam melalui JIT
   * session verification.
   */
  const handleOpenDrive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    openProtectedExternalDriveUrl(doc.driveUrl);
  };

  /**
   * Klik seluruh kartu juga membuka sertifikat
   */
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    openProtectedExternalDriveUrl(doc.driveUrl);
  };

  return (
    <div
      id={`sertifikat-card-${doc.id}`}
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between p-5 sm:p-6 rounded-[24px] border ${theme.cardBg} ${theme.cardBorder} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden`}
    >
      {/* Subtle Year Ambient Glow */}
      <div
        className={`absolute -top-10 -right-10 w-36 h-36 rounded-full bg-gradient-to-br ${theme.glowGradient} blur-2xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
      />

      <div>
        {/* Top Badges Bar: Year & Recipient */}
        <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Tahun Terbit / Ajaran Badge */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase border ${theme.yearBadgeBg} ${theme.yearBadgeText} ${theme.yearBadgeBorder}`}
              title={`Tahun Terbit / Ajaran ${doc.schoolYear}`}
            >
              T.P. {doc.schoolYear}
            </span>

            {/* Recipient Badge */}
            {doc.recipient && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 text-[11px] font-semibold text-purple-700 border border-purple-200">
                <UserCheck className="w-3 h-3 text-purple-600" />
                <span>
                  {doc.recipient}
                </span>
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
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
              title="Edit sertifikat ini"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Award Icon & Certificate Info */}
        <div className="flex items-start gap-3.5 mb-4 relative z-10">
          {/* Large Stylized Award Icon */}
          <div
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl ${theme.iconBg} border ${theme.iconBorder} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs`}
          >
            <Award
              className={`w-6 h-6 sm:w-7 sm:h-7 ${theme.iconColor}`}
            />
          </div>

          {/* Title & Category Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug group-hover:text-purple-700 transition-colors line-clamp-2">
              {doc.title}
            </h3>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 mt-1 font-medium flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                <Tag className="w-3 h-3 text-purple-600" />
                <span>
                  {doc.category || 'Sertifikat'}
                </span>
              </span>

              {doc.certificateNumber && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px]">
                  <Hash className="w-2.5 h-2.5 text-slate-400" />
                  <span className="truncate max-w-[120px]">
                    {doc.certificateNumber}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Optional note preview */}
        {doc.note && (
          <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-4 relative z-10">
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
          className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${theme.buttonBg} ${theme.buttonHoverBg} ${theme.buttonText} ${theme.buttonShadow} shadow-xs group-hover:shadow-md`}
        >
          <span>
            Buka Sertifikat / Piagam
          </span>

          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};