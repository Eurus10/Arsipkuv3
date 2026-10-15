import React from 'react';
import {
  ExternalLink,
  Edit2,
  Award,
  BookOpenCheck,
  GraduationCap,
} from 'lucide-react';
import { DocumentItem } from '../types';
import {
  getDriveFileType,
  sanitizeDriveUrl,
  openProtectedExternalDriveUrl,
} from '../utils/driveHelpers';

interface DocumentCardProps {
  doc: DocumentItem;
  onEdit?: (doc: DocumentItem) => void;
  showCategoryBadge?: boolean;
}

export const DocumentCard: React.FC<
  DocumentCardProps
> = ({
  doc,
  onEdit,
  showCategoryBadge = true,
}) => {
  const fileMeta = getDriveFileType(
    doc.driveUrl
  );

  const targetUrl = sanitizeDriveUrl(
    doc.driveUrl
  );

  /**
   * Membuka dokumen melalui JIT session verification.
   */
  const handleOpenDrive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    openProtectedExternalDriveUrl(doc.driveUrl);
  };

  const getBadge = () => {
    if (doc.type === 'sertifikat') {
      return (
        <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
          <Award className="w-5 h-5 text-purple-600" />
        </div>
      );
    }

    if (doc.type === 'soal') {
      return (
        <div
          className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0"
          title="Folder Induk Bank Soal"
        >
          <BookOpenCheck className="w-5 h-5 text-rose-600" />
        </div>
      );
    }

    if (doc.type === 'rapor') {
      return (
        <div
          className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0"
          title="Arsip Rapor & Penilaian"
        >
          <GraduationCap className="w-5 h-5 text-rose-600" />
        </div>
      );
    }

    switch (fileMeta.type) {
      case 'pdf':
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            PDF
          </div>
        );

      case 'doc':
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            DOC
          </div>
        );

      case 'sheet':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            XLS
          </div>
        );

      case 'slide':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            PPT
          </div>
        );

      case 'form':
        return (
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            FRM
          </div>
        );

      case 'folder':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            DIR
          </div>
        );

      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            DRV
          </div>
        );
    }
  };

  // Build concise metadata string
  const metaParts: string[] = [];

  if (doc.type === 'sertifikat') {
    if (
      doc.recipient &&
      doc.recipient !== 'Semua Penerima'
    ) {
      metaParts.push(doc.recipient);
    }

    if (
      doc.category &&
      doc.category !== 'Semua Kategori'
    ) {
      metaParts.push(doc.category);
    }

    if (doc.certificateNumber) {
      metaParts.push(
        `No: ${doc.certificateNumber}`
      );
    }
  } else if (doc.type === 'soal') {
    if (
      doc.examType &&
      doc.examType !== 'Semua Jenis Ujian'
    ) {
      metaParts.push(doc.examType);
    }

    metaParts.push(
      'Folder Induk (Semua Kelas 1-6 & Semua Mapel)'
    );
  } else if (doc.type === 'rapor') {
    if (
      doc.classLevel &&
      doc.classLevel !== 'Semua Kelas'
    ) {
      metaParts.push(doc.classLevel);
    }

    if (
      doc.semester &&
      doc.semester !== 'Semua Semester'
    ) {
      metaParts.push(doc.semester);
    }

    if (
      doc.category &&
      doc.category !== 'Semua Kategori Rapor' &&
      doc.category !== 'Lainnya'
    ) {
      metaParts.push(doc.category);
    }
  } else {
    if (
      doc.classLevel &&
      doc.classLevel !== 'Semua Kelas'
    ) {
      metaParts.push(doc.classLevel);
    }

    if (
      doc.category &&
      doc.category !== 'Semua Kategori' &&
      doc.category !== 'Lainnya'
    ) {
      metaParts.push(doc.category);
    }
  }

  if (
    doc.schoolYear &&
    doc.schoolYear !== 'Semua Tahun'
  ) {
    metaParts.push(doc.schoolYear);
  }

  const metaString =
    metaParts.join(' • ') ||
    doc.schoolYear ||
    'SDIT AL FIKRI';

  return (
    <div
      id={`doc-card-${doc.id}`}
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl transition-all duration-150 gap-3 shadow-2xs"
    >
      {/* Left side: Badge & Title & Info */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        {getBadge()}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-800 truncate leading-snug group-hover:text-emerald-700 transition-colors">
              {doc.title}
            </h4>

            {showCategoryBadge &&
              doc.type === 'soal' && (
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex-shrink-0">
                  {doc.examType
                    ? `Soal ${doc.examType}`
                    : 'Folder Induk'}
                </span>
              )}

            {showCategoryBadge &&
              doc.type === 'sertifikat' &&
              doc.recipient && (
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0">
                  {doc.recipient}
                </span>
              )}
          </div>

          <p className="text-xs text-slate-500 mt-0.5 truncate font-medium">
            {metaString}
          </p>

          {doc.note && (
            <p className="text-[11px] text-slate-400 mt-0.5 truncate italic">
              {doc.note}
            </p>
          )}
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center justify-end gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        {onEdit && (
          <button
            id={`btn-edit-${doc.id}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(doc);
            }}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Edit Dokumen"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}

        <a
          id={`btn-open-drive-${doc.id}`}
          href={targetUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpenDrive}
          className="px-3.5 py-1.5 bg-slate-50 hover:bg-emerald-600 hover:text-white border border-slate-200 hover:border-emerald-600 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title={
            doc.type === 'soal'
              ? 'Buka Folder Induk di Google Drive'
              : 'Buka berkas di Google Drive'
          }
        >
          <span>
            {doc.type === 'soal'
              ? 'Buka Folder Drive'
              : 'Buka Drive'}
          </span>

          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};