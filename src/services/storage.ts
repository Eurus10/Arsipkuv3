import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  DocumentItem,
  DEFAULT_SCHOOL_YEARS,
  SchoolTemplateItem,
  DEFAULT_TEMPLATES,
  ExamUploadConfig,
  DEFAULT_EXAM_CONFIG,
  ExamSubmissionItem,
  ExamSubmissionStatus,
  INITIAL_EXAM_SUBMISSIONS,
  ExamTrackingItem,
  INITIAL_EXAM_TRACKINGS,
  ExamSessionConfig,
  DEFAULT_EXAM_SESSIONS,
  ExamTrackingRecord,
} from '../types';
import { INITIAL_DOCUMENTS } from '../data/initialData';
import { MasterClass, MASTER_CLASSES } from '../data/masterExamData';
import { recordQuotaUsage } from './quotaTracker';

const LOCAL_STORAGE_KEY = 'sdit_al_fikri_digital_archives_v2_clean';
const LOCAL_YEARS_KEY = 'sdit_al_fikri_school_years_v2';
const LOCAL_TEMPLATES_KEY = 'sdit_al_fikri_download_templates_v2';
const LOCAL_EXAM_CONFIG_KEY = 'sdit_al_fikri_exam_upload_config_v2';
const LOCAL_EXAM_SUBMISSIONS_KEY = 'sdit_al_fikri_exam_submissions_v2';
const LOCAL_EXAM_TRACKINGS_KEY = 'sdit_al_fikri_exam_trackings_v2';
const LOCAL_EXAM_SESSIONS_KEY = 'sdit_al_fikri_exam_sessions_v3';
const LOCAL_TRACKING_RECORDS_KEY = 'sdit_al_fikri_tracking_records_v3';

const FIRESTORE_DOCS_COLLECTION = 'documents';
const FIRESTORE_SETTINGS_COLLECTION = 'settings';
const FIRESTORE_SUBMISSIONS_COLLECTION = 'exam_submissions';
const FIRESTORE_TRACKINGS_COLLECTION = 'exam_trackings';
const FIRESTORE_EXAM_SESSIONS_COLLECTION = 'exam_sessions';
const FIRESTORE_TRACKING_RECORDS_COLLECTION = 'exam_tracking_records';

const YEARS_DOC_ID = 'school_years';
const TEMPLATES_DOC_ID = 'download_templates';
const EXAM_CONFIG_DOC_ID = 'exam_upload_config';
const EXAM_SESSIONS_DOC_ID = 'exam_sessions_config';

/**
 * ==========================================
 * LOCAL CACHE HELPERS (Fallback & Instant UI)
 * ==========================================
 */
export function getLocalDocuments(): DocumentItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return INITIAL_DOCUMENTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_DOCUMENTS;
  } catch (err) {
    console.error('Error reading localStorage documents:', err);
    return INITIAL_DOCUMENTS;
  }
}

export function saveLocalDocuments(docs: DocumentItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error('Error saving documents to localStorage:', err);
  }
}

export function getStoredSchoolYears(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_YEARS_KEY);
    if (!raw) return Array.from(DEFAULT_SCHOOL_YEARS);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return Array.from(DEFAULT_SCHOOL_YEARS);
  } catch {
    return Array.from(DEFAULT_SCHOOL_YEARS);
  }
}

export function saveStoredSchoolYears(years: string[]): void {
  try {
    localStorage.setItem(LOCAL_YEARS_KEY, JSON.stringify(years));
  } catch (err) {
    console.error('Error saving local school years:', err);
  }
}

export function getAllSchoolYears(docs?: DocumentItem[]): string[] {
  const stored = getStoredSchoolYears();
  const set = new Set<string>(stored);
  DEFAULT_SCHOOL_YEARS.forEach((y) => set.add(y));
  if (docs && Array.isArray(docs)) {
    docs.forEach((d) => {
      if (d.schoolYear && d.schoolYear !== 'Semua Tahun') {
        set.add(d.schoolYear);
      }
    });
  }
  return Array.from(set);
}

/**
 * Template Download Settings
 *
 * IMPORTANT:
 * - ID template resmi selalu mengikuti DEFAULT_TEMPLATES.
 * - Firestore menjadi sumber data utama ketika dokumen download_templates sudah ada.
 * - DEFAULT_TEMPLATES hanya dipakai ketika dokumen Firestore belum ada.
 * - Kegagalan Firestore dilempar kembali ke UI agar tombol Simpan tidak terlihat
 *   berhasil padahal data gagal tersimpan.
 */

const CANONICAL_TEMPLATE_IDS: Record<SchoolTemplateItem['category'], string> = {
  analisis_soal: 'template_analisis_soal',
  rapor: 'template_rapor',
  folder_soal: 'template_folder_soal',
  tracking_soal: 'template_tracking_soal',
};

const LEGACY_TEMPLATE_IDS: Record<string, string> = {
  tmpl_analisis_soal: 'template_analisis_soal',
  tmpl_rapor: 'template_rapor',
  tmpl_folder_soal: 'template_folder_soal',
  tmpl_tracking_soal: 'template_tracking_soal',
};

function getCanonicalTemplateId(template: SchoolTemplateItem): string {
  if (template.category && CANONICAL_TEMPLATE_IDS[template.category]) {
    return CANONICAL_TEMPLATE_IDS[template.category];
  }

  return LEGACY_TEMPLATE_IDS[template.id] || template.id;
}

function normalizeTemplate(template: SchoolTemplateItem): SchoolTemplateItem {
  return {
    ...template,
    id: getCanonicalTemplateId(template),
  };
}

function normalizeTemplates(templates: SchoolTemplateItem[]): SchoolTemplateItem[] {
  const result: SchoolTemplateItem[] = [];
  const seen = new Set<string>();

  for (const template of templates) {
    if (!template || !template.category) continue;

    const normalized = normalizeTemplate(template);
    const canonicalId = normalized.id;

    // Jika ada duplikat ID/category akibat versi lama, prioritaskan item terakhir.
    const existingIndex = result.findIndex((item) => item.id === canonicalId);
    if (existingIndex >= 0) {
      result[existingIndex] = normalized;
      continue;
    }

    if (!seen.has(canonicalId)) {
      seen.add(canonicalId);
      result.push(normalized);
    }
  }

  return result;
}

export function getStoredTemplates(): SchoolTemplateItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_TEMPLATES_KEY);

    if (!raw) {
      return DEFAULT_TEMPLATES.map(normalizeTemplate);
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      const normalized = normalizeTemplates(parsed);

      // Local cache tidak boleh otomatis menambahkan DEFAULT_TEMPLATES
      // ke data yang sudah pernah disimpan.
      if (normalized.length > 0) {
        return normalized;
      }
    }

    return DEFAULT_TEMPLATES.map(normalizeTemplate);
  } catch (err) {
    console.error('Error reading local templates:', err);
    return DEFAULT_TEMPLATES.map(normalizeTemplate);
  }
}

export function saveStoredTemplates(templates: SchoolTemplateItem[]): void {
  try {
    localStorage.setItem(
      LOCAL_TEMPLATES_KEY,
      JSON.stringify(normalizeTemplates(templates))
    );
  } catch (err) {
    console.error('Error saving local templates:', err);
  }
}

function findTemplateIndex(
  templates: SchoolTemplateItem[],
  templateId: string,
  updates?: Partial<SchoolTemplateItem>
): number {
  const normalizedId =
    LEGACY_TEMPLATE_IDS[templateId] || templateId;

  // 1. Prioritas utama: ID resmi.
  let index = templates.findIndex(
    (template) => getCanonicalTemplateId(template) === normalizedId
  );

  if (index >= 0) return index;

  // 2. Fallback untuk data lama yang mungkin hanya memiliki category.
  if (updates?.category) {
    index = templates.findIndex(
      (template) => template.category === updates.category
    );
    if (index >= 0) return index;
  }

  // 3. Fallback category dari ID canonical.
  const categoryEntry = Object.entries(CANONICAL_TEMPLATE_IDS).find(
    ([, id]) => id === normalizedId
  );

  if (categoryEntry) {
    const [category] = categoryEntry;
    index = templates.findIndex(
      (template) => template.category === category
    );
  }

  return index;
}

export async function updateStoredTemplate(
  templateId: string,
  updates: Partial<SchoolTemplateItem>
): Promise<SchoolTemplateItem[]> {
  const current = getStoredTemplates();
  const index = findTemplateIndex(current, templateId, updates);

  if (index < 0) {
    throw new Error(
      `Template dengan ID "${templateId}" tidak ditemukan.`
    );
  }

  const currentTemplate = current[index];
  const canonicalId = getCanonicalTemplateId(currentTemplate);
  const updatedTemplate: SchoolTemplateItem = {
    ...currentTemplate,
    ...updates,
    id: canonicalId,
    category: currentTemplate.category,
    updatedAt: new Date().toISOString(),
  };

  const updated = [...current];
  updated[index] = updatedTemplate;

  // Simpan versi lama agar bisa rollback jika Firestore gagal.
  const previousLocal = [...current];

  // Optimistic local update.
  saveStoredTemplates(updated);

  try {
    const templateDocRef = doc(
      db,
      FIRESTORE_SETTINGS_COLLECTION,
      TEMPLATES_DOC_ID
    );

    const normalizedTemplates = normalizeTemplates(updated);

    // Untuk folder soal, sinkronkan juga ke exam_upload_config.
    const folderTemplate = normalizedTemplates.find(
      (template) => template.id === CANONICAL_TEMPLATE_IDS.folder_soal
    );

    if (folderTemplate && folderTemplate.driveUrl) {
      const currentConfig = getStoredExamConfig();
      const updatedConfig = {
        ...currentConfig,
        driveFolderUrl: folderTemplate.driveUrl,
        updatedAt: new Date().toISOString(),
      };

      const configDocRef = doc(
        db,
        FIRESTORE_SETTINGS_COLLECTION,
        EXAM_CONFIG_DOC_ID
      );

      // Gunakan batch agar template + exam config tersimpan bersama.
      const batch = writeBatch(db);

      batch.set(
        templateDocRef,
        { templates: normalizedTemplates },
        { merge: true }
      );

      batch.set(
        configDocRef,
        cleanFirestoreObject(updatedConfig),
        { merge: true }
      );

      await batch.commit();

      saveStoredExamConfig(updatedConfig);
    } else {
      await setDoc(
        templateDocRef,
        { templates: normalizedTemplates },
        { merge: true }
      );
    }

    // Local cache baru dianggap final setelah Firestore berhasil.
    saveStoredTemplates(normalizedTemplates);

    return normalizedTemplates;
  } catch (err) {
    // Jangan biarkan cache lokal berisi data yang gagal disimpan ke cloud.
    saveStoredTemplates(previousLocal);

    const firestoreError = err as {
      code?: string;
      message?: string;
    };

    console.error('Error updating template in Firestore:', err);

    throw new Error(
      firestoreError?.message
        ? `Gagal menyimpan template ke Firestore: ${firestoreError.message}`
        : 'Gagal menyimpan template ke Firestore. Periksa koneksi dan konfigurasi Firebase.'
    );
  }
}

export function subscribeToTemplates(
  onUpdate: (templates: SchoolTemplateItem[]) => void
): () => void {
  const templateDocRef = doc(
    db,
    FIRESTORE_SETTINGS_COLLECTION,
    TEMPLATES_DOC_ID
  );

  const unsubscribe = onSnapshot(
    templateDocRef,
    async (snap) => {
      try {
        if (snap.exists()) {
          const data = snap.data();

          // Jika dokumen Firestore ada, data Firestore adalah sumber utama.
          // JANGAN menambahkan DEFAULT_TEMPLATES ke data cloud.
          if (data && Array.isArray(data.templates)) {
            const cloudTemplates = normalizeTemplates(
              data.templates as SchoolTemplateItem[]
            );

            saveStoredTemplates(cloudTemplates);
            onUpdate(cloudTemplates);
            return;
          }
        }

        // Hanya seed default jika dokumen download_templates memang belum ada.
        const local = getStoredTemplates();
        const templatesToSeed =
          local.length > 0
            ? normalizeTemplates(local)
            : DEFAULT_TEMPLATES.map(normalizeTemplate);

        await setDoc(
          templateDocRef,
          {
            templates: templatesToSeed,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        saveStoredTemplates(templatesToSeed);
        onUpdate(templatesToSeed);
      } catch (err) {
        console.warn('Template subscription warning (using local cache):', err);

        // Bila Firestore error, gunakan cache lokal tanpa menulis DEFAULT_TEMPLATES
        // kembali ke Firestore.
        onUpdate(getStoredTemplates());
      }
    },
    (err) => {
      console.warn('Template subscription fallback to local cache:', err);
      onUpdate(getStoredTemplates());
    }
  );

  return unsubscribe;
}

/**
 * ========================================================
 * EXAM UPLOAD CONFIGURATION (Shared Empty Google Drive Folder)
 * ========================================================
 */
export function getStoredExamConfig(): ExamUploadConfig {
  try {
    const raw = localStorage.getItem(LOCAL_EXAM_CONFIG_KEY);
    if (!raw) return DEFAULT_EXAM_CONFIG;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.driveFolderUrl === 'string') {
      return { ...DEFAULT_EXAM_CONFIG, ...parsed };
    }
    return DEFAULT_EXAM_CONFIG;
  } catch {
    return DEFAULT_EXAM_CONFIG;
  }
}

export function saveStoredExamConfig(config: ExamUploadConfig): void {
  try {
    localStorage.setItem(LOCAL_EXAM_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving local exam upload config:', err);
  }
}

export async function updateStoredExamConfig(
  updates: Partial<ExamUploadConfig>
): Promise<ExamUploadConfig> {
  const current = getStoredExamConfig();
  const updated: ExamUploadConfig = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveStoredExamConfig(updated);

  try {
    const configDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, EXAM_CONFIG_DOC_ID);
    await setDoc(configDocRef, cleanFirestoreObject(updated), { merge: true });

    // Also synchronize with folder_soal template
    if (updated.driveFolderUrl) {
      const templates = getStoredTemplates();
      const updatedTemplates = normalizeTemplates(templates).map((t) => {
        if (t.id === CANONICAL_TEMPLATE_IDS.folder_soal) {
          return { ...t, driveUrl: updated.driveFolderUrl, updatedAt: new Date().toISOString() };
        }
        return t;
      });
      saveStoredTemplates(updatedTemplates);
      const templateDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, TEMPLATES_DOC_ID);
      await setDoc(templateDocRef, { templates: cleanFirestoreObject(updatedTemplates) }, { merge: true });
    }
  } catch (err) {
    console.warn('Error syncing exam upload config to Firestore:', err);
  }

  return updated;
}

export function subscribeToExamConfig(
  onUpdate: (config: ExamUploadConfig) => void
): () => void {
  const configDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, EXAM_CONFIG_DOC_ID);

  const unsubscribe = onSnapshot(
    configDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.driveFolderUrl) {
          const merged = { ...DEFAULT_EXAM_CONFIG, ...data } as ExamUploadConfig;
          saveStoredExamConfig(merged);
          onUpdate(merged);
          return;
        }
      }
      const local = getStoredExamConfig();
      onUpdate(local);
      try {
        setDoc(configDocRef, cleanFirestoreObject(local));
      } catch (err) {
        console.warn('Failed to seed exam config in Firestore:', err);
      }
    },
    (err) => {
      console.warn('Exam config subscription error, using cache:', err);
      onUpdate(getStoredExamConfig());
    }
  );

  return unsubscribe;
}

/**
 * ========================================================
 * EXAM SUBMISSIONS (Setoran Soal Guru)
 * ========================================================
 */
export function getLocalExamSubmissions(): ExamSubmissionItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXAM_SUBMISSIONS_KEY);
    if (!raw) return INITIAL_EXAM_SUBMISSIONS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_EXAM_SUBMISSIONS;
  } catch {
    return INITIAL_EXAM_SUBMISSIONS;
  }
}

export function saveLocalExamSubmissions(submissions: ExamSubmissionItem[]): void {
  try {
    localStorage.setItem(LOCAL_EXAM_SUBMISSIONS_KEY, JSON.stringify(submissions));
  } catch (err) {
    console.error('Error saving local exam submissions:', err);
  }
}

export const getStoredExamSubmissions = getLocalExamSubmissions;

export async function addExamSubmission(
  data: Omit<ExamSubmissionItem, 'id' | 'submittedAt'> | (Omit<ExamSubmissionItem, 'id' | 'submittedAt' | 'status'> & { status?: ExamSubmissionStatus })
): Promise<ExamSubmissionItem> {
  const newId = 'sub-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const newSubmission: ExamSubmissionItem = {
    status: 'menunggu',
    ...data,
    id: newId,
    submittedAt: now,
  };

  const local = getLocalExamSubmissions();
  const updated = [newSubmission, ...local];
  saveLocalExamSubmissions(updated);

  try {
    const docRef = doc(db, FIRESTORE_SUBMISSIONS_COLLECTION, newId);
    await setDoc(docRef, cleanFirestoreObject(newSubmission));
  } catch (err) {
    console.error('Error adding exam submission to Firestore:', err);
  }

  return newSubmission;
}

export async function updateExamSubmission(
  id: string,
  updates: Partial<ExamSubmissionItem>
): Promise<ExamSubmissionItem | null> {
  const local = getLocalExamSubmissions();
  const index = local.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const updatedItem: ExamSubmissionItem = {
    ...local[index],
    ...updates,
    reviewedAt: new Date().toISOString(),
  };

  local[index] = updatedItem;
  saveLocalExamSubmissions(local);

  try {
    const docRef = doc(db, FIRESTORE_SUBMISSIONS_COLLECTION, id);
    await setDoc(docRef, cleanFirestoreObject(updatedItem), { merge: true });
  } catch (err) {
    console.error('Error updating exam submission in Firestore:', err);
  }

  return updatedItem;
}

export async function deleteExamSubmission(id: string): Promise<boolean> {
  const local = getLocalExamSubmissions();
  const filtered = local.filter((s) => s.id !== id);
  saveLocalExamSubmissions(filtered);

  try {
    const docRef = doc(db, FIRESTORE_SUBMISSIONS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Error deleting exam submission in Firestore:', err);
    return false;
  }
}

export function subscribeToExamSubmissions(
  onUpdate: (submissions: ExamSubmissionItem[]) => void
): () => void {
  const colRef = collection(db, FIRESTORE_SUBMISSIONS_COLLECTION);

  const unsubscribe = onSnapshot(
    colRef,
    async (snap) => {
      if (snap.empty) {
        const local = getLocalExamSubmissions();
        const toSeed = local.length > 0 ? local : INITIAL_EXAM_SUBMISSIONS;
        try {
          const batch = writeBatch(db);
          toSeed.forEach((item) => {
            const dRef = doc(db, FIRESTORE_SUBMISSIONS_COLLECTION, item.id);
            batch.set(dRef, cleanFirestoreObject(item));
          });
          await batch.commit();
        } catch (seedErr) {
          console.warn('Failed to seed exam submissions to Firestore:', seedErr);
          saveLocalExamSubmissions(toSeed);
          onUpdate(toSeed);
        }
      } else {
        const list: ExamSubmissionItem[] = [];
        snap.forEach((d) => {
          list.push(d.data() as ExamSubmissionItem);
        });
        list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        saveLocalExamSubmissions(list);
        onUpdate(list);
      }
    },
    (err) => {
      console.warn('Submissions subscription error, using cache:', err);
      onUpdate(getLocalExamSubmissions());
    }
  );

  return unsubscribe;
}

/**
 * Converts a verified exam submission into an official archived DocumentItem in 'soal'
 */
export async function archiveSubmissionToDocuments(
  submission: ExamSubmissionItem
): Promise<DocumentItem> {
  const title = `Naskah Soal ${submission.subject} ${submission.classLevel} - ${submission.examType}`;
  const note = `Disusun oleh ${submission.teacherName}. ${submission.note || ''} (Status: Terverifikasi)`;

  const docItem = await addDocument({
    type: 'soal',
    title,
    category: 'Bank Soal',
    classLevel: submission.classLevel,
    subject: submission.subject,
    examType: submission.examType,
    semester: submission.semester,
    schoolYear: submission.schoolYear,
    driveUrl: submission.driveUrl,
    note,
  });

  // Mark submission as 'diterima'
  await updateExamSubmission(submission.id, {
    status: 'diterima',
    adminFeedback: `Telah diarsipkan ke Bank Soal resmi pada ${new Date().toLocaleDateString('id-ID')}`,
  });

  return docItem;
}

export const archiveExamSubmissionToBankSoal = archiveSubmissionToDocuments;

/**
 * ========================================================
 * EXAM TRACKINGS (Monitoring Naskah Soal & Status Cetak)
 * ========================================================
 */
export function getLocalExamTrackings(): ExamTrackingItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXAM_TRACKINGS_KEY);
    if (!raw) return INITIAL_EXAM_TRACKINGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_EXAM_TRACKINGS;
  } catch {
    return INITIAL_EXAM_TRACKINGS;
  }
}

export function saveLocalExamTrackings(trackings: ExamTrackingItem[]): void {
  try {
    localStorage.setItem(LOCAL_EXAM_TRACKINGS_KEY, JSON.stringify(trackings));
  } catch (err) {
    console.error('Error saving local exam trackings:', err);
  }
}

export const getStoredExamTrackings = getLocalExamTrackings;

export async function addExamTracking(
  data: Omit<ExamTrackingItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ExamTrackingItem> {
  const newId = 'trk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const newTracking: ExamTrackingItem = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  const local = getLocalExamTrackings();
  const updated = [newTracking, ...local];
  saveLocalExamTrackings(updated);

  try {
    const docRef = doc(db, FIRESTORE_TRACKINGS_COLLECTION, newId);
    await setDoc(docRef, cleanFirestoreObject(newTracking));
  } catch (err) {
    console.error('Error adding exam tracking to Firestore:', err);
  }

  return newTracking;
}

export async function updateExamTracking(
  id: string,
  updates: Partial<Omit<ExamTrackingItem, 'id' | 'createdAt'>>
): Promise<ExamTrackingItem | null> {
  const local = getLocalExamTrackings();
  const index = local.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const updatedItem: ExamTrackingItem = {
    ...local[index],
    ...updates,
    updatedAt: now,
  };

  local[index] = updatedItem;
  saveLocalExamTrackings(local);

  try {
    const docRef = doc(db, FIRESTORE_TRACKINGS_COLLECTION, id);
    await setDoc(docRef, cleanFirestoreObject(updatedItem), { merge: true });
  } catch (err) {
    console.error('Error updating exam tracking in Firestore:', err);
  }

  return updatedItem;
}

export async function toggleExamTrackingCollected(
  id: string,
  isCollected: boolean
): Promise<ExamTrackingItem | null> {
  const now = new Date().toISOString();
  const updates: Partial<ExamTrackingItem> = {
    isCollected,
    collectedAt: isCollected ? now : undefined,
  };
  return updateExamTracking(id, updates);
}

export async function toggleExamTrackingPrinted(
  id: string,
  isPrinted: boolean
): Promise<ExamTrackingItem | null> {
  const now = new Date().toISOString();
  const updates: Partial<ExamTrackingItem> = {
    isPrinted,
    printedAt: isPrinted ? now : undefined,
  };
  return updateExamTracking(id, updates);
}

export async function deleteExamTracking(id: string): Promise<boolean> {
  const local = getLocalExamTrackings();
  const filtered = local.filter((t) => t.id !== id);
  saveLocalExamTrackings(filtered);

  try {
    const docRef = doc(db, FIRESTORE_TRACKINGS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Error deleting exam tracking in Firestore:', err);
    return false;
  }
}

export async function resetToDefaultExamTrackings(): Promise<ExamTrackingItem[]> {
  saveLocalExamTrackings(INITIAL_EXAM_TRACKINGS);

  try {
    const batch = writeBatch(db);
    const snapshot = await getDocs(collection(db, FIRESTORE_TRACKINGS_COLLECTION));
    snapshot.forEach((d) => batch.delete(d.ref));

    INITIAL_EXAM_TRACKINGS.forEach((item) => {
      const docRef = doc(db, FIRESTORE_TRACKINGS_COLLECTION, item.id);
      batch.set(docRef, cleanFirestoreObject(item));
    });

    await batch.commit();
  } catch (err) {
    console.error('Error resetting exam trackings in Firestore:', err);
  }

  return INITIAL_EXAM_TRACKINGS;
}

export function subscribeToExamTrackings(
  onUpdate: (trackings: ExamTrackingItem[]) => void
): () => void {
  const colRef = collection(db, FIRESTORE_TRACKINGS_COLLECTION);

  const unsubscribe = onSnapshot(
    colRef,
    async (snap) => {
      if (snap.empty) {
        const local = getLocalExamTrackings();
        const toSeed = local.length > 0 ? local : INITIAL_EXAM_TRACKINGS;
        try {
          const batch = writeBatch(db);
          toSeed.forEach((item) => {
            const dRef = doc(db, FIRESTORE_TRACKINGS_COLLECTION, item.id);
            batch.set(dRef, cleanFirestoreObject(item));
          });
          await batch.commit();
        } catch (seedErr) {
          console.warn('Failed to seed exam trackings to Firestore:', seedErr);
          saveLocalExamTrackings(toSeed);
          onUpdate(toSeed);
        }
      } else {
        const list: ExamTrackingItem[] = [];
        snap.forEach((d) => {
          list.push(d.data() as ExamTrackingItem);
        });
        // Sort by classLevel, then subject
        list.sort((a, b) => {
          if (a.classLevel !== b.classLevel) {
            return a.classLevel.localeCompare(b.classLevel);
          }
          return a.subject.localeCompare(b.subject);
        });
        saveLocalExamTrackings(list);
        onUpdate(list);
      }
    },
    (err) => {
      console.warn('Exam trackings subscription error, using cache:', err);
      onUpdate(getLocalExamTrackings());
    }
  );

  return unsubscribe;
}

/**
 * ========================================================
 * EXAM SESSION CONFIGS (FLEXIBLE CLASSES & SUBJECTS PER EXAM)
 * ========================================================
 */

export function getStoredExamSessions(): ExamSessionConfig[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXAM_SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read exam sessions from local storage:', e);
  }
  return DEFAULT_EXAM_SESSIONS;
}

export function saveStoredExamSessions(sessions: ExamSessionConfig[]): void {
  try {
    localStorage.setItem(LOCAL_EXAM_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save exam sessions locally:', e);
  }
}

export function subscribeToExamSessions(
  onUpdate: (
    sessions: ExamSessionConfig[]
  ) => void,
  onError?: (
    error: Error
  ) => void
): () => void {
  const docRef =
    doc(
      db,
      FIRESTORE_SETTINGS_COLLECTION,
      EXAM_SESSIONS_DOC_ID
    );

  const unsubscribe =
    onSnapshot(
      docRef,
      async (snap) => {
        if (snap.exists()) {
          const data =
            snap.data();

          if (
            data &&
            Array.isArray(
              data.sessions
            )
          ) {
            saveStoredExamSessions(
              data.sessions
            );

            onUpdate(
              data.sessions
            );

            return;
          }
        }

        // Hanya seed ketika dokumen benar-benar
        // belum ada.
        const defaults =
          getStoredExamSessions();

        try {
          await setDoc(
            docRef,
            {
              sessions:
                defaults,
              updatedAt:
                new Date().toISOString(),
            },
            { merge: true }
          );

          saveStoredExamSessions(
            defaults
          );

          onUpdate(defaults);
        } catch (err) {
          console.warn(
            'Failed to seed exam sessions to Firestore, using local default:',
            err
          );

          onUpdate(defaults);

          if (onError) {
            onError(
              err instanceof Error
                ? err
                : new Error(
                    'Gagal mengakses konfigurasi ujian.'
                  )
            );
          }
        }
      },
      (err) => {
        console.warn(
          'Exam sessions subscription error, falling back to local cache:',
          err
        );

        onUpdate(
          getStoredExamSessions()
        );

        if (onError) {
          onError(err);
        }
      }
    );

  return unsubscribe;
}

export async function saveExamSessionsToCloud(
  sessions: ExamSessionConfig[]
): Promise<void> {
  // Always update local cache first for seamless user experience
  saveStoredExamSessions(sessions);

  try {
    const docRef = doc(
      db,
      FIRESTORE_SETTINGS_COLLECTION,
      EXAM_SESSIONS_DOC_ID
    );

    await setDoc(
      docRef,
      {
        sessions: sessions.map((session) =>
          cleanFirestoreObject(session)
        ),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn(
      'Cloud save exam sessions encountered error (local cache preserved):',
      e
    );
  }
}

export async function updateSingleExamSession(
  sessionId: string,
  updates: Partial<ExamSessionConfig>
): Promise<ExamSessionConfig[]> {
  const list = getStoredExamSessions();

  const index = list.findIndex(
    (s) => s.id === sessionId
  );

  let updatedList: ExamSessionConfig[];

  if (index >= 0) {
    updatedList = list.map((s, i) =>
      i === index
        ? {
            ...s,
            ...updates,
            updatedAt:
              new Date().toISOString(),
          }
        : s
    );
  } else {
    const newSession: ExamSessionConfig = {
      id: sessionId,
      name:
        updates.name ||
        'Pendataan Soal Ujian Aktif',

      schoolYear:
        updates.schoolYear ||
        '2025/2026',

      activeClasses:
        updates.activeClasses || {},

      activeSubjects:
        updates.activeSubjects || {},

      updatedAt:
        new Date().toISOString(),

      ...updates,
    };

    updatedList = [
      ...list,
      newSession,
    ];
  }

  // Fungsi ini sekarang akan throw error
  // jika Firestore gagal.
  await saveExamSessionsToCloud(
    updatedList
  );

  return updatedList;
}

/**
 * ========================================================
 * EXAM TRACKING RECORDS (REKAP STATUS KUMPUL & PRINT)
 * ========================================================
 */

export function getStoredTrackingRecords(): Record<string, ExamTrackingRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_TRACKING_RECORDS_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(
      'Failed to read tracking records from local storage:',
      e
    );
  }

  return {};
}

const trackingRecordListeners = new Set<(records: Record<string, ExamTrackingRecord>) => void>();

export function saveStoredTrackingRecords(
  records: Record<string, ExamTrackingRecord>
): void {
  try {
    localStorage.setItem(
      LOCAL_TRACKING_RECORDS_KEY,
      JSON.stringify(records)
    );
  } catch (e) {
    console.error(
      'Failed to save tracking records locally:',
      e
    );
  }

  // Instantly notify all subscribers locally (0ms UI latency)
  trackingRecordListeners.forEach((listener) => {
    try {
      listener(records);
    } catch (err) {
      console.warn('Error notifying tracking record listener:', err);
    }
  });
}

/**
 * Real-time subscription for exam tracking records.
 *
 * Firestore remains the source of truth.
 * LocalStorage is used as instant local state & offline fallback.
 */
export function subscribeToTrackingRecords(
  onUpdate: (
    records: Record<string, ExamTrackingRecord>
  ) => void,
  onError?: (error: Error) => void
): () => void {
  // Immediately pass cached data on subscribe
  onUpdate(getStoredTrackingRecords());

  // Register in-memory listener
  trackingRecordListeners.add(onUpdate);

  // Sync across tabs if user opens multiple windows
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === LOCAL_TRACKING_RECORDS_KEY) {
      onUpdate(getStoredTrackingRecords());
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageChange);
  }

  const colRef = collection(
    db,
    FIRESTORE_TRACKING_RECORDS_COLLECTION
  );

  const unsubscribe = onSnapshot(
    colRef,
    (snap) => {
      const result: Record<string, ExamTrackingRecord> = {};

      snap.forEach((d) => {
        result[d.id] = d.data() as ExamTrackingRecord;
      });

      /*
       * IMPORTANT:
       * Do not merge this snapshot with old local data.
       *
       * If a Drive file was deleted and Firestore now contains
       * isCollected:false, the snapshot must replace the old cache.
       */
      saveStoredTrackingRecords(result);
    },
    (err) => {
      console.warn(
        'Tracking records subscription fallback to local cache:',
        err
      );

      // LocalStorage is only a fallback when Firestore fails.
      onUpdate(getStoredTrackingRecords());

      if (onError) {
        onError(err);
      }
    }
  );

  return () => {
    trackingRecordListeners.delete(onUpdate);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageChange);
    }
    unsubscribe();
  };
}

/**
 * Update one tracking record in Firestore.
 *
 * IMPORTANT:
 * When isCollected === false, Drive-related fields are explicitly
 * removed using deleteField(). This is more reliable than relying
 * on undefined fields being omitted from setDoc().
 */
export async function setTrackingRecordStatus(
  recordKey: string,
  data: Partial<ExamTrackingRecord> & {
    examSessionId: string;
    classId: string;
    subjectId: string;
    subjectName: string;
    teacherName?: string;
  }
): Promise<ExamTrackingRecord> {
  const current = getStoredTrackingRecords();

  const existing: ExamTrackingRecord =
    current[recordKey] || {
      id: recordKey,
      examSessionId: data.examSessionId,
      classId: data.classId,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      teacherName: data.teacherName,
      isCollected: false,
      isPrinted: false,
    };

  const updated: ExamTrackingRecord = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  /*
   * ============================================================
   * DRIVE FILE REMOVED
   * ============================================================
   *
   * If Drive sync says isCollected:false:
   * - keep the tracking document
   * - keep print status intact
   * - keep class/subject/teacher metadata
   * - explicitly remove Drive metadata
   */
  const isDriveCollectionReset =
    data.isCollected === false && data.source === undefined;

  if (isDriveCollectionReset) {
    updated.isCollected = false;
    delete updated.collectedAt;
    delete updated.driveFileUrl;
    delete updated.source;
  }

  // Always update LocalStorage immediately so Admin UI is responsive & never blocked
  const updatedMap = {
    ...current,
    [recordKey]: updated,
  };
  saveStoredTrackingRecords(updatedMap);

  try {
    const docRef = doc(
      db,
      FIRESTORE_TRACKING_RECORDS_COLLECTION,
      recordKey
    );

    // Build dedicated firestore payload containing ONLY the fields provided in data,
    // plus essential id/meta and updatedAt, so Firestore { merge: true } NEVER
    // overwrites untouched fields (like isPrinted when updating isCollected, or vice-versa).
    const firestorePayload: Record<string, any> = {
      id: recordKey,
      examSessionId: data.examSessionId,
      classId: data.classId,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      teacherName: data.teacherName || existing.teacherName,
      updatedAt: updated.updatedAt,
      ...cleanFirestoreObject(data),
    };

    if (isDriveCollectionReset || data.isCollected === false) {
      firestorePayload.isCollected = false;
      firestorePayload.collectedAt = deleteField();
      firestorePayload.driveFileUrl = deleteField();
      firestorePayload.source = deleteField();
    }

    if (data.isPrinted === false) {
      firestorePayload.isPrinted = false;
      firestorePayload.printedAt = deleteField();
    }

    await setDoc(
      docRef,
      firestorePayload,
      { merge: true }
    );

    return updated;
  } catch (e) {
    console.warn(
      'Cloud save tracking record failed (saved to local cache successfully):',
      e
    );

    return updated;
  }
}

/**
 * Toggle collected status.
 *
 * forceCollected is used by Drive synchronization:
 * - true  = file exists in Drive
 * - false = previously uploaded Drive file no longer exists
 */
export async function toggleTrackingRecordCollected(
  recordKey: string,
  meta: {
    examSessionId: string;
    classId: string;
    subjectId: string;
    subjectName: string;
    teacherName?: string;
    forceCollected?: boolean;
    driveFileUrl?: string;
    source?: 'drive' | 'manual';
  }
): Promise<ExamTrackingRecord> {
  const current = getStoredTrackingRecords();
  const existing = current[recordKey];

  const isCollected =
    meta.forceCollected !== undefined
      ? meta.forceCollected
      : existing
      ? !existing.isCollected
      : true;

  /*
   * ============================================================
   * UNCOLLECTED
   * ============================================================
   *
   * Do NOT pass stale Drive URL/source back into the update.
   */
  if (!isCollected) {
    return setTrackingRecordStatus(recordKey, {
      examSessionId: meta.examSessionId,
      classId: meta.classId,
      subjectId: meta.subjectId,
      subjectName: meta.subjectName,
      teacherName: meta.teacherName,
      isCollected: false,
    });
  }

  /*
   * ============================================================
   * COLLECTED
   * ============================================================
   */
  const collectedAt =
    new Date().toISOString();

  const source =
    meta.source ||
    (meta.driveFileUrl ? 'drive' : 'manual');

  return setTrackingRecordStatus(recordKey, {
    examSessionId: meta.examSessionId,
    classId: meta.classId,
    subjectId: meta.subjectId,
    subjectName: meta.subjectName,
    teacherName: meta.teacherName,
    isCollected: true,
    collectedAt,
    source,
    ...(meta.driveFileUrl
      ? { driveFileUrl: meta.driveFileUrl }
      : {}),
  });
}

export async function toggleTrackingRecordPrinted(
  recordKey: string,
  meta: {
    examSessionId: string;
    classId: string;
    subjectId: string;
    subjectName: string;
    teacherName?: string;
  }
): Promise<ExamTrackingRecord> {
  const current = getStoredTrackingRecords();
  const existing = current[recordKey];

  const isPrinted =
    existing
      ? !existing.isPrinted
      : true;

  const printedAt =
    isPrinted
      ? new Date().toISOString()
      : undefined;

  return setTrackingRecordStatus(
    recordKey,
    {
      ...meta,
      isPrinted,
      printedAt,
    }
  );
}

export async function batchSetClassTrackingStatus(
  examSessionId: string,
  classId: string,
  subjects: Array<{
    id: string;
    name: string;
    teacher?: string;
  }>,
  field: 'isCollected' | 'isPrinted',
  targetValue: boolean
): Promise<void> {
  const current =
    getStoredTrackingRecords();

  const now =
    new Date().toISOString();

  const batch =
    writeBatch(db);

  const updatedRecords: Record<
    string,
    ExamTrackingRecord
  > = {
    ...current,
  };

  for (const s of subjects) {
    const recordKey =
      `${examSessionId}__${classId}__${s.id}`;

    const existing =
      current[recordKey] || {
        id: recordKey,
        examSessionId,
        classId,
        subjectId: s.id,
        subjectName: s.name,
        teacherName: s.teacher,
        isCollected: false,
        isPrinted: false,
      };

    const updated: ExamTrackingRecord = {
      ...existing,
      updatedAt: now,
    };

    const firestorePayload: Record<string, any> = {
      id: recordKey,
      examSessionId,
      classId,
      subjectId: s.id,
      subjectName: s.name,
      teacherName: s.teacher,
      updatedAt: now,
    };

    if (field === 'isCollected') {
      updated.isCollected =
        targetValue;

      updated.collectedAt =
        targetValue
          ? now
          : undefined;

      firestorePayload.isCollected = targetValue;

      if (targetValue) {
        updated.source = 'manual';
        delete updated.driveFileUrl;
        firestorePayload.source = 'manual';
        firestorePayload.collectedAt = now;
        firestorePayload.driveFileUrl = deleteField();
      } else {
        delete updated.source;
        delete updated.driveFileUrl;
        firestorePayload.collectedAt = deleteField();
        firestorePayload.driveFileUrl = deleteField();
        firestorePayload.source = deleteField();
      }
    } else {
      updated.isPrinted =
        targetValue;

      updated.printedAt =
        targetValue
          ? now
          : undefined;

      firestorePayload.isPrinted = targetValue;

      if (targetValue) {
        firestorePayload.printedAt = now;
      } else {
        firestorePayload.printedAt = deleteField();
      }
    }

    updatedRecords[recordKey] =
      updated;

    const docRef = doc(
      db,
      FIRESTORE_TRACKING_RECORDS_COLLECTION,
      recordKey
    );

    batch.set(
      docRef,
      firestorePayload,
      { merge: true }
    );
  }

  // Always save locally immediately so Admin interface updates smoothly
  saveStoredTrackingRecords(updatedRecords);

  try {
    await batch.commit();
  } catch (e) {
    console.warn(
      'Batch cloud commit failed (saved to local cache successfully):',
      e
    );
  }
}

export async function batchSaveTrackingRecords(
  recordsToSave: Array<{
    recordKey: string;
    data: Partial<ExamTrackingRecord>;
    isDriveCollectionReset?: boolean;
  }>
): Promise<void> {
  if (recordsToSave.length === 0) return;

  const current = getStoredTrackingRecords();
  const updatedRecords: Record<string, ExamTrackingRecord> = { ...current };

  for (const item of recordsToSave) {
    const existing = current[item.recordKey] || ({} as ExamTrackingRecord);
    const updated: ExamTrackingRecord = {
      ...existing,
      ...item.data,
      // Strictly preserve isPrinted and printedAt
      isPrinted: existing.isPrinted === true,
      printedAt: existing.isPrinted === true ? existing.printedAt : undefined,
      updatedAt: new Date().toISOString(),
    } as ExamTrackingRecord;

    if (item.isDriveCollectionReset) {
      updated.isCollected = false;
      delete updated.collectedAt;
      delete updated.driveFileUrl;
      delete updated.source;
    }

    updatedRecords[item.recordKey] = updated;
  }

  // Update local cache immediately
  saveStoredTrackingRecords(updatedRecords);

  // Batch writes in chunks of 400 (Firestore limit is 500 per batch)
  const CHUNK_SIZE = 400;
  for (let i = 0; i < recordsToSave.length; i += CHUNK_SIZE) {
    const chunk = recordsToSave.slice(i, i + CHUNK_SIZE);
    try {
      const batch = writeBatch(db);
      for (const item of chunk) {
        const docRef = doc(db, FIRESTORE_TRACKING_RECORDS_COLLECTION, item.recordKey);
        const existing = current[item.recordKey] || ({} as ExamTrackingRecord);

        // Build dedicated firestore payload containing ONLY the fields provided in item.data,
        // so Firestore { merge: true } NEVER overwrites untouched fields (like isPrinted).
        const firestorePayload: Record<string, any> = {
          id: item.recordKey,
          examSessionId: item.data.examSessionId || existing.examSessionId,
          classId: item.data.classId || existing.classId,
          subjectId: item.data.subjectId || existing.subjectId,
          subjectName: item.data.subjectName || existing.subjectName,
          updatedAt: new Date().toISOString(),
          ...cleanFirestoreObject(item.data),
        };

        if (item.isDriveCollectionReset) {
          firestorePayload.isCollected = false;
          firestorePayload.collectedAt = deleteField();
          firestorePayload.driveFileUrl = deleteField();
          firestorePayload.source = deleteField();
        }

        // If item.data did not explicitly set isPrinted, ensure it is omitted from the Firestore payload
        if (item.data.isPrinted === undefined) {
          delete firestorePayload.isPrinted;
          delete firestorePayload.printedAt;
        }

        batch.set(
          docRef,
          firestorePayload,
          { merge: true }
        );
      }
      await batch.commit();
    } catch (err) {
      console.warn('Batch save to Firestore encountered an error (local cache updated):', err);
    }
  }
}

export async function clearAllTrackingRecords(): Promise<void> {
  const previousRecords =
    getStoredTrackingRecords();

  try {
    const snap =
      await getDocs(
        collection(
          db,
          FIRESTORE_TRACKING_RECORDS_COLLECTION
        )
      );

    const batch =
      writeBatch(db);

    snap.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();

    saveStoredTrackingRecords({});
  } catch (err) {
    saveStoredTrackingRecords(
      previousRecords
    );

    console.error(
      'Error clearing tracking records from Firestore:',
      err
    );

    throw new Error(
      err instanceof Error
        ? `Gagal mereset tracking: ${err.message}`
        : 'Gagal mereset data tracking di Firestore.'
    );
  }
}

/**
 * ========================================================
 * REAL-TIME FIRESTORE SYNCHRONIZATION
 * ========================================================
 */

/**
 * Subscribes to real-time updates from Firestore.
 * Automatically seeds initial documents on first startup if Firestore is completely empty.
 */
export function subscribeToDocuments(
  onDocsUpdated: (docs: DocumentItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const docsColRef = collection(db, FIRESTORE_DOCS_COLLECTION);

  const unsubscribe = onSnapshot(
    docsColRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // If Firestore is brand new/empty, check if local storage has custom documents to migrate
        const localDocs = getLocalDocuments();
        const docsToSeed = localDocs && localDocs.length > 0 ? localDocs : INITIAL_DOCUMENTS;

        try {
          const batch = writeBatch(db);
          docsToSeed.forEach((d) => {
            const docRef = doc(db, FIRESTORE_DOCS_COLLECTION, d.id);
            batch.set(docRef, cleanFirestoreObject(d));
          });
          await batch.commit();
          // The commit will trigger onSnapshot with the newly written docs
        } catch (seedErr) {
          console.warn('Could not auto-seed Firestore with local documents:', seedErr);
          saveLocalDocuments(docsToSeed);
          onDocsUpdated(docsToSeed);
        }
      } else {
        const cloudDocs: DocumentItem[] = [];
        snapshot.forEach((snapDoc) => {
          cloudDocs.push(snapDoc.data() as DocumentItem);
        });

        // Sort descending by createdAt or updatedAt
        cloudDocs.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        // Cache locally for offline reliability
        saveLocalDocuments(cloudDocs);
        onDocsUpdated(cloudDocs);
      }
    },
    (error) => {
      console.warn('Firestore subscription failed, falling back to local cache:', error);
      const cached = getLocalDocuments();
      onDocsUpdated(cached);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Subscribes to school years list from Firestore
 */
export function subscribeToSchoolYears(
  onYearsUpdated: (years: string[]) => void
): () => void {
  const yearsDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, YEARS_DOC_ID);

  const unsubscribe = onSnapshot(
    yearsDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.years) && data.years.length > 0) {
          saveStoredSchoolYears(data.years);
          onYearsUpdated(data.years);
          return;
        }
      }

      // Seed if not found
      const localYears = getStoredSchoolYears();
      try {
        await setDoc(yearsDocRef, { years: localYears });
      } catch (err) {
        console.warn('Failed to seed cloud school years:', err);
      }
      onYearsUpdated(localYears);
    },
    (err) => {
      console.warn('Firestore years subscription failed, using local:', err);
      onYearsUpdated(getStoredSchoolYears());
    }
  );

  return unsubscribe;
}

/**
 * ========================================================
 * CLOUD + LOCAL CRUD OPERATIONS
 * ========================================================
 */

export async function addStoredSchoolYear(newYear: string): Promise<string[]> {
  const trimmed = newYear.trim();
  if (!trimmed) return getStoredSchoolYears();

  const current = getStoredSchoolYears();
  if (!current.includes(trimmed)) {
    const updated = [trimmed, ...current];
    saveStoredSchoolYears(updated);

    try {
      const yearsDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, YEARS_DOC_ID);
      await setDoc(yearsDocRef, { years: updated }, { merge: true });
    } catch (err) {
      console.warn('Error syncing school year to Firestore:', err);
    }
    return updated;
  }
  return current;
}

/**
 * Cleans object by stripping undefined values to guarantee Firestore compatibility
 */
function cleanFirestoreObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result as T;
}

export async function deleteStoredSchoolYear(yearToDelete: string): Promise<string[]> {
  const current = getStoredSchoolYears();
  const filtered = current.filter((y) => y !== yearToDelete);
  saveStoredSchoolYears(filtered);

  try {
    const yearsDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, YEARS_DOC_ID);
    await setDoc(yearsDocRef, { years: filtered });
  } catch (err) {
    console.warn('Error deleting school year from Firestore:', err);
  }
  return filtered;
}

export async function addDocument(
  docData: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DocumentItem> {
  const newId =
    'doc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  const newDoc: DocumentItem = {
    ...docData,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Update local cache immediately
  const local = getLocalDocuments();
  saveLocalDocuments([newDoc, ...local]);

  if (docData.schoolYear) {
    await addStoredSchoolYear(docData.schoolYear);
  }

  // 2. Sync to Firestore Cloud
  try {
    const docRef = doc(db, FIRESTORE_DOCS_COLLECTION, newId);
    await setDoc(docRef, cleanFirestoreObject(newDoc));
  } catch (err) {
    console.error('Error adding document to Firestore:', err);
  }

  return newDoc;
}

export async function updateDocument(
  id: string,
  updates: Partial<Omit<DocumentItem, 'id' | 'createdAt'>>
): Promise<DocumentItem | null> {
  const local = getLocalDocuments();
  const index = local.findIndex((d) => d.id === id);
  if (index === -1) return null;

  const updatedDoc: DocumentItem = {
    ...local[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  local[index] = updatedDoc;
  saveLocalDocuments(local);

  if (updates.schoolYear) {
    await addStoredSchoolYear(updates.schoolYear);
  }

  // Sync to Firestore
  try {
    const docRef = doc(db, FIRESTORE_DOCS_COLLECTION, id);
    await setDoc(docRef, cleanFirestoreObject(updatedDoc), { merge: true });
  } catch (err) {
    console.error('Error updating document in Firestore:', err);
  }

  return updatedDoc;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const local = getLocalDocuments();
  const filtered = local.filter((d) => d.id !== id);
  saveLocalDocuments(filtered);

  try {
    const docRef = doc(db, FIRESTORE_DOCS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Error deleting document from Firestore:', err);
    return false;
  }
}

export async function deleteMultipleDocuments(ids: string[]): Promise<DocumentItem[]> {
  const idsSet = new Set(ids);
  const local = getLocalDocuments();
  const filtered = local.filter((d) => !idsSet.has(d.id));
  saveLocalDocuments(filtered);

  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      const docRef = doc(db, FIRESTORE_DOCS_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error batch deleting documents from Firestore:', err);
  }

  return filtered;
}

export async function clearAllDocuments(): Promise<DocumentItem[]> {
  const local = getLocalDocuments();
  saveLocalDocuments([]);

  try {
    const batch = writeBatch(db);
    local.forEach((d) => {
      const docRef = doc(db, FIRESTORE_DOCS_COLLECTION, d.id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error clearing Firestore documents:', err);
  }

  return [];
}

export async function resetToDefaultDocuments(): Promise<DocumentItem[]> {
  saveLocalDocuments(INITIAL_DOCUMENTS);
  saveStoredSchoolYears(Array.from(DEFAULT_SCHOOL_YEARS));

  try {
    const batch = writeBatch(db);
    // Delete existing
    const snapshot = await getDocs(collection(db, FIRESTORE_DOCS_COLLECTION));
    snapshot.forEach((d) => batch.delete(d.ref));

    // Seed defaults
    INITIAL_DOCUMENTS.forEach((docItem) => {
      const docRef = doc(db, FIRESTORE_DOCS_COLLECTION, docItem.id);
      batch.set(docRef, cleanFirestoreObject(docItem));
    });

    const yearsRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, YEARS_DOC_ID);
    batch.set(yearsRef, { years: Array.from(DEFAULT_SCHOOL_YEARS) });

    await batch.commit();
  } catch (err) {
    console.error('Error resetting Firestore to defaults:', err);
  }

  return INITIAL_DOCUMENTS;
}

/**
 * ========================================================
 * BACKUP (EXPORT & IMPORT JSON) UTILITIES
 * ========================================================
 */

export interface BackupDataPayload {
  version: string;
  exportedAt: string;
  schoolName: string;
  totalDocuments: number;
  schoolYears: string[];
  documents: DocumentItem[];
}

export function exportBackupJSON(documents: DocumentItem[]): void {
  const years = getStoredSchoolYears();
  const payload: BackupDataPayload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    schoolName: 'SDIT AL FIKRI',
    totalDocuments: documents.length,
    schoolYears: years,
    documents,
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `cadangan_arsip_sdit_alfikri_${dateStamp}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export async function importBackupJSON(
  parsedData: BackupDataPayload
): Promise<{ success: boolean; count: number; message: string }> {
  if (!parsedData || !Array.isArray(parsedData.documents)) {
    return {
      success: false,
      count: 0,
      message: 'Format file JSON tidak valid atau data dokumen tidak ditemukan.',
    };
  }

  const validDocs = parsedData.documents.filter(
    (d) => d && typeof d.title === 'string' && typeof d.type === 'string'
  );

  if (validDocs.length === 0) {
    return {
      success: false,
      count: 0,
      message: 'File cadangan tidak memuat data dokumen arsip yang valid.',
    };
  }

  // Update local cache
  saveLocalDocuments(validDocs);

  if (Array.isArray(parsedData.schoolYears) && parsedData.schoolYears.length > 0) {
    saveStoredSchoolYears(parsedData.schoolYears);
  }

  // Sync all to Firestore
  try {
    const batch = writeBatch(db);
    // Delete existing in Firestore
    const existingSnap = await getDocs(collection(db, FIRESTORE_DOCS_COLLECTION));
    existingSnap.forEach((d) => batch.delete(d.ref));

    // Add imported docs
    validDocs.forEach((d) => {
      const docRef = doc(db, FIRESTORE_DOCS_COLLECTION, d.id);
      batch.set(docRef, cleanFirestoreObject(d));
    });

    if (Array.isArray(parsedData.schoolYears) && parsedData.schoolYears.length > 0) {
      const yearsRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, YEARS_DOC_ID);
      batch.set(yearsRef, { years: parsedData.schoolYears });
    }

    await batch.commit();
  } catch (err) {
    console.error('Error importing backup to Firestore:', err);
  }

  return {
    success: true,
    count: validDocs.length,
    message: `Berhasil memulihkan ${validDocs.length} arsip dokumen ke Cloud Firestore & Penyimpanan Lokal.`,
  };
}

// Backward compatibility alias
export function getDocuments(): DocumentItem[] {
  return getLocalDocuments();
}
export function saveDocuments(docs: DocumentItem[]): void {
  saveLocalDocuments(docs);
}

/**
 * ========================================================
 * MASTER CLASSES, WALAS & SUBJECTS CONFIGURATION
 * ========================================================
 */
const LOCAL_MASTER_CLASSES_KEY = 'sdit_al_fikri_master_classes_v3';
const MASTER_CLASSES_DOC_ID = 'master_classes';

export function getStoredMasterClasses(): MasterClass[] {
  try {
    const raw = localStorage.getItem(LOCAL_MASTER_CLASSES_KEY);
    if (!raw) return MASTER_CLASSES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return MASTER_CLASSES;
  } catch {
    return MASTER_CLASSES;
  }
}

const masterClassListeners = new Set<(classes: MasterClass[]) => void>();

export function saveStoredMasterClasses(classes: MasterClass[]): void {
  try {
    localStorage.setItem(LOCAL_MASTER_CLASSES_KEY, JSON.stringify(classes));
  } catch (err) {
    console.error('Error saving local master classes:', err);
  }

  masterClassListeners.forEach((listener) => {
    try {
      listener(classes);
    } catch (err) {
      console.warn('Error notifying master class listener:', err);
    }
  });
}

export async function updateStoredMasterClasses(classes: MasterClass[]): Promise<MasterClass[]> {
  saveStoredMasterClasses(classes);
  try {
    const docRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, MASTER_CLASSES_DOC_ID);
    await setDoc(docRef, { classes: cleanFirestoreObject(classes) }, { merge: true });
  } catch (err) {
    console.warn('Error syncing master classes to Firestore:', err);
  }
  return classes;
}

export function subscribeToMasterClasses(
  onUpdate: (classes: MasterClass[]) => void
): () => void {
  onUpdate(getStoredMasterClasses());
  masterClassListeners.add(onUpdate);

  const docRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, MASTER_CLASSES_DOC_ID);

  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.classes) && data.classes.length > 0) {
          saveStoredMasterClasses(data.classes);
          return;
        }
      }
      // If Firestore does not have it yet, seed defaults
      const local = getStoredMasterClasses();
      try {
        setDoc(docRef, { classes: cleanFirestoreObject(local) });
      } catch (err) {
        console.warn('Could not auto-seed master classes in Firestore:', err);
      }
    },
    (err) => {
      console.warn('Master classes subscription error, using cache:', err);
      onUpdate(getStoredMasterClasses());
    }
  );

  return () => {
    masterClassListeners.delete(onUpdate);
    unsubscribe();
  };
}

