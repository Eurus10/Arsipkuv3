import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Zap,
  FolderUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  Award,
  ArrowRight,
  BookOpen,
  Calendar,
  Layers,
  Loader2,
  Check,
  HelpCircle,
} from 'lucide-react';
import { RaporStsClassData } from '../../types/raporSts';
import { Student } from '../../services/studentStorage';
import { AnalysisSubmissionItem } from '../../types/analysisSubmissionTypes';
import { subscribeToAnalysisSubmissions } from '../../services/analysisSubmissionService';
import {
  getAvailableSubmissionsForClass,
  extractSubjectsFromSubmission,
  applySubjectScoresToClassData,
  parseScoresFromAnalysisExcelFile,
  AnalysisSyncResult,
} from '../../services/analysisToRaporSyncService';

interface RaporAnalysisSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: RaporStsClassData;
  students: Student[];
  onSyncComplete: (updatedData: RaporStsClassData, result: AnalysisSyncResult) => void;
}

export const RaporAnalysisSyncModal: React.FC<RaporAnalysisSyncModalProps> = ({
  isOpen,
  onClose,
  classData,
  students,
  onSyncComplete,
}) => {
  const [activeMode, setActiveMode] = useState<'cloud' | 'excel'>('cloud');
  const [availableSubmissions, setAvailableSubmissions] = useState<AnalysisSubmissionItem[]>([]);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<AnalysisSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File upload state for Excel import
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Load available cloud submissions for this class whenever modal opens
  useEffect(() => {
    if (isOpen && classData) {
      setSyncResult(null);
      setErrorMessage(null);
      setUploadedFile(null);

      const updateSubs = () => {
        const subs = getAvailableSubmissionsForClass(
          classData.config.classLevel,
          classData.config.schoolYear
        );
        setAvailableSubmissions(subs);
        setSelectedSubIds((prev) => (prev.length === 0 ? subs.map((s) => s.id) : prev));
      };

      updateSubs();
      const unsub = subscribeToAnalysisSubmissions(() => {
        updateSubs();
      });
      return () => unsub();
    }
  }, [isOpen, classData]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedSubIds.length === availableSubmissions.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(availableSubmissions.map((s) => s.id));
    }
  };

  const toggleSelectSub = (id: string) => {
    setSelectedSubIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle Cloud Sync
  const handleSyncCloud = () => {
    if (selectedSubIds.length === 0) {
      setErrorMessage('Pilih minimal satu mata pelajaran untuk disinkronkan.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const selectedSubs = availableSubmissions.filter((s) => selectedSubIds.includes(s.id));
      const allExtractedSubjects = selectedSubs.flatMap((sub) =>
        extractSubjectsFromSubmission(sub, classData.config.classLevel)
      );

      if (allExtractedSubjects.length === 0) {
        setErrorMessage('Data nilai pada setoran terpilih tidak ditemukan atau kosong.');
        setIsProcessing(false);
        return;
      }

      const result = applySubjectScoresToClassData(classData, allExtractedSubjects, students);

      if (result.syncedSubjects.length === 0) {
        setErrorMessage(
          'Tidak ada mata pelajaran yang cocok dengan daftar mapel e-Rapor kelas ini. Pastikan nama mapel di Analisis sesuai.'
        );
        setIsProcessing(false);
        return;
      }

      setSyncResult(result);
      onSyncComplete(result.updatedClassData, result);
      // Automatically close modal after short delay so user sees feedback and returns to workspace
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Failed to sync analysis data to rapor:', err);
      setErrorMessage(err?.message || 'Terjadi kesalahan saat menyinkronkan data.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Excel File Sync
  const handleSyncExcel = async () => {
    if (!uploadedFile) {
      setErrorMessage('Pilih file Excel Analisis (.xlsx) terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await parseScoresFromAnalysisExcelFile(uploadedFile, classData, students);

      if (result.syncedSubjects.length === 0) {
        setErrorMessage(
          'Gagal membaca nilai dari file Excel. Pastikan file adalah hasil ekspor resmi dari Analisis Soal SDIT Al Fikri.'
        );
        setIsProcessing(false);
        return;
      }

      setSyncResult(result);
      onSyncComplete(result.updatedClassData, result);
      // Automatically close modal after short delay so user sees feedback and returns to workspace
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Failed to parse Excel file for rapor:', err);
      setErrorMessage(err?.message || 'Gagal memproses file Excel.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Tarik Nilai dari Analisis Soal
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                  Kelas {classData.config.classLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Otomatisasi Nilai STS, Ketercapaian TP, & Deskripsi Narasi e-Rapor
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Mode Switcher */}
          {!syncResult && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 border border-white/10 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('cloud');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeMode === 'cloud'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>⚡ Setoran Cloud ({availableSubmissions.length} Mapel)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('excel');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeMode === 'excel'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FolderUp className="w-4 h-4" />
                <span>📁 Unggah File Excel (.xlsx)</span>
              </button>
            </div>
          )}

          {/* Success Result View */}
          {syncResult ? (
            <div className="space-y-4 animate-[fadeIn_200ms_ease-out]">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">
                  Sinkronisasi Nilai Berhasil!
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Berhasil memperbarui nilai untuk{' '}
                  <strong className="text-emerald-300">
                    {syncResult.totalStudentsUpdated} Siswa
                  </strong>{' '}
                  pada{' '}
                  <strong className="text-emerald-300">
                    {syncResult.syncedSubjects.length} Mata Pelajaran
                  </strong>
                  .
                </p>
              </div>

              {/* Subject Breakdown Cards */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Rincian Mata Pelajaran yang Tersinkron:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {syncResult.syncedSubjects.map((subj, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950/70 border border-white/10 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {subj.subjectName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          Rerata: {subj.averageScore}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{subj.studentCount} Siswa</span>
                        <span className="text-emerald-400 font-medium">
                          {subj.passedCount} Tuntas • {subj.remedialCount} Remedial
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automatic rule reminder */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>Otomasi Telah Aktif:</strong> Siswa dengan nilai $\ge$ KKTP
                  telah ditandai lulus di seluruh TP dan deskripsi capaian rapor
                  telah digenerate otomatis.
                </span>
              </div>
            </div>
          ) : activeMode === 'cloud' ? (
            /* Cloud Submissions List */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Daftar Setoran Analisis Kelas {classData.config.classLevel}
                </span>

                {availableSubmissions.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                  >
                    {selectedSubIds.length === availableSubmissions.length
                      ? 'Batal Pilih Semua'
                      : 'Pilih Semua'}
                  </button>
                )}
              </div>

              {availableSubmissions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-white/5 space-y-2">
                  <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Belum ada guru yang menyetor analisis nilai untuk Kelas{' '}
                    <strong>{classData.config.classLevel}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Guru bidang atau wali kelas dapat mengirim analisis lewat tombol "Kirim ke Pak Zaki".
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableSubmissions.map((sub) => {
                    const isSelected = selectedSubIds.includes(sub.id);
                    return (
                      <div
                        key={sub.id}
                        onClick={() => toggleSelectSub(sub.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm'
                            : 'bg-slate-950/40 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                : 'border-white/20 bg-slate-800'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-white truncate">
                              {sub.subjectName}
                            </h5>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>Guru: {sub.teacherName || 'Guru Pengampu'}</span>
                              <span>&bull;</span>
                              <span className="text-emerald-300 font-semibold">
                                {sub.completedStudents} Siswa
                              </span>
                              <span>&bull;</span>
                              <span>KKTP: {sub.kktp || 70}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 font-mono">
                            {sub.examType}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Excel File Dropzone */
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setUploadedFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`p-6 border-2 border-dashed rounded-2xl text-center space-y-3 transition-colors ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-white/15 bg-slate-950/40 hover:border-white/30'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <FolderUp className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">
                    {uploadedFile ? uploadedFile.name : 'Pilih atau Tarik File Excel Analisis'}
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Mendukung file .xlsx multi-sheet hasil ekspor resmi Analisis Soal
                  </p>
                </div>

                <label className="inline-block px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/20 cursor-pointer transition-colors">
                  <span>Telusuri File...</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2 animate-[shake_150ms_ease-in-out]">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            {syncResult ? 'Selesai & Tutup' : 'Batal'}
          </button>

          {!syncResult && (
            <button
              type="button"
              disabled={
                isProcessing ||
                (activeMode === 'cloud' && selectedSubIds.length === 0) ||
                (activeMode === 'excel' && !uploadedFile)
              }
              onClick={activeMode === 'cloud' ? handleSyncCloud : handleSyncExcel}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Memproses Nilai...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>
                    {activeMode === 'cloud'
                      ? `⚡ Tarik & Terapkan Nilai (${selectedSubIds.length} Mapel)`
                      : '📥 Terapkan Nilai dari Excel'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
