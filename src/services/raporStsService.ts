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
 * Export Leger Nilai STS to Excel (.xlsx)
 * Strictly conforms to TEMPLATELEGER.xlsx template layout, merged headers, and formatting.
 */
export const exportLegerToExcel = (
  classData: RaporStsClassData,
  students: Student[]
): void => {
  const { config, subjects, subjectRecords } = classData;

  const semText = config.semester === '1' ? 'GANJIL' : 'GENAP';
  const schoolYearStr = config.schoolYear || '2026/2027';

  // Number of subject columns
  const numSubjects = subjects.length;
  // Total columns: NO (1), NISN (1), NIS (1), NAMA (1) + Subjects (numSubjects) + Jumlah (1), Rata-rata (1), Peringkat (1)
  const totalCols = 4 + numSubjects + 3;
  const lastColIdx = totalCols - 1;

  // Metadata right column indices:
  // In template (17 cols): col O (idx 14) is "Kelas" / "Wali Kelas", col P (idx 15) is "2B" / "MURHASANAH, S.Pd"
  const metaRightLabelColIdx = Math.max(4, totalCols - 3);
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
    row3[metaRightValColIdx] = config.classLevel || '';
  }

  // Row 4: Metadata - A4: "Tahun Ajaran", C4: schoolYearStr, metaRightLabelColIdx: "Wali Kelas", metaRightValColIdx: teacherName
  const row4: string[] = Array(totalCols).fill('');
  row4[0] = 'Tahun Ajaran';
  row4[2] = schoolYearStr;
  if (totalCols >= 6) {
    row4[metaRightLabelColIdx] = 'Wali Kelas';
    row4[metaRightValColIdx] = config.teacherName || '';
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

    const row: any[] = [
      index + 1,
      st.nisn ? String(st.nisn) : '-',
      ((st as any).nis || st.nim) ? String((st as any).nis || st.nim) : '-',
      st.name || '',
    ];

    subjects.forEach((subj) => {
      const rec = subjectRecords[subj.id]?.scores[st.id];
      const score = rec?.finalScore ?? rec?.stsScore ?? null;
      if (typeof score === 'number' && !isNaN(score)) {
        row.push(score);
        totalScore += score;
        scoreCount++;
      } else {
        row.push('-');
      }
    });

    const average = scoreCount > 0 ? parseFloat((totalScore / scoreCount).toFixed(1)) : 0;

    return {
      stId: st.id,
      row,
      totalScore,
      average,
    };
  });

  // Calculate Ranking based on totalScore descending
  const sortedStudents = [...studentRows].sort((a, b) => b.totalScore - a.totalScore);
  const rankMap: Record<string, number> = {};
  sortedStudents.forEach((item, idx) => {
    rankMap[item.stId] = idx + 1;
  });

  // Construct final data rows
  const dataRows = studentRows.map((item) => {
    const r = [...item.row];
    r.push(
      item.totalScore > 0 ? item.totalScore : '-',
      item.average > 0 ? item.average : '-',
      rankMap[item.stId] || '-'
    );
    return r;
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

  // Footer Col positions (Col D = leftColIdx 3, Col P = rightColIdx Math.max(leftColIdx + 2, totalCols - 2))
  const leftColIdx = 3; // Col D (Nama Siswa)
  const rightColIdx = Math.max(leftColIdx + 2, totalCols - 2); // Col P / Right side

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

  // Define merged ranges matching TEMPLATELEGER.xlsx:
  // A1:lastCol (Main Title), A3:B3 (Sekolah), A4:B4 (Tahun Ajaran)
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
  ];
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

  // Apply meta styles for right side (Kelas & Wali Kelas)
  const rightLabelColName = XLSX.utils.encode_col(metaRightLabelColIdx);
  const rightValColName = XLSX.utils.encode_col(metaRightValColIdx);
  const metaRightLabel3 = ws[`${rightLabelColName}3`];
  const metaRightVal3 = ws[`${rightValColName}3`];
  const metaRightLabel4 = ws[`${rightLabelColName}4`];
  const metaRightVal4 = ws[`${rightValColName}4`];
  if (metaRightLabel3) metaRightLabel3.s = metaLabelStyle;
  if (metaRightVal3) metaRightVal3.s = metaValStyle;
  if (metaRightLabel4) metaRightLabel4.s = metaLabelStyle;
  if (metaRightVal4) metaRightVal4.s = metaValStyle;

  // Apply cell styling across header & data rows
  const totalDataRows = dataRows.length;
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

  // Footer cell styling
  const leftColName = XLSX.utils.encode_col(leftColIdx);
  const rightColName = XLSX.utils.encode_col(rightColIdx);
  const footerRow1 = 8 + totalDataRows;
  const footerRow2 = 9 + totalDataRows;
  const footerRowNames = 13 + totalDataRows;

  const fD1 = ws[`${leftColName}${footerRow1}`];
  const fD2 = ws[`${leftColName}${footerRow2}`];
  const fDName = ws[`${leftColName}${footerRowNames}`];

  const fP1 = ws[`${rightColName}${footerRow1}`];
  const fP2 = ws[`${rightColName}${footerRow2}`];
  const fPName = ws[`${rightColName}${footerRowNames}`];

  if (fD1) fD1.s = footerTextStyle;
  if (fD2) fD2.s = footerTextStyle;
  if (fDName) fDName.s = footerNameStyle;

  if (fP1) fP1.s = footerTextStyle;
  if (fP2) fP2.s = footerTextStyle;
  if (fPName) fPName.s = footerNameStyle;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Leger STS ${config.classLevel || ''}`);

  const fileName = `Leger_STS_${config.classLevel || 'Kelas'}_Sem${config.semester}_${schoolYearStr.replace('/', '-')}.xlsx`;
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

