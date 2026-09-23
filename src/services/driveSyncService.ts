import { MasterClass, MasterSubject } from '../data/masterExamData';
import {
  toggleTrackingRecordCollected,
  getStoredTrackingRecords,
  batchSaveTrackingRecords,
} from './storage';
import { ExamTrackingRecord } from '../types';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  path?: string;
}

export interface SyncDriveResult {
  success: boolean;
  message: string;
  totalDriveFilesFound: number;
  matchedCount: number;
  matchedDetails: Array<{
    classId: string;
    subjectId: string;
    subjectName: string;
    fileName: string;
    driveUrl?: string;
  }>;
  unmatchedFiles: Array<{
    id: string;
    name: string;
    path?: string;
    webViewLink?: string;
  }>;
  allDriveFiles: DriveFileItem[];
  status?: 'success' | 'drive_access_required' | 'error';
  apiMethodUsed?: string;
  instructions?: string;
}

/**
 * Extract Google Drive Folder ID from a Drive Folder URL or raw string
 */
export function extractDriveFolderId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  if (!trimmed) return null;

  // Match URL pattern:
  // https://drive.google.com/drive/folders/FOLDER_ID
  // or /u/0/folders/FOLDER_ID
  const folderMatch = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/i);

  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // If user pasted raw Folder ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Match a Drive file against a Class and Subject based on filename / path
 */
export function matchClassAndSubject(
  file: { name: string; path?: string },
  classItem: { id: string; name: string; level?: number },
  subjectItem: { id: string; name: string; teacher?: string }
): boolean {
  const fullRawText = `${file.path || ''} ${file.name}`.toUpperCase();

  // Strip file extensions (.docx, .doc, .pdf, .xlsx, etc.)
  const textWithoutExt = fullRawText.replace(/\.(DOCX|DOC|PDF|XLSX|XLS|PPTX|PPT|TXT|ZIP|RAR)$/i, '');

  // Normalized variants for flexible regex matching (removing all punctuation, apostrophes, dashes, dots)
  const normalizedText = textWithoutExt.replace(/[-'’`"_.\\/]/g, ' ').replace(/\s+/g, ' ').trim();

  // ============================================================
  // 1. CLASS & GRADE MATCHING
  // ============================================================

  const classId = classItem.id.toUpperCase().trim();
  const digitPart = classId.match(/^[0-9]+/)?.[0] || String(classItem.level || '');
  const letterPart = classId.match(/[A-Z]+$/)?.[0]; // e.g. 'A', 'B', 'C'
  const classLevel = classItem.level || parseInt(digitPart) || 1;

  // Roman numeral map for levels 1 to 6
  const romanMap: Record<string, string> = {
    '1': 'I',
    '2': 'II',
    '3': 'III',
    '4': 'IV',
    '5': 'V',
    '6': 'VI',
  };

  const romanDigit = romanMap[digitPart] || '';

  let matchesClass = false;

  // Mask out exam numbers and package types like "STS 1", "STS 2", "SAS 1", "PTS 1", "PAS 1", "PAKET A", "TIPE B", "2024", "2025", "2026"
  // so that "STS 1" is not confused with Class 1, and "PAKET A" is not confused with Rombel A
  const textWithoutExamNumbers = normalizedText
    .replace(/\b(?:STS|SAS|PTS|PAS|PAT|ASTS|ASAS|SUMATIF|ASESMEN|SEMESTER|SMT|SEM|ULANGAN|PENILAIAN)\s*(?:[12]|I|II)\b/gi, ' EXAM_TAG ')
    .replace(/\b(?:PAKET|TIPE|PKG|PKT)\s*[A-E]\b/gi, ' PKG_TAG ')
    .replace(/\b202[0-9]\b/g, ' YEAR_TAG ');

  if (digitPart && letterPart) {
    // 1.1. Standar single-class dengan Angka Arab (contoh: 1A, 1-A, 1_A, 1 A, KELAS 1A, KLS 1 A, KL 1A)
    const arabicSingleRegex = new RegExp(
      `(?:^|[^A-Z0-9])(?:KELAS\\s*|KLS\\s*|KL\\s*|RUANG\\s*)?${digitPart}[\\s-_.]*${letterPart}(?:[^A-Z0-9]|$)`,
      'i'
    );

    // 1.2. Standar single-class dengan Angka Romawi (contoh: I A, IA, I-A, KELAS IA, KELAS I A, KLS I-A, VI A, VIA)
    const romanSingleRegex = romanDigit
      ? new RegExp(
          `(?:^|[^A-Z0-9])(?:KELAS\\s*|KLS\\s*|KL\\s*|RUANG\\s*)?${romanDigit}[\\s-_.]*${letterPart}(?:[^A-Z0-9]|$)`,
          'i'
        )
      : null;

    // 1.3. Multi-class / Kelas Paralel Rapat (contoh: 1AB, 6AB, KELAS 6AB, 6-AB, VI AB, VIA-B)
    const arabicCompactMulti = new RegExp(
      `(?:^|[^A-Z0-9])(?:KELAS\\s*|KLS\\s*|KL\\s*|RUANG\\s*)?${digitPart}[\\s-_]*([A-E]{2,3})(?![A-Z0-9])`,
      'i'
    );
    const romanCompactMulti = romanDigit
      ? new RegExp(
          `(?:^|[^A-Z0-9])(?:KELAS\\s*|KLS\\s*|KL\\s*|RUANG\\s*)?${romanDigit}[\\s-_]*([A-E]{2,3})(?![A-Z0-9])`,
          'i'
        )
      : null;

    // 1.4. Multi-class Terpisah (contoh: 6A-B, 6A & 6B, 6A DAN B, VI A - VI B)
    const separatedMultiClassRegex = new RegExp(
      `(?:^|[^A-Z0-9])(?:KELAS\\s*|KLS\\s*|KL\\s*)?(?:${digitPart}|${romanDigit})[\\s-_]*([A-E])\\s*(?:[-/&,]|DAN|DAN\\s*(?:${digitPart}|${romanDigit})?)\\s*(?:${digitPart}|${romanDigit})?[\\s-_]*([A-E])(?![A-Z0-9])`,
      'i'
    );

    const checkMultiMatch = (text: string): boolean => {
      const mArab = text.match(arabicCompactMulti);
      if (mArab && mArab[1] && mArab[1].toUpperCase().includes(letterPart)) return true;

      if (romanCompactMulti) {
        const mRom = text.match(romanCompactMulti);
        if (mRom && mRom[1] && mRom[1].toUpperCase().includes(letterPart)) return true;
      }

      const mSep = text.match(separatedMultiClassRegex);
      if (mSep && mSep[1] && mSep[2]) {
        const l1 = mSep[1].toUpperCase();
        const l2 = mSep[2].toUpperCase();
        if (letterPart === l1 || letterPart === l2) return true;
      }

      return false;
    };

    // 1.5. Naskah Tingkat Angkatan / Jenjang (Shared Exam Level):
    // Contoh kasus guru membuat 1 file naskah untuk seluruh jenjang: "Soal STS 1 PAI Kelas 1.docx", "Soal IPAS Kelas 4.docx"
    // Syarat: File menyebut eksplisit jenjang kelas ini, dan TIDAK menyebut rombel kelas lain secara spesifik.
    const checkGradeLevelMatch = (text: string): boolean => {
      // Deteksi penulisan jenjang: KELAS 1, KLS 1, KL 1, KELAS I, KLS I, LEVEL 1, GRADE 1
      const gradeRegex = new RegExp(
        `(?:^|[^A-Z0-9])(?:KELAS|KLS|KL|LEVEL|GRADE)\\s*(?:${digitPart}|${romanDigit})(?:[^A-Z0-9]|$)`,
        'i'
      );

      if (!gradeRegex.test(text)) return false;

      // Pastikan file TIDAK ditujukan khusus untuk rombel lain (misal jika kita sedang memeriksa 1A, file tidak boleh khusus menyebut 1B atau 1C)
      const otherLetters = ['A', 'B', 'C', 'D'].filter((l) => l !== letterPart);
      const isExplicitlyForOtherClass = otherLetters.some((otherL) => {
        const otherSingle = new RegExp(
          `(?:^|[^A-Z0-9])(?:KELAS\\s*|KLS\\s*|KL\\s*)?(?:${digitPart}|${romanDigit})[\\s-_.]*${otherL}(?:[^A-Z0-9]|$)`,
          'i'
        );
        return otherSingle.test(text);
      });

      return !isExplicitlyForOtherClass;
    };

    matchesClass =
      arabicSingleRegex.test(textWithoutExamNumbers) ||
      arabicSingleRegex.test(normalizedText) ||
      (romanSingleRegex ? romanSingleRegex.test(textWithoutExamNumbers) || romanSingleRegex.test(normalizedText) : false) ||
      checkMultiMatch(textWithoutExamNumbers) ||
      checkMultiMatch(normalizedText) ||
      checkGradeLevelMatch(textWithoutExamNumbers);
  } else {
    const classRegex = new RegExp(
      `(?:^|[^A-Z0-9])(?:KELAS\\s*|KLS\\s*|KL\\s*)?${classId}(?:[^A-Z0-9]|$)`,
      'i'
    );

    matchesClass = classRegex.test(textWithoutExamNumbers) || classRegex.test(normalizedText);
  }

  if (!matchesClass) return false;

  // ============================================================
  // 2. SUBJECT MATCHING (Precise Alias & Exact Word Engine)
  // ============================================================

  const subjectName = subjectItem.name.toUpperCase().trim();
  const subjectId = (subjectItem.id || '').toUpperCase().trim();

  const aliases: string[] = [subjectName];

  const hasExactWord = (str: string, word: string) => {
    const rx = new RegExp('(^|[^A-Z0-9])' + word + '([^A-Z0-9]|$)', 'i');
    return rx.test(str);
  };

  // 1. INFORMATIKA / TIK / KOMPUTER
  // (Checked before MATEMATIKA to avoid any substring overlaps like 'mat' inside 'informatika' or 'tik' inside 'matematika')
  if (
    subjectId.endsWith('INFORMATIKA') ||
    subjectId.includes('-TIK') ||
    subjectId.includes('KOMPUTER') ||
    subjectName.includes('INFORMATIKA') ||
    hasExactWord(subjectName, 'TIK') ||
    hasExactWord(subjectName, 'KOMPUTER') ||
    hasExactWord(subjectName, 'KODING') ||
    hasExactWord(subjectName, 'CODING') ||
    hasExactWord(subjectName, 'ICT')
  ) {
    aliases.push(
      'INFORMATIKA',
      'TIK',
      'KOMPUTER',
      'TEKNOLOGI INFORMASI',
      'INF',
      'KODING',
      'CODING',
      'ICT'
    );
  }

  // 2. MATEMATIKA / MTK / MATH
  else if (
    subjectId.endsWith('MATEMATIKA') ||
    subjectId.includes('-MTK') ||
    subjectId.includes('-MATH') ||
    subjectName.includes('MATEMATIKA') ||
    hasExactWord(subjectName, 'MTK') ||
    hasExactWord(subjectName, 'MATH') ||
    hasExactWord(subjectName, 'MATHS') ||
    hasExactWord(subjectName, 'MAT')
  ) {
    aliases.push(
      'MATEMATIKA',
      'MATEMATIK',
      'MTK',
      'MATH',
      'MATHS',
      'MAT'
    );
  }

  // 3. QURDIST / Al-Qur'an Hadits / Qurdis / Tahfidz / BTQ (Kelas 4-6)
  else if (
    subjectId.includes('QURDIST') ||
    subjectId.includes('QURDIS') ||
    subjectId.includes('TAHFIDZ') ||
    subjectId.includes('BTQ') ||
    subjectName.includes('QURDIST') ||
    subjectName.includes('QURDIS') ||
    subjectName.includes('TAHFIDZ') ||
    subjectName.includes('BTQ') ||
    subjectName.includes('QURAN') ||
    subjectName.includes('HADITS') ||
    subjectName.includes('HADIST') ||
    subjectName.includes('HADIS')
  ) {
    aliases.push(
      'TAHFIDZ',
      'BTQ',
      'AL QURAN',
      'AL QUR AN',
      'QURAN',
      'QUR AN',
      'HADITS',
      'HADIST',
      'HADIS',
      'HADITH',
      'QURDIST',
      'QURDIS',
      'QURAN HADIST',
      'QURAN HADITS',
      'QURAN HADIS',
      'AL QURAN HADIST',
      'AL QURAN HADITS',
      'AL QURAN HADIS',
      'AL QUR AN HADIST',
      'AL QUR AN HADITS',
      'AL QUR AN HADIS',
      'TAHSIN',
      'BTHQ',
      'QH'
    );
  }

  // 4. SKI / Sejarah Kebudayaan Islam (Kelas 4-6)
  else if (
    subjectId.includes('SKI') ||
    subjectId.includes('SEJARAH') ||
    subjectName.includes('SKI') ||
    subjectName.includes('SEJARAH') ||
    hasExactWord(subjectName, 'TARIKH')
  ) {
    aliases.push(
      'SKI',
      'S.K.I',
      'S K I',
      'SEJARAH KEBUDAYAAN ISLAM',
      'SEJARAH ISLAM',
      'TARIKH'
    );
  }

  // 5. AKIDAH AKHLAK
  else if (
    subjectId.includes('AKIDAH') ||
    subjectId.includes('AQIDAH') ||
    subjectId.includes('AKHLAK') ||
    subjectName.includes('AKIDAH') ||
    subjectName.includes('AQIDAH') ||
    subjectName.includes('AKHLAK')
  ) {
    aliases.push(
      'AKIDAH',
      'AKHLAK',
      'AKIDAH AKHLAK',
      'AQIDAH',
      'AQIDAH AKHLAK',
      'AKIDAH-AKHLAK',
      'AQIDAH-AKHLAK',
      'AA'
    );
  }

  // 6. FIQIH / FIKIH
  else if (
    subjectId.includes('FIQIH') ||
    subjectId.includes('FIKIH') ||
    subjectName.includes('FIQIH') ||
    subjectName.includes('FIKIH') ||
    hasExactWord(subjectName, 'FQH')
  ) {
    aliases.push(
      'FIQIH',
      'FIKIH',
      'FQH'
    );
  }

  // 7. BAHASA ARAB / BSA
  else if (
    subjectId.includes('ARAB') ||
    subjectId.includes('BSA') ||
    subjectName.includes('ARAB') ||
    hasExactWord(subjectName, 'BSA')
  ) {
    aliases.push(
      'ARAB',
      'B ARAB',
      'BAHASA ARAB',
      'B.ARAB',
      'BSA',
      'B.S.A',
      'B SA',
      'B-SA',
      'BAHASA DAN SASTRA ARAB',
      'BAHAS ARAB'
    );
  }

  // 8. BAHASA INGGRIS
  else if (
    subjectId.includes('INGGRIS') ||
    subjectId.includes('ENGLISH') ||
    subjectName.includes('INGGRIS') ||
    hasExactWord(subjectName, 'ENGLISH')
  ) {
    aliases.push(
      'INGGRIS',
      'B INGGRIS',
      'BAHASA INGGRIS',
      'B.INGGRIS',
      'B ING',
      'B.ING',
      'BING',
      'ENGLISH'
    );
  }

  // 9. BAHASA INDONESIA
  else if (
    subjectId.includes('INDONESIA') ||
    subjectName.includes('INDONESIA') ||
    hasExactWord(subjectName, 'INDO') ||
    hasExactWord(subjectName, 'BINDO')
  ) {
    aliases.push(
      'INDONESIA',
      'B INDONESIA',
      'BAHASA INDONESIA',
      'B.INDONESIA',
      'B INDO',
      'B.INDO',
      'BINDO',
      'INDO'
    );
  }

  // 10. PJOK / PENJAS / OLAHRAGA
  else if (
    subjectId.includes('PJOK') ||
    subjectId.includes('PENJAS') ||
    subjectId.includes('OLAHRAGA') ||
    subjectId.includes('JASMANI') ||
    subjectName.includes('PJOK') ||
    subjectName.includes('PENJAS') ||
    subjectName.includes('OLAHRAGA') ||
    subjectName.includes('JASMANI')
  ) {
    aliases.push(
      'PJOK',
      'PENJAS',
      'PENJASKES',
      'PENJAS KES',
      'OLAHRAGA',
      'JASMANI',
      'PJK'
    );
  }

  // 11. SENI RUPA / SBDP
  else if (
    subjectId.includes('SENIRUPA') ||
    subjectId.includes('SENI') ||
    subjectId.includes('SBDP') ||
    subjectName.includes('SENI') ||
    subjectName.includes('SBDP')
  ) {
    aliases.push(
      'SENI',
      'SENI RUPA',
      'SBDP',
      'SENI BUDAYA',
      'SENI MUSIK',
      'SENI TARI',
      'SBR',
      'SENIRUPA',
      'SBD'
    );
  }

  // 12. PENDIDIKAN PANCASILA / PPKN / PKN
  else if (
    subjectId.includes('PANCASILA') ||
    subjectId.includes('PPKN') ||
    subjectId.includes('PKN') ||
    subjectName.includes('PANCASILA') ||
    hasExactWord(subjectName, 'PPKN') ||
    hasExactWord(subjectName, 'PKN') ||
    hasExactWord(subjectName, 'CIVICS')
  ) {
    aliases.push(
      'PANCASILA',
      'PEND. PANCASILA',
      'PENDIDIKAN PANCASILA',
      'PEND PANCASILA',
      'PPKN',
      'PKN',
      'PK-N',
      'CIVICS'
    );
  }

  // 13. IPAS / IPA / IPS
  else if (
    subjectId.includes('IPAS') ||
    subjectId.includes('-IPA') ||
    subjectId.includes('-IPS') ||
    subjectName.includes('IPAS') ||
    hasExactWord(subjectName, 'IPA') ||
    hasExactWord(subjectName, 'IPS') ||
    hasExactWord(subjectName, 'SAINS') ||
    hasExactWord(subjectName, 'SCIENCE')
  ) {
    aliases.push(
      'IPAS',
      'IPA',
      'IPS',
      'SAINS',
      'SCIENCE'
    );
  }

  // 14. BAHASA SUNDA
  else if (
    subjectId.includes('SUNDA') ||
    subjectName.includes('SUNDA')
  ) {
    aliases.push(
      'SUNDA',
      'B SUNDA',
      'BAHASA SUNDA',
      'B.SUNDA',
      'MULOK SUNDA',
      'MULOK B.SUNDA'
    );
  }

  // 15. PAI / Pendidikan Agama Islam (Default PAI)
  else if (
    subjectId.includes('PAI') ||
    subjectId.includes('AGAMA') ||
    subjectName.includes('PAI') ||
    subjectName.includes('AGAMA')
  ) {
    aliases.push(
      'PAI',
      'AGAMA',
      'AGAMA ISLAM',
      'PENDIDIKAN AGAMA',
      'PAIBP',
      'PAI BP',
      'PAI-BP',
      'ISLAM'
    );

    // Di kelas 1-3 SD, mapel Al-Qur'an Hadits / BTQ terintegrasi dalam PAI
    if (classLevel <= 3) {
      aliases.push(
        'AL QURAN',
        'AL QUR AN',
        'QURAN',
        'QUR AN',
        'HADITS',
        'HADIST',
        'HADIS',
        'QURDIS',
        'QURDIST',
        'QURAN HADIST',
        'QURAN HADITS',
        'QURAN HADIS',
        'AL QURAN HADIST',
        'AL QURAN HADITS',
        'AL QURAN HADIS',
        'AL QUR AN HADIST',
        'AL QUR AN HADITS',
        'AL QUR AN HADIS',
        'BTQ',
        'TAHFIDZ',
        'TAHSIN'
      );
    }
  }

  // Match subject by aliases
  const matchesSubject = aliases.some((alias) => {
    const cleanAlias = alias
      .replace(/[-_.]/g, ' ')
      .trim();

    if (!cleanAlias) return false;

    const aliasRegex = new RegExp(
      `(?:^|[^A-Z0-9])${cleanAlias.replace(
        /\s+/g,
        '\\s*'
      )}(?:[^A-Z0-9]|$)`,
      'i'
    );

    return (
      aliasRegex.test(fullRawText) ||
      aliasRegex.test(normalizedText)
    );
  });

  return matchesSubject;
}

/**
 * Synchronize Google Drive Folder contents with Tracking Records
 *
 * IMPORTANT:
 * - Drive is treated as the source of truth ONLY for records
 *   that were previously collected from Drive.
 * - Manual tracking records are NOT automatically unchecked.
 * - When a previously uploaded Drive file disappears from the
 *   configured folder, its tracking status is automatically reset.
 */
export async function syncGoogleDriveTracking(
  driveFolderUrl: string,
  trackingSessionId: string,
  masterClasses: MasterClass[],
  activeExamSession: {
    activeClasses?: Record<string, boolean>;
    activeSubjects?: Record<string, Record<string, boolean>>;
  },
  currentRecordsMap?: Record<string, ExamTrackingRecord>
): Promise<SyncDriveResult> {
  const folderId = extractDriveFolderId(driveFolderUrl);

  if (!folderId) {
    return {
      success: false,
      message:
        'URL Google Drive belum dikonfigurasi dengan benar di Pengaturan Admin.',
      totalDriveFilesFound: 0,
      matchedCount: 0,
      matchedDetails: [],
      unmatchedFiles: [],
      allDriveFiles: [],
      status: 'error',
    };
  }

  try {
    // ============================================================
    // 1. CALL API ENDPOINT WITH TIMEOUT & RETRY RESILIENCE
    // ============================================================

    const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 20000): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let response: Response | null = null;
    let lastNetworkError: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await fetchWithTimeout(
          '/api/drive/sync-tracking',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              folderUrl: driveFolderUrl,
              folderId,
            }),
          },
          25000
        );

        if (response && response.ok) {
          lastNetworkError = null;
          break;
        } else if (response) {
          lastNetworkError = new Error(`HTTP Error ${response.status}`);
        }
      } catch (fetchErr) {
        lastNetworkError = fetchErr;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }

    if (!response || !response.ok) {
      throw lastNetworkError || new Error('Gagal tersambung ke server sinkronisasi Google Drive.');
    }

    const data = await response.json();

    // ============================================================
    // 2. HANDLE DRIVE ACCESS ERROR
    // ============================================================

    if (data.status === 'drive_access_required') {
      return {
        success: false,
        message:
          data.message ||
          'Tautan Folder Google Drive memerlukan izin akses publik. Pastikan opsi "Siapa saja yang memiliki link dapat melihat" diaktifkan pada folder Google Drive Anda.',
        totalDriveFilesFound: 0,
        matchedCount: 0,
        matchedDetails: [],
        unmatchedFiles: [],
        allDriveFiles: [],
        status: 'drive_access_required',
        instructions:
          '1. Buka folder Google Drive Anda.\n2. Klik tombol "Bagikan" (Share) di sudut kanan atas.\n3. Ubah Akses Umum menjadi "Siapa saja yang memiliki link" -> "Pelihat" (Viewer).\n4. Klik Selesai dan coba sinkronkan kembali.',
      };
    }

    // ============================================================
    // 3. GET CURRENT DRIVE FILES
    // ============================================================

    const driveFiles: DriveFileItem[] = Array.isArray(data.files)
      ? data.files
      : [];

    // ============================================================
    // 4. PREPARE TRACKING RECORDS
    //
    // IMPORTANT:
    // Jangan memakai:
    //
    //   currentRecordsMap || getStoredTrackingRecords()
    //
    // karena object kosong tetap truthy dan data React dapat
    // menjadi stale dibanding data terbaru di storage.
    //
    // Storage dijadikan sumber data utama, lalu currentRecordsMap
    // hanya digunakan sebagai fallback/penambah apabila memang
    // belum tersedia di storage.
    // ============================================================

    const storedRecords = getStoredTrackingRecords();

    const liveRecords: Record<string, ExamTrackingRecord> = {
      ...storedRecords,
      ...(currentRecordsMap || {}),
    };

    // ============================================================
    // 5. MATCHING & BATCH PREPARATION
    // ============================================================

    const matchedDetails: SyncDriveResult['matchedDetails'] = [];
    const matchedFileIds = new Set<string>();
    const recordsToBatchSave: Array<{
      recordKey: string;
      data: Partial<ExamTrackingRecord>;
      isDriveCollectionReset?: boolean;
    }> = [];

    // ============================================================
    // 6. PROCESS ACTIVE CLASS + SUBJECT
    // ============================================================

    for (const c of masterClasses) {
      const isClassActive =
        activeExamSession.activeClasses?.[c.id] !== false;

      if (!isClassActive) continue;

      for (const s of c.subjects) {
        const isSubjectActive =
          activeExamSession.activeSubjects?.[c.id]?.[s.id] !== false;

        if (!isSubjectActive) continue;

        const recordKey =
          `${trackingSessionId}__${c.id}__${s.id}`;

        const existingRecord = liveRecords[recordKey];

        // ========================================================
        // SEARCH MATCHING DRIVE FILE
        // ========================================================

        const matchedFile = driveFiles.find((file) =>
          matchClassAndSubject(file, c, s)
        );

        // ========================================================
        // CASE A:
        // FILE FOUND IN DRIVE
        // ========================================================

        if (matchedFile) {
          matchedFileIds.add(matchedFile.id);

          const fileLink =
            matchedFile.webViewLink ||
            `https://drive.google.com/file/d/${matchedFile.id}/view`;

          const now = new Date().toISOString();

          recordsToBatchSave.push({
            recordKey,
            data: {
              examSessionId: trackingSessionId,
              classId: c.id,
              subjectId: s.id,
              subjectName: s.name,
              teacherName: s.teacher,
              isCollected: true,
              collectedAt: now,
              driveFileUrl: fileLink,
              source: 'drive',
            },
          });

          const prevRec = liveRecords[recordKey] || storedRecords[recordKey];

          liveRecords[recordKey] = {
            ...(prevRec || {}),
            examSessionId: trackingSessionId,
            classId: c.id,
            subjectId: s.id,
            subjectName: s.name,
            teacherName: s.teacher,
            isCollected: true,
            collectedAt: now,
            driveFileUrl: fileLink,
            source: 'drive',
            isPrinted: prevRec?.isPrinted === true,
            printedAt: prevRec?.isPrinted === true ? prevRec.printedAt : undefined,
          } as ExamTrackingRecord;

          matchedDetails.push({
            classId: c.id,
            subjectId: s.id,
            subjectName: s.name,
            fileName: matchedFile.name,
            driveUrl: fileLink,
          });

          continue;
        }

        // ========================================================
        // CASE B:
        // FILE TIDAK DITEMUKAN DI DRIVE
        // ========================================================

        const wasFromDrive =
          Boolean(existingRecord) &&
          Boolean(existingRecord.isCollected) &&
          (
            existingRecord.source === 'drive' ||
            Boolean(existingRecord.driveFileUrl) ||
            Boolean((existingRecord as any).driveUrl)
          );

        if (!wasFromDrive) {
          continue;
        }

        // Reset tracking because drive file was deleted
        recordsToBatchSave.push({
          recordKey,
          data: {
            examSessionId: trackingSessionId,
            classId: c.id,
            subjectId: s.id,
            subjectName: s.name,
            teacherName: s.teacher,
            isCollected: false,
          },
          isDriveCollectionReset: true,
        });

        const previousRecord = liveRecords[recordKey] || storedRecords[recordKey];

        if (previousRecord) {
          liveRecords[recordKey] = {
            ...previousRecord,
            isCollected: false,
            driveFileUrl: undefined,
            source: undefined,
            collectedAt: undefined,
            isPrinted: previousRecord.isPrinted === true,
            printedAt: previousRecord.isPrinted === true ? previousRecord.printedAt : undefined,
          } as ExamTrackingRecord;
        } else {
          liveRecords[recordKey] = {
            examSessionId: trackingSessionId,
            classId: c.id,
            subjectId: s.id,
            subjectName: s.name,
            teacherName: s.teacher,
            isCollected: false,
            driveFileUrl: undefined,
            source: undefined,
            collectedAt: undefined,
            isPrinted: false,
          } as ExamTrackingRecord;
        }
      }
    }

    // Perform atomic batch save to Firestore and local storage
    if (recordsToBatchSave.length > 0) {
      await batchSaveTrackingRecords(recordsToBatchSave);
    }

    // ============================================================
    // 7. FIND UNMATCHED DRIVE FILES
    // ============================================================

    const unmatchedFiles = driveFiles.filter(
      (file) => !matchedFileIds.has(file.id)
    );

    // ============================================================
    // 8. RESULT
    // ============================================================

    return {
      success: true,
      message:
        driveFiles.length === 0
          ? 'Selesai memindai folder Drive. Tidak ada file di Drive, status kumpul diperbarui.'
          : `Berhasil memindai ${driveFiles.length} file di Drive! ${matchedDetails.length} file berhasil dicocokkan & ditandai kumpul.`,
      totalDriveFilesFound: driveFiles.length,
      matchedCount: matchedDetails.length,
      matchedDetails,
      unmatchedFiles,
      allDriveFiles: driveFiles,
      status: 'success',
      apiMethodUsed:
        data.apiMethodUsed || 'Service Account API',
    };
  } catch (err: any) {
    console.warn(
      'Informasi sinkronisasi Google Drive (jaringan/server):',
      err?.message || err
    );

    const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');

    return {
      success: false,
      message: isAbort
        ? 'Waktu koneksi ke Google Drive habis (Timeout). Silakan periksa koneksi internet Anda dan coba lagi.'
        : 'Gagal menyambung ke server sinkronisasi Google Drive: ' +
          (err?.message || 'Terjadi gangguan jaringan atau server sedang memproses permintaan.'),
      totalDriveFilesFound: 0,
      matchedCount: 0,
      matchedDetails: [],
      unmatchedFiles: [],
      allDriveFiles: [],
      status: 'error',
    };
  }
}