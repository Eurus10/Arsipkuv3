import {
  AnalysisSession,
  AnalysisSubject,
  StudentSubjectResult,
} from '../../types/analysisTypes';
import { Student } from '../studentStorage';
import { evaluateStudentResult } from './analysisCalculationService';

/**
 * Normalisasi string nama mata pelajaran:
 * - lowercase & trim
 * - ubah '&' menjadi 'dan'
 * - buang tanda baca dan spasi berlebih
 */
export function normalizeSubjectString(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/['’"`.]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dictionary Alias Kanonikal Mata Pelajaran SDIT AL FIKRI
 * Menghubungkan semua variasi penamaan / singkatan lama & baru ke satu canonical key.
 */
const SUBJECT_CANONICAL_GROUPS: Record<string, string[]> = {
  pai: [
    'pendidikan agama islam dan budi pekerti',
    'pendidikan agama islam dan bp',
    'pendidikan agama islam bp',
    'pendidikan agama islam',
    'pai dan bp',
    'pai bp',
    'pai',
    'agama islam',
    'pend agama islam',
    'pendidikan agama',
    'pend agama',
  ],
  pancasila: [
    'pendidikan pancasila',
    'pancasila',
    'ppkn',
    'pkn',
    'pendidikan pancasila dan kewarganegaraan',
    'pend pancasila',
  ],
  bahasa_indonesia: [
    'bahasa indonesia',
    'b indonesia',
    'bindo',
    'b indo',
    'indo',
    'indonesia',
  ],
  matematika: [
    'matematika',
    'mtk',
    'math',
    'matematik',
  ],
  ipas: [
    'ilmu pengetahuan alam dan sosial',
    'ilmu pengetahuan alam dan sosial ipas',
    'ipas',
    'ipa',
    'ips',
    'sains',
  ],
  pjok: [
    'pendidikan jasmani olahraga dan kesehatan',
    'pendidikan jasmani olahraga dan kesehatan pjok',
    'pendidikan jasmani dan kesehatan',
    'pjok',
    'penjasorkes',
    'penjas',
    'olahraga',
    'penjaskes',
  ],
  seni_rupa: [
    'seni rupa',
    'seni rupa dan prakarya',
    'seni budaya',
    'sbdp',
    'seni budaya dan prakarya',
    'prakarya',
    'senirupa',
  ],
  seni_musik: [
    'seni musik',
    'musik',
    'senimusik',
  ],
  seni_tari: [
    'seni tari',
    'seni tari teater',
    'seni teater',
    'seni tari dan teater',
  ],
  bahasa_inggris: [
    'bahasa inggris',
    'b inggris',
    'english',
    'b ing',
    'binggris',
    'inggris',
  ],
  bahasa_arab: [
    'bahasa arab',
    'b arab',
    'bsa',
    'b s a',
    'arab',
  ],
  bahasa_sunda: [
    'bahasa sunda',
    'b sunda',
    'sunda',
  ],
  btq: [
    'btq baca tulis al quran',
    'btq baca tulis alquran',
    'baca tulis al quran',
    'baca tulis alquran',
    'baca tulis quran',
    'btq al quran',
    'btq alquran',
    'btq',
  ],
  tahfidz: [
    'tahfidz al quran',
    'tahfidz alquran',
    'tahfidzul quran',
    'tahfiz al quran',
    'tahfiz alquran',
    'tahfidz',
    'tahfiz',
  ],
  akidah_akhlak: [
    'akidah akhlak',
    'aqidah akhlak',
    'akidah akhlaq',
    'aqidah akhlaq',
    'akidah',
    'aqidah',
  ],
  fiqih: [
    'fiqih',
    'fikih',
    'feqih',
  ],
  informatika: [
    'informatika',
    'tik',
    'komputer',
    'teknologi informasi dan komunikasi',
  ],
  plkj: [
    'plkj',
    'pendidikan lingkungan dan budaya jakarta',
    'lingkungan dan budaya jakarta',
  ],
};

/**
 * Dapatkan canonical key untuk nama mapel tertentu
 */
export function getCanonicalSubjectKey(subjectName: string): string {
  const norm = normalizeSubjectString(subjectName);
  if (!norm) return '';

  for (const [key, aliases] of Object.entries(SUBJECT_CANONICAL_GROUPS)) {
    if (norm === key) return key;
    for (const alias of aliases) {
      const normAlias = normalizeSubjectString(alias);
      if (norm === normAlias) return key;
    }
  }

  // Jika tidak ditemukan di dictionary, cek containment untuk variasi panjang
  for (const [key, aliases] of Object.entries(SUBJECT_CANONICAL_GROUPS)) {
    for (const alias of aliases) {
      const normAlias = normalizeSubjectString(alias);
      if (normAlias.length >= 4 && (norm.startsWith(normAlias) || normAlias.startsWith(norm))) {
        return key;
      }
    }
  }

  // Fallback: gunakan normalized string langsung
  return norm.replace(/\s+/g, '_');
}

/**
 * Cek apakah dua nama mata pelajaran mereferensikan mata pelajaran yang sama (Smart Aliasing)
 */
export function isSameCanonicalSubject(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;

  const trimA = nameA.trim().toLowerCase();
  const trimB = nameB.trim().toLowerCase();
  if (trimA === trimB) return true;

  const normA = normalizeSubjectString(nameA);
  const normB = normalizeSubjectString(nameB);
  if (normA === normB) return true;

  const keyA = getCanonicalSubjectKey(nameA);
  const keyB = getCanonicalSubjectKey(nameB);
  if (keyA && keyB && keyA === keyB) return true;

  return false;
}

/**
 * Ambil hasil penilaian siswa secara aman dari dictionary studentResults.
 * Mendukung dual-key matching:
 * 1. Cek langsung via student.id
 * 2. Fallback cek via nama siswa ternormalisasi (mencegah nilai hilang jika ID siswa berubah saat sinkronisasi cloud)
 */
export function getStudentResultSafely(
  studentResults: Record<string, StudentSubjectResult> | undefined | null,
  student: { id: string; name: string }
): StudentSubjectResult | undefined {
  if (!studentResults) return undefined;

  // 1. Cek ID langsung
  if (studentResults[student.id]) {
    return studentResults[student.id];
  }

  // 2. Fallback cek berdasarkan nama siswa
  const targetNormName = (student.name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (!targetNormName) return undefined;

  for (const res of Object.values(studentResults)) {
    if (!res) continue;
    if (res.studentId === student.id) return res;
    if (res.studentName) {
      const resNormName = res.studentName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (resNormName === targetNormName) {
        return res;
      }
    }
  }

  return undefined;
}

/**
 * Temukan subject terbaik yang cocok di dalam suatu sesi.
 * Mengutamakan kecocokan persis (priority match) dan jika ada beberapa alias di sesi yang sama,
 * secara cerdas memilih alias yang memiliki nilai siswa terisi (non-destruktif).
 */
export function findBestSubjectInSession(
  session: AnalysisSession | null | undefined,
  targetSubjectName: string,
  targetSubjectId?: string
): AnalysisSubject | null {
  if (!session || !session.subjects || session.subjects.length === 0) {
    return null;
  }

  // 1. Prioritas Utama: Cocok persis Subject ID
  if (targetSubjectId) {
    const exactIdMatch = session.subjects.find((s) => s.subjectId === targetSubjectId);
    if (exactIdMatch) {
      // Jika exactIdMatch memiliki hasil nilai terisi, langsung pakai
      const hasScores = Object.keys(exactIdMatch.studentResults || {}).length > 0;
      if (hasScores) return exactIdMatch;

      // Jika exactIdMatch masih 0 nilai, cek apakah ada alias sibling di sesi ini yang SUDAH memiliki nilai!
      const siblingWithScores = session.subjects.find(
        (s) =>
          s !== exactIdMatch &&
          isSameCanonicalSubject(s.subjectName, targetSubjectName) &&
          Object.keys(s.studentResults || {}).length > 0
      );
      if (siblingWithScores) {
        // Gabungkan nilai dari sibling ke exactIdMatch agar nilai lama langsung muncul
        exactIdMatch.studentResults = { ...siblingWithScores.studentResults };
        exactIdMatch.completedStudentsCount = Object.keys(exactIdMatch.studentResults).length;
      }
      return exactIdMatch;
    }
  }

  // 2. Prioritas Kedua: Cocok persis Nama Mata Pelajaran (case-insensitive & trimmed)
  const exactNameMatch = session.subjects.find(
    (s) => s.subjectName.toLowerCase().trim() === targetSubjectName.toLowerCase().trim()
  );
  if (exactNameMatch) {
    const hasScores = Object.keys(exactNameMatch.studentResults || {}).length > 0;
    if (hasScores) return exactNameMatch;

    // Cek alias sibling yang memiliki nilai terisi
    const siblingWithScores = session.subjects.find(
      (s) =>
        s !== exactNameMatch &&
        isSameCanonicalSubject(s.subjectName, targetSubjectName) &&
        Object.keys(s.studentResults || {}).length > 0
    );
    if (siblingWithScores) {
      exactNameMatch.studentResults = { ...siblingWithScores.studentResults };
      exactNameMatch.completedStudentsCount = Object.keys(exactNameMatch.studentResults).length;
    }
    return exactNameMatch;
  }

  // 3. Prioritas Ketiga: Smart Aliasing (Kecocokan Kanonikal)
  const aliasMatches = session.subjects.filter((s) =>
    isSameCanonicalSubject(s.subjectName, targetSubjectName)
  );

  if (aliasMatches.length > 0) {
    // Utamakan yang memiliki nilai terbanyak
    const sorted = [...aliasMatches].sort((a, b) => {
      const scoreCountA = Object.keys(a.studentResults || {}).length;
      const scoreCountB = Object.keys(b.studentResults || {}).length;
      return scoreCountB - scoreCountA;
    });
    return sorted[0];
  }

  // 4. Fallback jika tidak ada yang cocok sama sekali
  return null;
}

/**
 * Konsolidasi & Pulihkan nilai antara subject baru dan subject alias lama dalam satu sesi.
 * Menjamin tidak ada data nilai yang hilang saat guru mengganti penamaan atau mengkonfigurasi ulang.
 */
export function preserveAndMergeSubjectScores(
  targetSubject: AnalysisSubject,
  sourceSubject: AnalysisSubject,
  kktp: number
): void {
  if (!sourceSubject || !sourceSubject.studentResults) return;

  const sourceCount = Object.keys(sourceSubject.studentResults).length;
  if (sourceCount === 0) return;

  const targetCount = Object.keys(targetSubject.studentResults || {}).length;

  // Jika targetSubject belum ada nilai, atau sourceSubject punya nilai lebih lengkap:
  // Salin dan evaluasi ulang dengan konfigurasi targetSubject
  if (targetCount === 0 || sourceCount > targetCount) {
    const mergedResults: Record<string, StudentSubjectResult> = {
      ...(targetSubject.studentResults || {}),
    };

    Object.values(sourceSubject.studentResults).forEach((res) => {
      if (!res) return;
      // Jika di target belum ada atau jawaban ada di source
      if (!mergedResults[res.studentId] && res.answers) {
        mergedResults[res.studentId] = evaluateStudentResult(
          res.studentId,
          res.studentName,
          res.answers,
          targetSubject.config,
          kktp
        );
      }
    });

    targetSubject.studentResults = mergedResults;
    targetSubject.completedStudentsCount = Object.keys(mergedResults).length;
  }
}
