import React, { useState, useRef, useMemo } from 'react';
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
  AnalysisImportContext,
} from '../../types/analysisTypes';
import { Student } from '../../services/studentStorage';
import {
  importAnalysisSessionFromExcel,
  validateAnalysisWorkbookSession,
  applyImportedSessionToWorkspace,
} from './analysisExcelImportService';
import {
  saveActiveSession,
  saveSessionForClass,
  getSessionForClass,
} from '../../services/analysis/analysisSessionService';
import { useModalNavigation } from '../../utils/modalNavigation';

interface ImportAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: AnalysisSession | null;
  students: Student[];
  onImportComplete: (updatedSession: AnalysisSession) => void;
  importContext?: AnalysisImportContext | null;
}

export const ImportAnalysisModal: React.FC<ImportAnalysisModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  students,
  onImportComplete,
  importContext,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validation, setValidation] = useState<FileValidationResult | null>(null);
  const [conflictMode, setConflictMode] = useState<'OVERWRITE' | 'KEEP_EXISTING'>('OVERWRITE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sesi acuan yang relevan: untuk Guru Bidang pakai sesi kelas target, untuk Wali Kelas pakai activeSession
  const targetSession = useMemo(() => {
    if (importContext?.callerMode === 'GURU_BIDANG') {
      return (
        importContext.targetClassSession ||
        (importContext.targetClassId ? getSessionForClass(importContext.targetClassId) : null)
      );
    }
    return activeSession;
  }, [importContext, activeSession]);

  // Daftar siswa yang relevan untuk pencocokan skor
  const relevantStudents = useMemo(() => {
    const targetClassId = importContext?.targetClassId || targetSession?.classId;
    if (targetClassId) {
      const filtered = students.filter(
        (s) => s.classId.toLowerCase() === targetClassId.toLowerCase()
      );
      if (filtered.length > 0) return filtered;
    }
    return students;
  }, [students, importContext, targetSession]);

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
      const importResult = importAnalysisSessionFromExcel(buffer, targetSession, relevantStudents);

      if (!importResult.isValid || !importResult.session) {
        setErrorMsg(
          importResult.errors.length > 0
            ? importResult.errors.join('. ')
            : 'Format file Excel tidak dikenali sebagai Proyek Analisis resmi SDIT AL FIKRI.'
        );
        setIsLoading(false);
        return;
      }

      // Validate against relevant target session and context
      const validationRes = validateAnalysisWorkbookSession(
        importResult.session,
        targetSession,
        relevantStudents,
        importContext
      );
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

    if (importContext?.callerMode === 'GURU_BIDANG') {
      if (targetSession) {
        // Gabungkan mata pelajaran ke sesi kelas target tanpa menimpa active session global Wali Kelas
        const merged = applyImportedSessionToWorkspace(
          targetSession,
          validation.session,
          relevantStudents,
          conflictMode,
          false // JANGAN timpa ACTIVE_SESSION_STORAGE_KEY
        );
        saveSessionForClass(merged);
        onImportComplete(merged);
      } else {
        // Simpan sesi baru khusus kelas target ini
        saveSessionForClass(validation.session);
        onImportComplete(validation.session);
      }
    } else {
      if (activeSession) {
        // Merge into active session
        const merged = applyImportedSessionToWorkspace(
          activeSession,
          validation.session,
          relevantStudents,
          conflictMode,
          true
        );
        onImportComplete(merged);
      } else {
        // Restore as the new active session
        saveActiveSession(validation.session);
        onImportComplete(validation.session);
      }
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-900/60 sm:items-center sm:justify-center sm:p-4 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-white border-0 sm:border sm:border-slate-200/90 rounded-none sm:rounded-3xl shadow-2xl text-slate-800 overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:pb-4 border-b border-slate-200/80 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600 shadow-xs shrink-0">
              <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight">
                {importContext?.callerMode === 'GURU_BIDANG'
                  ? `Impor Nilai Excel — ${importContext.targetClassName || importContext.targetClassId || 'Kelas'}`
                  : activeSession
                  ? 'Impor Berkas Analisis Mapel'
                  : 'Buka / Pulihkan Proyek Analisis'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {importContext?.callerMode === 'GURU_BIDANG'
                  ? `Unggah file nilai ${importContext.targetSubjectName || 'Mapel'} untuk rombel ${importContext.targetClassName || importContext.targetClassId || ''}`
                  : 'Unggah file Excel (.xlsx) resmi SDIT AL FIKRI'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-white">
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
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100/70'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center border border-sky-200 shadow-xs">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Klik untuk memilih file atau seret file Excel ke sini
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung file Proyek Analisis Sesi (.xlsx) &amp; File Analisis Guru Mapel
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
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-center text-xs text-sky-800 flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                <span>Membaca dan memverifikasi isi file Excel...</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        ) : (
          /* Validation Result View */
          <div className="space-y-4">
            {/* File Info Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-sky-600" />
                  {file?.name}
                </span>
                <span className="text-[10px] bg-sky-100 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full font-bold">
                  {validation.session?.className || 'Kelas'} &bull; {validation.session?.examType}
                </span>
              </div>

              <div className="text-xs text-slate-500 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  Wali Kelas: <strong className="text-slate-800">{validation.session?.teacherName || '-'}</strong>
                </div>
                <div>
                  Tahun: <strong className="text-slate-800">{validation.session?.schoolYear}</strong>
                </div>
              </div>
            </div>

            {/* Error List */}
            {validation.errors.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-700">
                  <AlertCircle className="w-4 h-4" /> Berkas Tidak Sesuai:
                </div>
                {validation.errors.map((err, i) => (
                  <p key={i} className="pl-5">&bull; {err}</p>
                ))}
              </div>
            )}

            {/* Warning List */}
            {validation.warnings.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle className="w-4 h-4" /> Catatan:
                </div>
                {validation.warnings.map((warn, i) => (
                  <p key={i} className="pl-5">&bull; {warn}</p>
                ))}
              </div>
            )}

            {/* Subjects Found */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 shadow-xs">
              <span className="text-xs font-bold text-slate-800 block">
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
                          ? 'bg-amber-100 border-amber-200 text-amber-800'
                          : 'bg-emerald-100 border-emerald-200 text-emerald-800'
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
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 shadow-xs">
                <span className="text-xs font-bold text-slate-800 block">
                  Penanganan Mata Pelajaran yang Sudah Ada:
                </span>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="conflictMode"
                      value="OVERWRITE"
                      checked={conflictMode === 'OVERWRITE'}
                      onChange={() => setConflictMode('OVERWRITE')}
                      className="text-sky-600"
                    />
                    <span>Gantikan / Perbarui nilai yang sudah ada (Timpa)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="conflictMode"
                      value="KEEP_EXISTING"
                      checked={conflictMode === 'KEEP_EXISTING'}
                      onChange={() => setConflictMode('KEEP_EXISTING')}
                      className="text-sky-600"
                    />
                    <span>Pertahankan nilai yang sudah ada (Lewati yang sama)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setValidation(null);
                  setFile(null);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all text-center shadow-xs"
              >
                Pilih File Lain
              </button>

              <button
                type="button"
                onClick={handleApplyImport}
                disabled={!validation.isValid}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all ${
                  validation.isValid
                    ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm active:scale-98 cursor-pointer'
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-sky-100" />
                <span>
                  {importContext?.callerMode === 'GURU_BIDANG'
                    ? `Terapkan Nilai ke Kelas ${importContext.targetClassName || importContext.targetClassId || ''}`
                    : activeSession
                    ? 'Terapkan Impor ke Sesi'
                    : 'Buka Proyek Analisis Ini'}
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
