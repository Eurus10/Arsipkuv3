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

/**
 * Fetch Global Grade Range Config
 * Reads LocalStorage cache first, then Firestore
 */
export async function fetchGradeRangeConfig(): Promise<GradeRangeConfig> {
  let config: GradeRangeConfig = { ...DEFAULT_GRADE_RANGE_CONFIG };

  // 1. LocalStorage cache
  try {
    const raw = localStorage.getItem(GLOBAL_GRADE_RANGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        config = {
          ...DEFAULT_GRADE_RANGE_CONFIG,
          ...parsed,
          labels: {
            ...DEFAULT_GRADE_RANGE_CONFIG.labels,
            ...(parsed.labels || {}),
          },
        };
      }
    }
  } catch (err) {
    console.warn('Error reading local grade range config:', err);
  }

  // 2. Cloud Firestore
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
        localStorage.setItem(GLOBAL_GRADE_RANGE_KEY, JSON.stringify(config));
      }
    }
  } catch (err) {
    console.warn('Could not fetch grade range config from cloud, using cached:', err);
  }

  return config;
}

/**
 * Save Global Grade Range Config
 */
export async function saveGradeRangeConfig(
  newConfig: GradeRangeConfig
): Promise<void> {
  // 1. LocalStorage
  try {
    localStorage.setItem(GLOBAL_GRADE_RANGE_KEY, JSON.stringify(newConfig));
  } catch (err) {
    console.error('Error saving local grade range config:', err);
  }

  // 2. Cloud Firestore
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
