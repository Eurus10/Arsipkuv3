import * as XLSX from 'xlsx-js-style';
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
} from 'docx';
import { EvaluationReviewResult } from '../../types/evaluationTypes';

/**
 * EXPORT LAPORAN REVIEW & INTERPRETASI PEDAGOGIS KE MICROSOFT WORD (.DOCX)
 */
export async function exportReviewResultToWord(review: EvaluationReviewResult): Promise<void> {
  const FONT = 'Arial';
  const BORDER_NONE = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  const BORDER_TABLE_SOLID = {
    top: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E5E5E5' },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E5E5E5' },
  };

  // 1. JUDUL LAPORAN DIAGNOSA (Langsung tanpa Kop Yayasan / Sekolah)
  const headerParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120, line: 240 },
      children: [
        new TextRun({
          text: 'LAPORAN DIAGNOSA & INTERPRETASI PEDAGOGIS HASIL ASESMEN',
          font: FONT,
          size: 24,
          bold: true,
          color: '059669',
        }),
      ],
    }),
  ];

  // 2. IDENTITAS EVALUASI
  const identityTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [new Paragraph({ children: [new TextRun({ text: 'Mata Pelajaran', font: FONT, size: 19, bold: true })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [new Paragraph({ children: [new TextRun({ text: `: ${review.subjectName || '-'}`, font: FONT, size: 19 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [new Paragraph({ children: [new TextRun({ text: 'Kelas / Rombel', font: FONT, size: 19, bold: true })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [new Paragraph({ children: [new TextRun({ text: `: Kelas ${review.className || '-'}`, font: FONT, size: 19 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [new Paragraph({ children: [new TextRun({ text: 'Jenis Asesmen', font: FONT, size: 19, bold: true })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [new Paragraph({ children: [new TextRun({ text: `: ${review.examType || '-'}`, font: FONT, size: 19 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [new Paragraph({ children: [new TextRun({ text: 'Tanggal Analisis', font: FONT, size: 19, bold: true })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [new Paragraph({ children: [new TextRun({ text: `: ${review.analyzedAt ? review.analyzedAt.split('T')[0] : new Date().toISOString().split('T')[0]}`, font: FONT, size: 19 })] })],
          }),
        ],
      }),
    ],
  });

  // 3. TABEL 1: RINGKASAN CAPAIAN
  const summaryRows = [
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: 'E6F4EA' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Total Siswa', font: FONT, size: 18, bold: true })] })],
        }),
        new TableCell({
          shading: { fill: 'E6F4EA' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Rata-Rata Nilai', font: FONT, size: 18, bold: true })] })],
        }),
        new TableCell({
          shading: { fill: 'E6F4EA' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nilai Tertinggi', font: FONT, size: 18, bold: true })] })],
        }),
        new TableCell({
          shading: { fill: 'E6F4EA' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nilai Terendah', font: FONT, size: 18, bold: true })] })],
        }),
        new TableCell({
          shading: { fill: 'E6F4EA' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '% Ketuntasan (KKTP)', font: FONT, size: 18, bold: true })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${review.summary.totalStudents}`, font: FONT, size: 20, bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${review.summary.averageScore}`, font: FONT, size: 20, bold: true, color: '0284C7' })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${review.summary.highestScore}`, font: FONT, size: 20, bold: true, color: '059669' })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${review.summary.lowestScore}`, font: FONT, size: 20, bold: true, color: 'DC2626' })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${review.summary.passPercentage}%`, font: FONT, size: 20, bold: true, color: '4F46E5' })] })] }),
      ],
    }),
  ];

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_TABLE_SOLID,
    rows: summaryRows,
  });

  // 4. TABEL 2: BUTIR SOAL YANG PERLU PERHATIAN
  const attentionHeader = new TableRow({
    children: [
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: 'FEE2E2' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No. Soal', font: FONT, size: 18, bold: true })] })] }),
      new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: 'FEE2E2' }, children: [new Paragraph({ children: [new TextRun({ text: 'Materi / Indikator', font: FONT, size: 18, bold: true })] })] }),
      new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: 'FEE2E2' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ketercapaian', font: FONT, size: 18, bold: true })] })] }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { fill: 'FEE2E2' }, children: [new Paragraph({ children: [new TextRun({ text: 'Diagnosa & Rekomendasi Langkah Guru', font: FONT, size: 18, bold: true })] })] }),
    ],
  });

  const attentionRows = (review.attentionQuestions || []).map((q) => {
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `No. ${q.questionNumber}`, font: FONT, size: 18, bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q.material, font: FONT, size: 18, bold: true }), new TextRun({ text: `\n${q.indicator || ''}`, font: FONT, size: 16, italics: true })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${q.successRate ?? '-'}%`, font: FONT, size: 18, bold: true, color: q.priority === 'HIGH' ? 'DC2626' : 'D97706' })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q.diagnosticNote, font: FONT, size: 17 }), new TextRun({ text: `\nLangkah Guru: ${q.recommendedAction}`, font: FONT, size: 17, bold: true })] })] }),
      ],
    });
  });

  const attentionTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_TABLE_SOLID,
    rows: [attentionHeader, ...attentionRows],
  });

  // Tanda Tangan
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Mengetahui,', font: FONT, size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: 'Kepala SDIT Al Fikri', font: FONT, size: 18, bold: true })] }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),
              new Paragraph({ children: [new TextRun({ text: '( _______________________ )', font: FONT, size: 18, bold: true })] }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              new Paragraph({ children: [new TextRun({ text: `Tigaraksa, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, font: FONT, size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: 'Guru Pengampu Mata Pelajaran', font: FONT, size: 18, bold: true })] }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),
              new Paragraph({ children: [new TextRun({ text: '( _______________________ )', font: FONT, size: 18, bold: true })] }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // 2 cm
          },
        },
        children: [
          ...headerParagraphs,
          identityTable,
          new Paragraph({ text: '', spacing: { before: 120, after: 120 } }),

          // 1. Ringkasan Capaian
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: '1. Ringkasan Capaian Hasil Asesmen', font: FONT, size: 20, bold: true, color: '059669' })],
          }),
          summaryTable,
          new Paragraph({
            spacing: { before: 60, after: 120 },
            children: [new TextRun({ text: `Kesimpulan Umum: ${review.summary.generalConclusion}`, font: FONT, size: 18, italics: true })],
          }),

          // 2. Butir Soal yang Perlu Perhatian
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: '2. Butir Soal yang Memerlukan Perhatian Khusus', font: FONT, size: 20, bold: true, color: 'DC2626' })],
          }),
          attentionTable,
          new Paragraph({ text: '', spacing: { before: 120, after: 120 } }),

          // 3. Materi yang Perlu Diperkuat
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: '3. Materi yang Perlu Diperkuat (Remedial Focus)', font: FONT, size: 20, bold: true, color: 'D97706' })],
          }),
          ...(review.materialsNeedingReinforcement || []).map(
            (m) =>
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 30, after: 30 },
                children: [
                  new TextRun({ text: `${m.material}: `, font: FONT, size: 18, bold: true }),
                  new TextRun({ text: `${m.observation} `, font: FONT, size: 18 }),
                  new TextRun({ text: `[Saran: ${m.actionableAdvice}]`, font: FONT, size: 18, italics: true, color: '4F46E5' }),
                ],
              })
          ),

          // 4. Indikator yang Perlu Bimbingan
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: '4. Indikator yang Memerlukan Bimbingan Intensif', font: FONT, size: 20, bold: true, color: '0284C7' })],
          }),
          ...(review.indicatorsNeedingGuidance || []).map(
            (ind) =>
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 30, after: 30 },
                children: [
                  new TextRun({ text: `${ind.indicator}: `, font: FONT, size: 18, bold: true }),
                  new TextRun({ text: ind.note, font: FONT, size: 18 }),
                ],
              })
          ),

          // 5. Temuan Pola Kesalahan
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: '5. Temuan Pola Kesalahan Peserta Didik', font: FONT, size: 20, bold: true, color: '7C3AED' })],
          }),
          ...(review.keyFindings || []).map(
            (f) =>
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 30, after: 30 },
                children: [new TextRun({ text: f, font: FONT, size: 18 })],
              })
          ),

          // 6. Rekomendasi Tindak Lanjut Guru
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: '6. Rekomendasi Tindak Lanjut Guru (Action Plan)', font: FONT, size: 20, bold: true, color: '059669' })],
          }),
          ...(review.followUpRecommendations || []).map(
            (r) =>
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 30, after: 30 },
                children: [new TextRun({ text: r, font: FONT, size: 18, bold: true })],
              })
          ),

          new Paragraph({ text: '', spacing: { before: 200, after: 200 } }),
          signatureTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeSubj = (review.subjectName || 'Mapel').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeCls = (review.className || 'Kelas').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExam = (review.examType || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Laporan_Diagnosa_Pedagogis_${safeSubj}_${safeCls}_${safeExam}.docx`;

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
 * EXPORT LAPORAN REVIEW KE MICROSOFT EXCEL (.XLSX)
 */
export function exportReviewResultToExcel(review: EvaluationReviewResult): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Ringkasan & Butir Perhatian
  const wsData: any[][] = [];
  wsData.push(['LAPORAN DIAGNOSA & INTERPRETASI PEDAGOGIS HASIL ASESMEN']);
  wsData.push([]);
  wsData.push(['Mata Pelajaran', ':', review.subjectName, '', 'Kelas', ':', review.className]);
  wsData.push(['Jenis Ujian', ':', review.examType, '', 'Tanggal Analisis', ':', review.analyzedAt.split('T')[0]]);
  wsData.push([]);

  // Ringkasan
  wsData.push(['METRIK CAPAIAN PEMBELAJARAN']);
  wsData.push(['Total Siswa', 'Rata-Rata Nilai', 'Nilai Tertinggi', 'Nilai Terendah', '% Ketuntasan (KKTP)']);
  wsData.push([
    review.summary.totalStudents,
    review.summary.averageScore,
    review.summary.highestScore,
    review.summary.lowestScore,
    `${review.summary.passPercentage}%`,
  ]);
  wsData.push(['Kesimpulan Umum', review.summary.generalConclusion]);
  wsData.push([]);

  // Butir Soal Perhatian
  wsData.push(['BUTIR SOAL YANG MEMERLUKAN PERHATIAN KHUSUS']);
  wsData.push(['No. Soal', 'Materi', 'Indikator', 'Ketercapaian (%)', 'Prioritas', 'Diagnosa Masalah Siswa', 'Rekomendasi Langkah Guru']);
  (review.attentionQuestions || []).forEach((q) => {
    wsData.push([
      q.questionNumber,
      q.material,
      q.indicator || '-',
      `${q.successRate ?? '-'}%`,
      q.priority,
      q.diagnosticNote,
      q.recommendedAction,
    ]);
  });
  wsData.push([]);

  // Materi & Indikator
  wsData.push(['MATERI YANG PERLU DIPERKUAT']);
  wsData.push(['Materi Pokok', 'Tingkat Kebutuhan', 'Observasi Lapangan', 'Saran Aksi']);
  (review.materialsNeedingReinforcement || []).forEach((m) => {
    wsData.push([m.material, m.status, m.observation, m.actionableAdvice]);
  });
  wsData.push([]);

  wsData.push(['INDIKATOR YANG PERLU BIMBINGAN']);
  wsData.push(['Indikator Kompetensi', 'Catatan Guru']);
  (review.indicatorsNeedingGuidance || []).forEach((ind) => {
    wsData.push([ind.indicator, ind.note]);
  });
  wsData.push([]);

  wsData.push(['TEMUAN POLA KESALAHAN SISWA']);
  (review.keyFindings || []).forEach((f, idx) => {
    wsData.push([idx + 1, f]);
  });
  wsData.push([]);

  wsData.push(['REKOMENDASI TINDAK LANJUT GURU']);
  (review.followUpRecommendations || []).forEach((r, idx) => {
    wsData.push([idx + 1, r]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 45 }, { wch: 45 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Diagnosa Pedagogis');

  const safeSubj = (review.subjectName || 'Mapel').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeCls = (review.className || 'Kelas').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExam = (review.examType || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Laporan_Diagnosa_Pedagogis_${safeSubj}_${safeCls}_${safeExam}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
