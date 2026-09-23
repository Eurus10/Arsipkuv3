import React, { useEffect, useMemo, useState } from 'react';
import {
  FileQuestion,
  Trash2,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Upload,
  Image as ImageIcon,
  Settings2,
  FileSpreadsheet,
  FileText,
  Eye,
  X,
  Edit3,
} from 'lucide-react';

import {
  EvaluationQuestionPackage,
  EvaluationQuestion,
} from '../../types/evaluationTypes';

import {
  getStoredQuestionPackages,
  deleteQuestionPackage,
} from '../../services/evaluation/evaluationStorageService';

import {
  getExamTitleParts,
  paginateEvaluationDocument,
} from '../../services/evaluation/evaluationLayoutEngine';

import {
  exportQuestionsToWordDocx,
  exportQuestionsToPdf,
} from '../../services/evaluation/evaluationExportService';

import {
  EvaluationQuestionEditorView,
  checkIfQuestionNeedsImage,
} from './EvaluationQuestionEditorView';

interface EvaluationReviewSoalViewProps {
  onEdit?: (pkg: EvaluationQuestionPackage) => void;
}

type PreviewLayout = 'two-column' | 'one-column';

interface ReviewSettings {
  fontSize: number;
  instructionFontSize: number;
  previewLayout: PreviewLayout;
  showIdentity: boolean;
  showInstructions: boolean;
  showHeader: boolean;
  headerHeightRatio: number; // custom aspect ratio multiplier (e.g. 0.15 - 0.40)
}

const COP_STORAGE_KEY =
  'arsipku_evaluation_question_header_v1';
const COP_STORAGE_KEY_ALT =
  'arsipku_evaluation_school_header_v1';

const REVIEW_SETTINGS_KEY =
  'arsipku_evaluation_review_settings_v1';

const DEFAULT_SETTINGS: ReviewSettings = {
  fontSize: 12,
  instructionFontSize: 9,
  previewLayout: 'two-column',
  showIdentity: true,
  showInstructions: true,
  showHeader: true,
  headerHeightRatio: 0.20,
};

export const EvaluationReviewSoalView: React.FC<
  EvaluationReviewSoalViewProps
> = ({ onEdit }) => {
  const [packages, setPackages] = useState<
    EvaluationQuestionPackage[]
  >([]);

  const [selectedPackage, setSelectedPackage] =
    useState<EvaluationQuestionPackage | null>(null);

  const [editingPackage, setEditingPackage] =
    useState<EvaluationQuestionPackage | null>(null);

  const examTitleParts =
    getExamTitleParts(selectedPackage?.examType);

  const [showSettings, setShowSettings] =
    useState(false);

  const [copImage, setCopImage] =
    useState<string | null>(null);

  const [settings, setSettings] =
    useState<ReviewSettings>(
      DEFAULT_SETTINGS
    );

  const [isExportingWord, setIsExportingWord] =
    useState(false);
  const [isExportingPdf, setIsExportingPdf] =
    useState(false);

  const [packageToDelete, setPackageToDelete] =
    useState<EvaluationQuestionPackage | null>(null);
  const [showDeleteCopConfirm, setShowDeleteCopConfirm] =
    useState(false);
// ========================================================
  // LOAD STORAGE
  // ========================================================

  useEffect(() => {
    loadPackages();

    try {
      const savedCop =
        localStorage.getItem(
          COP_STORAGE_KEY
        );

      if (savedCop) {
        setCopImage(savedCop);
      }
    } catch (error) {
      console.error(
        'Gagal membaca kop soal:',
        error
      );
    }

    try {
      const savedSettings =
        localStorage.getItem(
          REVIEW_SETTINGS_KEY
        );

      if (savedSettings) {
        const parsed =
          JSON.parse(savedSettings);

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });
      }
    } catch (error) {
      console.error(
        'Gagal membaca pengaturan review:',
        error
      );
    }
  }, []);

  const loadPackages = () => {
    setPackages(
      getStoredQuestionPackages()
    );
  };

  // ========================================================
  // UPDATE SETTINGS
  // ========================================================

  const updateSettings = (
    updates: Partial<ReviewSettings>
  ) => {
    setSettings((current) => {
      const next = {
        ...current,
        ...updates,
      };

      try {
        localStorage.setItem(
          REVIEW_SETTINGS_KEY,
          JSON.stringify(next)
        );
      } catch (error) {
        console.error(
          'Gagal menyimpan pengaturan review:',
          error
        );
      }

      return next;
    });
  };

  // ========================================================
  // UPLOAD KOP
  // ========================================================

  const handleUploadCop = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith('image/')
    ) {
      window.alert(
        'Kop soal harus berupa file gambar PNG, JPG, atau JPEG.'
      );

      event.target.value = '';
      return;
    }

    if (
      file.size >
      4 * 1024 * 1024
    ) {
      window.alert(
        'Ukuran kop terlalu besar. Maksimal 4 MB.'
      );

      event.target.value = '';
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const result =
        reader.result;

      if (
        typeof result !==
        'string'
      ) {
        return;
      }

      try {
        localStorage.setItem(
          COP_STORAGE_KEY,
          result
        );

        setCopImage(result);
      } catch (error) {
        console.error(
          'Gagal menyimpan kop:',
          error
        );

        window.alert(
          'Kop gagal disimpan. Ukuran gambar mungkin terlalu besar untuk penyimpanan browser.'
        );
      }
    };

    reader.readAsDataURL(file);

    event.target.value = '';
  };

  // ========================================================
  // HAPUS KOP
  // ========================================================

  const handleDeleteCop = () => {
    setShowDeleteCopConfirm(true);
  };

  const confirmDeleteCop = () => {
    try {
      localStorage.removeItem(COP_STORAGE_KEY);
      localStorage.removeItem(COP_STORAGE_KEY_ALT);
    } catch (e) {
      console.error('Gagal menghapus kop dari localStorage:', e);
    }
    setCopImage(null);
    setShowDeleteCopConfirm(false);
  };

  // ========================================================
  // HAPUS NASKAH
  // ========================================================

  const handleDelete = (
    pkg: EvaluationQuestionPackage,
    e?: React.MouseEvent
  ) => {
    if (e) {
      e.stopPropagation();
    }
    setPackageToDelete(pkg);
  };

  const confirmDeletePackage = () => {
    if (!packageToDelete) return;

    deleteQuestionPackage(packageToDelete.id);

    const updatedPackages = getStoredQuestionPackages();
    setPackages(updatedPackages);

    if (selectedPackage?.id === packageToDelete.id) {
      setSelectedPackage(null);
    }
    setPackageToDelete(null);
  };

  // ========================================================
  // FORMAT TANGGAL
  // ========================================================

  const formatDate = (
    value?: string
  ) => {
    if (!value) return '-';

    try {
      return new Intl.DateTimeFormat(
        'id-ID',
        {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      ).format(
        new Date(value)
      );
    } catch {
      return value;
    }
  };

  // ========================================================
  // STATISTIK
  // ========================================================

  const getQuestionStats = (
    pkg: EvaluationQuestionPackage
  ) => {
    const questions =
      pkg.questions || [];

    return {
      total:
        questions.length,

      pg:
        questions.filter(
          (q) =>
            q.section === 'A' ||
            q.type === 'PG'
        ).length,

      isian:
        questions.filter(
          (q) =>
            q.section === 'B' ||
            q.type === 'ISIAN'
        ).length,

      matching:
        questions.filter(
          (q) =>
            q.section === 'C' ||
            q.type === 'MENJODOHKAN'
        ).length,

      uraian:
        questions.filter(
          (q) =>
            q.section === 'D' ||
            q.type === 'URAIAN'
        ).length,
    };
  };

  // ========================================================
  // GROUP SOAL
  // ========================================================

  const questionGroups = useMemo(() => {
    if (!selectedPackage) {
      return {
        pg: [] as EvaluationQuestion[],
        isian: [] as EvaluationQuestion[],
        matching: [] as EvaluationQuestion[],
        uraian: [] as EvaluationQuestion[],
      };
    }

    const questions =
      selectedPackage.questions ||
      [];

    return {
      pg: questions.filter(
        (q) =>
          q.section === 'A' ||
          q.type === 'PG'
      ),

      isian: questions.filter(
        (q) =>
          q.section === 'B' ||
          q.type === 'ISIAN'
      ),

      matching: questions.filter(
        (q) =>
          q.section === 'C' ||
          q.type === 'MENJODOHKAN'
      ),

      uraian: questions.filter(
        (q) =>
          q.section === 'D' ||
          q.type === 'URAIAN'
      ),
    };
  }, [selectedPackage]);

  // ========================================================
  // PAGINATION F4 — DISINKRONKAN PENUH DENGAN LAYOUT ENGINE
  // ========================================================

  const previewDocumentPages = useMemo(() => {
    if (!selectedPackage) {
      return [];
    }
    return paginateEvaluationDocument(selectedPackage);
  }, [selectedPackage]);

  const handleExportWord = async () => {
    if (!selectedPackage) return;
    try {
      setIsExportingWord(true);
      await exportQuestionsToWordDocx(selectedPackage, {
        schoolHeaderImage: copImage,
        headerHeightRatio: settings.headerHeightRatio,
        settings,
      });
    } catch (error) {
      console.error('Gagal ekspor naskah soal ke Word:', error);
      window.alert('Gagal mengekspor naskah soal ke format Microsoft Word.');
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedPackage) return;
    try {
      setIsExportingPdf(true);
      await exportQuestionsToPdf(selectedPackage);
    } catch (error) {
      console.error('Gagal ekspor naskah soal ke PDF:', error);
      window.alert('Gagal mengekspor naskah soal ke format PDF. Pastikan halaman naskah tampil di layar.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const previewPages =
    Math.max(
      1,
      previewDocumentPages.length
    );

  // ========================================================
  // EMPTY STATE
  // ========================================================

  if (
    packages.length === 0
  ) {
    return (
      <div className="min-h-[420px] flex items-center justify-center">

        <div className="text-center max-w-md">

          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">

            <FileQuestion className="w-7 h-7 text-indigo-400" />

          </div>

          <h2 className="text-lg font-black text-white">
            Belum Ada Naskah Soal
          </h2>

          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Naskah soal yang sudah
            berhasil dibuat akan
            tersimpan otomatis dan
            muncul di sini.
          </p>

        </div>

      </div>
    );
  }

  // ========================================================
  // EDIT NASKAH SOAL VIEW
  // ========================================================
  if (editingPackage) {
    return (
      <EvaluationQuestionEditorView
        questionPackage={editingPackage}
        onBack={() => {
          setEditingPackage(null);
          loadPackages();
        }}
        onSaveSuccess={(updatedPkg) => {
          setEditingPackage(updatedPkg);
          if (selectedPackage && selectedPackage.id === updatedPkg.id) {
            setSelectedPackage(updatedPkg);
          }
          loadPackages();
        }}
      />
    );
  }

  // ========================================================
  // LIST NASKAH
  // ========================================================

  if (!selectedPackage) {
    return (
      <div className="space-y-5">

        <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#120F1C] via-[#171328] to-[#1E1235] border border-amber-500/25 shadow-xl shadow-black/20">
          <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center flex-wrap gap-2.5 mb-2">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/35 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Bank Naskah Soal
              </span>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Review & Bank Naskah Soal
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Pilih paket naskah soal untuk melihat simulasi naskah siap cetak, menyunting butir soal, menyisipkan gambar, dan mengunduh format Word (.docx) atau PDF (F4).
            </p>
          </div>
        </div>

        <div className="grid gap-3">

          {packages.map(
            (pkg) => {
              const stats =
                getQuestionStats(
                  pkg
                );

              return (
                <div
                  key={pkg.id}
                  className="rounded-2xl border border-slate-700/70 bg-[#111827]/80 hover:border-indigo-500/30 transition-all p-4"
                >

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">

                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">

                          <FileQuestion className="w-4 h-4 text-indigo-400" />

                        </div>

                        <div className="min-w-0">

                          <h3 className="text-sm font-bold text-white truncate">
                            {pkg.title ||
                              'Naskah Soal'}
                          </h3>

                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {pkg.subjectName ||
                              '-'}{' '}
                            •{' '}
                            {pkg.className ||
                              '-'}{' '}
                            •{' '}
                            {pkg.examType ||
                              '-'}
                          </p>

                        </div>

                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">

                        <StatBadge
                          label="PG"
                          value={
                            stats.pg
                          }
                        />

                        <StatBadge
                          label="Isian"
                          value={
                            stats.isian
                          }
                        />

                        <StatBadge
                          label="Jodohkan"
                          value={
                            stats.matching
                          }
                        />

                        <StatBadge
                          label="Uraian"
                          value={
                            stats.uraian
                          }
                        />

                        {(() => {
                          const needsImgCount = pkg.questions.filter(
                            (q) => checkIfQuestionNeedsImage(q.questionText) || !!q.questionImage
                          ).length;
                          if (needsImgCount > 0) {
                            return (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                {needsImgCount} Perlu Media
                              </span>
                            );
                          }
                          return null;
                        })()}

                        <span className="text-[10px] text-slate-500 flex items-center gap-1 ml-1">
                          <CalendarDays className="w-3 h-3" />

                          {formatDate(
                            pkg.updatedAt ||
                              pkg.createdAt
                          )}
                        </span>

                      </div>

                    </div>

                    <div className="flex items-center gap-2 shrink-0">

                      <button
                        type="button"
                        onClick={() =>
                          setEditingPackage(
                            pkg
                          )
                        }
                        className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Edit butir soal & sisipkan gambar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Soal
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPackage(
                            pkg
                          )
                        }
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Lihat Preview
                      </button>

                      <button
                        type="button"
                        onClick={(e) =>
                          handleDelete(
                            pkg,
                            e
                          )
                        }
                        className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 flex items-center justify-center transition-all cursor-pointer"
                        title="Hapus naskah"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>

                  </div>

                </div>
              );
            }
          )}

        </div>

      </div>
    );
  }

  // ========================================================
  // PREVIEW
  // ========================================================

  return (
    <div className="space-y-5">

      {/* ====================================================
          TOOLBAR
      ==================================================== */}

      <div className="relative overflow-hidden flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#120F1C] via-[#171328] to-[#1E1235] border border-amber-500/25 shadow-xl shadow-black/20">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => {
              setSelectedPackage(null);
            }}
            className="group p-2.5 rounded-xl bg-[#141A29]/90 hover:bg-gradient-to-r hover:from-amber-600 hover:to-amber-500 text-slate-300 hover:text-white border border-slate-700/80 hover:border-amber-400/50 transition-all duration-200 cursor-pointer shadow-md shadow-black/20 shrink-0 flex items-center justify-center"
            title="Kembali ke daftar naskah"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Eye className="w-4 h-4" />
              </div>

              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Preview & Unduh Naskah Soal
              </h2>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              Simulasi tampilan dokumen format resmi standar F4 sebelum dicetak atau diekspor.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={() => {
              if (selectedPackage) {
                setEditingPackage(selectedPackage);
              }
            }}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Soal & Sisip Gambar
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={() =>
                onEdit(
                  selectedPackage
                )
              }
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileQuestion className="w-3.5 h-3.5" />
              Edit Kisi-kisi
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setShowSettings(
                !showSettings
              )
            }
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
              showSettings
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Pengaturan Tampilan
          </button>

          <button
            type="button"
            onClick={handleExportWord}
            disabled={isExportingWord}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            {isExportingWord ? 'Mengekspor Word...' : 'Unduh Word'}
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            {isExportingPdf ? 'Mengekspor PDF...' : 'Unduh PDF'}
          </button>

          <button
            type="button"
            onClick={() => handleDelete(selectedPackage)}
            className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Hapus naskah ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus
          </button>

        </div>

      </div>

      {/* ====================================================
          SETTINGS (COMPACT & MODERN)
      ==================================================== */}

      {showSettings && (
        <div className="rounded-2xl border border-slate-700/80 bg-[#0F172A] p-3.5 shadow-xl transition-all">

          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">

            <div>

              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
                Pengaturan Tampilan Naskah
              </h3>

              <p className="text-[10px] text-slate-400 mt-0.5">
                Format layout dan kop untuk simulasi cetak & ekspor Word.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowSettings(false)
              }
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">

            {/* KOP SOAL — Diberi ruang lega (5 Kolom) */}
            <div className="md:col-span-5 rounded-xl border border-slate-700/70 bg-slate-900/60 p-2.5">

              <div className="flex items-center justify-between mb-2">

                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] font-bold text-white">
                    Kop Soal Sekolah
                  </span>
                </div>

                {copImage && (
                  <span className="text-[9px] font-mono text-indigo-300 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    Tinggi: {Math.round((settings.headerHeightRatio || 0.20) * 100)}%
                  </span>
                )}

              </div>

              {copImage ? (
                <div className="space-y-2">

                  <div
                    className="rounded-lg bg-white p-1.5 border border-slate-700 overflow-hidden flex items-center justify-center transition-all"
                    style={{
                      height: `${Math.max(50, Math.min(100, Math.round((settings.headerHeightRatio || 0.20) * 280)))}px`,
                    }}
                  >
                    <img
                      src={copImage}
                      alt="Kop soal"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex gap-1.5">

                    <label className="flex-1 cursor-pointer py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold text-center transition-colors">
                      Ganti File
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={
                          handleUploadCop
                        }
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={
                        handleDeleteCop
                      }
                      className="py-1 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-[9px] font-bold transition-colors"
                    >
                      Hapus Kop
                    </button>

                  </div>

                  {/* KONTROL TINGGI & PROPORSI KOP UNTUK WORD */}
                  <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>Sesuaikan Tinggi:</span>
                      <span className="text-slate-200">
                        {Math.round((settings.headerHeightRatio || 0.20) * 100)}%
                      </span>
                    </div>
                    
                    <input
                      type="range"
                      min="0.10"
                      max="0.38"
                      step="0.02"
                      value={settings.headerHeightRatio || 0.20}
                      onChange={(e) =>
                        updateSettings({
                          headerHeightRatio: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />

                    <div className="flex justify-between gap-1 pt-0.5">
                      {[
                        { label: 'Ramping', val: 0.16 },
                        { label: 'Standar', val: 0.20 },
                        { label: 'Tinggi', val: 0.26 },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() =>
                            updateSettings({ headerHeightRatio: item.val })
                          }
                          className={`flex-1 py-0.5 text-[8.5px] rounded font-medium transition-colors ${
                            Math.abs((settings.headerHeightRatio || 0.20) - item.val) < 0.02
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="border border-dashed border-slate-700 hover:border-indigo-500/60 rounded-lg py-3 px-2 text-center transition-all bg-slate-950/40">
                    <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-300">
                      Upload File Kop
                    </p>
                    <p className="text-[8.5px] text-slate-500 mt-0.5">
                      PNG / JPG • Maks. 4 MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={
                      handleUploadCop
                    }
                    className="hidden"
                  />
                </label>
              )}

            </div>

            {/* PENGATURAN UMUM COMPACT (7 Kolom) */}
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5">

              {/* LAYOUT PG */}
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[11px] font-bold text-white">
                      Layout PG
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight mb-2">
                    Tampilan butir soal pilihan ganda.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        previewLayout: 'two-column',
                      })
                    }
                    className={`py-1 text-[9px] font-bold rounded-md transition-all ${
                      settings.previewLayout === 'two-column'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2 Kolom
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        previewLayout: 'one-column',
                      })
                    }
                    className={`py-1 text-[9px] font-bold rounded-md transition-all ${
                      settings.previewLayout === 'one-column'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    1 Kolom
                  </button>
                </div>
              </div>

              {/* UKURAN FONT */}
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold text-white">
                      Ukuran Font
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight mb-2">
                    Standar 11pt atau 12pt.
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
                  {[10, 11, 12, 13].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        updateSettings({ fontSize: size })
                      }
                      className={`py-1 text-[9px] font-bold rounded-md transition-all ${
                        settings.fontSize === size
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* ELEMEN NASKAH TOGGLES */}
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold text-white">
                    Elemen
                  </span>
                </div>

                <ToggleRow
                  label="Kop Sekolah"
                  checked={settings.showHeader}
                  onChange={(checked) =>
                    updateSettings({ showHeader: checked })
                  }
                />

                <ToggleRow
                  label="Identitas Peserta"
                  checked={settings.showIdentity}
                  onChange={(checked) =>
                    updateSettings({ showIdentity: checked })
                  }
                />

                <ToggleRow
                  label="Petunjuk Ujian"
                  checked={settings.showInstructions}
                  onChange={(checked) =>
                    updateSettings({ showInstructions: checked })
                  }
                />
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ====================================================
          PREVIEW
      ==================================================== */}

      <div className="rounded-2xl border border-slate-700/70 bg-[#090D16] p-3 sm:p-5">

        <div className="flex items-center justify-between mb-4">

          <div>

            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Simulasi Dokumen
            </p>

            <p className="text-xs text-slate-300 mt-1">
              {previewPages} halaman • scroll ke bawah untuk melihat seluruh naskah
            </p>

          </div>



        </div>

        {/* ==================================================
            F4 PAPER — 21 × 33 CM
            Semua halaman ditampilkan vertikal.
            Header hanya halaman pertama.
        ================================================== */}

        <div className="w-full overflow-x-auto overflow-y-visible pb-8">
          <div
            className="mx-auto flex flex-col items-center gap-6"
            style={{
              width: '794px',
              maxWidth: '100%',
            }}
          >
            {previewDocumentPages.map(
              (documentPage, pageIndex) => {
                const isFirstPage = pageIndex === 0;

                const renderQuestions = (
                  questions: EvaluationQuestion[]
                ) => (
                  <div className="min-w-0">
                    {questions.map(
                      (question, index) => (
                        <QuestionPaper
                          key={
                            question.id ||
                            `question-${pageIndex}-${index}`
                          }
                          question={question}
                          number={
                            question.number ||
                            question.globalNumber ||
                            index + 1
                          }
                          fontSize={settings.fontSize}
                        />
                      )
                    )}
                  </div>
                );

                return (
                  <div
                    key={`f4-page-${pageIndex}`}
                    data-evaluation-page="true"
                    className="relative bg-white text-black shadow-2xl shrink-0"
                    style={{
                      width: '794px',
                      height: '1247px',
                      minHeight: '1247px',
                      padding: '48px 48px 50px 48px',
                      boxSizing: 'border-box',
                      fontFamily:
                        '"Times New Roman", Times, serif',
                      fontSize: `${settings.fontSize}pt`,
                      lineHeight: 1.25,
                      overflow: 'hidden',
                    }}
                  >
                    {/* KOP — HALAMAN 1 SAJA */}
                    {isFirstPage &&
                      settings.showHeader &&
                      copImage && (
                        <div
                          className="mb-3 w-full overflow-hidden flex items-center justify-center"
                          style={{
                            height: `${Math.round(698 * (settings.headerHeightRatio || 0.20))}px`,
                            maxHeight: `${Math.round(698 * (settings.headerHeightRatio || 0.20))}px`,
                          }}
                        >
                          <img
                            src={copImage}
                            alt="Kop sekolah"
                            className="w-full h-full object-contain block"
                          />
                        </div>
                      )}

                    {/* JUDUL — HALAMAN 1 SAJA */}
                    {isFirstPage &&
                      settings.showHeader && (
                        <div
                          className="text-center"
                          style={{ marginBottom: '10px' }}
                        >
                          <div
                            className="font-bold uppercase"
                            style={{
                              fontSize: '12pt',
                              lineHeight: 1.15,
                            }}
                          >
                            {examTitleParts.headerTitle || `SOAL ${examTitleParts.fullName} (${examTitleParts.acronym})`}
                          </div>
                          <div
                            className="font-bold uppercase"
                            style={{
                              fontSize: '12pt',
                              lineHeight: 1.15,
                            }}
                          >
                            LINGKUP MATERI KURIKULUM MERDEKA
                          </div>
                          <div
                            className="font-bold uppercase"
                            style={{
                              fontSize: '12pt',
                              lineHeight: 1.15,
                            }}
                          >
                            TAHUN PELAJARAN{' '}
                            {selectedPackage.schoolYear ||
                              '2025 - 2026'}
                          </div>
                        </div>
                      )}

                    {/* IDENTITAS — HALAMAN 1 SAJA */}
                    {isFirstPage &&
                      settings.showIdentity && (
                        <div
                          className="border border-black mb-2"
                          style={{
                            fontSize: '10.5pt',
                            lineHeight: 1.15,
                            padding: '7px 9px',
                          }}
                        >
                          <div
                            className="grid grid-cols-2"
                            style={{
                              columnGap: '28px',
                              rowGap: '7px',
                            }}
                          >
                            {/* KOLOM KIRI */}
                            <div className="space-y-1.5">
                              <div
                                className="grid items-center"
                                style={{
                                  gridTemplateColumns:
                                    '145px 18px minmax(0, 1fr)',
                                }}
                              >
                                <span className="font-bold uppercase whitespace-nowrap">
                                  MATA PELAJARAN
                                </span>
                                <span className="text-center font-bold">
                                  :
                                </span>
                                <span className="min-w-0 truncate">
                                  {selectedPackage.subjectName || '-'}
                                </span>
                              </div>

                              <div
                                className="grid items-center"
                                style={{
                                  gridTemplateColumns:
                                    '145px 18px minmax(0, 1fr)',
                                }}
                              >
                                <span className="font-bold uppercase whitespace-nowrap">
                                  HARI/TANGGAL
                                </span>
                                <span className="text-center font-bold">
                                  :
                                </span>
                                <span className="whitespace-nowrap">
                                  ........................................
                                </span>
                              </div>

                              <div
                                className="grid items-center"
                                style={{
                                  gridTemplateColumns:
                                    '145px 18px minmax(0, 1fr)',
                                }}
                              >
                                <span className="font-bold uppercase whitespace-nowrap">
                                  WAKTU
                                </span>
                                <span className="text-center font-bold">
                                  :
                                </span>
                                <span className="whitespace-nowrap">
                                  ........................................
                                </span>
                              </div>
                            </div>

                            {/* KOLOM KANAN */}
                            <div className="space-y-1.5">
                              <div
                                className="grid items-center"
                                style={{
                                  gridTemplateColumns:
                                    '80px 18px minmax(0, 1fr)',
                                }}
                              >
                                <span className="font-bold uppercase whitespace-nowrap">
                                  NAMA
                                </span>
                                <span className="text-center font-bold">
                                  :
                                </span>
                                <span className="whitespace-nowrap">
                                  ........................................
                                </span>
                              </div>

                              <div
                                className="grid items-center"
                                style={{
                                  gridTemplateColumns:
                                    '80px 18px minmax(0, 1fr)',
                                }}
                              >
                                <span className="font-bold uppercase whitespace-nowrap">
                                  NIM/NISN
                                </span>
                                <span className="text-center font-bold">
                                  :
                                </span>
                                <span className="whitespace-nowrap">
                                  ........................................
                                </span>
                              </div>

                              <div
                                className="grid items-center"
                                style={{
                                  gridTemplateColumns:
                                    '80px 18px minmax(0, 1fr)',
                                }}
                              >
                                <span className="font-bold uppercase whitespace-nowrap">
                                  KELAS
                                </span>
                                <span className="text-center font-bold">
                                  :
                                </span>
                                <span className="whitespace-nowrap">
                                  {selectedPackage.className || '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* PETUNJUK — HALAMAN 1 SAJA */}
                    {isFirstPage &&
                      settings.showInstructions && (
                        <div
                          className="mb-3 italic"
                          style={{
                            fontSize:
                              `${settings.instructionFontSize}pt`,
                            lineHeight: 1.15,
                          }}
                        >
                          <div
                            className="italic"
                            style={{
                              textDecoration: 'underline',
                            }}
                          >
                            Petunjuk :
                          </div>
                          <ol className="list-decimal pl-5 mt-0.5 space-y-0">
                            <li>
                              Berdo’alah sebelum mengerjakan soal !
                            </li>
                            <li>
                              Tulislah namamu pada pojok kanan bagian atas !
                            </li>
                            <li>
                              Bacalah setiap soal dengan teliti !
                            </li>
                            <li>
                              Kerjakanlah terlebih dahulu soal yang kamu anggap mudah !
                            </li>
                            <li>
                              Periksa kembali hasil pekerjaanmu sebelum diserahkan kepada pengawas !
                            </li>
                          </ol>
                        </div>
                      )}

                    {isFirstPage && (
                      <div className="border-b border-black mb-3" />
                    )}

                    {/* ==================================================
                        BAGIAN A — PG
                        Judul Bagian A tampil 1 kolom penuh di atas soal.
                        Format 2 kolom dimulai tepat dari soal nomor 1.
                    ================================================== */}
                    {documentPage.type === 'questions' &&
                      (documentPage.left.length > 0 ||
                        documentPage.right.length > 0) && (
                        <section className="mb-3">
                          {isFirstPage && (
                            <div className="w-full mb-2">
                              <SectionTitle>
                                <span className="font-bold">
                                  A. Berilah tanda silang ( X ) pada huruf{' '}
                                  {Array.isArray(questionGroups.pg[0]?.options) &&
                                  questionGroups.pg[0].options.length >= 4
                                    ? 'a, b, c, atau d'
                                    : 'a, b, atau c'}{' '}
                                  di depan jawaban yang paling tepat !
                                </span>
                              </SectionTitle>
                            </div>
                          )}

                          {settings.previewLayout === 'one-column' ? (
                            renderQuestions([
                              ...documentPage.left,
                              ...documentPage.right,
                            ])
                          ) : (
                            <div className="grid grid-cols-2 gap-x-8 items-start">
                              {renderQuestions(
                                documentPage.left
                              )}

                              {renderQuestions(
                                documentPage.right
                              )}
                            </div>
                          )}
                        </section>
                      )}

                    {/* ==================================================
                        BAGIAN B/C/D — 1 KOLOM
                        Jika masih ada ruang setelah PG, bagian berikutnya
                        langsung muncul di halaman yang sama.
                    ================================================== */}
                    {documentPage.continuation.length > 0 && (
                      <div className="w-full mt-2">
                        {documentPage.continuation.map(
                          (section, sectionIndex) => (
                            <section
                              key={`${section.type}-${pageIndex}-${sectionIndex}`}
                              className="mb-3"
                            >
                              {section.showTitle && (
                                <SectionTitle>
                                  {section.type === 'isian' && (
                                    <span className="font-bold">
                                      B. Isilah titik-titik berikut ini dengan jawaban yang benar !
                                    </span>
                                  )}
                                  {section.type === 'matching' && (
                                    <span className="font-bold">
                                      C. Pasangkan kalimat-kalimat berikut dengan tepat!
                                    </span>
                                  )}
                                  {section.type === 'uraian' && (
                                    <span className="font-bold">
                                      D. Jawablah pertanyaan berikut dengan tepat!
                                    </span>
                                  )}
                                </SectionTitle>
                              )}

                              {section.type === 'uraian' ? (
                                <div className="space-y-5">
                                  {section.questions.map(
                                    (question, index) => (
                                      <div
                                        key={
                                          question.id ||
                                          `uraian-${pageIndex}-${sectionIndex}-${index}`
                                        }
                                        style={{
                                          fontSize:
                                            `${settings.fontSize}pt`,
                                          lineHeight: 1.25,
                                          pageBreakInside:
                                            'avoid',
                                          breakInside:
                                            'avoid',
                                        }}
                                      >
                                        <div className="flex gap-2">
                                          <span className="shrink-0">
                                            {question.number ||
                                              question.globalNumber ||
                                              index + 1}.
                                          </span>

                                          <div className="flex-1">
                                            {question.questionImage && (
                                              <div className="my-1.5 max-w-[240px] overflow-hidden rounded border border-slate-300">
                                                <img
                                                  src={question.questionImage}
                                                  alt="Stimulus Soal Uraian"
                                                  className="max-h-40 w-auto object-contain block"
                                                />
                                              </div>
                                            )}
                                            {question.questionText ||
                                              '-'}
                                          </div>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                          <div className="border-b border-black h-5" />
                                          <div className="border-b border-black h-5" />
                                          <div className="border-b border-black h-5" />
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  {section.questions.map(
                                    (question, index) => (
                                      <div
                                        key={
                                          question.id ||
                                          `${section.type}-${pageIndex}-${sectionIndex}-${index}`
                                        }
                                        className="flex gap-2"
                                        style={{
                                          fontSize:
                                            `${settings.fontSize}pt`,
                                          lineHeight: 1.25,
                                          pageBreakInside:
                                            'avoid',
                                          breakInside:
                                            'avoid',
                                        }}
                                      >
                                        <span className="shrink-0">
                                          {question.number ||
                                            question.globalNumber ||
                                            index + 1}.
                                        </span>

                                        <div className="flex-1">
                                          {question.questionImage && (
                                            <div className="my-1.5 max-w-[240px] overflow-hidden rounded border border-slate-300">
                                              <img
                                                src={question.questionImage}
                                                alt="Stimulus Soal"
                                                className="max-h-40 w-auto object-contain block"
                                              />
                                            </div>
                                          )}
                                          {question.questionText ||
                                            (section.type ===
                                            'isian'
                                              ? '................................................................................................'
                                              : '-')}
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </section>
                          )
                        )}
                      </div>
                    )}

                    <div
                      className="absolute bottom-4 left-0 right-0 text-center"
                      style={{
                        fontSize: '8pt',
                        color: '#666',
                      }}
                    >
                      {pageIndex + 1}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

      {/* ====================================================
          INFO
      ==================================================== */}

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">

        <div className="flex items-start gap-3">

          <Eye className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />

          <div>

            <p className="text-xs font-bold text-indigo-300">
              Preview mengikuti konsep dokumen Word
            </p>

            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Preview ini menjadi acuan
              tampilan naskah sebelum fitur
              export Word diaktifkan.
            </p>

          </div>

        </div>

      </div>

      </div>

      {/* MODAL KONFIRMASI HAPUS NASKAH SOAL */}
      {packageToDelete && (
        <div className="fixed inset-0 z-[999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Hapus Naskah Soal?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090D16] border border-[#222B3D] text-xs">
              <p className="font-bold text-white truncate">{packageToDelete.title || 'Naskah Soal'}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {packageToDelete.subjectName} • Kelas {packageToDelete.className} • {packageToDelete.examType}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Total {packageToDelete.questions?.length || 0} butir soal akan dihapus secara permanen dari penyimpanan browser.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPackageToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeletePackage}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ya, Hapus Naskah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS KOP */}
      {showDeleteCopConfirm && (
        <div className="fixed inset-0 z-[999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Hapus Kop Soal?</h3>
                <p className="text-[11px] text-slate-400">Gambar kop sekolah akan dihapus.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteCopConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteCop}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                Hapus Kop
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ========================================================
// JUDUL / INSTRUKSI BAGIAN
// ========================================================

const SectionTitle: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div
    style={{
      marginBottom: '6px',
      lineHeight: 1.2,
    }}
  >
    {children}
  </div>
);

// ========================================================
// SOAL PADA KERTAS
// ========================================================

const QuestionPaper: React.FC<{
  question: EvaluationQuestion;
  number: number;
  fontSize: number;
}> = ({
  question,
  number,
  fontSize,
}) => {
  const options = Array.isArray(question.options) ? question.options : [];
  
  // Deteksi apakah opsi pendek dan bisa dibuat 2 sub-kolom (A-C di baris 1, B-D di baris 2 atau A-B / C-D)
  const isShortOptions =
    options.length >= 3 &&
    options.length <= 4 &&
    options.every(
      (opt) =>
        typeof opt.text === 'string' &&
        opt.text.trim().length <= 22 &&
        !opt.text.includes('\n')
    );

  return (
    <div
      className="mb-3 break-inside-avoid"
      style={{
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        fontSize: `${fontSize}pt`,
        lineHeight: 1.25,
      }}
    >
      <div className="flex items-start gap-1.5">
        <span className="shrink-0 font-medium">
          {number}.
        </span>

        <div className="flex-1 min-w-0">
          {question.questionImage && (
            <div className="my-1.5 max-w-[240px] overflow-hidden rounded border border-slate-300">
              <img
                src={question.questionImage}
                alt={`Stimulus Soal ${number}`}
                className="max-h-40 w-auto object-contain block"
              />
            </div>
          )}

          <div className="whitespace-pre-wrap">
            {question.questionText || '-'}
          </div>

          {options.length > 0 && (
            <div className="mt-1">
              {isShortOptions ? (
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  {options.map((option) => (
                    <div
                      key={option.key}
                      className="flex items-start gap-1.5 min-w-0"
                    >
                      <span className="shrink-0 font-medium">
                        {option.key}.
                      </span>
                      <span className="truncate">
                        {option.text}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {options.map((option) => (
                    <div
                      key={option.key}
                      className="flex items-start gap-1.5"
                    >
                      <span className="shrink-0 font-medium">
                        {option.key}.
                      </span>
                      <span>
                        {option.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========================================================
// STAT BADGE
// ========================================================

const StatBadge: React.FC<{
  label: string;
  value: number;
}> = ({
  label,
  value,
}) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[10px] font-bold text-slate-300">

    <span className="text-indigo-300">
      {value}
    </span>

    {label}

  </span>
);

// ========================================================
// TOGGLE
// ========================================================

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (
    checked: boolean
  ) => void;
}> = ({
  label,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between gap-3">

    <span className="text-[10px] font-semibold text-slate-300">
      {label}
    </span>

    <button
      type="button"
      onClick={() =>
        onChange(!checked)
      }
      className={`relative w-9 h-5 rounded-full transition-all ${
        checked
          ? 'bg-indigo-600'
          : 'bg-slate-700'
      }`}
    >

      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
          checked
            ? 'left-[18px]'
            : 'left-0.5'
        }`}
      />

    </button>

  </div>
);