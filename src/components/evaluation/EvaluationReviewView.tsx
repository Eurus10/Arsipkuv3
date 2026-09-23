import React, { useState, useRef } from 'react';
import {
  Brain,
  Upload,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ListOrdered,
  RotateCcw,
  Target,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Info,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { EvaluationReviewResult, EvaluationQuestionPackage } from '../../types/evaluationTypes';
import { generateReviewWithAi } from '../../services/evaluation/evaluationAiService';
import { saveReviewResult, getStoredReviews, getStoredQuestionPackages, deleteReviewResult } from '../../services/evaluation/evaluationStorageService';
import { SAMPLE_PAI_REVIEW_RESULT } from '../../data/sampleEvaluationDoc';
import { extractAnalysisSummaryFromWorkbook, ExtractedAnalysisSummary } from '../../services/evaluation/evaluationAnalysisExtractor';
import { exportReviewResultToWord, exportReviewResultToExcel } from '../../services/evaluation/evaluationReviewExportService';

export const EvaluationReviewView: React.FC = () => {
  // Input Files State
  const [examFile, setExamFile] = useState<{ name: string; text: string } | null>(null);
  const [analysisFile, setAnalysisFile] = useState<{
    name: string;
    summary: ExtractedAnalysisSummary;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [reviewResult, setReviewResult] = useState<EvaluationReviewResult | null>(null);
  const [savedReviews, setSavedReviews] = useState<EvaluationReviewResult[]>(() => getStoredReviews());

  const examInputRef = useRef<HTMLInputElement>(null);
  const analysisInputRef = useRef<HTMLInputElement>(null);

  // Helper ekstraksi teks dari file (.docx XML, .txt, atau biner)
  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase();

    // 1. File teks polos (.txt)
    if (fileName.endsWith('.txt')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.readAsText(file);
      });
    }

    // 2. File Word (.docx / .doc) & format biner lainnya menggunakan mammoth
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) return resolve(`Dokumen Soal: ${file.name}`);

          // Coba ekstraksi mammoth (true unzip parser) untuk file docx
          if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            try {
              const res = await mammoth.extractRawText({ arrayBuffer: buffer });
              if (res && res.value && res.value.trim().length > 10) {
                resolve(res.value.trim());
                return;
              }
            } catch (mammothErr) {
              console.warn('Mammoth parser error, using XML fallback:', mammothErr);
            }
          }

          // Fallback parsing XML jika mammoth gagal
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const rawContent = decoder.decode(new Uint8Array(buffer));

          // Extract XML paragraphs inside <w:p> tags from Word document
          const pRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
          const paragraphs: string[] = [];
          let pMatch;
          while ((pMatch = pRegex.exec(rawContent)) !== null) {
            const pInner = pMatch[1];
            const wtRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
            let tMatch;
            const tTexts: string[] = [];
            while ((tMatch = wtRegex.exec(pInner)) !== null) {
              if (tMatch[1]) tTexts.push(tMatch[1]);
            }
            const pText = tTexts.join('').trim();
            if (pText) paragraphs.push(pText);
          }

          if (paragraphs.length > 0) {
            resolve(paragraphs.join('\n'));
            return;
          }

          // Fallback: extract XML text inside <w:t> tags
          const wtRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
          const extractedTexts: string[] = [];
          let match;
          while ((match = wtRegex.exec(rawContent)) !== null) {
            if (match[1] && match[1].trim()) {
              extractedTexts.push(match[1].trim());
            }
          }

          if (extractedTexts.length > 0) {
            resolve(extractedTexts.join('\n'));
            return;
          }

          // Fallback: bersihkan karakter biner kontrol
          const cleanText = rawContent
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (cleanText.length > 30) {
            resolve(cleanText);
          } else {
            resolve(`Naskah Soal Ujian: ${file.name}`);
          }
        } catch (err) {
          console.error('Error parsing docx file:', err);
          resolve(`Naskah Soal Ujian: ${file.name}`);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Upload Soal Handler
  const handleUploadExam = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extractedText = await extractTextFromFile(file);
    setExamFile({
      name: file.name,
      text: extractedText,
    });
  };

  // Handler memilih Naskah Soal dari Bank Soal Internal
  const handleSelectPackageFromBank = (pkg: EvaluationQuestionPackage) => {
    const formattedText = `NASKAH SOAL EVALUASI
Judul: ${pkg.title || 'Naskah Soal'}
Mata Pelajaran: ${pkg.subjectName} | Kelas: ${pkg.className} | Ujian: ${pkg.examType}

BUTIR-BUTIR SOAL:
${(pkg.questions || []).map((q) => `Soal No. ${q.number} (${q.type}): ${q.questionText || q.material}
${q.options ? `Pilihan: ${q.options.map((o) => `${o.key}. ${o.text}`).join(' | ')}` : ''}
Indikator: ${q.indicator || '-'}
Materi: ${q.material || '-'}`).join('\n\n')}`;

    setExamFile({
      name: `[Bank Soal Internal] ${pkg.title || 'Naskah Soal'} (${pkg.subjectName} Kls ${pkg.className})`,
      text: formattedText,
    });

    if (analysisFile) {
      setAnalysisFile({
        ...analysisFile,
        summary: {
          ...analysisFile.summary,
          subjectName: pkg.subjectName || analysisFile.summary.subjectName,
          className: pkg.className || analysisFile.summary.className,
          examType: pkg.examType || analysisFile.summary.examType,
        },
      });
    }
  };

  // Upload Hasil Analisis Excel Handler dengan ekstraksi metadata & statistik otomatis
  const handleUploadAnalysisExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      try {
        const data = new Uint8Array(loadEvt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const summary = extractAnalysisSummaryFromWorkbook(wb, file.name);

        setAnalysisFile({
          name: file.name,
          summary,
        });
      } catch (err) {
        console.error('Failed to parse analysis excel file:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRunReview = async () => {
    if (!analysisFile) return;
    setIsLoading(true);
    try {
      const result = await generateReviewWithAi({
        subjectName: analysisFile.summary.subjectName,
        className: analysisFile.summary.className,
        examType: analysisFile.summary.examType,
        examQuestionsText: examFile?.text || 'Naskah soal ujian telah diunggah.',
        analysisDataSummary: analysisFile.summary,
      });

      setReviewResult(result);
      saveReviewResult(result);
      setSavedReviews(getStoredReviews());
    } catch (err) {
      console.error('Failed to run evaluation review:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportWord = async () => {
    if (!reviewResult || isExportingWord) return;
    try {
      setIsExportingWord(true);
      await exportReviewResultToWord(reviewResult);
    } catch (err) {
      console.error('Failed to export review to Word:', err);
      alert('Gagal mengekspor laporan ke format Word. Pastikan data lengkap.');
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleExportExcel = () => {
    if (!reviewResult || isExportingExcel) return;
    try {
      setIsExportingExcel(true);
      exportReviewResultToExcel(reviewResult);
    } catch (err) {
      console.error('Failed to export review to Excel:', err);
      alert('Gagal mengekspor laporan ke format Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0C151B] via-[#101F25] to-[#151D2A] border border-emerald-500/25 shadow-xl shadow-black/20">
        <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center flex-wrap gap-2.5 mb-2">
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Sub Menu 3
            </span>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                AI Review & Interpretasi Pedagogis Hasil Ujian
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Membaca file <strong className="text-slate-200">Naskah Soal</strong> + <strong className="text-slate-200">File Hasil Analisis Excel</strong> secara otomatis untuk menghasilkan diagnosa butir soal, pemetaan materi yang perlu diperkuat, dan rekomendasi tindak lanjut guru.
          </p>
        </div>

        {reviewResult && (
          <div className="relative flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportWord}
              disabled={isExportingWord}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-600/30"
              title="Unduh Laporan Format Word"
            >
              <FileText className="w-3.5 h-3.5" />
              {isExportingWord ? 'Mengekspor...' : 'Unduh Word (.docx)'}
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-teal-600/30"
              title="Unduh Laporan Format Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {isExportingExcel ? 'Mengekspor...' : 'Unduh Excel (.xlsx)'}
            </button>

            <button
              type="button"
              onClick={() => setReviewResult(null)}
              className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700/80 transition-all shrink-0"
              title="Analisis file lain"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Analisis Lain
            </button>
          </div>
        )}
      </div>

      {/* FORM INPUT UPLOAD JIKA BELUM ADA REVIEW */}
      {!reviewResult && (
        <div className="space-y-5">
          {/* 2 Sumber Upload: FILE 1 (Soal) + FILE 2 (Hasil Analisis) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FILE 1: Naskah Soal */}
            <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-black flex items-center justify-center">
                    1
                  </span>
                  <h4 className="text-xs font-black text-white">Naskah Soal Ujian (Word / Bank Soal)</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pilih Naskah Soal yang tersimpan di aplikasi atau unggah dokumen Word (.docx) / Teks (.txt) untuk analisis stimulus materi.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                {examFile ? (
                  <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold truncate">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">{examFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExamFile(null)}
                        className="text-[11px] text-rose-400 hover:underline ml-2 shrink-0 cursor-pointer font-medium"
                      >
                        Ganti
                      </button>
                    </div>

                    {(() => {
                      const parCount = (examFile.text || '').split(/\n+/).filter((p) => p.trim().length > 0).length;
                      const hasText = examFile.text && examFile.text.length > 50 && !examFile.text.startsWith('Dokumen Soal:');
                      return (
                        <div className={`text-[10px] font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                          hasText
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-950/50 text-amber-300 border-amber-500/30'
                        }`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${hasText ? 'text-emerald-400' : 'text-amber-400'}`} />
                          <span>
                            {hasText
                              ? `Naskah Berhasil Dibaca: Terdeteksi ${parCount} Paragraf Teks Soal (${examFile.text.length} Karakter)`
                              : `Naskah Memerlukan Format .docx Utuh (${examFile.text.slice(0, 30)}...)`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Opsi 1: Bank Soal Internal */}
                    {getStoredQuestionPackages().length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
                          Atau Pilih dari Bank Naskah Internal:
                        </label>
                        <select
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            if (!selectedId) return;
                            const pkgs = getStoredQuestionPackages();
                            const found = pkgs.find((p) => p.id === selectedId);
                            if (found) handleSelectPackageFromBank(found);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-[#090D16] border border-cyan-500/40 text-cyan-200 text-xs font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>-- Pilih Naskah Soal Tersimpan --</option>
                          {getStoredQuestionPackages().map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.title || 'Naskah Soal'} ({pkg.subjectName} - Kelas {pkg.className})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Opsi 2: Upload File Word (.docx / .txt) */}
                    <button
                      type="button"
                      onClick={() => examInputRef.current?.click()}
                      className="w-full py-3 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20 text-cyan-300 text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-1.5">
                        <Upload className="w-4 h-4" />
                        <span>Unggah Berkas Word (.docx / .txt)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Dukungan otomatis pembaca XML Word & pembersihan data
                      </span>
                    </button>
                  </div>
                )}
                <input
                  ref={examInputRef}
                  type="file"
                  accept=".txt,.doc,.docx,.pdf"
                  className="hidden"
                  onChange={handleUploadExam}
                />
              </div>
            </div>

            {/* FILE 2: Hasil Analisis Excel */}
            <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black flex items-center justify-center">
                    2
                  </span>
                  <h4 className="text-xs font-black text-white">Upload Hasil Analisis (Excel)</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Unggah file Excel hasil analisis evaluasi pembelajaran SDIT Al Fikri. Mata pelajaran, kelas, dan statistik nilai akan terbaca otomatis.
                </p>
              </div>

              <div className="pt-2">
                {analysisFile ? (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold truncate">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">{analysisFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnalysisFile(null)}
                      className="text-[11px] text-rose-400 hover:underline ml-2 shrink-0 cursor-pointer"
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => analysisInputRef.current?.click()}
                    className="w-full py-4 rounded-xl border border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 text-emerald-300 text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih Berkas Excel Analisis</span>
                  </button>
                )}
                <input
                  ref={analysisInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleUploadAnalysisExcel}
                />
              </div>
            </div>
          </div>

          {/* PREVIEW & VERIFIKASI IDENTITAS TERDETEKSI */}
          {analysisFile && (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Verifikasi Identitas Berkas Analisis</h4>
                    <p className="text-[11px] text-slate-400">Sesuaikan Mata Pelajaran & Kelas di bawah ini jika terdeteksi berbeda.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={analysisFile.summary.subjectName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnalysisFile({
                        ...analysisFile,
                        summary: { ...analysisFile.summary, subjectName: val }
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#090D16] border border-emerald-500/40 text-emerald-200 text-xs font-bold focus:outline-none focus:border-emerald-400"
                    placeholder="contoh: Pendidikan Pancasila / PKn"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">Kelas</label>
                  <input
                    type="text"
                    value={analysisFile.summary.className}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnalysisFile({
                        ...analysisFile,
                        summary: { ...analysisFile.summary, className: val }
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#090D16] border border-emerald-500/40 text-emerald-200 text-xs font-bold focus:outline-none focus:border-emerald-400"
                    placeholder="contoh: 5B"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">Jenis Ujian</label>
                  <input
                    type="text"
                    value={analysisFile.summary.examType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnalysisFile({
                        ...analysisFile,
                        summary: { ...analysisFile.summary, examType: val }
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#090D16] border border-emerald-500/40 text-emerald-200 text-xs font-bold focus:outline-none focus:border-emerald-400"
                    placeholder="contoh: SAS 1 (Sumatif Akhir Semester)"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-emerald-500/15 flex flex-wrap items-center justify-between gap-2">
                <span>Terdeteksi: <b className="text-emerald-300">{analysisFile.summary.totalStudents}</b> Siswa • Rata-rata: <b className="text-emerald-300">{analysisFile.summary.averageScore}</b> • Ketuntasan: <b className="text-emerald-300">{analysisFile.summary.passPercentage}%</b></span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Isolasi Berkas Aktif (Pemrosesan Berkas Terkini)
                </span>
              </div>
            </div>
          )}

          {/* Action Review Button & Sample Preload */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setExamFile({
                  name: '1 - Pend Agama Islam.doc (STS 1 PAI Kelas 2A)',
                  text: 'Surah Al-Ikhlas, Surah Al-Falaq, Asmaul Husna (Al-Hafiz, Al-Wali, Al-Alim, Al-Khabir)',
                });
                setAnalysisFile({
                  name: 'Analisis_STS1_PAI_2A_AlFikri.xlsx',
                  summary: {
                    subjectName: 'Pendidikan Agama Islam & BP',
                    className: '2A',
                    examType: 'STS 1 (Sumatif Tengah Semester Ganjil)',
                    totalStudents: 28,
                    averageScore: 84.6,
                    highestScore: 100,
                    lowestScore: 62,
                    passPercentage: 89.3,
                    questionStats: [],
                  },
                });
                setReviewResult(SAMPLE_PAI_REVIEW_RESULT);
              }}
              className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Muat Contoh Diagnosa PAI (STS 1 Kelas 2A)</span>
            </button>

            <button
              type="button"
              disabled={!analysisFile || isLoading}
              onClick={handleRunReview}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all ml-auto"
            >
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>{isLoading ? 'AI Sedang Menganalisis & Mendiagnosa...' : 'Review & Interpretasi Hasil Ujian AI'}</span>
            </button>
          </div>

          {/* Riwayat Hasil Review */}
          {savedReviews.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#0B0F19] border border-[#1E2638] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Riwayat Review Hasil Ujian Tersimpan ({savedReviews.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-xl bg-[#111724] border border-[#232C3F] hover:border-emerald-500/50 flex flex-col justify-between space-y-2 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          {rev.className} • {rev.examType}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteReviewResult(rev.id);
                            setSavedReviews(getStoredReviews());
                            if (reviewResult?.id === rev.id) {
                              setReviewResult(null);
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 cursor-pointer transition-all"
                          title="Hapus dari riwayat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h5 className="font-bold text-xs text-white mt-1.5 line-clamp-1">{rev.subjectName}</h5>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {rev.summary.generalConclusion}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                      <span className="text-emerald-400 font-bold">Ketuntasan: {rev.summary.passPercentage}%</span>
                      <button
                        type="button"
                        onClick={() => setReviewResult(rev)}
                        className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                      >
                        Buka Laporan →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER HASIL REVIEW PEDAGOGIS (6 STRUKTUR UTAMA) */}
      {reviewResult && (
        <div className="space-y-5">
          {/* Header Identitas Hasil Review */}
          <div className="p-4 rounded-2xl bg-[#121622] border border-[#232C3F] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{reviewResult.subjectName}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Kelas {reviewResult.className}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                    {reviewResult.examType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dianalisis pada: {new Date(reviewResult.analyzedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportWord}
                disabled={isExportingWord}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                {isExportingWord ? 'Mengekspor...' : 'Word'}
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {isExportingExcel ? 'Mengekspor...' : 'Excel'}
              </button>
            </div>
          </div>

          {/* 1. Ringkasan Hasil */}
          <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-4">
            <h3 className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              1. Ringkasan Capaian Hasil Ujian
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-[#090D16] border border-[#222B3D] text-center">
                <span className="text-[10px] text-slate-400">Total Siswa</span>
                <p className="text-base font-black text-white mt-0.5">{reviewResult.summary.totalStudents}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#090D16] border border-[#222B3D] text-center">
                <span className="text-[10px] text-slate-400">Rata-Rata Nilai</span>
                <p className="text-base font-black text-cyan-400 mt-0.5">{reviewResult.summary.averageScore}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#090D16] border border-[#222B3D] text-center">
                <span className="text-[10px] text-slate-400">Nilai Tertinggi</span>
                <p className="text-base font-black text-emerald-400 mt-0.5">{Math.round(reviewResult.summary.highestScore)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#090D16] border border-[#222B3D] text-center">
                <span className="text-[10px] text-slate-400">Nilai Terendah</span>
                <p className="text-base font-black text-rose-400 mt-0.5">{Math.round(reviewResult.summary.lowestScore)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#090D16] border border-[#222B3D] text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400">% Ketuntasan</span>
                <p className="text-base font-black text-indigo-400 mt-0.5">{reviewResult.summary.passPercentage}%</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0E1422] border border-slate-800 text-xs text-slate-200 leading-relaxed">
              <b>Kesimpulan Umum:</b> {reviewResult.summary.generalConclusion}
            </div>
          </div>

          {/* 2. Diagnosa AI Butir Soal Pilihan Ganda (PG) */}
          <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                2. Diagnosa Pedagogis AI Butir Soal Pilihan Ganda (PG)
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                Kutipan Soal Harfiah & Diagnosa AI Mendalam Khusus PG
              </span>
            </div>

            {(!reviewResult.attentionQuestions || reviewResult.attentionQuestions.length === 0) ? (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
                Semua butir soal Pilihan Ganda memiliki tingkat ketercapaian yang baik.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reviewResult.attentionQuestions.map((q) => (
                  <div
                    key={q.questionNumber}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                      q.priority === 'HIGH'
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        : q.priority === 'MEDIUM'
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                        : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {q.sectionLabel || `PG No. ${q.questionNumber}`}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/40">
                          {q.priority === 'HIGH' ? '🔴 Prioritas Tinggi' : q.priority === 'MEDIUM' ? '🟡 Perlu Penguatan' : '🟢 Sudah Baik'} ({q.successRate ?? '-'}%)
                        </span>
                      </div>

                      {q.questionText && (
                        <div className="p-2.5 rounded-xl bg-black/50 border border-amber-500/30 text-xs font-bold text-amber-200 mb-2 leading-relaxed shadow-inner">
                          📝 "{q.questionText}"
                        </div>
                      )}

                      <p className="text-xs font-semibold text-slate-100"><b>Materi:</b> {q.material}</p>
                      {q.indicator && <p className="text-[11px] text-slate-300 italic mt-0.5"><b>Indikator:</b> {q.indicator}</p>}
                      <p className="text-xs font-medium text-slate-200 mt-1.5"><b>Diagnosa AI:</b> {q.diagnosticNote}</p>
                    </div>
                    <div className="pt-2 border-t border-white/10 text-[11px] text-slate-300">
                      <b>Langkah Guru:</b> {q.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resume Ringkas Soal Non-PG (Isian, Menjodohkan, & Uraian) - Prioritas Maks 8 */}
          {reviewResult.nonPgSummary && reviewResult.nonPgSummary.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Prioritas Resume Kesalahan Soal Non-PG (Isian, Menjodohkan & Uraian)
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  Maksimal 8 Butir Soal Paling Banyak Salah (4 Kiri, 4 Kanan)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reviewResult.nonPgSummary.slice(0, 8).map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      item.status === 'HIGH'
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        : item.status === 'MEDIUM'
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                        : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {item.sectionLabel}
                      </span>
                      <div className="text-[11px] font-medium text-slate-300 pt-1">
                        {item.incorrectCount} dari {item.totalStudents} siswa salah (Ketuntasan {item.successRate}%)
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                        item.status === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : item.status === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {item.status === 'HIGH' ? '🔴 Perlu Remedial' : item.status === 'MEDIUM' ? '🟡 Cukup' : '🟢 Tuntas'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 & 4. Materi Penguatan & Indikator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 3. Materi yang Perlu Penguatan */}
            <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-3">
              <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4" />
                3. Materi yang Perlu Diperkuat
              </h3>
              {(!reviewResult.materialsNeedingReinforcement || reviewResult.materialsNeedingReinforcement.length === 0) ? (
                <div className="p-3 rounded-xl bg-[#090D16] border border-[#222B3D] text-xs text-slate-400">
                  Tidak ada materi yang memerlukan remedial khusus.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reviewResult.materialsNeedingReinforcement.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#090D16] border border-[#222B3D] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">{m.material}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          {m.status === 'HIGH' ? 'Prioritas' : 'Perlu Penguatan'}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{m.observation}</p>
                      <p className="text-indigo-300 text-[11px] font-medium pt-1">
                        💡 <b>Saran:</b> {m.actionableAdvice}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Indikator yang Perlu Dibimbing */}
            <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-3">
              <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <ListOrdered className="w-4 h-4" />
                4. Indikator yang Perlu Bimbingan
              </h3>
              {(!reviewResult.indicatorsNeedingGuidance || reviewResult.indicatorsNeedingGuidance.length === 0) ? (
                <div className="p-3 rounded-xl bg-[#090D16] border border-[#222B3D] text-xs text-slate-400">
                  Seluruh indikator soal telah tercapai dengan baik.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reviewResult.indicatorsNeedingGuidance.map((ind, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#090D16] border border-[#222B3D] text-xs space-y-1">
                      <span className="font-bold text-cyan-300">{ind.indicator}</span>
                      <p className="text-slate-300 text-[11px]">{ind.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5 & 6. Temuan Penting & Rekomendasi Tindak Lanjut */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 5. Temuan Pola Kesalahan */}
            <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-3">
              <h3 className="text-xs font-black text-purple-300 uppercase tracking-wider">
                5. Temuan Penting Pola Kesalahan
              </h3>
              {(!reviewResult.keyFindings || reviewResult.keyFindings.length === 0) ? (
                <p className="text-xs text-slate-400">Pola pengerjaan siswa stabil dan merata.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-300">
                  {reviewResult.keyFindings.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-400 font-bold">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 6. Rekomendasi Tindak Lanjut Guru */}
            <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-3">
              <h3 className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                6. Rekomendasi Tindak Lanjut Guru
              </h3>
              {(!reviewResult.followUpRecommendations || reviewResult.followUpRecommendations.length === 0) ? (
                <p className="text-xs text-slate-400">Pertahankan alur pembelajaran reguler.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-300">
                  {reviewResult.followUpRecommendations.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
