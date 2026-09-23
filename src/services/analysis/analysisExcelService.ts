import XLSX from 'xlsx-js-style';
import {
  AnalysisSession,
  AnalysisSubject,
  StudentAnswers,
} from '../../types/analysisTypes';
import { Student } from '../studentStorage';
import { calculateMaxScore } from './analysisCalculationService';
import { MASTER_ANALYSIS_TEMPLATE_BASE64 } from './masterTemplateData';

/**
 * PETA KOLOM STRUKTUR MAKSIMUM TETAP SDIT AL FIKRI
 *
 * A     (c=0)       = No
 * B     (c=1)       = Nama Peserta Didik
 * C:AP  (c=2..41)   = Pilihan Ganda nomor 1–40 (40 kolom)
 * AQ    (c=42)      = Jumlah Jawaban Benar Pilihan Ganda
 * AR:BA (c=43..52)  = Isian Singkat nomor 1–10 (10 kolom)
 * BB    (c=53)      = Jumlah Jawaban Benar Isian Singkat
 * BC:BL (c=54..63)  = Essay/Menjodohkan nomor 1–10 (10 kolom)
 * BM    (c=64)      = Jumlah Jawaban Benar Essay/Menjodohkan
 * BN    (c=65)      = Total Nilai
 * BO    (c=66)      = Nilai Akhir
 * BP    (c=67)      = L
 * BQ    (c=68)      = TL
 */
export const EXCEL_COLUMN_MAP = {
  NO: 0, // A
  NAME: 1, // B

  PG_START: 2, // C
  PG_MAX_COUNT: 40,
  PG_END_MAX: 41, // AP
  PG_TOTAL: 42, // AQ

  ISIAN_START: 43, // AR
  ISIAN_MAX_COUNT: 10,
  ISIAN_END_MAX: 52, // BA
  ISIAN_TOTAL: 53, // BB

  C_START: 54, // BC
  C_MAX_COUNT: 10,
  C_END_MAX: 63, // BL
  C_TOTAL: 64, // BM

  TOTAL_SCORE: 65, // BN
  FINAL_GRADE: 66, // BO
  PASSED: 67, // BP
  FAILED: 68, // BQ

  TOTAL_COLUMNS: 69,
};

// ==========================================
// PUSTAKA STYLING RESMI SDIT AL FIKRI
// ==========================================
const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

const FILL_YELLOW = {
  patternType: 'solid',
  fgColor: { rgb: 'FFFF00' },
};

const FILL_BLACK = {
  patternType: 'solid',
  fgColor: { rgb: '000000' },
};

const STYLE_TITLE_1 = {
  font: { name: 'Arial', sz: 12, bold: true, color: { rgb: '000000' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const STYLE_TITLE_2 = {
  font: { name: 'Arial', sz: 11, bold: true, color: { rgb: '000000' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const STYLE_META_LABEL = {
  font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '000000' } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const STYLE_META_VAL = {
  font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '000000' } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const STYLE_HEADER_TABLE = {
  font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '000000' } },
  fill: FILL_YELLOW,
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDER_THIN,
};

const STYLE_ROW_10_BLACK = {
  fill: FILL_BLACK,
  border: BORDER_THIN,
};

const STYLE_CELL_CENTER = {
  font: { name: 'Arial', sz: 9, color: { rgb: '000000' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_CELL_NAME = {
  font: { name: 'Arial', sz: 9, color: { rgb: '000000' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_SUMMARY_LABEL = {
  font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '000000' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_SUMMARY_NUM = {
  font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '000000' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_SIGNATURE = {
  font: { name: 'Arial', sz: 10, color: { rgb: '000000' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const STYLE_SIGNATURE_BOLD = {
  font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '000000' }, underline: true },
  alignment: { horizontal: 'center', vertical: 'center' },
};

/**
 * Generate dan download Workbook Excel Proyek Analisis Lengkap
 * Menggunakan Master Template Resmi Sekolah SDIT AL FIKRI
 */
export function exportAnalysisProjectToExcel(
  session: AnalysisSession,
  students: Student[]
): void {
  const wb = XLSX.utils.book_new();

  // 1. Sort students alphabetically
  const sortedStudents = [...students].sort((a, b) =>
    a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
  );

  // 2. Generate Sheet untuk setiap Mata Pelajaran menggunakan Master Template
  session.subjects.forEach((subject) => {
    const ws = generateSubjectWorksheet(session, subject, sortedStudents);
    const sheetName = subject.sheetName.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // 3. Generate Sheet REKAP NILAI
  const rekapWs = generateRekapWorksheet(session, sortedStudents);
  XLSX.utils.book_append_sheet(wb, rekapWs, 'REKAP NILAI');

  // 4. Generate Hidden Metadata Sheet `_ANALYSIS_META` untuk restore & import data
  const metaWs = generateMetadataWorksheet(session, sortedStudents);
  XLSX.utils.book_append_sheet(wb, metaWs, '_ANALYSIS_META');

  // 5. Download File Excel
  const safeClass = session.className.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExam = session.examType.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Analisis_Soal_${safeClass}_${safeExam}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Generate single-subject Excel file untuk guru mata pelajaran (1 Kelas)
 */
export function exportSingleSubjectToExcel(
  session: AnalysisSession,
  subject: AnalysisSubject,
  students: Student[]
): void {
  const wb = XLSX.utils.book_new();
  const sortedStudents = [...students].sort((a, b) =>
    a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
  );

  const ws = generateSubjectWorksheet(session, subject, sortedStudents);
  const sheetName = subject.sheetName.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Metadata for single subject import
  const singleSession: AnalysisSession = {
    ...session,
    filePurpose: 'SUBJECT_IMPORT',
    subjects: [subject],
  };
  const metaWs = generateMetadataWorksheet(singleSession, sortedStudents);
  XLSX.utils.book_append_sheet(wb, metaWs, '_ANALYSIS_META');

  const safeClass = session.className.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeSubj = subject.subjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExam = session.examType.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Analisis_${safeSubj}_${safeClass}_${safeExam}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Generate 1 Berkas Workbook Excel Berisi Seluruh Kelas yang Diampu (Multi-Sheet per Kelas)
 * Khusus untuk Guru Bidang Mata Pelajaran (Konsep 1 File Master Multi-Sheet)
 */
export function exportMultiClassSubjectToExcel(params: {
  subjectName: string;
  teacherName: string;
  examType: string;
  schoolYear: string;
  kktp: number;
  classSessionsMap: Record<string, AnalysisSession>;
  allStudents: Student[];
  masterClasses: Array<{ id: string; name: string; waliKelas?: string }>;
  selectedClassIds: string[];
}): void {
  const {
    subjectName,
    teacherName,
    examType,
    schoolYear,
    kktp,
    classSessionsMap,
    allStudents,
    masterClasses,
    selectedClassIds,
  } = params;

  const wb = XLSX.utils.book_new();

  // 1. Generate Sheet untuk Setiap Kelas yang Diampu
  selectedClassIds.forEach((classId) => {
    const foundCls = masterClasses.find(
      (c) => c.id.toLowerCase() === classId.toLowerCase()
    );
    const className = foundCls ? foundCls.name : classId;
    const session = classSessionsMap[classId.toLowerCase()];
    if (!session) return;

    const subject = session.subjects.find(
      (s) => s.subjectName.toLowerCase() === subjectName.toLowerCase()
    );
    if (!subject) return;

    const classStudents = allStudents
      .filter((s) => s.classId.toLowerCase() === classId.toLowerCase())
      .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

    const ws = generateSubjectWorksheet(session, subject, classStudents);
    const sheetName = `Kelas ${className}`.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // 2. Generate Sheet Rekapitulasi Lintas Kelas
  const rekapMultiClassWs = generateMultiClassRekapWorksheet(params);
  XLSX.utils.book_append_sheet(wb, rekapMultiClassWs, 'REKAP SEMUA KELAS');

  // 3. Download File Excel Multi-Sheet
  const safeSubj = subjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExam = examType.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Analisis_${safeSubj}_Semua_Kelas_${safeExam}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Buat Worksheet untuk Mata Pelajaran berdasarkan Master Template Resmi SDIT AL FIKRI
 */
export function generateSubjectWorksheet(
  session: AnalysisSession,
  subject: AnalysisSubject,
  students: Student[]
): XLSX.WorkSheet {
  // 1. Baca Master Workbook Template dari Base64
  const masterWb = XLSX.read(MASTER_ANALYSIS_TEMPLATE_BASE64, {
    type: 'base64',
    cellStyles: true,
  });
  const masterSheet =
    masterWb.Sheets['3B'] ||
    masterWb.Sheets['3A'] ||
    masterWb.Sheets[masterWb.SheetNames[0]];

  // Clone master worksheet structure
  const ws: XLSX.WorkSheet = JSON.parse(JSON.stringify(masterSheet));

  const config = subject.config;
  const maxScore = calculateMaxScore(config);
  const studentCount = students.length || 1;

  // 2. Tulis Header Identitas Resmi Sekolah (Baris 1 & 2 dengan Merge & Alignment Center/Middle)
  const examTitle =
    session.examType.toUpperCase() === 'STS1'
      ? 'ANALISIS HASIL SUMATIF TENGAH SEMESTER 1'
      : session.examType.toUpperCase() === 'SAS1'
      ? 'ANALISIS HASIL SUMATIF AKHIR SEMESTER 1'
      : session.examType.toUpperCase() === 'STS2'
      ? 'ANALISIS HASIL SUMATIF TENGAH SEMESTER 2'
      : session.examType.toUpperCase() === 'SAS2'
      ? 'ANALISIS HASIL SUMATIF AKHIR SEMESTER 2'
      : `ANALISIS HASIL SUMATIF ${session.examType.toUpperCase()}`;

  const schoolNameUpper = (session.schoolName || 'SDIT AL-FIKRI').toUpperCase();

  ws['A1'] = {
    t: 's',
    v: examTitle,
    s: STYLE_TITLE_1,
  };
  ws['A2'] = {
    t: 's',
    v: `${schoolNameUpper} TAHUN PELAJARAN ${session.schoolYear}`,
    s: STYLE_TITLE_2,
  };

  // Identitas Mata Pelajaran (Baris 4, 5, 6)
  ws['B4'] = { t: 's', v: 'NAMA SEKOLAH', s: STYLE_META_LABEL };
  ws['D4'] = { t: 's', v: `: ${schoolNameUpper}`, s: STYLE_META_VAL };
  ws['B5'] = { t: 's', v: 'MATA PELAJARAN', s: STYLE_META_LABEL };
  ws['D5'] = { t: 's', v: `: ${subject.subjectName.toUpperCase()}`, s: STYLE_META_VAL };
  ws['B6'] = { t: 's', v: 'KELAS', s: STYLE_META_LABEL };
  ws['D6'] = { t: 's', v: `: ${session.className}`, s: STYLE_META_VAL };

  // Inisialisasi sel border untuk baris header 8 & 9
  for (let c = 0; c <= EXCEL_COLUMN_MAP.FAILED; c++) {
    const c8 = XLSX.utils.encode_cell({ r: 7, c });
    const c9 = XLSX.utils.encode_cell({ r: 8, c });
    ws[c8] = { t: 's', v: '', s: STYLE_HEADER_TABLE };
    ws[c9] = { t: 's', v: '', s: STYLE_HEADER_TABLE };
  }

  // 3. Tulis Header Butir Soal & Bobot (Baris 8 dan Baris 9) - Kuning, Bold, Border, Center/Middle
  const cTypeLabel = config.cType === 'Menjodohkan' ? 'Menjodohkan' : config.cType || 'Uraian';

  // Header Kelompok Baris 8
  ws['A8'] = { t: 's', v: 'No', s: STYLE_HEADER_TABLE };
  ws['B8'] = { t: 's', v: 'Nama Peserta Didik', s: STYLE_HEADER_TABLE };
  ws['C8'] = { t: 's', v: 'A. Pilihan Ganda', s: STYLE_HEADER_TABLE };
  ws['AQ8'] = { t: 's', v: 'Jml Bnr', s: STYLE_HEADER_TABLE };
  ws['AR8'] = { t: 's', v: 'B. Isian', s: STYLE_HEADER_TABLE };
  ws['BB8'] = { t: 's', v: 'Jml Bnr', s: STYLE_HEADER_TABLE };
  ws['BC8'] = { t: 's', v: `C. ${cTypeLabel}`, s: STYLE_HEADER_TABLE };
  ws['BM8'] = { t: 's', v: 'Jml Bnr', s: STYLE_HEADER_TABLE };
  ws['BN8'] = { t: 's', v: 'Total\nNilai', s: STYLE_HEADER_TABLE };
  ws['BO8'] = { t: 's', v: 'NILAI\nAKHIR', s: STYLE_HEADER_TABLE };
  ws['BP8'] = { t: 's', v: 'Pencapaian KKTP', s: STYLE_HEADER_TABLE };

  // Header Baris 9
  // PG 1..40 (C..AP)
  for (let i = 0; i < EXCEL_COLUMN_MAP.PG_MAX_COUNT; i++) {
    const colIdx = EXCEL_COLUMN_MAP.PG_START + i;
    const cellRef = XLSX.utils.encode_cell({ r: 8, c: colIdx });
    if (i < config.pgCount) {
      ws[cellRef] = { t: 'n', v: i + 1, s: STYLE_HEADER_TABLE };
    } else {
      ws[cellRef] = { t: 's', v: '', s: STYLE_HEADER_TABLE };
    }
  }
  ws['AQ9'] = { t: 's', v: '1', s: STYLE_HEADER_TABLE };

  // Isian 1..10 (AR..BA)
  for (let i = 0; i < EXCEL_COLUMN_MAP.ISIAN_MAX_COUNT; i++) {
    const colIdx = EXCEL_COLUMN_MAP.ISIAN_START + i;
    const cellRef = XLSX.utils.encode_cell({ r: 8, c: colIdx });
    if (i < config.isianCount) {
      ws[cellRef] = { t: 'n', v: i + 1, s: STYLE_HEADER_TABLE };
    } else {
      ws[cellRef] = { t: 's', v: '', s: STYLE_HEADER_TABLE };
    }
  }
  ws['BB9'] = { t: 's', v: '1', s: STYLE_HEADER_TABLE };

  // Bagian C 1..10 (BC..BL)
  for (let i = 0; i < EXCEL_COLUMN_MAP.C_MAX_COUNT; i++) {
    const colIdx = EXCEL_COLUMN_MAP.C_START + i;
    const cellRef = XLSX.utils.encode_cell({ r: 8, c: colIdx });
    if (i < config.cCount) {
      ws[cellRef] = { t: 'n', v: i + 1, s: STYLE_HEADER_TABLE };
    } else {
      ws[cellRef] = { t: 's', v: '', s: STYLE_HEADER_TABLE };
    }
  }
  ws['BM9'] = { t: 's', v: `( ${config.cWeight} x 1 )`, s: STYLE_HEADER_TABLE };
  ws['BN9'] = { t: 's', v: 'A+B+C', s: STYLE_HEADER_TABLE };
  ws['BP9'] = { t: 's', v: 'L', s: STYLE_HEADER_TABLE };
  ws['BQ9'] = { t: 's', v: 'TL', s: STYLE_HEADER_TABLE };

  // 4. Baris 10: Pemisah Hitam Tepat Di Atas Nama Peserta Didik Nomor 1 (Kolom A..BQ)
  for (let c = 0; c <= EXCEL_COLUMN_MAP.FAILED; c++) {
    const cellRef10 = XLSX.utils.encode_cell({ r: 9, c });
    ws[cellRef10] = {
      t: 's',
      v: '',
      s: STYLE_ROW_10_BLACK,
    };
  }

  // 5. Bersihkan data lama pada template (baris 11 s/d 80)
  for (let r = 11; r <= 80; r++) {
    for (let c = 0; c <= EXCEL_COLUMN_MAP.TOTAL_COLUMNS; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: r - 1, c });
      delete ws[cellRef];
    }
  }

  // 6. Isi Baris Data Siswa Aktual Mulai Baris 11
  const startRow = 11;
  students.forEach((student, index) => {
    const rowNum = startRow + index;
    const rowIdx = rowNum - 1; // 0-indexed for encode_cell

    // Inisialisasi seluruh cell pada baris siswa ini dengan border dan center style
    for (let c = 0; c <= EXCEL_COLUMN_MAP.FAILED; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c });
      ws[cellRef] = { t: 's', v: '', s: STYLE_CELL_CENTER };
    }

    // Kolom A: No (Center & Middle)
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: EXCEL_COLUMN_MAP.NO })] = {
      t: 'n',
      v: index + 1,
      s: STYLE_CELL_CENTER,
    };

    // Kolom B: Nama Peserta Didik (Left & Middle)
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: EXCEL_COLUMN_MAP.NAME })] = {
      t: 's',
      v: student.name,
      s: STYLE_CELL_NAME,
    };

    const result = subject.studentResults[student.id];
    const answers: StudentAnswers = result
      ? result.answers
      : {
          pg: new Array(config.pgCount).fill(1),
          isian: new Array(config.isianCount).fill(1),
          c: new Array(config.cCount).fill(config.cWeight),
        };

    // Kolom C s/d AP: Pilihan Ganda (Maksimum 40 Kolom)
    let pgSum = 0;
    for (let i = 0; i < EXCEL_COLUMN_MAP.PG_MAX_COUNT; i++) {
      const colIdx = EXCEL_COLUMN_MAP.PG_START + i;
      if (i < config.pgCount) {
        const val = answers.pg[i] !== undefined ? answers.pg[i] : 1;
        pgSum += val;
        ws[XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })] = {
          t: 'n',
          v: val,
          s: STYLE_CELL_CENTER,
        };
      } else {
        ws[XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })] = {
          t: 's',
          v: '',
          s: STYLE_CELL_CENTER,
        };
      }
    }

    // Kolom AQ: Total Jawaban Benar PG -> formula SUM aktual
    const lastPgColLetter =
      config.pgCount > 0
        ? XLSX.utils.encode_col(EXCEL_COLUMN_MAP.PG_START + config.pgCount - 1)
        : 'C';
    const pgFormula =
      config.pgCount > 0 ? `SUM(C${rowNum}:${lastPgColLetter}${rowNum})` : '0';

    ws[XLSX.utils.encode_cell({ r: rowIdx, c: EXCEL_COLUMN_MAP.PG_TOTAL })] = {
      t: 'n',
      f: pgFormula,
      v: pgSum,
      s: STYLE_CELL_CENTER,
    };

    // Kolom AR s/d BA: Isian (Maksimum 10 Kolom)
    let isianSum = 0;
    for (let i = 0; i < EXCEL_COLUMN_MAP.ISIAN_MAX_COUNT; i++) {
      const colIdx = EXCEL_COLUMN_MAP.ISIAN_START + i;
      if (i < config.isianCount) {
        const val = answers.isian[i] !== undefined ? answers.isian[i] : 1;
        isianSum += val;
        ws[XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })] = {
          t: 'n',
          v: val,
          s: STYLE_CELL_CENTER,
        };
      } else {
        ws[XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })] = {
          t: 's',
          v: '',
          s: STYLE_CELL_CENTER,
        };
      }
    }

    // Kolom BB: Total Jawaban Benar Isian -> formula SUM aktual
    const lastIsianColLetter =
      config.isianCount > 0
        ? XLSX.utils.encode_col(EXCEL_COLUMN_MAP.ISIAN_START + config.isianCount - 1)
        : 'AR';
    const isianFormula =
      config.isianCount > 0
        ? `SUM(AR${rowNum}:${lastIsianColLetter}${rowNum})`
        : '0';

    ws[XLSX.utils.encode_cell({ r: rowIdx, c: EXCEL_COLUMN_MAP.ISIAN_TOTAL })] = {
      t: 'n',
      f: isianFormula,
      v: isianSum,
      s: STYLE_CELL_CENTER,
    };

    // Kolom BC s/d BL: Bagian C (Maksimum 10 Kolom)
    let cSum = 0;
    for (let i = 0; i < EXCEL_COLUMN_MAP.C_MAX_COUNT; i++) {
      const colIdx = EXCEL_COLUMN_MAP.C_START + i;
      if (i < config.cCount) {
        const val = answers.c[i] !== undefined ? answers.c[i] : config.cWeight;
        cSum += val;
        ws[XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })] = {
          t: 'n',
          v: val,
          s: STYLE_CELL_CENTER,
        };
      } else {
        ws[XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })] = {
          t: 's',
          v: '',
          s: STYLE_CELL_CENTER,
        };
      }
    }

    // Kolom BM: Total Jawaban Benar Bagian C -> formula SUM aktual * 1
    const lastCColLetter =
      config.cCount > 0
        ? XLSX.utils.encode_col(EXCEL_COLUMN_MAP.C_START + config.cCount - 1)
        : 'BC';
    const cFormula =
      config.cCount > 0
        ? `SUM(BC${rowNum}:${lastCColLetter}${rowNum})*1`
        : '0';

    ws[XLSX.utils.encode_cell({ r: rowIdx, c: EXCEL_COLUMN_MAP.C_TOTAL })] = {
      t: 'n',
      f: cFormula,
      v: cSum,
      s: STYLE_CELL_CENTER,
    };

    // Kolom BN: Total Nilai -> formula =SUM(AQ{rowNum},BB{rowNum},BM{rowNum})
    const totalScoreVal = result ? result.totalScore : pgSum + isianSum + cSum;
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: EXCEL_COLUMN_MAP.TOTAL_SCORE })] = {
      t: 'n',
      f: `SUM(AQ${rowNum},BB${rowNum},BM${rowNum})`,
      v: totalScoreVal,
      s: STYLE_CELL_CENTER,
    };

    // Kolom BO: NILAI AKHIR -> formula =ROUND(BN{rowNum}*100/{maxScore}, 0)
    const finalGradeVal = result
      ? Math.round(result.finalGrade)
      : Math.round((totalScoreVal / (maxScore || 1)) * 100);
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: EXCEL_COLUMN_MAP.FINAL_GRADE })] = {
      t: 'n',
      f: `ROUND(BN${rowNum}*100/${maxScore || 1},0)`,
      v: finalGradeVal,
      s: STYLE_CELL_CENTER,
    };

    // Kolom BP: L (Lulus / Tuntas) -> formula =IF(BO{rowNum}>={session.kktp}, 1, " ")
    const isPassed = result ? result.isPassed : finalGradeVal >= session.kktp;
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: EXCEL_COLUMN_MAP.PASSED })] = {
      t: isPassed ? 'n' : 's',
      f: `IF(BO${rowNum}>=${session.kktp},1," ")`,
      v: isPassed ? 1 : ' ',
      s: STYLE_CELL_CENTER,
    };

    // Kolom BQ: TL (Tidak Lulus / Remidi) -> formula =IF(BO{rowNum}<{session.kktp}, 1, " ")
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: EXCEL_COLUMN_MAP.FAILED })] = {
      t: !isPassed ? 'n' : 's',
      f: `IF(BO${rowNum}<${session.kktp},1," ")`,
      v: !isPassed ? 1 : ' ',
      s: STYLE_CELL_CENTER,
    };
  });

  // 7. Baris Rekapitulasi Analisis Butir Soal (Border, Bold, Center/Middle)
  const lastStudentRowNum = startRow + students.length - 1;
  const sumRowNum = lastStudentRowNum + 1;
  const pctRowNum = lastStudentRowNum + 2;

  const sumRowIdx = sumRowNum - 1;
  const pctRowIdx = pctRowNum - 1;

  // Inisialisasi seluruh cell rekapitulasi dengan border
  for (let c = 0; c <= EXCEL_COLUMN_MAP.FAILED; c++) {
    const cSum = XLSX.utils.encode_cell({ r: sumRowIdx, c });
    const cPct = XLSX.utils.encode_cell({ r: pctRowIdx, c });
    ws[cSum] = { t: 's', v: '', s: STYLE_SUMMARY_NUM };
    ws[cPct] = { t: 's', v: '', s: STYLE_SUMMARY_NUM };
  }

  // Label: Jumlah jawaban benar @soal
  ws[XLSX.utils.encode_cell({ r: sumRowIdx, c: 0 })] = {
    t: 's',
    v: 'Jumlah jawaban benar @soal',
    s: STYLE_SUMMARY_LABEL,
  };

  // Label: Persentase % Jawaban benar @soal
  ws[XLSX.utils.encode_cell({ r: pctRowIdx, c: 0 })] = {
    t: 's',
    v: 'Persentase % Jawaban benar @soal',
    s: STYLE_SUMMARY_LABEL,
  };

  // Rekap Butir PG Aktif Saja (C .. C + pgCount - 1)
  for (let i = 0; i < config.pgCount; i++) {
    const c = EXCEL_COLUMN_MAP.PG_START + i;
    const colLetter = XLSX.utils.encode_col(c);
    ws[XLSX.utils.encode_cell({ r: sumRowIdx, c })] = {
      t: 'n',
      f: `SUM(${colLetter}${startRow}:${colLetter}${lastStudentRowNum})`,
      s: STYLE_SUMMARY_NUM,
    };
    ws[XLSX.utils.encode_cell({ r: pctRowIdx, c })] = {
      t: 'n',
      f: `${colLetter}${sumRowNum}*100/${studentCount}`,
      s: STYLE_SUMMARY_NUM,
    };
  }

  // Rekap Butir Isian Aktif Saja (AR .. AR + isianCount - 1)
  for (let i = 0; i < config.isianCount; i++) {
    const c = EXCEL_COLUMN_MAP.ISIAN_START + i;
    const colLetter = XLSX.utils.encode_col(c);
    ws[XLSX.utils.encode_cell({ r: sumRowIdx, c })] = {
      t: 'n',
      f: `SUM(${colLetter}${startRow}:${colLetter}${lastStudentRowNum})`,
      s: STYLE_SUMMARY_NUM,
    };
    ws[XLSX.utils.encode_cell({ r: pctRowIdx, c })] = {
      t: 'n',
      f: `${colLetter}${sumRowNum}*100/${studentCount}`,
      s: STYLE_SUMMARY_NUM,
    };
  }

  // Rekap Butir Bagian C Aktif Saja (BC .. BC + cCount - 1)
  for (let i = 0; i < config.cCount; i++) {
    const c = EXCEL_COLUMN_MAP.C_START + i;
    const colLetter = XLSX.utils.encode_col(c);
    ws[XLSX.utils.encode_cell({ r: sumRowIdx, c })] = {
      t: 'n',
      f: `SUM(${colLetter}${startRow}:${colLetter}${lastStudentRowNum})`,
      s: STYLE_SUMMARY_NUM,
    };
    ws[XLSX.utils.encode_cell({ r: pctRowIdx, c })] = {
      t: 'n',
      f: `${colLetter}${sumRowNum}*100/${studentCount}`,
      s: STYLE_SUMMARY_NUM,
    };
  }

  // Kolom Summary Total di Baris Summary (AQ, BB, BM, BN, BO, BP, BQ)
  const summaryCols = [
    EXCEL_COLUMN_MAP.PG_TOTAL,
    EXCEL_COLUMN_MAP.ISIAN_TOTAL,
    EXCEL_COLUMN_MAP.C_TOTAL,
    EXCEL_COLUMN_MAP.TOTAL_SCORE,
    EXCEL_COLUMN_MAP.FINAL_GRADE,
    EXCEL_COLUMN_MAP.PASSED,
    EXCEL_COLUMN_MAP.FAILED,
  ];
  summaryCols.forEach((colIdx) => {
    const colLetter = XLSX.utils.encode_col(colIdx);
    ws[XLSX.utils.encode_cell({ r: sumRowIdx, c: colIdx })] = {
      t: 'n',
      f: `SUM(${colLetter}${startRow}:${colLetter}${lastStudentRowNum})`,
      s: STYLE_SUMMARY_NUM,
    };
  });

  // 8. Area Tanda Tangan Resmi (Center & Middle Alignment)
  const sigRow1 = pctRowNum + 3;
  const sigRow2 = sigRow1 + 1;
  const sigRow3 = sigRow1 + 5;

  ws[`C${sigRow1}`] = { t: 's', v: 'Mengetahui', s: STYLE_SIGNATURE };
  ws[`BC${sigRow1}`] = {
    t: 's',
    v: `Tangerang, ${session.analysisDate || '..................'}`,
    s: STYLE_SIGNATURE,
  };

  ws[`C${sigRow2}`] = { t: 's', v: 'Kepala SDIT AL-FIKRI', s: STYLE_SIGNATURE };
  ws[`BC${sigRow2}`] = { t: 's', v: 'Guru Kelas / Guru Bidang', s: STYLE_SIGNATURE };

  ws[`C${sigRow3}`] = { t: 's', v: 'H. M. HALIM MUSTOMI, S.Pd.', s: STYLE_SIGNATURE_BOLD };
  ws[`BC${sigRow3}`] = {
    t: 's',
    v:
      subject.teacherName ||
      session.teacherName ||
      '........................................',
    s: STYLE_SIGNATURE_BOLD,
  };

  // 9. Atur Merges Sesuai Struktur Maksimum Kolom
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: EXCEL_COLUMN_MAP.FAILED } }, // A1:BQ1 (Header Judul 1)
    { s: { r: 1, c: 0 }, e: { r: 1, c: EXCEL_COLUMN_MAP.FAILED } }, // A2:BQ2 (Header Judul 2)
    { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } }, // A8:A9 (No)
    { s: { r: 7, c: 1 }, e: { r: 8, c: 1 } }, // B8:B9 (Nama)
    {
      s: { r: 7, c: EXCEL_COLUMN_MAP.PG_START },
      e: { r: 7, c: EXCEL_COLUMN_MAP.PG_END_MAX },
    }, // C8:AP8 (PG)
    {
      s: { r: 7, c: EXCEL_COLUMN_MAP.ISIAN_START },
      e: { r: 7, c: EXCEL_COLUMN_MAP.ISIAN_END_MAX },
    }, // AR8:BA8 (Isian)
    {
      s: { r: 7, c: EXCEL_COLUMN_MAP.C_START },
      e: { r: 7, c: EXCEL_COLUMN_MAP.C_END_MAX },
    }, // BC8:BL8 (Bagian C)
    {
      s: { r: 7, c: EXCEL_COLUMN_MAP.FINAL_GRADE },
      e: { r: 8, c: EXCEL_COLUMN_MAP.FINAL_GRADE },
    }, // BO8:BO9 (NILAI AKHIR)
    {
      s: { r: 7, c: EXCEL_COLUMN_MAP.PASSED },
      e: { r: 7, c: EXCEL_COLUMN_MAP.FAILED },
    }, // BP8:BQ8 (Pencapaian KKTP)
    {
      s: { r: sumRowIdx, c: 0 },
      e: { r: sumRowIdx, c: 1 },
    }, // A{sum}:B{sum}
    {
      s: { r: pctRowIdx, c: 0 },
      e: { r: pctRowIdx, c: 1 },
    }, // A{pct}:B{pct}
    {
      s: { r: sumRowIdx, c: EXCEL_COLUMN_MAP.PG_TOTAL },
      e: { r: pctRowIdx, c: EXCEL_COLUMN_MAP.PG_TOTAL },
    }, // AQ(sum):AQ(pct)
    {
      s: { r: sumRowIdx, c: EXCEL_COLUMN_MAP.ISIAN_TOTAL },
      e: { r: pctRowIdx, c: EXCEL_COLUMN_MAP.ISIAN_TOTAL },
    }, // BB(sum):BB(pct)
    {
      s: { r: sumRowIdx, c: EXCEL_COLUMN_MAP.C_TOTAL },
      e: { r: pctRowIdx, c: EXCEL_COLUMN_MAP.C_TOTAL },
    }, // BM(sum):BM(pct)
    {
      s: { r: sumRowIdx, c: EXCEL_COLUMN_MAP.TOTAL_SCORE },
      e: { r: pctRowIdx, c: EXCEL_COLUMN_MAP.TOTAL_SCORE },
    }, // BN(sum):BN(pct)
    {
      s: { r: sumRowIdx, c: EXCEL_COLUMN_MAP.FINAL_GRADE },
      e: { r: pctRowIdx, c: EXCEL_COLUMN_MAP.FINAL_GRADE },
    }, // BO(sum):BO(pct)
    {
      s: { r: sumRowIdx, c: EXCEL_COLUMN_MAP.PASSED },
      e: { r: pctRowIdx, c: EXCEL_COLUMN_MAP.PASSED },
    }, // BP(sum):BP(pct)
    {
      s: { r: sumRowIdx, c: EXCEL_COLUMN_MAP.FAILED },
      e: { r: pctRowIdx, c: EXCEL_COLUMN_MAP.FAILED },
    }, // BQ(sum):BQ(pct)
    // Merge tanda tangan Kepala Sekolah
    { s: { r: sigRow1 - 1, c: 2 }, e: { r: sigRow1 - 1, c: 10 } },
    { s: { r: sigRow2 - 1, c: 2 }, e: { r: sigRow2 - 1, c: 10 } },
    { s: { r: sigRow3 - 1, c: 2 }, e: { r: sigRow3 - 1, c: 10 } },
    // Merge tanda tangan Guru
    { s: { r: sigRow1 - 1, c: EXCEL_COLUMN_MAP.C_START }, e: { r: sigRow1 - 1, c: EXCEL_COLUMN_MAP.FAILED } },
    { s: { r: sigRow2 - 1, c: EXCEL_COLUMN_MAP.C_START }, e: { r: sigRow2 - 1, c: EXCEL_COLUMN_MAP.FAILED } },
    { s: { r: sigRow3 - 1, c: EXCEL_COLUMN_MAP.C_START }, e: { r: sigRow3 - 1, c: EXCEL_COLUMN_MAP.FAILED } },
  ];
  ws['!merges'] = merges;

  // 10. Atur Lebar Kolom Sesuai Struktur Maksimum Kolom & Sembunyikan Kolom Tidak Aktif
  const colWidths: XLSX.ColInfo[] = [
    { wch: 4.0 }, // A: No
    { wch: 36.0 }, // B: Nama Peserta Didik
  ];
  // C..AP: PG 1..40 (Sembunyikan kolom yang melebihi jumlah pgCount aktif)
  for (let i = 0; i < EXCEL_COLUMN_MAP.PG_MAX_COUNT; i++) {
    const isInactive = i >= config.pgCount;
    colWidths.push({
      wch: 3.5,
      hidden: isInactive,
    });
  }
  // AQ: Jml Bnr PG
  colWidths.push({ wch: 8.5 });
  // AR..BA: Isian 1..10 (Sembunyikan kolom yang melebihi jumlah isianCount aktif)
  for (let i = 0; i < EXCEL_COLUMN_MAP.ISIAN_MAX_COUNT; i++) {
    const isInactive = i >= config.isianCount;
    colWidths.push({
      wch: 4.0,
      hidden: isInactive,
    });
  }
  // BB: Jml Bnr Isian
  colWidths.push({ wch: 8.5 });
  // BC..BL: C 1..10 (Sembunyikan kolom yang melebihi jumlah cCount aktif)
  for (let i = 0; i < EXCEL_COLUMN_MAP.C_MAX_COUNT; i++) {
    const isInactive = i >= config.cCount;
    colWidths.push({
      wch: 4.0,
      hidden: isInactive,
    });
  }
  // BM: Jml Bnr C
  colWidths.push({ wch: 8.5 });
  // BN: Total Nilai
  colWidths.push({ wch: 8.5 });
  // BO: Nilai Akhir
  colWidths.push({ wch: 10.5 });
  // BP: L
  colWidths.push({ wch: 6.5 });
  // BQ: TL
  colWidths.push({ wch: 6.5 });

  ws['!cols'] = colWidths;

  // 11. Perbarui !ref
  ws['!ref'] = `A1:BQ${sigRow3 + 1}`;

  return ws;
}

/**
 * Buat Worksheet REKAP NILAI
 */
function generateRekapWorksheet(
  session: AnalysisSession,
  students: Student[]
): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};

  // Header Judul Rekap
  ws['A1'] = {
    t: 's',
    v: 'YAYASAN DAARUL FIKRI TIGARAKSA',
    s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'left', vertical: 'center' } },
  };
  ws['A2'] = {
    t: 's',
    v: 'SEKOLAH DASAR ISLAM TERPADU (SDIT) AL FIKRI',
    s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'left', vertical: 'center' } },
  };
  ws['A3'] = {
    t: 's',
    v: `REKAPITULASI HASIL ANALISIS NILAI UJIAN ${session.examType.toUpperCase()}`,
    s: { font: { name: 'Arial', sz: 12, bold: true }, alignment: { horizontal: 'left', vertical: 'center' } },
  };

  // Meta Info
  ws['A5'] = { t: 's', v: 'Kelas', s: STYLE_META_LABEL };
  ws['B5'] = { t: 's', v: `: ${session.className}`, s: STYLE_META_VAL };
  ws['E5'] = { t: 's', v: 'Tahun Pelajaran', s: STYLE_META_LABEL };
  ws['F5'] = { t: 's', v: `: ${session.schoolYear}`, s: STYLE_META_VAL };

  ws['A6'] = { t: 's', v: 'Wali Kelas', s: STYLE_META_LABEL };
  ws['B6'] = { t: 's', v: `: ${session.teacherName || '-'}`, s: STYLE_META_VAL };
  ws['E6'] = { t: 's', v: 'KKTP Standar', s: STYLE_META_LABEL };
  ws['F6'] = { t: 's', v: `: ${session.kktp}`, s: STYLE_META_VAL };

  ws['A7'] = { t: 's', v: 'Tanggal Cetak', s: STYLE_META_LABEL };
  ws['B7'] = { t: 's', v: `: ${session.analysisDate || '-'}`, s: STYLE_META_VAL };

  // Header Kolom Tabel Rekap (Baris 9)
  const headerCols: string[] = ['No', 'Nama Peserta Didik'];
  session.subjects.forEach((subj) => {
    headerCols.push(subj.subjectName.toUpperCase());
  });
  headerCols.push('Rata-Rata', 'Jml Lulus (L)', 'Jml Remidi (TL)', 'Status Akhir');

  headerCols.forEach((colName, cIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 8, c: cIdx });
    ws[cellRef] = {
      t: 's',
      v: colName,
      s: STYLE_HEADER_TABLE,
    };
  });

  const startRow = 10;
  const numSubjects = session.subjects.length;
  const totalRekapCols = headerCols.length;

  students.forEach((student, index) => {
    const rowNum = startRow + index;
    const rowIdx = rowNum - 1;

    // No
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 0 })] = {
      t: 'n',
      v: index + 1,
      s: STYLE_CELL_CENTER,
    };

    // Nama
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 1 })] = {
      t: 's',
      v: student.name,
      s: STYLE_CELL_NAME,
    };

    // Nilai per mapel
    session.subjects.forEach((subj, sIdx) => {
      const res = subj.studentResults[student.id];
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: 2 + sIdx });
      if (res && res.finalGrade !== undefined) {
        ws[cellRef] = {
          t: 'n',
          v: res.finalGrade,
          s: STYLE_CELL_CENTER,
        };
      } else {
        ws[cellRef] = {
          t: 's',
          v: '-',
          s: STYLE_CELL_CENTER,
        };
      }
    });

    if (numSubjects > 0) {
      const firstSubjCol = XLSX.utils.encode_col(2);
      const lastSubjCol = XLSX.utils.encode_col(2 + numSubjects - 1);
      const avgCol = XLSX.utils.encode_col(2 + numSubjects);
      const passCol = XLSX.utils.encode_col(2 + numSubjects + 1);
      const remCol = XLSX.utils.encode_col(2 + numSubjects + 2);
      const statusCol = XLSX.utils.encode_col(2 + numSubjects + 3);

      // Rata-rata
      ws[XLSX.utils.encode_cell({ r: rowIdx, c: 2 + numSubjects })] = {
        t: 'n',
        f: `ROUND(AVERAGE(${firstSubjCol}${rowNum}:${lastSubjCol}${rowNum}), 2)`,
        s: STYLE_CELL_CENTER,
      };

      // Jml Lulus
      ws[XLSX.utils.encode_cell({ r: rowIdx, c: 2 + numSubjects + 1 })] = {
        t: 'n',
        f: `COUNTIF(${firstSubjCol}${rowNum}:${lastSubjCol}${rowNum}, ">=${session.kktp}")`,
        s: STYLE_CELL_CENTER,
      };

      // Jml Remidi
      ws[XLSX.utils.encode_cell({ r: rowIdx, c: 2 + numSubjects + 2 })] = {
        t: 'n',
        f: `COUNTIF(${firstSubjCol}${rowNum}:${lastSubjCol}${rowNum}, "<${session.kktp}")`,
        s: STYLE_CELL_CENTER,
      };

      // Status Akhir
      ws[XLSX.utils.encode_cell({ r: rowIdx, c: 2 + numSubjects + 3 })] = {
        t: 's',
        f: `IF(${avgCol}${rowNum}>=${session.kktp}, "TUNTAS", "REMIDI")`,
        s: STYLE_CELL_CENTER,
      };
    }
  });

  const lastRow = startRow + students.length - 1;
  const avgRowIdx = lastRow; // row after students

  // Baris Rata-rata per Mapel
  ws[XLSX.utils.encode_cell({ r: avgRowIdx, c: 0 })] = { t: 's', v: '', s: STYLE_SUMMARY_LABEL };
  ws[XLSX.utils.encode_cell({ r: avgRowIdx, c: 1 })] = {
    t: 's',
    v: 'Rata-rata Nilai Mapel',
    s: STYLE_SUMMARY_LABEL,
  };

  for (let s = 0; s < numSubjects; s++) {
    const colLetter = XLSX.utils.encode_col(2 + s);
    ws[XLSX.utils.encode_cell({ r: avgRowIdx, c: 2 + s })] = {
      t: 'n',
      f: `ROUND(AVERAGE(${colLetter}${startRow}:${colLetter}${lastRow}), 2)`,
      s: STYLE_SUMMARY_NUM,
    };
  }

  for (let extra = 0; extra < 4; extra++) {
    ws[XLSX.utils.encode_cell({ r: avgRowIdx, c: 2 + numSubjects + extra })] = {
      t: 's',
      v: '',
      s: STYLE_SUMMARY_NUM,
    };
  }

  const colWidths: XLSX.ColInfo[] = [{ wch: 5 }, { wch: 35 }];
  session.subjects.forEach(() => {
    colWidths.push({ wch: 18 });
  });
  colWidths.push({ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 });
  ws['!cols'] = colWidths;
  ws['!ref'] = `A1:${XLSX.utils.encode_col(totalRekapCols - 1)}${avgRowIdx + 2}`;

  return ws;
}

/**
 * Buat Worksheet Rekap Gabungan Lintas Kelas untuk Guru Bidang
 */
function generateMultiClassRekapWorksheet(params: {
  subjectName: string;
  teacherName: string;
  examType: string;
  schoolYear: string;
  kktp: number;
  classSessionsMap: Record<string, AnalysisSession>;
  allStudents: Student[];
  masterClasses: Array<{ id: string; name: string; waliKelas?: string }>;
  selectedClassIds: string[];
}): XLSX.WorkSheet {
  const {
    subjectName,
    teacherName,
    examType,
    schoolYear,
    kktp,
    classSessionsMap,
    allStudents,
    masterClasses,
    selectedClassIds,
  } = params;

  const ws: XLSX.WorkSheet = {};

  // Header Judul Rekap
  ws['A1'] = {
    t: 's',
    v: 'YAYASAN DAARUL FIKRI TIGARAKSA',
    s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'left', vertical: 'center' } },
  };
  ws['A2'] = {
    t: 's',
    v: 'SEKOLAH DASAR ISLAM TERPADU (SDIT) AL FIKRI',
    s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'left', vertical: 'center' } },
  };
  ws['A3'] = {
    t: 's',
    v: `REKAPITULASI CAPAIAN NILAI MATA PELAJARAN ${subjectName.toUpperCase()} (${examType.toUpperCase()})`,
    s: { font: { name: 'Arial', sz: 12, bold: true }, alignment: { horizontal: 'left', vertical: 'center' } },
  };

  // Meta Info
  ws['A5'] = { t: 's', v: 'Mata Pelajaran', s: STYLE_META_LABEL };
  ws['B5'] = { t: 's', v: `: ${subjectName}`, s: STYLE_META_VAL };
  ws['E5'] = { t: 's', v: 'Tahun Pelajaran', s: STYLE_META_LABEL };
  ws['F5'] = { t: 's', v: `: ${schoolYear}`, s: STYLE_META_VAL };

  ws['A6'] = { t: 's', v: 'Guru Pengampu', s: STYLE_META_LABEL };
  ws['B6'] = { t: 's', v: `: ${teacherName || '-'}`, s: STYLE_META_VAL };
  ws['E6'] = { t: 's', v: 'KKTP Standar', s: STYLE_META_LABEL };
  ws['F6'] = { t: 's', v: `: ${kktp}`, s: STYLE_META_VAL };

  ws['A7'] = { t: 's', v: 'Tanggal Cetak', s: STYLE_META_LABEL };
  ws['B7'] = { t: 's', v: `: ${new Date().toISOString().split('T')[0]}`, s: STYLE_META_VAL };

  // Header Kolom Tabel Rekap (Baris 9)
  const headerCols: string[] = [
    'No',
    'Kelas / Rombel',
    'Wali Kelas',
    'Jml Siswa',
    'Siswa Dinilai',
    'Rata-Rata Nilai',
    'Nilai Tertinggi',
    'Nilai Terendah',
    'Tuntas (L)',
    'Belum Tuntas (TL)',
    '% Ketuntasan Klasikal',
    'Keterangan',
  ];

  headerCols.forEach((colName, cIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 8, c: cIdx });
    ws[cellRef] = {
      t: 's',
      v: colName,
      s: STYLE_HEADER_TABLE,
    };
  });

  const startRow = 10;
  let totalAllStudents = 0;
  let totalAllGraded = 0;
  let totalAllPassed = 0;
  let totalAllFailed = 0;
  let grandScoreSum = 0;

  selectedClassIds.forEach((classId, index) => {
    const rowNum = startRow + index;
    const rowIdx = rowNum - 1;

    const foundCls = masterClasses.find(
      (c) => c.id.toLowerCase() === classId.toLowerCase()
    );
    const className = foundCls ? foundCls.name : classId;
    const waliKelas = foundCls?.waliKelas || '-';

    const session = classSessionsMap[classId.toLowerCase()];
    const subj = session?.subjects?.find(
      (s) => s.subjectName.toLowerCase() === subjectName.toLowerCase()
    );

    const classStudents = allStudents.filter(
      (s) => s.classId.toLowerCase() === classId.toLowerCase()
    );

    const studentCount = classStudents.length;
    let gradedCount = 0;
    let sumGrades = 0;
    let maxGrade = 0;
    let minGrade = 100;
    let passedCount = 0;
    let failedCount = 0;

    if (subj && subj.studentResults) {
      classStudents.forEach((st) => {
        const res = subj.studentResults[st.id];
        if (res && res.finalGrade !== undefined) {
          gradedCount++;
          const g = Math.round(res.finalGrade);
          sumGrades += g;
          if (g > maxGrade) maxGrade = g;
          if (g < minGrade) minGrade = g;
          if (res.isPassed || g >= kktp) {
            passedCount++;
          } else {
            failedCount++;
          }
        }
      });
    }

    if (gradedCount === 0) {
      minGrade = 0;
    }

    const classAvg = gradedCount > 0 ? Math.round((sumGrades / gradedCount) * 100) / 100 : 0;
    const passPct = gradedCount > 0 ? Math.round((passedCount / gradedCount) * 1000) / 10 : 0;

    totalAllStudents += studentCount;
    totalAllGraded += gradedCount;
    totalAllPassed += passedCount;
    totalAllFailed += failedCount;
    grandScoreSum += sumGrades;

    // No
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 0 })] = { t: 'n', v: index + 1, s: STYLE_CELL_CENTER };
    // Kelas
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 1 })] = { t: 's', v: `Kelas ${className}`, s: STYLE_CELL_CENTER };
    // Wali Kelas
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 2 })] = { t: 's', v: waliKelas, s: STYLE_CELL_NAME };
    // Jml Siswa
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 3 })] = { t: 'n', v: studentCount, s: STYLE_CELL_CENTER };
    // Siswa Dinilai
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 4 })] = { t: 'n', v: gradedCount, s: STYLE_CELL_CENTER };
    // Rata-rata
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 5 })] = { t: 'n', v: classAvg, s: STYLE_CELL_CENTER };
    // Max
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 6 })] = { t: 'n', v: gradedCount > 0 ? maxGrade : '-', s: STYLE_CELL_CENTER };
    // Min
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 7 })] = { t: 'n', v: gradedCount > 0 ? minGrade : '-', s: STYLE_CELL_CENTER };
    // Lulus
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 8 })] = { t: 'n', v: passedCount, s: STYLE_CELL_CENTER };
    // Remidi
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 9 })] = { t: 'n', v: failedCount, s: STYLE_CELL_CENTER };
    // % Ketuntasan
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 10 })] = { t: 's', v: `${passPct}%`, s: STYLE_CELL_CENTER };
    // Keterangan
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 11 })] = {
      t: 's',
      v: passPct >= 85 ? 'Sangat Baik' : passPct >= 70 ? 'Tercapai' : 'Perlu Perbaikan',
      s: STYLE_CELL_CENTER,
    };
  });

  // Summary Row di bagian bawah
  const summaryRowIdx = startRow + selectedClassIds.length - 1;
  const overallAvg = totalAllGraded > 0 ? Math.round((grandScoreSum / totalAllGraded) * 100) / 100 : 0;
  const overallPassPct = totalAllGraded > 0 ? Math.round((totalAllPassed / totalAllGraded) * 1000) / 10 : 0;

  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 0 })] = { t: 's', v: '', s: STYLE_SUMMARY_LABEL };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 1 })] = { t: 's', v: 'TOTAL / RATA-RATA', s: STYLE_SUMMARY_LABEL };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 2 })] = { t: 's', v: '', s: STYLE_SUMMARY_LABEL };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 3 })] = { t: 'n', v: totalAllStudents, s: STYLE_SUMMARY_NUM };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 4 })] = { t: 'n', v: totalAllGraded, s: STYLE_SUMMARY_NUM };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 5 })] = { t: 'n', v: overallAvg, s: STYLE_SUMMARY_NUM };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 6 })] = { t: 's', v: '-', s: STYLE_SUMMARY_NUM };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 7 })] = { t: 's', v: '-', s: STYLE_SUMMARY_NUM };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 8 })] = { t: 'n', v: totalAllPassed, s: STYLE_SUMMARY_NUM };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 9 })] = { t: 'n', v: totalAllFailed, s: STYLE_SUMMARY_NUM };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 10 })] = { t: 's', v: `${overallPassPct}%`, s: STYLE_SUMMARY_NUM };
  ws[XLSX.utils.encode_cell({ r: summaryRowIdx, c: 11 })] = { t: 's', v: '', s: STYLE_SUMMARY_LABEL };

  // Tanda Tangan
  const sigRow1 = summaryRowIdx + 3;
  const sigRow2 = sigRow1 + 1;
  const sigRow3 = sigRow1 + 5;

  ws[`B${sigRow1}`] = { t: 's', v: 'Mengetahui', s: STYLE_SIGNATURE };
  ws[`I${sigRow1}`] = {
    t: 's',
    v: `Tangerang, ${new Date().toISOString().split('T')[0]}`,
    s: STYLE_SIGNATURE,
  };

  ws[`B${sigRow2}`] = { t: 's', v: 'Kepala SDIT AL-FIKRI', s: STYLE_SIGNATURE };
  ws[`I${sigRow2}`] = { t: 's', v: 'Guru Bidang Studi', s: STYLE_SIGNATURE };

  ws[`B${sigRow3}`] = { t: 's', v: 'H. M. HALIM MUSTOMI, S.Pd.', s: STYLE_SIGNATURE_BOLD };
  ws[`I${sigRow3}`] = {
    t: 's',
    v: teacherName || '........................................',
    s: STYLE_SIGNATURE_BOLD,
  };

  const colWidths: XLSX.ColInfo[] = [
    { wch: 5 },
    { wch: 16 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
  ];
  ws['!cols'] = colWidths;
  ws['!ref'] = `A1:L${sigRow3 + 1}`;

  return ws;
}

/**
 * Buat Hidden Sheet `_ANALYSIS_META` yang menyimpan serialisasi JSON Sesi
 */
function generateMetadataWorksheet(
  session: AnalysisSession,
  students: Student[]
): XLSX.WorkSheet {
  const metaSnapshot: AnalysisSession = {
    ...session,
    studentSnapshot: students.map((s) => ({
      id: s.id,
      name: s.name,
      classId: s.classId,
    })),
    updatedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(metaSnapshot);
  // Simpan JSON dalam chunk baris jika terlalu panjang
  const CHUNK_SIZE = 30000;
  const chunks: any[][] = [
    ['SDIT_AL_FIKRI_ANALYSIS_PROJECT_METADATA_V1'],
    ['DO_NOT_EDIT_THIS_SHEET_MANUALLY'],
    ['FORMAT', 'ANALYSIS_PROJECT'],
    ['VERSION', '1'],
    ['SESSION_ID', session.sessionId],
    ['CLASS_ID', session.classId],
    ['EXAM_TYPE', session.examType],
    ['TIMESTAMP', new Date().toISOString()],
  ];

  for (let i = 0; i < jsonString.length; i += CHUNK_SIZE) {
    chunks.push(['JSON_PAYLOAD_CHUNK', jsonString.substring(i, i + CHUNK_SIZE)]);
  }

  return XLSX.utils.aoa_to_sheet(chunks);
}

/**
 * Membaca dan mem-parsing Workbook Excel Proyek Analisis
 */
export function readAnalysisWorkbook(fileBuffer: ArrayBuffer): {
  isValid: boolean;
  session?: AnalysisSession;
  error?: string;
} {
  try {
    const wb = XLSX.read(fileBuffer, { type: 'array' });

    // 1. Periksa keberadaan sheet `_ANALYSIS_META`
    const metaSheet = wb.Sheets['_ANALYSIS_META'];
    if (!metaSheet) {
      return {
        isValid: false,
        error:
          'File ini bukan berkas Proyek Analisis resmi SDIT AL FIKRI (Sheet metadata tidak ditemukan).',
      };
    }

    const metaData: any[][] = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });
    let jsonString = '';

    metaData.forEach((row) => {
      if (row[0] === 'JSON_PAYLOAD_CHUNK' && row[1]) {
        jsonString += String(row[1]);
      }
    });

    if (!jsonString) {
      return {
        isValid: false,
        error: 'Gagal mengekstrak data metadata dari berkas Excel.',
      };
    }

    const session = JSON.parse(jsonString) as AnalysisSession;
    if (!session || session.formatType !== 'ANALYSIS_PROJECT') {
      return {
        isValid: false,
        error: 'Format data berkas analisis tidak valid atau sudah rusak.',
      };
    }

    return {
      isValid: true,
      session,
    };
  } catch (err: any) {
    console.error('Error parsing analysis workbook:', err);
    return {
      isValid: false,
      error: `Gagal membaca file Excel: ${err.message || 'Format tidak dikenali'}`,
    };
  }
}

