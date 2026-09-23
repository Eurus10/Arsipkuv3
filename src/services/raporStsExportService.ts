import XLSX from 'xlsx-js-style';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageBreak,
  HeightRule,
  VerticalAlign,
  ShadingType,
} from 'docx';
import {
  RaporStsClassData,
  RaporSubject,
  StudentScoreDetail,
} from '../types/raporSts';
import { Student } from './studentStorage';

/**
 * Helper to preserve and format Indonesian academic degrees
 */
export const formatPersonNameWithDegree = (rawName?: string): string => {
  if (!rawName || !rawName.trim()) return '';
  let name = rawName.trim();

  const degreeMap: [RegExp, string][] = [
    [/\bS\.?Pd\.?I\.?\b/gi, 'S.Pd.I.'],
    [/\bS\.?Pd\.?\b/gi, 'S.Pd.'],
    [/\bM\.?Pd\.?I\.?\b/gi, 'M.Pd.I.'],
    [/\bM\.?Pd\.?\b/gi, 'M.Pd.'],
    [/\bS\.?Ag\.?\b/gi, 'S.Ag.'],
    [/\bM\.?Ag\.?\b/gi, 'M.Ag.'],
    [/\bS\.?Kom\.?\b/gi, 'S.Kom.'],
    [/\bM\.?Kom\.?\b/gi, 'M.Kom.'],
    [/\bS\.?T\.?\b/gi, 'S.T.'],
    [/\bM\.?T\.?\b/gi, 'M.T.'],
    [/\bS\.?Si\.?\b/gi, 'S.Si.'],
    [/\bM\.?Si\.?\b/gi, 'M.Si.'],
    [/\bS\.?Sos\.?\b/gi, 'S.Sos.'],
    [/\bM\.?Sos\.?\b/gi, 'M.Sos.'],
    [/\bS\.?E\.?\b/gi, 'S.E.'],
    [/\bM\.?M\.?\b/gi, 'M.M.'],
    [/\bM\.?B\.?A\.?\b/gi, 'M.B.A.'],
    [/\bDrs\.?\b/gi, 'Drs.'],
    [/\bDra\.?\b/gi, 'Dra.'],
    [/\bDr\.?\b/gi, 'Dr.'],
    [/\bProf\.?\b/gi, 'Prof.'],
    [/\bHj\.?\b/gi, 'Hj.'],
    [/\bH\.\b/gi, 'H.'],
  ];

  const isAllCaps = name === name.toUpperCase() && /[A-Z]/.test(name);
  if (isAllCaps) {
    const parts = name.split(',');
    const baseName = parts[0]
      .toLowerCase()
      .split(' ')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ');
    const degreePart = parts.slice(1).join(',');
    name = degreePart ? `${baseName}, ${degreePart.trim()}` : baseName;
  }

  for (const [regex, replacement] of degreeMap) {
    name = name.replace(regex, replacement);
  }

  return name;
};

// Helper for Tempat, Tanggal Lahir
export const formatStudentTTL = (pob?: string, dob?: string): string => {
  if (!pob && !dob) return '-';
  let formattedDob = dob || '';
  if (
    formattedDob &&
    !isNaN(Number(formattedDob)) &&
    Number(formattedDob) > 20000 &&
    Number(formattedDob) < 60000
  ) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + Number(formattedDob) * 86400000);
    if (!isNaN(d.getTime())) {
      formattedDob = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }
  return [pob, formattedDob].filter(Boolean).join(', ');
};

// Helper for NIM / NISN
export const formatStudentNimNisn = (nim?: string, nisn?: string): string => {
  if (nim && nisn) return `${nim} / ${nisn}`;
  return nim || nisn || '-';
};

/* ============================================================================
 * EXCEL EXPORT SERVICE (.XLSX)
 * ========================================================================== */

const EXCEL_FONT_NAME = 'Bookman Old Style';
const YELLOW_BRIGHT_RGB = 'FDE047'; // Kuning cerah

const BORDER_BLACK_THIN = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

const FILL_YELLOW_STYLE = {
  patternType: 'solid',
  fgColor: { rgb: YELLOW_BRIGHT_RGB },
};

/**
 * Builds a single student's Rapor STS worksheet in an Excel workbook
 */
function buildStudentRaporWorksheet(
  classData: RaporStsClassData,
  student: Student,
  activeSemester: string,
  activeSchoolYear: string
) {
  const { config, subjects, subjectRecords, additionalInfo } = classData;
  const ws: any = {};
  let r = 0;

  const setCell = (rowIdx: number, colIdx: number, val: any, style?: any) => {
    const ref = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
    ws[ref] = {
      v: val,
      t: typeof val === 'number' ? 'n' : 's',
      s: style || {},
    };
  };

  const merges: any[] = [];
  const addMerge = (sR: number, sC: number, eR: number, eC: number) => {
    merges.push({ s: { r: sR, c: sC }, e: { r: eR, c: eC } });
  };

  const semesterTitle =
    activeSemester === '1'
      ? 'SUMATIF TENGAH SEMESTER GANJIL (STS 1)'
      : 'SUMATIF TENGAH SEMESTER GENAP (STS 2)';
  const schoolYearTitle = activeSchoolYear.includes('/')
    ? activeSchoolYear.replace('/', '-')
    : activeSchoolYear;
  const activeClass = config.classLevel || '1A';

  // 1. JUDUL RESMI
  setCell(r, 0, 'LAPORAN', {
    font: { name: EXCEL_FONT_NAME, sz: 12, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);
  r++;

  setCell(r, 0, semesterTitle, {
    font: { name: EXCEL_FONT_NAME, sz: 11, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);
  r++;

  setCell(r, 0, `TAHUN PELAJARAN ${schoolYearTitle}`, {
    font: { name: EXCEL_FONT_NAME, sz: 11, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);
  r += 2; // Spasi

  // 2. IDENTITAS SISWA
  // Baris 1: NAMA (Kiri) | NIM/NISN (Kanan)
  setCell(r, 0, 'NAMA', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  setCell(r, 1, `:  ${student.name.toUpperCase()}`, {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: true },
  });
  setCell(r, 2, 'NIM/NISN', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  setCell(r, 3, `:  ${formatStudentNimNisn(student.nim, student.nisn)}`, {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  r++;

  // Baris 2: TEMPAT, TANGGAL LAHIR (Kiri) | KELAS (Kanan)
  setCell(r, 0, 'TEMPAT, TANGGAL LAHIR', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  setCell(r, 1, `:  ${formatStudentTTL(student.tempatLahir, student.tanggalLahir)}`, {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  setCell(r, 2, 'KELAS', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  setCell(r, 3, `:  ${activeClass}`, {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  r += 2; // Spasi sebelum tabel

  // 3. HEADER TABEL HASIL CAPAIAN KOMPETENSI
  const headerRow1 = r;
  const headerRow2 = r + 1;

  // Kolom 0: NO
  setCell(headerRow1, 0, 'NO', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: true },
    fill: FILL_YELLOW_STYLE,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_BLACK_THIN,
  });
  setCell(headerRow2, 0, '', {
    fill: FILL_YELLOW_STYLE,
    border: BORDER_BLACK_THIN,
  });
  addMerge(headerRow1, 0, headerRow2, 0);

  // Kolom 1: MATA PELAJARAN
  setCell(headerRow1, 1, 'MATA PELAJARAN', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: true },
    fill: FILL_YELLOW_STYLE,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_BLACK_THIN,
  });
  setCell(headerRow2, 1, '', {
    fill: FILL_YELLOW_STYLE,
    border: BORDER_BLACK_THIN,
  });
  addMerge(headerRow1, 1, headerRow2, 1);

  // Kolom 2-3: HASIL CAPAIAN KOMPETENSI
  setCell(headerRow1, 2, 'HASIL CAPAIAN KOMPETENSI', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: true },
    fill: FILL_YELLOW_STYLE,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_BLACK_THIN,
  });
  setCell(headerRow1, 3, '', {
    fill: FILL_YELLOW_STYLE,
    border: BORDER_BLACK_THIN,
  });
  addMerge(headerRow1, 2, headerRow1, 3);

  // Sub-header Kolom 2: NILAI AKHIR
  setCell(headerRow2, 2, 'NILAI AKHIR', {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
    fill: FILL_YELLOW_STYLE,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_BLACK_THIN,
  });

  // Sub-header Kolom 3: CAPAIAN KOMPETENSI
  setCell(headerRow2, 3, 'CAPAIAN KOMPETENSI', {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
    fill: FILL_YELLOW_STYLE,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_BLACK_THIN,
  });

  r += 2;

  // Helper untuk menambahkan baris kategori (Agama, Umum, Mulok)
  const addCategoryHeader = (roman: string, title: string) => {
    setCell(r, 0, roman, {
      font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: true },
      fill: FILL_YELLOW_STYLE,
      alignment: { horizontal: 'center', vertical: 'center' },
      border: BORDER_BLACK_THIN,
    });
    setCell(r, 1, title, {
      font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: true },
      fill: FILL_YELLOW_STYLE,
      border: BORDER_BLACK_THIN,
    });
    setCell(r, 2, '', {
      fill: FILL_YELLOW_STYLE,
      border: BORDER_BLACK_THIN,
    });
    setCell(r, 3, '', {
      fill: FILL_YELLOW_STYLE,
      border: BORDER_BLACK_THIN,
    });
    r++;
  };

  // Helper untuk menambahkan daftar mata pelajaran
  const addSubjectRows = (subjs: RaporSubject[]) => {
    subjs.forEach((subj, idx) => {
      const scoreData: StudentScoreDetail | undefined =
        subjectRecords[subj.id]?.scores[student.id];
      const score = scoreData?.finalScore;
      const desc =
        scoreData?.customDescription ||
        scoreData?.autoDescription ||
        '-';

      // No
      setCell(r, 0, `${idx + 1}.`, {
        font: { name: EXCEL_FONT_NAME, sz: 9, bold: false },
        alignment: { horizontal: 'center', vertical: 'top' },
        border: BORDER_BLACK_THIN,
      });

      // Nama Mapel (Tidak bold, uppercase)
      setCell(r, 1, subj.name.toUpperCase(), {
        font: { name: EXCEL_FONT_NAME, sz: 9, bold: false },
        alignment: { horizontal: 'left', vertical: 'top' },
        border: BORDER_BLACK_THIN,
      });

      // Nilai Akhir
      setCell(r, 2, typeof score === 'number' ? score : '-', {
        font: { name: EXCEL_FONT_NAME, sz: 9, bold: false },
        alignment: { horizontal: 'center', vertical: 'top' },
        border: BORDER_BLACK_THIN,
      });

      // Capaian Kompetensi
      setCell(r, 3, desc, {
        font: { name: EXCEL_FONT_NAME, sz: 8.5, bold: false },
        alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
        border: BORDER_BLACK_THIN,
      });

      r++;
    });
  };

  const agamaSubjects = subjects.filter((s) => s.category === 'agama');
  const umumSubjects = subjects.filter((s) => s.category === 'umum' || !s.category);
  const mulokSubjects = subjects.filter(
    (s) => s.category && s.category !== 'agama' && s.category !== 'umum'
  );

  // I. PENDIDIKAN AGAMA
  addCategoryHeader('I.', 'PENDIDIKAN AGAMA');
  addSubjectRows(agamaSubjects);

  // II. PENDIDIKAN UMUM
  addCategoryHeader('II.', 'PENDIDIKAN UMUM');
  addSubjectRows(umumSubjects);

  // III. MUATAN LOKAL (jika ada)
  if (mulokSubjects.length > 0) {
    addCategoryHeader('III.', 'MUATAN LOKAL');
    addSubjectRows(mulokSubjects);
  }

  r++; // Spasi

  // 4. CATATAN GURU / WALI KELAS
  const subjectNote = Object.values(subjectRecords)
    .map((sr) => sr.scores[student.id]?.teacherNote)
    .find((note) => note && note.trim().length > 0);
  const addInfo = additionalInfo[student.id] || {
    teacherNotes: subjectNote || 'Tingkatkan terus semangat belajarmu dan pertahankan akhlak mulia.',
  };
  const displayNote =
    addInfo.teacherNotes && addInfo.teacherNotes.trim().length > 0
      ? addInfo.teacherNotes
      : 'Tingkatkan terus semangat belajarmu dan pertahankan akhlak mulia.';

  setCell(r, 0, 'CATATAN GURU / WALI KELAS:', {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
  });
  r++;

  setCell(r, 0, `"${displayNote}"`, {
    font: { name: EXCEL_FONT_NAME, sz: 8.5, italic: true },
    alignment: { vertical: 'center', wrapText: true },
    border: BORDER_BLACK_THIN,
  });
  setCell(r, 1, '', { border: BORDER_BLACK_THIN });
  setCell(r, 2, '', { border: BORDER_BLACK_THIN });
  setCell(r, 3, '', { border: BORDER_BLACK_THIN });
  addMerge(r, 0, r + 1, 3);
  r += 3; // Spasi sebelum TTD

  // 5. TANDA TANGAN RESMI
  const datePlace = config.reportDatePlace || 'Tangerang, 20 Maret 2027';
  setCell(r, 3, datePlace, {
    font: { name: EXCEL_FONT_NAME, sz: 9 },
    alignment: { horizontal: 'right' },
  });
  r += 2;

  // Baris Mengetahui Orang Tua & Guru Kelas
  setCell(r, 0, 'Mengetahui,', {
    font: { name: EXCEL_FONT_NAME, sz: 9 },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 1);

  setCell(r, 2, 'Mengetahui,', {
    font: { name: EXCEL_FONT_NAME, sz: 9 },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 2, r, 3);
  r++;

  setCell(r, 0, 'Orang Tua / Wali Siswa', {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 1);

  setCell(r, 2, 'Guru Kelas,', {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 2, r, 3);
  r += 4; // Spasi tanda tangan

  setCell(r, 0, '..................................................', {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 1);

  const teacherFormatted = formatPersonNameWithDegree(config.teacherName || 'Guru Kelas');
  setCell(r, 2, teacherFormatted, {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true, underline: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 2, r, 3);
  r++;

  setCell(r, 2, `NIP. ${config.teacherNip || '-'}`, {
    font: { name: EXCEL_FONT_NAME, sz: 8 },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 2, r, 3);
  r += 2;

  // Kepala Sekolah (Tengah)
  setCell(r, 0, 'Mengetahui,', {
    font: { name: EXCEL_FONT_NAME, sz: 9 },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);
  r++;

  setCell(r, 0, `Kepala Sekolah ${config.schoolName || 'SDIT AL FIKRI'}`, {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);
  r += 4; // Spasi tanda tangan

  const headmasterFormatted = formatPersonNameWithDegree(config.headmasterName || 'Kepala Sekolah');
  setCell(r, 0, headmasterFormatted, {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true, underline: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);
  r++;

  setCell(r, 0, `NIP. ${config.headmasterNip || '-'}`, {
    font: { name: EXCEL_FONT_NAME, sz: 8 },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);

  // Set Kolom Widths
  ws['!cols'] = [
    { wch: 6 },  // Kolom A: NO
    { wch: 34 }, // Kolom B: MATA PELAJARAN
    { wch: 14 }, // Kolom C: NILAI AKHIR
    { wch: 72 }, // Kolom D: CAPAIAN KOMPETENSI
  ];

  ws['!merges'] = merges;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r + 1, c: 3 } });

  return ws;
}

/**
 * Clean sheet name to conform to Excel limits (max 31 chars, no illegal characters)
 */
function sanitizeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[\\/*?[\]:]/g, '').trim();
  const title = `${index + 1}. ${cleaned}`;
  return title.slice(0, 31);
}

/**
 * Export Single Student Rapor to Excel (.xlsx)
 */
export const exportStudentRaporToExcel = (
  classData: RaporStsClassData,
  student: Student,
  activeSemester: string,
  activeSchoolYear: string
): void => {
  const wb = XLSX.utils.book_new();
  const ws = buildStudentRaporWorksheet(classData, student, activeSemester, activeSchoolYear);
  const sheetName = sanitizeSheetName(student.name, 0);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Rapor_STS_${classData.config.classLevel || 'Kelas'}_Sem${activeSemester}_${cleanName}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export Whole Class Rapor to Excel (.xlsx)
 */
export const exportClassRaporToExcel = (
  classData: RaporStsClassData,
  students: Student[],
  activeSemester: string,
  activeSchoolYear: string
): void => {
  const wb = XLSX.utils.book_new();

  students.forEach((student, idx) => {
    const ws = buildStudentRaporWorksheet(classData, student, activeSemester, activeSchoolYear);
    const sheetName = sanitizeSheetName(student.name, idx);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const cleanYear = activeSchoolYear.replace(/[^a-zA-Z0-9]/g, '-');
  const fileName = `Rapor_STS_Kelas_${classData.config.classLevel || 'Kelas'}_Sem${activeSemester}_${cleanYear}_Lengkap.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/* ============================================================================
 * WORD EXPORT SERVICE (.DOCX)
 * ========================================================================== */

const DOCX_FONT_FAMILY = 'Bookman Old Style';
const DOCX_YELLOW_HEX = 'FDE047';

function createDocxStudentSection(
  classData: RaporStsClassData,
  student: Student,
  activeSemester: string,
  activeSchoolYear: string,
  isFirst: boolean
): (Paragraph | Table)[] {
  const { config, subjects, subjectRecords, additionalInfo } = classData;
  const elements: (Paragraph | Table)[] = [];

  if (!isFirst) {
    elements.push(new Paragraph({ children: [new PageBreak()] }));
  }

  const semesterTitle =
    activeSemester === '1'
      ? 'SUMATIF TENGAH SEMESTER GANJIL (STS 1)'
      : 'SUMATIF TENGAH SEMESTER GENAP (STS 2)';
  const schoolYearTitle = activeSchoolYear.includes('/')
    ? activeSchoolYear.replace('/', '-')
    : activeSchoolYear;
  const activeClass = config.classLevel || '1A';

  // 1. JUDUL
  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'LAPORAN',
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 24, // 12pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: semesterTitle,
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 22, // 11pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `TAHUN PELAJARAN ${schoolYearTitle}`,
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 22, // 11pt
        }),
      ],
    })
  );

  // 2. IDENTITAS SISWA (Tabel 2 kolom tanpa border)
  const identityTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: 'NAMA                               : ',
                    font: DOCX_FONT_FAMILY,
                    size: 19,
                  }),
                  new TextRun({
                    text: student.name.toUpperCase(),
                    bold: true,
                    font: DOCX_FONT_FAMILY,
                    size: 19,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: 'TEMPAT, TANGGAL LAHIR : ',
                    font: DOCX_FONT_FAMILY,
                    size: 19,
                  }),
                  new TextRun({
                    text: formatStudentTTL(student.tempatLahir, student.tanggalLahir),
                    font: DOCX_FONT_FAMILY,
                    size: 19,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: 'NIM/NISN : ',
                    font: DOCX_FONT_FAMILY,
                    size: 19,
                  }),
                  new TextRun({
                    text: formatStudentNimNisn(student.nim, student.nisn),
                    font: DOCX_FONT_FAMILY,
                    size: 19,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: 'KELAS       : ',
                    font: DOCX_FONT_FAMILY,
                    size: 19,
                  }),
                  new TextRun({
                    text: activeClass,
                    font: DOCX_FONT_FAMILY,
                    size: 19,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  elements.push(identityTable);

  // 3. TABEL CAPAIAN KOMPETENSI
  const tableBorder = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const cellBorders = {
    top: tableBorder,
    bottom: tableBorder,
    left: tableBorder,
    right: tableBorder,
  };

  const tableRows: TableRow[] = [];

  // Header Baris 1
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          rowSpan: 2,
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'NO', bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
              ],
            }),
          ],
        }),
        new TableCell({
          rowSpan: 2,
          width: { size: 34, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'MATA PELAJARAN',
                  bold: true,
                  font: DOCX_FONT_FAMILY,
                  size: 18,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          columnSpan: 2,
          width: { size: 60, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'HASIL CAPAIAN KOMPETENSI',
                  bold: true,
                  font: DOCX_FONT_FAMILY,
                  size: 18,
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Header Baris 2
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'NILAI AKHIR',
                  bold: true,
                  font: DOCX_FONT_FAMILY,
                  size: 17,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 46, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'CAPAIAN KOMPETENSI',
                  bold: true,
                  font: DOCX_FONT_FAMILY,
                  size: 17,
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const addDocxCategory = (roman: string, catTitle: string) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: roman, bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: catTitle, bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
            borders: cellBorders,
            children: [new Paragraph({})],
          }),
          new TableCell({
            width: { size: 46, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
            borders: cellBorders,
            children: [new Paragraph({})],
          }),
        ],
      })
    );
  };

  const addDocxSubjects = (subjs: RaporSubject[]) => {
    subjs.forEach((subj, idx) => {
      const scoreData: StudentScoreDetail | undefined =
        subjectRecords[subj.id]?.scores[student.id];
      const score = scoreData?.finalScore;
      const desc =
        scoreData?.customDescription ||
        scoreData?.autoDescription ||
        '-';

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 6, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${idx + 1}.`,
                      font: DOCX_FONT_FAMILY,
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 34, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: subj.name.toUpperCase(),
                      font: DOCX_FONT_FAMILY,
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 14, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: typeof score === 'number' ? `${score}` : '-',
                      font: DOCX_FONT_FAMILY,
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 46, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.BOTH,
                  children: [
                    new TextRun({
                      text: desc,
                      font: DOCX_FONT_FAMILY,
                      size: 16,
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    });
  };

  const agamaSubjects = subjects.filter((s) => s.category === 'agama');
  const umumSubjects = subjects.filter((s) => s.category === 'umum' || !s.category);
  const mulokSubjects = subjects.filter(
    (s) => s.category && s.category !== 'agama' && s.category !== 'umum'
  );

  addDocxCategory('I.', 'PENDIDIKAN AGAMA');
  addDocxSubjects(agamaSubjects);

  addDocxCategory('II.', 'PENDIDIKAN UMUM');
  addDocxSubjects(umumSubjects);

  if (mulokSubjects.length > 0) {
    addDocxCategory('III.', 'MUATAN LOKAL');
    addDocxSubjects(mulokSubjects);
  }

  const scoreTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: tableRows,
  });
  elements.push(scoreTable);

  // 4. CATATAN GURU / WALI KELAS
  const subjectNote = Object.values(subjectRecords)
    .map((sr) => sr.scores[student.id]?.teacherNote)
    .find((note) => note && note.trim().length > 0);
  const addInfo = additionalInfo[student.id] || {
    teacherNotes: subjectNote || 'Tingkatkan terus semangat belajarmu dan pertahankan akhlak mulia.',
  };
  const displayNote =
    addInfo.teacherNotes && addInfo.teacherNotes.trim().length > 0
      ? addInfo.teacherNotes
      : 'Tingkatkan terus semangat belajarmu dan pertahankan akhlak mulia.';

  elements.push(
    new Paragraph({
      spacing: { before: 180, after: 60 },
      children: [
        new TextRun({
          text: 'CATATAN GURU / WALI KELAS:',
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 18,
        }),
      ],
    })
  );

  const noteTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            children: [
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({
                    text: `"${displayNote}"`,
                    italics: true,
                    font: DOCX_FONT_FAMILY,
                    size: 17,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  elements.push(noteTable);

  // 5. TANDA TANGAN
  const datePlace = config.reportDatePlace || 'Tangerang, 20 Maret 2027';
  elements.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 180, after: 120 },
      children: [
        new TextRun({
          text: datePlace,
          font: DOCX_FONT_FAMILY,
          size: 18,
        }),
      ],
    })
  );

  const teacherFormatted = formatPersonNameWithDegree(config.teacherName || 'Guru Kelas');
  const headmasterFormatted = formatPersonNameWithDegree(config.headmasterName || 'Kepala Sekolah');

  const signTable1 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Mengetahui,', font: DOCX_FONT_FAMILY, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 700 }, // Spasi TTD
                children: [
                  new TextRun({ text: 'Orang Tua / Wali Siswa', bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '..................................................',
                    bold: true,
                    font: DOCX_FONT_FAMILY,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Mengetahui,', font: DOCX_FONT_FAMILY, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 700 }, // Spasi TTD
                children: [
                  new TextRun({ text: 'Guru Kelas,', bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: teacherFormatted,
                    bold: true,
                    underline: {},
                    font: DOCX_FONT_FAMILY,
                    size: 18,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `NIP. ${config.teacherNip || '-'}`,
                    font: DOCX_FONT_FAMILY,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  elements.push(signTable1);

  // Kepala Sekolah (Bawah)
  const signTable2 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 180 },
                children: [new TextRun({ text: 'Mengetahui,', font: DOCX_FONT_FAMILY, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 700 }, // Spasi TTD
                children: [
                  new TextRun({
                    text: `Kepala Sekolah ${config.schoolName || 'SDIT AL FIKRI'}`,
                    bold: true,
                    font: DOCX_FONT_FAMILY,
                    size: 18,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: headmasterFormatted,
                    bold: true,
                    underline: {},
                    font: DOCX_FONT_FAMILY,
                    size: 18,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `NIP. ${config.headmasterNip || '-'}`,
                    font: DOCX_FONT_FAMILY,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  elements.push(signTable2);

  return elements;
}

/**
 * Export Single Student Rapor to Word (.docx)
 */
export const exportStudentRaporToWord = async (
  classData: RaporStsClassData,
  student: Student,
  activeSemester: string,
  activeSchoolYear: string
): Promise<void> => {
  const elements = createDocxStudentSection(classData, student, activeSemester, activeSchoolYear, true);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch / ~12.7 mm
              bottom: 720,
              left: 1080,  // 0.75 inch / ~19 mm
              right: 1080,
            },
          },
        },
        children: elements,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Rapor_STS_${classData.config.classLevel || 'Kelas'}_Sem${activeSemester}_${cleanName}.docx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export Whole Class Rapor to Word (.docx)
 */
export const exportClassRaporToWord = async (
  classData: RaporStsClassData,
  students: Student[],
  activeSemester: string,
  activeSchoolYear: string
): Promise<void> => {
  const allElements: (Paragraph | Table)[] = [];

  students.forEach((student, idx) => {
    const studentElements = createDocxStudentSection(
      classData,
      student,
      activeSemester,
      activeSchoolYear,
      idx === 0
    );
    allElements.push(...studentElements);
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 1080,
              right: 1080,
            },
          },
        },
        children: allElements,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanYear = activeSchoolYear.replace(/[^a-zA-Z0-9]/g, '-');
  const fileName = `Rapor_STS_Kelas_${classData.config.classLevel || 'Kelas'}_Sem${activeSemester}_${cleanYear}_Lengkap.docx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
