import * as XLSX from 'xlsx';
import {
  AnalysisSession,
  AnalysisSubject,
  AnalysisQuestionConfig,
  StudentAnswers,
  StudentSubjectResult,
  FileValidationResult,
  ExamType,
} from '../../types/analysisTypes';
import { Student } from '../../services/studentStorage';
import {
  calculateMaxScore,
  calculateStudentTotalScore,
  evaluateStudentResult,
} from '../../services/analysis/analysisCalculationService';
import { saveActiveSession } from '../../services/analysis/analysisSessionService';
import { EXCEL_COLUMN_MAP } from '../../services/analysis/analysisExcelService';

/**
 * Interface hasil import workbook Excel proyek analisis
 */
export interface AnalysisWorkbookImportResult {
  isValid: boolean;
  session?: AnalysisSession;
  importedSubjects: string[];
  skippedSubjects: string[];
  warnings: string[];
  errors: string[];
  matchedStudentsCount: number;
  totalStudentsCount: number;
}

/**
 * Normalisasi nama siswa untuk pencocokan yang akurat dan toleran:
 * - Trim spasi di awal & akhir
 * - Ubah multiple spaces menjadi 1 spasi
 * - Case-insensitive (huruf kecil)
 * - Menghilangkan tanda baca titik/koma yang sering tidak seragam pada gelar/singkatan nama
 */
export function normalizeStudentName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[\.,\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ekstrak metadata JSON dari worksheet `_ANALYSIS_META`
 */
export function extractMetadataFromWorkbook(wb: XLSX.WorkBook): {
  isValid: boolean;
  session?: AnalysisSession;
  error?: string;
} {
  const metaSheet = wb.Sheets['_ANALYSIS_META'];
  if (!metaSheet) {
    return {
      isValid: false,
      error: 'Berkas ini bukan file Proyek Analisis resmi SDIT AL FIKRI (Sheet metadata `_ANALYSIS_META` tidak ditemukan).',
    };
  }

  try {
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
        error: 'Data metadata dalam sheet `_ANALYSIS_META` kosong atau tidak terbaca.',
      };
    }

    const parsedSession = JSON.parse(jsonString) as AnalysisSession;
    if (!parsedSession || parsedSession.formatType !== 'ANALYSIS_PROJECT') {
      return {
        isValid: false,
        error: 'Format data berkas analisis tidak valid atau rusak (formatType bukan ANALYSIS_PROJECT).',
      };
    }

    return {
      isValid: true,
      session: parsedSession,
    };
  } catch (err: any) {
    console.error('Gagal mengekstrak metadata dari workbook:', err);
    return {
      isValid: false,
      error: `Gagal membaca metadata proyek: ${err.message || 'Format JSON rusak'}`,
    };
  }
}

/**
 * Deteksi apakah sebuah baris Excel merupakan baris rekapitulasi / ringkasan / tanda tangan bawah
 */
function isSummaryOrFooterRow(rawName: string, noCell?: any): boolean {
  if (!rawName) return false;
  const trimmed = rawName.trim().toLowerCase();

  // Jika kolom A (No) berisi nomor urut angka 1..100, ini adalah baris data siswa, BUKAN baris rekap!
  if (noCell !== undefined && noCell !== null && noCell.v !== undefined && noCell.v !== '') {
    const num = typeof noCell.v === 'number' ? noCell.v : parseInt(String(noCell.v).trim(), 10);
    if (!isNaN(num) && num > 0 && num <= 100) {
      // Pastikan bukan label rekap yang kebetulan di kolom B
      if (
        !trimmed.startsWith('jumlah jawaban') &&
        !trimmed.startsWith('persentase') &&
        !trimmed.startsWith('rata-rata') &&
        !trimmed.startsWith('rata rata')
      ) {
        return false;
      }
    }
  }

  // Baris ringkasan / tanda tangan hanya cocok jika diawali / sama persis dengan kata kunci berikut:
  if (
    trimmed.startsWith('jumlah jawaban') ||
    trimmed.startsWith('jumlah benar') ||
    trimmed.startsWith('jumlah skor') ||
    trimmed.startsWith('persentase') ||
    trimmed.startsWith('rata-rata') ||
    trimmed.startsWith('rata rata') ||
    trimmed.startsWith('mengetahui') ||
    trimmed.startsWith('kepala sdit') ||
    trimmed.startsWith('kepala sekolah') ||
    trimmed.startsWith('guru kelas') ||
    trimmed.startsWith('guru mapel') ||
    trimmed.startsWith('guru pengampu') ||
    trimmed.startsWith('guru mata pelajaran') ||
    trimmed === 'jumlah' ||
    trimmed === 'persentase' ||
    trimmed === 'rata-rata' ||
    trimmed === 'rata rata' ||
    trimmed === 'mengetahui'
  ) {
    return true;
  }

  return false;
}

/**
 * Parsing sel lembar kerja mapel dari file Excel untuk mendeteksi perubahan manual guru di Excel:
 * Membaca konfigurasi soal, butir jawaban PG 1/0, Isian 1/0, Bagian C berbobot, skor, dan kelulusan.
 * Menggunakan Struktur Kolom Tetap:
 * - C:AP (index 2..41) = PG 1..40
 * - AQ   (index 42)   = Total PG
 * - AR:BA (index 43..52)= Isian 1..10
 * - BB   (index 53)   = Total Isian
 * - BC:BL (index 54..63)= Bagian C 1..10
 * - BM   (index 64)   = Total C
 * - BN   (index 65)   = Total Skor
 * - BO   (index 66)   = Nilai Akhir
 * - BP   (index 67)   = L
 * - BQ   (index 68)   = TL
 */
export function parseSubjectSheetCells(
  ws: XLSX.WorkSheet,
  subjectMeta: AnalysisSubject,
  kktp: number,
  studentSnapshot: Array<{ id: string; name: string; classId?: string }>
): {
  updatedSubject: AnalysisSubject;
  warnings: string[];
} {
  const warnings: string[] = [];
  const updatedSubject: AnalysisSubject = JSON.parse(JSON.stringify(subjectMeta));
  const config = updatedSubject.config;

  // Cari range data
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:BQ100');
  const startRow = 10; // Row 11 di Excel (0-indexed = 10)

  // Map snapshot siswa berdasarkan nama ternormalisasi
  const normalizedSnapshotMap = new Map<string, { id: string; name: string }>();
  studentSnapshot.forEach((st) => {
    normalizedSnapshotMap.set(normalizeStudentName(st.name), st);
  });

  const parsedResults: Record<string, StudentSubjectResult> = {
    ...updatedSubject.studentResults,
  };

  // Cek apakah file menggunakan kolom baru (Isian di Col AR = 43) atau kolom lama (Isian di Col X = 23)
  const isLegacyIsianCol = ws[XLSX.utils.encode_cell({ r: 7, c: 23 })] !== undefined &&
                           ws[XLSX.utils.encode_cell({ r: 7, c: 43 })] === undefined;
  const isianStartCol = isLegacyIsianCol ? 23 : EXCEL_COLUMN_MAP.ISIAN_START; // 43
  const isLegacyCCol = ws[XLSX.utils.encode_cell({ r: 7, c: 29 })] !== undefined &&
                       ws[XLSX.utils.encode_cell({ r: 7, c: 54 })] === undefined;
  const cStartCol = isLegacyCCol ? 29 : EXCEL_COLUMN_MAP.C_START; // 54

  for (let r = startRow; r <= range.e.r; r++) {
    const noCell = ws[XLSX.utils.encode_cell({ r, c: EXCEL_COLUMN_MAP.NO })]; // Col A
    const nameCell = ws[XLSX.utils.encode_cell({ r, c: EXCEL_COLUMN_MAP.NAME })]; // Col B

    if (!nameCell || !nameCell.v) continue;
    const rawName = String(nameCell.v).trim();
    if (!rawName) continue;

    // Cek jika baris adalah baris rekap bawah (e.g. "Jumlah jawaban benar", "Rata-rata", "Mengetahui")
    if (isSummaryOrFooterRow(rawName, noCell)) {
      break;
    }

    // Cocokkan siswa:
    // 1. Cocokkan via normalized name terhadap studentSnapshot
    // 2. Cocokkan via indeks urutan baris siswa jika sesuai posisi snapshot
    // 3. Cocokkan via existing studentResults
    // 4. Cocokkan via substring / partial name
    let matchedStudentId: string | null = null;
    let finalStudentName: string = rawName;

    const normName = normalizeStudentName(rawName);
    const matchedSnapshot = normalizedSnapshotMap.get(normName);

    if (matchedSnapshot) {
      matchedStudentId = matchedSnapshot.id;
      finalStudentName = matchedSnapshot.name;
    } else {
      // Cek berdasarkan indeks urutan siswa di snapshot jika nomor baris sesuai
      const studentIdx = r - startRow;
      if (studentIdx >= 0 && studentIdx < studentSnapshot.length) {
        const candidate = studentSnapshot[studentIdx];
        const normCandidate = normalizeStudentName(candidate.name);
        if (normCandidate === normName || normCandidate.includes(normName) || normName.includes(normCandidate)) {
          matchedStudentId = candidate.id;
          finalStudentName = candidate.name;
        }
      }

      // Coba cari dari studentResults existing
      if (!matchedStudentId) {
        const existingEntry = Object.values(updatedSubject.studentResults).find(
          (res) => normalizeStudentName(res.studentName) === normName
        );
        if (existingEntry) {
          matchedStudentId = existingEntry.studentId;
          finalStudentName = existingEntry.studentName;
        }
      }

      // Substring match di snapshot jika nama disingkat oleh guru
      if (!matchedStudentId) {
        const partialMatch = studentSnapshot.find((st) => {
          const n = normalizeStudentName(st.name);
          return n.includes(normName) || normName.includes(n);
        });
        if (partialMatch) {
          matchedStudentId = partialMatch.id;
          finalStudentName = partialMatch.name;
        }
      }

      // Fallback urutan baris jika nomor urut baris valid di snapshot
      if (!matchedStudentId && studentIdx >= 0 && studentIdx < studentSnapshot.length) {
        const fallbackStudent = studentSnapshot[studentIdx];
        matchedStudentId = fallbackStudent.id;
        finalStudentName = fallbackStudent.name;
      }
    }

    if (!matchedStudentId) {
      // Siswa tambahan yang tidak ada di snapshot
      matchedStudentId = `student_row_${r}_${normName.replace(/\s+/g, '_')}`;
    }

    // Baca Jawaban PG Aktif Saja (Kolom C.. -> Col Index 2 s/d 2 + pgCount - 1)
    const pgAnswers: number[] = [];
    for (let i = 0; i < config.pgCount; i++) {
      const colIdx = EXCEL_COLUMN_MAP.PG_START + i; // Col C = 2
      const cell = ws[XLSX.utils.encode_cell({ r, c: colIdx })];
      const val =
        cell !== undefined && cell.v !== undefined && cell.v !== ''
          ? Number(cell.v)
          : 1;
      pgAnswers.push(val >= 1 ? 1 : 0); // PG: 1 (benar) atau 0 (salah)
    }

    // Baca Jawaban Isian Aktif Saja (Kolom AR.. -> Col Index 43 s/d 43 + isianCount - 1)
    const isianAnswers: number[] = [];
    for (let i = 0; i < config.isianCount; i++) {
      const colIdx = isianStartCol + i;
      const cell = ws[XLSX.utils.encode_cell({ r, c: colIdx })];
      const val =
        cell !== undefined && cell.v !== undefined && cell.v !== ''
          ? Number(cell.v)
          : 1;
      if (config.isianWeight > 1) {
        isianAnswers.push(Math.min(config.isianWeight, Math.max(0, val)));
      } else {
        isianAnswers.push(val >= 1 ? 1 : 0);
      }
    }

    // Baca Jawaban Bagian C Aktif Saja (Kolom BC.. -> Col Index 54 s/d 54 + cCount - 1)
    // PENTING: Bagian C menyimpan skor aktual (misal 2, 1, 0), TIDAK dipaksa boolean 0/1
    const cAnswers: number[] = [];
    for (let i = 0; i < config.cCount; i++) {
      const colIdx = cStartCol + i;
      const cell = ws[XLSX.utils.encode_cell({ r, c: colIdx })];
      const val =
        cell !== undefined && cell.v !== undefined && cell.v !== ''
          ? Number(cell.v)
          : config.cWeight;
      // Batasi antara 0 dan bobot C
      cAnswers.push(Math.min(config.cWeight, Math.max(0, val)));
    }

    const studentAnswers: StudentAnswers = {
      pg: pgAnswers,
      isian: isianAnswers,
      c: cAnswers,
    };

    // Evaluasi skor & nilai akhir
    const studentResult = evaluateStudentResult(
      matchedStudentId,
      finalStudentName,
      studentAnswers,
      config,
      kktp
    );

    parsedResults[matchedStudentId] = studentResult;
  }

  updatedSubject.studentResults = parsedResults;
  updatedSubject.completedStudentsCount = Object.keys(parsedResults).length;
  updatedSubject.maxScore = calculateMaxScore(config);
  updatedSubject.updatedAt = new Date().toISOString();

  return {
    updatedSubject,
    warnings,
  };
}

/**
 * Validasi mendalam struktur Workbook Analisis terhadap sesi aktif dan data siswa kelas
 */
export function validateAnalysisWorkbookSession(
  importedSession: AnalysisSession,
  activeSession: AnalysisSession | null,
  currentStudents: Student[]
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validasi Identitas Format
  if (!importedSession || importedSession.formatType !== 'ANALYSIS_PROJECT') {
    return {
      isValid: false,
      filePurpose: 'SESSION',
      errors: [
        'Format file bukan merupakan Proyek Analisis resmi SDIT AL FIKRI (formatType tidak valid).',
      ],
      warnings: [],
      matchedStudentsCount: 0,
      totalFileStudentsCount: 0,
      conflictingSubjects: [],
      newSubjects: [],
    };
  }

  if (importedSession.formatVersion && importedSession.formatVersion > 2) {
    warnings.push(
      `Versi format file (${importedSession.formatVersion}) lebih baru dari sistem, beberapa konfigurasi mungkin disesuaikan.`
    );
  }

  const filePurpose = importedSession.filePurpose || 'SESSION';

  // 2. Validasi Kelas, Ujian, dan Tahun Pelajaran jika ada Sesi Aktif
  if (activeSession) {
    if (
      importedSession.classId &&
      activeSession.classId &&
      importedSession.classId.toLowerCase() !== activeSession.classId.toLowerCase()
    ) {
      errors.push(
        `Kelas tidak cocok! File ini ditujukan untuk Kelas "${importedSession.className || importedSession.classId}", sedangkan sesi Anda yang aktif saat ini adalah Kelas "${activeSession.className || activeSession.classId}".`
      );
    }

    if (
      importedSession.examType &&
      activeSession.examType &&
      importedSession.examType !== activeSession.examType
    ) {
      warnings.push(
        `Jenis ujian berbeda: File adalah "${importedSession.examType}", sedangkan sesi aktif saat ini adalah "${activeSession.examType}".`
      );
    }

    if (
      importedSession.schoolYear &&
      activeSession.schoolYear &&
      importedSession.schoolYear !== activeSession.schoolYear
    ) {
      warnings.push(
        `Tahun Pelajaran berbeda: File adalah "${importedSession.schoolYear}", sedangkan sesi saat ini adalah "${activeSession.schoolYear}".`
      );
    }

    if (
      importedSession.kktp &&
      activeSession.kktp &&
      importedSession.kktp !== activeSession.kktp
    ) {
      warnings.push(
        `Standar KKTP berbeda: File menggunakan KKTP ${importedSession.kktp}, sedangkan sesi aktif menggunakan KKTP ${activeSession.kktp}. Nilai kelulusan akan dihitung sesuai standar KKTP sesi.`
      );
    }
  }

  // 3. Validasi Siswa
  const fileStudents = importedSession.studentSnapshot || [];
  let matchedCount = 0;

  fileStudents.forEach((fs) => {
    const normFsName = normalizeStudentName(fs.name);
    const isMatch = currentStudents.some(
      (cs) => cs.id === fs.id || normalizeStudentName(cs.name) === normFsName
    );
    if (isMatch) matchedCount++;
  });

  if (
    fileStudents.length > 0 &&
    matchedCount === 0 &&
    currentStudents.length > 0
  ) {
    warnings.push(
      'Daftar nama siswa dalam file tidak cocok dengan data siswa di database kelas. Nilai akan dicocokkan otomatis berdasarkan nama yang sesuai.'
    );
  }

  // 4. Validasi Struktur Mata Pelajaran & Konfigurasi Soal
  const conflictingSubjects: string[] = [];
  const newSubjects: string[] = [];

  if (!importedSession.subjects || importedSession.subjects.length === 0) {
    warnings.push('File proyek ini belum memiliki mata pelajaran yang dikerjakan.');
  } else {
    importedSession.subjects.forEach((subj) => {
      // Validasi batas soal (PG maks 40, Isian maks 10, C maks 10)
      if (subj.config) {
        if (subj.config.pgCount < 0 || subj.config.pgCount > EXCEL_COLUMN_MAP.PG_MAX_COUNT) {
          warnings.push(
            `Jumlah soal PG pada mapel "${subj.subjectName}" (${subj.config.pgCount}) di luar batas standar (0-40).`
          );
        }
        if (subj.config.isianCount < 0 || subj.config.isianCount > EXCEL_COLUMN_MAP.ISIAN_MAX_COUNT) {
          warnings.push(
            `Jumlah soal Isian pada mapel "${subj.subjectName}" (${subj.config.isianCount}) di luar batas standar (0-10).`
          );
        }
        if (subj.config.cCount < 0 || subj.config.cCount > EXCEL_COLUMN_MAP.C_MAX_COUNT) {
          warnings.push(
            `Jumlah soal Bagian C pada mapel "${subj.subjectName}" (${subj.config.cCount}) di luar batas standar (0-10).`
          );
        }
      }

      if (activeSession) {
        const isConflict = activeSession.subjects.some(
          (s) =>
            s.subjectId === subj.subjectId ||
            s.subjectName.trim().toLowerCase() ===
              subj.subjectName.trim().toLowerCase()
        );
        if (isConflict) {
          conflictingSubjects.push(subj.subjectName);
        } else {
          newSubjects.push(subj.subjectName);
        }
      } else {
        newSubjects.push(subj.subjectName);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    filePurpose,
    session: importedSession,
    subjectToImport:
      filePurpose === 'SUBJECT_IMPORT' && importedSession.subjects.length > 0
        ? importedSession.subjects[0]
        : undefined,
    errors,
    warnings,
    matchedStudentsCount: matchedCount,
    totalFileStudentsCount: fileStudents.length,
    conflictingSubjects,
    newSubjects,
  };
}

/**
 * Membaca dan mengimpor file Excel Analisis Soal (Full Workbook Import & Resume)
 * Mendukung round-trip: App -> Excel -> App
 */
export function importAnalysisSessionFromExcel(
  fileBuffer: ArrayBuffer | Uint8Array,
  activeSession: AnalysisSession | null = null,
  currentStudents: Student[] = []
): AnalysisWorkbookImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const importedSubjects: string[] = [];
  const skippedSubjects: string[] = [];

  try {
    const wb = XLSX.read(fileBuffer, {
      type: 'array',
      cellFormula: true,
      cellStyles: true,
    });

    // 1. Ekstrak Metadata
    const metaResult = extractMetadataFromWorkbook(wb);
    if (!metaResult.isValid || !metaResult.session) {
      return {
        isValid: false,
        importedSubjects: [],
        skippedSubjects: [],
        warnings: [],
        errors: [metaResult.error || 'Gagal membaca sheet metadata `_ANALYSIS_META`.'],
        matchedStudentsCount: 0,
        totalStudentsCount: currentStudents.length,
      };
    }

    const baseSession = metaResult.session;
    const kktp = activeSession?.kktp || baseSession.kktp || 70;

    // 2. Sinkronkan dengan data sheet di Excel jika ada perubahan manual
    const syncedSubjects: AnalysisSubject[] = [];

    baseSession.subjects.forEach((subject) => {
      // Cari worksheet yang cocok (skip REKAP NILAI dan _ANALYSIS_META)
      const sheetName = subject.sheetName || subject.subjectName;
      const targetSheet =
        wb.Sheets[sheetName] ||
        wb.Sheets[sheetName.substring(0, 31)] ||
        wb.Sheets[subject.subjectName];

      if (targetSheet) {
        const { updatedSubject, warnings: sheetWarnings } = parseSubjectSheetCells(
          targetSheet,
          subject,
          kktp,
          baseSession.studentSnapshot
        );
        syncedSubjects.push(updatedSubject);
        importedSubjects.push(subject.subjectName);
        if (sheetWarnings.length > 0) {
          warnings.push(...sheetWarnings);
        }
      } else {
        // Sheet tidak ada di workbook, tetapi ada di metadata
        syncedSubjects.push(subject);
        importedSubjects.push(subject.subjectName);
      }
    });

    // 3. Bangun Session yang telah dipulihkan (Restored Session)
    const restoredSession: AnalysisSession = {
      ...baseSession,
      kktp,
      subjects: syncedSubjects,
      updatedAt: new Date().toISOString(),
    };

    // 4. Hitung kecocokan siswa
    const fileStudents = restoredSession.studentSnapshot || [];
    let matchedCount = 0;
    fileStudents.forEach((fs) => {
      const normFs = normalizeStudentName(fs.name);
      if (currentStudents.some((cs) => cs.id === fs.id || normalizeStudentName(cs.name) === normFs)) {
        matchedCount++;
      }
    });

    return {
      isValid: true,
      session: restoredSession,
      importedSubjects,
      skippedSubjects,
      warnings,
      errors,
      matchedStudentsCount: matchedCount,
      totalStudentsCount: currentStudents.length > 0 ? currentStudents.length : fileStudents.length,
    };
  } catch (err: any) {
    console.error('Error importing analysis session from Excel:', err);
    return {
      isValid: false,
      importedSubjects: [],
      skippedSubjects: [],
      warnings: [],
      errors: [`Terjadi kesalahan saat memproses file Excel: ${err.message || 'Format tidak valid'}`],
      matchedStudentsCount: 0,
      totalStudentsCount: currentStudents.length,
    };
  }
}

/**
 * Menggabungkan hasil impor Excel ke dalam sesi yang sedang berjalan (Resume / Merge Mapel)
 * - Menjaga mapel yang sudah dikerjakan sebelumnya
 * - Menambahkan mapel baru dari file
 * - Menyelesaikan konflik nama mapel sesuai opsi (OVERWRITE atau KEEP_EXISTING)
 */
export function applyImportedSessionToWorkspace(
  activeSession: AnalysisSession,
  importedSession: AnalysisSession,
  currentStudents: Student[],
  conflictResolution: 'OVERWRITE' | 'KEEP_EXISTING' = 'OVERWRITE'
): AnalysisSession {
  const mergedSubjects: AnalysisSubject[] = [...activeSession.subjects];

  // Map nama siswa lokal ke ID lokal database
  const studentNameToIdMap = new Map<string, string>();
  const studentIdSet = new Set<string>();
  currentStudents.forEach((s) => {
    studentNameToIdMap.set(normalizeStudentName(s.name), s.id);
    studentIdSet.add(s.id);
  });

  importedSession.subjects.forEach((importedSubj) => {
    // Normalisasi studentResults dengan ID database lokal
    const normalizedResults: typeof importedSubj.studentResults = {};
    Object.values(importedSubj.studentResults).forEach((res) => {
      const normResName = normalizeStudentName(res.studentName);
      let matchedLocalId = studentNameToIdMap.get(normResName);

      // Fallback substring jika nama disingkat
      if (!matchedLocalId) {
        const found = currentStudents.find((cs) => {
          const n = normalizeStudentName(cs.name);
          return n.includes(normResName) || normResName.includes(n);
        });
        if (found) matchedLocalId = found.id;
      }

      const targetId = matchedLocalId || (studentIdSet.has(res.studentId) ? res.studentId : res.studentId);
      normalizedResults[targetId] = {
        ...res,
        studentId: targetId,
      };
    });

    const normalizedSubject: AnalysisSubject = {
      ...importedSubj,
      studentResults: normalizedResults,
      completedStudentsCount: Object.keys(normalizedResults).length,
      status: 'imported',
      updatedAt: new Date().toISOString(),
    };

    const existingByIdIdx = mergedSubjects.findIndex(
      (s) => s.subjectId === importedSubj.subjectId
    );
    const existingByNameIdx = mergedSubjects.findIndex(
      (s) =>
        normalizeStudentName(s.subjectName) === normalizeStudentName(importedSubj.subjectName)
    );
    const existingIdx = existingByIdIdx >= 0 ? existingByIdIdx : existingByNameIdx;

    if (existingIdx >= 0) {
      if (conflictResolution === 'OVERWRITE') {
        mergedSubjects[existingIdx] = normalizedSubject;
      }
      // Jika KEEP_EXISTING, lewati (tidak menimpa)
    } else {
      mergedSubjects.push(normalizedSubject);
    }
  });

  const updatedSession: AnalysisSession = {
    ...activeSession,
    subjects: mergedSubjects,
    updatedAt: new Date().toISOString(),
  };

  saveActiveSession(updatedSession);
  return updatedSession;
}
