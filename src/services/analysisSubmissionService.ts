import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  AnalysisSubmissionItem,
  AnalysisSubmissionStatus,
  SubmissionChatMessage,
} from '../types/analysisSubmissionTypes';

const LOCAL_STORAGE_KEY = 'sdit_analysis_submissions_v1';
const FIRESTORE_COLLECTION = 'analysis_submissions';

/**
 * Clean object so Firestore does not throw on undefined values
 */
function cleanObjectForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanObjectForFirestore);
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanObjectForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
}

export function getLocalAnalysisSubmissions(): AnalysisSubmissionItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to get local analysis submissions:', err);
    return [];
  }
}

export function saveLocalAnalysisSubmissions(items: AnalysisSubmissionItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save local analysis submissions:', err);
  }
}

/**
 * Send an analysis submission to Pak Zaki (Admin)
 * Uses Smart Overwrite: If a submission for the same class + subject already exists,
 * updates the existing document and preserves existing discussion thread.
 */
export async function sendAnalysisSubmission(
  data: Omit<AnalysisSubmissionItem, 'id' | 'submittedAt' | 'status' | 'messages'>
): Promise<AnalysisSubmissionItem> {
  const currentLocal = getLocalAnalysisSubmissions();
  const now = new Date().toISOString();

  // Find existing submission for the same class & subject to overwrite
  const existingSubmission = currentLocal.find((s) => {
    if (data.submissionType === 'session') {
      return (
        s.submissionType === 'session' &&
        s.classId === data.classId &&
        s.schoolYear === data.schoolYear
      );
    }
    return (
      s.classId === data.classId &&
      s.subjectName.trim().toLowerCase() === data.subjectName.trim().toLowerCase() &&
      s.schoolYear === data.schoolYear
    );
  });

  const submissionId = existingSubmission
    ? existingSubmission.id
    : 'asub-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

  // Prepare messages: keep existing messages or start new thread
  const existingMessages: SubmissionChatMessage[] = existingSubmission?.messages || [];
  const updatedMessages: SubmissionChatMessage[] = [...existingMessages];

  if (existingSubmission) {
    updatedMessages.push({
      id: 'msg-sys-' + Date.now().toString(36),
      senderName: 'Sistem SDIT',
      senderRole: 'system',
      text: `🔄 Berkas analisis mapel ${data.subjectName} (${data.className}) telah diperbarui dengan data nilai revisi terbaru.`,
      timestamp: Date.now(),
      isSystem: true,
    });
  } else {
    updatedMessages.push({
      id: 'msg-sys-' + Date.now().toString(36),
      senderName: 'Sistem SDIT',
      senderRole: 'system',
      text: `🚀 Berkas analisis mapel ${data.subjectName} (${data.className}) berhasil disetorkan ke Pak Zaki.`,
      timestamp: Date.now(),
      isSystem: true,
    });
  }

  if (data.teacherNote && data.teacherNote.trim()) {
    updatedMessages.push({
      id: 'msg-tch-' + (Date.now() + 10).toString(36),
      senderName: data.teacherName || 'Guru',
      senderRole: 'guru',
      text: data.teacherNote.trim(),
      timestamp: Date.now() + 10,
    });
  }

  const targetSubmission: AnalysisSubmissionItem = {
    ...data,
    id: submissionId,
    status: existingSubmission?.status === 'telah_diprint' ? 'telah_diprint' : 'menunggu',
    submittedAt: now,
    messages: updatedMessages,
  };

  // 1. Save to local cache
  const updatedLocal = [
    targetSubmission,
    ...currentLocal.filter((s) => s.id !== submissionId),
  ];
  saveLocalAnalysisSubmissions(updatedLocal);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    await setDoc(docRef, cleanObjectForFirestore(targetSubmission));
  } catch (err) {
    console.warn('Failed to sync analysis submission to Firestore, saved locally:', err);
  }

  return targetSubmission;
}

/**
 * Realtime listener for Admin (Pak Zaki) & Teachers
 */
export function subscribeToAnalysisSubmissions(
  onUpdate: (submissions: AnalysisSubmissionItem[]) => void
): () => void {
  // Emit local cache immediately
  onUpdate(getLocalAnalysisSubmissions());

  try {
    const q = query(collection(db, FIRESTORE_COLLECTION), orderBy('submittedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: AnalysisSubmissionItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as AnalysisSubmissionItem);
        });
        saveLocalAnalysisSubmissions(items);
        onUpdate(items);
      },
      (err) => {
        console.warn('Firestore analysis submissions listener error, falling back to cache:', err);
        onUpdate(getLocalAnalysisSubmissions());
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to create Firestore listener for analysis submissions:', err);
    return () => {};
  }
}

/**
 * Update submission status by Pak Zaki with automated system log
 */
export async function updateAnalysisSubmissionStatus(
  id: string,
  status: AnalysisSubmissionStatus,
  adminNote?: string
): Promise<void> {
  const local = getLocalAnalysisSubmissions();
  const idx = local.findIndex((s) => s.id === id);

  let newMessages: SubmissionChatMessage[] = [];

  // Generate automated status log message
  let systemText = '';
  if (status === 'telah_diprint') {
    systemText = '🖨️ Pak Zaki (Admin) menandai: Berkas fisik analisis telah selesai dicetak di ruang TU.';
  } else if (status === 'disetujui') {
    systemText = '✅ Pak Zaki (Admin) telah menyetujui lembar analisis ini.';
  } else if (status === 'revisi') {
    systemText = `⚠️ Pak Zaki (Admin) meminta revisi.${adminNote ? ` Catatan: "${adminNote}"` : ''}`;
  } else if (status === 'menunggu') {
    systemText = '⏳ Lembar analisis dikirim ulang untuk verifikasi Pak Zaki.';
  }

  const sysMsg: SubmissionChatMessage = {
    id: 'msg-sys-' + Date.now().toString(36),
    senderName: 'Sistem SDIT',
    senderRole: 'system',
    text: systemText,
    timestamp: Date.now(),
    isSystem: true,
  };

  if (idx !== -1) {
    const existingMessages = Array.isArray(local[idx].messages) ? local[idx].messages! : [];
    newMessages = [...existingMessages, sysMsg];

    local[idx] = {
      ...local[idx],
      status,
      adminNote: adminNote !== undefined ? adminNote : local[idx].adminNote,
      updatedAt: new Date().toISOString(),
      messages: newMessages,
    };
    saveLocalAnalysisSubmissions(local);
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    await setDoc(
      docRef,
      cleanObjectForFirestore({
        status,
        ...(adminNote !== undefined ? { adminNote } : {}),
        updatedAt: new Date().toISOString(),
        ...(newMessages.length > 0 ? { messages: newMessages } : {}),
      }),
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to update submission status in Firestore:', err);
  }
}

/**
 * Send a chat message within a submission thread
 */
export async function sendSubmissionChatMessage(
  submissionId: string,
  message: {
    senderName: string;
    senderRole: 'admin' | 'guru';
    text: string;
  }
): Promise<SubmissionChatMessage> {
  const newMsg: SubmissionChatMessage = {
    id: 'msg-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5),
    senderName: message.senderName.trim(),
    senderRole: message.senderRole,
    text: message.text.trim(),
    timestamp: Date.now(),
    isSystem: false,
  };

  const local = getLocalAnalysisSubmissions();
  const idx = local.findIndex((s) => s.id === submissionId);
  let updatedMessages: SubmissionChatMessage[] = [newMsg];

  if (idx !== -1) {
    const currentMsgs = Array.isArray(local[idx].messages) ? local[idx].messages! : [];
    updatedMessages = [...currentMsgs, newMsg];
    local[idx] = {
      ...local[idx],
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };
    saveLocalAnalysisSubmissions(local);
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    await setDoc(
      docRef,
      cleanObjectForFirestore({
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to save chat message to Firestore:', err);
  }

  return newMsg;
}

/**
 * Delete a single chat message from a submission thread
 */
export async function deleteSubmissionChatMessage(
  submissionId: string,
  messageId: string
): Promise<void> {
  const local = getLocalAnalysisSubmissions();
  const idx = local.findIndex((s) => s.id === submissionId);
  let updatedMessages: SubmissionChatMessage[] = [];

  if (idx !== -1) {
    const currentMsgs = Array.isArray(local[idx].messages) ? local[idx].messages! : [];
    updatedMessages = currentMsgs.filter((m) => m.id !== messageId);
    local[idx] = {
      ...local[idx],
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };
    saveLocalAnalysisSubmissions(local);
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    await setDoc(
      docRef,
      cleanObjectForFirestore({
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to delete chat message in Firestore:', err);
  }
}

/**
 * Clear all chat messages / reset thread for a submission (Admin only)
 */
export async function clearSubmissionChatMessages(
  submissionId: string
): Promise<void> {
  const local = getLocalAnalysisSubmissions();
  const idx = local.findIndex((s) => s.id === submissionId);

  // Leave a clean single system restart log
  const resetLog: SubmissionChatMessage[] = [
    {
      id: 'msg-sys-reset-' + Date.now().toString(36),
      senderName: 'Sistem SDIT',
      senderRole: 'system',
      text: '🧹 Riwayat diskusi telah dibersihkan oleh Administrator.',
      timestamp: Date.now(),
      isSystem: true,
    },
  ];

  if (idx !== -1) {
    local[idx] = {
      ...local[idx],
      messages: resetLog,
      updatedAt: new Date().toISOString(),
    };
    saveLocalAnalysisSubmissions(local);
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    await setDoc(
      docRef,
      cleanObjectForFirestore({
        messages: resetLog,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to clear chat messages in Firestore:', err);
  }
}

/**
 * Delete a submission by Pak Zaki
 */
export async function deleteAnalysisSubmission(id: string): Promise<void> {
  const local = getLocalAnalysisSubmissions().filter((s) => s.id !== id);
  saveLocalAnalysisSubmissions(local);

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete submission from Firestore:', err);
  }
}
