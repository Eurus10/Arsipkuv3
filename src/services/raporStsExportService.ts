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
  VerticalAlign,
  ShadingType,
} from 'docx';
import {
  RaporStsClassData,
  RaporSubject,
  StudentScoreDetail,
  CharacterDescriptor,
  StudentCharacterRecord,
  DEFAULT_CHARACTER_DESCRIPTORS,
  getScorePredicate,
  getMasteryStatusFromPredicate,
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
  fillType: 'pattern',
  patternType: 'solid',
  fgColor: { rgb: YELLOW_BRIGHT_RGB },
};

/**
 * Build Lembar 1: Laporan Penilaian Akademik Worksheet
 */
function buildAcademicWorksheet(
  classData: RaporStsClassData,
  student: Student,
  activeSemester: string,
  activeSchoolYear: string
): XLSX.WorkSheet {
  const { config, subjects, subjectRecords, additionalInfo } = classData;
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  const rowHeights: XLSX.RowInfo[] = [];
  let r = 0;

  const setCell = (row: number, col: number, val: any, style?: any) => {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    const cell: XLSX.CellObject = {
      v: val !== null && val !== undefined ? val : '',
      t: typeof val === 'number' ? 'n' : 's',
    };
    if (style) {
      (cell as any).s = style;
    }
    ws[cellRef] = cell;
  };

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

  // 1. JUDUL RESMI LEMBAR 1
  setCell(r, 0, 'LAPORAN PENILAIAN AKADEMIK', {
    font: { name: EXCEL_FONT_NAME, sz: 12, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 4);
  r++;

  setCell(r, 0, semesterTitle, {
    font: { name: EXCEL_FONT_NAME, sz: 12, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 4);
  r++;

  setCell(r, 0, `TAHUN PELAJARAN ${schoolYearTitle}`, {
    font: { name: EXCEL_FONT_NAME, sz: 12, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 4);
  r += 2; // Spasi

  // 2. IDENTITAS SISWA
  setCell(r, 0, 'NAMA', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  setCell(r, 1, `:  ${student.name.toUpperCase()}`, {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: true },
  });
  setCell(r, 3, 'NIM/NISN', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  setCell(r, 4, `:  ${formatStudentNimNisn(student.nim, student.nisn)}`, {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  r++;

  setCell(r, 0, 'TEMPAT, TANGGAL LAHIR', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  setCell(r, 1, `:  ${formatStudentTTL(student.tempatLahir, student.tanggalLahir)}`, {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  setCell(r, 3, 'KELAS', {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  setCell(r, 4, `:  ${activeClass}`, {
    font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: false },
  });
  r += 2; // Spasi sebelum tabel

  // 3. HEADER TABEL HASIL CAPAIAN AKADEMIK (NO, MATA PELAJARAN, NILAI AKHIR, PREDIKAT, PENGUASAAN)
  const headerCols = [
    { title: 'NO', w: 6 },
    { title: 'MATA PELAJARAN', w: 32 },
    { title: 'NILAI AKHIR', w: 14 },
    { title: 'PREDIKAT', w: 12 },
    { title: 'PENGUASAAN', w: 22 },
  ];

  headerCols.forEach((col, idx) => {
    setCell(r, idx, col.title, {
      font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: true },
      fill: FILL_YELLOW_STYLE,
      alignment: { horizontal: 'center', vertical: 'center' },
      border: BORDER_BLACK_THIN,
    });
  });
  r++;

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
    setCell(r, 2, '', { fill: FILL_YELLOW_STYLE, border: BORDER_BLACK_THIN });
    setCell(r, 3, '', { fill: FILL_YELLOW_STYLE, border: BORDER_BLACK_THIN });
    setCell(r, 4, '', { fill: FILL_YELLOW_STYLE, border: BORDER_BLACK_THIN });
    addMerge(r, 1, r, 4);
    r++;
  };

  // Helper untuk menambahkan daftar mata pelajaran
  const addSubjectRows = (subjs: RaporSubject[]) => {
    subjs.forEach((subj, idx) => {
      const scoreData: StudentScoreDetail | undefined =
        subjectRecords[subj.id]?.scores[student.id];
      const score = scoreData?.finalScore ?? scoreData?.stsScore ?? null;
      const pred = getScorePredicate(score, config.passingGrade || 75);
      const mastery = getMasteryStatusFromPredicate(pred);

      // No
      setCell(r, 0, `${idx + 1}.`, {
        font: { name: EXCEL_FONT_NAME, sz: 9, bold: false },
        alignment: { horizontal: 'center', vertical: 'top' },
        border: BORDER_BLACK_THIN,
      });

      // Nama Mapel (uppercase)
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

      // Predikat (A/B/C/D)
      setCell(r, 3, pred, {
        font: { name: EXCEL_FONT_NAME, sz: 9, bold: false },
        alignment: { horizontal: 'center', vertical: 'top' },
        border: BORDER_BLACK_THIN,
      });

      // Penguasaan (Sangat Baik / Baik / Cukup / Perlu Bimbingan)
      setCell(r, 4, mastery, {
        font: { name: EXCEL_FONT_NAME, sz: 9, bold: false },
        alignment: { horizontal: 'left', vertical: 'top' },
        border: BORDER_BLACK_THIN,
      });

      rowHeights[r] = { hpt: 20 };
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

  setCell(r, 0, displayNote, {
    font: { name: EXCEL_FONT_NAME, sz: 8.5, italic: true },
    alignment: { vertical: 'center', wrapText: true },
    border: BORDER_BLACK_THIN,
  });
  for (let c = 1; c <= 4; c++) {
    setCell(r, c, '', { border: BORDER_BLACK_THIN });
  }
  addMerge(r, 0, r + 1, 4);
  r += 3; // Spasi sebelum TTD

  // 5. TANDA TANGAN RESMI
  const datePlace = config.reportDatePlace || 'Depok, 20 Maret 2025';
  setCell(r, 3, datePlace, {
    font: { name: EXCEL_FONT_NAME, sz: 9 },
    alignment: { horizontal: 'right' },
  });
  addMerge(r, 3, r, 4);
  r += 2;

  // Baris Mengetahui Orang Tua & Guru Kelas

  setCell(r, 0, 'Orang Tua / Wali Siswa', {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 1);

  setCell(r, 3, 'Guru Kelas,', {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 3, r, 4);
  r += 4; // Spasi tanda tangan

  setCell(r, 0, '..................................................', {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 1);

  const teacherFormatted = formatPersonNameWithDegree(config.teacherName || 'Guru Kelas');
  setCell(r, 3, teacherFormatted, {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true, underline: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 3, r, 4);
  r += 2;

  // Kepala SDIT AL FIKRI (Tengah)
  setCell(r, 0, 'Mengetahui,', {
    font: { name: EXCEL_FONT_NAME, sz: 9 },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 4);
  r++;

  setCell(r, 0, `Kepala ${config.schoolName || 'SDIT AL FIKRI'}`, {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 4);
  r += 4; // Spasi tanda tangan

  const headmasterFormatted = formatPersonNameWithDegree(config.headmasterName || 'Kepala Sekolah');
  setCell(r, 0, headmasterFormatted, {
    font: { name: EXCEL_FONT_NAME, sz: 9, bold: true, underline: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 4);
  r += 2;

  // Running footer Lembar 1 (Italic, Hal 1/2)
  setCell(r, 0, `${student.name} • NISN: ${formatStudentNimNisn(student.nim, student.nisn)} • Kelas ${activeClass} • ${config.schoolName || 'SDIT AL FIKRI'}`, {
    font: { name: EXCEL_FONT_NAME, sz: 8, italic: true },
    alignment: { horizontal: 'left' },
  });
  addMerge(r, 0, r, 3);
  setCell(r, 4, 'Halaman 1/2', {
    font: { name: EXCEL_FONT_NAME, sz: 8, bold: true },
    alignment: { horizontal: 'right' },
  });

  // Set Kolom Widths
  ws['!cols'] = [
    { wch: 6 },  // Kolom A: NO
    { wch: 34 }, // Kolom B: MATA PELAJARAN
    { wch: 14 }, // Kolom C: NILAI AKHIR
    { wch: 12 }, // Kolom D: PREDIKAT
    { wch: 24 }, // Kolom E: PENGUASAAN
  ];

  ws['!rows'] = rowHeights;
  ws['!pageSetup'] = {
    orientation: 'portrait',
    paperSize: 9, // A4
    fitToWidth: 1,
    fitToHeight: 0,
    fitToPage: true,
  };

  ws['!margins'] = {
    left: 0.4,
    right: 0.4,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.2,
  };

  ws['!merges'] = merges;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r + 1, c: 4 } });

  return ws;
}

/**
 * Build Lembar 2: Laporan Penilaian Karakter Worksheet
 */
function buildCharacterWorksheet(
  classData: RaporStsClassData,
  student: Student,
  activeSemester: string,
  activeSchoolYear: string,
  descriptors?: CharacterDescriptor[],
  characterRecords?: Record<string, StudentCharacterRecord>
): XLSX.WorkSheet {
  const { config } = classData;
  const activeDescriptors =
    descriptors && descriptors.length > 0
      ? descriptors
      : classData.customCharacterDescriptors && classData.customCharacterDescriptors.length > 0
      ? classData.customCharacterDescriptors
      : DEFAULT_CHARACTER_DESCRIPTORS;

  const studentCharRecord =
    characterRecords?.[student.id] || classData.characterRecords?.[student.id];

  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  const rowHeights: XLSX.RowInfo[] = [];
  let r = 0;

  const setCell = (row: number, col: number, val: any, style?: any) => {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    const cell: XLSX.CellObject = {
      v: val !== null && val !== undefined ? val : '',
      t: typeof val === 'number' ? 'n' : 's',
    };
    if (style) {
      (cell as any).s = style;
    }
    ws[cellRef] = cell;
  };

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

  // 1. JUDUL RESMI LEMBAR 2
  setCell(r, 0, 'LAPORAN PENILAIAN KARAKTER', {
    font: { name: EXCEL_FONT_NAME, sz: 12, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);
  r++;

  setCell(r, 0, semesterTitle, {
    font: { name: EXCEL_FONT_NAME, sz: 12, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);
  r++;

  setCell(r, 0, `TAHUN PELAJARAN ${schoolYearTitle}`, {
    font: { name: EXCEL_FONT_NAME, sz: 12, bold: true },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);
  r += 2; // Spasi

  // 2. IDENTITAS SISWA
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

  // 3. HEADER TABEL KARAKTER (NO, ASPEK KARAKTER, PREDIKAT, DESKRIPSI)
  const headerCols = [
    { title: 'NO', w: 6 },
    { title: 'ASPEK KARAKTER', w: 26 },
    { title: 'PREDIKAT', w: 12 },
    { title: 'DESKRIPSI CAPAIAN PERKEMBANGAN', w: 56 },
  ];

  headerCols.forEach((col, idx) => {
    setCell(r, idx, col.title, {
      font: { name: EXCEL_FONT_NAME, sz: 9.5, bold: true },
      fill: FILL_YELLOW_STYLE,
      alignment: { horizontal: 'center', vertical: 'center' },
      border: BORDER_BLACK_THIN,
    });
  });
  r++;

  // 4. 18 ASPEK KARAKTER ROWS
  activeDescriptors.forEach((desc, idx) => {
    const charScore = studentCharRecord?.characterScores?.[desc.id];
    const p = charScore?.predicate || '-';
    const d =
      charScore?.description ||
      (charScore?.predicate ? desc.indicators[charScore.predicate] : '-');

    setCell(r, 0, `${idx + 1}.`, {
      font: { name: EXCEL_FONT_NAME, sz: 9, bold: false },
      alignment: { horizontal: 'center', vertical: 'top' },
      border: BORDER_BLACK_THIN,
    });

    setCell(r, 1, desc.name, {
      font: { name: EXCEL_FONT_NAME, sz: 9, bold: true },
      alignment: { horizontal: 'left', vertical: 'top' },
      border: BORDER_BLACK_THIN,
    });

    setCell(r, 2, p, {
      font: { name: EXCEL_FONT_NAME, sz: 9, bold: false },
      alignment: { horizontal: 'center', vertical: 'top' },
      border: BORDER_BLACK_THIN,
    });

    setCell(r, 3, d, {
      font: { name: EXCEL_FONT_NAME, sz: 8.5, bold: false },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: BORDER_BLACK_THIN,
    });

    const descLines = Math.max(1, Math.ceil((d || '').length / 50));
    rowHeights[r] = { hpt: Math.max(18, descLines * 13) };
    r++;
  });

  r++; // Spasi

  // 5. KETERANGAN PREDIKAT
  setCell(r, 0, 'Keterangan Predikat: [A] Sangat Baik   •   [B] Baik   •   [C] Cukup   •   [D] Perlu Bimbingan', {
    font: { name: EXCEL_FONT_NAME, sz: 8.5, bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_BLACK_THIN,
    fill: {
      fillType: 'pattern',
      patternType: 'solid',
      fgColor: { rgb: 'FEF9C3' },
    },
  });
  addMerge(r, 0, r, 3);
  r += 2;

  // Catatan Karakter Wali Kelas jika ada
  if (studentCharRecord?.teacherNote) {
    setCell(r, 0, `Catatan Perkembangan Karakter: ${studentCharRecord.teacherNote}`, {
      font: { name: EXCEL_FONT_NAME, sz: 8.5, italic: true },
      border: BORDER_BLACK_THIN,
    });
    addMerge(r, 0, r, 3);
    r += 2;
  }

  // 6. TANDA TANGAN RESMI
  const datePlace = config.reportDatePlace || 'Depok, 20 Maret 2025';
  setCell(r, 2, datePlace, {
    font: { name: EXCEL_FONT_NAME, sz: 9 },
    alignment: { horizontal: 'right' },
  });
  addMerge(r, 2, r, 3);
  r += 2;

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

  // Kepala SDIT AL FIKRI (Tengah)
  setCell(r, 0, 'Mengetahui,', {
    font: { name: EXCEL_FONT_NAME, sz: 9 },
    alignment: { horizontal: 'center' },
  });
  addMerge(r, 0, r, 3);
  r++;

  setCell(r, 0, `Kepala ${config.schoolName || 'SDIT AL FIKRI'}`, {
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

  // Running footer Lembar 2 (Italic, Hal 2/2)
  setCell(r, 0, `${student.name} • NISN: ${formatStudentNimNisn(student.nim, student.nisn)} • Kelas ${activeClass} • ${config.schoolName || 'SDIT AL FIKRI'}`, {
    font: { name: EXCEL_FONT_NAME, sz: 8, italic: true },
    alignment: { horizontal: 'left' },
  });
  addMerge(r, 0, r, 2);
  setCell(r, 3, 'Halaman 2/2', {
    font: { name: EXCEL_FONT_NAME, sz: 8, bold: true },
    alignment: { horizontal: 'right' },
  });

  // Set Kolom Widths
  ws['!cols'] = [
    { wch: 6 },  // Kolom A: NO
    { wch: 28 }, // Kolom B: ASPEK KARAKTER
    { wch: 12 }, // Kolom C: PREDIKAT
    { wch: 62 }, // Kolom D: DESKRIPSI
  ];

  ws['!rows'] = rowHeights;
  ws['!pageSetup'] = {
    orientation: 'portrait',
    paperSize: 9, // A4
    fitToWidth: 1,
    fitToHeight: 0,
    fitToPage: true,
  };

  ws['!margins'] = {
    left: 0.4,
    right: 0.4,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.2,
  };

  ws['!merges'] = merges;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r + 1, c: 3 } });

  return ws;
}

/**
 * Clean sheet name to conform to Excel limits (max 31 chars, no illegal characters)
 */
function sanitizeSheetName(name: string, prefix = ''): string {
  const cleaned = name.replace(/[\\/*?[\]:]/g, '').trim();
  const title = prefix ? `${prefix} ${cleaned}` : cleaned;
  return title.slice(0, 31);
}

/**
 * Export Single Student Rapor to Excel (.xlsx) — Includes Lembar 1 (Akademik) & Lembar 2 (Karakter)
 */
export const exportStudentRaporToExcel = (
  classData: RaporStsClassData,
  student: Student,
  activeSemester: string,
  activeSchoolYear: string,
  descriptors?: CharacterDescriptor[],
  characterRecords?: Record<string, StudentCharacterRecord>
): void => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Akademik
  const wsAkademik = buildAcademicWorksheet(classData, student, activeSemester, activeSchoolYear);
  XLSX.utils.book_append_sheet(wb, wsAkademik, sanitizeSheetName(student.name, 'Akademik -'));

  // Sheet 2: Karakter
  const wsKarakter = buildCharacterWorksheet(
    classData,
    student,
    activeSemester,
    activeSchoolYear,
    descriptors,
    characterRecords
  );
  XLSX.utils.book_append_sheet(wb, wsKarakter, sanitizeSheetName(student.name, 'Karakter -'));

  const cleanName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Rapor_STS_${classData.config.classLevel || 'Kelas'}_Sem${activeSemester}_${cleanName}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export Whole Class Rapor to Excel (.xlsx) — Includes both Academic & Character sheets per student
 */
export const exportClassRaporToExcel = (
  classData: RaporStsClassData,
  students: Student[],
  activeSemester: string,
  activeSchoolYear: string,
  descriptors?: CharacterDescriptor[],
  characterRecords?: Record<string, StudentCharacterRecord>
): void => {
  const wb = XLSX.utils.book_new();

  students.forEach((student, idx) => {
    // Sheet Akademik
    const wsAkad = buildAcademicWorksheet(classData, student, activeSemester, activeSchoolYear);
    const akadName = sanitizeSheetName(student.name, `${idx + 1}A.`);
    XLSX.utils.book_append_sheet(wb, wsAkad, akadName);

    // Sheet Karakter
    const wsChar = buildCharacterWorksheet(
      classData,
      student,
      activeSemester,
      activeSchoolYear,
      descriptors,
      characterRecords
    );
    const charName = sanitizeSheetName(student.name, `${idx + 1}K.`);
    XLSX.utils.book_append_sheet(wb, wsChar, charName);
  });

  const cleanYear = activeSchoolYear.replace(/[^a-zA-Z0-9]/g, '-');
  const fileName = `Rapor_STS_Kelas_${classData.config.classLevel || 'Kelas'}_Sem${activeSemester}_${cleanYear}_Lengkap.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/* ============================================================================
 * WORD EXPORT SERVICE (.DOCX) — 2 LEMBAR RESMI
 * ========================================================================== */

const DOCX_FONT_FAMILY = 'Bookman Old Style';
const DOCX_YELLOW_HEX = 'FDE047';

function createDocxStudentSection(
  classData: RaporStsClassData,
  student: Student,
  activeSemester: string,
  activeSchoolYear: string,
  isFirst: boolean,
  descriptors?: CharacterDescriptor[],
  characterRecords?: Record<string, StudentCharacterRecord>
): (Paragraph | Table)[] {
  const { config, subjects, subjectRecords, additionalInfo } = classData;
  const elements: (Paragraph | Table)[] = [];

  const activeDescriptors =
    descriptors && descriptors.length > 0
      ? descriptors
      : classData.customCharacterDescriptors && classData.customCharacterDescriptors.length > 0
      ? classData.customCharacterDescriptors
      : DEFAULT_CHARACTER_DESCRIPTORS;

  const studentCharRecord =
    characterRecords?.[student.id] || classData.characterRecords?.[student.id];

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

  const identityBorderNone = { style: BorderStyle.NONE };
  const cellBorderNone = {
    top: identityBorderNone,
    bottom: identityBorderNone,
    left: identityBorderNone,
    right: identityBorderNone,
  };

  const createIdentityTable = () =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: identityBorderNone,
        bottom: identityBorderNone,
        left: identityBorderNone,
        right: identityBorderNone,
        insideHorizontal: identityBorderNone,
        insideVertical: identityBorderNone,
      },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 24, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [new TextRun({ text: 'NAMA', font: DOCX_FONT_FAMILY, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [new TextRun({ text: ':', font: DOCX_FONT_FAMILY, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [
                    new TextRun({
                      text: student.name.toUpperCase(),
                      bold: true,
                      font: DOCX_FONT_FAMILY,
                      size: 19,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 16, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [new TextRun({ text: 'NIM / NISN', font: DOCX_FONT_FAMILY, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [new TextRun({ text: ':', font: DOCX_FONT_FAMILY, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 24, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [
                    new TextRun({
                      text: formatStudentNimNisn(student.nim, student.nisn),
                      font: DOCX_FONT_FAMILY,
                      size: 19,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 24, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
                    new TextRun({
                      text: 'TEMPAT, TANGGAL LAHIR',
                      font: DOCX_FONT_FAMILY,
                      size: 19,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [new TextRun({ text: ':', font: DOCX_FONT_FAMILY, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
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
              width: { size: 16, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [new TextRun({ text: 'KELAS', font: DOCX_FONT_FAMILY, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [new TextRun({ text: ':', font: DOCX_FONT_FAMILY, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 24, type: WidthType.PERCENTAGE },
              borders: cellBorderNone,
              children: [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
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

  const tableBorder = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const cellBorders = {
    top: tableBorder,
    bottom: tableBorder,
    left: tableBorder,
    right: tableBorder,
  };

  /* ============================================================
   * LEMBAR 1: LAPORAN PENILAIAN AKADEMIK
   * ============================================================ */
  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: 'LAPORAN PENILAIAN AKADEMIK',
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 24, // 12pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: semesterTitle,
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 24, // 12pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `TAHUN PELAJARAN ${schoolYearTitle}`,
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 24, // 12pt
        }),
      ],
    })
  );

  elements.push(createIdentityTable());

  // Tabel Akademik (NO, MATA PELAJARAN, NILAI AKHIR, PREDIKAT, PENGUASAAN)
  const akadRows: TableRow[] = [];
  akadRows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'NO', bold: true, font: DOCX_FONT_FAMILY, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 38, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'MATA PELAJARAN', bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 16, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'NILAI AKHIR', bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'PREDIKAT', bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 26, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'PENGUASAAN', bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const addDocxCategory = (roman: string, catTitle: string) => {
    akadRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
            borders: cellBorders,
            verticalAlign: VerticalAlign.CENTER,
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
            columnSpan: 4,
            width: { size: 94, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
            borders: cellBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: catTitle, bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  };

  const addDocxSubjects = (subjs: RaporSubject[]) => {
    subjs.forEach((subj, idx) => {
      const scoreData: StudentScoreDetail | undefined =
        subjectRecords[subj.id]?.scores[student.id];
      const score = scoreData?.finalScore ?? scoreData?.stsScore ?? null;
      const pred = getScorePredicate(score, config.passingGrade || 75);
      const mastery = getMasteryStatusFromPredicate(pred);

      akadRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 6, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: `${idx + 1}.`, font: DOCX_FONT_FAMILY, size: 17 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 38, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: subj.name.toUpperCase(),
                      font: DOCX_FONT_FAMILY,
                      size: 17,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 16, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: typeof score === 'number' ? String(score) : '-',
                      font: DOCX_FONT_FAMILY,
                      size: 17,
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
                      text: pred,
                      bold: false,
                      font: DOCX_FONT_FAMILY,
                      size: 17,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 26, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: mastery,
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

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBorders,
      rows: akadRows,
    })
  );

  // Catatan Guru / Wali Kelas
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
      spacing: { before: 140, after: 40 },
      children: [
        new TextRun({
          text: 'CATATAN GURU / WALI KELAS:',
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 18,
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({
                      text: displayNote,
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
    })
  );

  // Tanda Tangan Resmi
  const datePlace = config.reportDatePlace || 'Depok, 20 Maret 2025';
  elements.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 140, after: 60 },
      children: [new TextRun({ text: datePlace, font: DOCX_FONT_FAMILY, size: 18 })],
    })
  );

  const ttdTable1 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: identityBorderNone,
      bottom: identityBorderNone,
      left: identityBorderNone,
      right: identityBorderNone,
      insideHorizontal: identityBorderNone,
      insideVertical: identityBorderNone,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Mengetahui,', font: DOCX_FONT_FAMILY, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 600 },
                children: [
                  new TextRun({
                    text: 'Orang Tua / Wali Siswa',
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
            borders: cellBorderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Mengetahui,', font: DOCX_FONT_FAMILY, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 600 },
                children: [
                  new TextRun({ text: 'Guru Kelas,', bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: formatPersonNameWithDegree(config.teacherName || 'Guru Kelas'),
                    bold: true,
                    underline: {},
                    font: DOCX_FONT_FAMILY,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const ttdTable2 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: identityBorderNone,
      bottom: identityBorderNone,
      left: identityBorderNone,
      right: identityBorderNone,
      insideHorizontal: identityBorderNone,
      insideVertical: identityBorderNone,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: cellBorderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Mengetahui,', font: DOCX_FONT_FAMILY, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 600 },
                children: [
                  new TextRun({
                    text: `Kepala ${config.schoolName || 'SDIT AL FIKRI'}`,
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
                    text: formatPersonNameWithDegree(config.headmasterName || 'Kepala Sekolah'),
                    bold: true,
                    underline: {},
                    font: DOCX_FONT_FAMILY,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  elements.push(ttdTable1);
  elements.push(new Paragraph({ spacing: { before: 80 } }));
  elements.push(ttdTable2);

  // Running Footer Lembar 1
  elements.push(
    new Paragraph({
      spacing: { before: 180 },
      alignment: AlignmentType.BOTH,
      children: [
        new TextRun({
          text: `${student.name} • NISN: ${formatStudentNimNisn(student.nim, student.nisn)} • Kelas ${activeClass} • ${config.schoolName || 'SDIT AL FIKRI'}`,
          italics: true,
          font: DOCX_FONT_FAMILY,
          size: 16,
        }),
        new TextRun({
          text: '\t\t\t\tHalaman 1/2',
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 16,
        }),
      ],
    })
  );

  /* ============================================================
   * LEMBAR 2: LAPORAN PENILAIAN KARAKTER (18 ASPEK)
   * ============================================================ */
  elements.push(new Paragraph({ children: [new PageBreak()] }));

  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: 'LAPORAN PENILAIAN KARAKTER',
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 24, // 12pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: semesterTitle,
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 24, // 12pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `TAHUN PELAJARAN ${schoolYearTitle}`,
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 24, // 12pt
        }),
      ],
    })
  );

  elements.push(createIdentityTable());

  // Tabel 18 Karakter
  const charRows: TableRow[] = [];
  charRows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'NO', bold: true, font: DOCX_FONT_FAMILY, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'ASPEK KARAKTER', bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'PREDIKAT', bold: true, font: DOCX_FONT_FAMILY, size: 18 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: DOCX_YELLOW_HEX },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'DESKRIPSI CAPAIAN PERKEMBANGAN',
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

  activeDescriptors.forEach((desc, idx) => {
    const charScore = studentCharRecord?.characterScores?.[desc.id];
    const p = charScore?.predicate || '-';
    const d =
      charScore?.description ||
      (charScore?.predicate ? desc.indicators[charScore.predicate] : '-');

    charRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${idx + 1}.`, font: DOCX_FONT_FAMILY, size: 17 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: desc.name, bold: true, font: DOCX_FONT_FAMILY, size: 17 }),
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
                  new TextRun({ text: p, bold: false, font: DOCX_FONT_FAMILY, size: 17 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: d, font: DOCX_FONT_FAMILY, size: 16 }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  });

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBorders,
      rows: charRows,
    })
  );

  // Keterangan Predikat
  elements.push(
    new Paragraph({
      spacing: { before: 100, after: 60 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Keterangan Predikat: [A] Sangat Baik   •   [B] Baik   •   [C] Cukup   •   [D] Perlu Bimbingan',
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 16,
        }),
      ],
    })
  );

  // Catatan Perkembangan Karakter Wali Kelas jika ada
  if (studentCharRecord?.teacherNote) {
    elements.push(
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: `Catatan Perkembangan Karakter: ${studentCharRecord.teacherNote}`,
            italics: true,
            font: DOCX_FONT_FAMILY,
            size: 17,
          }),
        ],
      })
    );
  }

  // Tanda Tangan Resmi Lembar 2
  elements.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: datePlace, font: DOCX_FONT_FAMILY, size: 18 })],
    })
  );

  elements.push(ttdTable1);
  elements.push(new Paragraph({ spacing: { before: 80 } }));
  elements.push(ttdTable2);

  // Running Footer Lembar 2
  elements.push(
    new Paragraph({
      spacing: { before: 180 },
      alignment: AlignmentType.BOTH,
      children: [
        new TextRun({
          text: `${student.name} • NISN: ${formatStudentNimNisn(student.nim, student.nisn)} • Kelas ${activeClass} • ${config.schoolName || 'SDIT AL FIKRI'}`,
          italics: true,
          font: DOCX_FONT_FAMILY,
          size: 16,
        }),
        new TextRun({
          text: '\t\t\t\tHalaman 2/2',
          bold: true,
          font: DOCX_FONT_FAMILY,
          size: 16,
        }),
      ],
    })
  );

  return elements;
}

/**
 * Export Single Student Rapor to Word (.docx) — Includes Lembar 1 + Lembar 2
 */
export const exportStudentRaporToWord = async (
  classData: RaporStsClassData,
  student: Student,
  activeSemester: string,
  activeSchoolYear: string,
  descriptors?: CharacterDescriptor[],
  characterRecords?: Record<string, StudentCharacterRecord>
): Promise<void> => {
  const elements = createDocxStudentSection(
    classData,
    student,
    activeSemester,
    activeSchoolYear,
    true,
    descriptors,
    characterRecords
  );

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
 * Export Whole Class Rapor to Word (.docx) — 2 Lembar per siswa
 */
export const exportClassRaporToWord = async (
  classData: RaporStsClassData,
  students: Student[],
  activeSemester: string,
  activeSchoolYear: string,
  descriptors?: CharacterDescriptor[],
  characterRecords?: Record<string, StudentCharacterRecord>
): Promise<void> => {
  const allElements: (Paragraph | Table)[] = [];

  students.forEach((student, idx) => {
    const studentElements = createDocxStudentSection(
      classData,
      student,
      activeSemester,
      activeSchoolYear,
      idx === 0,
      descriptors,
      characterRecords
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
