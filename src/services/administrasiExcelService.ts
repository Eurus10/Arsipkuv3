import XLSX from 'xlsx-js-style';
import JSZip from 'jszip';

/* ============================================================================
 * TYPE
 * ========================================================================== */

export interface GrafikKehadiranRow {
  periode: string;
  totalSiswa: number;
  hariEfektif: number;
  totalHadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  rate: number;
}

export interface GrafikKehadiranExportParams {
  schoolName?: string;
  schoolYear?: string;
  classLevel?: string;
  periodType: 'month' | 'semester' | 'year';
  periodLabel?: string;
  headmasterName?: string;
  teacherName?: string;
  rows: GrafikKehadiranRow[];
  summaryNote?: string;
}

export interface AbsenStudentRow {
  urut?: number;
  nim?: string;
  nisn?: string;
  nama: string;
  gender: 'L' | 'P';
  tempatLahir?: string;
  tanggalLahir?: string;
  attendances?: Record<number, string>;
  sakit?: number;
  izin?: number;
  alpha?: number;
  catatan?: string;
}

export interface AbsenExportParams {
  schoolName?: string;
  schoolYear?: string;
  classLevel?: string;
  monthName?: string;
  effectiveDays?: number;
  headmasterName?: string;
  teacherName?: string;
  students: AbsenStudentRow[];
}

export interface JadwalSessionRow {
  no: number;
  waktu: string;
  senin: string;
  selasa: string;
  rabu: string;
  kamis: string;
  jumat: string;
  sabtu: string;
}

export interface JadwalExportParams {
  schoolName?: string;
  schoolYear?: string;
  classLevel?: string;
  headmasterName?: string;
  teacherName?: string;
  rows: JadwalSessionRow[];
}

export interface NilaiStudentRow {
  no?: number;
  nama: string;
  formatifScores?: (number | string)[];
  sumatifScores?: (number | string)[];
  sts?: number | string;
  sas?: number | string;
  rerataFormatif?: number | string;
  rerataSumatif?: number | string;
  nilaiRataRata?: number | string;
  // Legacy optional properties for backwards compatibility
  bab1?: number | string;
  bab2?: number | string;
  bab3?: number | string;
  bab4?: number | string;
  pr1?: number | string;
  pr2?: number | string;
  pr3?: number | string;
  jumlah?: number | string;
}

export interface NilaiExportParams {
  subjectName?: string;
  schoolName?: string;
  npsn?: string;
  classLevel?: string;
  semester?: string;
  schoolYear?: string;
  dateStr?: string;
  headmasterName?: string;
  teacherName?: string;
  numChapters?: number;
  students: NilaiStudentRow[];
}

export interface UsiaStudentRow {
  no?: number;
  nama: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  monthlyAges?: Record<string, string>;
}

export interface UsiaExportParams {
  schoolName?: string;
  schoolYear?: string;
  classLevel?: string;
  headmasterName?: string;
  teacherName?: string;
  students: UsiaStudentRow[];
}

const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

const FILL_YELLOW_STYLE = {
  patternType: 'solid',
  fgColor: { rgb: 'FFFF00' },
};

const FILL_LIGHT_BLUE_STYLE = {
  patternType: 'solid',
  fgColor: { rgb: 'BDD7EE' },
};

export const exportAbsenToExcel = (params: AbsenExportParams) => {
  const wb = XLSX.utils.book_new();
  const ws: any = {};
  const schoolName = params.schoolName || 'SEKOLAH DASAR ISLAM TERPADU AL FIKRI';
  const schoolYear = params.schoolYear || 'TAHUN PELAJARAN 2026-2027';
  const classLevel = params.classLevel || '3 C';
  const monthName = params.monthName || '..............................................................';
  const headmasterName = params.headmasterName || 'H. M. HALIM MUSTOMI, S.Pd.';
  const teacherName = params.teacherName || 'GURU KELAS';

  const setCell = (rIdx: number, cIdx: number, val: any, style?: any) => {
    const ref = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
    ws[ref] = { v: val, t: typeof val === 'number' ? 'n' : 's', s: style || {} };
  };

  setCell(0, 0, 'DAFTAR HADIR MURID', { font: { name: 'Arial', sz: 14, bold: true }, alignment: { horizontal: 'center' } });
  setCell(1, 0, schoolName, { font: { name: 'Arial', sz: 12, bold: true }, alignment: { horizontal: 'center' } });
  setCell(2, 0, schoolYear, { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center' } });

  setCell(4, 0, `KELAS: ${classLevel}`, { font: { name: 'Arial', sz: 10, bold: true } });
  setCell(4, 8, `BULAN: ${monthName}`, { font: { name: 'Arial', sz: 10, bold: true } });

  setCell(6, 0, 'NOMOR', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(7, 0, 'URUT', { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  setCell(7, 1, 'NIM', { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  setCell(7, 2, 'NISN', { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });

  setCell(6, 3, 'NAMA', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(7, 3, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  setCell(6, 4, 'L/P', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(7, 4, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  setCell(6, 5, 'Tempat Lahir', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(7, 5, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  setCell(6, 6, 'Tanggal Lahir', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(7, 6, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  setCell(6, 7, 'TANGGAL', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  for (let d = 1; d <= 31; d++) {
    setCell(7, 6 + d, d, { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  }

  setCell(6, 38, 'Jumlah', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  setCell(7, 38, 'S', { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  setCell(7, 39, 'I', { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  setCell(7, 40, 'A', { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });

  setCell(6, 41, 'Catatan', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(7, 41, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 41 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 41 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 41 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 2 } },
    { s: { r: 6, c: 3 }, e: { r: 7, c: 3 } },
    { s: { r: 6, c: 4 }, e: { r: 7, c: 4 } },
    { s: { r: 6, c: 5 }, e: { r: 7, c: 5 } },
    { s: { r: 6, c: 6 }, e: { r: 7, c: 6 } },
    { s: { r: 6, c: 7 }, e: { r: 6, c: 37 } },
    { s: { r: 6, c: 38 }, e: { r: 6, c: 40 } },
    { s: { r: 6, c: 41 }, e: { r: 7, c: 41 } },
  ];

  let startRow = 8;
  let countL = 0;
  let countP = 0;

  params.students.forEach((student, idx) => {
    const rowIdx = startRow + idx;
    if (student.gender === 'L') countL++;
    if (student.gender === 'P') countP++;

    setCell(rowIdx, 0, student.urut || idx + 1, { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, 1, student.nim || '', { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, 2, student.nisn || '', { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, 3, student.nama, { font: { sz: 9 }, alignment: { horizontal: 'left' }, border: BORDER_THIN });
    setCell(rowIdx, 4, student.gender, { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, 5, student.tempatLahir || '', { font: { sz: 9 }, alignment: { horizontal: 'left' }, border: BORDER_THIN });
    setCell(rowIdx, 6, student.tanggalLahir || '', { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });

    for (let d = 1; d <= 31; d++) {
      const val = student.attendances?.[d] || '';
      setCell(rowIdx, 6 + d, val, { font: { sz: 8, bold: val !== '' }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    }

    setCell(rowIdx, 38, student.sakit ?? '', { font: { sz: 8 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, 39, student.izin ?? '', { font: { sz: 8 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, 40, student.alpha ?? '', { font: { sz: 8 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, 41, student.catatan || '', { font: { sz: 8 }, alignment: { horizontal: 'left' }, border: BORDER_THIN });
  });

  const totalStudents = params.students.length;
  const summaryRow = startRow + totalStudents + 2;

  setCell(summaryRow, 1, 'Keadaan Murid:', { font: { sz: 10, bold: true } });
  setCell(summaryRow + 1, 1, `Laki - Laki: ${countL}`);
  setCell(summaryRow + 2, 1, `Perempuan: ${countP}`);
  setCell(summaryRow + 3, 1, `Jumlah: ${countL + countP}`, { font: { sz: 10, bold: true } });

  setCell(summaryRow, 8, 'Presentase Absen Bulan Ini :', { font: { sz: 10, bold: true } });
  setCell(summaryRow + 1, 8, '........................ x ........................ = ........ %');

  const signRow = summaryRow + 5;
  setCell(signRow, 3, 'Mengetahui / Menyetujui', { font: { sz: 10 } });
  setCell(signRow + 1, 3, 'Kepala Sekolah', { font: { sz: 10, bold: true } });
  setCell(signRow + 4, 3, headmasterName, { font: { sz: 10, bold: true, underline: true } });

  setCell(signRow, 35, 'GURU KELAS', { font: { sz: 10, bold: true } });
  setCell(signRow + 4, 35, teacherName, { font: { sz: 10, bold: true, underline: true } });

  ws['!merges'] = merges;

  const cols = [
    { wch: Math.max(6, ...params.students.map((s) => String(s.urut || '').length + 2)) },
    { wch: Math.max(12, ...params.students.map((s) => (s.nim || '').length + 3)) },
    { wch: Math.max(14, ...params.students.map((s) => (s.nisn || '').length + 3)) },
    { wch: Math.max(28, ...params.students.map((s) => (s.nama || '').length + 4)) },
    { wch: 6 },
    { wch: Math.max(16, ...params.students.map((s) => (s.tempatLahir || '').length + 3)) },
    { wch: Math.max(14, ...params.students.map((s) => (s.tanggalLahir || '').length + 3)) },
  ];
  for (let d = 1; d <= 31; d++) cols.push({ wch: 4 });
  cols.push({ wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: Math.max(22, ...params.students.map((s) => (s.catatan || '').length + 4)) });
  ws['!cols'] = cols;

  const rowsList: any[] = [];
  const maxR = signRow + 6;
  for (let r = 0; r <= maxR; r++) {
    if (r === 0) rowsList.push({ hpt: 26 });
    else if (r === 1 || r === 2) rowsList.push({ hpt: 20 });
    else if (r === 4 || r === 5) rowsList.push({ hpt: 19 });
    else if (r === 6 || r === 7) rowsList.push({ hpt: 22 });
    else if (r >= 8 && r < startRow + totalStudents) rowsList.push({ hpt: 20 });
    else rowsList.push({ hpt: 19 });
  }
  ws['!rows'] = rowsList;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: 41 } });

  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Hadir');
  XLSX.writeFile(wb, `Absensi_Kelas_${classLevel.replace(/\s+/g, '_')}.xlsx`);
};

export const exportJadwalToExcel = (params: JadwalExportParams) => {
  const wb = XLSX.utils.book_new();
  const ws: any = {};
  const schoolName = params.schoolName || 'SDIT AL FIKRI';
  const schoolYear = params.schoolYear || 'TAHUN PELAJARAN 2026-2027';
  const classLevel = params.classLevel || 'A';
  const headmasterName = params.headmasterName || 'H. M. HALIM MUSTOMI, S.Pd.';
  const teacherName = params.teacherName || 'YENI ASTRIANI, S.Pd';

  const setCell = (rIdx: number, cIdx: number, val: any, style?: any) => {
    const ref = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
    ws[ref] = { v: val, t: typeof val === 'number' ? 'n' : 's', s: style || {} };
  };

  setCell(0, 0, 'JADWAL PELAJARAN', { font: { name: 'Arial', sz: 14, bold: true }, alignment: { horizontal: 'center' } });
  setCell(1, 0, schoolName, { font: { name: 'Arial', sz: 12, bold: true }, alignment: { horizontal: 'center' } });
  setCell(2, 0, schoolYear, { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center' } });

  setCell(4, 0, 'KELAS', { font: { sz: 9, bold: true }, fill: FILL_LIGHT_BLUE_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(5, 0, '', { fill: FILL_LIGHT_BLUE_STYLE, border: BORDER_THIN });

  setCell(4, 1, 'NO.', { font: { sz: 9, bold: true }, fill: FILL_LIGHT_BLUE_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(5, 1, '', { fill: FILL_LIGHT_BLUE_STYLE, border: BORDER_THIN });

  setCell(4, 2, 'WAKTU', { font: { sz: 9, bold: true }, fill: FILL_LIGHT_BLUE_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(5, 2, '', { fill: FILL_LIGHT_BLUE_STYLE, border: BORDER_THIN });

  setCell(4, 3, 'HARI', { font: { sz: 10, bold: true }, fill: FILL_LIGHT_BLUE_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  ['SENIN', 'SELASA', 'RABU', 'KAMIS', "JUM'AT", 'SABTU'].forEach((day, idx) => {
    setCell(5, 3 + idx, day, { font: { sz: 9, bold: true }, fill: FILL_LIGHT_BLUE_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  });

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
    { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
    { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } },
    { s: { r: 4, c: 3 }, e: { r: 4, c: 8 } },
  ];

  const startRow = 6;
  const rowCount = params.rows.length;
  merges.push({ s: { r: startRow, c: 0 }, e: { r: startRow + rowCount - 1, c: 0 } });
  setCell(startRow, 0, classLevel, { font: { sz: 24, bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });

  params.rows.forEach((row, idx) => {
    const rowIdx = startRow + idx;
    setCell(rowIdx, 1, row.no, { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, 2, row.waktu, { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });

    (['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as const).forEach((dayKey, dIdx) => {
      const text = row[dayKey] || '';
      const isBreak = text.includes('ISTIRAHAT') || text.includes('SHALAT') || text.includes('UPACARA') || text.includes('SENAM');
      setCell(rowIdx, 3 + dIdx, text, {
        font: { sz: 9, bold: isBreak },
        fill: isBreak ? FILL_LIGHT_BLUE_STYLE : undefined,
        alignment: { horizontal: 'center', vertical: 'center' },
        border: BORDER_THIN,
      });
    });
  });

  const signRow = startRow + rowCount + 3;
  setCell(signRow, 1, 'KEPALA SEKOLAH', { font: { sz: 10, bold: true } });
  setCell(signRow + 4, 1, headmasterName, { font: { sz: 10, bold: true, underline: true } });
  setCell(signRow, 6, 'WALI KELAS', { font: { sz: 10, bold: true } });
  setCell(signRow + 4, 6, teacherName, { font: { sz: 10, bold: true, underline: true } });

  ws['!merges'] = merges;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: signRow + 6, c: 8 } });

  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pelajaran');
  XLSX.writeFile(wb, `Jadwal_Pelajaran_Kelas_${classLevel}.xlsx`);
};

export const exportDaftarNilaiToExcel = (params: NilaiExportParams) => {
  const wb = XLSX.utils.book_new();
  const ws: any = {};
  const schoolName = params.schoolName || 'SDIT AL FIKRI';
  const subjectName = params.subjectName || 'Pendidikan Pancasila';
  const npsn = params.npsn || '102280302038 / 20614083';
  const classLevel = params.classLevel || '2C';
  const semester = params.semester || 'Ganjil';
  const schoolYear = params.schoolYear || '2026-2027';

  // Determine number of chapters for Formatif
  const numChapters = params.numChapters || 4;

  const setCell = (rIdx: number, cIdx: number, val: any, style?: any) => {
    const ref = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
    ws[ref] = { v: val, t: typeof val === 'number' ? 'n' : 's', s: style || {} };
  };

  // Column Mapping
  // Col 0: NO
  // Col 1: NAMA
  // Col 2 .. (2 + numChapters - 1): Formatif BAB 1..BAB n
  // Col (2 + numChapters): Sumatif STS
  // Col (3 + numChapters): Sumatif SAS
  // Col (4 + numChapters): Nilai Rata-Rata (Akhir)

  const colFormatifStart = 2;
  const colSumatifStart = colFormatifStart + numChapters;
  const colSts = colSumatifStart;
  const colSas = colSts + 1;
  const colRataRata = colSas + 1;
  const totalCols = colRataRata + 1;

  const rightColIdx = Math.max(3, Math.floor(totalCols / 2));

  setCell(0, 0, 'DAFTAR NILAI PESERTA DIDIK', { font: { sz: 14, bold: true }, alignment: { horizontal: 'center' } });
  setCell(2, 0, `NAMA SEKOLAH: ${schoolName}`);
  setCell(2, rightColIdx, `MATA PELAJARAN: ${subjectName}`);
  setCell(3, 0, `KELAS/SEMESTER: ${classLevel} / ${semester}`);
  setCell(3, rightColIdx, `NSS/NPSN: ${npsn}`);
  setCell(4, 0, `TAHUN PELAJARAN: ${schoolYear}`);
  setCell(4, rightColIdx, 'KECAMATAN/KABUPATEN: TIGARAKSA / TANGERANG');

  // Headers Row 6 & 7
  setCell(6, 0, 'NO', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(7, 0, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  setCell(6, 1, 'NAMA PESERTA DIDIK', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(7, 1, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  // Formatif Header
  setCell(6, colFormatifStart, 'NILAI FORMATIF', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  for (let i = 0; i < numChapters; i++) {
    setCell(7, colFormatifStart + i, `BAB ${i + 1}`, { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  }

  // Sumatif Header
  setCell(6, colSumatifStart, 'NILAI SUMATIF', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(7, colSts, 'STS', { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  setCell(7, colSas, 'SAS', { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });

  // Nilai Rata-Rata Header
  setCell(6, colRataRata, 'NILAI RATA-RATA', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(7, colRataRata, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 6, c: 0 }, e: { r: 7, c: 0 } }, // NO
    { s: { r: 6, c: 1 }, e: { r: 7, c: 1 } }, // NAMA
    { s: { r: 6, c: colFormatifStart }, e: { r: 6, c: colFormatifStart + numChapters - 1 } }, // FORMATIF
    { s: { r: 6, c: colSumatifStart }, e: { r: 6, c: colSas } }, // SUMATIF
    { s: { r: 6, c: colRataRata }, e: { r: 7, c: colRataRata } }, // NILAI RATA-RATA
  ];

  const startRow = 8;
  params.students.forEach((s, idx) => {
    const rowIdx = startRow + idx;
    setCell(rowIdx, 0, s.no || idx + 1, { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, 1, s.nama, { font: { sz: 9 }, alignment: { horizontal: 'left' }, border: BORDER_THIN });

    // Formatif scores
    for (let i = 0; i < numChapters; i++) {
      const val = s.formatifScores?.[i] ?? (i === 0 ? s.bab1 : i === 1 ? s.bab2 : i === 2 ? s.bab3 : i === 3 ? s.bab4 : '');
      setCell(rowIdx, colFormatifStart + i, val ?? '', { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    }

    setCell(rowIdx, colSts, s.sts ?? '', { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, colSas, s.sas ?? '', { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, colRataRata, s.nilaiRataRata ?? s.jumlah ?? '', { font: { sz: 9, bold: true }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  });

  const signRow = startRow + params.students.length + 3;
  setCell(signRow, 1, 'MENGETAHUI,', { font: { sz: 10 } });
  setCell(signRow + 1, 1, 'KEPALA SEKOLAH', { font: { sz: 10, bold: true } });
  setCell(signRow + 4, 1, params.headmasterName || 'H. M. HALIM MUSTOMI, S.Pd.', { font: { sz: 10, bold: true, underline: true } });

  setCell(signRow, Math.max(3, colSts), `TIGARAKSA, ${params.dateStr || '........................'}`, { font: { sz: 10 } });
  setCell(signRow + 1, Math.max(3, colSts), 'GURU KELAS', { font: { sz: 10, bold: true } });
  setCell(signRow + 4, Math.max(3, colSts), params.teacherName || '........................................', { font: { sz: 10, bold: true, underline: true } });

  ws['!merges'] = merges;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: signRow + 6, c: totalCols - 1 } });

  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Nilai');
  XLSX.writeFile(wb, `Daftar_Nilai_Kelas_${classLevel}_${subjectName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
};

export const exportDataUsiaToExcel = (params: UsiaExportParams) => {
  const wb = XLSX.utils.book_new();
  const ws: any = {};
  const schoolYear = params.schoolYear || '2026-2027';
  const classLevel = params.classLevel || '1A';

  const setCell = (rIdx: number, cIdx: number, val: any, style?: any) => {
    const ref = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
    ws[ref] = { v: val, t: typeof val === 'number' ? 'n' : 's', s: style || {} };
  };

  setCell(0, 0, `DATA USIA KELAS ${classLevel}`, { font: { sz: 14, bold: true }, alignment: { horizontal: 'center' } });
  setCell(1, 0, `TAHUN PELAJARAN ${schoolYear}`, { font: { sz: 11, bold: true }, alignment: { horizontal: 'center' } });

  setCell(3, 0, 'No.', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(4, 0, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  setCell(3, 1, 'Nama Siswa', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(4, 1, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  setCell(3, 2, 'Tempat Lahir', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(4, 2, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  setCell(3, 3, 'Tanggal Lahir', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN });
  setCell(4, 3, '', { fill: FILL_YELLOW_STYLE, border: BORDER_THIN });

  const months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
  setCell(3, 4, 'Usia per Bulan', { font: { sz: 9, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  months.forEach((m, idx) => {
    setCell(4, 4 + idx, m, { font: { sz: 8, bold: true }, fill: FILL_YELLOW_STYLE, alignment: { horizontal: 'center' }, border: BORDER_THIN });
  });

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
    { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
    { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
    { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 15 } },
  ];

  const startRow = 5;
  params.students.forEach((student, idx) => {
    const rowIdx = startRow + idx;
    setCell(rowIdx, 0, student.no || idx + 1, { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    setCell(rowIdx, 1, student.nama, { font: { sz: 9 }, alignment: { horizontal: 'left' }, border: BORDER_THIN });
    setCell(rowIdx, 2, student.tempatLahir || '', { font: { sz: 9 }, alignment: { horizontal: 'left' }, border: BORDER_THIN });
    setCell(rowIdx, 3, student.tanggalLahir || '', { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });

    months.forEach((month, mIdx) => {
      const val = student.monthlyAges?.[month] || '';
      setCell(rowIdx, 4 + mIdx, val, { font: { sz: 8 }, alignment: { horizontal: 'center' }, border: BORDER_THIN });
    });
  });

  const totalStudents = params.students.length;
  const signRow = startRow + totalStudents + 3;

  setCell(signRow, 1, 'KEPALA SEKOLAH', { font: { sz: 10, bold: true } });
  setCell(signRow + 4, 1, params.headmasterName || 'H. M. HALIM MUSTOMI, S.Pd.', { font: { sz: 10, bold: true, underline: true } });
  setCell(signRow, 11, 'WALI KELAS', { font: { sz: 10, bold: true } });
  setCell(signRow + 4, 11, params.teacherName || '........................................', { font: { sz: 10, bold: true, underline: true } });

  ws['!merges'] = merges;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: signRow + 6, c: 15 } });

  const cols = [
    { wch: 6 },
    { wch: Math.max(26, ...params.students.map((s) => (s.nama || '').length + 4)) },
    { wch: Math.max(16, ...params.students.map((s) => (s.tempatLahir || '').length + 3)) },
    { wch: Math.max(16, ...params.students.map((s) => (s.tanggalLahir || '').length + 3)) },
  ];
  for (let i = 0; i < 12; i++) {
    cols.push({ wch: 12.5 });
  }
  ws['!cols'] = cols;

  const rowsList: any[] = [];
  const maxR = signRow + 6;
  for (let r = 0; r <= maxR; r++) {
    if (r === 0) rowsList.push({ hpt: 26 });
    else if (r === 1) rowsList.push({ hpt: 20 });
    else if (r === 3 || r === 4) rowsList.push({ hpt: 22 });
    else if (r >= 5 && r < startRow + totalStudents) rowsList.push({ hpt: 20 });
    else rowsList.push({ hpt: 19 });
  }
  ws['!rows'] = rowsList;

  XLSX.utils.book_append_sheet(wb, ws, 'Data Usia');
  XLSX.writeFile(wb, `Data_Usia_Siswa_Kelas_${classLevel}.xlsx`);
};

/* ============================================================================
 * XML HELPERS
 * ========================================================================== */

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeXmlText(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXmlFormula(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXmlAttr(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Ambil relationship ID berikutnya.
 *
 * Tidak hard-code rId1 / rId2 untuk worksheet relationship.
 */
function getNextRelationshipId(
  xml: string,
  prefix = 'rId'
): string {
  const used = new Set<number>();

  const regex =
    new RegExp(
      `Id=["']${prefix}(\\d+)["']`,
      'g'
    );

  let match: RegExpExecArray | null;

  while (
    (match = regex.exec(xml)) !== null
  ) {
    used.add(Number(match[1]));
  }

  let next = 1;

  while (used.has(next)) {
    next++;
  }

  return `${prefix}${next}`;
}

/**
 * Pastikan relationship tertentu tersedia.
 */
function ensureRelationship(
  xml: string,
  relationship: {
    id: string;
    type: string;
    target: string;
  }
): string {
  const {
    id,
    type,
    target,
  } = relationship;

  if (
    xml.includes(
      `Target="${target}"`
    )
  ) {
    return xml;
  }

  const relationshipXml =
    `<Relationship ` +
    `Id="${escapeXml(id)}" ` +
    `Type="${escapeXml(type)}" ` +
    `Target="${escapeXml(target)}"/>`;

  return xml.replace(
    '</Relationships>',
    `${relationshipXml}</Relationships>`
  );
}

/* ============================================================================
 * NATIVE EXCEL CHART MODEL
 * ========================================================================== */

interface NativeChartSeries {
  name: string;

  /**
   * Contoh:
   * 'Grafik & Rekap Kehadiran'!$L$1
   */
  nameFormula: string;

  color: string;
  borderColor: string;

  categories: string[];

  /**
   * Contoh:
   * 'Grafik & Rekap Kehadiran'!$K$2:$K$13
   */
  catFormula: string;

  values: number[];

  /**
   * Contoh:
   * 'Grafik & Rekap Kehadiran'!$L$2:$L$13
   */
  valFormula: string;
}

interface NativeChartOptions {
  title: string;
  series: NativeChartSeries[];

  gapWidth?: number;
  overlap?: number;

  minVal?: number;
  maxVal?: number;

  formatCode?: string;

  axIdBase?: number;
}

/* ============================================================================
 * BUILD NATIVE EXCEL CHART XML
 *
 * Ini benar-benar menghasilkan:
 *
 * xl/charts/chart1.xml
 *
 * bukan gambar / unicode bar / fake chart.
 * ========================================================================== */

function buildNativeChartXml(
  options: NativeChartOptions
): string {
  const {
    title,
    series,
    gapWidth = 140,
    overlap = 0,
    minVal = 0,
    maxVal = 1.05,
    formatCode = '0.0%',
    axIdBase = 12345600,
  } = options;

  const catAxId = axIdBase + 1;
  const valAxId = axIdBase + 2;

  const safeSeries = series.filter(
    (item) =>
      Array.isArray(item.categories) &&
      Array.isArray(item.values) &&
      item.categories.length > 0 &&
      item.values.length > 0
  );

  const seriesXml = safeSeries
    .map((item, seriesIndex) => {
      const categoryPoints = item.categories
        .map(
          (category, pointIndex) =>
            `<c:pt idx="${pointIndex}"><c:v>${escapeXmlText(category)}</c:v></c:pt>`
        )
        .join('');

      const valuePoints = item.values
        .map((value, pointIndex) => {
          const safeValue = Number.isFinite(Number(value))
            ? Number(value)
            : 0;

          return `<c:pt idx="${pointIndex}"><c:v>${safeValue}</c:v></c:pt>`;
        })
        .join('');

      return `
        <c:ser>
          <c:idx val="${seriesIndex}"/>
          <c:order val="${seriesIndex}"/>

          <!-- SERIES NAME -->
          <c:tx>
            <c:strRef>
              <c:f>${escapeXmlFormula(item.nameFormula)}</c:f>
              <c:strCache>
                <c:ptCount val="1"/>
                <c:pt idx="0">
                  <c:v>${escapeXmlText(item.name)}</c:v>
                </c:pt>
              </c:strCache>
            </c:strRef>
          </c:tx>

          <!-- SERIES STYLE -->
          <c:spPr>
            <a:solidFill>
              <a:srgbClr val="${escapeXmlAttr(item.color)}"/>
            </a:solidFill>
            <a:ln w="12700">
              <a:solidFill>
                <a:srgbClr val="${escapeXmlAttr(item.borderColor)}"/>
              </a:solidFill>
            </a:ln>
          </c:spPr>

          <c:invertIfNegative val="0"/>

          <!-- CATEGORY -->
          <c:cat>
            <c:strRef>
              <c:f>${escapeXmlFormula(item.catFormula)}</c:f>
              <c:strCache>
                <c:ptCount val="${item.categories.length}"/>
                ${categoryPoints}
              </c:strCache>
            </c:strRef>
          </c:cat>

          <!-- VALUE -->
          <c:val>
            <c:numRef>
              <c:f>${escapeXmlFormula(item.valFormula)}</c:f>
              <c:numCache>
                <c:formatCode>${escapeXmlAttr(formatCode)}</c:formatCode>
                <c:ptCount val="${item.values.length}"/>
                ${valuePoints}
              </c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
      `;
    })
    .join('');

  /**
   * CAT AXIS (Strict ECMA-376 Sequence for Excel 2013 compatibility)
   */
  const catAxisXml = `
    <c:catAx>
      <c:axId val="${catAxId}"/>
      <c:scaling>
        <c:orientation val="minMax"/>
      </c:scaling>
      <c:delete val="0"/>
      <c:axPos val="b"/>
      <c:majorTickMark val="outside"/>
      <c:minorTickMark val="none"/>
      <c:tickLblPos val="nextTo"/>
      <c:crossAx val="${valAxId}"/>
      <c:crosses val="autoZero"/>
      <c:auto val="1"/>
      <c:lblAlgn val="ctr"/>
      <c:lblOffset val="100"/>
      <c:noMultiLvlLbl val="0"/>
    </c:catAx>
  `;

  /**
   * VALUE AXIS (Strict ECMA-376 Sequence for Excel 2013 compatibility)
   */
  const valueAxisXml = `
    <c:valAx>
      <c:axId val="${valAxId}"/>
      <c:scaling>
        <c:orientation val="minMax"/>
        <c:min val="${minVal}"/>
        <c:max val="${maxVal}"/>
      </c:scaling>
      <c:delete val="0"/>
      <c:axPos val="l"/>
      <c:majorGridlines>
        <c:spPr>
          <a:ln w="9525">
            <a:solidFill>
              <a:srgbClr val="E2E8F0"/>
            </a:solidFill>
          </a:ln>
        </c:spPr>
      </c:majorGridlines>
      <c:numFmt formatCode="${escapeXmlAttr(formatCode)}" sourceLinked="0"/>
      <c:majorTickMark val="outside"/>
      <c:minorTickMark val="none"/>
      <c:tickLblPos val="nextTo"/>
      <c:crossAx val="${catAxId}"/>
      <c:crosses val="autoZero"/>
      <c:crossBetween val="between"/>
    </c:valAx>
  `;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">

  <c:date1904 val="0"/>
  <c:lang val="id-ID"/>
  <c:roundedCorners val="0"/>
  <c:style val="10"/>

  <c:chart>
    <!-- TITLE -->
    <c:title>
      <c:tx>
        <c:rich>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr>
              <a:defRPr sz="1100" b="1"/>
            </a:pPr>
            <a:r>
              <a:rPr lang="id-ID" sz="1100" b="1"/>
              <a:t>${escapeXmlText(title)}</a:t>
            </a:r>
          </a:p>
        </c:rich>
      </c:tx>
      <c:layout/>
      <c:overlay val="0"/>
    </c:title>

    <c:autoTitleDeleted val="0"/>

    <!-- PLOT AREA -->
    <c:plotArea>
      <c:layout/>

      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="0"/>

        ${seriesXml}

        <!-- DATA LABEL (Strict CT_DLbls sequence) -->
        <c:dLbls>
          <c:dLblPos val="outEnd"/>
          <c:showLegendKey val="0"/>
          <c:showVal val="1"/>
          <c:showCatName val="0"/>
          <c:showSerName val="0"/>
          <c:showPercent val="0"/>
          <c:showBubbleSize val="0"/>
          <c:showLeaderLines val="0"/>
        </c:dLbls>

        <c:gapWidth val="${gapWidth}"/>
        <c:overlap val="${overlap}"/>

        <c:axId val="${catAxId}"/>
        <c:axId val="${valAxId}"/>
      </c:barChart>

      ${catAxisXml}
      ${valueAxisXml}
    </c:plotArea>

    <c:plotVisOnly val="0"/>
    <c:dispBlanksAs val="gap"/>
    <c:showDLblsOverMax val="0"/>
  </c:chart>

  <!-- CHART BACKGROUND -->
  <c:spPr>
    <a:solidFill>
      <a:srgbClr val="FFFFFF"/>
    </a:solidFill>
    <a:ln w="9525">
      <a:solidFill>
        <a:srgbClr val="CBD5E1"/>
      </a:solidFill>
    </a:ln>
  </c:spPr>
</c:chartSpace>`;
}

/* ============================================================================
 * DRAWING XML
 * ========================================================================== */

function buildChartDrawingXml(
  chartCount: 1 | 2,
  chart1RelId: string,
  chart2RelId?: string
): string {
  const chart1Anchor = `
    <xdr:twoCellAnchor editAs="twoCell">
      <xdr:from>
        <xdr:col>0</xdr:col>
        <xdr:colOff>0</xdr:colOff>
        <xdr:row>9</xdr:row>
        <xdr:rowOff>0</xdr:rowOff>
      </xdr:from>
      <xdr:to>
        <xdr:col>${chartCount === 2 ? 4 : 9}</xdr:col>
        <xdr:colOff>0</xdr:colOff>
        <xdr:row>25</xdr:row>
        <xdr:rowOff>0</xdr:rowOff>
      </xdr:to>
      <xdr:graphicFrame macro="">
        <xdr:nvGraphicFramePr>
          <xdr:cNvPr id="2" name="Grafik Kehadiran Siswa"/>
          <xdr:cNvGraphicFramePr>
            <a:graphicFrameLocks noGrp="1"/>
          </xdr:cNvGraphicFramePr>
        </xdr:nvGraphicFramePr>
        <xdr:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
        </xdr:xfrm>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
            <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${chart1RelId}"/>
          </a:graphicData>
        </a:graphic>
      </xdr:graphicFrame>
      <xdr:clientData/>
    </xdr:twoCellAnchor>
  `;

  if (chartCount === 1) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr
  xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  ${chart1Anchor}
</xdr:wsDr>`;
  }

  const chart2Anchor = `
    <xdr:twoCellAnchor editAs="twoCell">
      <xdr:from>
        <xdr:col>4</xdr:col>
        <xdr:colOff>0</xdr:colOff>
        <xdr:row>9</xdr:row>
        <xdr:rowOff>0</xdr:rowOff>
      </xdr:from>
      <xdr:to>
        <xdr:col>9</xdr:col>
        <xdr:colOff>0</xdr:colOff>
        <xdr:row>25</xdr:row>
        <xdr:rowOff>0</xdr:rowOff>
      </xdr:to>
      <xdr:graphicFrame macro="">
        <xdr:nvGraphicFramePr>
          <xdr:cNvPr id="3" name="Grafik Ketidakhadiran Siswa"/>
          <xdr:cNvGraphicFramePr>
            <a:graphicFrameLocks noGrp="1"/>
          </xdr:cNvGraphicFramePr>
        </xdr:nvGraphicFramePr>
        <xdr:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
        </xdr:xfrm>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
            <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${chart2RelId}"/>
          </a:graphicData>
        </a:graphic>
      </xdr:graphicFrame>
      <xdr:clientData/>
    </xdr:twoCellAnchor>
  `;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr
  xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  ${chart1Anchor}
  ${chart2Anchor}
</xdr:wsDr>`;
}

/* ============================================================================
 * EXPORT GRAFIK KEHADIRAN
 *
 * REPLACE FUNCTION LAMA DENGAN FUNCTION INI.
 * ========================================================================== */

export const exportGrafikKehadiranToExcel =
  async (
    params: GrafikKehadiranExportParams
  ): Promise<void> => {

    /* ------------------------------------------------------------------------
     * WORKBOOK
     * ---------------------------------------------------------------------- */

    const wb =
      XLSX.utils.book_new();

    const ws: XLSX.WorkSheet = {};

    const sheetName =
      'Grafik & Rekap Kehadiran';

    const schoolName =
      params.schoolName ||
      'SEKOLAH DASAR ISLAM TERPADU AL FIKRI';

    const schoolYear =
      params.schoolYear ||
      'TAHUN PELAJARAN 2026-2027';

    const classLevel =
      params.classLevel ||
      'Semua Kelas';

    const periodLabel =
      params.periodLabel ||
      'Bulanan';

    const headmasterName =
      params.headmasterName ||
      'H. M. HALIM MUSTOMI, S.Pd.';

    const teacherName =
      params.teacherName ||
      'GURU KELAS';

    /* ------------------------------------------------------------------------
     * CELL HELPER
     * ---------------------------------------------------------------------- */

    const setCell = (
      row: number,
      col: number,
      value: any,
      style?: any,
      numberFormat?: string
    ) => {

      const address =
        XLSX.utils.encode_cell({
          r: row,
          c: col,
        });

      const cell: XLSX.CellObject = {
        v: value,
        t:
          typeof value === 'number'
            ? 'n'
            : 's',
        s: style || {},
      };

      if (
        numberFormat
      ) {
        cell.z =
          numberFormat;
      }

      ws[address] =
        cell;
    };

    const merges:
      XLSX.Range[] = [];

    /* ------------------------------------------------------------------------
     * STYLES
     * ---------------------------------------------------------------------- */

    const BORDER_THIN = {
      top: {
        style: 'thin',
        color: {
          rgb: 'CBD5E1',
        },
      },
      bottom: {
        style: 'thin',
        color: {
          rgb: 'CBD5E1',
        },
      },
      left: {
        style: 'thin',
        color: {
          rgb: 'CBD5E1',
        },
      },
      right: {
        style: 'thin',
        color: {
          rgb: 'CBD5E1',
        },
      },
    };

    const BORDER_DARK = {
      top: {
        style: 'thin',
        color: {
          rgb: '000000',
        },
      },
      bottom: {
        style: 'thin',
        color: {
          rgb: '000000',
        },
      },
      left: {
        style: 'thin',
        color: {
          rgb: '000000',
        },
      },
      right: {
        style: 'thin',
        color: {
          rgb: '000000',
        },
      },
    };

    const FILL_DARK = {
      patternType: 'solid',
      fgColor: {
        rgb: '1E293B',
      },
    };

    const FILL_SECTION = {
      patternType: 'solid',
      fgColor: {
        rgb: '334155',
      },
    };

    const FILL_CHART = {
      patternType: 'solid',
      fgColor: {
        rgb: 'F8FAFC',
      },
    };

    const FILL_YELLOW = {
      patternType: 'solid',
      fgColor: {
        rgb: 'FFFF00',
      },
    };

    const FILL_LIGHT_BLUE = {
      patternType: 'solid',
      fgColor: {
        rgb: 'BDD7EE',
      },
    };

    const FILL_GREEN_CARD = {
      patternType: 'solid',
      fgColor: {
        rgb: 'ECFDF5',
      },
    };

    const FILL_AMBER_CARD = {
      patternType: 'solid',
      fgColor: {
        rgb: 'FFFBEB',
      },
    };

    const FILL_BLUE_CARD = {
      patternType: 'solid',
      fgColor: {
        rgb: 'EFF6FF',
      },
    };

    const FILL_RED_CARD = {
      patternType: 'solid',
      fgColor: {
        rgb: 'FFF1F2',
      },
    };

    /* ------------------------------------------------------------------------
     * TOTAL
     * ---------------------------------------------------------------------- */

    let grandTotalSiswa = 0;
    let grandTotalHadir = 0;
    let grandTotalSakit = 0;
    let grandTotalIzin = 0;
    let grandTotalAlpha = 0;

    params.rows.forEach(
      (row) => {

        grandTotalSiswa =
          Number(
            row.totalSiswa
          ) ||
          grandTotalSiswa;

        grandTotalHadir +=
          Number(
            row.totalHadir
          ) || 0;

        grandTotalSakit +=
          Number(
            row.sakit
          ) || 0;

        grandTotalIzin +=
          Number(
            row.izin
          ) || 0;

        grandTotalAlpha +=
          Number(
            row.alpha
          ) || 0;
      }
    );

    const totalAllPresensi =
      grandTotalHadir +
      grandTotalSakit +
      grandTotalIzin +
      grandTotalAlpha;

    const overallRateNum =
      totalAllPresensi > 0
        ? (
            grandTotalHadir /
            totalAllPresensi
          ) * 100
        : 100;

    const overallRate =
      overallRateNum.toFixed(
        1
      );

    const sakitRate =
      totalAllPresensi > 0
        ? (
            grandTotalSakit /
            totalAllPresensi *
            100
          ).toFixed(1)
        : '0.0';

    const izinRate =
      totalAllPresensi > 0
        ? (
            grandTotalIzin /
            totalAllPresensi *
            100
          ).toFixed(1)
        : '0.0';

    const alphaRate =
      totalAllPresensi > 0
        ? (
            grandTotalAlpha /
            totalAllPresensi *
            100
          ).toFixed(1)
        : '0.0';

    /* ------------------------------------------------------------------------
     * HEADER
     * ---------------------------------------------------------------------- */

    setCell(
      0,
      0,
      'LAPORAN ANALISIS & GRAFIK KEHADIRAN SISWA',
      {
        font: {
          name: 'Arial',
          sz: 14,
          bold: true,
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
      }
    );

    merges.push({
      s: {
        r: 0,
        c: 0,
      },
      e: {
        r: 0,
        c: 8,
      },
    });

    setCell(
      1,
      0,
      schoolName,
      {
        font: {
          name: 'Arial',
          sz: 12,
          bold: true,
          color: {
            rgb: '1E3A8A',
          },
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
      }
    );

    merges.push({
      s: {
        r: 1,
        c: 0,
      },
      e: {
        r: 1,
        c: 8,
      },
    });

    setCell(
      2,
      0,
      `PERIODE: ${periodLabel.toUpperCase()} — ${schoolYear.toUpperCase()}`,
      {
        font: {
          name: 'Arial',
          sz: 10,
          bold: true,
          color: {
            rgb: '475569',
          },
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
      }
    );

    merges.push({
      s: {
        r: 2,
        c: 0,
      },
      e: {
        r: 2,
        c: 8,
      },
    });

    /* ------------------------------------------------------------------------
     * METADATA
     * ---------------------------------------------------------------------- */

    setCell(
      4,
      0,
      `KELAS: ${classLevel.toUpperCase()}`,
      {
        font: {
          name: 'Arial',
          sz: 10,
          bold: true,
        },
      }
    );

    merges.push({
      s: {
        r: 4,
        c: 0,
      },
      e: {
        r: 4,
        c: 3,
      },
    });

    setCell(
      4,
      5,
      `TANGGAL CETAK: ${new Date().toLocaleDateString(
        'id-ID',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }
      )}`,
      {
        font: {
          name: 'Arial',
          sz: 10,
          bold: true,
        },
        alignment: {
          horizontal: 'right',
        },
      }
    );

    merges.push({
      s: {
        r: 4,
        c: 5,
      },
      e: {
        r: 4,
        c: 8,
      },
    });

    /* ------------------------------------------------------------------------
     * KPI CARDS
     * ---------------------------------------------------------------------- */

    const kpi = [
      {
        col: 0,
        endCol: 1,
        text: `TOTAL SISWA: ${grandTotalSiswa} Siswa (Hadir: ${overallRate}%)`,
        fill: FILL_GREEN_CARD,
        color: '065F46',
      },
      {
        col: 2,
        endCol: 3,
        text: `SAKIT (S): ${grandTotalSakit} Hari (${sakitRate}%)`,
        fill: FILL_AMBER_CARD,
        color: '92400E',
      },
      {
        col: 4,
        endCol: 5,
        text: `IZIN (I): ${grandTotalIzin} Hari (${izinRate}%)`,
        fill: FILL_BLUE_CARD,
        color: '1E40AF',
      },
      {
        col: 6,
        endCol: 8,
        text: `ALPHA (A): ${grandTotalAlpha} Hari (${alphaRate}%)`,
        fill: FILL_RED_CARD,
        color: '991B1B',
      },
    ];

    kpi.forEach(
      (card) => {

        setCell(
          6,
          card.col,
          card.text,
          {
            font: {
              name: 'Arial',
              sz: 9,
              bold: true,
              color: {
                rgb: card.color,
              },
            },
            fill: card.fill,
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
            border: BORDER_THIN,
          }
        );

        merges.push({
          s: {
            r: 6,
            c: card.col,
          },
          e: {
            r: 6,
            c: card.endCol,
          },
        });
      }
    );

    /* ------------------------------------------------------------------------
     * CHART SECTION
     * ---------------------------------------------------------------------- */

    const chartBannerRow =
      8;

    const isMonthly =
      params.periodType === 'month';

    setCell(
      chartBannerRow,
      0,
      isMonthly
        ? `A. DISTRIBUSI KEHADIRAN & B. DISTRIBUSI KETIDAKHADIRAN — ${periodLabel.toUpperCase()}`
        : `A. GRAFIK ANALISIS KEHADIRAN SISWA — PERIODE ${periodLabel.toUpperCase()}`,
      {
        font: {
          name: 'Arial',
          sz: 11,
          bold: true,
          color: {
            rgb: 'FFFFFF',
          },
        },
        fill: FILL_DARK,
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
      }
    );

    merges.push({
      s: {
        r: chartBannerRow,
        c: 0,
      },
      e: {
        r: chartBannerRow,
        c: 8,
      },
    });

    /* ------------------------------------------------------------------------
     * CHART BACKGROUND AREA
     * ---------------------------------------------------------------------- */

    for (
      let row = 9;
      row <= 24;
      row++
    ) {

      for (
        let col = 0;
        col <= 8;
        col++
      ) {

        setCell(
          row,
          col,
          '',
          {
            fill:
              FILL_CHART,
          }
        );
      }
    }

    /* ------------------------------------------------------------------------
     * HIDDEN CHART SOURCE DATA
     *
     * K = Periode
     * L = Hadir
     * M = Sakit
     * N = Izin
     * O = Alpha
     *
     * Ini tetap disimpan sebagai data asli worksheet.
     * ---------------------------------------------------------------------- */

    setCell(
      0,
      10,
      'Periode'
    );

    setCell(
      0,
      11,
      'Hadir (H)'
    );

    setCell(
      0,
      12,
      'Sakit (S)'
    );

    setCell(
      0,
      13,
      'Izin (I)'
    );

    setCell(
      0,
      14,
      'Alpha (A)'
    );

    let chart1Series:
      NativeChartSeries[] = [];

    let chart2Series:
      NativeChartSeries[] = [];

    let chart1Title =
      '';

    let chart2Title =
      '';

    let chart1Max =
      1.05;

    let chart2Max =
      0.05;

    /* ------------------------------------------------------------------------
     * DATA SOURCE COLUMNS HEADER (K:O)
     * ---------------------------------------------------------------------- */

    setCell(0, 10, 'PERIODE', { font: { name: 'Arial', sz: 9, bold: true } });
    setCell(0, 11, 'HADIR (%)', { font: { name: 'Arial', sz: 9, bold: true } });
    setCell(0, 12, 'SAKIT (%)', { font: { name: 'Arial', sz: 9, bold: true } });
    setCell(0, 13, 'IZIN (%)', { font: { name: 'Arial', sz: 9, bold: true } });
    setCell(0, 14, 'ALPHA (%)', { font: { name: 'Arial', sz: 9, bold: true } });

    /* ------------------------------------------------------------------------
     * BULANAN
     * ---------------------------------------------------------------------- */

    if (
      params.periodType ===
      'month'
    ) {

      const hVal =
        totalAllPresensi > 0
          ? Number(
              (
                grandTotalHadir /
                totalAllPresensi
              ).toFixed(6)
            )
          : 1;

      const sVal =
        totalAllPresensi > 0
          ? Number(
              (
                grandTotalSakit /
                totalAllPresensi
              ).toFixed(6)
            )
          : 0;

      const iVal =
        totalAllPresensi > 0
          ? Number(
              (
                grandTotalIzin /
                totalAllPresensi
              ).toFixed(6)
            )
          : 0;

      const aVal =
        totalAllPresensi > 0
          ? Number(
              (
                grandTotalAlpha /
                totalAllPresensi
              ).toFixed(6)
            )
          : 0;

      setCell(
        1,
        10,
        periodLabel
      );

      setCell(
        1,
        11,
        hVal,
        undefined,
        '0.0%'
      );

      setCell(
        1,
        12,
        sVal,
        undefined,
        '0.0%'
      );

      setCell(
        1,
        13,
        iVal,
        undefined,
        '0.0%'
      );

      setCell(
        1,
        14,
        aVal,
        undefined,
        '0.0%'
      );

      /* ----------------------------------------------------------------------
       * CHART 1 — HADIR
       * -------------------------------------------------------------------- */

      chart1Title =
        `A. DISTRIBUSI KEHADIRAN — HADIR ${(hVal * 100).toFixed(1)}%`;

      chart1Series = [
        {
          name: 'Hadir (H)',

          nameFormula:
            `'${sheetName}'!$L$1`,

          color:
            '16A34A',

          borderColor:
            '15803D',

          categories: [
            periodLabel,
          ],

          catFormula:
            `'${sheetName}'!$K$2`,

          values: [
            hVal,
          ],

          valFormula:
            `'${sheetName}'!$L$2`,
        },
      ];

      chart1Max =
        1.05;

      /* ----------------------------------------------------------------------
       * CHART 2 — S / I / A (DYNAMIC SCALING)
       * -------------------------------------------------------------------- */

      const maxAbsRate =
        Math.max(
          sVal,
          iVal,
          aVal,
          0.005
        );

      if (
        maxAbsRate <=
        0.015
      ) {
        chart2Max =
          0.02; // Skala 0 - 2.0% bila ketidakhadiran normal di bawah 1.5%
      } else if (
        maxAbsRate <=
        0.025
      ) {
        chart2Max =
          0.03; // Skala 0 - 3.0%
      } else if (
        maxAbsRate <=
        0.045
      ) {
        chart2Max =
          0.05; // Skala 0 - 5.0%
      } else if (
        maxAbsRate <=
        0.08
      ) {
        chart2Max =
          0.10; // Skala 0 - 10.0%
      } else if (
        maxAbsRate <=
        0.15
      ) {
        chart2Max =
          0.20; // Skala 0 - 20.0%
      } else {
        chart2Max =
          Math.min(
            1.0,
            Math.ceil(
              maxAbsRate *
                1.25 *
                10
            ) / 10
          );
      }

      chart2Title =
        `B. DISTRIBUSI KETIDAKHADIRAN — SKALA 0%–${(
          chart2Max * 100
        ).toFixed(0)}%`;

      chart2Series = [
        {
          name:
            'Sakit (S)',

          nameFormula:
            `'${sheetName}'!$M$1`,

          color:
            'F59E0B',

          borderColor:
            'D97706',

          categories: [
            periodLabel,
          ],

          catFormula:
            `'${sheetName}'!$K$2`,

          values: [
            sVal,
          ],

          valFormula:
            `'${sheetName}'!$M$2`,
        },

        {
          name:
            'Izin (I)',

          nameFormula:
            `'${sheetName}'!$N$1`,

          color:
            '2563EB',

          borderColor:
            '1D4ED8',

          categories: [
            periodLabel,
          ],

          catFormula:
            `'${sheetName}'!$K$2`,

          values: [
            iVal,
          ],

          valFormula:
            `'${sheetName}'!$N$2`,
        },

        {
          name:
            'Alpha (A)',

          nameFormula:
            `'${sheetName}'!$O$1`,

          color:
            'DC2626',

          borderColor:
            'B91C1C',

          categories: [
            periodLabel,
          ],

          catFormula:
            `'${sheetName}'!$K$2`,

          values: [
            aVal,
          ],

          valFormula:
            `'${sheetName}'!$O$2`,
        },
      ];
    }

    /* ------------------------------------------------------------------------
     * SEMESTER / TAHUNAN (DUAL-CHART DASHBOARD)
     * ---------------------------------------------------------------------- */

    else {

      const categories:
        string[] = [];

      const hValues:
        number[] = [];

      const sValues:
        number[] = [];

      const iValues:
        number[] = [];

      const aValues:
        number[] = [];

      params.rows.forEach(
        (
          row,
          index
        ) => {

          const effective =
            Number(row.hariEfektif) || 20;

          const numStudents =
            Number(row.totalSiswa) ||
            grandTotalSiswa ||
            1;

          const totalRowPresensi =
            numStudents *
            effective;

          const sCount =
            Number(row.sakit) || 0;

          const iCount =
            Number(row.izin) || 0;

          const aCount =
            Number(row.alpha) || 0;

          const sRate =
            totalRowPresensi > 0
              ? Number(
                  (
                    sCount /
                    totalRowPresensi
                  ).toFixed(6)
                )
              : 0;

          const iRate =
            totalRowPresensi > 0
              ? Number(
                  (
                    iCount /
                    totalRowPresensi
                  ).toFixed(6)
                )
              : 0;

          const aRate =
            totalRowPresensi > 0
              ? Number(
                  (
                    aCount /
                    totalRowPresensi
                  ).toFixed(6)
                )
              : 0;

          let hRate = 0;
          if (
            row.rate !== undefined &&
            row.rate !== null &&
            !Number.isNaN(Number(row.rate))
          ) {
            hRate = Number(
              (
                Math.max(
                  0,
                  Math.min(
                    100,
                    Number(row.rate)
                  )
                ) / 100
              ).toFixed(6)
            );
          } else {
            hRate = Math.max(
              0,
              Number(
                (
                  1 -
                  sRate -
                  iRate -
                  aRate
                ).toFixed(6)
              )
            );
          }

          const periodName =
            String(
              row.periode ||
                `Periode ${index + 1}`
            );

          categories.push(
            periodName
          );

          hValues.push(
            hRate
          );

          sValues.push(
            sRate
          );

          iValues.push(
            iRate
          );

          aValues.push(
            aRate
          );

          setCell(
            index + 1,
            10,
            periodName
          );

          setCell(
            index + 1,
            11,
            hRate,
            undefined,
            '0.0%'
          );

          setCell(
            index + 1,
            12,
            sRate,
            undefined,
            '0.0%'
          );

          setCell(
            index + 1,
            13,
            iRate,
            undefined,
            '0.0%'
          );

          setCell(
            index + 1,
            14,
            aRate,
            undefined,
            '0.0%'
          );
        }
      );

      const endRow =
        Math.max(
          2,
          1 +
            params.rows.length
        );

      /* ----------------------------------------------------------------------
       * CHART 1 — TREN KEHADIRAN (HADIR %)
       * -------------------------------------------------------------------- */

      chart1Title =
        `A. TREN TINGKAT KEHADIRAN — KELAS ${classLevel.toUpperCase()}`;

      chart1Series = [
        {
          name:
            'Hadir (H)',

          nameFormula:
            `'${sheetName}'!$L$1`,

          color:
            '10B981',

          borderColor:
            '059669',

          categories,

          catFormula:
            `'${sheetName}'!$K$2:$K$${endRow}`,

          values:
            hValues,

          valFormula:
            `'${sheetName}'!$L$2:$L$${endRow}`,
        },
      ];

      chart1Max = 1.05;

      /* ----------------------------------------------------------------------
       * CHART 2 — PERBANDINGAN KETIDAKHADIRAN (S/I/A) (DYNAMIC SCALING)
       * -------------------------------------------------------------------- */

      const maxAbsRate =
        Math.max(
          ...sValues,
          ...iValues,
          ...aValues,
          0.005
        );

      if (
        maxAbsRate <=
        0.015
      ) {
        chart2Max =
          0.02; // Default rentang 0% - 2.0%
      } else if (
        maxAbsRate <=
        0.025
      ) {
        chart2Max =
          0.03; // Auto naik ke 3.0%
      } else if (
        maxAbsRate <=
        0.045
      ) {
        chart2Max =
          0.05; // Auto naik ke 5.0%
      } else if (
        maxAbsRate <=
        0.08
      ) {
        chart2Max =
          0.10; // Auto naik ke 10.0%
      } else if (
        maxAbsRate <=
        0.15
      ) {
        chart2Max =
          0.20; // Auto naik ke 20.0%
      } else {
        chart2Max =
          Math.min(
            1.0,
            Math.ceil(
              maxAbsRate *
                1.25 *
                10
            ) / 10
          );
      }

      chart2Title =
        `B. PERBANDINGAN KETIDAKHADIRAN (S/I/A) — SKALA 0%–${(
          chart2Max * 100
        ).toFixed(0)}%`;

      chart2Series = [
        {
          name:
            'Sakit (S)',

          nameFormula:
            `'${sheetName}'!$M$1`,

          color:
            'F59E0B',

          borderColor:
            'D97706',

          categories,

          catFormula:
            `'${sheetName}'!$K$2:$K$${endRow}`,

          values:
            sValues,

          valFormula:
            `'${sheetName}'!$M$2:$M$${endRow}`,
        },

        {
          name:
            'Izin (I)',

          nameFormula:
            `'${sheetName}'!$N$1`,

          color:
            '2563EB',

          borderColor:
            '1D4ED8',

          categories,

          catFormula:
            `'${sheetName}'!$K$2:$K$${endRow}`,

          values:
            iValues,

          valFormula:
            `'${sheetName}'!$N$2:$N$${endRow}`,
        },

        {
          name:
            'Alpha (A)',

          nameFormula:
            `'${sheetName}'!$O$1`,

          color:
            'DC2626',

          borderColor:
            'B91C1C',

          categories,

          catFormula:
            `'${sheetName}'!$K$2:$K$${endRow}`,

          values:
            aValues,

          valFormula:
            `'${sheetName}'!$O$2:$O$${endRow}`,
        },
      ];
    }

    /* ------------------------------------------------------------------------
     * TABLE
     * ---------------------------------------------------------------------- */

    const tableTitleRow =
      26;

    setCell(
      tableTitleRow,
      0,
      'C. TABEL REKAPITULASI DETAIL KEHADIRAN SISWA',
      {
        font: {
          name: 'Arial',
          sz: 11,
          bold: true,
          color: {
            rgb: 'FFFFFF',
          },
        },
        fill:
          FILL_SECTION,
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
      }
    );

    merges.push({
      s: {
        r: tableTitleRow,
        c: 0,
      },
      e: {
        r: tableTitleRow,
        c: 8,
      },
    });

    const tableHeaderRow =
      tableTitleRow + 1;

    const headers = [
      'NO',
      'PERIODE / BULAN',
      'JUMLAH SISWA',
      'HARI EFEKTIF',
      'TOTAL HADIR (H)',
      'SAKIT (S)',
      'IZIN (I)',
      'ALPHA (A)',
      'PERSENTASE KEHADIRAN (%)',
    ];

    headers.forEach(
      (
        header,
        col
      ) => {

        setCell(
          tableHeaderRow,
          col,
          header,
          {
            font: {
              name: 'Arial',
              sz: 10,
              bold: true,
              color: {
                rgb: '000000',
              },
            },
            fill:
              FILL_YELLOW,
            alignment: {
              horizontal:
                'center',
              vertical:
                'center',
              wrapText:
                true,
            },
            border:
              BORDER_DARK,
          }
        );
      }
    );

    const dataStartRow =
      tableHeaderRow + 1;

    params.rows.forEach(
      (
        row,
        index
      ) => {

        const r =
          dataStartRow +
          index;

        setCell(
          r,
          0,
          index + 1,
          {
            font: {
              sz: 9,
            },
            alignment: {
              horizontal:
                'center',
            },
            border:
              BORDER_DARK,
          }
        );

        setCell(
          r,
          1,
          row.periode,
          {
            font: {
              sz: 9,
              bold: true,
            },
            alignment: {
              horizontal:
                'left',
            },
            border:
              BORDER_DARK,
          }
        );

        setCell(
          r,
          2,
          Number(
            row.totalSiswa
          ) || 0,
          {
            font: {
              sz: 9,
            },
            alignment: {
              horizontal:
                'center',
            },
            border:
              BORDER_DARK,
          }
        );

        setCell(
          r,
          3,
          Number(
            row.hariEfektif
          ) || 0,
          {
            font: {
              sz: 9,
            },
            alignment: {
              horizontal:
                'center',
            },
            border:
              BORDER_DARK,
          }
        );

        setCell(
          r,
          4,
          Number(
            row.totalHadir
          ) || 0,
          {
            font: {
              sz: 9,
              bold: true,
              color: {
                rgb: '065F46',
              },
            },
            alignment: {
              horizontal:
                'center',
            },
            border:
              BORDER_DARK,
          }
        );

        setCell(
          r,
          5,
          Number(
            row.sakit
          ) || 0,
          {
            font: {
              sz: 9,
              color: {
                rgb: '92400E',
              },
            },
            alignment: {
              horizontal:
                'center',
            },
            border:
              BORDER_DARK,
          }
        );

        setCell(
          r,
          6,
          Number(
            row.izin
          ) || 0,
          {
            font: {
              sz: 9,
              color: {
                rgb: '1E40AF',
              },
            },
            alignment: {
              horizontal:
                'center',
            },
            border:
              BORDER_DARK,
          }
        );

        setCell(
          r,
          7,
          Number(
            row.alpha
          ) || 0,
          {
            font: {
              sz: 9,
              color: {
                rgb: '991B1B',
              },
            },
            alignment: {
              horizontal:
                'center',
            },
            border:
              BORDER_DARK,
          }
        );

        setCell(
          r,
          8,
          `${Number(
            row.rate || 0
          ).toFixed(1)}%`,
          {
            font: {
              sz: 9,
              bold: true,
              color: {
                rgb: '065F46',
              },
            },
            alignment: {
              horizontal:
                'center',
            },
            border:
              BORDER_DARK,
          }
        );
      }
    );

    const lastDataRow =
      dataStartRow +
      params.rows.length;

    /* ------------------------------------------------------------------------
     * TOTAL
     * ---------------------------------------------------------------------- */

    setCell(
      lastDataRow,
      0,
      'TOTAL / RATA-RATA',
      {
        font: {
          sz: 10,
          bold: true,
        },
        fill:
          FILL_LIGHT_BLUE,
        alignment: {
          horizontal:
            'center',
        },
        border:
          BORDER_DARK,
      }
    );

    setCell(
      lastDataRow,
      1,
      '',
      {
        fill:
          FILL_LIGHT_BLUE,
        border:
          BORDER_DARK,
      }
    );

    merges.push({
      s: {
        r: lastDataRow,
        c: 0,
      },
      e: {
        r: lastDataRow,
        c: 1,
      },
    });

    const totalCells = [
      grandTotalSiswa,
      '-',
      grandTotalHadir,
      grandTotalSakit,
      grandTotalIzin,
      grandTotalAlpha,
      `${overallRate}%`,
    ];

    totalCells.forEach(
      (
        value,
        index
      ) => {

        const col =
          index + 2;

        setCell(
          lastDataRow,
          col,
          value,
          {
            font: {
              sz: 10,
              bold: true,
            },
            fill:
              FILL_LIGHT_BLUE,
            alignment: {
              horizontal:
                'center',
            },
            border:
              BORDER_DARK,
          }
        );
      }
    );

    /* ------------------------------------------------------------------------
     * NOTE
     * ---------------------------------------------------------------------- */

    const noteRow =
      lastDataRow + 2;

    setCell(
      noteRow,
      0,
      'CATATAN ANALISIS KEDISIPLINAN & TREN KEHADIRAN:',
      {
        font: {
          sz: 10,
          bold: true,
        },
      }
    );

    merges.push({
      s: {
        r: noteRow,
        c: 0,
      },
      e: {
        r: noteRow,
        c: 8,
      },
    });

    setCell(
      noteRow + 1,
      0,
      params.summaryNote ||
        `Tingkat kedisiplinan dan rata-rata kehadiran siswa kelas ${classLevel} berada di angka ${overallRate}%. Hubungan komunikasi rutin antara wali kelas dan orang tua murid perlu dijaga untuk mempertahankan kehadiran optimal.`,
      {
        font: {
          sz: 9,
          italic: true,
        },
      }
    );

    merges.push({
      s: {
        r: noteRow + 1,
        c: 0,
      },
      e: {
        r: noteRow + 1,
        c: 8,
      },
    });

    /* ------------------------------------------------------------------------
     * SIGNATURE
     * ---------------------------------------------------------------------- */

    const sigRow =
      noteRow + 4;

    setCell(
      sigRow,
      1,
      'Mengetahui / Menyetujui',
      {
        font: {
          sz: 10,
        },
      }
    );

    setCell(
      sigRow + 1,
      1,
      'Kepala Sekolah',
      {
        font: {
          sz: 10,
          bold: true,
        },
      }
    );

    setCell(
      sigRow + 4,
      1,
      headmasterName,
      {
        font: {
          sz: 10,
          bold: true,
          underline: true,
        },
      }
    );

    setCell(
      sigRow,
      6,
      'GURU KELAS / WALI KELAS',
      {
        font: {
          sz: 10,
          bold: true,
        },
      }
    );

    setCell(
      sigRow + 4,
      6,
      teacherName,
      {
        font: {
          sz: 10,
          bold: true,
          underline: true,
        },
      }
    );

    ws['!merges'] =
      merges;

    /* ------------------------------------------------------------------------
     * COLUMN WIDTH (J:O visible for proper chart rendering)
     * ---------------------------------------------------------------------- */

    ws['!cols'] = [
      {
        wch: 8,
      },
      {
        wch: 20,
      },
      {
        wch: 14,
      },
      {
        wch: 14,
      },
      {
        wch: 16,
      },
      {
        wch: 12,
      },
      {
        wch: 12,
      },
      {
        wch: 14,
      },
      {
        wch: 26,
      },

      // J spacer
      {
        wch: 4,
      },

      // K:O source chart (visible so Excel renders charts cleanly)
      {
        wch: 18,
      },
      {
        wch: 14,
      },
      {
        wch: 14,
      },
      {
        wch: 14,
      },
      {
        wch: 14,
      },
    ];

    /* ------------------------------------------------------------------------
     * PAGE SETUP & MARGINS (Landscape, Print only columns A to I)
     * ---------------------------------------------------------------------- */

    ws['!pageSetup'] = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToWidth: 1,
      fitToHeight: 0,
    };

    ws['!margins'] = {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3,
    };

    /* ------------------------------------------------------------------------
     * ROW HEIGHT
     * ---------------------------------------------------------------------- */

    const maxRowIndex =
      Math.max(
        sigRow + 6,
        30,
        dataStartRow +
          params.rows.length +
          4
      );

    const rowHeights:
      XLSX.RowInfo[] = [];

    for (
      let row = 0;
      row <= maxRowIndex;
      row++
    ) {

      if (
        row === 0
      ) {
        rowHeights.push({
          hpt: 26,
        });
      }

      else if (
        row === 1 ||
        row === 2
      ) {
        rowHeights.push({
          hpt: 20,
        });
      }

      else if (
        row === 6
      ) {
        rowHeights.push({
          hpt: 24,
        });
      }

      else if (
        row === chartBannerRow ||
        row === tableTitleRow
      ) {
        rowHeights.push({
          hpt: 26,
        });
      }

      else if (
        row >= 9 &&
        row <= 24
      ) {
        rowHeights.push({
          hpt: 20,
        });
      }

      else if (
        row === tableHeaderRow
      ) {
        rowHeights.push({
          hpt: 28,
        });
      }

      else if (
        row >= dataStartRow &&
        row <= lastDataRow
      ) {
        rowHeights.push({
          hpt: 20,
        });
      }

      else {
        rowHeights.push({
          hpt: 18,
        });
      }
    }

    ws['!rows'] =
      rowHeights;

    /* ------------------------------------------------------------------------
     * WORKSHEET RANGE
     *
     * K:O WAJIB ikut !ref karena chart membaca data dari sana.
     * ---------------------------------------------------------------------- */

    ws['!ref'] =
      XLSX.utils.encode_range({
        s: {
          r: 0,
          c: 0,
        },
        e: {
          r: maxRowIndex,
          c: 14,
        },
      });

    /* ------------------------------------------------------------------------
     * APPEND SHEET
     * ---------------------------------------------------------------------- */

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      sheetName
    );

    /* ------------------------------------------------------------------------
     * GENERATE XLSX DASAR
     * ---------------------------------------------------------------------- */

    const rawArray =
      XLSX.write(
        wb,
        {
          type: 'array',
          bookType: 'xlsx',
        }
      );

    const zip =
      await JSZip.loadAsync(
        rawArray
      );

    /* ========================================================================
     * CHART COUNT (DUAL-CHART DASHBOARD: CHART 1 & CHART 2)
     * ====================================================================== */

    const chartCount:
      1 | 2 = 2;

    /* ========================================================================
     * CREATE CHART XML
     * ====================================================================== */

    const chart1Xml =
      buildNativeChartXml({
        title:
          chart1Title,

        series:
          chart1Series,

        gapWidth:
          isMonthly
            ? 160
            : params.rows.length === 1
              ? 160
              : 120,

        overlap:
          0,

        minVal:
          isMonthly
            ? 0
            : params.rows.length <= 1
              ? 0
              : Math.max(
                  0,
                  Math.floor(
                    (
                      Math.min(
                        ...params.rows.map(
                          (
                            row
                          ) =>
                            Number(
                              row.rate
                            ) ||
                            0
                        )
                      ) - 6
                    ) /
                      10
                  ) *
                    0.1
                ),

        maxVal:
          isMonthly
            ? chart1Max
            : params.rows.length === 1
              ? 1.15
              : 1.05,

        formatCode:
          '0.0%',

        axIdBase:
          12345600,
      });

    zip.file(
      'xl/charts/chart1.xml',
      chart1Xml
    );

    const chart2Xml =
      buildNativeChartXml({
        title:
          chart2Title,

        series:
          chart2Series,

        gapWidth:
          isMonthly
            ? 120
            : 80,

        overlap:
          0,

        minVal:
          0,

        maxVal:
          chart2Max,

        formatCode:
          '0.0%',

        /**
         * BASE BERBEDA.
         *
         * Jadi chart 1 dan chart 2 tidak
         * memakai axis ID yang sama.
         */
        axIdBase:
          22345600,
      });

    zip.file(
      'xl/charts/chart2.xml',
      chart2Xml
    );

    /* ========================================================================
     * DRAWING RELATIONSHIPS
     *
     * drawing1.xml
     *       |
     *       +--> chart1.xml
     *       |
     *       +--> chart2.xml
     * ====================================================================== */

    const drawingRelsPath =
      'xl/drawings/_rels/drawing1.xml.rels';

    let drawingRelsXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>

<Relationships
  xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

    const chart1RelId =
      'rId1';

    const chart2RelId =
      'rId2';

    drawingRelsXml =
      ensureRelationship(
        drawingRelsXml,
        {
          id:
            chart1RelId,

          type:
            'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',

          target:
            '../charts/chart1.xml',
        }
      );

    if (
      chart2Xml
    ) {

      drawingRelsXml =
        ensureRelationship(
          drawingRelsXml,
          {
            id:
              chart2RelId,

            type:
              'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',

            target:
              '../charts/chart2.xml',
          }
        );
    }

    zip.file(
      drawingRelsPath,
      drawingRelsXml
    );

    /* ========================================================================
     * DRAWING XML
     * ====================================================================== */

    const drawingXml =
      buildChartDrawingXml(
        chartCount,
        chart1RelId,
        chart2Xml
          ? chart2RelId
          : undefined
      );

    zip.file(
      'xl/drawings/drawing1.xml',
      drawingXml
    );

    /* ========================================================================
     * WORKSHEET RELATIONSHIP
     *
     * sheet1.xml
     *      |
     *      +--> drawing1.xml
     * ====================================================================== */

    const sheetRelsPath =
      'xl/worksheets/_rels/sheet1.xml.rels';

    let sheetRelsXml =
      '';

    const existingSheetRels =
      zip.file(
        sheetRelsPath
      );

    if (
      existingSheetRels
    ) {

      sheetRelsXml =
        await existingSheetRels.async(
          'string'
        );

    } else {

      sheetRelsXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>

<Relationships
  xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
    }

    let drawingRelId =
      '';

    /**
     * Cari relationship drawing yang sudah ada.
     */
    const existingDrawingMatch =
      sheetRelsXml.match(
        /<Relationship\b[^>]*Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/drawing"[^>]*>/i
      ) ||
      sheetRelsXml.match(
        /<Relationship\b[^>]*Type='http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/drawing'[^>]*>/i
      );

    if (
      existingDrawingMatch
    ) {

      const idMatch =
        existingDrawingMatch[0].match(
          /\bId=["']([^"']+)["']/i
        );

      if (
        idMatch
      ) {
        drawingRelId =
          idMatch[1];
      }
    }

    /**
     * Kalau belum ada, buat ID baru.
     */
    if (
      !drawingRelId
    ) {

      drawingRelId =
        getNextRelationshipId(
          sheetRelsXml
        );

      sheetRelsXml =
        ensureRelationship(
          sheetRelsXml,
          {
            id:
              drawingRelId,

            type:
              'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing',

            target:
              '../drawings/drawing1.xml',
          }
        );

    } else {

      /**
       * Kalau relationship sudah ada tetapi target-nya berbeda,
       * jangan biarkan pointing ke file lain.
       */
      sheetRelsXml =
        sheetRelsXml.replace(
          new RegExp(
            `<Relationship\\b([^>]*\\bId=["']${drawingRelId}["'][^>]*)/>`,
            'i'
          ),
          (
            _full,
            attributes
          ) => {

            let updated =
              String(
                attributes
              );

            updated =
              updated.replace(
                /\bTarget=["'][^"']*["']/i,
                'Target="../drawings/drawing1.xml"'
              );

            return `<Relationship${updated}/>`;
          }
        );
    }

    zip.file(
      sheetRelsPath,
      sheetRelsXml
    );

    /* ========================================================================
     * WORKSHEET XML
     *
     * Drawing harus berada di posisi schema worksheet yang valid.
     *
     * Urutan aman:
     *
     * ...
     * pageMargins
     * pageSetup
     * headerFooter
     * ...
     * drawing
     * legacyDrawing
     * ...
     * ====================================================================== */

    const sheetPath =
      'xl/worksheets/sheet1.xml';

    const sheetFile =
      zip.file(
        sheetPath
      );

    if (
      !sheetFile
    ) {
      throw new Error(
        'Gagal menemukan xl/worksheets/sheet1.xml.'
      );
    }

    let sheetXml =
      await sheetFile.async(
        'string'
      );

    /**
     * Pastikan namespace r ada.
     */
    if (
      !sheetXml.includes(
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
      )
    ) {

      sheetXml =
        sheetXml.replace(
          /<worksheet\b([^>]*)>/i,
          `<worksheet$1 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
        );
    }

    /**
     * Hapus drawing yang mungkin tersisa dari proses sebelumnya.
     */
    sheetXml =
      sheetXml.replace(
        /<drawing\b[^>]*\/>/gi,
        ''
      );

    sheetXml =
      sheetXml.replace(
        /<drawing\b[^>]*>[\s\S]*?<\/drawing>/gi,
        ''
      );

    const drawingTag =
      `<drawing r:id="${escapeXml(
        drawingRelId
      )}"/>`;

    /**
     * Posisi schema:
     *
     * Drawing ditempatkan SETELAH headerFooter/pageSetup/pageMargins
     * dan sebelum legacyDrawing / picture / oleObjects / extLst.
     */
    const insertionTags = [
      '<legacyDrawing',
      '<legacyDrawingHF',
      '<picture',
      '<oleObjects',
      '<controls',
      '<webPublishItems',
      '<tableParts',
      '<extLst',
      '</worksheet>',
    ];

    let drawingInserted =
      false;

    for (
      const tag of insertionTags
    ) {

      const index =
        sheetXml.indexOf(
          tag
        );

      if (
        index !== -1
      ) {

        sheetXml =
          sheetXml.slice(
            0,
            index
          ) +
          drawingTag +
          sheetXml.slice(
            index
          );

        drawingInserted =
          true;

        break;
      }
    }

    if (
      !drawingInserted
    ) {
      throw new Error(
        'Gagal memasukkan drawing ke worksheet XML.'
      );
    }

    zip.file(
      sheetPath,
      sheetXml
    );

    /* ========================================================================
     * CONTENT TYPES
     * ====================================================================== */

    const contentTypesPath =
      '[Content_Types].xml';

    const contentTypesFile =
      zip.file(
        contentTypesPath
      );

    if (
      !contentTypesFile
    ) {
      throw new Error(
        'Gagal menemukan [Content_Types].xml.'
      );
    }

    let contentTypesXml =
      await contentTypesFile.async(
        'string'
      );

    const chartContentType =
      'application/vnd.openxmlformats-officedocument.drawingml.chart+xml';

    const drawingContentType =
      'application/vnd.openxmlformats-officedocument.drawing+xml';

    /**
     * Chart 1
     */
    if (
      !contentTypesXml.includes(
        'PartName="/xl/charts/chart1.xml"'
      )
    ) {
      contentTypesXml =
        contentTypesXml.replace(
          '</Types>',
          `<Override PartName="/xl/charts/chart1.xml" ContentType="${chartContentType}"/></Types>`
        );
    }

    /**
     * Chart 2
     */
    if (
      chart2Xml &&
      !contentTypesXml.includes(
        'PartName="/xl/charts/chart2.xml"'
      )
    ) {
      contentTypesXml =
        contentTypesXml.replace(
          '</Types>',
          `<Override PartName="/xl/charts/chart2.xml" ContentType="${chartContentType}"/></Types>`
        );
    }

    /**
     * Drawing
     */
    if (
      !contentTypesXml.includes(
        'PartName="/xl/drawings/drawing1.xml"'
      )
    ) {
      contentTypesXml =
        contentTypesXml.replace(
          '</Types>',
          `<Override PartName="/xl/drawings/drawing1.xml" ContentType="${drawingContentType}"/></Types>`
        );
    }

    zip.file(
      contentTypesPath,
      contentTypesXml
    );

    /* ========================================================================
     * WORKBOOK DEFINED NAMES (PRINT AREA A1:I[maxRow])
     *
     * Menetapkan Print_Area secara native sehingga saat dicetak / print preview,
     * Excel hanya mencetak area laporan (Kolom A-I) dan tidak mencetak kolom
     * data sumber grafik (Kolom J-O).
     * ====================================================================== */

    const wbXmlPath =
      'xl/workbook.xml';

    const wbXmlFile =
      zip.file(
        wbXmlPath
      );

    if (
      wbXmlFile
    ) {

      let wbXml =
        await wbXmlFile.async(
          'string'
        );

      const escapedSheetName =
        sheetName.replace(
          /'/g,
          "''"
        );

      const printAreaValue =
        `'${escapedSheetName}'!$A$1:$I$${
          maxRowIndex + 1
        }`;

      const printAreaDef =
        `<definedName name="_xlnm.Print_Area" localSheetId="0">${escapeXml(
          printAreaValue
        )}</definedName>`;

      if (
        wbXml.includes(
          '<definedNames>'
        )
      ) {

        wbXml =
          wbXml.replace(
            '</definedNames>',
            `${printAreaDef}</definedNames>`
          );

      } else if (
        wbXml.includes(
          '<definedNames/>'
        )
      ) {

        wbXml =
          wbXml.replace(
            '<definedNames/>',
            `<definedNames>${printAreaDef}</definedNames>`
          );

      } else {

        const insertBeforeTags = [
          '<calcPr',
          '<oleSize',
          '<customWorkbookViews',
          '<pivotCaches',
          '<smartTagPr',
          '<smartTagTypes',
          '<webPublishing',
          '<fileRecoveryPr',
          '<webPublishObjects',
          '<extLst',
          '</workbook>',
        ];

        let inserted =
          false;

        for (
          const tag of insertBeforeTags
        ) {

          const idx =
            wbXml.indexOf(
              tag
            );

          if (
            idx !== -1
          ) {

            wbXml =
              wbXml.slice(
                0,
                idx
              ) +
              `<definedNames>${printAreaDef}</definedNames>` +
              wbXml.slice(
                idx
              );

            inserted =
              true;

            break;
          }
        }

        if (
          !inserted
        ) {
          wbXml =
            wbXml.replace(
              '</workbook>',
              `<definedNames>${printAreaDef}</definedNames></workbook>`
            );
        }
      }

      zip.file(
        wbXmlPath,
        wbXml
      );
    }

    /* ========================================================================
     * FINAL VALIDATION
     *
     * Sebelum download, pastikan seluruh rantai object Excel tersedia.
     * ====================================================================== */

    const requiredParts = [
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/_rels/sheet1.xml.rels',
      'xl/drawings/drawing1.xml',
      'xl/drawings/_rels/drawing1.xml.rels',
      'xl/charts/chart1.xml',
      '[Content_Types].xml',
    ];

    if (
      chart2Xml
    ) {
      requiredParts.push(
        'xl/charts/chart2.xml'
      );
    }

    for (
      const part of requiredParts
    ) {

      if (
        !zip.file(part)
      ) {

        throw new Error(
          `Package XLSX tidak lengkap. Missing part: ${part}`
        );
      }
    }

    /**
     * Pastikan worksheet benar-benar punya drawing.
     */
    const finalSheetXml =
      await zip
        .file(
          'xl/worksheets/sheet1.xml'
        )!
        .async(
          'string'
        );

    if (
      !finalSheetXml.includes(
        `<drawing r:id="${drawingRelId}"/>`
      )
    ) {

      throw new Error(
        'Worksheet tidak memiliki drawing relationship yang valid.'
      );
    }

    /**
     * Pastikan drawing punya chart reference.
     */
    const finalDrawingXml =
      await zip
        .file(
          'xl/drawings/drawing1.xml'
        )!
        .async(
          'string'
        );

    if (
      !finalDrawingXml.includes(
        `r:id="${chart1RelId}"`
      )
    ) {

      throw new Error(
        'Drawing tidak terhubung ke chart1.xml.'
      );
    }

    if (
      chart2Xml &&
      !finalDrawingXml.includes(
        `r:id="${chart2RelId}"`
      )
    ) {

      throw new Error(
        'Drawing tidak terhubung ke chart2.xml.'
      );
    }

    /**
     * Pastikan chart XML tidak lagi mempunyai plotVisOnly
     * sebelum plotArea.
     */
    const finalChart1Xml =
      await zip
        .file(
          'xl/charts/chart1.xml'
        )!
        .async(
          'string'
        );

    const invalidPlotOrder =
      /<c:plotVisOnly[^>]*\/>\s*<c:plotArea/i;

    if (
      invalidPlotOrder.test(
        finalChart1Xml
      )
    ) {

      throw new Error(
        'Struktur chart1.xml tidak valid: plotVisOnly berada sebelum plotArea.'
      );
    }

    /* ========================================================================
     * DOWNLOAD
     * ====================================================================== */

    const safeClass =
      String(
        classLevel
      )
        .replace(
          /[\\/:*?"<>|]/g,
          ''
        )
        .replace(
          /\s+/g,
          '_'
        );

    const safePeriod =
      String(
        periodLabel
      )
        .replace(
          /[\\/:*?"<>|]/g,
          ''
        )
        .replace(
          /\s+/g,
          '_'
        );

    const fileName =
      `Laporan_Grafik_Kehadiran_Kelas_${safeClass}_${safePeriod}.xlsx`;

    if (
      typeof window !==
        'undefined' &&
      typeof document !==
        'undefined'
    ) {

      const blob =
        await zip.generateAsync({
          type: 'blob',

          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

          compression:
            'DEFLATE',

          compressionOptions: {
            level: 6,
          },
        });

      const url =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          'a'
        );

      anchor.href =
        url;

      anchor.download =
        fileName;

      anchor.style.display =
        'none';

      document.body.appendChild(
        anchor
      );

      anchor.click();

      document.body.removeChild(
        anchor
      );

      setTimeout(
        () => {
          URL.revokeObjectURL(
            url
          );
        },
        2000
      );

    } else {

      const buffer =
        await zip.generateAsync({
          type:
            'nodebuffer',

          compression:
            'DEFLATE',

          compressionOptions: {
            level: 6,
          },
        });

      const fs =
        await import(
          'fs'
        );

      fs.writeFileSync(
        fileName,
        buffer
      );
    }
  };