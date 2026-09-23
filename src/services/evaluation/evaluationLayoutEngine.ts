import {
  EvaluationQuestionPackage,
  EvaluationQuestion,
} from '../../types/evaluationTypes';

export type ContinuationSectionType = 'isian' | 'matching' | 'uraian';

export interface PreviewSectionChunk {
  type: ContinuationSectionType;
  questions: EvaluationQuestion[];
  showTitle: boolean;
}

export interface PreviewDocumentPage {
  type: 'questions' | 'content';
  left: EvaluationQuestion[];
  right: EvaluationQuestion[];
  continuation: PreviewSectionChunk[];
}

export interface ExamTitleParts {
  acronym: string;
  fullName: string;
  headerTitle: string;
}

export const F4_FIRST_PAGE_CONTENT_HEIGHT = 800;
export const F4_OTHER_PAGE_CONTENT_HEIGHT = 1090;

export const SECTION_TITLE_HEIGHT = 34;
export const SECTION_GAP = 12;

/**
 * Format standar nama dan singkatan jenis ujian resmi:
 * - STS 1 -> { acronym: "STS 1", fullName: "ASESMEN SUMATIF TENGAH SEMESTER GANJIL", headerTitle: "SOAL ASESMEN SUMATIF TENGAH SEMESTER GANJIL (STS 1)" }
 * - STS 2 -> { acronym: "STS 2", fullName: "ASESMEN SUMATIF TENGAH SEMESTER GENAP", headerTitle: "SOAL ASESMEN SUMATIF TENGAH SEMESTER GENAP (STS 2)" }
 * - SAS 1 / SAS Ganjil -> { acronym: "SAS 1", fullName: "ASESMEN SUMATIF AKHIR SEMESTER GANJIL", headerTitle: "SOAL ASESMEN SUMATIF AKHIR SEMESTER GANJIL (SAS 1)" }
 * - SAS 2 / SAS Genap -> { acronym: "SAS 2", fullName: "ASESMEN SUMATIF AKHIR SEMESTER GENAP", headerTitle: "SOAL ASESMEN SUMATIF AKHIR SEMESTER GENAP (SAS 2)" }
 * - SAT / SAT 2 / PAT -> { acronym: "SAT", fullName: "ASESMEN SUMATIF AKHIR TAHUN", headerTitle: "SOAL ASESMEN SUMATIF AKHIR TAHUN (SAT)" }
 */
export function getExamTitleParts(examType?: string): ExamTitleParts {
  const raw = String(examType || '').trim();
  const upper = raw.toUpperCase();

  // 1. Deteksi STS 1 (Sumatif Tengah Semester 1 / Ganjil)
  if (
    upper.includes('STS 1') ||
    upper.includes('STS1') ||
    (upper.includes('STS') && (upper.includes('1') || upper.includes('GANJIL') || upper.includes('SEMESTER 1') || upper.includes('SEMESTER I'))) ||
    (upper.includes('SUMATIF TENGAH SEMESTER') && (upper.includes('1') || upper.includes('GANJIL')))
  ) {
    return {
      acronym: 'STS 1',
      fullName: 'ASESMEN SUMATIF TENGAH SEMESTER GANJIL',
      headerTitle: 'SOAL ASESMEN SUMATIF TENGAH SEMESTER GANJIL (STS 1)',
    };
  }

  // 2. Deteksi STS 2 (Sumatif Tengah Semester 2 / Genap)
  if (
    upper.includes('STS 2') ||
    upper.includes('STS2') ||
    (upper.includes('STS') && (upper.includes('2') || upper.includes('GENAP') || upper.includes('SEMESTER 2') || upper.includes('SEMESTER II'))) ||
    (upper.includes('SUMATIF TENGAH SEMESTER') && (upper.includes('2') || upper.includes('GENAP')))
  ) {
    return {
      acronym: 'STS 2',
      fullName: 'ASESMEN SUMATIF TENGAH SEMESTER GENAP',
      headerTitle: 'SOAL ASESMEN SUMATIF TENGAH SEMESTER GENAP (STS 2)',
    };
  }

  // 3. Deteksi SAT / PAT / Akhir Tahun (Sumatif Akhir Tahun)
  if (
    upper.includes('SAT') ||
    upper.includes('PAT') ||
    upper.includes('AKHIR TAHUN') ||
    upper.includes('SUMATIF AKHIR TAHUN')
  ) {
    return {
      acronym: 'SAT',
      fullName: 'ASESMEN SUMATIF AKHIR TAHUN',
      headerTitle: 'SOAL ASESMEN SUMATIF AKHIR TAHUN (SAT)',
    };
  }

  // 4. Deteksi SAS 2 (Sumatif Akhir Semester 2 / Genap)
  if (
    upper.includes('SAS 2') ||
    upper.includes('SAS2') ||
    (upper.includes('SAS') && (upper.includes('2') || upper.includes('GENAP') || upper.includes('SEMESTER 2') || upper.includes('SEMESTER II'))) ||
    (upper.includes('SUMATIF AKHIR SEMESTER') && (upper.includes('2') || upper.includes('GENAP')))
  ) {
    return {
      acronym: 'SAS 2',
      fullName: 'ASESMEN SUMATIF AKHIR SEMESTER GENAP',
      headerTitle: 'SOAL ASESMEN SUMATIF AKHIR SEMESTER GENAP (SAS 2)',
    };
  }

  // 5. Deteksi SAS 1 / SAS Umum / PAS (Sumatif Akhir Semester 1 / Ganjil)
  if (
    upper.includes('SAS 1') ||
    upper.includes('SAS1') ||
    upper.includes('PAS 1') ||
    upper.includes('PAS') ||
    upper.includes('SAS') ||
    upper.includes('SUMATIF AKHIR SEMESTER')
  ) {
    const isSingle = !upper.includes('1') && !upper.includes('GANJIL') && (upper === 'SAS' || upper === 'SAS (SUMATIF AKHIR SEMESTER)');
    const acronym = isSingle ? 'SAS' : 'SAS 1';
    return {
      acronym,
      fullName: 'ASESMEN SUMATIF AKHIR SEMESTER GANJIL',
      headerTitle: `SOAL ASESMEN SUMATIF AKHIR SEMESTER GANJIL (${acronym})`,
    };
  }

  // 6. Deteksi STS Umum (tanpa angka semester)
  if (upper.includes('STS') || upper.includes('SUMATIF TENGAH SEMESTER')) {
    return {
      acronym: 'STS',
      fullName: 'ASESMEN SUMATIF TENGAH SEMESTER',
      headerTitle: 'SOAL ASESMEN SUMATIF TENGAH SEMESTER (STS)',
    };
  }

  // 7. Deteksi PTS 1
  if (upper.includes('PTS 1') || (upper.includes('PTS') && (upper.includes('1') || upper.includes('GANJIL')))) {
    return {
      acronym: 'PTS 1',
      fullName: 'PENILAIAN TENGAH SEMESTER GANJIL',
      headerTitle: 'SOAL PENILAIAN TENGAH SEMESTER GANJIL (PTS 1)',
    };
  }

  // 8. Deteksi PTS 2
  if (upper.includes('PTS 2') || (upper.includes('PTS') && (upper.includes('2') || upper.includes('GENAP')))) {
    return {
      acronym: 'PTS 2',
      fullName: 'PENILAIAN TENGAH SEMESTER GENAP',
      headerTitle: 'SOAL PENILAIAN TENGAH SEMESTER GENAP (PTS 2)',
    };
  }

  // 9. Deteksi Formatif / Harian
  if (upper.includes('FORMATIF') || upper.includes('HARIAN') || upper.includes('ULANGAN')) {
    return {
      acronym: 'FORMATIF',
      fullName: 'ASESMEN FORMATIF',
      headerTitle: 'SOAL ASESMEN FORMATIF',
    };
  }

  // 10. Fallback untuk input umum/kustom lainnya:
  // Bersihkan duplikasi kurung dan kata "SOAL" jika sudah ada
  let cleaned = raw
    .replace(/^SOAL\s+/i, '')
    .trim();

  // Ekstrak jika ada pola "ACRONYM (Full Name)" atau "ACRONYM"
  const bracketMatch = cleaned.match(/^([A-Za-z0-9\s/-]+?)\s*\((.+)\)$/);
  if (bracketMatch) {
    const acr = bracketMatch[1].trim().toUpperCase();
    const full = bracketMatch[2].trim().toUpperCase();
    return {
      acronym: acr,
      fullName: full,
      headerTitle: `SOAL ${full} (${acr})`,
    };
  }

  const cleanUpper = cleaned.toUpperCase();
  return {
    acronym: cleanUpper || 'ASESMEN',
    fullName: cleanUpper || 'ASESMEN SUMATIF',
    headerTitle: `SOAL ${cleanUpper || 'ASESMEN SUMATIF'}`,
  };
}

/**
 * Estimasi tinggi butir soal untuk pagination F4 yang fleksibel dan adaptif
 */
export function estimateQuestionHeight(question: EvaluationQuestion): number {
  const questionText = question.questionText || '';
  const options = Array.isArray(question.options) ? question.options : [];

  const questionLines = Math.max(1, Math.ceil(questionText.length / 44));

  const optionLines = options.reduce((sum, option) => {
    const text = option.text || '';
    const lines = Math.max(1, Math.ceil(text.length / 40));
    return sum + lines;
  }, 0);

  const totalLines = questionLines + optionLines;
  const lineHeight = 18;
  const itemSpacing = 12;
  const safetyBuffer = Math.max(8, Math.round(totalLines * 1.5));

  return totalLines * lineHeight + itemSpacing + safetyBuffer;
}

/**
 * Pengelompokan soal berdasarkan jenis (PG, Isian, Menjodohkan, Uraian)
 */
export function groupEvaluationQuestions(questions: EvaluationQuestion[] = []) {
  return {
    pg: questions.filter((q) => q.section === 'A' || q.type === 'PG'),
    isian: questions.filter((q) => q.section === 'B' || q.type === 'ISIAN'),
    matching: questions.filter((q) => q.section === 'C' || q.type === 'MENJODOHKAN'),
    uraian: questions.filter(
      (q) => q.section === 'D' || q.type === 'URAIAN' || q.type === 'ESSAY'
    ),
  };
}

/**
 * Mendapatkan judul / instruksi bagian soal
 */
export function getSectionTitleText(
  type: ContinuationSectionType,
  pgOptionFormat: 'A-C' | 'A-D' = 'A-C'
): string {
  if (type === 'isian') {
    return 'B. Isilah titik-titik berikut ini dengan jawaban yang benar !';
  }
  if (type === 'matching') {
    return 'C. Pasangkan kalimat-kalimat berikut dengan tepat!';
  }
  return 'D. Jawablah pertanyaan berikut dengan tepat!';
}

export function getPgInstructionText(pgOptionFormat: 'A-C' | 'A-D' = 'A-C'): string {
  const letters = pgOptionFormat === 'A-D' ? 'a, b, c, atau d' : 'a, b, atau c';
  return `A. Berilah tanda silang ( X ) pada huruf ${letters} di depan jawaban yang paling tepat !`;
}

/**
 * ENGINE PAGINATION F4 — SMART / FLEXIBLE
 * Digunakan bersama oleh Review Soal dan Export Word
 *
 * Prinsip:
 * 1. PG tetap 2 kolom, kiri diisi lebih dahulu lalu kanan.
 * 2. Setelah PG selesai, Bagian B/C/D TIDAK otomatis page break.
 * 3. Jika masih ada ruang pada halaman yang sama, B/C/D langsung dilanjutkan di bawah PG dalam format 1 kolom.
 * 4. B/C/D dapat terus mengalir ke halaman berikutnya tanpa memaksa pergantian halaman hanya karena jenis soal berubah.
 */
export function paginateEvaluationDocument(
  pkg: EvaluationQuestionPackage | null | undefined
): PreviewDocumentPage[] {
  if (!pkg || !Array.isArray(pkg.questions) || pkg.questions.length === 0) {
    return [];
  }

  const questionGroups = groupEvaluationQuestions(pkg.questions);

  const pages: PreviewDocumentPage[] = [];

  const createPage = (): PreviewDocumentPage => ({
    type: 'content',
    left: [],
    right: [],
    continuation: [],
  });

  const getPageCapacity = (pageIndex: number) =>
    pageIndex === 0
      ? F4_FIRST_PAGE_CONTENT_HEIGHT
      : F4_OTHER_PAGE_CONTENT_HEIGHT;

  // --------------------------------------------------------
  // DATA B/C/D
  // --------------------------------------------------------
  const sectionQueue: Array<{
    type: ContinuationSectionType;
    questions: EvaluationQuestion[];
  }> = ([
    {
      type: 'isian' as const,
      questions: questionGroups.isian,
    },
    {
      type: 'matching' as const,
      questions: questionGroups.matching,
    },
    {
      type: 'uraian' as const,
      questions: questionGroups.uraian,
    },
  ] as Array<{ type: ContinuationSectionType; questions: EvaluationQuestion[] }>).filter(
    (section) => section.questions.length > 0
  );

  let currentSectionIndex = 0;
  let currentQuestionIndex = 0;
  let showSectionTitle = true;

  // --------------------------------------------------------
  // HELPER: Masukkan B/C/D ke ruang tersisa halaman (1 kolom)
  // --------------------------------------------------------
  const fillContinuation = (
    page: PreviewDocumentPage,
    pageCapacity: number,
    usedHeight: number
  ) => {
    let remaining = pageCapacity - usedHeight;

    while (currentSectionIndex < sectionQueue.length) {
      const section = sectionQueue[currentSectionIndex];

      const remainingQuestions = section.questions.slice(currentQuestionIndex);

      if (remainingQuestions.length === 0) {
        currentSectionIndex += 1;
        currentQuestionIndex = 0;
        showSectionTitle = true;
        continue;
      }

      const firstQuestionHeight = estimateQuestionHeight(remainingQuestions[0]);
      const titleNeeded = showSectionTitle;
      const titleHeight = titleNeeded ? SECTION_TITLE_HEIGHT + SECTION_GAP : 0;

      // Jangan memaksakan satu soal ke ruang yang terlalu kecil
      if (remaining < titleHeight + firstQuestionHeight) {
        break;
      }

      let chunkHeight = titleHeight;
      const chunk: EvaluationQuestion[] = [];

      while (currentQuestionIndex < section.questions.length) {
        const question = section.questions[currentQuestionIndex];
        const questionHeight = estimateQuestionHeight(question);

        if (chunk.length > 0 && chunkHeight + questionHeight > remaining) {
          break;
        }

        chunk.push(question);
        chunkHeight += questionHeight;
        currentQuestionIndex += 1;
      }

      if (chunk.length === 0) {
        break;
      }

      page.continuation.push({
        type: section.type,
        questions: chunk,
        showTitle: titleNeeded,
      });

      remaining -= chunkHeight;

      // Jika section selesai, section berikutnya boleh langsung masuk ke ruang tersisa
      if (currentQuestionIndex >= section.questions.length) {
        currentSectionIndex += 1;
        currentQuestionIndex = 0;
        showSectionTitle = true;
        remaining -= SECTION_GAP;

        if (remaining <= 0) {
          break;
        }
      } else {
        // Section masih berlanjut ke halaman berikutnya
        showSectionTitle = false;
        break;
      }
    }

    return pageCapacity - remaining;
  };

  // --------------------------------------------------------
  // BAGIAN A — PG (2 Kolom vertikal: kiri lalu kanan)
  // --------------------------------------------------------
  const pg = questionGroups.pg;
  let pgCursor = 0;

  while (pgCursor < pg.length) {
    const pageIndex = pages.length;
    const pageCapacity = getPageCapacity(pageIndex);
    const page = createPage();

    let leftHeight = 0;

    // Kolom kiri terlebih dahulu
    while (pgCursor < pg.length) {
      const question = pg[pgCursor];
      const height = estimateQuestionHeight(question);

      if (page.left.length > 0 && leftHeight + height > pageCapacity) {
        break;
      }

      page.left.push(question);
      leftHeight += height;
      pgCursor += 1;
    }

    let rightHeight = 0;

    // Kolom kanan setelah kolom kiri penuh
    while (pgCursor < pg.length) {
      const question = pg[pgCursor];
      const height = estimateQuestionHeight(question);

      if (page.right.length > 0 && rightHeight + height > pageCapacity) {
        break;
      }

      page.right.push(question);
      rightHeight += height;
      pgCursor += 1;
    }

    const pgUsedHeight = Math.max(leftHeight, rightHeight);

    // Jika PG sudah selesai di halaman ini, sisa ruang digunakan untuk B/C/D
    if (pgCursor >= pg.length) {
      fillContinuation(page, pageCapacity, pgUsedHeight);
    }

    page.type =
      page.left.length > 0 || page.right.length > 0
        ? 'questions'
        : 'content';

    pages.push(page);
  }

  // --------------------------------------------------------
  // JIKA TIDAK ADA PG SAMA SEKALI
  // --------------------------------------------------------
  if (pg.length === 0) {
    const page = createPage();
    const pageIndex = 0;

    fillContinuation(page, getPageCapacity(pageIndex), 0);

    if (page.continuation.length > 0) {
      pages.push(page);
    }
  }

  // --------------------------------------------------------
  // LANJUTKAN B/C/D JIKA MASIH TERSISA
  // --------------------------------------------------------
  while (currentSectionIndex < sectionQueue.length) {
    const pageIndex = pages.length;
    const page = createPage();

    fillContinuation(page, getPageCapacity(pageIndex), 0);

    // Pengaman jika soal tunggal sangat panjang
    if (page.continuation.length === 0) {
      const section = sectionQueue[currentSectionIndex];
      const question = section.questions[currentQuestionIndex];

      if (!question) {
        currentSectionIndex += 1;
        currentQuestionIndex = 0;
        showSectionTitle = true;
        continue;
      }

      page.continuation.push({
        type: section.type,
        questions: [question],
        showTitle: showSectionTitle,
      });

      currentQuestionIndex += 1;

      if (currentQuestionIndex >= section.questions.length) {
        currentSectionIndex += 1;
        currentQuestionIndex = 0;
        showSectionTitle = true;
      } else {
        showSectionTitle = false;
      }
    }

    pages.push(page);
  }

  if (pages.length === 0) {
    pages.push({
      type: 'content',
      left: [],
      right: [],
      continuation: [],
    });
  }

  return pages;
}
