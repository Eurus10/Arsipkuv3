import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  FileQuestion,
  Eye,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  EvaluationQuestionPackage,
  EvaluationQuestion,
  QuestionForm,
} from '../../types/evaluationTypes';
import { saveQuestionPackage } from '../../services/evaluation/evaluationStorageService';

interface EvaluationQuestionEditorViewProps {
  questionPackage: EvaluationQuestionPackage;
  onBack: () => void;
  onSaveSuccess?: (updatedPackage: EvaluationQuestionPackage) => void;
}

/**
 * Mendeteksi apakah teks soal mengindikasikan kebutuhan gambar visual
 */
export function checkIfQuestionNeedsImage(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const keywords = [
    'gambar',
    'ilustrasi',
    'foto',
    'diagram',
    'grafik',
    'tabel',
    'peta',
    'simbol',
    'rambu',
    'denah',
    'berikut ini',
    'pada gambar',
    'perhatikan gambar',
    'gambar di samping',
    'gambar di bawah',
    'gambar di atas',
    'organ di samping',
    'organ berikut',
    'bentuk di samping',
    'lambang di samping',
  ];
  return keywords.some((kw) => lower.includes(kw));
}

export const EvaluationQuestionEditorView: React.FC<EvaluationQuestionEditorViewProps> = ({
  questionPackage,
  onBack,
  onSaveSuccess,
}) => {
  const [pkg, setPkg] = useState<EvaluationQuestionPackage>(() =>
    JSON.parse(JSON.stringify(questionPackage))
  );
  const [activeTab, setActiveTab] = useState<'all' | 'needs-image' | 'PG' | 'Isian' | 'Uraian'>('all');
  const [isSaved, setIsSaved] = useState(false);
  const [urlInputMap, setUrlInputMap] = useState<Record<string, string>>({});
  const [questionToDeleteId, setQuestionToDeleteId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Hitung jumlah soal yang butuh gambar
  const totalNeedsImage = pkg.questions.filter(
    (q) => checkIfQuestionNeedsImage(q.questionText) || !!q.questionImage
  ).length;

  const handleUpdateQuestion = (
    questionId: string,
    field: keyof EvaluationQuestion,
    value: any
  ) => {
    setPkg((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId) {
          return { ...q, [field]: value };
        }
        return q;
      }),
    }));
    setIsSaved(false);
  };

  const handleUpdateOption = (
    questionId: string,
    optKey: string,
    optText: string
  ) => {
    setPkg((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId && q.options) {
          return {
            ...q,
            options: q.options.map((opt) =>
              opt.key === optKey ? { ...opt, text: optText } : opt
            ),
          };
        }
        return q;
      }),
    }));
    setIsSaved(false);
  };

  // Upload file gambar lokal
  const handleUploadImageFile = (
    questionId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        handleUpdateQuestion(questionId, 'questionImage', base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Set gambar dari Link URL
  const handleApplyImageUrl = (questionId: string) => {
    const url = urlInputMap[questionId]?.trim();
    if (!url) return;

    // Simpan url langsung
    handleUpdateQuestion(questionId, 'questionImage', url);
  };

  // Hapus gambar
  const handleRemoveImage = (questionId: string) => {
    handleUpdateQuestion(questionId, 'questionImage', undefined);
    setUrlInputMap((prev) => ({ ...prev, [questionId]: '' }));
  };

  // Tambah butir soal baru
  const handleAddQuestion = (type: QuestionForm = 'PG') => {
    const newId = `q_custom_${Date.now()}`;
    const nextNumber = pkg.questions.length + 1;
    const isPG = type === 'PG';

    const newQuestion: EvaluationQuestion = {
      id: newId,
      number: nextNumber,
      globalNumber: nextNumber,
      section: isPG ? 'A' : type === 'ISIAN' ? 'B' : 'C',
      sectionTitle: isPG
        ? 'Bagian I. Pilihan Ganda'
        : type === 'ISIAN'
        ? 'Bagian II. Isian Singkat'
        : 'Bagian III. Uraian',
      type: type,
      material: 'Materi Pokok',
      indicator: 'Indikator Capaian',
      cognitiveLevel: 'C2',
      questionText: 'Tuliskan teks butir soal di sini...',
      answerKey: isPG ? 'A' : 'Kunci jawaban',
      explanation: 'Penjelasan pembahasan soal.',
      options: isPG
        ? [
            { key: 'A', text: 'Pilihan A' },
            { key: 'B', text: 'Pilihan B' },
            { key: 'C', text: 'Pilihan C' },
            { key: 'D', text: 'Pilihan D' },
          ]
        : undefined,
    };

    setPkg((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
    setIsSaved(false);
  };

  // Trigger modal konfirmasi hapus butir soal tertentu
  const handleDeleteQuestion = (questionId: string) => {
    setQuestionToDeleteId(questionId);
  };

  const confirmDeleteQuestion = () => {
    if (!questionToDeleteId) return;
    const targetId = questionToDeleteId;

    setPkg((prev) => {
      const filtered = prev.questions.filter((q) => q.id !== targetId);
      // Re-numbering
      const renumbered = filtered.map((q, idx) => ({
        ...q,
        number: idx + 1,
        globalNumber: idx + 1,
      }));
      return {
        ...prev,
        questions: renumbered,
      };
    });
    setIsSaved(false);
    setQuestionToDeleteId(null);
  };

  // Simpan perubahan ke storage
  const handleSave = () => {
    const updatedPkg: EvaluationQuestionPackage = {
      ...pkg,
      updatedAt: new Date().toISOString(),
    };
    saveQuestionPackage(updatedPkg);
    setIsSaved(true);
    if (onSaveSuccess) {
      onSaveSuccess(updatedPkg);
    }
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  // Filter daftar soal berdasarkan tab
  const filteredQuestions = pkg.questions.filter((q) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'needs-image') {
      return checkIfQuestionNeedsImage(q.questionText) || !!q.questionImage;
    }
    return q.type === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0F1420] border border-[#222B3D]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Kembali ke Daftar Soal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Mode Editor Soal
              </span>
              <h2 className="text-base font-black text-white">
                {pkg.subjectName} • Kelas {pkg.className}
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              {pkg.examType} ({pkg.questions.length} Butir Soal) • Ubah teks, pilihan jawaban, dan sisipkan media gambar stimulus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              Tersimpan!
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-600/30"
          >
            <Save className="w-4 h-4" />
            Simpan Perubahan
          </button>
        </div>
      </div>

      {/* Filter Tabs & Tombol Tambah Soal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090D16] border border-[#1E2638]">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({pkg.questions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('needs-image')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'needs-image'
                ? 'bg-amber-500 text-black font-black'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Perlu Gambar ({totalNeedsImage})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PG')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PG'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pilihan Ganda
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Isian')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'Isian'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Isian Singkat
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Uraian')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'Uraian'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Uraian
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddQuestion('PG')}
            className="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            + Tambah PG
          </button>
          <button
            type="button"
            onClick={() => handleAddQuestion('ISIAN')}
            className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            + Tambah Isian
          </button>
          <button
            type="button"
            onClick={() => handleAddQuestion('URAIAN')}
            className="px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            + Tambah Uraian
          </button>
        </div>
      </div>

      {/* DAFTAR BUTIR SOAL EDITOR */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const needsImage = checkIfQuestionNeedsImage(q.questionText) || !!q.questionImage;
          const hasImage = !!q.questionImage;

          return (
            <div
              key={q.id}
              className={`p-5 rounded-2xl transition-all border ${
                needsImage
                  ? 'bg-[#14120C] border-amber-500/40 shadow-md shadow-amber-500/5'
                  : 'bg-[#111724] border-[#222B3D]'
              }`}
            >
              {/* Header Kartu Butir Soal */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center ${
                      needsImage
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {q.number}
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    {q.type === 'PG'
                      ? 'Pilihan Ganda'
                      : q.type === 'ISIAN'
                      ? 'Isian Singkat'
                      : 'Uraian / Menjodohkan'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    Tingkat: {q.cognitiveLevel || 'C2'}
                  </span>

                  {/* BADGE KHUSUS PERLU GAMBAR */}
                  {needsImage && (
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                      <ImageIcon className="w-3.5 h-3.5" />
                      {hasImage ? 'GAMBAR TERPASANG' : 'PERLU SISIPAN GAMBAR'}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center transition-all cursor-pointer"
                  title="Hapus butir soal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Form Teks Soal */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Teks Batang Soal:
                  </label>
                  <textarea
                    rows={3}
                    value={q.questionText}
                    onChange={(e) =>
                      handleUpdateQuestion(q.id, 'questionText', e.target.value)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D16] border border-slate-700/80 focus:border-indigo-500 text-xs text-slate-100 outline-none leading-relaxed"
                    placeholder="Tuliskan butir soal..."
                  />
                </div>

                {/* ========================================================
                    SLOT SISIP GAMBAR (UPLOAD ATAU LINK URL)
                ======================================================== */}
                <div
                  className={`p-4 rounded-xl border ${
                    needsImage && !hasImage
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-[#090D16] border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>Media Gambar Stimulus Soal</span>
                    </div>

                    {hasImage && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(q.id)}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Hapus Gambar ✕
                      </button>
                    )}
                  </div>

                  {/* Jika Sudah Ada Gambar */}
                  {hasImage ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                      <div className="relative group max-w-[200px] max-h-[140px] rounded-xl overflow-hidden border border-slate-700 bg-black/40">
                        <img
                          src={q.questionImage}
                          alt="Stimulus Soal"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 flex-1">
                        <p className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Gambar aktif & siap disematkan ke naskah Word (.docx).
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Format URL atau Base64 lokal terbaca dengan benar.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Jika Belum Ada Gambar: 2 Pilihan (Tempel Link URL atau Upload File) */
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Pilihan 1: Tempel Link URL */}
                        <div className="p-3 rounded-lg bg-black/30 border border-slate-800 space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                            <LinkIcon className="w-3.5 h-3.5" />
                            <span>1. Tempel Link Gambar (URL)</span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={urlInputMap[q.id] || ''}
                              onChange={(e) =>
                                setUrlInputMap((prev) => ({
                                  ...prev,
                                  [q.id]: e.target.value,
                                }))
                              }
                              placeholder="https://.../gambar.jpg"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C101A] border border-slate-700 text-xs text-slate-200 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyImageUrl(q.id)}
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0 transition-all"
                            >
                              Pasang
                            </button>
                          </div>
                        </div>

                        {/* Pilihan 2: Upload File Lokal */}
                        <div className="p-3 rounded-lg bg-black/30 border border-slate-800 space-y-2 flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                            <Upload className="w-3.5 h-3.5" />
                            <span>2. Upload File Komputer / HP</span>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[q.id]?.click()}
                              className="w-full py-1.5 px-3 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Pilih Berkas Gambar
                            </button>
                            <input
                              type="file"
                              ref={(el) => {
                                fileInputRefs.current[q.id] = el;
                              }}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleUploadImageFile(q.id, e)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ========================================================
                    OPSI PILIHAN GANDA (JIKA TIPE PG)
                ======================================================== */}
                {q.type === 'PG' && q.options && (
                  <div className="space-y-2 pt-2">
                    <label className="block text-[11px] font-bold text-slate-400">
                      Pilihan Jawaban (A, B, C, D):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt) => (
                        <div
                          key={opt.key}
                          className="flex items-center gap-2 p-2 rounded-xl bg-[#090D16] border border-slate-800"
                        >
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                              q.answerKey === opt.key
                                ? 'bg-emerald-500 text-black'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) =>
                              handleUpdateOption(q.id, opt.key, e.target.value)
                            }
                            className="w-full bg-transparent text-xs text-slate-200 outline-none"
                            placeholder={`Pilihan ${opt.key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kunci Jawaban & Pembahasan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Kunci Jawaban:
                    </label>
                    <input
                      type="text"
                      value={q.answerKey}
                      onChange={(e) =>
                        handleUpdateQuestion(q.id, 'answerKey', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-xs text-emerald-400 font-bold outline-none"
                      placeholder="e.g. A atau teks kunci"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Pembahasan Singkat:
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) =>
                        handleUpdateQuestion(q.id, 'explanation', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-xs text-slate-300 outline-none"
                      placeholder="Penjelasan..."
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL KONFIRMASI HAPUS BUTIR SOAL */}
      {questionToDeleteId && (
        <div className="fixed inset-0 z-[999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Hapus Butir Soal ini?</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Soal akan dihapus dari daftar naskah.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuestionToDeleteId(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteQuestion}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Soal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
