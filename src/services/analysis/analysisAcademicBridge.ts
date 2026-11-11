import { supabase, isSupabaseConfigured } from '../supabase';
import {
  AcademicSubject,
  detectCategoryFromName,
  fetchAcademicLevels,
  fetchAcademicSubjects,
  SubjectCategory,
} from '../academicSubjectStorage';
import {
  fetchTeacherAssignments,
  TeacherAssignment,
} from '../teacherAssignmentStorage';
import { getEraporHomeroomForClass, getEraporHomeroomMap } from './eraporHomeroomBridge';
import { MASTER_CLASSES } from '../../data/masterExamData';
import { normalizeTeacherName } from '../teacherStorage';

export interface AnalysisAcademicSubject {
  id: string;
  name: string;
  code: string;
  category: SubjectCategory;
  teacher?: string;
  order: number;
  isFromAcademicSettings?: boolean;
}

const STORAGE_CACHE_KEY = 'sdit_analysis_academic_subjects_cache_v2';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam

interface CachedData {
  timestamp: number;
  classes: Record<string, AnalysisAcademicSubject[]>;
}

// In-memory cache for instant UI rendering without hitting localStorage repeatedly
let memorySubjectsCache: Record<string, AnalysisAcademicSubject[]> | null = null;
let lastCacheTimestamp = 0;

/**
 * Standard Canon SDIT Al Fikri Subjects by Grade Level (Kurikulum Merdeka)
 * Digunakan sebagai basis resmi dan fallback jika offline/database belum terisi.
 */
function getStandardSubjectsForGrade(grade: number, classId: string): AnalysisAcademicSubject[] {
  const homeroom = getEraporHomeroomForClass(classId) || '';

  // Guru bidang studi standar SDIT Al Fikri
  const teacherArab = grade >= 5 ? 'Pak Ikhlas' : 'Bu Hj. Nedya';
  const teacherInggris = 'Ms. Wiwit';
  const teacherPjok = 'Pak Megi';

  const base: Array<{
    code: string;
    name: string;
    category: SubjectCategory;
    teacher?: string;
    order: number;
    minGrade?: number;
    maxGrade?: number;
  }> = [
    {
      code: 'PAI',
      name: 'Pendidikan Agama Islam dan Budi Pekerti',
      category: 'agama',
      teacher: homeroom || 'Guru PAI',
      order: 1,
    },
    {
      code: 'PANCASILA',
      name: 'Pendidikan Pancasila',
      category: 'umum',
      teacher: homeroom,
      order: 2,
    },
    {
      code: 'BINDO',
      name: 'Bahasa Indonesia',
      category: 'umum',
      teacher: homeroom,
      order: 3,
    },
    {
      code: 'MTK',
      name: 'Matematika',
      category: 'umum',
      teacher: homeroom,
      order: 4,
    },
    {
      code: 'IPAS',
      name: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      category: 'umum',
      teacher: homeroom,
      order: 5,
      minGrade: 3, // Muncul di Kelas 3 - 6
    },
    {
      code: 'PJOK',
      name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
      category: 'umum',
      teacher: teacherPjok,
      order: 6,
    },
    {
      code: 'SENIRUPA',
      name: 'Seni Rupa',
      category: 'umum',
      teacher: homeroom,
      order: 7,
    },
    {
      code: 'SENIMUSIK',
      name: 'Seni Musik',
      category: 'umum',
      teacher: homeroom,
      order: 8,
    },
    {
      code: 'BARAB',
      name: 'Bahasa Arab',
      category: 'mulok',
      teacher: teacherArab,
      order: 9,
    },
    {
      code: 'BING',
      name: 'Bahasa Inggris',
      category: 'mulok',
      teacher: teacherInggris,
      order: 10,
    },
    {
      code: 'BSUNDA',
      name: 'Bahasa Sunda',
      category: 'mulok',
      teacher: homeroom,
      order: 11,
      minGrade: 2, // Muncul di Kelas 2 - 6
    },
    {
      code: 'BTQ',
      name: 'BTQ (Baca Tulis Al-Qur\'an)',
      category: 'agama',
      teacher: homeroom,
      order: 12,
    },
    {
      code: 'TAHFIDZ',
      name: 'Tahfidz Al-Qur\'an',
      category: 'agama',
      teacher: homeroom,
      order: 13,
    },
    {
      code: 'AKIDAH',
      name: 'Akidah Akhlak',
      category: 'agama',
      teacher: homeroom,
      order: 14,
    },
    {
      code: 'FIQIH',
      name: 'Fiqih',
      category: 'agama',
      teacher: homeroom,
      order: 15,
    },
    {
      code: 'INF',
      name: 'Informatika',
      category: 'umum',
      teacher: homeroom,
      order: 16,
      minGrade: 5, // Khusus Kelas 5 & 6
    },
  ];

  return base
    .filter((s) => {
      if (s.minGrade && grade < s.minGrade) return false;
      if (s.maxGrade && grade > s.maxGrade) return false;
      return true;
    })
    .map((s, idx) => ({
      id: `canonical_${grade}_${s.code.toLowerCase()}`,
      name: s.name,
      code: s.code,
      category: s.category,
      teacher: s.teacher || '',
      order: s.order || idx + 1,
      isFromAcademicSettings: false,
    }));
}

/**
 * Ekstrak angka tingkat kelas dari classId (misal "1A" -> 1, "4B" -> 4)
 */
export function extractGradeFromClassId(classId: string): number {
  if (!classId) return 1;
  const match = classId.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 6) return num;
  }
  return 1;
}

/**
 * Membaca cache dari localStorage dengan validasi TTL
 */
function readLocalCache(): CachedData | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedData;
    if (parsed && typeof parsed.timestamp === 'number' && parsed.classes) {
      return parsed;
    }
  } catch (err) {
    console.warn('[analysisAcademicBridge] Gagal membaca cache lokal:', err);
  }
  return null;
}

/**
 * Menyimpan data ke memory dan localStorage
 */
function writeLocalCache(classesMap: Record<string, AnalysisAcademicSubject[]>): void {
  const payload: CachedData = {
    timestamp: Date.now(),
    classes: classesMap,
  };
  memorySubjectsCache = classesMap;
  lastCacheTimestamp = payload.timestamp;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('[analysisAcademicBridge] Gagal menulis cache lokal:', err);
  }
}

/**
 * Invalidate cache secara manual (misal saat admin mengedit mapel di Pengaturan Akademik)
 */
export function invalidateAcademicSubjectsCache(): void {
  memorySubjectsCache = null;
  lastCacheTimestamp = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_CACHE_KEY);
    }
  } catch (err) {
    // Ignore
  }
}

/**
 * Mengambil daftar mata pelajaran untuk kelas tertentu secara sinkron (0ms latency, Instant UI).
 * Menggunakan memori -> localStorage -> standard canonical fallback.
 */
export function getAcademicSubjectsForClassSync(classId: string): AnalysisAcademicSubject[] {
  if (!classId) return [];
  const key = classId.toLowerCase().trim();

  // 1. Cek memory cache
  if (memorySubjectsCache && memorySubjectsCache[key] && memorySubjectsCache[key].length > 0) {
    return memorySubjectsCache[key];
  }

  // 2. Cek localStorage cache
  const localCache = readLocalCache();
  if (localCache && localCache.classes && localCache.classes[key] && localCache.classes[key].length > 0) {
    memorySubjectsCache = localCache.classes;
    lastCacheTimestamp = localCache.timestamp;
    return localCache.classes[key];
  }

  // 3. Fallback instan ke kurikulum standar SDIT Al Fikri
  const grade = extractGradeFromClassId(classId);
  const fallbackList = getStandardSubjectsForGrade(grade, classId);

  // Inisialisasi memory map sementara
  if (!memorySubjectsCache) {
    memorySubjectsCache = {};
  }
  memorySubjectsCache[key] = fallbackList;

  return fallbackList;
}

/**
 * Melakukan sinkronisasi data mata pelajaran dan penugasan guru langsung dari
 * Pengaturan Akademik Supabase ke Generator Analisis.
 * Menggunakan Smart Caching (TTL 12 Jam) untuk menghemat Egress hingga mendekati 0 byte.
 */
export async function syncAcademicSubjectsFromCloud(
  force = false
): Promise<Record<string, AnalysisAcademicSubject[]>> {
  // 1. Cek validitas cache jika tidak dipaksa refresh
  if (!force) {
    if (memorySubjectsCache && Date.now() - lastCacheTimestamp < CACHE_TTL_MS) {
      return memorySubjectsCache;
    }
    const local = readLocalCache();
    if (local && Date.now() - local.timestamp < CACHE_TTL_MS) {
      memorySubjectsCache = local.classes;
      lastCacheTimestamp = local.timestamp;
      return local.classes;
    }
  }

  // 2. Jika Supabase tidak dikonfigurasi, gunakan standar lokal
  if (!isSupabaseConfigured()) {
    const defaultMap: Record<string, AnalysisAcademicSubject[]> = {};
    MASTER_CLASSES.forEach((cls) => {
      const grade = cls.level || extractGradeFromClassId(cls.id);
      defaultMap[cls.id.toLowerCase()] = getStandardSubjectsForGrade(grade, cls.id);
    });
    writeLocalCache(defaultMap);
    return defaultMap;
  }

  try {
    // 3. Ambil level akademik & penugasan guru secara efisien (hanya field yang relevan)
    const [levels, assignmentsRes, teachersRes] = await Promise.all([
      fetchAcademicLevels().catch(() => []),
      fetchTeacherAssignments({ activeOnly: true }).catch(() => []),
      Promise.resolve(
        supabase
          .from('teachers')
          .select('id, name')
          .eq('status', 'active')
      ).catch(() => ({ data: [] })),
    ]);

    const teachersList = (teachersRes?.data || []) as Array<{ id: string; name: string }>;
    const teacherNameMap: Record<string, string> = {};
    teachersList.forEach((t) => {
      if (t.id && t.name) {
        teacherNameMap[t.id] = t.name.trim();
      }
    });

    // Peta wali kelas dari modul e-Rapor
    const homeroomMap = getEraporHomeroomMap();

    const resultMap: Record<string, AnalysisAcademicSubject[]> = {};

    // 4. Proses setiap kelas master
    for (const masterCls of MASTER_CLASSES) {
      const classKey = masterCls.id.toLowerCase().trim();
      const grade = masterCls.level || extractGradeFromClassId(masterCls.id);
      const homeroomName = getEraporHomeroomForClass(masterCls.id, homeroomMap) || masterCls.waliKelas || '';

      // Cari academic level yang cocok dengan grade
      const matchedLevel = levels.find((lvl) => lvl.grade === grade);

      let subjectRows: AcademicSubject[] = [];
      if (matchedLevel && matchedLevel.id) {
        try {
          subjectRows = await fetchAcademicSubjects(matchedLevel.id);
        } catch (e) {
          console.warn(`[analysisAcademicBridge] Gagal fetch mapel level ${matchedLevel.id}:`, e);
        }
      }

      if (subjectRows && subjectRows.length > 0) {
        // Map data dari Pengaturan Akademik E-Rapor
        const mappedList: AnalysisAcademicSubject[] = subjectRows
          .filter((s) => s.active)
          .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name))
          .map((s, idx) => {
            // Cari penugasan guru spesifik untuk kelas & mapel ini
            const assignment = assignmentsRes.find(
              (asg) =>
                asg.active &&
                (asg.class_id === masterCls.id || asg.class_id.toLowerCase() === classKey) &&
                asg.subject_id === s.id
            );

            let assignedTeacher = '';
            if (assignment && assignment.teacher_id && teacherNameMap[assignment.teacher_id]) {
              assignedTeacher = teacherNameMap[assignment.teacher_id];
            } else if (masterCls.subjects) {
              // Cek penugasan guru di master exam data jika ada
              const existingSubj = masterCls.subjects.find(
                (ms) => ms.name.toLowerCase() === s.name.toLowerCase()
              );
              if (existingSubj && existingSubj.teacher) {
                assignedTeacher = existingSubj.teacher;
              }
            }

            // Jika masih kosong dan merupakan mapel umum tematik, gunakan wali kelas
            if (!assignedTeacher && s.category === 'umum') {
              assignedTeacher = homeroomName;
            }

            return {
              id: s.id,
              name: s.name,
              code: s.code || s.name.slice(0, 4).toUpperCase(),
              category: s.category || detectCategoryFromName(s.name),
              teacher: assignedTeacher,
              order: s.display_order ?? idx + 1,
              isFromAcademicSettings: true,
            };
          });

        resultMap[classKey] = mappedList;
      } else {
        // Fallback ke kurikulum standar jika level belum diatur
        resultMap[classKey] = getStandardSubjectsForGrade(grade, masterCls.id);
      }
    }

    writeLocalCache(resultMap);
    return resultMap;
  } catch (err) {
    console.error('[analysisAcademicBridge] Error syncing from cloud:', err);
    // Kembalikan cache yang ada atau fallback
    const fallbackMap: Record<string, AnalysisAcademicSubject[]> = {};
    MASTER_CLASSES.forEach((cls) => {
      const grade = cls.level || extractGradeFromClassId(cls.id);
      fallbackMap[cls.id.toLowerCase()] = getStandardSubjectsForGrade(grade, cls.id);
    });
    return fallbackMap;
  }
}

/**
 * Mengambil daftar mata pelajaran untuk kelas tertentu dengan background cloud sync
 */
export async function getAcademicSubjectsForClass(
  classId: string,
  options?: { forceRefresh?: boolean }
): Promise<AnalysisAcademicSubject[]> {
  if (!classId) return [];
  const key = classId.toLowerCase().trim();

  // 1. Cek memory cache terlebih dahulu
  if (!options?.forceRefresh && memorySubjectsCache && memorySubjectsCache[key]) {
    return memorySubjectsCache[key];
  }

  // 2. Lakukan sync
  const all = await syncAcademicSubjectsFromCloud(options?.forceRefresh || false);
  if (all && all[key] && all[key].length > 0) {
    return all[key];
  }

  // 3. Fallback jika kelas belum ada di map
  const grade = extractGradeFromClassId(classId);
  return getStandardSubjectsForGrade(grade, classId);
}

/**
 * Mengambil seluruh daftar nama mata pelajaran kanonikal unik (untuk preset Guru Bidang)
 */
export function getAllCanonicalSubjectNames(): string[] {
  const local = readLocalCache();
  const namesSet = new Set<string>();

  // Standar Kurikulum Merdeka SDIT Al Fikri
  const standardPresets = [
    'Pendidikan Agama Islam dan Budi Pekerti',
    'Pendidikan Pancasila',
    'Bahasa Indonesia',
    'Matematika',
    'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    'Seni Rupa',
    'Seni Musik',
    'Seni Tari / Teater',
    'Bahasa Arab',
    'Bahasa Inggris',
    'Bahasa Sunda',
    'BTQ (Baca Tulis Al-Qur\'an)',
    'Tahfidz Al-Qur\'an',
    'Akidah Akhlak',
    'Fiqih',
    'Informatika',
    'PLKJ',
  ];

  standardPresets.forEach((n) => namesSet.add(n));

  if (local && local.classes) {
    Object.values(local.classes).forEach((subjs) => {
      subjs.forEach((s) => {
        if (s.name && s.name.trim()) {
          namesSet.add(s.name.trim());
        }
      });
    });
  }

  return Array.from(namesSet);
}
