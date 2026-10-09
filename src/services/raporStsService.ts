import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import XLSX from 'xlsx-js-style';
import { db } from './firebase';
import { recordQuotaUsage } from './quotaTracker';
import {
  RaporStsClassData,
  RaporStsConfig,
  RaporSubject,
  StudentScoreDetail,
  StudentAdditionalInfo,
  DEFAULT_RAPOR_CONFIG,
  DEFAULT_RAPOR_SUBJECTS,
  DEFAULT_CLASS_TEACHERS,
  getScorePredicate,
  getMasteryStatusFromPredicate,
} from '../types/raporSts';
import { Student } from './studentStorage';
import { getStoredMasterClasses } from './storage';
import { detectCategoryFromName } from './academicSubjectStorage';
import { matchRaporSubject } from './analysisToRaporSyncService';

export const LOCAL_STORAGE_PREFIX = 'sdit_rapor_sts_class_';
export const GLOBAL_CONFIG_LOCAL_KEY = 'sdit_rapor_sts_global_config';
export const CLASS_PINS_LOCAL_KEY = 'sdit_rapor_sts_class_pins_v1';
export const RAPOR_ACTIVE_SESSION_KEY = 'sdit_rapor_active_class_session_v1';

export const DEFAULT_CLASS_PINS: Record<string, string> = {
  '1A': '1a',
  '1B': '1b',
  '2A': '2a',
  '2B': '2b',
  '2C': '2c',
  '3A': '3a',
  '3B': '3b',
  '3C': '3c',
  '4A': '4a',
  '4B': '4b',
  '5A': '5a',
  '5B': '5b',
  '6A': '6a',
  '6B': '6b',
};

/**
 * Fetch All Class PINs from LocalStorage and Firestore
 */
export const fetchClassPins = async (): Promise<Record<string, string>> => {
  let localPins: Record<string, string> = { ...DEFAULT_CLASS_PINS };
  try {
    const raw = localStorage.getItem(CLASS_PINS_LOCAL_KEY);
    if (raw) {
      localPins = { ...localPins, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Error reading local class pins:', err);
  }

  try {
    const docRef = doc(db, 'rapor_sts_settings', 'class_pins');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      recordQuotaUsage('reads', 1);
      const cloudData = snap.data();
      if (cloudData && cloudData.pins) {
        const merged = { ...localPins, ...cloudData.pins };
        localStorage.setItem(CLASS_PINS_LOCAL_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not fetch class pins from cloud, using cached:', err);
  }

  return localPins;
};

/**
 * Save Class PINs to LocalStorage and Firestore
 */
export const saveClassPins = async (pins: Record<string, string>): Promise<void> => {
  try {
    localStorage.setItem(CLASS_PINS_LOCAL_KEY, JSON.stringify(pins));
  } catch (err) {
    console.error('Error saving local class pins:', err);
  }

  try {
    const docRef = doc(db, 'rapor_sts_settings', 'class_pins');
    await setDoc(
      docRef,
      {
        pins,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    recordQuotaUsage('writes', 1);
  } catch (err) {
    console.warn('Could not sync class pins to cloud:', err);
  }
};

/**
 * Verify Class Access PIN
 */
export const verifyClassPin = async (
  classLevel: string,
  inputPin: string,
  isAdmin?: boolean
): Promise<{ success: boolean; message?: string }> => {
  if (isAdmin) {
    return { success: true };
  }

  const trimmedPin = (inputPin || '').trim();
  if (!trimmedPin) {
    return { success: false, message: 'Kata sandi / PIN kelas wajib diisi.' };
  }

  // Master Admin Pass Check
  const storedAdminPass = localStorage.getItem('sdit_admin_custom_password') || 'adminzaki';
  if (trimmedPin === storedAdminPass || trimmedPin.toLowerCase() === 'adminzaki') {
    return { success: true };
  }

  const pins = await fetchClassPins();
  const expectedPin = pins[classLevel] || DEFAULT_CLASS_PINS[classLevel] || classLevel.toLowerCase();

  // Allow either exact configured PIN, lowercase class name (e.g. "4a"), or standard fallback "1234"
  if (
    trimmedPin === expectedPin ||
    trimmedPin.toLowerCase() === expectedPin.toLowerCase() ||
    trimmedPin.toLowerCase() === classLevel.toLowerCase() ||
    trimmedPin === '1234'
  ) {
    return { success: true };
  }

  return {
    success: false,
    message: `PIN untuk Kelas ${classLevel} tidak sesuai. Silakan hubungi Admin atau coba kata sandi default (misal: "${classLevel.toLowerCase()}" atau "1234").`,
  };
};

export interface ActiveRaporSession {
  classLevel: string;
  semester: '1' | '2';
  schoolYear: string;
  authenticatedAt: number;
}

export const getActiveRaporSession = (): ActiveRaporSession | null => {
  try {
    const raw = sessionStorage.getItem(RAPOR_ACTIVE_SESSION_KEY) || localStorage.getItem(RAPOR_ACTIVE_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading active rapor session:', err);
  }
  return null;
};

export const setActiveRaporSession = (
  classLevel: string,
  semester: '1' | '2',
  schoolYear: string
): void => {
  try {
    const session: ActiveRaporSession = {
      classLevel,
      semester,
      schoolYear,
      authenticatedAt: Date.now(),
    };
    sessionStorage.setItem(RAPOR_ACTIVE_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(RAPOR_ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Error saving active rapor session:', err);
  }
};

export const clearActiveRaporSession = (): void => {
  try {
    sessionStorage.removeItem(RAPOR_ACTIVE_SESSION_KEY);
    localStorage.removeItem(RAPOR_ACTIVE_SESSION_KEY);
  } catch (err) {
    console.error('Error clearing active rapor session:', err);
  }
};

export const RAPOR_SCHOOL_YEARS_LOCAL_KEY = 'sdit_rapor_sts_school_years';
export const DEFAULT_RAPOR_SCHOOL_YEARS = [
  '2026/2027',
  '2027/2028',
  '2028/2029',
  '2025/2026',
];

export const getStoredRaporSchoolYears = (): string[] => {
  try {
    const raw = localStorage.getItem(RAPOR_SCHOOL_YEARS_LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading stored rapor school years:', err);
  }
  return DEFAULT_RAPOR_SCHOOL_YEARS;
};

export const saveStoredRaporSchoolYears = (years: string[]): void => {
  try {
    localStorage.setItem(RAPOR_SCHOOL_YEARS_LOCAL_KEY, JSON.stringify(years));
  } catch (err) {
    console.error('Error saving stored rapor school years:', err);
  }
};

/**
 * Fetch Global School Rapor Config from Firestore / LocalStorage
 * Stores school name, npsn, address, headmaster, titimangsa, passing grade, and class teachers
 */
export const fetchGlobalRaporConfig = async (): Promise<Partial<RaporStsConfig> | null> => {
  // 1. Check Cloud
  try {
    const docRef = doc(db, 'rapor_sts_settings', 'global_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data) {
        localStorage.setItem(GLOBAL_CONFIG_LOCAL_KEY, JSON.stringify(data));
        return data as Partial<RaporStsConfig>;
      }
    }
  } catch (err) {
    console.warn('Could not fetch global config from cloud, checking local:', err);
  }

  // 2. Check local
  try {
    const raw = localStorage.getItem(GLOBAL_CONFIG_LOCAL_KEY);
    if (raw) {
      return JSON.parse(raw) as Partial<RaporStsConfig>;
    }
  } catch (err) {
    console.error('Error reading local global config:', err);
  }

  return null;
};

/**
 * Save Global School Rapor Config to LocalStorage and Firestore
 */
export const saveGlobalRaporConfig = async (
  config: Partial<RaporStsConfig>
): Promise<void> => {
  // 1. Save local
  try {
    const existingRaw = localStorage.getItem(GLOBAL_CONFIG_LOCAL_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const merged = { ...existing, ...config };
    localStorage.setItem(GLOBAL_CONFIG_LOCAL_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error('Error saving local global config:', err);
  }

  // 2. Save cloud
  try {
    const docRef = doc(db, 'rapor_sts_settings', 'global_config');
    await setDoc(
      docRef,
      {
        ...config,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync global config to cloud:', err);
  }
};

/**
 * Extract numeric grade level (1-6) from class string (e.g., "1A" -> "1", "Kelas 4B" -> "4")
 */
export const getGradeLevel = (classLevel: string): string => {
  const match = (classLevel || '').match(/\d+/);
  return match ? match[0] : '1';
};

/**
 * Generate unique key for Jenjang TP (shared across all classes in the same grade)
 */
export const getJenjangKey = (gradeLevel: string, semester: string, schoolYear: string): string => {
  const cleanYear = (schoolYear || '2024/2025').replace(/[^a-zA-Z0-9]/g, '-');
  return `jenjang_${gradeLevel}_sem${semester}_${cleanYear}`.toLowerCase();
};

/**
 * Save Jenjang TP to LocalStorage and Firestore
 * Shared across classes in same grade level (e.g., 1A & 1B)
 */
export const saveJenjangTp = async (
  gradeLevel: string,
  semester: string,
  schoolYear: string,
  subjects: RaporSubject[]
): Promise<void> => {
  const key = getJenjangKey(gradeLevel, semester, schoolYear);
  // 1. Save local
  try {
    localStorage.setItem(`sdit_rapor_sts_jenjang_tp_${key}`, JSON.stringify(subjects));
  } catch (err) {
    console.error('Error saving local jenjang TP:', err);
  }

  // 2. Save cloud
  try {
    const docRef = doc(db, 'rapor_sts_jenjang_tp', key);
    await setDoc(docRef, {
      gradeLevel,
      semester,
      schoolYear,
      subjects,
      updatedAt: serverTimestamp(),
    });
    recordQuotaUsage('writes', 1);
  } catch (err) {
    console.warn('Could not sync jenjang TP to cloud:', err);
  }
};

/**
 * Save Subjects to Multiple Grade Levels simultaneously (e.g. 1-6, 3-6, or custom selection).
 * Updates each grade level's Jenjang TP in LocalStorage and Firestore.
 */
export const saveSubjectsToMultipleGrades = async (
  targetGrades: string[],
  semester: string,
  schoolYear: string,
  subjects: RaporSubject[]
): Promise<{ success: boolean; updatedGrades: string[] }> => {
  const updatedGrades: string[] = [];

  for (const grade of targetGrades) {
    try {
      await saveJenjangTp(grade, semester, schoolYear, subjects);
      updatedGrades.push(grade);
    } catch (err) {
      console.error(`Error saving subjects for grade ${grade}:`, err);
    }
  }

  // Also store as global subjects template for future sessions
  try {
    const docRef = doc(db, 'rapor_sts_settings', 'global_subjects');
    await setDoc(
      docRef,
      {
        subjects,
        lastTargetGrades: targetGrades,
        semester,
        schoolYear,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not save global subjects template to cloud:', err);
  }

  return {
    success: updatedGrades.length > 0,
    updatedGrades,
  };
};

/**
 * Fetch Jenjang TP from Firestore / LocalStorage
 */
export const fetchJenjangTp = async (
  gradeLevel: string,
  semester: string,
  schoolYear: string
): Promise<RaporSubject[] | null> => {
  const key = getJenjangKey(gradeLevel, semester, schoolYear);
  // 1. Check Cloud
  try {
    const docRef = doc(db, 'rapor_sts_jenjang_tp', key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      recordQuotaUsage('reads', 1);
      const data = snap.data();
      if (data?.subjects && Array.isArray(data.subjects)) {
        localStorage.setItem(`sdit_rapor_sts_jenjang_tp_${key}`, JSON.stringify(data.subjects));
        return data.subjects as RaporSubject[];
      }
    }
  } catch (err) {
    console.warn('Could not fetch jenjang TP from cloud, checking local:', err);
  }

  // 2. Check local
  try {
    const raw = localStorage.getItem(`sdit_rapor_sts_jenjang_tp_${key}`);
    if (raw) {
      return JSON.parse(raw) as RaporSubject[];
    }
  } catch (err) {
    console.error('Error reading local jenjang TP:', err);
  }

  return null;
};

/**
 * Generate a unique class key for storage and Firestore indexing
 */
export const getClassKey = (classLevel: string, semester: string, schoolYear: string): string => {
  const cleanClass = (classLevel || '1A').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanYear = (schoolYear || '2024/2025').replace(/[^a-zA-Z0-9]/g, '-');
  return `${cleanClass}_sem${semester}_${cleanYear}`.toLowerCase();
};

/**
 * Get class data from LocalStorage
 */
export const getLocalClassData = (classKey: string): RaporStsClassData | null => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX + classKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local class data:', err);
    return null;
  }
};

/**
 * Save class data to LocalStorage
 */
export const saveLocalClassData = (data: RaporStsClassData): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + data.id, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving local class data:', err);
  }
};

/**
 * Calculate Final Score (NA STS)
 * In simplified STS workflow, Nilai Akhir is directly the Nilai STS (0-100)
 */
export const calculateFinalScore = (
  tpScoresOrSts: any,
  _activeTpIds?: string[],
  stsScore?: number | null,
  _tpWeight = 60,
  _stsWeight = 40
): number | null => {
  // If stsScore passed as 3rd parameter
  if (typeof stsScore === 'number' && !isNaN(stsScore)) {
    return Math.min(100, Math.max(0, Math.round(stsScore)));
  }
  // If single score number passed as 1st parameter
  if (typeof tpScoresOrSts === 'number' && !isNaN(tpScoresOrSts)) {
    return Math.min(100, Math.max(0, Math.round(tpScoresOrSts)));
  }
  return null;
};

/**
 * Auto-generate Kurikulum Merdeka Capaian Kompetensi Description
 * Follows Kemdikbud & SDIT Al Fikri e-Rapor format based on TP checklist (Tercapai / Belum)
 */
export const generateCompetencyDescription = (
  studentName: string,
  tpAchievedOrScores: Record<string, boolean | number | string | null> | undefined,
  activeTps: { id: string; desc: string; code: string }[],
  stsScore?: number | null,
  passingGrade = 75
): string => {
  if (!activeTps || activeTps.length === 0) {
    return 'Belum ada tujuan pembelajaran yang diujikan.';
  }

  // Helper clean TP text: lowercase first letter if appropriate
  const formatTpText = (text: string) => {
    const trimmed = text.trim().replace(/\.+$/, '');
    if (!trimmed) return '';
    return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  };

  const achievedTps: { id: string; desc: string; code: string }[] = [];
  const unachievedTps: { id: string; desc: string; code: string }[] = [];

  activeTps.forEach((tp) => {
    const val = tpAchievedOrScores ? tpAchievedOrScores[tp.id] : undefined;
    const isAchieved =
      val === true ||
      val === 'L' ||
      val === 'l' ||
      (typeof val === 'number' && !isNaN(val) && (val >= passingGrade || val === 1 || val === 100));

    if (isAchieved) {
      achievedTps.push(tp);
    } else {
      unachievedTps.push(tp);
    }
  });

  // If no STS score and nothing checked
  const hasAnyMark =
    tpAchievedOrScores &&
    Object.values(tpAchievedOrScores).some(
      (v) => v === true || v === 'L' || v === 'l' || (typeof v === 'number' && v > 0)
    );
  if (!hasAnyMark && (stsScore === null || stsScore === undefined)) {
    return 'Belum ada penilaian capaian tujuan pembelajaran.';
  }

  // Condition 1: All TPs are achieved
  if (achievedTps.length === activeTps.length) {
    if (achievedTps.length === 1) {
      return `Menunjukkan penguasaan yang sangat baik dalam ${formatTpText(achievedTps[0].desc)}.`;
    }
    const list = achievedTps.map((t) => formatTpText(t.desc)).join(', ');
    return `Menunjukkan penguasaan yang sangat baik dalam seluruh tujuan pembelajaran yang diujikan, meliputi ${list}.`;
  }

  // Condition 2: None of the TPs are achieved
  if (unachievedTps.length === activeTps.length) {
    if (unachievedTps.length === 1) {
      return `Perlu bimbingan dan pendampingan lebih lanjut dalam ${formatTpText(unachievedTps[0].desc)}.`;
    }
    const list = unachievedTps.map((t) => formatTpText(t.desc)).join(', ');
    return `Perlu bimbingan dan pendampingan lebih lanjut dalam seluruh tujuan pembelajaran yang diujikan, khususnya ${list}.`;
  }

  // Condition 3: Mixed (Some achieved, some need guidance)
  const achievedPhrase = achievedTps.map((t) => formatTpText(t.desc)).join(' dan ');
  const unachievedPhrase = unachievedTps.map((t) => formatTpText(t.desc)).join(' dan ');

  return `Menunjukkan penguasaan yang baik dalam ${achievedPhrase}, namun perlu bimbingan dan pendampingan dalam ${unachievedPhrase}.`;
};

/**
 * Auto-generate pedagogical & motivational teacher note (Catatan Guru / Wali Kelas)
 * based on student name, STS score, and TP achievement
 */
export const generateTeacherNote = (
  studentName: string,
  stsScore?: number | null,
  tpAchievedCount = 0,
  totalTps = 0,
  passingGrade = 75
): string => {
  const firstName = studentName.split(' ')[0] || studentName;
  const score = typeof stsScore === 'number' ? stsScore : 0;
  
  // If the student has any unachieved/remedial subjects/TPs, they shouldn't get "isHighAchievement"
  const isHighAchievement = (score >= 88 || (totalTps > 0 && tpAchievedCount === totalTps && score >= 80)) && (totalTps === 0 || tpAchievedCount === totalTps);
  const isGoodAchievement = score >= passingGrade;

  if (totalTps > 0 && tpAchievedCount < totalTps) {
    const templates = [
      `Ananda ${firstName} memiliki potensi yang baik, namun masih perlu meningkatkan ketelitian dan semangat mengulang materi pada mata pelajaran yang belum tuntas. Tetap semangat!`,
      `Alhamdulillah, secara umum perkembangan belajar ananda ${firstName} cukup baik. Tingkatkan fokus dan perbanyak latihan mandiri untuk menuntaskan beberapa tujuan pembelajaran yang perlu bimbingan.`,
      `Ananda ${firstName} menunjukkan perkembangan yang positif. Mari tingkatkan kedisiplinan belajar agar seluruh materi remedial dapat dituntaskan dengan optimal.`,
    ];
    return templates[Math.abs(studentName.length) % templates.length];
  }

  if (isHighAchievement) {
    const templates = [
      `Alhamdulillah, ananda ${firstName} menunjukkan pemahaman yang sangat istimewa pada tengah semester ini. Pertahankan prestasi, ketekunan, dan akhlak muliamu!`,
      `Prestasi ananda ${firstName} sangat membanggakan dengan penguasaan materi yang optimal. Tetaplah rendah hati dan teruslah menginspirasi teman-teman.`,
      `Masya Allah, ananda ${firstName} memiliki dedikasi belajar yang sangat tinggi. Semoga Allah senantiasa memberkahi ilmu dan kebaikanmu.`,
    ];
    return templates[Math.abs(studentName.length) % templates.length];
  } else if (isGoodAchievement) {
    const templates = [
      `Ananda ${firstName} telah mencapai kompetensi pembelajaran dengan baik. Terus tingkatkan konsistensi belajar dan keaktifan di kelas.`,
      `Alhamdulillah, capaian belajar ${firstName} sudah tuntas dengan baik. Tingkatkan latihan mandiri agar pemahaman materi semakin mendalam.`,
      `Ananda ${firstName} menunjukkan perkembangan yang positif. Pertahankan semangat belajar dan senantiasa istiqomah dalam berakhlak terpuji.`,
    ];
    return templates[Math.abs(studentName.length) % templates.length];
  } else if (score > 0) {
    const templates = [
      `Ananda ${firstName} memiliki potensi yang baik. Perbanyak mengulang materi dan jangan ragu untuk bertanya saat bimbingan di kelas. Tetap semangat!`,
      `Terus semangat belajar untuk ananda ${firstName}. Dengan bimbingan intensif dan latihan berkala, insya Allah ananda pasti dapat meraih hasil yang lebih baik.`,
      `Ananda ${firstName} perlu lebih fokus dan disiplin dalam mengerjakan tugas serta mengulang materi pokok. Guru dan orang tua senantiasa mendampingi.`,
    ];
    return templates[Math.abs(studentName.length) % templates.length];
  } else {
    return `Tingkatkan kedisiplinan dan semangat belajar ananda ${firstName} dalam setiap kegiatan pembelajaran.`;
  }
};

/**
 * Integrates subjects defined in Master Classes (Pengaturan Akademik / Rombel)
 * into e-Rapor class data so all official subjects (Akidah Akhlak, Fiqih, etc.) are available.
 */
export const syncSubjectsWithMasterClasses = (
  classLevel: string,
  currentSubjects: RaporSubject[]
): { subjects: RaporSubject[]; hasNewSubjects: boolean } => {
  const updatedSubjects = [...currentSubjects];
  let hasNewSubjects = false;

  try {
    const masterClasses = getStoredMasterClasses();
    const cleanLevel = classLevel.toUpperCase().replace(/^KELAS\s*/i, '').replace(/\s+/g, '').trim();
    const targetMaster = masterClasses.find(
      (c) =>
        c.name.toUpperCase().replace(/^KELAS\s*/i, '').replace(/\s+/g, '').trim() === cleanLevel ||
        c.id.toUpperCase().replace(/^KELAS\s*/i, '').replace(/\s+/g, '').trim() === cleanLevel
    );

    if (targetMaster && Array.isArray(targetMaster.subjects)) {
      targetMaster.subjects.forEach((mSubj) => {
        const existing = matchRaporSubject(mSubj.name, updatedSubjects);
        if (!existing) {
          const subId = mSubj.id || `subj_${mSubj.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const subName = mSubj.name.toUpperCase();
          const newSubj: RaporSubject = {
            id: subId,
            name: subName,
            code: mSubj.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'MAPEL',
            category: detectCategoryFromName(subName),
            order: mSubj.order || updatedSubjects.length + 1,
            isCustom: true,
            tpList: [
              {
                id: `tp_${subId}_1`,
                code: 'TP 1',
                desc: `Memahami materi pokok dan capaian pembelajaran ${subName}`,
                isActive: true,
              },
              {
                id: `tp_${subId}_2`,
                code: 'TP 2',
                desc: `Menerapkan pemahaman materi ${subName} dalam kehidupan sehari-hari`,
                isActive: true,
              },
            ],
          };
          updatedSubjects.push(newSubj);
          hasNewSubjects = true;
        }
      });
    }
  } catch (err) {
    console.warn('Could not sync subjects with master classes:', err);
  }

  return { subjects: updatedSubjects, hasNewSubjects };
};

/**
 * Initialize new class data template merged with existing students
 */
export const createInitialClassData = (
  classLevel: string,
  semester: '1' | '2' = '2',
  schoolYear = '2024/2025',
  existingStudents: Student[] = []
): RaporStsClassData => {
  const classKey = getClassKey(classLevel, semester, schoolYear);
  const baseSubjects = JSON.parse(JSON.stringify(DEFAULT_RAPOR_SUBJECTS));
  const { subjects } = syncSubjectsWithMasterClasses(classLevel, baseSubjects);

  // Determine Fase based on classLevel
  let fase: 'Fase A' | 'Fase B' | 'Fase C' = 'Fase B';
  const numericGrade = parseInt(classLevel.replace(/\D/g, ''), 10);
  if (numericGrade <= 2) fase = 'Fase A';
  else if (numericGrade <= 4) fase = 'Fase B';
  else fase = 'Fase C';

  const config: RaporStsConfig = {
    ...DEFAULT_RAPOR_CONFIG,
    classLevel,
    fase,
    semester,
    schoolYear,
  };

  const subjectRecords: Record<string, { subjectId: string; scores: Record<string, StudentScoreDetail> }> = {};
  const additionalInfo: Record<string, StudentAdditionalInfo> = {};

  // Initialize records for each student and subject
  subjects.forEach((subj: RaporSubject) => {
    const studentScores: Record<string, StudentScoreDetail> = {};
    existingStudents.forEach((st) => {
      const tpScores: Record<string, number | null> = {};
      subj.tpList.forEach((tp) => {
        tpScores[tp.id] = null;
      });

      studentScores[st.id] = {
        studentId: st.id,
        studentName: st.name,
        nisn: st.nisn || '',
        nis: st.nim || '',
        tpScores,
        stsScore: null,
        finalScore: null,
        autoDescription: '',
      };
    });

    subjectRecords[subj.id] = {
      subjectId: subj.id,
      scores: studentScores,
    };
  });

  existingStudents.forEach((st) => {
    additionalInfo[st.id] = {
      studentId: st.id,
      attendance: { sakit: 0, izin: 0, alpha: 0 },
      extracurriculars: [
        { id: 'ekstra_1', name: 'Pramuka', predicate: 'Baik', description: 'Aktif dan disiplin dalam kepramukaan.' },
        { id: 'ekstra_2', name: 'Tahfidz Al-Qur\'an', predicate: 'Sangat Baik', description: 'Mencapai target hafalan juz 30 dengan tartil.' },
      ],
      teacherNotes: 'Tingkatkan terus semangat belajar dan pertahankan akhlak mulia.',
    };
  });

  return {
    id: classKey,
    config,
    subjects,
    subjectRecords,
    additionalInfo,
    lastModified: new Date().toISOString(),
  };
};

/**
 * Load Class Data:
 * 1. Checks LocalStorage first (instant)
 * 2. Fetches from Cloud Firestore `rapor_sts_classes/{classKey}`
 * 3. Fallbacks to initial structure if none exists
 */
export const fetchClassData = async (
  classLevel: string,
  semester: '1' | '2' = '2',
  schoolYear = '2024/2025',
  existingStudents: Student[] = []
): Promise<RaporStsClassData> => {
  const classKey = getClassKey(classLevel, semester, schoolYear);
  const local = getLocalClassData(classKey);

  // Fetch Global school config (school name, headmaster, titimangsa, all rombel walas)
  const globalConfig = await fetchGlobalRaporConfig();

  const applyGlobalConfig = (data: RaporStsClassData): RaporStsClassData => {
    if (globalConfig) {
      data.config = {
        ...data.config,
        schoolName: globalConfig.schoolName || data.config.schoolName,
        npsn: globalConfig.npsn || data.config.npsn,
        schoolAddress: globalConfig.schoolAddress || data.config.schoolAddress,
        headmasterName: globalConfig.headmasterName || data.config.headmasterName,
        headmasterNip: globalConfig.headmasterNip || data.config.headmasterNip,
        reportDatePlace: globalConfig.reportDatePlace || data.config.reportDatePlace,
        passingGrade: globalConfig.passingGrade !== undefined ? globalConfig.passingGrade : data.config.passingGrade,
        tpWeight: globalConfig.tpWeight !== undefined ? globalConfig.tpWeight : data.config.tpWeight,
        stsWeight: globalConfig.stsWeight !== undefined ? globalConfig.stsWeight : data.config.stsWeight,
        classTeachers: {
          ...DEFAULT_CLASS_TEACHERS,
          ...(data.config.classTeachers || {}),
          ...(globalConfig.classTeachers || {}),
        },
      };
    }

    // Assign walas corresponding to this classLevel
    const currentWalas = data.config.classTeachers?.[classLevel] || DEFAULT_CLASS_TEACHERS[classLevel];
    if (currentWalas) {
      data.config.teacherName = currentWalas.name;
      data.config.teacherNip = currentWalas.nip;
    }

    data.config.classLevel = classLevel;
    data.config.semester = semester;
    data.config.schoolYear = schoolYear;
    return data;
  };

  // Sync existing student names if new students were added to the DB
  const mergeStudents = (data: RaporStsClassData): RaporStsClassData => {
    let modified = false;
    existingStudents.forEach((st) => {
      // Check additional info
      if (!data.additionalInfo[st.id]) {
        data.additionalInfo[st.id] = {
          studentId: st.id,
          attendance: { sakit: 0, izin: 0, alpha: 0 },
          extracurriculars: [
            { id: 'ekstra_1', name: 'Pramuka', predicate: 'Baik', description: 'Aktif dalam kepramukaan.' },
          ],
          teacherNotes: 'Tetap rajin belajar dan berprestasi.',
        };
        modified = true;
      }

      // Check each subject
      data.subjects.forEach((subj) => {
        if (!data.subjectRecords[subj.id]) {
          data.subjectRecords[subj.id] = { subjectId: subj.id, scores: {} };
        }
        if (!data.subjectRecords[subj.id].scores[st.id]) {
          const tpScores: Record<string, number | null> = {};
          subj.tpList.forEach((tp) => {
            tpScores[tp.id] = null;
          });
          data.subjectRecords[subj.id].scores[st.id] = {
            studentId: st.id,
            studentName: st.name,
            nisn: st.nisn || '',
            nis: st.nim || '',
            tpScores,
            stsScore: null,
            finalScore: null,
            autoDescription: '',
          };
          modified = true;
        } else {
          // Update name if changed
          if (data.subjectRecords[subj.id].scores[st.id].studentName !== st.name) {
            data.subjectRecords[subj.id].scores[st.id].studentName = st.name;
            modified = true;
          }
        }
      });
    });

    if (modified) {
      data.lastModified = new Date().toISOString();
      saveLocalClassData(data);
    }
    return data;
  };

  // Sync with Jenjang TP (shared across all classes in same grade e.g. 1A & 1B)
  const syncWithJenjangTp = async (data: RaporStsClassData): Promise<RaporStsClassData> => {
    const grade = getGradeLevel(classLevel);
    const jenjangSubjects = await fetchJenjangTp(grade, semester, schoolYear);
    if (jenjangSubjects && jenjangSubjects.length > 0) {
      data.subjects = jenjangSubjects;
      data.lastModified = new Date().toISOString();
      saveLocalClassData(data);
    } else if (data.subjects && data.subjects.length > 0) {
      await saveJenjangTp(grade, semester, schoolYear, data.subjects);
    }
    return data;
  };

  try {
    const docRef = doc(db, 'rapor_sts_classes', classKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      recordQuotaUsage('reads', 1);
      const cloudData = snap.data() as RaporStsClassData;
      const configuredCloud = applyGlobalConfig(cloudData);
      const { subjects: syncedSubjects, hasNewSubjects } = syncSubjectsWithMasterClasses(
        classLevel,
        configuredCloud.subjects || []
      );
      if (hasNewSubjects) {
        configuredCloud.subjects = syncedSubjects;
      }
      saveLocalClassData(configuredCloud);
      return mergeStudents(configuredCloud);
    }
  } catch (err) {
    console.warn('Could not fetch from Firestore, falling back to local:', err);
  }

  if (local) {
    const configuredLocal = applyGlobalConfig(local);
    const { subjects: syncedSubjects, hasNewSubjects } = syncSubjectsWithMasterClasses(
      classLevel,
      configuredLocal.subjects || []
    );
    if (hasNewSubjects) {
      configuredLocal.subjects = syncedSubjects;
      configuredLocal.lastModified = new Date().toISOString();
      saveLocalClassData(configuredLocal);
    }
    return mergeStudents(configuredLocal);
  }

  // Create initial
  const initial = createInitialClassData(classLevel, semester, schoolYear, existingStudents);
  const configuredInitial = applyGlobalConfig(initial);
  saveLocalClassData(configuredInitial);
  return configuredInitial;
};

/**
 * Smart Batch Save:
 * Writes the entire class dataset in ONE Firestore operation
 * Preserves quota (< 1% write consumption)
 */
export const saveClassDataToCloud = async (data: RaporStsClassData): Promise<{ success: boolean; message?: string }> => {
  try {
    data.lastModified = new Date().toISOString();
    saveLocalClassData(data);

    const docRef = doc(db, 'rapor_sts_classes', data.id);
    await setDoc(docRef, {
      ...data,
      serverUpdatedAt: serverTimestamp(),
    });
    recordQuotaUsage('writes', 1);

    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync class data to cloud:', err);
    return {
      success: false,
      message: err.message || 'Gagal menyimpan ke Cloud Firestore, data tersimpan di penyimpanan lokal.',
    };
  }
};

/**
 * Download Excel template for inputting scores (STS Modern Format - Pure Score & Notes)
 * Columns: No, NISN, NIS, Nama Siswa, Nilai STS, Catatan Guru
 * Fully formatted with Bookman Old Style font, yellow header, and clean thin borders.
 */
export const downloadNilaiTemplateExcel = (
  classLevel: string,
  semester: string,
  schoolYear: string,
  subject: RaporSubject,
  students: Student[],
  currentScores?: Record<string, StudentScoreDetail>
): void => {
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  const rowHeights: XLSX.RowInfo[] = [];

  const FONT_BOOKMAN = 'Bookman Old Style';
  const BORDER_THIN = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  const setCell = (row: number, col: number, val: any, style?: any) => {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    const cell: XLSX.CellObject = {
      v: val !== null && val !== undefined ? val : '',
      t: typeof val === 'number' ? 'n' : 's',
    };
    if (style) {
      cell.s = style;
    }
    ws[cellRef] = cell;
  };

  let r = 0;

  // Title Row
  setCell(r, 0, 'TEMPLATE INPUT NILAI SUMATIF TENGAH SEMESTER (STS)', {
    font: { name: FONT_BOOKMAN, sz: 12, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
  rowHeights.push({ hpt: 24 });
  r++;

  // Metadata Info Rows
  setCell(r, 0, `Mata Pelajaran: ${subject.name} (${subject.code || 'MAPEL'})`, {
    font: { name: FONT_BOOKMAN, sz: 10, bold: true, color: { rgb: '1E293B' } },
  });
  setCell(r, 3, `Kelas: ${classLevel}`, {
    font: { name: FONT_BOOKMAN, sz: 10, bold: true, color: { rgb: '1E293B' } },
  });
  setCell(r, 4, `Semester: ${semester === '1' ? 'Ganjil (1)' : 'Genap (2)'}`, {
    font: { name: FONT_BOOKMAN, sz: 10, bold: true, color: { rgb: '1E293B' } },
  });
  rowHeights.push({ hpt: 18 });
  r++;

  setCell(r, 0, `Tahun Ajaran: ${schoolYear}`, {
    font: { name: FONT_BOOKMAN, sz: 10, bold: true, color: { rgb: '1E293B' } },
  });
  setCell(r, 3, `Standar Nilai: 0 - 100`, {
    font: { name: FONT_BOOKMAN, sz: 10, bold: true, color: { rgb: '1E293B' } },
  });
  rowHeights.push({ hpt: 18 });
  r++;

  // Empty Spacer
  rowHeights.push({ hpt: 10 });
  r++;

  // Panduan Pengisian
  setCell(r, 0, 'PANDUAN PENGISIAN TEMPLATE:', {
    font: { name: FONT_BOOKMAN, sz: 9.5, bold: true, color: { rgb: '0369A1' } },
  });
  rowHeights.push({ hpt: 16 });
  r++;

  const petunjuk = [
    '1. Masukkan angka nilai murni STS (rentang 0 s/d 100) pada kolom "Nilai STS". Nilai ini otomatis menjadi Nilai Akhir Rapor.',
    '2. Kolom "Catatan Guru" bersifat opsional untuk memberikan apresiasi capaian atau catatan motivasi bagi siswa.',
    '3. Jangan mengubah nomor urut, NISN, atau NIS siswa agar sinkronisasi data berjalan otomatis dan akurat.',
  ];

  petunjuk.forEach((p) => {
    setCell(r, 0, p, {
      font: { name: FONT_BOOKMAN, sz: 8.5, italic: true, color: { rgb: '475569' } },
    });
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    rowHeights.push({ hpt: 15 });
    r++;
  });

  // Empty Spacer before Table
  rowHeights.push({ hpt: 12 });
  r++;

  // TABLE HEADER
  const headers = [
    { text: 'NO', width: 6, align: 'center' },
    { text: 'NISN', width: 16, align: 'center' },
    { text: 'NIS', width: 14, align: 'center' },
    { text: 'NAMA SISWA', width: 34, align: 'left' },
    { text: 'NILAI STS (0-100)', width: 18, align: 'center' },
    { text: 'CATATAN GURU (OPSIONAL)', width: 42, align: 'left' },
  ];

  const headerStyle = {
    font: { name: FONT_BOOKMAN, sz: 10, bold: true, color: { rgb: '000000' } },
    fill: {
      fillType: 'pattern',
      patternType: 'solid',
      fgColor: { rgb: 'FDE047' },
    },
    border: BORDER_THIN,
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  };

  headers.forEach((h, colIdx) => {
    setCell(r, colIdx, h.text, headerStyle);
  });
  rowHeights.push({ hpt: 26 });
  r++;

  // TABLE DATA ROWS
  students.forEach((st, idx) => {
    const studentScore = currentScores ? currentScores[st.id] : undefined;
    const stsVal = studentScore?.stsScore ?? studentScore?.finalScore;
    const noteVal = studentScore?.teacherNote || '';

    // No
    setCell(r, 0, idx + 1, {
      font: { name: FONT_BOOKMAN, sz: 10, color: { rgb: '000000' } },
      border: BORDER_THIN,
      alignment: { horizontal: 'center', vertical: 'center' },
    });

    // NISN
    setCell(r, 1, st.nisn || '', {
      font: { name: FONT_BOOKMAN, sz: 10, color: { rgb: '000000' } },
      border: BORDER_THIN,
      alignment: { horizontal: 'center', vertical: 'center' },
    });

    // NIS
    setCell(r, 2, st.nim || '', {
      font: { name: FONT_BOOKMAN, sz: 10, color: { rgb: '000000' } },
      border: BORDER_THIN,
      alignment: { horizontal: 'center', vertical: 'center' },
    });

    // Nama Siswa
    setCell(r, 3, st.name.toUpperCase(), {
      font: { name: FONT_BOOKMAN, sz: 10, bold: true, color: { rgb: '000000' } },
      border: BORDER_THIN,
      alignment: { horizontal: 'left', vertical: 'center' },
    });

    // Nilai STS
    setCell(r, 4, typeof stsVal === 'number' ? stsVal : '', {
      font: { name: FONT_BOOKMAN, sz: 10, bold: true, color: { rgb: '000000' } },
      border: BORDER_THIN,
      alignment: { horizontal: 'center', vertical: 'center' },
    });

    // Catatan Guru
    setCell(r, 5, noteVal, {
      font: { name: FONT_BOOKMAN, sz: 9.5, italic: true, color: { rgb: '000000' } },
      border: BORDER_THIN,
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    });

    rowHeights.push({ hpt: 22 });
    r++;
  });

  // Apply properties to Worksheet
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: 5 } });
  ws['!merges'] = merges;
  ws['!rows'] = rowHeights;
  ws['!cols'] = headers.map((h) => ({ wch: h.width }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Nilai STS`);

  const cleanMapel = (subject.code || subject.name).replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Template_Nilai_${cleanMapel}_Kelas_${classLevel}_Sem${semester}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export interface ImportResult {
  updatedScores: Record<string, StudentScoreDetail>;
  successCount: number;
  unmatchedCount: number;
  errors: string[];
}

/**
 * Import scores from Excel file (.xlsx, .xls, .csv)
 * Directly reads STS score (0-100) & Catatan Guru, calculates predicate and mastery status
 * Backward-compatible with older templates containing TP columns.
 */
export const importNilaiFromExcel = async (
  file: File,
  subject: RaporSubject,
  students: Student[],
  currentScores: Record<string, StudentScoreDetail>,
  config: RaporStsConfig
): Promise<ImportResult> => {
  const activeTps = subject.tpList.filter((t) => t.isActive);
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  if (!ws) {
    throw new Error('File Excel tidak memiliki sheet yang dapat dibaca.');
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rawRows.length < 2) {
    throw new Error('File Excel kosong atau tidak memiliki data siswa.');
  }

  // Header row detection
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(35, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length < 2) continue;

    const normalizedCells = row.map((c) => String(c ?? '').trim().toLowerCase());
    const hasNamaCell = normalizedCells.some(
      (c) => c === 'nama' || c === 'nama siswa' || c === 'nama lengkap' || c.startsWith('nama ')
    );
    const hasIdOrScoreCell = normalizedCells.some(
      (c) => c === 'no' || c === 'no.' || c === 'nis' || c === 'nisn' || c.includes('nilai') || c.includes('sts')
    );

    if (hasNamaCell && hasIdOrScoreCell) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback: search for row where any cell exactly matches "nama siswa"
  if (headerRowIndex === -1) {
    for (let r = 0; r < Math.min(35, rawRows.length); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length < 2) continue;
      const normalizedCells = row.map((c) => String(c ?? '').trim().toLowerCase());
      if (normalizedCells.includes('nama siswa') || normalizedCells.includes('nama')) {
        headerRowIndex = r;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Header kolom (Nama Siswa / Nilai STS) tidak ditemukan dalam template Excel.');
  }

  const headers = rawRows[headerRowIndex].map((h) => String(h || '').trim());
  const nisnColIdx = headers.findIndex((h) => /nisn/i.test(h));
  const nisColIdx = headers.findIndex((h) => /^nis$/i.test(h) || /no\.?\s*induk/i.test(h));
  let nameColIdx = headers.findIndex((h) => /nama/i.test(h));
  if (nameColIdx === -1) nameColIdx = 3;

  // Find STS column (e.g. "NILAI STS", "NILAI AKHIR", "NILAI STS (0-100)", "STS", "NILAI")
  let stsColIdx = headers.findIndex(
    (h) => /nilai\s*sts/i.test(h) || /sumatif\s*tengah/i.test(h) || /nilai\s*akhir/i.test(h) || /^sts$/i.test(h) || /^nilai$/i.test(h)
  );

  // If not found, try finding any column with "nilai"
  if (stsColIdx === -1) {
    stsColIdx = headers.findIndex((h) => /nilai/i.test(h));
  }

  // Fallback: if not found, column directly after Nama
  if (stsColIdx === -1 && nameColIdx !== -1 && nameColIdx + 1 < headers.length) {
    stsColIdx = nameColIdx + 1;
  }

  // Find Catatan Guru column
  const notesColIdx = headers.findIndex(
    (h) => /catatan/i.test(h) || /wali\s*kelas/i.test(h) || /note/i.test(h) || /keterangan/i.test(h) || /motivasi/i.test(h)
  );

  const updatedScores: Record<string, StudentScoreDetail> = { ...currentScores };
  let successCount = 0;
  let unmatchedCount = 0;
  const errors: string[] = [];

  const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rowNo = parseInt(String(row[0] || '').trim(), 10);
    const rowNisn = nisnColIdx !== -1 ? String(row[nisnColIdx] || '').trim() : '';
    const rowNis = nisColIdx !== -1 ? String(row[nisColIdx] || '').trim() : '';
    const rowName = nameColIdx !== -1 ? String(row[nameColIdx] || '').trim() : '';

    if (!rowName && !rowNisn && !rowNis) continue;

    const cRowName = cleanStr(rowName);

    // Match student accurately
    let matchedStudent = students.find((st) => {
      if (rowNisn && st.nisn && st.nisn.trim() === rowNisn) return true;
      if (rowNis && st.nim && st.nim.trim() === rowNis) return true;
      if (cRowName && cleanStr(st.name) === cRowName) return true;
      return false;
    });

    // Substring or token fallback if name is provided
    if (!matchedStudent && cRowName) {
      matchedStudent = students.find((st) => {
        const cStName = cleanStr(st.name);
        if (cStName.includes(cRowName) || cRowName.includes(cStName)) return true;
        const rowWords = cRowName.split(' ').filter((w) => w.length >= 3);
        const stWords = cStName.split(' ').filter((w) => w.length >= 3);
        const common = rowWords.filter((w) => stWords.includes(w));
        return common.length >= 2 || (rowWords.length === 1 && common.length === 1);
      });
    }

    // Row number index fallback (if rowNo corresponds to original sequence)
    if (!matchedStudent && !isNaN(rowNo) && rowNo >= 1 && rowNo <= students.length) {
      matchedStudent = students[rowNo - 1];
    }

    // Sequential row index fallback from row position
    if (!matchedStudent) {
      const seqIndex = r - (headerRowIndex + 1);
      if (seqIndex >= 0 && seqIndex < students.length) {
        matchedStudent = students[seqIndex];
      }
    }

    if (!matchedStudent) {
      unmatchedCount++;
      errors.push(`Baris ${r + 1}: Siswa "${rowName || rowNisn || `No. ${rowNo}`}" tidak cocok dengan daftar kelas.`);
      continue;
    }

    const stId = matchedStudent.id;
    const existing = updatedScores[stId] || {
      studentId: stId,
      studentName: matchedStudent.name,
      nisn: matchedStudent.nisn || '',
      nis: matchedStudent.nim || '',
      tpScores: {},
      tpAchieved: {},
      stsScore: null,
      finalScore: null,
      autoDescription: '',
      teacherNote: '',
    };

    // Read STS score
    let newStsScore = existing.stsScore;
    if (stsColIdx !== -1) {
      const rawSts = row[stsColIdx];
      if (rawSts !== '' && rawSts !== null && rawSts !== undefined) {
        const num = parseFloat(String(rawSts).replace(',', '.'));
        if (!isNaN(num)) {
          newStsScore = Math.min(100, Math.max(0, Math.round(num)));
        }
      }
    }

    // Read Catatan Guru from Excel
    let newTeacherNote = existing.teacherNote || '';
    if (notesColIdx !== -1) {
      const rawNote = row[notesColIdx];
      if (rawNote !== null && rawNote !== undefined) {
        const noteStr = String(rawNote).trim();
        if (noteStr) {
          newTeacherNote = noteStr;
        }
      }
    }

    // Final score is directly the STS score
    const finalScore = newStsScore;

    const autoDesc = generateCompetencyDescription(
      matchedStudent.name,
      {},
      activeTps,
      newStsScore,
      config.passingGrade
    );

    updatedScores[stId] = {
      ...existing,
      stsScore: newStsScore,
      finalScore,
      autoDescription: autoDesc,
      teacherNote: newTeacherNote,
    };

    successCount++;
  }

  return {
    updatedScores,
    successCount,
    unmatchedCount,
    errors,
  };
};

/**
 * Helper to build a styled worksheet for Leger STS conforming to TEMPLATELEGER.xlsx
 * @param classData Class metadata and scores
 * @param students Student list
 * @param sortByRank Whether to sort rows by total score & rank descending
 */
const buildLegerWorksheet = (
  classData: RaporStsClassData,
  students: Student[],
  sortByRank: boolean
): XLSX.WorkSheet => {
  const { config, subjects, subjectRecords } = classData;

  const semText = config.semester === '1' ? 'GANJIL' : 'GENAP';

  // Number of subject columns
  const numSubjects = subjects.length;
  // Total columns: NO (1), NISN (1), NIS (1), NAMA (1) + Subjects (numSubjects) + Jumlah (1), Rata-rata (1), Peringkat (1)
  const totalCols = 4 + numSubjects + 3;
  const lastColIdx = totalCols - 1;

  // Metadata right column indices:
  // Give ample span (at least 5-6 columns) so long teacher names never get truncated or sink
  const metaRightLabelColIdx = Math.max(4, totalCols - 6);
  const metaRightValColIdx = metaRightLabelColIdx + 1;

  // Row 1: Merged Title "LEGER NILAI SUMATIF TENGAH SEMESTER  GANJIL (STS)"
  const row1: string[] = Array(totalCols).fill('');
  row1[0] = `LEGER NILAI SUMATIF TENGAH SEMESTER  ${semText} (STS)`;

  // Row 2: Blank
  const row2: string[] = Array(totalCols).fill('');

  // Row 3: Metadata - A3: "Sekolah", C3: schoolName, metaRightLabelColIdx: "Kelas", metaRightValColIdx: classLevel
  const row3: string[] = Array(totalCols).fill('');
  row3[0] = 'Sekolah';
  row3[2] = config.schoolName || 'SDIT AL FIKRI';
  if (totalCols >= 6) {
    row3[metaRightLabelColIdx] = 'Kelas';
    row3[metaRightValColIdx] = `: ${config.classLevel || ''}`;
  }

  // Row 4: Metadata - A4: "Tahun Ajaran", C4: schoolYearStr, metaRightLabelColIdx: "Wali Kelas", metaRightValColIdx: teacherName
  const schoolYearStr = config.schoolYear || '2026/2027';
  const row4: string[] = Array(totalCols).fill('');
  row4[0] = 'Tahun Ajaran';
  row4[2] = schoolYearStr;
  if (totalCols >= 6) {
    row4[metaRightLabelColIdx] = 'Wali Kelas';
    row4[metaRightValColIdx] = `: ${config.teacherName || ''}`;
  }

  // Row 5: Blank separator
  const row5: string[] = Array(totalCols).fill('');

  // Row 6: Table Headers (No, NISN, NIS, Nama Siswa, [Mapels...], Jumlah Nilai, Rata-rata, Peringkat)
  const headerRow: string[] = ['No', 'NISN', 'NIS', 'Nama Siswa'];
  subjects.forEach((subj) => {
    headerRow.push((subj.code || subj.name || '').toUpperCase());
  });
  headerRow.push('Jumlah Nilai', 'Rata-rata', 'Peringkat');

  // Compute student rows
  const studentRows = students.map((st, index) => {
    let totalScore = 0;
    let scoreCount = 0;

    const rowMeta: any[] = [
      st.nisn ? String(st.nisn) : '-',
      ((st as any).nis || st.nim) ? String((st as any).nis || st.nim) : '-',
      st.name || '',
    ];

    subjects.forEach((subj) => {
      const rec = subjectRecords[subj.id]?.scores[st.id];
      const score = rec?.finalScore ?? rec?.stsScore ?? null;
      if (typeof score === 'number' && !isNaN(score)) {
        rowMeta.push(score);
        totalScore += score;
        scoreCount++;
      } else {
        rowMeta.push('-');
      }
    });

    const average = scoreCount > 0 ? parseFloat((totalScore / scoreCount).toFixed(1)) : 0;

    return {
      stId: st.id,
      name: st.name || '',
      rowMeta,
      totalScore,
      average,
      originalIndex: index + 1,
    };
  });

  // Calculate Ranking based on totalScore descending
  const sortedStudents = [...studentRows].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.average !== a.average) return b.average - a.average;
    return a.name.localeCompare(b.name);
  });
  const rankMap: Record<string, number> = {};
  sortedStudents.forEach((item, idx) => {
    rankMap[item.stId] = idx + 1;
  });

  // Pick display order based on sortByRank
  const listToRender = sortByRank ? sortedStudents : studentRows;

  // Construct final data rows
  const dataRows = listToRender.map((item, idx) => {
    return [
      idx + 1, // Nomor urut tabel (1, 2, 3...)
      ...item.rowMeta,
      item.totalScore > 0 ? item.totalScore : '-',
      item.average > 0 ? item.average : '-',
      rankMap[item.stId] || '-',
    ];
  });

  // Construct sheet data array
  const wsData = [
    row1,
    row2,
    row3,
    row4,
    row5,
    headerRow,
    ...dataRows,
  ];

  // Footers: Date & Signatures matching TEMPLATELEGER.xlsx
  const formattedToday = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const cityDateStr = config.reportDatePlace || `Tangerang, ${formattedToday}`;

  // 1 blank row before footer (Row 35 in template)
  wsData.push([]);

  // Footer Col positions: Left side starts at Col 1 (NISN) to Col 3 (Nama Siswa)
  // Right side starts at rightColIdx spanning to lastColIdx
  const leftColIdx = 1;
  const rightColIdx = Math.max(4, totalCols - 6);

  // Footer Row 1: Mengetahui on left, Date on right
  const footerDateRow: string[] = Array(totalCols).fill('');
  footerDateRow[leftColIdx] = 'Mengetahui,';
  footerDateRow[rightColIdx] = cityDateStr;
  wsData.push(footerDateRow);

  // Footer Row 2: Roles (Kepala Sekolah/Sekolah on left, Guru Kelas on right)
  const footerRoleRow: string[] = Array(totalCols).fill('');
  footerRoleRow[leftColIdx] = `Kepala ${config.schoolName || 'SDIT AL FIKRI'}`;
  footerRoleRow[rightColIdx] = 'Guru Kelas';
  wsData.push(footerRoleRow);

  // 3 Blank rows for signature space (Rows 38, 39, 40)
  wsData.push([], [], []);

  // Footer Row 3: Names (Row 41) - Strictly NO NIP row below
  const footerNameRow: string[] = Array(totalCols).fill('');
  footerNameRow[leftColIdx] = config.headmasterName || 'H. M. HALIM MUSTOMI, S.Pd.';
  footerNameRow[rightColIdx] = config.teacherName || 'Guru Kelas';
  wsData.push(footerNameRow);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const totalDataRows = dataRows.length;

  // Define merged ranges matching TEMPLATELEGER.xlsx:
  // A1:lastCol (Main Title), A3:B3 (Sekolah), A4:B4 (Tahun Ajaran)
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
  ];

  // Merge top right metadata (Kelas & Wali Kelas) to lastColIdx so long teacher names don't get cut off
  if (metaRightValColIdx <= lastColIdx) {
    merges.push(
      { s: { r: 2, c: metaRightValColIdx }, e: { r: 2, c: lastColIdx } },
      { s: { r: 3, c: metaRightValColIdx }, e: { r: 3, c: lastColIdx } }
    );
  }

  // Merge footer signature cells on the left (Kepala Sekolah) across Col 1 to Col 3 (width: 14+14+33 = 61 chars)
  merges.push(
    { s: { r: 7 + totalDataRows, c: 1 }, e: { r: 7 + totalDataRows, c: 3 } },
    { s: { r: 8 + totalDataRows, c: 1 }, e: { r: 8 + totalDataRows, c: 3 } },
    { s: { r: 12 + totalDataRows, c: 1 }, e: { r: 12 + totalDataRows, c: 3 } }
  );

  // Merge footer signature cells on the right (Date, Role, Name) to lastColIdx for ample width (55-65 chars)
  if (rightColIdx < lastColIdx) {
    merges.push(
      { s: { r: 7 + totalDataRows, c: rightColIdx }, e: { r: 7 + totalDataRows, c: lastColIdx } },
      { s: { r: 8 + totalDataRows, c: rightColIdx }, e: { r: 8 + totalDataRows, c: lastColIdx } },
      { s: { r: 12 + totalDataRows, c: rightColIdx }, e: { r: 12 + totalDataRows, c: lastColIdx } }
    );
  }

  ws['!merges'] = merges;

  // Set column widths conforming exactly to TEMPLATELEGER.xlsx
  const colWidths = [
    { wch: 4.5 }, // Col A: No
    { wch: 14 },  // Col B: NISN
    { wch: 14 },  // Col C: NIS
    { wch: 33 },  // Col D: Nama Siswa
  ];
  subjects.forEach(() => {
    colWidths.push({ wch: 9.5 }); // Subject columns
  });
  colWidths.push({ wch: 13 }); // Jumlah Nilai
  colWidths.push({ wch: 13 }); // Rata-rata
  colWidths.push({ wch: 13 }); // Peringkat

  ws['!cols'] = colWidths;

  // Row heights to prevent long names and text from sinking or being clipped vertically
  const rowHeights: XLSX.RowInfo[] = [];
  rowHeights[0] = { hpt: 26 }; // Title
  rowHeights[1] = { hpt: 10 }; // Blank
  rowHeights[2] = { hpt: 22 }; // Metadata Sekolah & Kelas
  rowHeights[3] = { hpt: 22 }; // Metadata Tahun Ajaran & Wali Kelas
  rowHeights[4] = { hpt: 12 }; // Blank
  rowHeights[5] = { hpt: 28 }; // Header Table
  for (let r = 0; r < totalDataRows; r++) {
    rowHeights[6 + r] = { hpt: 20 }; // Data Rows
  }
  rowHeights[6 + totalDataRows] = { hpt: 12 }; // Blank before footer
  rowHeights[7 + totalDataRows] = { hpt: 22 }; // Mengetahui / Date
  rowHeights[8 + totalDataRows] = { hpt: 22 }; // Roles
  rowHeights[9 + totalDataRows] = { hpt: 16 }; // Signature space 1
  rowHeights[10 + totalDataRows] = { hpt: 16 }; // Signature space 2
  rowHeights[11 + totalDataRows] = { hpt: 16 }; // Signature space 3
  rowHeights[12 + totalDataRows] = { hpt: 24 }; // Names
  ws['!rows'] = rowHeights;

  // Border and styles matching template
  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  const titleStyle = {
    font: { name: 'Cambria', sz: 12, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const metaLabelStyle = {
    font: { name: 'Cambria', sz: 11, bold: false, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const metaValStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  // Header style: Yellow fill #FFFF00, Cambria 11pt Bold, Center, Thin border
  const headerStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'FFFF00' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder,
  };

  const cellCenterStyle = {
    font: { name: 'Cambria', sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const cellLeftStyle = {
    font: { name: 'Cambria', sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  };

  const cellBoldStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  // Footer styles: Cambria 11pt, center aligned
  const footerTextStyle = {
    font: { name: 'Cambria', sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const footerNameStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, underline: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  // Apply title style
  const titleCell = ws['A1'];
  if (titleCell) titleCell.s = titleStyle;

  // Apply meta styles (Row 3 & 4)
  const a3 = ws['A3'];
  const c3 = ws['C3'];
  const a4 = ws['A4'];
  const c4 = ws['C4'];
  if (a3) a3.s = metaLabelStyle;
  if (c3) c3.s = metaValStyle;
  if (a4) a4.s = metaLabelStyle;
  if (c4) c4.s = metaValStyle;

  // Apply meta styles for right side (Kelas & Wali Kelas across merged columns)
  const rightLabelColName = XLSX.utils.encode_col(metaRightLabelColIdx);
  const metaRightLabel3 = ws[`${rightLabelColName}3`];
  const metaRightLabel4 = ws[`${rightLabelColName}4`];
  if (metaRightLabel3) metaRightLabel3.s = metaLabelStyle;
  if (metaRightLabel4) metaRightLabel4.s = metaLabelStyle;

  for (let c = metaRightValColIdx; c <= lastColIdx; c++) {
    const colName = XLSX.utils.encode_col(c);
    const cell3 = ws[`${colName}3`];
    if (cell3) cell3.s = metaValStyle;
    const cell4 = ws[`${colName}4`];
    if (cell4) cell4.s = metaValStyle;
  }

  // Apply cell styling across header & data rows
  for (let c = 0; c < totalCols; c++) {
    const colRef = XLSX.utils.encode_col(c);
    // Header (Row 6)
    const headerCell = ws[`${colRef}6`];
    if (headerCell) {
      headerCell.s = headerStyle;
    }

    // Data Rows (Row 7 to 6+totalDataRows)
    for (let r = 0; r < totalDataRows; r++) {
      const rowIdx = 7 + r;
      const cellRef = `${colRef}${rowIdx}`;
      const cell = ws[cellRef];
      if (cell) {
        if (c === 3) {
          // Student Name Column
          cell.s = cellLeftStyle;
        } else if (c >= totalCols - 3) {
          // Summary columns (Jumlah Nilai, Rata-rata, Peringkat)
          cell.s = cellBoldStyle;
        } else {
          // No, NISN, NIS, Subject scores
          cell.s = cellCenterStyle;
        }
      }
    }
  }

  // Footer cell styling across left and merged right columns
  const footerRow1 = 8 + totalDataRows;
  const footerRow2 = 9 + totalDataRows;
  const footerRowNames = 13 + totalDataRows;

  // Left side signature styles (Col 1 to 3)
  for (let c = 1; c <= 3; c++) {
    const colName = XLSX.utils.encode_col(c);
    const fL1 = ws[`${colName}${footerRow1}`];
    const fL2 = ws[`${colName}${footerRow2}`];
    const fLName = ws[`${colName}${footerRowNames}`];

    if (fL1) fL1.s = footerTextStyle;
    if (fL2) fL2.s = footerTextStyle;
    if (fLName) fLName.s = footerNameStyle;
  }

  // Right side signature styles (rightColIdx to lastColIdx)
  for (let c = rightColIdx; c <= lastColIdx; c++) {
    const colName = XLSX.utils.encode_col(c);
    const fP1 = ws[`${colName}${footerRow1}`];
    const fP2 = ws[`${colName}${footerRow2}`];
    const fPName = ws[`${colName}${footerRowNames}`];

    if (fP1) fP1.s = footerTextStyle;
    if (fP2) fP2.s = footerTextStyle;
    if (fPName) fPName.s = footerNameStyle;
  }

  return ws;
};

/**
 * Export Leger Nilai STS to Excel (.xlsx) with 2 Sheets:
 * - Sheet 1: "Urut Nama" (Daftar siswa sesuai urutan asal)
 * - Sheet 2: "Urut Peringkat" (Daftar siswa difilter & diurutkan berdasarkan peringkat nilai)
 * Strictly conforms to TEMPLATELEGER.xlsx template layout, merged headers, and formatting.
 */
export const exportLegerToExcel = (
  classData: RaporStsClassData,
  students: Student[]
): void => {
  const { config } = classData;
  const schoolYearStr = config.schoolYear || '2026/2027';

  const wb = XLSX.utils.book_new();

  // Sheet 1: Berdasarkan Nama (Urutan Asli)
  const wsByName = buildLegerWorksheet(classData, students, false);
  XLSX.utils.book_append_sheet(wb, wsByName, 'Urut Nama');

  // Sheet 2: Berdasarkan Peringkat (Urutan Nilai & Ranking Tertinggi)
  const wsByRank = buildLegerWorksheet(classData, students, true);
  XLSX.utils.book_append_sheet(wb, wsByRank, 'Urut Peringkat');

  const fileName = `Leger_STS_${config.classLevel || 'Kelas'}_Sem${config.semester}_${schoolYearStr.replace('/', '-')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export Rekap Nilai Mata Pelajaran untuk Guru Mapel (1 Sheet Ringkas)
 * Format tabel sederhana: No, Nama Siswa, Nilai Akhir
 * Dilengkapi judul kelas & mata pelajaran di bagian atas dan tanda tangan guru pengampu.
 */
export const exportRekapNilaiMapelToExcel = (
  subject: RaporSubject,
  classLevel: string,
  semester: string,
  schoolYear: string,
  students: Student[],
  scores: Record<string, StudentScoreDetail>,
  teacherName?: string
): void => {
  const semText = semester === '1' ? 'GANJIL' : 'GENAP';

  // Title rows
  const row1 = ['REKAPITULASI NILAI SUMATIF TENGAH SEMESTER (STS)', '', ''];
  const row2 = ['', '', ''];
  const row3 = ['Mata Pelajaran', `: ${subject.name.toUpperCase()} (${(subject.code || '').toUpperCase()})`, ''];
  const row4 = ['Kelas', `: ${classLevel}`, ''];
  const row5 = ['Semester', `: ${semText} (${semester})`, ''];
  const row6 = ['Tahun Ajaran', `: ${schoolYear}`, ''];
  const row7 = ['', '', ''];

  // Header Table: No, Nama Siswa, Nilai Akhir
  const headerRow = ['No', 'Nama Siswa', 'Nilai Akhir'];

  // Data rows
  const dataRows = students.map((st, idx) => {
    const sc = scores[st.id];
    const finalVal = sc?.finalScore ?? sc?.stsScore ?? null;
    return [
      idx + 1,
      st.name || '',
      typeof finalVal === 'number' && !isNaN(finalVal) ? finalVal : '-',
    ];
  });

  const wsData: any[][] = [
    row1,
    row2,
    row3,
    row4,
    row5,
    row6,
    row7,
    headerRow,
    ...dataRows,
  ];

  // Footer: Tanggal & Tanda Tangan Guru Mapel
  const formattedToday = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  wsData.push([]); // blank row

  const footerDateRow = ['', 'Tangerang, ' + formattedToday, ''];
  const footerRoleRow = ['', 'Guru Mata Pelajaran', ''];
  wsData.push(footerDateRow, footerRoleRow, [], [], []);

  const footerNameRow = ['', teacherName || 'Guru Mata Pelajaran', ''];
  wsData.push(footerNameRow);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const totalDataRows = dataRows.length;
  // Merged ranges:
  // Title (A1:C1)
  // Metadata B3:C3, B4:C4, B5:C5, B6:C6
  // Footer B:C for date, role, name
  const footerRow1 = 8 + totalDataRows;
  const footerRow2 = 9 + totalDataRows;
  const footerRowName = 13 + totalDataRows;

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } },
    { s: { r: 7 + totalDataRows, c: 1 }, e: { r: 7 + totalDataRows, c: 2 } },
    { s: { r: 8 + totalDataRows, c: 1 }, e: { r: 8 + totalDataRows, c: 2 } },
    { s: { r: 12 + totalDataRows, c: 1 }, e: { r: 12 + totalDataRows, c: 2 } },
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 38 }, // Nama Siswa
    { wch: 15 }, // Nilai Akhir
  ];

  // Styles
  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  const titleStyle = {
    font: { name: 'Cambria', sz: 12, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const metaLabelStyle = {
    font: { name: 'Cambria', sz: 11, bold: false, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const metaValStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const headerStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'FFFF00' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const cellCenterStyle = {
    font: { name: 'Cambria', sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const cellLeftStyle = {
    font: { name: 'Cambria', sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  };

  const cellBoldStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const footerTextStyle = {
    font: { name: 'Cambria', sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const footerNameStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, underline: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  // Apply Title & Meta styles
  if (ws['A1']) ws['A1'].s = titleStyle;
  ['A3', 'A4', 'A5', 'A6'].forEach((k) => { if (ws[k]) ws[k].s = metaLabelStyle; });
  ['B3', 'B4', 'B5', 'B6'].forEach((k) => { if (ws[k]) ws[k].s = metaValStyle; });

  // Header row (Row 8)
  ['A8', 'B8', 'C8'].forEach((k) => { if (ws[k]) ws[k].s = headerStyle; });

  // Data rows (Row 9 to 8 + totalDataRows)
  for (let r = 0; r < totalDataRows; r++) {
    const rowIdx = 9 + r;
    const cA = ws[`A${rowIdx}`];
    const cB = ws[`B${rowIdx}`];
    const cC = ws[`C${rowIdx}`];
    if (cA) cA.s = cellCenterStyle;
    if (cB) cB.s = cellLeftStyle;
    if (cC) cC.s = cellBoldStyle;
  }

  // Footer styles
  if (ws[`B${footerRow1}`]) ws[`B${footerRow1}`].s = footerTextStyle;
  if (ws[`B${footerRow2}`]) ws[`B${footerRow2}`].s = footerTextStyle;
  if (ws[`B${footerRowName}`]) ws[`B${footerRowName}`].s = footerNameStyle;

  const wb = XLSX.utils.book_new();
  const sheetName = `${(subject.code || subject.name || 'Nilai').substring(0, 20)} ${classLevel}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanSubject = (subject.code || subject.name).replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSchoolYear = schoolYear.replace('/', '-');
  const fileName = `Rekap_Nilai_${cleanSubject}_Kelas_${classLevel}_Sem${semester}_${cleanSchoolYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Builder helper to create a styled worksheet for one class rekap containing all handled subjects
 * Kop memuat identitas lengkap: Mata Pelajaran, Kelas, Semester, Guru Pengampu, Tahun Ajaran, Sekolah
 * Kolom tabel: No, NISN, NIS, Nama Siswa, NILAI AKHIR (atau kolom per mapel jika mengampu > 1 mapel)
 */
export const buildRekapNilaiKelasWorksheet = (params: {
  academicClass: { id: string; name: string; grade?: number | string };
  classData: RaporStsClassData;
  students: Student[];
  teacherContexts: {
    subjectId?: string;
    subjectName?: string;
    subjectCode?: string;
  }[];
  teacherName?: string;
}): XLSX.WorkSheet => {
  const { academicClass, classData, students, teacherContexts, teacherName } = params;
  const { config, subjects: allClassSubjects, subjectRecords } = classData;

  const semText = config.semester === '1' ? 'GANJIL' : 'GENAP';
  const schoolYear = config.schoolYear || '2026/2027';

  // Filter atau temukan seluruh mapel yang diampu guru ini di kelas tersebut
  let targetSubjects: RaporSubject[] = [];
  if (teacherContexts && teacherContexts.length > 0) {
    targetSubjects = allClassSubjects.filter((subj) =>
      teacherContexts.some(
        (ctx) =>
          (ctx.subjectId && subj.id && ctx.subjectId.toLowerCase() === subj.id.toLowerCase()) ||
          (ctx.subjectCode && subj.code && ctx.subjectCode.toLowerCase() === subj.code.toLowerCase()) ||
          (ctx.subjectName && subj.name && ctx.subjectName.toLowerCase() === subj.name.toLowerCase())
      )
    );

    // Jika pencocokan ke allClassSubjects kosong, buat targetSubjects langsung dari teacherContexts
    if (targetSubjects.length === 0) {
      targetSubjects = teacherContexts.map((ctx, idx) => ({
        id: ctx.subjectId || ctx.subjectCode || ctx.subjectName || 'mapel',
        name: ctx.subjectName || 'Mata Pelajaran',
        code: ctx.subjectCode || '',
        order: idx + 1,
        tpList: [],
      }));
    }
  } else {
    targetSubjects = allClassSubjects;
  }

  const isMultiSubject = targetSubjects.length > 1;

  // Kolom: No (0), NISN (1), NIS (2), Nama Siswa (3) + [Target Mapels...] + (Jumlah Nilai, Rata-rata jika multi)
  const totalCols = 4 + (isMultiSubject ? targetSubjects.length + 2 : 1);
  const lastColIdx = totalCols - 1;

  // Baris 1: Judul Utama
  const row1 = Array(totalCols).fill('');
  row1[0] = `REKAPITULASI NILAI SUMATIF TENGAH SEMESTER ${semText} (STS) - KELAS ${academicClass.name.toUpperCase()}`;

  // Baris 2: Blank
  const row2 = Array(totalCols).fill('');

  // Nama mata pelajaran untuk kop identitas
  const subjectNameStr =
    targetSubjects.length === 1
      ? `${targetSubjects[0].name.toUpperCase()}${
          targetSubjects[0].code &&
          !targetSubjects[0].name.toUpperCase().includes(targetSubjects[0].code.toUpperCase())
            ? ` (${targetSubjects[0].code.toUpperCase()})`
            : ''
        }`
      : targetSubjects.map((s) => s.name.toUpperCase()).join(', ');

  const rightLabelCol = isMultiSubject ? Math.max(4, totalCols - 3) : 3;
  const rightValCol = isMultiSubject ? rightLabelCol + 1 : 4;

  // Baris 3: Kiri 1: Sekolah, Kanan 1: Tahun Pelajaran
  const row3 = Array(totalCols).fill('');
  row3[0] = 'Sekolah';
  row3[1] = `: ${config.schoolName || 'SDIT AL FIKRI'}`;
  row3[rightLabelCol] = 'Tahun Pelajaran';
  row3[rightValCol] = `: ${schoolYear}`;

  // Baris 4: Kiri 2: Kelas, Kanan 2: Semester
  const row4 = Array(totalCols).fill('');
  row4[0] = 'Kelas';
  row4[1] = `: Kelas ${academicClass.name}`;
  row4[rightLabelCol] = 'Semester';
  row4[rightValCol] = `: ${semText} (${config.semester || '1'})`;

  // Baris 5: Kiri 3: Guru Pengampu, Kanan 3: Mata Pelajaran
  const row5 = Array(totalCols).fill('');
  row5[0] = 'Guru Pengampu';
  row5[1] = `: ${teacherName || config.teacherName || 'Guru Mata Pelajaran'}`;
  row5[rightLabelCol] = 'Mata Pelajaran';
  row5[rightValCol] = `: ${subjectNameStr}`;

  // Baris 6: Blank separator
  const row6 = Array(totalCols).fill('');

  // Baris 7: Header Table
  // Jika 1 mapel: label kolom diberi "NILAI AKHIR" sesuai arahan user karena identitas mapel ada di kop
  const headerRow = ['No', 'NISN', 'NIS', 'Nama Siswa'];
  if (!isMultiSubject) {
    headerRow.push('NILAI AKHIR');
  } else {
    targetSubjects.forEach((subj) => {
      headerRow.push((subj.code || subj.name || '').toUpperCase());
    });
    headerRow.push('Jumlah Nilai', 'Rata-rata');
  }

  // Data rows
  const dataRows = students.map((st, idx) => {
    let studentTotal = 0;
    let scoreCount = 0;

    const subjectVals: (number | string)[] = [];
    targetSubjects.forEach((subj) => {
      let rec = subjectRecords[subj.id]?.scores[st.id];
      // Jika tidak langsung ditemukan via id, fallback cocokkan via code atau name
      if (!rec) {
        const altKey = Object.keys(subjectRecords).find((sId) => {
          const s = allClassSubjects.find((acs) => acs.id === sId);
          return (
            (s?.code && subj.code && s.code.toLowerCase() === subj.code.toLowerCase()) ||
            (s?.name && subj.name && s.name.toLowerCase() === subj.name.toLowerCase())
          );
        });
        if (altKey) {
          rec = subjectRecords[altKey]?.scores[st.id];
        }
      }

      const sc = rec?.finalScore ?? rec?.stsScore ?? null;
      if (typeof sc === 'number' && !isNaN(sc)) {
        subjectVals.push(sc);
        studentTotal += sc;
        scoreCount++;
      } else {
        subjectVals.push('-');
      }
    });

    const average = scoreCount > 0 ? parseFloat((studentTotal / scoreCount).toFixed(1)) : 0;

    const row = [
      idx + 1,
      st.nisn ? String(st.nisn) : '-',
      ((st as any).nis || st.nim) ? String((st as any).nis || st.nim) : '-',
      st.name || '',
      ...subjectVals,
    ];

    if (isMultiSubject) {
      row.push(studentTotal > 0 ? studentTotal : '-');
      row.push(average > 0 ? average : '-');
    }

    return row;
  });

  const wsData: any[][] = [
    row1,
    row2,
    row3,
    row4,
    row5,
    row6,
    headerRow,
    ...dataRows,
  ];

  // Footer: Tanggal & Tanda Tangan Guru Mapel
  const formattedToday = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  wsData.push([]); // blank row before footer

  const footerColStart = rightLabelCol;
  const totalDataRows = dataRows.length;

  const footerDateRow = Array(totalCols).fill('');
  footerDateRow[footerColStart] = (config.reportDatePlace || 'Tangerang') + ', ' + formattedToday;

  const footerRoleRow = Array(totalCols).fill('');
  footerRoleRow[footerColStart] = 'Guru Mata Pelajaran';

  wsData.push(footerDateRow, footerRoleRow, [], [], []);

  const footerNameRow = Array(totalCols).fill('');
  footerNameRow[footerColStart] = teacherName || config.teacherName || 'Guru Mata Pelajaran';
  wsData.push(footerNameRow);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Merged ranges
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } }, // Judul A1:lastCol
    { s: { r: 2, c: 1 }, e: { r: 2, c: rightLabelCol - 1 } }, // Sekolah value B3 s/d sebelum Tahun Pelajaran
    { s: { r: 3, c: 1 }, e: { r: 3, c: rightLabelCol - 1 } }, // Kelas value B4 s/d sebelum Semester
    { s: { r: 4, c: 1 }, e: { r: 4, c: rightLabelCol - 1 } }, // Guru Pengampu value B5 s/d sebelum Mata Pelajaran
  ];

  // Merge right side values if rightValCol < lastColIdx (multi-subject)
  if (rightValCol < lastColIdx) {
    merges.push(
      { s: { r: 2, c: rightValCol }, e: { r: 2, c: lastColIdx } },
      { s: { r: 3, c: rightValCol }, e: { r: 3, c: lastColIdx } },
      { s: { r: 4, c: rightValCol }, e: { r: 4, c: lastColIdx } }
    );
  }

  // Merge footer signature cells
  if (footerColStart < lastColIdx) {
    merges.push(
      { s: { r: 8 + totalDataRows, c: footerColStart }, e: { r: 8 + totalDataRows, c: lastColIdx } },
      { s: { r: 9 + totalDataRows, c: footerColStart }, e: { r: 9 + totalDataRows, c: lastColIdx } },
      { s: { r: 13 + totalDataRows, c: footerColStart }, e: { r: 13 + totalDataRows, c: lastColIdx } }
    );
  }

  ws['!merges'] = merges;

  // Column widths
  const colWidths: XLSX.ColInfo[] = [
    { wch: 16 }, // Col A: No & label kiri (Sekolah, Kelas, Guru Pengampu)
    { wch: 14 }, // Col B: NISN
    { wch: 14 }, // Col C: NIS
    { wch: 32 }, // Col D: Nama Siswa & label kanan (Tahun Pelajaran, Semester, Mata Pelajaran)
  ];
  if (!isMultiSubject) {
    colWidths.push({ wch: 22 }); // Col E: NILAI AKHIR & nilai kanan
  } else {
    targetSubjects.forEach(() => {
      colWidths.push({ wch: 12 });
    });
    colWidths.push({ wch: 13 }, { wch: 13 });
  }
  ws['!cols'] = colWidths;

  // Row heights
  const rowHeights: XLSX.RowInfo[] = [];
  rowHeights[0] = { hpt: 26 }; // Title
  rowHeights[1] = { hpt: 10 }; // Blank
  rowHeights[2] = { hpt: 22 }; // Row 3: Sekolah & Tahun Pelajaran
  rowHeights[3] = { hpt: 22 }; // Row 4: Kelas & Semester
  rowHeights[4] = { hpt: 22 }; // Row 5: Guru Pengampu & Mata Pelajaran
  rowHeights[5] = { hpt: 12 }; // Row 6: Blank separator
  rowHeights[6] = { hpt: 28 }; // Row 7: Header Table
  for (let r = 0; r < totalDataRows; r++) {
    rowHeights[7 + r] = { hpt: 20 }; // Data Rows (Rows 8+)
  }
  rowHeights[7 + totalDataRows] = { hpt: 12 }; // Blank before footer
  rowHeights[8 + totalDataRows] = { hpt: 22 }; // Date
  rowHeights[9 + totalDataRows] = { hpt: 22 }; // Role
  rowHeights[10 + totalDataRows] = { hpt: 16 };
  rowHeights[11 + totalDataRows] = { hpt: 16 };
  rowHeights[12 + totalDataRows] = { hpt: 16 };
  rowHeights[13 + totalDataRows] = { hpt: 24 }; // Name
  ws['!rows'] = rowHeights;

  // Styles
  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  const titleStyle = {
    font: { name: 'Cambria', sz: 12, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const metaLabelStyle = {
    font: { name: 'Cambria', sz: 11, bold: false, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const metaValStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const headerStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'FFFF00' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder,
  };

  const cellCenterStyle = {
    font: { name: 'Cambria', sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const cellLeftStyle = {
    font: { name: 'Cambria', sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  };

  const cellBoldStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const footerTextStyle = {
    font: { name: 'Cambria', sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const footerNameStyle = {
    font: { name: 'Cambria', sz: 11, bold: true, underline: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  // Apply Title
  if (ws['A1']) ws['A1'].s = titleStyle;

  // Metadata labels & values (Rows 3, 4, 5)
  ['A3', 'A4', 'A5'].forEach((k) => { if (ws[k]) ws[k].s = metaLabelStyle; });
  ['B3', 'B4', 'B5'].forEach((k) => { if (ws[k]) ws[k].s = metaValStyle; });

  const rightLabelColName = XLSX.utils.encode_col(rightLabelCol);
  if (ws[`${rightLabelColName}3`]) ws[`${rightLabelColName}3`].s = metaLabelStyle;
  if (ws[`${rightLabelColName}4`]) ws[`${rightLabelColName}4`].s = metaLabelStyle;
  if (ws[`${rightLabelColName}5`]) ws[`${rightLabelColName}5`].s = metaLabelStyle;

  for (let c = rightValCol; c <= lastColIdx; c++) {
    const colName = XLSX.utils.encode_col(c);
    if (ws[`${colName}3`]) ws[`${colName}3`].s = metaValStyle;
    if (ws[`${colName}4`]) ws[`${colName}4`].s = metaValStyle;
    if (ws[`${colName}5`]) ws[`${colName}5`].s = metaValStyle;
  }

  // Header Table (Row 7)
  for (let c = 0; c < totalCols; c++) {
    const colName = XLSX.utils.encode_col(c);
    const hCell = ws[`${colName}7`];
    if (hCell) hCell.s = headerStyle;
  }

  // Data rows (Row 8 to 7 + totalDataRows)
  for (let r = 0; r < totalDataRows; r++) {
    const rowIdx = 8 + r;
    for (let c = 0; c < totalCols; c++) {
      const colName = XLSX.utils.encode_col(c);
      const cell = ws[`${colName}${rowIdx}`];
      if (cell) {
        if (c === 3) {
          cell.s = cellLeftStyle;
        } else if (!isMultiSubject && c === 4) {
          cell.s = cellBoldStyle;
        } else if (isMultiSubject && c >= totalCols - 2) {
          cell.s = cellBoldStyle;
        } else {
          cell.s = cellCenterStyle;
        }
      }
    }
  }

  // Footer styling
  const footerRow1 = 9 + totalDataRows;
  const footerRow2 = 10 + totalDataRows;
  const footerRowName = 14 + totalDataRows;

  for (let c = footerColStart; c <= lastColIdx; c++) {
    const colName = XLSX.utils.encode_col(c);
    const f1 = ws[`${colName}${footerRow1}`];
    const f2 = ws[`${colName}${footerRow2}`];
    const fN = ws[`${colName}${footerRowName}`];
    if (f1) f1.s = footerTextStyle;
    if (f2) f2.s = footerTextStyle;
    if (fN) fN.s = footerNameStyle;
  }

  return ws;
};

/**
 * Export Rekap Nilai Seluruh Mapel yang Diampu Guru dalam Satu Kelas (1 Sheet Ringkas)
 */
export const exportRekapNilaiKelasGuruToExcel = (params: {
  academicClass: { id: string; name: string; grade?: number | string };
  classData: RaporStsClassData;
  students: Student[];
  teacherContexts: {
    subjectId?: string;
    subjectName?: string;
    subjectCode?: string;
  }[];
  teacherName?: string;
}): void => {
  const ws = buildRekapNilaiKelasWorksheet(params);
  const wb = XLSX.utils.book_new();
  const cleanClassName = params.academicClass.name.replace(/[^a-zA-Z0-9]/g, '_');
  const sheetName = `Kelas ${cleanClassName}`.substring(0, 30);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanSchoolYear = (params.classData.config.schoolYear || '2026/2027').replace('/', '-');
  const subjName = params.teacherContexts?.[0]?.subjectCode || params.teacherContexts?.[0]?.subjectName;
  const cleanSubj = subjName ? `${subjName.replace(/[^a-zA-Z0-9]/g, '_')}_` : '';
  const fileName = `Rekap_Nilai_${cleanSubj}Kelas_${cleanClassName}_Sem${params.classData.config.semester || '1'}_${cleanSchoolYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export interface ExportRekapNilaiSemuaKelasGuruParams {
  classes: {
    academicClass: { id: string; name: string; grade?: number | string };
    classData: RaporStsClassData;
    students: Student[];
    teacherContexts: {
      subjectId?: string;
      subjectName?: string;
      subjectCode?: string;
    }[];
  }[];
  teacherName?: string;
  semester?: string;
  schoolYear?: string;
}

/**
 * Export Rekap Nilai Seluruh Kelas yang Diampu Guru dalam Satu Berkas Excel Multi-Sheet
 * Setiap kelas menjadi sheet tersendiri (Sheet "Kelas 1A", Sheet "Kelas 2B", dll.)
 */
export const exportRekapNilaiSemuaKelasGuruToExcel = (
  params: ExportRekapNilaiSemuaKelasGuruParams
): void => {
  const { classes, teacherName, semester = '1', schoolYear = '2026/2027' } = params;
  if (!classes || classes.length === 0) return;

  const wb = XLSX.utils.book_new();

  classes.forEach(({ academicClass, classData, students, teacherContexts }) => {
    const ws = buildRekapNilaiKelasWorksheet({
      academicClass,
      classData,
      students,
      teacherContexts,
      teacherName: teacherName || classData.config.teacherName,
    });
    const cleanClassName = academicClass.name.replace(/[^a-zA-Z0-9]/g, '_');
    const sheetName = `Kelas ${cleanClassName}`.substring(0, 30);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const cleanSchoolYear = schoolYear.replace('/', '-');
  const cleanTeacher = (teacherName || 'Guru').replace(/[^a-zA-Z0-9]/g, '_');
  const firstSubj = classes[0]?.teacherContexts?.[0]?.subjectCode || classes[0]?.teacherContexts?.[0]?.subjectName;
  const cleanSubj = firstSubj ? `${firstSubj.replace(/[^a-zA-Z0-9]/g, '_')}_` : '';
  const fileName = `Rekap_Nilai_${cleanSubj}Semua_Kelas_${cleanTeacher}_Sem${semester}_${cleanSchoolYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export interface GenerateAiNotesStudentInput {
  studentId: string;
  studentName: string;
  stsScore?: number | null;
  passingGrade?: number;
  achievedTps?: string[];
  unachievedTps?: string[];
  totalTps?: number;
}

export interface GenerateAiNotesParams {
  students: GenerateAiNotesStudentInput[];
  className?: string;
  subjectName?: string;
  semester?: string;
  schoolYear?: string;
}

/**
 * Call backend Gemini AI endpoint to generate contextual teacher notes
 * with automatic fallback to client-side rule engine on network/server error
 */
export const generateAiTeacherNotes = async (
  params: GenerateAiNotesParams
): Promise<Record<string, string>> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('/api/rapor-sts/generate-ai-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success' && data.notes && typeof data.notes === 'object') {
        const returned = data.notes as Record<string, string>;
        // Ensure every student has a note
        const finalMap: Record<string, string> = {};
        params.students.forEach((st) => {
          finalMap[st.studentId] =
            returned[st.studentId] ||
            generateTeacherNote(
              st.studentName,
              st.stsScore,
              st.achievedTps?.length || 0,
              st.totalTps || 0,
              st.passingGrade || 75
            );
        });
        return finalMap;
      }
    }
  } catch (_err) {
    // Network timeout or error - falls back seamlessly
  }

  // Client-side instant fallback generator
  const notesMap: Record<string, string> = {};
  params.students.forEach((st) => {
    notesMap[st.studentId] = generateTeacherNote(
      st.studentName,
      st.stsScore,
      st.achievedTps?.length || 0,
      st.totalTps || 0,
      st.passingGrade || 75
    );
  });
  return notesMap;
};

