import { nationalCurriculumSD } from '../../data/nationalCurriculumSDData';
import { NATIONAL_CURRICULUM_DATABASE } from '../../data/nationalCurriculumDatabase';

export interface CurriculumTopicRecommendationItem {
  title: string;
  subTopics: string[];
  element: string;
  phase: string;
  curriculumGoal: string;
  sourcePage?: number | null;
}

export interface CurriculumSubjectData {
  subjectName: string;
  phases: Array<{
    phase: string;
    grades: string[];
    elements: Array<{
      elementName: string;
      elementDescription?: string;
      learningOutcomes: Array<{
        code: string;
        title: string;
        text: string;
        sourcePage?: number;
      }>;
    }>;
  }>;
}

export interface CurriculumSourceInfo {
  documentTitle: string;
  documentNumber: string;
  sourceType: string;
  educationLevel: string;
  sourcePages?: string;
}

/**
 * Mendapatkan informasi sumber regulasi kurikulum nasional
 */
export function getCurriculumSourceInfo(): CurriculumSourceInfo {
  const source = (nationalCurriculumSD as any).source || {};
  return {
    documentTitle: source.documentTitle || 'Kurikulum Nasional Capaian Pembelajaran SD',
    documentNumber: source.documentNumber || '046/H/KR/2025',
    sourceType: source.sourceType || 'Keputusan Kepala BSKAP',
    educationLevel: source.educationLevel || 'SD/MI / Program Paket A',
    sourcePages: source.sourcePages || '',
  };
}

/**
 * Normalisasi teks untuk pencarian mata pelajaran & kelas yang fleksibel
 */
function normalizeString(value: string = ''): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'dan')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Mendapatkan daftar semua nama mata pelajaran dari file nationalCurriculumSD.json
 */
export function getCurriculumSubjects(): string[] {
  const subjects = ((nationalCurriculumSD as any).subjects || []) as CurriculumSubjectData[];
  const names = subjects
    .map((s) => s.subjectName)
    .filter((name): name is string => Boolean(name && name.trim()));

  // Tambahkan mapel pendukung khas SD jika belum ada
  const standardSubjects = [
    'Pendidikan Agama Islam dan Budi Pekerti',
    'Pendidikan Pancasila',
    'Bahasa Indonesia',
    'Matematika',
    'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
    'Bahasa Inggris',
    'Seni Rupa',
    'Seni Musik',
    'Seni Tari',
    'Seni Teater',
    'Bahasa Arab',
    'Al-Qur’an & Hadits',
  ];

  const unique = Array.from(new Set([...names, ...standardSubjects]));
  return unique;
}

/**
 * Menentukan target Fase (A, B, atau C) berdasarkan string nama kelas (misal: "1", "1A", "Kelas 3", "4C")
 */
export function getPhaseFromClassName(className: string = ''): 'A' | 'B' | 'C' {
  const match = String(className).match(/\d+/);
  const gradeNumber = match ? Number(match[0]) : 1;

  if (gradeNumber <= 2) {
    return 'A';
  } else if (gradeNumber <= 4) {
    return 'B';
  } else {
    return 'C';
  }
}

/**
 * Mencari data mata pelajaran di JSON dengan pencarian fuzzy
 */
export function findSubjectInCurriculum(subjectName: string): CurriculumSubjectData | undefined {
  const subjects = ((nationalCurriculumSD as any).subjects || []) as CurriculumSubjectData[];
  const normalizedTarget = normalizeString(subjectName);

  // 1. Exact / substring match
  let found = subjects.find((s) => {
    const cur = normalizeString(s.subjectName);
    return cur === normalizedTarget || cur.includes(normalizedTarget) || normalizedTarget.includes(cur);
  });

  if (found) return found;

  // 2. Alias mapping untuk variasi singkatan umum
  const aliases: Record<string, string[]> = {
    'pendidikan agama islam dan budi pekerti': ['pai', 'agama islam', 'pendidikan agama islam'],
    'ilmu pengetahuan alam dan sosial (ipas)': ['ipas', 'ipa', 'ips', 'sains'],
    'pendidikan pancasila': ['pancasila', 'pkn', 'ppkn'],
    'pendidikan jasmani, olahraga, dan kesehatan (pjok)': ['pjok', 'penjas', 'olahraga'],
    'matematika': ['mtk', 'math'],
    'bahasa indonesia': ['indo', 'b.indo', 'b indonesia'],
    'bahasa inggris': ['inggris', 'b.inggris', 'english'],
    'bahasa arab': ['arab', 'b.arab', 'bsa', 'b.s.a'],
  };

  for (const [canonical, aliasList] of Object.entries(aliases)) {
    if (aliasList.some((alias) => normalizedTarget.includes(alias) || alias === normalizedTarget)) {
      found = subjects.find((s) => normalizeString(s.subjectName).includes(canonical) || canonical.includes(normalizeString(s.subjectName)));
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * Mengambil rekomendasi materi & capaian pembelajaran untuk suatu mata pelajaran & kelas.
 * Fungsi ini berjalan murni di sisi Client (Browser/Vercel) secara instan tanpa ketergantungan API external.
 */
export function getCurriculumRecommendations(
  subjectName: string,
  className: string
): CurriculumTopicRecommendationItem[] {
  const targetPhase = getPhaseFromClassName(className);
  const subject = findSubjectInCurriculum(subjectName);
  const recommendations: CurriculumTopicRecommendationItem[] = [];

  // 1. Ekstrak dari nationalCurriculumSD.json
  if (subject && Array.isArray(subject.phases)) {
    const phaseData = subject.phases.find(
      (p) => String(p.phase).replace(/fase/i, '').trim().toUpperCase() === targetPhase
    );

    if (phaseData && Array.isArray(phaseData.elements)) {
      for (const element of phaseData.elements) {
        for (const outcome of element.learningOutcomes || []) {
          if (!outcome.text) continue;

          recommendations.push({
            title: outcome.title || element.elementName || 'Materi Pokok Kurikulum',
            subTopics: [
              element.elementName,
              outcome.text.length > 80 ? outcome.text.slice(0, 80) + '...' : outcome.text,
            ].filter(Boolean),
            element: element.elementName || '',
            phase: `Fase ${targetPhase}`,
            curriculumGoal: outcome.text,
            sourcePage: outcome.sourcePage || null,
          });
        }
      }
    }
  }

  // 2. Jika belum ada atau butuh pelengkap bab praktis dari database terstruktur:
  if (recommendations.length < 3) {
    const fallbackEntry = NATIONAL_CURRICULUM_DATABASE.find((entry) => {
      const matchSubject = normalizeString(entry.subjectName).includes(normalizeString(subjectName)) ||
        normalizeString(subjectName).includes(normalizeString(entry.subjectName));
      const matchPhase = entry.gradeLevels.some((gl) =>
        gl.toLowerCase().includes(`fase ${targetPhase.toLowerCase()}`) ||
        gl.includes(className.replace(/\D/g, ''))
      );
      return matchSubject && matchPhase;
    });

    if (fallbackEntry && Array.isArray(fallbackEntry.chapters)) {
      for (const ch of fallbackEntry.chapters) {
        // Jangan duplikat jika judul sudah ada
        if (!recommendations.some((r) => r.title.toLowerCase() === ch.title.toLowerCase())) {
          recommendations.push({
            title: ch.title,
            subTopics: ch.subTopics ? ch.subTopics.split(',').map((s) => s.trim()) : [],
            element: 'Materi Pokok',
            phase: `Fase ${targetPhase}`,
            curriculumGoal: ch.description || ch.subTopics || 'Materi capaian pembelajaran kurikulum',
            sourcePage: null,
          });
        }
      }
    }
  }

  return recommendations;
}
