import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Printer,
  Copy,
  Check,
  Loader2,
  Languages,
  HelpCircle,
  GraduationCap,
  ListOrdered,
  CheckCircle2,
} from 'lucide-react';

interface SoalItem {
  nomor: number;
  tipe: 'PG' | 'ISIAN' | 'URAIAN';
  pertanyaan: string;
  teksBilingual?: string;
  pilihan?: string[];
  kunciJawaban: string;
  pembahasan?: string;
}

interface LatihanData {
  judulLatihan: string;
  identitas: {
    kelas: string;
    mataPelajaran: string;
    babMateri: string;
  };
  petunjukBelajar: string;
  soalList: SoalItem[];
}

interface LatihanHarianGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAFTAR_MAPEL = [
  'Matematika',
  'IPAS',
  'PAI & BP',
  'Bahasa Indonesia',
  'Bahasa Arab',
  'Bahasa Inggris',
  'Al-Quran Hadits',
  'Akidah Akhlak',
  'Fikih',
  'Pendidikan Pancasila / PKn',
  'Seni Rupa & Budaya',
  'PJOK',
];

const cleanJsonText = (value: string) => {
  return value
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
};

const normalizeType = (value: any): 'PG' | 'ISIAN' | 'URAIAN' => {
  const type = String(value || '').toUpperCase();

  if (
    type === 'PG' ||
    type === 'PILIHAN GANDA' ||
    type === 'MULTIPLE CHOICE'
  ) {
    return 'PG';
  }

  if (
    type === 'ISIAN' ||
    type === 'ISIAN SINGKAT' ||
    type === 'SHORT ANSWER'
  ) {
    return 'ISIAN';
  }

  return 'URAIAN';
};

const normalizeOptions = (options: any): string[] => {
  if (!Array.isArray(options)) return [];

  return options
    .map((option: any) => {
      if (typeof option === 'string') return option;

      if (option && typeof option === 'object') {
        const key = option.key || '';
        const text = option.text || '';

        return key
          ? `${key}. ${text}`.trim()
          : String(text).trim();
      }

      return '';
    })
    .filter(Boolean);
};

const normalizeGeneratedQuestions = (
  questions: any[],
  isBilingual: boolean,
  bilingualType: 'arab' | 'inggris'
): SoalItem[] => {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((question: any, index: number) => {
      const tipe = normalizeType(
        question?.type ||
          question?.questionType ||
          question?.questionForm ||
          question?.section
      );

      const pertanyaan = String(
        question?.questionText ||
          question?.pertanyaan ||
          question?.question ||
          question?.text ||
          ''
      ).trim();

      const pilihan = normalizeOptions(
        question?.options ||
          question?.pilihan ||
          question?.choices
      );

      const kunciJawaban = String(
        question?.answerKey ||
          question?.kunciJawaban ||
          question?.answer ||
          question?.correctAnswer ||
          ''
      ).trim();

      const pembahasan = String(
        question?.explanation ||
          question?.pembahasan ||
          ''
      ).trim();

      let teksBilingual = '';

      /*
       * Backend utama belum secara khusus mengembalikan
       * teks bilingual untuk modul latihan harian.
       *
       * Karena itu kita hanya menggunakan field bilingual
       * apabila memang dikirim oleh backend.
       */
      if (isBilingual) {
        teksBilingual = String(
          question?.bilingualText ||
            question?.teksBilingual ||
            question?.translation ||
            ''
        ).trim();

        /*
         * Jangan membuat terjemahan palsu.
         * Jika backend tidak mengirim teks bilingual,
         * field dibiarkan kosong.
         */
        if (!teksBilingual && bilingualType) {
          teksBilingual = '';
        }
      }

      if (!pertanyaan) return null;

      return {
        nomor: index + 1,
        tipe,
        pertanyaan,
        teksBilingual: teksBilingual || undefined,
        pilihan: pilihan.length > 0 ? pilihan : undefined,
        kunciJawaban,
        pembahasan: pembahasan || undefined,
      };
    })
    .filter(Boolean) as SoalItem[];
};

export const LatihanHarianGeneratorModal: React.FC<
  LatihanHarianGeneratorModalProps
> = ({ isOpen, onClose }) => {
  const [tingkatKelas, setTingkatKelas] = useState('4');
  const [mataPelajaran, setMataPelajaran] =
    useState('Matematika');

  const [babMateri, setBabMateri] = useState('');
  const [subMateri, setSubMateri] = useState('');

  const [jumlahSoal, setJumlahSoal] =
    useState<number>(10);

  const [tipeSoal, setTipeSoal] =
    useState('campuran');

  const [tingkatKesulitan, setTingkatKesulitan] =
    useState('sedang');

  const [isBilingual, setIsBilingual] =
    useState(false);

  const [bilingualType, setBilingualType] =
    useState<'arab' | 'inggris'>('arab');

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const [hasilLatihan, setHasilLatihan] =
    useState<LatihanData | null>(null);

  const [activeTab, setActiveTab] =
    useState<'siswa' | 'kunci'>('siswa');

  const [copied, setCopied] =
    useState(false);

  if (!isOpen) return null;

  /*
   * =========================================================
   * DISTRIBUSI SOAL
   * =========================================================
   *
   * Endpoint /api/evaluation/generate-questions milik project
   * menggunakan:
   *
   * PG      -> pgCount
   * ISIAN   -> isianCount
   * BAGIAN C -> partCCount
   *
   * Untuk modul latihan harian:
   *
   * campuran -> PG + Isian
   * pg       -> seluruh PG
   * isian    -> seluruh Isian
   * uraian   -> seluruh Uraian
   */
  const getDistribution = () => {
    if (tipeSoal === 'pg') {
      return {
        pgCount: jumlahSoal,
        isianCount: 0,
        partCCount: 0,
        partCType: 'Uraian',
      };
    }

    if (tipeSoal === 'isian') {
      return {
        pgCount: 0,
        isianCount: jumlahSoal,
        partCCount: 0,
        partCType: 'Uraian',
      };
    }

    if (tipeSoal === 'uraian') {
      return {
        pgCount: 0,
        isianCount: 0,
        partCCount: jumlahSoal,
        partCType: 'Uraian',
      };
    }

    /*
     * Campuran:
     * sekitar 70% PG + 30% Isian.
     *
     * Minimal selalu ada 1 soal dari masing-masing
     * jika jumlah soal >= 2.
     */
    const pgCount =
      jumlahSoal >= 2
        ? Math.max(
            1,
            Math.round(jumlahSoal * 0.7)
          )
        : jumlahSoal;

    const isianCount =
      jumlahSoal - pgCount;

    return {
      pgCount,
      isianCount,
      partCCount: 0,
      partCType: 'Uraian',
    };
  };

  /*
   * =========================================================
   * BLUEPRINT OTOMATIS
   * =========================================================
   *
   * Endpoint existing membutuhkan blueprint.items.
   * Karena modul ini hanya membutuhkan Bab/Submateri,
   * kita membuat kisi-kisi mini secara otomatis.
   */
  const buildBlueprint = () => {
    const distribution = getDistribution();

    const items: any[] = [];

    let globalNumber = 1;

    /*
     * BAGIAN A - PG
     */
    for (
      let i = 0;
      i < distribution.pgCount;
      i++
    ) {
      items.push({
        number: i + 1,
        globalNumber,
        section: 'A',
        sectionNumber: i + 1,
        sectionLabel:
          'Bagian A: Pilihan Ganda',
        material: babMateri.trim(),
        curriculumGoal:
          `Peserta didik memahami materi ${babMateri.trim()}.`,
        indicator:
          subMateri.trim()
            ? `Peserta didik mampu memahami dan menerapkan ${subMateri.trim()} dengan tepat.`
            : `Peserta didik mampu memahami konsep ${babMateri.trim()} dengan tepat.`,
        cognitiveLevel:
          tingkatKesulitan === 'mudah'
            ? 'C1'
            : tingkatKesulitan === 'sulit'
              ? 'C3'
              : 'C2',
        questionForm: 'PG',
      });

      globalNumber++;
    }

    /*
     * BAGIAN B - ISIAN
     */
    for (
      let i = 0;
      i < distribution.isianCount;
      i++
    ) {
      items.push({
        number: i + 1,
        globalNumber,
        section: 'B',
        sectionNumber: i + 1,
        sectionLabel:
          'Bagian B: Isian',
        material: babMateri.trim(),
        curriculumGoal:
          `Peserta didik memahami materi ${babMateri.trim()}.`,
        indicator:
          subMateri.trim()
            ? `Peserta didik mampu mengingat dan melengkapi konsep ${subMateri.trim()} dengan tepat.`
            : `Peserta didik mampu mengingat konsep penting dari ${babMateri.trim()}.`,
        cognitiveLevel:
          tingkatKesulitan === 'mudah'
            ? 'C1'
            : tingkatKesulitan === 'sulit'
              ? 'C3'
              : 'C2',
        questionForm: 'ISIAN',
      });

      globalNumber++;
    }

    /*
     * BAGIAN C - URAIAN
     */
    for (
      let i = 0;
      i < distribution.partCCount;
      i++
    ) {
      items.push({
        number: i + 1,
        globalNumber,
        section: 'C',
        sectionNumber: i + 1,
        sectionLabel:
          'Bagian C: Uraian',
        material: babMateri.trim(),
        curriculumGoal:
          `Peserta didik mampu menjelaskan materi ${babMateri.trim()}.`,
        indicator:
          subMateri.trim()
            ? `Peserta didik mampu menjelaskan dan menganalisis ${subMateri.trim()} dengan bahasa sendiri.`
            : `Peserta didik mampu menjelaskan konsep ${babMateri.trim()} secara runtut.`,
        cognitiveLevel:
          tingkatKesulitan === 'mudah'
            ? 'C2'
            : tingkatKesulitan === 'sulit'
              ? 'C4'
              : 'C3',
        questionForm: 'URAIAN',
      });

      globalNumber++;
    }

    return {
      id: `latihan_bp_${Date.now()}`,
      title: `Latihan Harian ${mataPelajaran} Kelas ${tingkatKelas}`,
      subjectName: mataPelajaran,
      className: `Kelas ${tingkatKelas}`,
      semester: '',
      schoolYear: '',
      examType: 'Latihan Harian',
      teacherName: '',
      materialContextSummary:
        subMateri.trim()
          ? `${babMateri.trim()} - ${subMateri.trim()}`
          : babMateri.trim(),
      topics: [
        {
          id: `topic_${Date.now()}`,
          title: babMateri.trim(),
          subTopics: subMateri.trim(),
        },
      ],
      distributionConfig: distribution,
      items,
    };
  };

  const handleGenerate = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!babMateri.trim()) {
      setErrorMsg(
        'Harap masukkan nama Bab atau Materi Pokok.'
      );
      return;
    }

    if (jumlahSoal < 1) {
      setErrorMsg(
        'Jumlah soal harus lebih dari 0.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setHasilLatihan(null);

    try {
      const distribution =
        getDistribution();

      const blueprint =
        buildBlueprint();

      /*
       * =====================================================
       * PANGGIL ENDPOINT AI YANG MEMANG SUDAH ADA
       * =====================================================
       */
      const response = await fetch(
        '/api/evaluation/generate-questions',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            subjectName:
              mataPelajaran,

            className:
              `Kelas ${tingkatKelas}`,

            examType:
              'Latihan Harian',

            blueprint,

            materials: {
              textNotes:
                [
                  `Bab/Materi: ${babMateri.trim()}`,
                  subMateri.trim()
                    ? `Sub-Materi: ${subMateri.trim()}`
                    : '',
                  `Tingkat kesulitan: ${tingkatKesulitan}`,
                  isBilingual
                    ? `Format bilingual: ${
                        bilingualType === 'arab'
                          ? 'Arab berharakat'
                          : 'Bahasa Inggris'
                      }`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n'),

              files: [],
            },

            config: {
              pgCount:
                distribution.pgCount,

              pgOptions:
                'A-C',

              isianCount:
                distribution.isianCount,

              partCType:
                distribution.partCType,

              partCCount:
                distribution.partCCount,

              matchingMode:
                'text_to_text',
            },
          }),
        }
      );

      /*
       * =====================================================
       * BACA RESPONSE DENGAN AMAN
       * =====================================================
       */
      const responseText =
        await response.text();

      let result: any = {};

      try {
        result = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error(
          'Server mengembalikan respons yang bukan JSON. Periksa backend endpoint generate-questions.'
        );
      }

      /*
       * =====================================================
       * HANDLE ERROR BACKEND
       * =====================================================
       */
      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            `Server gagal menghasilkan soal (HTTP ${response.status}).`
        );
      }

      /*
       * Backend existing bisa mengembalikan:
       *
       * status: success
       * questions: [...]
       *
       * atau:
       *
       * status: fallback_mock_needed
       * questions: []
       */
      const rawQuestions =
        Array.isArray(result?.questions)
          ? result.questions
          : [];

      if (
        result?.status ===
          'fallback_mock_needed' &&
        rawQuestions.length === 0
      ) {
        throw new Error(
          'AI belum aktif di backend. Endpoint berhasil dipanggil, tetapi Gemini client tidak tersedia.'
        );
      }

      if (rawQuestions.length === 0) {
        throw new Error(
          result?.message ||
            'AI tidak mengembalikan soal. Pastikan konfigurasi Gemini/API key di backend aktif.'
        );
      }

      /*
       * =====================================================
       * NORMALISASI RESPONSE AI
       * =====================================================
       */
      const normalizedQuestions =
        normalizeGeneratedQuestions(
          rawQuestions,
          isBilingual,
          bilingualType
        );

      if (
        normalizedQuestions.length === 0
      ) {
        throw new Error(
          'Soal berhasil diterima dari server, tetapi format data soal tidak dapat dibaca oleh modal ini.'
        );
      }

      /*
       * =====================================================
       * VALIDASI JUMLAH
       * =====================================================
       */
      if (
        normalizedQuestions.length <
        jumlahSoal
      ) {
        console.warn(
          '[Latihan Harian] Jumlah soal AI kurang dari permintaan.',
          {
            requested: jumlahSoal,
            received:
              normalizedQuestions.length,
          }
        );
      }

      /*
       * =====================================================
       * BUAT DATA LATIHAN
       * =====================================================
       */
      const latihan: LatihanData = {
        judulLatihan:
          `Latihan Harian ${mataPelajaran}`,

        identitas: {
          kelas:
            tingkatKelas,

          mataPelajaran:
            mataPelajaran,

          babMateri:
            subMateri.trim()
              ? `${babMateri.trim()} - ${subMateri.trim()}`
              : babMateri.trim(),
        },

        petunjukBelajar:
          tipeSoal === 'pg'
            ? 'Pilihlah jawaban yang paling tepat pada setiap soal.'
            : tipeSoal === 'isian'
              ? 'Isilah titik-titik dengan jawaban yang paling tepat.'
              : tipeSoal === 'uraian'
                ? 'Jawablah setiap pertanyaan dengan jelas dan menggunakan bahasamu sendiri.'
                : 'Kerjakan setiap soal dengan teliti. Pilih jawaban yang paling tepat untuk pilihan ganda dan lengkapi jawaban pada soal isian.',

        soalList:
          normalizedQuestions,
      };

      setHasilLatihan(
        latihan
      );

      setActiveTab(
        'siswa'
      );
    } catch (err: any) {
      console.error(
        '[Latihan Harian] Generate error:',
        err
      );

      setErrorMsg(
        err?.message ||
          'Terjadi kesalahan saat menghasilkan soal.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /*
   * =========================================================
   * COPY
   * =========================================================
   */
  const handleCopy = async () => {
    if (!hasilLatihan) return;

    let textToCopy = '';

    if (
      activeTab === 'siswa'
    ) {
      textToCopy =
        `LEMBAR LATIHAN HARIAN\n` +
        `Mata Pelajaran : ${hasilLatihan.identitas.mataPelajaran}\n` +
        `Kelas / Bab     : ${hasilLatihan.identitas.kelas} / ${hasilLatihan.identitas.babMateri}\n` +
        `Nama Siswa      : ........................................\n` +
        `Hari / Tanggal  : ........................................\n\n` +
        `Petunjuk: ${hasilLatihan.petunjukBelajar}\n\n` +
        hasilLatihan.soalList
          .map((s) => {
            let q =
              `${s.nomor}. ${s.pertanyaan}\n`;

            if (
              s.teksBilingual
            ) {
              q +=
                `   (${s.teksBilingual})\n`;
            }

            if (
              s.pilihan &&
              s.pilihan.length > 0
            ) {
              q +=
                s.pilihan
                  .map(
                    (p) =>
                      `   ${p}`
                  )
                  .join('\n') +
                '\n';
            }

            return q;
          })
          .join('\n');
    } else {
      textToCopy =
        `KUNCI JAWABAN & PEMBAHASAN RINGKAS\n` +
        `Bab: ${hasilLatihan.identitas.babMateri} (Kelas ${hasilLatihan.identitas.kelas})\n\n` +
        hasilLatihan.soalList
          .map((s) => {
            return (
              `No. ${s.nomor}: [${s.kunciJawaban || '-'}]\n` +
              `Tipe: ${s.tipe}\n` +
              (s.pembahasan
                ? `Pembahasan: ${s.pembahasan}\n`
                : '')
            );
          })
          .join('\n');
    }

    try {
      await navigator.clipboard.writeText(
        textToCopy
      );

      setCopied(true);

      setTimeout(
        () => setCopied(false),
        2000
      );
    } catch {
      setErrorMsg(
        'Teks gagal disalin ke clipboard.'
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-100 flex flex-wrap items-center gap-2">
                Generator Soal Latihan Harian

                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  AI Bab / Topik
                </span>
              </h3>

              <p className="text-xs text-slate-400 mt-0.5">
                Buat latihan siswa langsung dari Bab atau materi yang dipilih.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================= */}
        {/* BODY */}
        {/* ================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* ERROR */}
          {errorMsg && (
            <div className="p-3.5 bg-red-900/30 border border-red-700/50 rounded-xl text-xs text-red-200 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />

              <div className="flex-1">
                <div className="font-bold mb-0.5">
                  Gagal menghasilkan soal
                </div>

                <div className="leading-relaxed">
                  {errorMsg}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setErrorMsg(null)
                }
                className="text-red-400 hover:text-red-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================================================= */}
          {/* FORM */}
          {/* ================================================= */}
          <form
            onSubmit={handleGenerate}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/50 p-5 rounded-2xl border border-slate-800"
          >

            {/* KELAS */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                Jenjang Kelas
              </label>

              <select
                value={tingkatKelas}
                onChange={(e) =>
                  setTingkatKelas(
                    e.target.value
                  )
                }
                disabled={isLoading}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                <option value="1">
                  Kelas 1 SD
                </option>
                <option value="2">
                  Kelas 2 SD
                </option>
                <option value="3">
                  Kelas 3 SD
                </option>
                <option value="4">
                  Kelas 4 SD
                </option>
                <option value="5">
                  Kelas 5 SD
                </option>
                <option value="6">
                  Kelas 6 SD
                </option>
              </select>
            </div>

            {/* MAPEL */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                Mata Pelajaran
              </label>

              <select
                value={mataPelajaran}
                onChange={(e) =>
                  setMataPelajaran(
                    e.target.value
                  )
                }
                disabled={isLoading}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                {DAFTAR_MAPEL.map(
                  (mapel) => (
                    <option
                      key={mapel}
                      value={mapel}
                    >
                      {mapel}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* JUMLAH + TIPE */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
                Jumlah & Format Soal
              </label>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={jumlahSoal}
                  onChange={(e) =>
                    setJumlahSoal(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  disabled={isLoading}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value={5}>
                    5 Soal
                  </option>
                  <option value={10}>
                    10 Soal
                  </option>
                  <option value={15}>
                    15 Soal
                  </option>
                </select>

                <select
                  value={tipeSoal}
                  onChange={(e) =>
                    setTipeSoal(
                      e.target.value
                    )
                  }
                  disabled={isLoading}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="campuran">
                    Campuran
                  </option>

                  <option value="pg">
                    Hanya PG
                  </option>

                  <option value="isian">
                    Hanya Isian
                  </option>

                  <option value="uraian">
                    Hanya Uraian
                  </option>
                </select>
              </div>
            </div>

            {/* BAB */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Bab atau Topik Materi Pokok{' '}
                <span className="text-red-400">
                  *
                </span>
              </label>

              <input
                type="text"
                value={babMateri}
                onChange={(e) =>
                  setBabMateri(
                    e.target.value
                  )
                }
                disabled={isLoading}
                placeholder="Contoh: Operasi Perkalian Pecahan / Rukun Islam / Ekosistem"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                required
              />
            </div>

            {/* SUB MATERI */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Sub-Topik / Poin Inti
              </label>

              <input
                type="text"
                value={subMateri}
                onChange={(e) =>
                  setSubMateri(
                    e.target.value
                  )
                }
                disabled={isLoading}
                placeholder="Opsional"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>

            {/* KESULITAN */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Tingkat Kesulitan
              </label>

              <select
                value={tingkatKesulitan}
                onChange={(e) =>
                  setTingkatKesulitan(
                    e.target.value
                  )
                }
                disabled={isLoading}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                <option value="mudah">
                  Mudah
                </option>

                <option value="sedang">
                  Sedang
                </option>

                <option value="sulit">
                  Sulit
                </option>
              </select>
            </div>

            {/* BILINGUAL */}
            <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={isBilingual}
                  onChange={(e) =>
                    setIsBilingual(
                      e.target.checked
                    )
                  }
                  disabled={isLoading}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
                />

                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Languages className="w-3.5 h-3.5" />
                  Format Bilingual
                </span>
              </label>

              {isBilingual && (
                <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                  <span className="text-slate-400">
                    Bahasa:
                  </span>

                  <label className="flex items-center gap-1 text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="bilingualType"
                      checked={
                        bilingualType ===
                        'arab'
                      }
                      onChange={() =>
                        setBilingualType(
                          'arab'
                        )
                      }
                      disabled={isLoading}
                      className="text-emerald-500"
                    />

                    Arab
                  </label>

                  <label className="flex items-center gap-1 text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="bilingualType"
                      checked={
                        bilingualType ===
                        'inggris'
                      }
                      onChange={() =>
                        setBilingualType(
                          'inggris'
                        )
                      }
                      disabled={isLoading}
                      className="text-emerald-500"
                    />

                    Inggris
                  </label>
                </div>
              )}
            </div>

            {/* GENERATE */}
            <div className="md:col-span-3 flex justify-end pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={
                  isLoading ||
                  !babMateri.trim()
                }
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI Sedang Menyusun Soal...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Soal Latihan
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ================================================= */}
          {/* HASIL */}
          {/* ================================================= */}
          {hasilLatihan && (
            <div className="space-y-4">

              {/* TAB + ACTION */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        'siswa'
                      )
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab ===
                      'siswa'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                    }`}
                  >
                    Lembar Latihan Siswa
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        'kunci'
                      )
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab ===
                      'kunci'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                    }`}
                  >
                    Kunci & Pembahasan
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={
                      handleCopy
                    }
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        Salin Teks
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={
                      handlePrint
                    }
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                    Cetak / PDF
                  </button>
                </div>
              </div>

              {/* ================================================= */}
              {/* PREVIEW */}
              {/* ================================================= */}
              <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 print:m-0 print:p-0 print:border-none print:shadow-none">

                {activeTab ===
                'siswa' ? (
                  <div className="space-y-6">

                    {/* HEADER LEMBAR */}
                    <div className="border-b-2 border-slate-800 pb-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-lg font-black uppercase tracking-wide text-slate-900">
                            LEMBAR LATIHAN HARIAN
                          </h2>

                          <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">
                            Mata Pelajaran:{' '}
                            {
                              hasilLatihan
                                .identitas
                                .mataPelajaran
                            }

                            {' • '}

                            Bab:{' '}
                            {
                              hasilLatihan
                                .identitas
                                .babMateri
                            }
                          </p>
                        </div>

                        <div className="text-right text-xs text-slate-700">
                          <div className="font-bold">
                            Kelas:{' '}
                            {
                              hasilLatihan
                                .identitas
                                .kelas
                            }
                          </div>

                          <div className="mt-1 font-mono text-[11px] border border-slate-400 px-2 py-0.5 rounded">
                            Nilai: ______
                          </div>
                        </div>
                      </div>

                      {/* IDENTITAS */}
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-dashed border-slate-300 text-xs font-semibold text-slate-800">
                        <div>
                          Nama Siswa :{' '}
                          ....................................................
                        </div>

                        <div>
                          Hari / Tanggal :{' '}
                          ................................................
                        </div>
                      </div>
                    </div>

                    {/* PETUNJUK */}
                    {hasilLatihan.petunjukBelajar && (
                      <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r-lg text-xs text-emerald-900 italic">
                        <span className="font-bold not-italic">
                          Petunjuk:
                        </span>{' '}
                        {
                          hasilLatihan.petunjukBelajar
                        }
                      </div>
                    )}

                    {/* SOAL */}
                    <div className="space-y-5">
                      {hasilLatihan.soalList.map(
                        (item) => (
                          <div
                            key={
                              item.nomor
                            }
                            className="space-y-1.5 text-sm"
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-slate-900 min-w-[22px]">
                                {item.nomor}.
                              </span>

                              <div className="flex-1 space-y-1.5">
                                <p className="text-slate-900 font-medium leading-relaxed">
                                  {
                                    item.pertanyaan
                                  }
                                </p>

                                {item.teksBilingual && (
                                  <p className="text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-md text-sm italic font-medium">
                                    {
                                      item.teksBilingual
                                    }
                                  </p>
                                )}

                                {item.pilihan &&
                                  item.pilihan
                                    .length >
                                    0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-1">
                                      {item.pilihan.map(
                                        (
                                          p,
                                          pIdx
                                        ) => (
                                          <div
                                            key={
                                              pIdx
                                            }
                                            className="text-slate-800 text-xs sm:text-sm"
                                          >
                                            {
                                              p
                                            }
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}

                                {item.tipe ===
                                  'ISIAN' && (
                                  <div className="pt-2">
                                    <div className="border-b border-slate-400 w-full" />
                                  </div>
                                )}

                                {item.tipe ===
                                  'URAIAN' && (
                                  <div className="space-y-3 pt-2">
                                    <div className="border-b border-slate-300" />
                                    <div className="border-b border-slate-300" />
                                    <div className="border-b border-slate-300" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                  </div>
                ) : (
                  /* ================================================= */
                  /* KUNCI */
                  /* ================================================= */
                  <div className="space-y-4">

                    <div className="border-b border-slate-200 pb-3">
                      <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Kunci Jawaban & Pembahasan
                      </h3>

                      <p className="text-xs text-slate-600 mt-0.5">
                        {
                          hasilLatihan
                            .identitas
                            .mataPelajaran
                        }
                        {' • '}
                        {
                          hasilLatihan
                            .identitas
                            .babMateri
                        }
                        {' • Kelas '}
                        {
                          hasilLatihan
                            .identitas
                            .kelas
                        }
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {hasilLatihan.soalList.map(
                        (item) => (
                          <div
                            key={
                              item.nomor
                            }
                            className="py-3 text-xs space-y-1.5"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-800">
                                Nomor{' '}
                                {
                                  item.nomor
                                }
                              </span>

                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                Kunci:{' '}
                                {item.kunciJawaban ||
                                  '-'}
                              </span>

                              <span className="text-slate-400 text-[11px]">
                                (
                                {
                                  item.tipe
                                }
                                )
                              </span>
                            </div>

                            {item.pembahasan && (
                              <p className="text-slate-600 pl-2 border-l-2 border-emerald-400 mt-1 leading-relaxed">
                                {
                                  item.pembahasan
                                }
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};