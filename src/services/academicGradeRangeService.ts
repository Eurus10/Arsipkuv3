import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { recordQuotaUsage } from './quotaTracker';

export interface GradeRangeConfig {
  passingGrade: number; // KKTP / KKM, e.g. 75
  minA: number; // e.g. 91
  minB: number; // e.g. 81
  minC: number; // e.g. 75
  labels: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export const GLOBAL_GRADE_RANGE_KEY = 'sdit_rapor_sts_grade_range_config_v1';
export const ALT_GRADE_RANGE_KEY = 'sdit_academic_grade_range_config';

export const DEFAULT_GRADE_RANGE_CONFIG: GradeRangeConfig = {
  passingGrade: 75,
  minA: 91,
  minB: 81,
  minC: 75,
  labels: {
    A: 'Sangat Baik',
    B: 'Baik',
    C: 'Cukup',
    D: 'Perlu Bimbingan',
  },
};

// In-memory module cache for instant access without disk delay
let inMemoryConfig: GradeRangeConfig | null = null;

export function getCachedGradeRangeConfig(): GradeRangeConfig {
  if (inMemoryConfig) return inMemoryConfig;
  try {
    const raw =
      localStorage.getItem(GLOBAL_GRADE_RANGE_KEY) ||
      localStorage.getItem(ALT_GRADE_RANGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        inMemoryConfig = {
          ...DEFAULT_GRADE_RANGE_CONFIG,
          ...parsed,
          labels: {
            ...DEFAULT_GRADE_RANGE_CONFIG.labels,
            ...(parsed.labels || {}),
          },
        };
        return inMemoryConfig;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_GRADE_RANGE_CONFIG;
}

/**
 * Fetch Global Grade Range Config
 * Reads In-Memory / LocalStorage cache first, then syncs from Cloud Firestore
 */
export async function fetchGradeRangeConfig(): Promise<GradeRangeConfig> {
  let config: GradeRangeConfig = getCachedGradeRangeConfig();

  // 1. Cloud Firestore sync (primary: rapor_sts_settings/grade_ranges)
  try {
    const docRef = doc(db, 'rapor_sts_settings', 'grade_ranges');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      recordQuotaUsage('reads', 1);
      const data = snap.data();
      if (data && typeof data === 'object') {
        config = {
          ...DEFAULT_GRADE_RANGE_CONFIG,
          ...data,
          labels: {
            ...DEFAULT_GRADE_RANGE_CONFIG.labels,
            ...(data.labels || {}),
          },
        };
        inMemoryConfig = config;
        try {
          const json = JSON.stringify(config);
          localStorage.setItem(GLOBAL_GRADE_RANGE_KEY, json);
          localStorage.setItem(ALT_GRADE_RANGE_KEY, json);
        } catch {
          // ignore localStorage error
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('academic-grade-range-updated', { detail: config })
          );
        }
        return config;
      }
    }

    // Fallback: check rapor_sts_settings/global_config
    const globalDocRef = doc(db, 'rapor_sts_settings', 'global_config');
    const globalSnap = await getDoc(globalDocRef);
    if (globalSnap.exists()) {
      recordQuotaUsage('reads', 1);
      const gData = globalSnap.data();
      if (gData?.gradeRanges && typeof gData.gradeRanges === 'object') {
        config = {
          ...DEFAULT_GRADE_RANGE_CONFIG,
          ...gData.gradeRanges,
          labels: {
            ...DEFAULT_GRADE_RANGE_CONFIG.labels,
            ...(gData.gradeRanges.labels || {}),
          },
        };
        inMemoryConfig = config;
        try {
          const json = JSON.stringify(config);
          localStorage.setItem(GLOBAL_GRADE_RANGE_KEY, json);
          localStorage.setItem(ALT_GRADE_RANGE_KEY, json);
        } catch {
          // ignore
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('academic-grade-range-updated', { detail: config })
          );
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch grade range config from cloud, using cached:', err);
  }

  return config;
}

/**
 * Save Global Grade Range Config to Cloud Firestore & LocalStorage
 * Synchronizes to both grade_ranges doc and global_config doc for 100% reliable cross-device sync (PC admin to teacher phones)
 */
export async function saveGradeRangeConfig(
  newConfig: GradeRangeConfig
): Promise<void> {
  inMemoryConfig = newConfig;

  // 1. LocalStorage (save to all keys for complete cross-service compatibility)
  try {
    const json = JSON.stringify(newConfig);
    localStorage.setItem(GLOBAL_GRADE_RANGE_KEY, json);
    localStorage.setItem(ALT_GRADE_RANGE_KEY, json);

    // Also update global_config local cache
    const globalRaw = localStorage.getItem('sdit_rapor_sts_global_config_v1');
    if (globalRaw) {
      const parsedGlobal = JSON.parse(globalRaw);
      parsedGlobal.passingGrade = newConfig.passingGrade;
      parsedGlobal.gradeRanges = newConfig;
      localStorage.setItem('sdit_rapor_sts_global_config_v1', JSON.stringify(parsedGlobal));
    }
  } catch (err) {
    console.error('Error saving local grade range config:', err);
  }

  // 2. Cloud Firestore (save to dedicated doc and merge into global_config)
  try {
    const docRef = doc(db, 'rapor_sts_settings', 'grade_ranges');
    await setDoc(
      docRef,
      {
        ...newConfig,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    recordQuotaUsage('writes', 1);

    // Also merge into global_config so teacher phones instantly receive it on load
    try {
      const globalDocRef = doc(db, 'rapor_sts_settings', 'global_config');
      await setDoc(
        globalDocRef,
        {
          passingGrade: newConfig.passingGrade,
          gradeRanges: newConfig,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      recordQuotaUsage('writes', 1);
    } catch (gErr) {
      console.warn('Could not mirror grade ranges into global_config:', gErr);
    }

    // 3. Dispatch browser event for active views
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('academic-grade-range-updated', { detail: newConfig })
      );
    }
  } catch (err) {
    console.error('Error saving grade range config to cloud:', err);
    throw err;
  }
}

/**
 * Helper to calculate predicate from score and config
 */
export function calculateScorePredicate(
  score: number | null | undefined,
  config: GradeRangeConfig = DEFAULT_GRADE_RANGE_CONFIG
): 'A' | 'B' | 'C' | 'D' | '-' {
  if (typeof score !== 'number' || isNaN(score) || score === null) return '-';
  if (score >= (config.minA ?? 91)) return 'A';
  if (score >= (config.minB ?? 81)) return 'B';
  if (score >= (config.minC ?? config.passingGrade ?? 75)) return 'C';
  return 'D';
}

/**
 * Helper to calculate mastery label from predicate and config
 */
export function calculateMasteryLabel(
  predicate: string,
  config: GradeRangeConfig = DEFAULT_GRADE_RANGE_CONFIG
): string {
  switch (predicate) {
    case 'A':
      return config.labels?.A || 'Sangat Baik';
    case 'B':
      return config.labels?.B || 'Baik';
    case 'C':
      return config.labels?.C || 'Cukup';
    case 'D':
      return config.labels?.D || 'Perlu Bimbingan';
    default:
      return '-';
  }
}
