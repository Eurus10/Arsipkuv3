import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak,
  ImageRun,
  SectionType,
  TabStopType,
  TabStopPosition,
} from 'docx';
import {
  EvaluationBlueprint,
  EvaluationQuestionPackage,
  EvaluationQuestion,
} from '../../types/evaluationTypes';
import {
  getExamTitleParts,
} from './evaluationLayoutEngine';

export interface ExportWordOptions {
  schoolHeaderImage?: string | null;
  headerHeightRatio?: number;
  settings?: {
    fontSize?: number;
    instructionFontSize?: number;
    previewLayout?: 'two-column' | 'one-column';
    showIdentity?: boolean;
    showInstructions?: boolean;
    showHeader?: boolean;
    headerHeightRatio?: number; // 0.15 - 0.45 or custom multiplier
  };
}

function base64ToUint8Array(base64: string): Uint8Array {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function getImageNaturalDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  // First try direct fast decoding from base64 header if possible
  try {
    const rawBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const binary = base64ToUint8Array(rawBase64);
    // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      binary.length > 24 &&
      binary[0] === 0x89 &&
      binary[1] === 0x50 &&
      binary[2] === 0x4e &&
      binary[3] === 0x47
    ) {
      const width =
        (binary[16] << 24) |
        (binary[17] << 16) |
        (binary[18] << 8) |
        binary[19];
      const height =
        (binary[20] << 24) |
        (binary[21] << 16) |
        (binary[22] << 8) |
        binary[23];
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
  } catch (e) {
    // fallback to Image
  }

  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve({ width: 800, height: 160 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width || 800;
      const h = img.naturalHeight || img.height || 160;
      resolve({ width: w, height: h });
    };
    img.onerror = () => {
      resolve({ width: 800, height: 160 });
    };
    img.src = dataUrl;
  });
}

/**
 * Mengubah URL (baik HTTP/HTTPS maupun Base64) menjadi data byte Uint8Array
 */
async function resolveImageToUint8Array(imageUrl: string): Promise<{ bytes: Uint8Array; imgType: 'png' | 'jpg' } | null> {
  if (!imageUrl) return null;
  try {
    if (imageUrl.startsWith('data:image')) {
      const bytes = base64ToUint8Array(imageUrl);
      const mimeMatch = imageUrl.match(/^data:image\/(\w+);base64,/);
      const imgType =
        mimeMatch && (mimeMatch[1] === 'jpeg' || mimeMatch[1] === 'jpg')
          ? 'jpg'
          : 'png';
      return { bytes, imgType };
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.warn('Gagal fetch gambar dari URL:', imageUrl);
        return null;
      }
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const isJpg = blob.type.includes('jpeg') || blob.type.includes('jpg') || imageUrl.toLowerCase().endsWith('.jpg') || imageUrl.toLowerCase().endsWith('.jpeg');
      return {
        bytes,
        imgType: isJpg ? 'jpg' : 'png',
      };
    }
  } catch (err) {
    console.error('Error resolving image to uint8array:', err);
  }
  return null;
}

async function addQuestionImageIfPresent(docChildren: any[], imageUrl?: string) {
  if (!imageUrl) return;
  try {
    const resolved = await resolveImageToUint8Array(imageUrl);
    if (!resolved) return;

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: 200 },
        spacing: { before: 40, after: 40 },
        children: [
          new ImageRun({
            data: resolved.bytes,
            transformation: {
              width: 170,
              height: 110,
            },
            type: resolved.imgType as any,
          }),
        ],
      })
    );
  } catch (err) {
    console.error('Failed to embed question image:', err);
  }
}

async function addHeaderImageIfPresent(
  docChildren: any[],
  imageUrl?: string | null,
  customHeightRatio?: number
) {
  if (!imageUrl || !imageUrl.startsWith('data:image')) return;
  try {
    const bytes = base64ToUint8Array(imageUrl);
    const mimeMatch = imageUrl.match(/^data:image\/(\w+);base64,/);
    const imgType =
      mimeMatch && (mimeMatch[1] === 'jpeg' || mimeMatch[1] === 'jpg')
        ? 'jpg'
        : 'png';

    const dims = await getImageNaturalDimensions(imageUrl);
    // Lebar halaman F4 tanpa margin kiri-kanan (210mm - 2*12.7mm = 184.6mm ≈ 565 pt / 700px in docx transformation)
    const targetWidth = 565;
    let ratio = dims.width > 0 ? dims.height / dims.width : 0.2;
    if (customHeightRatio && customHeightRatio > 0) {
      ratio = customHeightRatio;
    }
    const calculatedHeight = Math.round(targetWidth * ratio);
    const targetHeight = Math.max(50, Math.min(260, calculatedHeight));

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 70 },
        children: [
          new ImageRun({
            data: bytes,
            transformation: {
              width: targetWidth,
              height: targetHeight,
            },
            type: imgType as any,
          }),
        ],
      })
    );
  } catch (err) {
    console.error('Failed to embed header image:', err);
  }
}

/**
 * EXPORT NASKAH SOAL KE MICROSOFT WORD (.DOCX)
 * Menggunakan Native Multi-Column Word Sections (tanpa tabel) untuk kemudahan editing maksimal di Word.
 */
export async function exportQuestionsToWordDocx(
  pkg: EvaluationQuestionPackage,
  schoolHeaderImageOrOptions?: string | ExportWordOptions
): Promise<void> {
  const options: ExportWordOptions =
    typeof schoolHeaderImageOrOptions === 'string'
      ? { schoolHeaderImage: schoolHeaderImageOrOptions }
      : schoolHeaderImageOrOptions || {};

  const savedHeader =
    typeof window !== 'undefined'
      ? localStorage.getItem('arsipku_evaluation_question_header_v1') ||
        localStorage.getItem('arsipku_evaluation_school_header_v1')
      : null;

  const headerImage =
    options.schoolHeaderImage !== undefined
      ? options.schoolHeaderImage
      : savedHeader;

  const userSettings = options.settings || {};
  const fontSizePt = userSettings.fontSize || 12;
  const instructionFontSizePt = userSettings.instructionFontSize || 9;
  const previewLayout = userSettings.previewLayout || 'two-column';
  const showHeader = userSettings.showHeader !== false;
  const showIdentity = userSettings.showIdentity !== false;
  const showInstructions = userSettings.showInstructions !== false;

  const FONT = 'Times New Roman';
  const BODY = fontSizePt * 2; // docx uses half-points (12pt = 24)
  const SMALL = instructionFontSizePt * 2; // 9pt = 18
  const TITLE = 24; // 12pt bold

  const examTitleParts = getExamTitleParts(pkg.examType);

  const pageSetup = {
    size: {
      width: 11906, // F4 width 210mm
      height: 18708, // F4 height 330mm
    },
    margin: {
      top: 720,
      right: 720,
      bottom: 720,
      left: 720,
    },
  };

  // --------------------------------------------------------
  // KELOMPOK SOAL BERDASARKAN TIPE
  // --------------------------------------------------------
  const pgQuestions = (pkg.questions || []).filter((q) => q.type === 'PG');
  const isianQuestions = (pkg.questions || []).filter((q) => q.type === 'ISIAN');
  const matchingQuestions = (pkg.questions || []).filter((q) => q.type === 'MENJODOHKAN');
  const uraianQuestions = (pkg.questions || []).filter((q) => q.type === 'URAIAN');

  // ========================================================
  // SECTION 1: HEADER, JUDUL, IDENTITAS, PETUNJUK (1 KOLOM)
  // ========================================================
  const section1Children: any[] = [];

  // 1. KOP SEKOLAH
  if (showHeader && headerImage) {
    await addHeaderImageIfPresent(section1Children, headerImage);
  }

  // 2. JUDUL UJIAN
  if (showHeader) {
    section1Children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 15, line: 240 },
        children: [
          new TextRun({
            text: examTitleParts.headerTitle || `SOAL ${examTitleParts.fullName} (${examTitleParts.acronym})`,
            font: FONT,
            size: TITLE,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 15, line: 240 },
        children: [
          new TextRun({
            text: 'LINGKUP MATERI KURIKULUM MERDEKA',
            font: FONT,
            size: TITLE,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 70, line: 240 },
        children: [
          new TextRun({
            text: `TAHUN PELAJARAN ${pkg.schoolYear || '2025 - 2026'}`,
            font: FONT,
            size: TITLE,
            bold: true,
          }),
        ],
      })
    );
  }

  // 3. IDENTITAS PESERTA — TABULASI PRESISI 6 KOLOM DENGAN TITIK DUA LURUS
  if (showIdentity) {
    section1Children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        },
        rows: [
          // Baris 1: MATA PELAJARAN / NAMA
          new TableRow({
            children: [
              new TableCell({
                width: { size: 21, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 60, right: 10 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: 'MATA PELAJARAN', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 3, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 10 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: ':', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 40 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: pkg.subjectName || '-', font: FONT, size: 20 }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 14, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 40, right: 10 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: 'NAMA', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 3, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 10 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: ':', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 31, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 60 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: '........................................', font: FONT, size: 20 }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          // Baris 2: HARI/TANGGAL / NIS/NISN
          new TableRow({
            children: [
              new TableCell({
                width: { size: 21, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 60, right: 10 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: 'HARI / TANGGAL', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 3, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 10 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: ':', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 40 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: '........................................', font: FONT, size: 20 }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 14, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 40, right: 10 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: 'NIS / NISN', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 3, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 10 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: ':', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 31, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 60 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: '........................................', font: FONT, size: 20 }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          // Baris 3: WAKTU / KELAS
          new TableRow({
            children: [
              new TableCell({
                width: { size: 21, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 60, right: 10 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: 'WAKTU', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 3, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 10 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: ':', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 40 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: '........................................', font: FONT, size: 20 }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 14, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 40, right: 10 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: 'KELAS', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 3, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 10 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: ':', font: FONT, size: 20, bold: true }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 31, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 0, right: 60 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0, line: 220 },
                    children: [
                      new TextRun({ text: pkg.className || '-', font: FONT, size: 20 }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 50 }, children: [] })
    );
  }

  // 4. PETUNJUK PENGERJAAN
  if (showInstructions) {
    section1Children.push(
      new Paragraph({
        spacing: { before: 40, after: 20, line: 230 },
        children: [
          new TextRun({
            text: 'Petunjuk :',
            font: FONT,
            size: SMALL,
            italics: true,
            underline: {},
          }),
        ],
      }),
      ...[
        '1. Berdo’alah sebelum mengerjakan soal !',
        '2. Tulislah namamu pada pojok kanan bagian atas !',
        '3. Bacalah setiap soal dengan teliti !',
        '4. Kerjakanlah terlebih dahulu soal yang kamu anggap mudah !',
        '5. Periksa kembali hasil pekerjaanmu sebelum diserahkan kepada pengawas !',
      ].map(
        (text) =>
          new Paragraph({
            indent: { left: 240 },
            spacing: { before: 0, after: 10, line: 210 },
            children: [
              new TextRun({
                text,
                font: FONT,
                size: SMALL,
                italics: true,
              }),
            ],
          })
      ),
      new Paragraph({
        spacing: { before: 30, after: 60 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        },
        children: [],
      })
    );
  }

  // 5. JUDUL BAGIAN A (1 KOLOM LEBAR PENUH DI ATAS SOAL NO. 1)
  if (pgQuestions.length > 0) {
    const optionCount = Array.isArray(pgQuestions[0]?.options)
      ? pgQuestions[0].options.length
      : 3;
    const letterOptions =
      optionCount >= 4 ? 'a, b, c, atau d' : 'a, b, atau c';

    section1Children.push(
      new Paragraph({
        spacing: { before: 40, after: 30, line: 240 },
        children: [
          new TextRun({
            text: `A. Berilah tanda silang ( X ) pada huruf ${letterOptions} di depan jawaban yang paling tepat !`,
            font: FONT,
            size: BODY,
            bold: true,
          }),
        ],
      })
    );
  }

  // ========================================================
  // SECTION 2: BAGIAN A — PILIHAN GANDA (NATIVE 2 KOLOM DIMULAI DARI SOAL NO. 1)
  // ========================================================
  const section2Children: any[] = [];

  if (pgQuestions.length > 0) {
    for (let idx = 0; idx < pgQuestions.length; idx++) {
      const q = pgQuestions[idx];
      const num = q.number || q.globalNumber || idx + 1;
      section2Children.push(
        new Paragraph({
          spacing: { before: 30, after: 15, line: 240 },
          indent: { left: 340, hanging: 340 },
          children: [
            new TextRun({
              text: `${num}. `,
              font: FONT,
              size: BODY,
            }),
            new TextRun({
              text: q.questionText || '',
              font: FONT,
              size: BODY,
            }),
          ],
        })
      );

      if (q.questionImage) {
        await addQuestionImageIfPresent(section2Children, q.questionImage);
      }

      if (Array.isArray(q.options) && q.options.length > 0) {
        // Cek apakah opsi tergolong pendek dan bisa dibuat 2 sub-kolom (tabulasi kiri-kanan)
        const allShort = q.options.every(
          (opt) =>
            typeof opt.text === 'string' &&
            opt.text.trim().length <= 22 &&
            !opt.text.includes('\n')
        );

        if (allShort && q.options.length >= 3 && q.options.length <= 4) {
          // Pola Tabulasi Kompak: Baris 1: A dan C, Baris 2: B dan D (atau A & B jika 3 opsi)
          const optA = q.options[0];
          const optB = q.options[1];
          const optC = q.options[2];
          const optD = q.options[3];

          // Baris 1: A & C
          const row1Runs: TextRun[] = [];
          if (optA) {
            row1Runs.push(
              new TextRun({
                text: `${optA.key}. `,
                font: FONT,
                size: BODY,
              }),
              new TextRun({
                text: optA.text || '',
                font: FONT,
                size: BODY,
              })
            );
          }
          if (optC) {
            row1Runs.push(
              new TextRun({ text: '\t' }),
              new TextRun({
                text: `${optC.key}. `,
                font: FONT,
                size: BODY,
              }),
              new TextRun({
                text: optC.text || '',
                font: FONT,
                size: BODY,
              })
            );
          }

          section2Children.push(
            new Paragraph({
              indent: { left: 340 },
              tabStops: [{ type: TabStopType.LEFT, position: 2800 }],
              spacing: { before: 0, after: 3, line: 220 },
              children: row1Runs,
            })
          );

          // Baris 2: B & D
          const row2Runs: TextRun[] = [];
          if (optB) {
            row2Runs.push(
              new TextRun({
                text: `${optB.key}. `,
                font: FONT,
                size: BODY,
              }),
              new TextRun({
                text: optB.text || '',
                font: FONT,
                size: BODY,
              })
            );
          }
          if (optD) {
            row2Runs.push(
              new TextRun({ text: '\t' }),
              new TextRun({
                text: `${optD.key}. `,
                font: FONT,
                size: BODY,
              }),
              new TextRun({
                text: optD.text || '',
                font: FONT,
                size: BODY,
              })
            );
          }

          if (row2Runs.length > 0) {
            section2Children.push(
              new Paragraph({
                indent: { left: 340 },
                tabStops: [{ type: TabStopType.LEFT, position: 2800 }],
                spacing: { before: 0, after: 5, line: 220 },
                children: row2Runs,
              })
            );
          }
        } else {
          // Format standar vertikal 1 kolom (Indentasi opsi 0,6 cm = 340 twips, sejajar huruf pertama soal)
          q.options.forEach((opt) => {
            section2Children.push(
              new Paragraph({
                indent: { left: 620, hanging: 280 },
                spacing: { before: 0, after: 5, line: 220 },
                children: [
                  new TextRun({
                    text: `${opt.key}. `,
                    font: FONT,
                    size: BODY,
                  }),
                  new TextRun({
                    text: opt.text || '',
                    font: FONT,
                    size: BODY,
                  }),
                ],
              })
            );
          });
        }
      }
    }
  }

  // ========================================================
  // SECTION 3: BAGIAN B/C/D (NATIVE 1 KOLOM CONTINUOUS TANPA TABEL)
  // ========================================================
  const section3Children: any[] = [];

  // BAGIAN B — ISIAN SINGKAT (FULL BOLD)
  if (isianQuestions.length > 0) {
    section3Children.push(
      new Paragraph({
        spacing: { before: 80, after: 30, line: 240 },
        children: [
          new TextRun({
            text: 'B. Isilah titik-titik berikut ini dengan jawaban yang benar !',
            font: FONT,
            size: BODY,
            bold: true,
          }),
        ],
      })
    );

    for (let idx = 0; idx < isianQuestions.length; idx++) {
      const q = isianQuestions[idx];
      const num = q.number || q.globalNumber || idx + 1;
      section3Children.push(
        new Paragraph({
          spacing: { before: 30, after: 20, line: 240 },
          indent: { left: 340, hanging: 340 },
          children: [
            new TextRun({
              text: `${num}. `,
              font: FONT,
              size: BODY,
            }),
            new TextRun({
              text:
                q.questionText ||
                '................................................................................................',
              font: FONT,
              size: BODY,
            }),
          ],
        })
      );
      if (q.questionImage) {
        await addQuestionImageIfPresent(section3Children, q.questionImage);
      }
    }
  }

  // BAGIAN C — MENJODOHKAN (FULL BOLD)
  if (matchingQuestions.length > 0) {
    section3Children.push(
      new Paragraph({
        spacing: { before: 80, after: 30, line: 240 },
        children: [
          new TextRun({
            text: 'C. Pasangkan kalimat-kalimat berikut dengan tepat!',
            font: FONT,
            size: BODY,
            bold: true,
          }),
        ],
      })
    );

    for (let idx = 0; idx < matchingQuestions.length; idx++) {
      const q = matchingQuestions[idx];
      const num = q.number || q.globalNumber || idx + 1;
      section3Children.push(
        new Paragraph({
          spacing: { before: 30, after: 20, line: 240 },
          indent: { left: 340, hanging: 340 },
          children: [
            new TextRun({
              text: `${num}. `,
              font: FONT,
              size: BODY,
            }),
            new TextRun({
              text: q.questionText || '',
              font: FONT,
              size: BODY,
            }),
          ],
        })
      );

      if (q.questionImage) {
        await addQuestionImageIfPresent(section3Children, q.questionImage);
      }

      if (q.matchingData) {
        const maxItems = Math.max(
          q.matchingData.left.length,
          q.matchingData.right.length
        );
        const matchingRows: TableRow[] = [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 60, right: 60 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Kolom A',
                        font: FONT,
                        size: SMALL,
                        bold: true,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40, left: 60, right: 60 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Kolom B',
                        font: FONT,
                        size: SMALL,
                        bold: true,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ];

        for (let r = 0; r < maxItems; r++) {
          const l = q.matchingData.left[r];
          const rr = q.matchingData.right[r];
          matchingRows.push(
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  margins: { top: 30, bottom: 30, left: 60, right: 60 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: l ? `${l.id}. ` : '',
                          font: FONT,
                          size: SMALL,
                          bold: true,
                        }),
                        new TextRun({
                          text: l?.text || '',
                          font: FONT,
                          size: SMALL,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  margins: { top: 30, bottom: 30, left: 60, right: 60 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: rr ? `${rr.id}. ` : '',
                          font: FONT,
                          size: SMALL,
                          bold: true,
                        }),
                        new TextRun({
                          text: rr?.text || '',
                          font: FONT,
                          size: SMALL,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            })
          );
        }

        section3Children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
              bottom: {
                style: BorderStyle.SINGLE,
                size: 4,
                color: '888888',
              },
              left: {
                style: BorderStyle.SINGLE,
                size: 4,
                color: '888888',
              },
              right: {
                style: BorderStyle.SINGLE,
                size: 4,
                color: '888888',
              },
              insideHorizontal: {
                style: BorderStyle.SINGLE,
                size: 3,
                color: 'CCCCCC',
              },
              insideVertical: {
                style: BorderStyle.SINGLE,
                size: 3,
                color: 'CCCCCC',
              },
            },
            rows: matchingRows,
          })
        );
      }
    }
  }

  // BAGIAN D — URAIAN (FULL BOLD)
  if (uraianQuestions.length > 0) {
    section3Children.push(
      new Paragraph({
        spacing: { before: 80, after: 30, line: 240 },
        children: [
          new TextRun({
            text: 'D. Jawablah pertanyaan berikut dengan tepat!',
            font: FONT,
            size: BODY,
            bold: true,
          }),
        ],
      })
    );

    for (let idx = 0; idx < uraianQuestions.length; idx++) {
      const q = uraianQuestions[idx];
      const num = q.number || q.globalNumber || idx + 1;
      section3Children.push(
        new Paragraph({
          spacing: { before: 40, after: 20, line: 240 },
          indent: { left: 340, hanging: 340 },
          children: [
            new TextRun({
              text: `${num}. `,
              font: FONT,
              size: BODY,
            }),
            new TextRun({
              text: q.questionText || '',
              font: FONT,
              size: BODY,
            }),
          ],
        })
      );
      if (q.questionImage) {
        await addQuestionImageIfPresent(section3Children, q.questionImage);
      }
      for (let i = 0; i < 3; i++) {
        section3Children.push(
          new Paragraph({
            spacing: { before: 12, after: 10 },
            children: [
              new TextRun({
                text:
                  '........................................................................................................................................',
                font: FONT,
                size: SMALL,
                color: '666666',
              }),
            ],
          })
        );
      }
    }
  }

  // ========================================================
  // SECTION 4: KUNCI JAWABAN & PEDOMAN PENSKORAN (1 KOLOM, HALAMAN BARU)
  // ========================================================
  const section4Children: any[] = [];

  section4Children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: 'KUNCI JAWABAN & PEDOMAN PENSKORAN',
          font: FONT,
          size: 24,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 90 },
      children: [
        new TextRun({
          text: `${pkg.subjectName} - ${pkg.className} (${examTitleParts.acronym})`,
          font: FONT,
          size: SMALL,
          bold: true,
        }),
      ],
    })
  );

  const answerRows: TableRow[] = [
    new TableRow({
      children: ['No', 'Bentuk Soal', 'Kunci Jawaban', 'Pembahasan / Rubrik'].map(
        (text, i) =>
          new TableCell({
            width: {
              size: i === 0 ? 8 : i === 1 ? 20 : i === 2 ? 20 : 52,
              type: WidthType.PERCENTAGE,
            },
            margins: { top: 45, bottom: 45, left: 55, right: 55 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text, font: FONT, size: SMALL, bold: true }),
                ],
              }),
            ],
          })
      ),
    }),
  ];

  (pkg.questions || []).forEach((q, idx) => {
    let form = 'Uraian';
    if (q.type === 'PG') form = `PG (No. ${q.number || idx + 1})`;
    else if (q.type === 'ISIAN') form = `Isian (No. ${q.number || idx + 1})`;
    else if (q.type === 'MENJODOHKAN')
      form = `Menjodohkan (No. ${q.number || idx + 1})`;

    answerRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            margins: { top: 35, bottom: 35, left: 45, right: 45 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(idx + 1),
                    font: FONT,
                    size: SMALL,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            margins: { top: 35, bottom: 35, left: 55, right: 55 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: form, font: FONT, size: SMALL }),
                ],
              }),
            ],
          }),
          new TableCell({
            margins: { top: 35, bottom: 35, left: 55, right: 55 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: q.answerKey || '-',
                    font: FONT,
                    size: SMALL,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            margins: { top: 35, bottom: 35, left: 55, right: 55 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: q.explanation || '-',
                    font: FONT,
                    size: SMALL,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  });

  section4Children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
        left: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
        right: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 3, color: 'DDDDDD' },
        insideVertical: { style: BorderStyle.SINGLE, size: 3, color: 'DDDDDD' },
      },
      rows: answerRows,
    })
  );

  // ========================================================
  // RAKIT SELURUH SECTIONS DOKUMEN WORD SECARA FLEKSIBEL
  // ========================================================
  const docSections: any[] = [];

  // Section 1 (1 Kolom): Header, Judul, Identitas, Petunjuk
  if (section1Children.length > 0) {
    docSections.push({
      properties: {
        page: pageSetup,
      },
      children: section1Children,
    });
  }

  // Section 2 (2 Kolom Native Word): Bagian A (PG)
  if (section2Children.length > 0) {
    docSections.push({
      properties: {
        type: SectionType.CONTINUOUS,
        page: pageSetup,
        column: {
          count: previewLayout === 'one-column' ? 1 : 2,
          space: 720,
        },
      },
      children: section2Children,
    });
  }

  // Section 3 (1 Kolom Native Word): Bagian B, C, D
  if (section3Children.length > 0) {
    docSections.push({
      properties: {
        type: SectionType.CONTINUOUS,
        page: pageSetup,
        column: {
          count: 1,
        },
      },
      children: section3Children,
    });
  }

  // Section 4 (1 Kolom): Kunci Jawaban (Next Page)
  if (section4Children.length > 0) {
    docSections.push({
      properties: {
        type: SectionType.NEXT_PAGE,
        page: pageSetup,
        column: {
          count: 1,
        },
      },
      children: section4Children,
    });
  }

  const doc = new Document({
    sections: docSections,
  });

  const blob = await Packer.toBlob(doc);
  const safeName = (pkg.subjectName || 'Soal').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Naskah_Soal_${safeName}_${pkg.className || 'Kelas'}_${pkg.examType || 'Ujian'}.docx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * EXPORT KISI-KISI KE MICROSOFT WORD (.DOCX)
 */
export async function exportBlueprintToWordDocx(
  blueprint: EvaluationBlueprint
): Promise<void> {
  const docChildren: any[] = [];

  // Judul Utama Langsung Kisi-Kisi Soal (Tanpa Kop Surat Yayasan/Sekolah)
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: `KISI-KISI SOAL EVALUASI PEMBELAJARAN`,
          font: 'Arial',
          size: 26,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: `TAHUN PELAJARAN ${blueprint.schoolYear || '2026/2027'}`,
          font: 'Arial',
          size: 20,
          bold: true,
        }),
      ],
    })
  );

  // Tabel Identitas Bersih & Rapi
  const identityTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            margins: { top: 30, bottom: 30, left: 0, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Mata Pelajaran', font: 'Arial', size: 19, bold: true })] })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: { top: 30, bottom: 30, left: 0, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `: ${blueprint.subjectName}`, font: 'Arial', size: 19 })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            margins: { top: 30, bottom: 30, left: 0, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Kelas / Semester', font: 'Arial', size: 19, bold: true })] })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: { top: 30, bottom: 30, left: 0, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `: ${blueprint.className} / ${blueprint.semester}`, font: 'Arial', size: 19 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            margins: { top: 30, bottom: 30, left: 0, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Jenis Asesmen', font: 'Arial', size: 19, bold: true })] })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: { top: 30, bottom: 30, left: 0, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `: ${blueprint.examType}`, font: 'Arial', size: 19 })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            margins: { top: 30, bottom: 30, left: 0, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Guru Pengampu', font: 'Arial', size: 19, bold: true })] })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: { top: 30, bottom: 30, left: 0, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `: ${blueprint.teacherName || '-'}`, font: 'Arial', size: 19 })] })],
          }),
        ],
      }),
    ],
  });

  docChildren.push(identityTable);
  docChildren.push(new Paragraph({ spacing: { after: 120 }, children: [] }));

  // Header Tabel Kisi-Kisi
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 40, right: 40 },
          children: [new Paragraph({ children: [new TextRun({ text: 'No', font: 'Arial', size: 17, bold: true })] })],
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Materi Pokok / Bab', font: 'Arial', size: 17, bold: true })] })],
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Capaian Pembelajaran (CP/TP)', font: 'Arial', size: 17, bold: true })] })],
        }),
        new TableCell({
          width: { size: 26, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Indikator Soal', font: 'Arial', size: 17, bold: true })] })],
        }),
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 40, right: 40 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Level', font: 'Arial', size: 17, bold: true })] })],
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 40, right: 40 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Bentuk', font: 'Arial', size: 17, bold: true })] })],
        }),
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 40, right: 40 },
          children: [new Paragraph({ children: [new TextRun({ text: 'No. Naskah', font: 'Arial', size: 17, bold: true })] })],
        }),
      ],
    }),
  ];

  blueprint.items.forEach((item, idx) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            children: [new Paragraph({ children: [new TextRun({ text: `${idx + 1}`, font: 'Arial', size: 16 })] })],
          }),
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [new Paragraph({ children: [new TextRun({ text: item.material, font: 'Arial', size: 16 })] })],
          }),
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [new Paragraph({ children: [new TextRun({ text: item.curriculumGoal || '-', font: 'Arial', size: 16 })] })],
          }),
          new TableCell({
            width: { size: 26, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [new Paragraph({ children: [new TextRun({ text: item.indicator, font: 'Arial', size: 16 })] })],
          }),
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            children: [new Paragraph({ children: [new TextRun({ text: item.cognitiveLevel, font: 'Arial', size: 16 })] })],
          }),
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            children: [new Paragraph({ children: [new TextRun({ text: item.questionForm, font: 'Arial', size: 16 })] })],
          }),
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            children: [new Paragraph({ children: [new TextRun({ text: item.questionNumber, font: 'Arial', size: 16, bold: true })] })],
          }),
        ],
      })
    );
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
    },
    rows: tableRows,
  });

  docChildren.push(table);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = blueprint.subjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Kisi_Kisi_${safeName}_${blueprint.className}_${blueprint.examType}.docx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * EXPORT KISI-KISI KE EXCEL FORMAT RESMI
 */
export function exportBlueprintToExcel(blueprint: EvaluationBlueprint): void {
  const wb = XLSX.utils.book_new();
  const wsData: any[][] = [];

  // Judul Langsung Tanpa Kop
  wsData.push(['KISI-KISI SOAL EVALUASI PEMBELAJARAN']);
  wsData.push([`TAHUN PELAJARAN ${blueprint.schoolYear || '2026/2027'}`]);
  wsData.push([]);

  wsData.push(['Mata Pelajaran', ':', blueprint.subjectName, '', 'Kelas / Semester', ':', `${blueprint.className} / ${blueprint.semester}`]);
  wsData.push(['Guru Pengampu', ':', blueprint.teacherName || '-', '', 'Tahun Pelajaran', ':', blueprint.schoolYear || '2026/2027']);
  wsData.push(['Jenis Ujian', ':', blueprint.examType, '', 'Tanggal Dibuat', ':', blueprint.createdAt.split('T')[0]]);
  wsData.push([]);

  // Header Tabel
  wsData.push(['No', 'Materi Pokok / Bab', 'Capaian Pembelajaran (CP/TP)', 'Indikator Soal', 'Level Kognitif', 'Bentuk Soal', 'No. Soal Naskah']);

  blueprint.items.forEach((item, idx) => {
    wsData.push([
      idx + 1,
      item.material,
      item.curriculumGoal || '-',
      item.indicator,
      item.cognitiveLevel,
      item.questionForm,
      item.questionNumber,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 32 }, { wch: 45 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Kisi-Kisi Soal');
  const safeName = blueprint.subjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Kisi_Kisi_${safeName}_${blueprint.className}_${blueprint.examType}.xlsx`);
}

/**
 * EXPORT NASKAH SOAL KE EXCEL
 */
export function exportQuestionsToExcel(pkg: EvaluationQuestionPackage): void {
  const wb = XLSX.utils.book_new();
  const wsData: any[][] = [];

  wsData.push(['YAYASAN DAARUL FIKRI TIGARAKSA']);
  wsData.push(['SEKOLAH DASAR ISLAM TERPADU (SDIT) AL FIKRI']);
  wsData.push([`NASKAH SOAL EVALUASI ${pkg.examType.toUpperCase()} - ${pkg.subjectName.toUpperCase()}`]);
  wsData.push([]);
  wsData.push(['Kelas', ':', pkg.className, '', 'Tahun Pelajaran', ':', pkg.schoolYear]);
  wsData.push(['Guru Pengampu', ':', pkg.teacherName || '-', '', 'Tanggal', ':', pkg.createdAt.split('T')[0]]);
  wsData.push([]);

  wsData.push(['No', 'Bentuk', 'Teks Butir Soal', 'Pilihan / Pasangan Jawaban', 'Kunci Jawaban', 'Pembahasan / Rubrik']);

  pkg.questions.forEach((q) => {
    let optionsStr = '-';
    if (q.type === 'PG' && q.options) {
      optionsStr = q.options.map((o) => `${o.key}. ${o.text}`).join('\n');
    } else if (q.type === 'MENJODOHKAN' && q.matchingData) {
      const leftStr = q.matchingData.left.map((l) => `${l.id}. ${l.text || '[Gambar]'}`).join('\n');
      const rightStr = q.matchingData.right.map((r) => `${r.id}. ${r.text || '[Gambar]'}`).join('\n');
      optionsStr = `[KOLOM A]\n${leftStr}\n\n[KOLOM B]\n${rightStr}`;
    }

    wsData.push([q.number, q.type, q.questionText, optionsStr, q.answerKey, q.explanation || '-']);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 50 }, { wch: 40 }, { wch: 20 }, { wch: 35 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Naskah Soal & Kunci');
  const safeName = pkg.subjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Naskah_Soal_${safeName}_${pkg.className}_${pkg.examType}.xlsx`);
}

export interface ExportPdfOptions {
  pageSelector?: string;
  filename?: string;
}

/**
 * Helper to sanitize modern CSS colors (oklab, oklch, color-mix, etc.) before html2canvas parses them
 */
function sanitizeModernColorsInClonedDoc(clonedDoc: globalThis.Document): void {
  try {
    const sanitizeText = (text: string): string => {
      if (!text) return '';
      let prev = '';
      let current = text;
      let iterations = 0;
      const modernColorRegex = /(?:oklch|oklab|color-mix|light-dark|lab|lch|color)\([^()]*\)/gi;
      while (prev !== current && iterations < 10) {
        prev = current;
        current = current.replace(modernColorRegex, '#0f172a');
        iterations++;
      }
      return current;
    };

    // 1. Sanitize all <style> tags in cloned document
    const styleElements = clonedDoc.querySelectorAll('style');
    styleElements.forEach((styleEl) => {
      if (styleEl.textContent) {
        styleEl.textContent = sanitizeText(styleEl.textContent);
      }
    });

    // 2. Sanitize inline style attributes
    const allElements = clonedDoc.querySelectorAll('*');
    allElements.forEach((el) => {
      const styleAttr = el.getAttribute('style');
      if (styleAttr) {
        el.setAttribute('style', sanitizeText(styleAttr));
      }
    });

    // 3. Inject CSS variable overrides to prevent color parse errors in html2canvas
    const resetStyle = clonedDoc.createElement('style');
    resetStyle.textContent = `
      * {
        --tw-shadow-color: transparent !important;
        --tw-ring-color: transparent !important;
        --tw-outline-color: transparent !important;
      }
    `;
    clonedDoc.head?.appendChild(resetStyle);
  } catch (err) {
    console.warn('Gagal membersihkan warna modern CSS:', err);
  }
}

/**
 * EXPORT NASKAH SOAL KE PDF (F4 / Standar Dokumen Cetak)
 */
export async function exportQuestionsToPdf(
  pkg: EvaluationQuestionPackage,
  options?: ExportPdfOptions
): Promise<void> {
  const pageSelector = options?.pageSelector || '[data-evaluation-page]';
  const pageElements = Array.from(document.querySelectorAll<HTMLElement>(pageSelector));

  const safeSubject = (pkg.subjectName || 'Evaluasi').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeClass = (pkg.className || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExam = (pkg.examType || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const defaultFilename = `Naskah_Soal_${safeSubject}_${safeClass}_${safeExam}.pdf`;
  const filename = options?.filename || defaultFilename;

  if (pageElements.length === 0) {
    throw new Error('Halaman preview naskah soal tidak ditemukan di layar.');
  }

  // Standar F4: 215mm x 330mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215, 330],
    compress: true,
  });

  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i];

    let canvas: HTMLCanvasElement;
    try {
      canvas = await htmlToImage.toCanvas(pageEl, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
        fontEmbedCSS: '',
      });
    } catch {
      canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        onclone: (clonedDoc) => {
          sanitizeModernColorsInClonedDoc(clonedDoc);
        },
      });
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage([215, 330], 'portrait');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, 215, 330, undefined, 'FAST');
  }

  pdf.save(filename);
}

