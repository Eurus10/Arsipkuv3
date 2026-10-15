import React from 'react';
import {
  ExternalLink,
  Edit2,
  Folder,
  FolderArchive,
  Layers,
} from 'lucide-react';
import { DocumentItem } from '../types';
import {
  sanitizeDriveUrl,
  openProtectedExternalDriveUrl,
} from '../utils/driveHelpers';
import { getYearColorTheme } from '../utils/yearTheme';

interface AdministrasiGridCardProps {
  doc: DocumentItem;
  onEdit?: (doc: DocumentItem) => void;
}

export const AdministrasiGridCard: React.FC<
  AdministrasiGridCardProps
> = ({ doc, onEdit }) => {
  const theme = getYearColorTheme(doc.schoolYear);
  const targetUrl = sanitizeDriveUrl(doc.driveUrl);

  /**
   * Membuka Drive melalui JIT session verification.
   */
  const handleOpenDrive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    openProtectedExternalDriveUrl(doc.driveUrl);
  };

  /**
   * Klik pada seluruh kartu juga membuka tautan berkas
   */
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    openProtectedExternalDriveUrl(doc.driveUrl);
  };

  return (
    <div
      id={`admin-card-${doc.id}`}
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
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase border ${theme.yearBadgeBg} ${theme.yearBadgeText} ${theme.yearBadgeBorder}`}
              title={`Tahun Pelajaran ${doc.schoolYear}`}
            >
              T.P. {doc.schoolYear}
            </span>

            {/* Class Level Badge */}
            {doc.classLevel && (
              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-700 border border-slate-200">
                {doc.classLevel}
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
              title="Edit berkas administrasi ini"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Folder Icon & Document Info */}
        <div className="flex items-start gap-3.5 mb-4 relative z-10">
          {/* Large Stylized Folder Icon */}
          <div
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl ${theme.iconBg} border ${theme.iconBorder} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs`}
          >
            <div className="relative flex items-center justify-center">
              <Folder
                className={`w-7 h-7 sm:w-8 sm:h-8 ${theme.folderFill}`}
              />
              <FolderArchive className="w-3.5 h-3.5 text-emerald-800 absolute bottom-1.5" />
            </div>
          </div>

          {/* Title & Category Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2">
              {doc.title}
            </h3>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 mt-1 font-medium flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                <Layers className="w-3 h-3 text-emerald-600" />
                <span>
                  {doc.category || 'Administrasi'}
                </span>
              </span>
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
          <span>Buka Berkas / Drive</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};