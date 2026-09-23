import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  AnalysisSession,
  FileValidationResult,
} from '../../types/analysisTypes';
import { Student } from '../../services/studentStorage';
import {
  importAnalysisSessionFromExcel,
  validateAnalysisWorkbookSession,
  applyImportedSessionToWorkspace,
} from './analysisExcelImportService';
import { saveActiveSession } from '../../services/analysis/analysisSessionService';
import { useModalNavigation } from '../../utils/modalNavigation';

interface ImportAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: AnalysisSession | null;
  students: Student[];
  onImportComplete: (updatedSession: AnalysisSession) => void;
}

export const ImportAnalysisModal: React.FC<ImportAnalysisModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  students,
  onImportComplete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validation, setValidation] = useState<FileValidationResult | null>(null);
  const [conflictMode, setConflictMode] = useState<'OVERWRITE' | 'KEEP_EXISTING'>('OVERWRITE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Intercept phone back button so modal closes gracefully without leaving web
  useModalNavigation('import-analysis', isOpen, onClose);

  if (!isOpen) return null;

  const handleProcessFile = async (selectedFile: File) => {
    setErrorMsg(null);
    setValidation(null);
    setFile(selectedFile);
    setIsLoading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const importResult = importAnalysisSessionFromExcel(buffer, activeSession, students);

      if (!importResult.isValid || !importResult.session) {
        setErrorMsg(
          importResult.errors.length > 0
            ? importResult.errors.join('. ')
            : 'Format file Excel tidak dikenali sebagai Proyek Analisis resmi SDIT AL FIKRI.'
        );
        setIsLoading(false);
        return;
      }

      // Validate against current session
      const validationRes = validateAnalysisWorkbookSession(importResult.session, activeSession, students);
      if (importResult.warnings.length > 0) {
        validationRes.warnings.push(...importResult.warnings);
      }
      setValidation(validationRes);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error reading file:', err);
      setErrorMsg(`Gagal memproses file: ${err.message || 'Terjadi kesalahan'}`);
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleApplyImport = () => {
    if (!validation || !validation.session) return;

    if (activeSession) {
      // Merge into active session
      const merged = applyImportedSessionToWorkspace(
        activeSession,
        validation.session,
        students,
        conflictMode
      );
      onImportComplete(merged);
    } else {
      // Restore as the new active session
      saveActiveSession(validation.session);
      onImportComplete(validation.session);
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95 sm:items-center sm:justify-center sm:p-4 sm:bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-slate-900 border-0 sm:border sm:border-white/10 rounded-none sm:rounded-3xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.15)] shrink-0">
              <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-black text-white tracking-tight">
                {activeSession ? 'Impor Berkas Analisis Mapel' : 'Buka / Pulihkan Proyek Analisis'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Unggah file Excel (.xlsx) resmi SDIT AL FIKRI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* Upload Drop Zone */}
          {!validation ? (
            <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-sky-400 bg-sky-500/10'
                  : 'border-white/15 bg-slate-950/40 hover:border-white/30 hover:bg-slate-950/60'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Klik untuk memilih file atau seret file Excel ke sini
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Mendukung file Proyek Analisis Sesi (.xlsx) & File Analisis Guru Mapel
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            {isLoading && (
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 text-center text-xs text-sky-400 flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span>Membaca dan memverifikasi isi file Excel...</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        ) : (
          /* Validation Result View */
          <div className="space-y-4">
            {/* File Info Banner */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                  {file?.name}
                </span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  {validation.session?.className || 'Kelas'} &bull; {validation.session?.examType}
                </span>
              </div>

              <div className="text-xs text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <div>
                  Wali Kelas: <strong className="text-white">{validation.session?.teacherName || '-'}</strong>
                </div>
                <div>
                  Tahun: <strong className="text-white">{validation.session?.schoolYear}</strong>
                </div>
              </div>
            </div>

            {/* Error List */}
            {validation.errors.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-400">
                  <AlertCircle className="w-4 h-4" /> Berkas Tidak Sesuai:
                </div>
                {validation.errors.map((err, i) => (
                  <p key={i} className="pl-5">&bull; {err}</p>
                ))}
              </div>
            )}

            {/* Warning List */}
            {validation.warnings.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="w-4 h-4" /> Catatan:
                </div>
                {validation.warnings.map((warn, i) => (
                  <p key={i} className="pl-5">&bull; {warn}</p>
                ))}
              </div>
            )}

            {/* Subjects Found */}
            <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/10 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                Mata Pelajaran Terdeteksi ({validation.session?.subjects.length || 0}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {validation.session?.subjects.map((subj) => {
                  const isConflict = validation.conflictingSubjects.includes(subj.subjectName);
                  return (
                    <span
                      key={subj.subjectId}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                        isConflict
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      {subj.subjectName}
                      {isConflict ? ' (Sudah Ada)' : ' (Baru)'}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Conflict Mode selector if conflicts exist and activeSession is present */}
            {activeSession && validation.conflictingSubjects.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
                <span className="text-xs font-bold text-slate-300 block">
                  Penanganan Mata Pelajaran yang Sudah Ada:
                </span>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="conflictMode"
                      value="OVERWRITE"
                      checked={conflictMode === 'OVERWRITE'}
                      onChange={() => setConflictMode('OVERWRITE')}
                      className="text-sky-500"
                    />
                    <span>Gantikan / Perbarui nilai yang sudah ada (Timpa)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="conflictMode"
                      value="KEEP_EXISTING"
                      checked={conflictMode === 'KEEP_EXISTING'}
                      onChange={() => setConflictMode('KEEP_EXISTING')}
                      className="text-sky-500"
                    />
                    <span>Pertahankan nilai yang sudah ada (Lewati yang sama)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setValidation(null);
                  setFile(null);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-all text-center"
              >
                Pilih File Lain
              </button>

              <button
                type="button"
                onClick={handleApplyImport}
                disabled={!validation.isValid}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all ${
                  validation.isValid
                    ? 'bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 shadow-[0_0_12px_rgba(14,165,233,0.15)] cursor-pointer'
                    : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {activeSession ? 'Terapkan Impor ke Sesi' : 'Buka Proyek Analisis Ini'}
                </span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
