import React, { useState, useEffect } from 'react';
import {
  FileQuestion,
  Sparkles,
  Download,
  FileText,
  Trash2,
  Save,
  CheckCircle2,
  Image,
  Upload,
  X,
  RotateCcw,
  BookOpen,
  Layers,
  Pencil,
  Check,
  ChevronRight,
  Zap,
} from 'lucide-react';

import {
  EvaluationBlueprint,
  EvaluationQuestion,
  EvaluationQuestionPackage,
  EvaluationMaterialSource,
  MultipleChoiceOptionsCount,
  MatchingMode,
} from '../../types/evaluationTypes';

import { generateQuestionsWithAi } from '../../services/evaluation/evaluationAiService';

import {
  saveQuestionPackage,
  getStoredBlueprints,
  deleteBlueprint,
} from '../../services/evaluation/evaluationStorageService';

import {
  exportQuestionsToExcel,
  exportQuestionsToWordDocx,
} from '../../services/evaluation/evaluationExportService';

import { EvaluationMaterialInput } from './EvaluationMaterialInput';
import { PillStepper } from '../analysis/PillStepper';

interface EvaluationSoalViewProps {
  initialBlueprint?: EvaluationBlueprint | null;

  /**
   * Dipanggil saat guru menekan tombol "Edit" pada kisi-kisi tersimpan.
   * Parent dapat menghubungkan callback ini ke menu/editor kisi-kisi.
   */
  onEditBlueprint?: (blueprint: EvaluationBlueprint) => void;
  onBlueprintDeleted?: (blueprintId: string) => void;
}

const PRESET_SUBJECTS = [
  'Pendidikan Agama Islam & BP',
  'Pendidikan Pancasila (PPKn)',
  'Bahasa Indonesia',
  'Matematika',
  'IPAS (Ilmu Pengetahuan Alam & Sosial)',
  'Bahasa Inggris',
  'Pendidikan Jasmani (PJOK)',
  'Seni Rupa / Seni Budaya',
  'Bahasa Arab',
  'Tahfidz / BTQ',
  'Bahasa Sunda (Mulok)',
  'Komputer / TIK',
  'Lainnya (Ketik Custom...)',
];

const PRESET_CLASSES = [
  '1A',
  '1B',
  '1C',
  '2A',
  '2B',
  '2C',
  '3A',
  '3B',
  '3C',
  '4A',
  '4B',
  '4C',
  '5A',
  '5B',
  '5C',
  '6A',
  '6B',
  '6C',
];

export const EvaluationSoalView: React.FC<EvaluationSoalViewProps> = ({
  initialBlueprint,
  onEditBlueprint,
  onBlueprintDeleted,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Mode Step 1:
  // - 'baru'       = guru membuat naskah tanpa kisi-kisi dan bebas mengatur konfigurasi.
  // - 'kisi-kisi'  = guru menggunakan kisi-kisi; konfigurasi otomatis mengikuti kisi-kisi.
  const [soalMode, setSoalMode] = useState<'baru' | 'kisi-kisi'>(
    initialBlueprint ? 'kisi-kisi' : 'baru'
  );

  // Form State
  const [subjectSelect, setSubjectSelect] = useState(
    initialBlueprint?.subjectName || 'Pendidikan Agama Islam & BP'
  );

  const [customSubject, setCustomSubject] = useState('');

  const [className, setClassName] = useState(
    initialBlueprint?.className || '2A'
  );

  const [examType, setExamType] = useState(
    initialBlueprint?.examType || 'STS 1 (Sumatif Tengah Semester)'
  );

  const [schoolYear, setSchoolYear] = useState(
    initialBlueprint?.schoolYear || '2025/2026'
  );

  const [teacherName, setTeacherName] = useState(
    initialBlueprint?.teacherName || ''
  );

  const [selectedBlueprintId, setSelectedBlueprintId] =
    useState<string>(initialBlueprint?.id || '');

  // Gaya Penulisan AI (Compact 10-20 kata vs Detail/Naratif)
  const [outputStyle, setOutputStyle] = useState<'concise' | 'detailed'>('concise');

  // ========================================================
  // RIWAYAT KISI-KISI TERSIMPAN
  // ========================================================
  const [savedBlueprints, setSavedBlueprints] = useState<
    EvaluationBlueprint[]
  >([]);

  // Konfigurasi Soal
  const [pgCount, setPgCount] = useState<number>(20);

  const [pgOptions, setPgOptions] =
    useState<MultipleChoiceOptionsCount>('A-C');

  const [isianCount, setIsianCount] = useState<number>(5);

  const [partCType, setPartCType] = useState<
    'Essay' | 'Uraian' | 'Menjodohkan'
  >('Menjodohkan');

  const [partCCount, setPartCCount] = useState<number>(1);

  const [matchingMode, setMatchingMode] =
    useState<MatchingMode>('text_to_text');

  // Sumber Materi Guru
  const [materials, setMaterials] =
    useState<EvaluationMaterialSource>({
      textNotes: '',
      images: [],
      files: [],
    });

  const [activePackage, setActivePackage] =
    useState<EvaluationQuestionPackage | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [saveSuccessMessage, setSaveSuccessMessage] =
    useState<string | null>(null);

  // Kop naskah soal disimpan sebagai gambar agar desain resmi sekolah
  // dapat diganti tanpa mengubah source code export Word.
  const [schoolHeaderImage, setSchoolHeaderImage] =
    useState<string | null>(() => localStorage.getItem('arsipku_evaluation_school_header_v1'));

  // ========================================================
  // LOAD RIWAYAT KISI-KISI
  // ========================================================
  useEffect(() => {
    // Muat riwayat kisi-kisi hanya saat komponen pertama kali dibuka.
    // Perubahan mode atau initialBlueprint tidak akan menulis ulang
    // daftar riwayat yang baru saja dihapus.
    setSavedBlueprints(getStoredBlueprints());
  }, []);

  const getBlueprintDistribution = (
    bp: EvaluationBlueprint
  ) => {
    const pgItems = bp.items.filter(
      (i) => i.questionForm === 'PG'
    );

    const isianItems = bp.items.filter(
      (i) => i.questionForm === 'ISIAN'
    );

    const matchItems = bp.items.filter(
      (i) => i.questionForm === 'MENJODOHKAN'
    );

    const uraianItems = bp.items.filter(
      (i) =>
        i.questionForm === 'URAIAN' ||
        i.questionForm === 'ESSAY'
    );

    let partCType:
      | 'Essay'
      | 'Uraian'
      | 'Menjodohkan' = 'Menjodohkan';

    let partCCount = matchItems.length;

    if (
      matchItems.length === 0 &&
      uraianItems.length > 0
    ) {
      partCType = 'Uraian';
      partCCount = uraianItems.length;
    }

    return {
      pgCount: pgItems.length,
      isianCount: isianItems.length,
      partCType,
      partCCount,
      pgOptions:
        bp.distributionConfig?.pgOptions || 'A-C',
    };
  };

  const applyBlueprint = (
    bp: EvaluationBlueprint
  ) => {
    const distribution =
      getBlueprintDistribution(bp);

    setSoalMode('kisi-kisi');

    setSelectedBlueprintId(bp.id);

    setSubjectSelect(
      PRESET_SUBJECTS.includes(bp.subjectName)
        ? bp.subjectName
        : 'Lainnya (Ketik Custom...)'
    );

    if (!PRESET_SUBJECTS.includes(bp.subjectName)) {
      setCustomSubject(bp.subjectName);
    }

    setClassName(bp.className);

    setExamType(bp.examType);

    setSchoolYear(bp.schoolYear);

    if (bp.teacherName) {
      setTeacherName(bp.teacherName);
    }

    setPgCount(distribution.pgCount);

    setIsianCount(distribution.isianCount);

    setPartCType(distribution.partCType);

    setPartCCount(distribution.partCCount);

    setPgOptions(distribution.pgOptions);
  };

  const handleUseBlueprint = (
    bp: EvaluationBlueprint
  ) => {
    if (selectedBlueprintId === bp.id) {
      // Toggle lepas tautan
      setSelectedBlueprintId('');
      setSaveSuccessMessage(
        'Kisi-kisi dilepaskan. Silakan hubungkan kisi-kisi lain atau buat naskah baru.'
      );
    } else {
      applyBlueprint(bp);
      setSaveSuccessMessage(
        'Kisi-kisi berhasil dihubungkan. Konfigurasi soal otomatis mengikuti kisi-kisi.'
      );
    }

    setTimeout(
      () => setSaveSuccessMessage(null),
      3500
    );
  };

  // ========================================================
  // EDIT KISI-KISI
  // ========================================================
  const handleEditBlueprint = (
    bp: EvaluationBlueprint
  ) => {
    if (onEditBlueprint) {
      onEditBlueprint(bp);
      return;
    }

    setSaveSuccessMessage(
      'Tombol Edit siap digunakan. Hubungkan onEditBlueprint pada parent untuk membuka editor kisi-kisi.'
    );

    setTimeout(
      () => setSaveSuccessMessage(null),
      4000
    );
  };

  // ========================================================
  // HAPUS KISI-KISI
  // ========================================================
  const handleDeleteBlueprint = (
  bp: EvaluationBlueprint
) => {
  const storageKey =
    'arsipku_evaluation_blueprints_v1';

  try {
    console.log(
      '[KISI-KISI] Mulai menghapus:',
      bp.id
    );

    /*
     * ==========================================
     * 1. AMBIL DATA DARI LOCAL STORAGE
     * ==========================================
     */
    const raw =
      localStorage.getItem(storageKey);

    const current: EvaluationBlueprint[] =
      raw ? JSON.parse(raw) : [];

    console.log(
      '[KISI-KISI] Data sebelum dihapus:',
      current
    );

    /*
     * ==========================================
     * 2. HAPUS BERDASARKAN ID
     * ==========================================
     */
    const updated =
      current.filter(
        (item) => item.id !== bp.id
      );

    /*
     * ==========================================
     * 3. SIMPAN DATA TERBARU
     * ==========================================
     */
    localStorage.setItem(
      storageKey,
      JSON.stringify(updated)
    );

    /*
     * ==========================================
     * 4. UPDATE STATE REACT
     * ==========================================
     */
    setSavedBlueprints(updated);

    /*
     * ==========================================
     * 5. LEPASKAN KISI-KISI YANG SEDANG TERPILIH
     * ==========================================
     */
    if (
      selectedBlueprintId === bp.id
    ) {
      setSelectedBlueprintId('');
    }

    /*
     * ==========================================
     * 6. BERI TAHU PARENT
     * ==========================================
     */
    onBlueprintDeleted?.(bp.id);

    /*
     * ==========================================
     * 7. VERIFIKASI LOCAL STORAGE
     * ==========================================
     */
    const verifyRaw =
      localStorage.getItem(
        storageKey
      );

    const verify: EvaluationBlueprint[] =
      verifyRaw
        ? JSON.parse(verifyRaw)
        : [];

    const stillExists =
      verify.some(
        (item) => item.id === bp.id
      );

    if (stillExists) {
      console.error(
        '[KISI-KISI] GAGAL: data masih ada:',
        bp.id
      );

      setSaveSuccessMessage(
        'Kisi-kisi gagal dihapus.'
      );
    } else {
      console.log(
        '[KISI-KISI] BERHASIL DIHAPUS:',
        bp.id
      );

      setSaveSuccessMessage(
        'Kisi-kisi berhasil dihapus.'
      );
    }

    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3000);

  } catch (error) {
    console.error(
      '[KISI-KISI] Error saat menghapus:',
      error
    );

    setSaveSuccessMessage(
      'Terjadi kesalahan saat menghapus kisi-kisi.'
    );

    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3000);
  }
};

  const handleChangeSoalMode = (
    mode: 'baru' | 'kisi-kisi'
  ) => {
    setSoalMode(mode);

    if (mode === 'baru') {
      setSelectedBlueprintId('');

      setPgCount(20);

      setPgOptions('A-C');

      setIsianCount(5);

      setPartCType('Menjodohkan');

      setPartCCount(1);
    }
  };

  // Sinkronisasi dengan initialBlueprint saat user
  // mengklik "Lanjut Buat Naskah Soal".
  useEffect(() => {
    if (initialBlueprint) {
      applyBlueprint(initialBlueprint);
    }
  }, [initialBlueprint]);

  const effectiveSubjectName =
    subjectSelect === 'Lainnya (Ketik Custom...)'
      ? customSubject.trim() ||
        'Mata Pelajaran Kustom'
      : subjectSelect;

  const handleGenerateQuestions = async () => {
    setIsLoading(true);

    try {
      const selectedBp =
        soalMode === 'kisi-kisi'
          ? savedBlueprints.find(
              (b) => b.id === selectedBlueprintId
            ) ||
            initialBlueprint ||
            undefined
          : undefined;

      const generated =
        await generateQuestionsWithAi({
          subjectName: effectiveSubjectName,
          className,
          examType,
          schoolYear,
          teacherName,
          blueprint: selectedBp,
          materials,
          outputStyle,
          config: {
            pgCount,
            pgOptions,
            isianCount,
            partCType,
            partCCount,
            matchingMode,
          },
        });

setActivePackage(generated);

// ========================================================
// SIMPAN OTOMATIS HASIL GENERATE
// Agar naskah tidak hilang ketika berpindah menu.
// ========================================================
saveQuestionPackage(generated);

setCurrentStep(2);
    } catch (err) {
      console.error(
        'Failed to generate questions:',
        err
      );
    } finally {
      setIsLoading(false);
    }
  };

const handleUpdateQuestion = (
  qId: string,
  field: keyof EvaluationQuestion,
  val: any
) => {
  if (!activePackage) return;

  const updatedQuestions =
    activePackage.questions.map((q) => {
      if (q.id === qId) {
        return {
          ...q,
          [field]: val,
        };
      }

      return q;
    });

  const updatedPackage: EvaluationQuestionPackage = {
    ...activePackage,
    questions: updatedQuestions,
    updatedAt: new Date().toISOString(),
  };

  setActivePackage(updatedPackage);

  // Simpan perubahan langsung ke storage
  saveQuestionPackage(updatedPackage);
};

const handleUpdateOption = (
  qId: string,
  optKey: 'A' | 'B' | 'C' | 'D',
  text: string
) => {
  if (!activePackage) return;

  const updatedQuestions =
    activePackage.questions.map((q) => {
      if (
        q.id === qId &&
        q.options
      ) {
        const updatedOptions =
          q.options.map((o) =>
            o.key === optKey
              ? {
                  ...o,
                  text,
                }
              : o
          );

        return {
          ...q,
          options: updatedOptions,
        };
      }

      return q;
    });

  const updatedPackage: EvaluationQuestionPackage = {
    ...activePackage,
    questions: updatedQuestions,
    updatedAt: new Date().toISOString(),
  };

  setActivePackage(updatedPackage);

  // Simpan perubahan pilihan jawaban
  saveQuestionPackage(updatedPackage);
};

  const handleQuestionImageUpload = (
    qId: string,
    file: File
  ) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const base64 =
        e.target?.result as string;

      handleUpdateQuestion(
        qId,
        'questionImage',
        base64
      );
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveQuestionImage = (
    qId: string
  ) => {
    handleUpdateQuestion(
      qId,
      'questionImage',
      undefined
    );
  };

const handleDeleteQuestion = (
  qId: string
) => {
  if (!activePackage) return;

  const updatedQuestions =
    activePackage.questions
      .filter((q) => q.id !== qId)
      .map((q, idx) => ({
        ...q,
        globalNumber: idx + 1,
      }));

  const updatedPackage: EvaluationQuestionPackage = {
    ...activePackage,
    questions: updatedQuestions,
    updatedAt: new Date().toISOString(),
  };

  setActivePackage(updatedPackage);

  // Simpan perubahan setelah soal dihapus
  saveQuestionPackage(updatedPackage);
};

  const handleSave = () => {
    if (!activePackage) return;

    saveQuestionPackage(activePackage);

    setSaveSuccessMessage(
      'Naskah soal berhasil disimpan.'
    );

    setTimeout(
      () => setSaveSuccessMessage(null),
      3000
    );
  };

  const handleExport = () => {
    if (!activePackage) return;

    exportQuestionsToExcel(
      activePackage
    );
  };

  const handleExportWord = async () => {
    if (!activePackage) return;

    await exportQuestionsToWordDocx(
      activePackage,
      schoolHeaderImage || undefined
    );
  };

  const handleSchoolHeaderUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSaveSuccessMessage('Kop soal harus berupa gambar PNG atau JPG.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setSaveSuccessMessage('Ukuran kop maksimal 3 MB.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      localStorage.setItem('arsipku_evaluation_school_header_v1', value);
      setSchoolHeaderImage(value);
      setSaveSuccessMessage('Kop soal berhasil disimpan.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSchoolHeader = () => {
    localStorage.removeItem('arsipku_evaluation_school_header_v1');
    setSchoolHeaderImage(null);
    setSaveSuccessMessage('Kop soal dihapus. Export Word akan menggunakan header tanpa gambar.');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  const pgQuestions =
    activePackage?.questions.filter(
      (q) => q.type === 'PG'
    ) || [];

  const isianQuestions =
    activePackage?.questions.filter(
      (q) => q.type === 'ISIAN'
    ) || [];

  const partCQuestions =
    activePackage?.questions.filter(
      (q) =>
        q.type === 'MENJODOHKAN' ||
        q.type === 'URAIAN' ||
        q.type === 'ESSAY'
    ) || [];

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER INFO
      ====================================================== */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0E101E] via-[#13152A] to-[#1A1233] border border-purple-500/25 shadow-xl shadow-black/20">
        <div className="absolute top-0 right-0 w-64 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center flex-wrap gap-2.5 mb-2">
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/35 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Sub Menu 2
            </span>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <FileQuestion className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Generator & Editor Naskah Soal Evaluasi
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Hasilkan naskah soal berjenjang: <strong className="text-slate-200">Pilihan Ganda (A-C / A-D)</strong>,{' '}
            <strong className="text-slate-200">Isian Singkat</strong>, dan{' '}
            <strong className="text-slate-200">Bagian C (Menjodohkan / Uraian)</strong> dengan penomoran berurutan per bagian yang sinkron dengan kisi-kisi.
          </p>
        </div>

        {activePackage &&
          currentStep === 2 && (
            <div className="relative flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setCurrentStep(1)
                }
                className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700/80 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ubah Parameter
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Naskah
              </button>

              <label
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
                title="Upload kop naskah soal"
              >
                <Upload className="w-3.5 h-3.5" />
                {schoolHeaderImage ? 'Ganti Kop' : 'Upload Kop'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSchoolHeaderUpload(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>

              {schoolHeaderImage && (
                <button
                  type="button"
                  onClick={handleRemoveSchoolHeader}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl text-xs font-black flex items-center gap-1.5 border border-red-500/20 cursor-pointer transition-all"
                  title="Hapus kop soal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Kop
                </button>
              )}

              <button
                type="button"
                onClick={handleExportWord}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Word (.docx)
              </button>

              <button
                type="button"
                onClick={handleExport}
                className="px-3.5 py-2 bg-[#00a859] hover:bg-[#00944e] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Excel (.xlsx)
              </button>

            </div>
          )}

      </div>

      {saveSuccessMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2">

          <CheckCircle2 className="w-4 h-4" />

          <span>
            {saveSuccessMessage}
          </span>

        </div>
      )}

      {/* =====================================================
          STEP 1
      ====================================================== */}
      {currentStep === 1 && (
        <div className="space-y-5">

          {/* PILIHAN MODE */}
          <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-4">

            <div>
              <h3 className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <FileQuestion className="w-4 h-4" />
                1. Sumber Pembuatan Naskah Soal
              </h3>

              <p className="text-[11px] text-slate-500 mt-1">
                Pilih apakah naskah soal akan dibuat baru
                atau mengikuti kisi-kisi yang sudah tersedia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  handleChangeSoalMode('baru')
                }
                className={`group text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  soalMode === 'baru'
                    ? 'bg-purple-500/15 border-purple-500/70 shadow-lg shadow-purple-500/10'
                    : 'bg-[#090D16] border-[#222B3D] hover:border-purple-500/40'
                }`}
              >

                <div className="flex items-start justify-between gap-3">

                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      soalMode === 'baru'
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                  </div>

                  {soalMode === 'baru' && (
                    <Check className="w-5 h-5 text-purple-300" />
                  )}

                </div>

                <div className="mt-3 text-sm font-black text-white">
                  Buat Naskah Soal Baru
                </div>

                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Atur jumlah dan bentuk soal secara manual
                  tanpa menghubungkan kisi-kisi.
                </p>

              </button>

              <button
                type="button"
                onClick={() =>
                  handleChangeSoalMode('kisi-kisi')
                }
                className={`group text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  soalMode === 'kisi-kisi'
                    ? 'bg-indigo-500/15 border-indigo-500/70 shadow-lg shadow-indigo-500/10'
                    : 'bg-[#090D16] border-[#222B3D] hover:border-indigo-500/40'
                }`}
              >

                <div className="flex items-start justify-between gap-3">

                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      soalMode === 'kisi-kisi'
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>

                  {soalMode === 'kisi-kisi' && (
                    <Check className="w-5 h-5 text-indigo-300" />
                  )}

                </div>

                <div className="mt-3 text-sm font-black text-white">
                  Gunakan Kisi-Kisi
                </div>

                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Gunakan kisi-kisi tersimpan. Identitas dan
                  jumlah soal akan mengikuti kisi-kisi secara
                  otomatis.
                </p>

              </button>

            </div>

          </div>

          {/* =================================================
              MODE BUAT NASKAH BARU
          ================================================== */}
          {soalMode === 'baru' && (
            <>
              {/* IDENTITAS & GAYA PENULISAN AI (2 KOLOM) */}
              <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-4">

                <div className="border-b border-[#222B3D] pb-3">
                  <h3 className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    2. Identitas Naskah Soal & Mode AI
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Lengkapi identitas naskah dan tentukan gaya kedalaman penulisan soal AI yang diinginkan.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                  {/* KOLOM KIRI: IDENTITAS NASKAH SOAL (7 COLS) */}
                  <div className="lg:col-span-7 p-4 rounded-xl bg-[#090D16] border border-[#222B3D] space-y-3.5 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-white mb-2.5 flex items-center justify-between">
                        <span>📋 Data Identitas Naskah</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Kelas {className}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Mata Pelajaran
                          </label>

                          <select
                            value={subjectSelect}
                            onChange={(e) =>
                              setSubjectSelect(e.target.value)
                            }
                            className="w-full bg-[#121622] border border-[#222B3D] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none cursor-pointer focus:border-purple-500"
                          >
                            {PRESET_SUBJECTS.map(
                              (s) => (
                                <option
                                  key={s}
                                  value={s}
                                >
                                  {s}
                                </option>
                              )
                            )}
                          </select>

                          {subjectSelect ===
                            'Lainnya (Ketik Custom...)' && (
                            <input
                              type="text"
                              value={customSubject}
                              onChange={(e) =>
                                setCustomSubject(
                                  e.target.value
                                )
                              }
                              placeholder="Ketik nama mata pelajaran..."
                              className="mt-2 w-full bg-[#121622] border border-purple-500/40 rounded-xl px-3 py-1.5 text-xs text-purple-200 font-bold outline-none"
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Jenjang Kelas
                          </label>

                          <select
                            value={className}
                            onChange={(e) =>
                              setClassName(e.target.value)
                            }
                            className="w-full bg-[#121622] border border-[#222B3D] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none cursor-pointer focus:border-purple-500"
                          >
                            {PRESET_CLASSES.map(
                              (c) => (
                                <option
                                  key={c}
                                  value={c}
                                >
                                  Kelas {c}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Jenis Ujian
                          </label>

                          <select
                            value={examType}
                            onChange={(e) =>
                              setExamType(e.target.value)
                            }
                            className="w-full bg-[#121622] border border-[#222B3D] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none cursor-pointer focus:border-purple-500"
                          >
                            <option value="STS 1 (Sumatif Tengah Semester)">
                              STS 1 (Sumatif Tengah Semester)
                            </option>
                            <option value="SAS (Sumatif Akhir Semester)">
                              SAS (Sumatif Akhir Semester)
                            </option>
                            <option value="STS 2 (Sumatif Tengah Semester 2)">
                              STS 2 (Sumatif Tengah Semester 2)
                            </option>
                            <option value="SAT (Sumatif Akhir Tahun)">
                              SAT (Sumatif Akhir Tahun)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Tahun Pelajaran
                          </label>

                          <input
                            type="text"
                            value={schoolYear}
                            onChange={(e) =>
                              setSchoolYear(
                                e.target.value
                              )
                            }
                            className="w-full bg-[#121622] border border-[#222B3D] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Nama Guru Penyusun
                          </label>

                          <input
                            type="text"
                            value={teacherName}
                            onChange={(e) =>
                              setTeacherName(
                                e.target.value
                              )
                            }
                            placeholder="Nama guru penyusun..."
                            className="w-full bg-[#121622] border border-[#222B3D] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-purple-500"
                          />
                        </div>

                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1E2638] text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Kop & header naskah soal otomatis mengacu data ini.</span>
                    </div>
                  </div>

                  {/* KOLOM KANAN: GAYA PENULISAN SOAL AI (5 COLS) */}
                  <div className="lg:col-span-5 p-4 rounded-xl bg-[#090D16] border border-[#222B3D] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5 text-purple-300 font-extrabold">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          Gaya Penulisan Soal AI
                        </span>
                        <span className="text-[9px] text-slate-400">Pilih Mode</span>
                      </div>

                      <div className="space-y-2.5">
                        {/* Ringkas & Padat */}
                        <div
                          onClick={() => setOutputStyle('concise')}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            outputStyle === 'concise'
                              ? 'bg-purple-500/15 border-purple-500/60 ring-1 ring-purple-500/30'
                              : 'bg-[#121622] border-[#222B3D] hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                              ⚡ Ringkas & Padat
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-semibold">
                                Default
                              </span>
                            </span>
                            <input
                              type="radio"
                              name="outputStyleManual"
                              checked={outputStyle === 'concise'}
                              onChange={() => setOutputStyle('concise')}
                              className="accent-purple-500 cursor-pointer"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Batang soal to-the-point 10–20 kata, hemat ruang kertas cetak F4 (2 kolom).
                          </p>
                        </div>

                        {/* Detail & Naratif */}
                        <div
                          onClick={() => setOutputStyle('detailed')}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            outputStyle === 'detailed'
                              ? 'bg-purple-500/15 border-purple-500/60 ring-1 ring-purple-500/30'
                              : 'bg-[#121622] border-[#222B3D] hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                              📄 Detail & Naratif
                            </span>
                            <input
                              type="radio"
                              name="outputStyleManual"
                              checked={outputStyle === 'detailed'}
                              onChange={() => setOutputStyle('detailed')}
                              className="accent-purple-500 cursor-pointer"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Dilengkapi stimulus teks, cerita literasi kontekstual, dan studi kasus analitis.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1E2638] text-[10px] text-slate-400">
                      💡 Mengatur panjang kalimat stimulus dan kedalaman opsi pilihan ganda.
                    </div>
                  </div>

                </div>
              </div>

              {/* KONFIGURASI */}
              <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-4">

                <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  3. Konfigurasi Jumlah & Bentuk Soal
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  <div className="p-4 rounded-xl bg-[#090D16] border border-[#222B3D] space-y-3">

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold text-white">
                        Bagian I. Pilihan Ganda
                      </span>

                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        No. 1 s.d. {pgCount}
                      </span>

                    </div>

                    <PillStepper
                      value={pgCount}
                      onChange={setPgCount}
                      min={0}
                      max={50}
                      step={1}
                      className="w-full"
                    />

                    <div>

                      <label className="block text-[11px] text-slate-400 mb-1.5">
                        Pilihan Jawaban
                      </label>

                      <div className="grid grid-cols-2 gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            setPgOptions('A-C')
                          }
                          className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            pgOptions === 'A-C'
                              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                              : 'bg-[#121622] border-[#222B3D] text-slate-400 hover:border-indigo-500/50 hover:text-slate-300'
                          }`}
                        >
                          <div>A-C</div>
                          <div className="text-[9px] font-medium mt-0.5 opacity-70">
                            3 pilihan
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPgOptions('A-D')
                          }
                          className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            pgOptions === 'A-D'
                              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                              : 'bg-[#121622] border-[#222B3D] text-slate-400 hover:border-indigo-500/50 hover:text-slate-300'
                          }`}
                        >
                          <div>A-D</div>
                          <div className="text-[9px] font-medium mt-0.5 opacity-70">
                            4 pilihan
                          </div>
                        </button>

                      </div>
                    </div>

                  </div>

                  <div className="p-4 rounded-xl bg-[#090D16] border border-[#222B3D] space-y-3">

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold text-white">
                        Bagian II. Isian Singkat
                      </span>

                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        No. 1 s.d. {isianCount}
                      </span>

                    </div>

                    <PillStepper
                      value={isianCount}
                      onChange={setIsianCount}
                      min={0}
                      max={30}
                      step={1}
                      className="w-full"
                    />

                    <p className="text-[10px] text-slate-500 italic pt-1">
                      Kalimat rumpang dengan titik-titik
                      untuk jawaban singkat.
                    </p>

                  </div>

                  <div className="p-4 rounded-xl bg-[#090D16] border border-[#222B3D] space-y-3">

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold text-white">
                        Bagian III. Bentuk Khusus
                      </span>

                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        No. 1 s.d. {partCCount}
                      </span>

                    </div>

                    <select
                      value={partCType}
                      onChange={(e) =>
                        setPartCType(
                          e.target.value as
                            | 'Essay'
                            | 'Uraian'
                            | 'Menjodohkan'
                        )
                      }
                      className="w-full bg-[#121622] border border-[#222B3D] rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold outline-none cursor-pointer"
                    >
                      <option value="Menjodohkan">
                        Format Menjodohkan (2 Kolom)
                      </option>

                      <option value="Uraian">
                        Format Uraian / Essay
                      </option>
                    </select>

                    <PillStepper
                      value={partCCount}
                      onChange={setPartCCount}
                      min={0}
                      max={15}
                      step={1}
                      className="w-full"
                    />

                  </div>

                </div>
              </div>

              {/* SUMBER MATERI */}
              <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F]">
                <EvaluationMaterialInput
                  materials={materials}
                  onChange={setMaterials}
                />
              </div>

              {/* GENERATE */}
              <div className="flex items-center justify-end gap-3 pt-2">

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={
                    handleGenerateQuestions
                  }
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4 animate-spin-slow" />

                  <span>
                    {isLoading
                      ? 'Menyusun Naskah Soal AI...'
                      : 'Generate Naskah Soal AI'}
                  </span>

                </button>

              </div>
            </>
          )}

          {/* =================================================
              MODE GUNAKAN KISI-KISI
          ================================================== */}
          {soalMode === 'kisi-kisi' && (
            <>
              {/* PILIH KISI-KISI & GAYA PENULISAN AI (2 KOLOM) */}
              <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-4">

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222B3D] pb-3">
                  <div>
                    <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      2. Pilih Sumber Kisi-Kisi & Mode AI
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pilih kisi-kisi acuan naskah soal dan tentukan gaya penulisan AI yang diinginkan.
                    </p>
                  </div>

                  {selectedBlueprintId && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                      KISI-KISI TERHUBUNG
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                  {/* KOLOM KIRI: DAFTAR KISI-KISI TERSIMPAN (7 or 8 COLS) */}
                  <div className="lg:col-span-7 xl:col-span-8 space-y-2.5">
                    <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-200">
                        📚 Daftar Kisi-Kisi Tersimpan
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({savedBlueprints.length} kisi-kisi tersedia)
                      </span>
                    </div>

                    {savedBlueprints.length === 0 ? (
                      <div className="p-6 rounded-xl bg-[#090D16] border border-dashed border-[#334155] text-center">
                        <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="text-xs font-bold text-slate-300 mt-2">
                          Belum ada kisi-kisi tersimpan.
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Buat dan simpan kisi-kisi terlebih dahulu melalui Sub-Menu 1 (Penyusunan Kisi-Kisi).
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {savedBlueprints.map((bp) => {
                          const distribution =
                            getBlueprintDistribution(bp);

                          const isSelected =
                            selectedBlueprintId ===
                            bp.id;

                          return (
                            <div
                              key={bp.id}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-indigo-500/10 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                                  : 'bg-[#090D16] border-[#222B3D] hover:border-indigo-500/30'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isSelected && (
                                      <span className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-emerald-300" />
                                      </span>
                                    )}

                                    <span className="text-xs font-black text-white">
                                      {bp.subjectName}
                                    </span>

                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                                      Kelas {bp.className}
                                    </span>

                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/20 font-bold">
                                      {bp.examType}
                                    </span>
                                  </div>

                                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-400">
                                    <span className="font-semibold text-slate-300">
                                      {bp.items.length} butir
                                    </span>
                                    <span>•</span>
                                    <span>PG: {distribution.pgCount}</span>
                                    <span>•</span>
                                    <span>Isian: {distribution.isianCount}</span>
                                    {distribution.partCCount > 0 && (
                                      <>
                                        <span>•</span>
                                        <span>{distribution.partCType}: {distribution.partCCount}</span>
                                      </>
                                    )}
                                    <span>•</span>
                                    <span>{bp.schoolYear}</span>
                                  </div>
                                </div>

                                {/* AKSI KISI-KISI */}
                                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                                  {/* EDIT */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleEditBlueprint(
                                        bp
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all"
                                    title="Edit kisi-kisi"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </button>

                                  {/* HAPUS */}
                                  <button
                                    type="button"
                                    onClickCapture={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      handleDeleteBlueprint(
                                        bp
                                      );
                                    }}
                                    className="relative z-50 pointer-events-auto px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all"
                                    title="Hapus kisi-kisi"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Hapus
                                  </button>

                                  {/* TOGGLE HUBUNGKAN */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUseBlueprint(
                                        bp
                                      )
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                                    }`}
                                    title={
                                      isSelected
                                        ? 'Klik untuk melepaskan tautan kisi-kisi ini'
                                        : 'Hubungkan kisi-kisi ini sebagai acuan naskah soal'
                                    }
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    {isSelected
                                      ? '✓ Terhubung'
                                      : 'Hubungkan'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* KOLOM KANAN: GAYA PENULISAN SOAL AI & INFO TERHUBUNG (5 or 4 COLS) */}
                  <div className="lg:col-span-5 xl:col-span-4 p-4 rounded-xl bg-[#090D16] border border-[#222B3D] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5 text-indigo-300 font-extrabold">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          Gaya Penulisan Soal AI
                        </span>
                        <span className="text-[9px] text-slate-400">Pilih Mode</span>
                      </div>

                      <div className="space-y-2.5">
                        {/* Ringkas & Padat */}
                        <div
                          onClick={() => setOutputStyle('concise')}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            outputStyle === 'concise'
                              ? 'bg-indigo-500/15 border-indigo-500/60 ring-1 ring-indigo-500/30'
                              : 'bg-[#121622] border-[#222B3D] hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                              ⚡ Ringkas & Padat
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-semibold">
                                Default
                              </span>
                            </span>
                            <input
                              type="radio"
                              name="outputStyleKisiKisi"
                              checked={outputStyle === 'concise'}
                              onChange={() => setOutputStyle('concise')}
                              className="accent-indigo-500 cursor-pointer"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Batang soal to-the-point 10–20 kata, hemat ruang kertas cetak F4.
                          </p>
                        </div>

                        {/* Detail & Naratif */}
                        <div
                          onClick={() => setOutputStyle('detailed')}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            outputStyle === 'detailed'
                              ? 'bg-indigo-500/15 border-indigo-500/60 ring-1 ring-indigo-500/30'
                              : 'bg-[#121622] border-[#222B3D] hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                              📄 Detail & Naratif
                            </span>
                            <input
                              type="radio"
                              name="outputStyleKisiKisi"
                              checked={outputStyle === 'detailed'}
                              onChange={() => setOutputStyle('detailed')}
                              className="accent-indigo-500 cursor-pointer"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Dilengkapi stimulus teks literasi, cerita kontekstual, dan studi kasus analitis.
                          </p>
                        </div>
                      </div>

                      {/* STATUS KISI-KISI TERHUBUNG */}
                      {selectedBlueprintId &&
                        (() => {
                          const activeBp =
                            savedBlueprints.find(
                              (b) =>
                                b.id ===
                                selectedBlueprintId
                            ) || initialBlueprint;

                          if (!activeBp) return null;

                          const dist =
                            getBlueprintDistribution(
                              activeBp
                            );

                          return (
                            <div className="mt-3.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                              <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                Kisi-Kisi Terhubung & Siap
                              </div>
                              <div className="text-[11px] text-slate-200 mt-1 font-extrabold">
                                {activeBp.subjectName} • Kls {activeBp.className}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Total {activeBp.items.length} butir (PG: {dist.pgCount}, Isian: {dist.isianCount}
                                {dist.partCCount > 0
                                  ? `, ${dist.partCType}: ${dist.partCCount}`
                                  : ''}
                                , Opsi: {dist.pgOptions})
                              </div>
                            </div>
                          );
                        })()}
                    </div>

                    <div className="pt-2 border-t border-[#1E2638] text-[10px] text-slate-400">
                      💡 AI akan menyusun butir soal persis mengikuti capaian indikator kisi-kisi.
                    </div>
                  </div>

                </div>

              </div>

              {/* SUMBER MATERI TAMBAHAN */}
              <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F]">
                <EvaluationMaterialInput
                  materials={materials}
                  onChange={setMaterials}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">

                <button
                  type="button"
                  disabled={
                    isLoading ||
                    !selectedBlueprintId
                  }
                  onClick={
                    handleGenerateQuestions
                  }
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all"
                >

                  <Sparkles className="w-4 h-4 animate-spin-slow" />

                  <span>
                    {isLoading
                      ? 'Menyusun Naskah Soal AI...'
                      : 'Generate Naskah Soal dari Kisi-Kisi'}
                  </span>

                </button>

              </div>

            </>
          )}

        </div>
      )}

      {/* =====================================================
          STEP 2
      ====================================================== */}
      {currentStep === 2 &&
        activePackage && (
          <div className="space-y-6">

            <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#222B3D] flex flex-wrap items-center justify-between gap-3 text-xs">

              <div className="flex flex-wrap items-center gap-3">

                <span className="font-bold text-white">
                  Mata Pelajaran:
                  <b className="text-purple-400">
                    {' '}
                    {activePackage.subjectName}
                  </b>
                </span>

                <span className="text-slate-500">
                  |
                </span>

                <span className="text-slate-300">
                  Kelas:
                  <b>
                    {' '}
                    {activePackage.className}
                  </b>
                </span>

                <span className="text-slate-500">
                  |
                </span>

                <span className="text-slate-300">
                  Jenis:
                  <b>
                    {' '}
                    {activePackage.examType}
                  </b>
                </span>

                <span className="text-slate-500">
                  |
                </span>

                <span className="text-slate-300">
                  Total:
                  <b>
                    {' '}
                    {activePackage.questions.length}
                    {' '}
                    Soal
                  </b>
                </span>

              </div>

              <div className="text-[11px] text-slate-400 italic">
                * Tampilan Editor 2 Kolom Compact:
                Dilengkapi fitur upload gambar stimulus/diagram
                pada tiap butir soal.
              </div>

            </div>

            {/* BAGIAN I */}
            {pgQuestions.length > 0 && (
              <div className="space-y-3">

                <div className="px-4 py-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">

                  <span className="text-xs font-black text-indigo-300">
                    Bagian I. Pilihan Ganda
                    {' '}
                    (Nomor 1 s.d.
                    {' '}
                    {pgQuestions.length})
                  </span>

                  <span className="text-[10px] text-indigo-400 font-bold">
                    {pgQuestions.length}
                    {' '}
                    Butir
                  </span>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {pgQuestions.map(
                    (q) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-xl bg-[#0E131F] border border-[#242E42] space-y-3 hover:border-slate-600 transition-all flex flex-col justify-between"
                      >

                        <div className="space-y-3">

                          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#1E273A]">

                            <div className="flex items-center gap-2">

                              <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-black text-xs">
                                {q.number}
                              </span>

                              <span className="text-[11px] font-bold text-slate-300 px-2 py-0.5 rounded-md bg-slate-800">
                                PG
                              </span>

                              <span className="text-[11px] font-bold text-purple-300 px-2 py-0.5 rounded-md bg-purple-900/30 border border-purple-500/30">
                                Level:
                                {' '}
                                {q.cognitiveLevel}
                              </span>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteQuestion(
                                  q.id
                                )
                              }
                              className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer transition-all text-xs flex items-center gap-1"
                              title="Hapus Soal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>

                          <div>

                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              Teks Pertanyaan
                            </label>

                            <textarea
                              value={q.questionText}
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  q.id,
                                  'questionText',
                                  e.target.value
                                )
                              }
                              rows={2}
                              className="w-full bg-[#080C14] border border-[#222B3D] focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white outline-none resize-y"
                            />

                          </div>

                          <div className="space-y-1.5">

                            <div className="flex items-center justify-between">

                              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">

                                <Image className="w-3 h-3 text-cyan-400" />

                                <span>
                                  Gambar / Diagram Soal
                                  {' '}
                                  (Opsional)
                                </span>

                              </label>

                              {!q.questionImage && (
                                <label className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all">

                                  <Upload className="w-3 h-3" />

                                  <span>
                                    Upload Gambar
                                  </span>

                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (
                                        e.target.files?.[0]
                                      ) {
                                        handleQuestionImageUpload(
                                          q.id,
                                          e.target.files[0]
                                        );
                                      }
                                    }}
                                  />

                                </label>
                              )}

                            </div>

                            {q.questionImage && (
                              <div className="relative rounded-lg border border-slate-700 bg-slate-900/60 p-2 flex items-center gap-3">

                                <img
                                  src={
                                    q.questionImage
                                  }
                                  alt={`Stimulus Soal ${q.number}`}
                                  className="h-16 w-24 object-cover rounded border border-slate-700"
                                />

                                <div className="flex-1 text-[11px] text-slate-300">

                                  <span className="font-bold text-emerald-400 block">
                                    ✓ Gambar Terlampir
                                  </span>

                                  <span className="text-slate-400 text-[10px]">
                                    Akan dicantumkan pada
                                    naskah soal.
                                  </span>

                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveQuestionImage(
                                      q.id
                                    )
                                  }
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                                  title="Hapus Gambar"
                                >
                                  <X className="w-4 h-4" />
                                </button>

                              </div>
                            )}

                          </div>

                          {q.options && (
                            <div className="space-y-1.5">

                              <label className="block text-[10px] font-bold text-slate-400">
                                Pilihan Jawaban
                              </label>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                                {q.options.map(
                                  (opt) => (
                                    <div
                                      key={opt.key}
                                      className="flex items-center gap-2 bg-[#080C14] border border-[#222B3D] rounded-lg px-2.5 py-1.5"
                                    >

                                      <span
                                        className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                          q.answerKey ===
                                          opt.key
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-800 text-slate-300'
                                        }`}
                                      >
                                        {opt.key}
                                      </span>

                                      <input
                                        type="text"
                                        value={
                                          opt.text
                                        }
                                        onChange={(e) =>
                                          handleUpdateOption(
                                            q.id,
                                            opt.key,
                                            e.target.value
                                          )
                                        }
                                        className="w-full bg-transparent text-xs text-slate-200 outline-none"
                                      />

                                    </div>
                                  )
                                )}

                              </div>

                            </div>
                          )}

                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1E273A]">

                          <div>

                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              Kunci
                            </label>

                            <input
                              type="text"
                              value={
                                q.answerKey
                              }
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  q.id,
                                  'answerKey',
                                  e.target.value
                                )
                              }
                              className="w-full bg-[#080C14] border border-[#222B3D] rounded-lg px-2 py-1 text-xs text-emerald-400 font-bold outline-none"
                            />

                          </div>

                          <div className="sm:col-span-2">

                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              Pembahasan / Rubrik
                            </label>

                            <input
                              type="text"
                              value={
                                q.explanation ||
                                ''
                              }
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  q.id,
                                  'explanation',
                                  e.target.value
                                )
                              }
                              className="w-full bg-[#080C14] border border-[#222B3D] rounded-lg px-2 py-1 text-xs text-slate-300 outline-none"
                            />

                          </div>

                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

            {/* BAGIAN II */}
            {isianQuestions.length > 0 && (
              <div className="space-y-3">

                <div className="px-4 py-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">

                  <span className="text-xs font-black text-purple-300">
                    Bagian II. Isian Singkat
                    {' '}
                    (Nomor 1 s.d.
                    {' '}
                    {isianQuestions.length})
                  </span>

                  <span className="text-[10px] text-purple-400 font-bold">
                    {isianQuestions.length}
                    {' '}
                    Butir
                  </span>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {isianQuestions.map(
                    (q) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-xl bg-[#0E131F] border border-[#242E42] space-y-3 hover:border-slate-600 transition-all flex flex-col justify-between"
                      >

                        <div className="space-y-3">

                          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#1E273A]">

                            <div className="flex items-center gap-2">

                              <span className="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center font-black text-xs">
                                {q.number}
                              </span>

                              <span className="text-[11px] font-bold text-slate-300 px-2 py-0.5 rounded-md bg-slate-800">
                                Isian
                              </span>

                              <span className="text-[11px] font-bold text-purple-300 px-2 py-0.5 rounded-md bg-purple-900/30 border border-purple-500/30">
                                Level:
                                {' '}
                                {q.cognitiveLevel}
                              </span>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteQuestion(
                                  q.id
                                )
                              }
                              className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer transition-all text-xs flex items-center gap-1"
                              title="Hapus Soal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>

                          <div>

                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              Teks Pertanyaan Isian
                            </label>

                            <textarea
                              value={
                                q.questionText
                              }
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  q.id,
                                  'questionText',
                                  e.target.value
                                )
                              }
                              rows={2}
                              className="w-full bg-[#080C14] border border-[#222B3D] focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white outline-none resize-y"
                            />

                          </div>

                          <div className="space-y-1.5">

                            <div className="flex items-center justify-between">

                              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">

                                <Image className="w-3 h-3 text-cyan-400" />

                                <span>
                                  Gambar / Diagram Soal
                                  {' '}
                                  (Opsional)
                                </span>

                              </label>

                              {!q.questionImage && (
                                <label className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all">

                                  <Upload className="w-3 h-3" />

                                  <span>
                                    Upload Gambar
                                  </span>

                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (
                                        e.target.files?.[0]
                                      ) {
                                        handleQuestionImageUpload(
                                          q.id,
                                          e.target.files[0]
                                        );
                                      }
                                    }}
                                  />

                                </label>
                              )}

                            </div>

                            {q.questionImage && (
                              <div className="relative rounded-lg border border-slate-700 bg-slate-900/60 p-2 flex items-center gap-3">

                                <img
                                  src={
                                    q.questionImage
                                  }
                                  alt={`Stimulus Soal ${q.number}`}
                                  className="h-16 w-24 object-cover rounded border border-slate-700"
                                />

                                <div className="flex-1 text-[11px] text-slate-300">

                                  <span className="font-bold text-emerald-400 block">
                                    ✓ Gambar Terlampir
                                  </span>

                                  <span className="text-slate-400 text-[10px]">
                                    Akan dicantumkan pada
                                    naskah soal.
                                  </span>

                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveQuestionImage(
                                      q.id
                                    )
                                  }
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                                  title="Hapus Gambar"
                                >
                                  <X className="w-4 h-4" />
                                </button>

                              </div>
                            )}

                          </div>

                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1E273A]">

                          <div>

                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              Kunci Jawaban
                            </label>

                            <input
                              type="text"
                              value={
                                q.answerKey
                              }
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  q.id,
                                  'answerKey',
                                  e.target.value
                                )
                              }
                              className="w-full bg-[#080C14] border border-[#222B3D] rounded-lg px-2 py-1 text-xs text-emerald-400 font-bold outline-none"
                            />

                          </div>

                          <div className="sm:col-span-2">

                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              Pembahasan / Rubrik
                            </label>

                            <input
                              type="text"
                              value={
                                q.explanation ||
                                ''
                              }
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  q.id,
                                  'explanation',
                                  e.target.value
                                )
                              }
                              className="w-full bg-[#080C14] border border-[#222B3D] rounded-lg px-2 py-1 text-xs text-slate-300 outline-none"
                            />

                          </div>

                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

            {/* BAGIAN III */}
            {partCQuestions.length > 0 && (
              <div className="space-y-3">

                <div className="px-4 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">

                  <span className="text-xs font-black text-amber-300">
                    Bagian III. Menjodohkan / Uraian
                    {' '}
                    (Nomor 1 s.d.
                    {' '}
                    {partCQuestions.length})
                  </span>

                  <span className="text-[10px] text-amber-400 font-bold">
                    {partCQuestions.length}
                    {' '}
                    Butir
                  </span>

                </div>

                <div className="space-y-4">

                  {partCQuestions.map(
                    (q) => (
                      <div
                        key={q.id}
                        className="p-5 rounded-2xl bg-[#0E131F] border border-[#242E42] space-y-3.5 hover:border-slate-600 transition-all"
                      >

                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#1E273A]">

                          <div className="flex items-center gap-2">

                            <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-300 border border-amber-500/40 flex items-center justify-center font-black text-xs">
                              {q.number}
                            </span>

                            <span className="text-xs font-bold text-slate-300 px-2 py-0.5 rounded-md bg-slate-800">
                              {q.type}
                            </span>

                            <span className="text-xs font-bold text-purple-300 px-2 py-0.5 rounded-md bg-purple-900/30 border border-purple-500/30">
                              Level:
                              {' '}
                              {q.cognitiveLevel}
                            </span>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteQuestion(
                                q.id
                              )
                            }
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer transition-all text-xs flex items-center gap-1"
                            title="Hapus Soal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>

                        </div>

                        <div>

                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Teks Petunjuk / Pertanyaan
                          </label>

                          <textarea
                            value={
                              q.questionText
                            }
                            onChange={(e) =>
                              handleUpdateQuestion(
                                q.id,
                                'questionText',
                                e.target.value
                              )
                            }
                            rows={2}
                            className="w-full bg-[#080C14] border border-[#222B3D] focus:border-indigo-500 rounded-xl p-3 text-xs text-white outline-none resize-y"
                          />

                        </div>

                        <div className="space-y-1.5">

                          <div className="flex items-center justify-between">

                            <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">

                              <Image className="w-3 h-3 text-cyan-400" />

                              <span>
                                Gambar / Diagram Pendukung
                                {' '}
                                (Opsional)
                              </span>

                            </label>

                            {!q.questionImage && (
                              <label className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all">

                                <Upload className="w-3 h-3" />

                                <span>
                                  Upload Gambar
                                </span>

                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (
                                      e.target.files?.[0]
                                    ) {
                                      handleQuestionImageUpload(
                                        q.id,
                                        e.target.files[0]
                                      );
                                    }
                                  }}
                                />

                              </label>
                            )}

                          </div>

                          {q.questionImage && (
                            <div className="relative rounded-lg border border-slate-700 bg-slate-900/60 p-2 flex items-center gap-3">

                              <img
                                src={
                                  q.questionImage
                                }
                                alt={`Stimulus Soal ${q.number}`}
                                className="h-16 w-24 object-cover rounded border border-slate-700"
                              />

                              <div className="flex-1 text-[11px] text-slate-300">

                                <span className="font-bold text-emerald-400 block">
                                  ✓ Gambar Terlampir
                                </span>

                                <span className="text-slate-400 text-[10px]">
                                  Akan dicantumkan pada
                                  naskah soal.
                                </span>

                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveQuestionImage(
                                    q.id
                                  )
                                }
                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                                title="Hapus Gambar"
                              >
                                <X className="w-4 h-4" />
                              </button>

                            </div>
                          )}

                        </div>

                        {q.type ===
                          'MENJODOHKAN' &&
                          q.matchingData && (
                            <div className="p-4 rounded-xl bg-[#080C14] border border-[#222B3D] space-y-3">

                              <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                                <span>
                                  Format 2 Kolom Menjodohkan
                                  {' '}
                                  ({q.matchingData.mode})
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <div className="space-y-2 bg-[#0E1422] p-3 rounded-lg border border-slate-800">

                                  <span className="text-[11px] font-black text-cyan-300">
                                    KOLOM A
                                    {' '}
                                    (Pernyataan / Stimulus)
                                  </span>

                                  {q.matchingData.left.map(
                                    (l) => (
                                      <div
                                        key={l.id}
                                        className="p-2 rounded bg-slate-900 border border-slate-700 text-xs text-white flex items-center gap-2"
                                      >
                                        <span className="font-bold text-cyan-400">
                                          {l.id}.
                                        </span>

                                        <span>
                                          {l.text ||
                                            '[Gambar Stimulus]'}
                                        </span>
                                      </div>
                                    )
                                  )}

                                </div>

                                <div className="space-y-2 bg-[#0E1422] p-3 rounded-lg border border-slate-800">

                                  <span className="text-[11px] font-black text-amber-300">
                                    KOLOM B
                                    {' '}
                                    (Pilihan Pasangan)
                                  </span>

                                  {q.matchingData.right.map(
                                    (r) => (
                                      <div
                                        key={r.id}
                                        className="p-2 rounded bg-slate-900 border border-slate-700 text-xs text-white flex items-center gap-2"
                                      >

                                        <span className="font-bold text-amber-400">
                                          {r.id}.
                                        </span>

                                        <span>
                                          {r.text ||
                                            '[Gambar Pasangan]'}
                                        </span>

                                      </div>
                                    )
                                  )}

                                </div>

                              </div>

                            </div>
                          )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">

                          <div>

                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              Kunci Jawaban
                            </label>

                            <input
                              type="text"
                              value={
                                q.answerKey
                              }
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  q.id,
                                  'answerKey',
                                  e.target.value
                                )
                              }
                              className="w-full bg-[#080C14] border border-[#222B3D] rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold outline-none"
                            />

                          </div>

                          <div className="sm:col-span-2">

                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              Pembahasan / Rubrik
                            </label>

                            <input
                              type="text"
                              value={
                                q.explanation ||
                                ''
                              }
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  q.id,
                                  'explanation',
                                  e.target.value
                                )
                              }
                              className="w-full bg-[#080C14] border border-[#222B3D] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
                            />

                          </div>

                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

          </div>
        )}

    </div>
  );
};