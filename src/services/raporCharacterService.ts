import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { recordQuotaUsage } from './quotaTracker';
import {
  CharacterDescriptor,
  CharacterPredicate,
  StudentCharacterRecord,
  StudentCharacterScore,
  DEFAULT_CHARACTER_DESCRIPTORS,
} from '../types/raporSts';

export const GLOBAL_CHARACTER_DESCRIPTORS_KEY = 'sdit_rapor_sts_character_descriptors_v1';
export const LOCAL_CHARACTER_CLASS_PREFIX = 'sdit_rapor_sts_characters_';

/**
 * Fetch Global Character Descriptors (Admin Settings)
 * Checks LocalStorage first, then Cloud Firestore, with fallback to DEFAULT_CHARACTER_DESCRIPTORS
 */
export async function fetchCharacterDescriptors(): Promise<CharacterDescriptor[]> {
  let descriptors: CharacterDescriptor[] = [...DEFAULT_CHARACTER_DESCRIPTORS];

  // 1. Read from LocalStorage cache
  try {
    const raw = localStorage.getItem(GLOBAL_CHARACTER_DESCRIPTORS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        descriptors = parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading local character descriptors:', err);
  }

  // 2. Fetch from Cloud Firestore
  try {
    const docRef = doc(db, 'rapor_sts_settings', 'character_descriptors');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      recordQuotaUsage('reads', 1);
      const data = snap.data();
      if (data?.descriptors && Array.isArray(data.descriptors) && data.descriptors.length > 0) {
        descriptors = data.descriptors;
        localStorage.setItem(GLOBAL_CHARACTER_DESCRIPTORS_KEY, JSON.stringify(descriptors));
      }
    }
  } catch (err) {
    console.warn('Could not fetch character descriptors from cloud, using cached:', err);
  }

  return descriptors;
}

/**
 * Save Global Character Descriptors (Admin Settings)
 */
export async function saveCharacterDescriptors(
  descriptors: CharacterDescriptor[]
): Promise<void> {
  // 1. LocalStorage
  try {
    localStorage.setItem(GLOBAL_CHARACTER_DESCRIPTORS_KEY, JSON.stringify(descriptors));
  } catch (err) {
    console.error('Error saving local character descriptors:', err);
  }

  // 2. Cloud Firestore
  try {
    const docRef = doc(db, 'rapor_sts_settings', 'character_descriptors');
    await setDoc(
      docRef,
      {
        descriptors,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    recordQuotaUsage('writes', 1);
  } catch (err) {
    console.error('Error saving character descriptors to cloud:', err);
    throw err;
  }
}

/**
 * Load Character Records for a specific class
 */
export async function loadClassCharacterRecords(
  classKey: string
): Promise<Record<string, StudentCharacterRecord>> {
  let records: Record<string, StudentCharacterRecord> = {};

  // 1. Local cache
  try {
    const raw = localStorage.getItem(LOCAL_CHARACTER_CLASS_PREFIX + classKey);
    if (raw) {
      records = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading local character records:', err);
  }

  // 2. Cloud Firestore
  try {
    const docRef = doc(db, 'rapor_sts_characters', classKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      recordQuotaUsage('reads', 1);
      const data = snap.data();
      if (data?.records && typeof data.records === 'object') {
        records = { ...records, ...data.records };
        localStorage.setItem(LOCAL_CHARACTER_CLASS_PREFIX + classKey, JSON.stringify(records));
      }
    }
  } catch (err) {
    console.warn('Could not fetch character records from cloud, using cached:', err);
  }

  return records;
}

/**
 * Save Character Records for a specific class
 */
export async function saveClassCharacterRecords(
  classKey: string,
  records: Record<string, StudentCharacterRecord>
): Promise<void> {
  // 1. LocalStorage
  try {
    localStorage.setItem(LOCAL_CHARACTER_CLASS_PREFIX + classKey, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving local character records:', err);
  }

  // 2. Cloud Firestore
  try {
    const docRef = doc(db, 'rapor_sts_characters', classKey);
    await setDoc(
      docRef,
      {
        classKey,
        records,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    recordQuotaUsage('writes', 1);
  } catch (err) {
    console.error('Error saving character records to cloud:', err);
    // Don't re-throw if local save succeeded to keep UI responsive
  }
}

/**
 * Helper to generate default character scores for a student given a uniform predicate (e.g., 'B')
 */
export function generateDefaultStudentCharacterScores(
  descriptors: CharacterDescriptor[],
  predicate: CharacterPredicate = 'B'
): Record<string, StudentCharacterScore> {
  const result: Record<string, StudentCharacterScore> = {};
  for (const desc of descriptors) {
    result[desc.id] = {
      predicate,
      description: desc.indicators[predicate] || '',
      customized: false,
    };
  }
  return result;
}
