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
  SubjectPrintStatus,
  SubmissionChatMessage,
} from '../types/analysisSubmissionTypes';
import { sendTeacherNotification } from './teacherNotificationService';

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
 * updates the existing document and preserves existing discussion thread and per-subject print statuses.
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

  // Prepare per-subject statuses: preserve existing print / approval statuses
  const mergedSubjectStatuses: Record<string, SubjectPrintStatus> = {
    ...(existingSubmission?.subjectStatuses || {}),
  };

  if (data.submissionType === 'session' && data.payload?.session?.subjects) {
    const subjects = data.payload.session.subjects;
    for (const subj of subjects) {
      const name = subj.name?.trim();
      if (!name) continue;
      if (!mergedSubjectStatuses[name]) {
        // Newly added subject in multi-subject session: starts as 'menunggu' (belum print)
        mergedSubjectStatuses[name] = {
          status: 'menunggu',
          lastSubmittedAt: now,
        };
      } else {
        mergedSubjectStatuses[name] = {
          ...mergedSubjectStatuses[name],
          lastSubmittedAt: now,
        };
      }
    }
  } else if (data.subjectName) {
    const subName = data.subjectName.trim();
    if (!mergedSubjectStatuses[subName]) {
      mergedSubjectStatuses[subName] = {
        status: existingSubmission?.status === 'telah_diprint' ? 'telah_diprint' : 'menunggu',
        lastSubmittedAt: now,
      };
    } else {
      mergedSubjectStatuses[subName] = {
        ...mergedSubjectStatuses[subName],
        lastSubmittedAt: now,
      };
    }
  }

  // Calculate overall submission status based on individual subject statuses
  let overallStatus: AnalysisSubmissionStatus = 'menunggu';
  const statusValues = Object.values(mergedSubjectStatuses).map((s) => s.status);
  if (statusValues.length > 0 && statusValues.every((st) => st === 'telah_diprint')) {
    overallStatus = 'telah_diprint';
  } else if (statusValues.length > 0 && statusValues.some((st) => st === 'revisi')) {
    overallStatus = 'revisi';
  } else if (
    statusValues.length > 0 &&
    statusValues.every((st) => st === 'disetujui' || st === 'telah_diprint')
  ) {
    overallStatus = 'disetujui';
  } else {
    overallStatus = 'menunggu';
  }

  // Prepare messages: keep existing messages or start new thread
  const existingMessages: SubmissionChatMessage[] = existingSubmission?.messages || [];
  const updatedMessages: SubmissionChatMessage[] = [...existingMessages];

  if (existingSubmission) {
    updatedMessages.push({
      id: 'msg-sys-' + Date.now().toString(36),
      senderName: 'Sistem SDIT',
      senderRole: 'system',
      text: `🔄 Berkas analisis ${data.subjectName} (${data.className}) telah diperbarui dengan data setoran terbaru.`,
      timestamp: Date.now(),
      isSystem: true,
    });
  } else {
    updatedMessages.push({
      id: 'msg-sys-' + Date.now().toString(36),
      senderName: 'Sistem SDIT',
      senderRole: 'system',
      text: `🚀 Berkas analisis ${data.subjectName} (${data.className}) berhasil disetorkan ke Pak Zaki.`,
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
    status: overallStatus,
    subjectStatuses: mergedSubjectStatuses,
    submittedAt: existingSubmission?.submittedAt || now,
    updatedAt: now,
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
 * Update print / approval status of a single subject within a submission
 * (Critical for multi-subject homeroom sessions so already printed subjects are not reset!)
 */
export async function updateSingleSubjectStatus(
  submissionId: string,
  subjectName: string,
  status: AnalysisSubmissionStatus,
  adminNote?: string
): Promise<void> {
  const local = getLocalAnalysisSubmissions();
  const idx = local.findIndex((s) => s.id === submissionId);
  if (idx === -1) return;

  const sub = local[idx];
  const now = new Date().toISOString();
  const currentStatuses = sub.subjectStatuses || {};

  const updatedStatuses: Record<string, SubjectPrintStatus> = {
    ...currentStatuses,
    [subjectName]: {
      ...(currentStatuses[subjectName] || {}),
      status,
      ...(status === 'telah_diprint' ? { printedAt: now } : {}),
      ...(status === 'disetujui' ? { approvedAt: now } : {}),
      ...(adminNote !== undefined ? { revisionNote: adminNote } : {}),
    },
  };

  // Recalculate overall status
  const allStatuses = Object.values(updatedStatuses).map((s) => s.status);
  let overallStatus: AnalysisSubmissionStatus = 'menunggu';
  if (allStatuses.length > 0 && allStatuses.every((st) => st === 'telah_diprint')) {
    overallStatus = 'telah_diprint';
  } else if (allStatuses.length > 0 && allStatuses.some((st) => st === 'revisi')) {
    overallStatus = 'revisi';
  } else if (
    allStatuses.length > 0 &&
    allStatuses.every((st) => st === 'disetujui' || st === 'telah_diprint')
  ) {
    overallStatus = 'disetujui';
  } else {
    overallStatus = 'menunggu';
  }

  // System log
  let logText = '';
  if (status === 'telah_diprint') {
    logText = `🖨️ Pak Zaki (Admin) menandai mapel ${subjectName} (${sub.className}): Selesai dicetak fisik di TU.`;
  } else if (status === 'disetujui') {
    logText = `✅ Pak Zaki (Admin) menyetujui lembar analisis mapel ${subjectName} (${sub.className}).`;
  } else if (status === 'revisi') {
    logText = `⚠️ Pak Zaki (Admin) meminta revisi mapel ${subjectName} (${sub.className}).${adminNote ? ` Catatan: "${adminNote}"` : ''}`;
  } else {
    logText = `⏳ Status mapel ${subjectName} (${sub.className}) dikembalikan ke antrean menunggu.`;
  }

  const sysMsg: SubmissionChatMessage = {
    id: 'msg-sys-' + Date.now().toString(36),
    senderName: 'Sistem SDIT',
    senderRole: 'system',
    text: logText,
    timestamp: Date.now(),
    isSystem: true,
  };

  const updatedMessages = [...(sub.messages || []), sysMsg];

  local[idx] = {
    ...sub,
    status: overallStatus,
    subjectStatuses: updatedStatuses,
    updatedAt: now,
    messages: updatedMessages,
  };
  saveLocalAnalysisSubmissions(local);

  // Send automated notification to Teacher
  try {
    let notifType: 'print' | 'revision' | 'approved' = 'print';
    let notifTitle = 'Soal Selesai Dicetak';
    if (status === 'revisi') {
      notifType = 'revision';
      notifTitle = 'Catatan Revisi Analisis Soal';
    } else if (status === 'disetujui') {
      notifType = 'approved';
      notifTitle = 'Analisis Soal Disetujui';
    }

    await sendTeacherNotification({
      teacherId: sub.teacherId,
      teacherName: sub.teacherName,
      title: notifTitle,
      message: logText,
      type: notifType,
      submissionId: sub.id,
      subjectName,
      className: sub.className,
      linkAction: status === 'revisi' ? 'discussion' : 'analysis',
    });
  } catch (err) {
    console.warn('Failed to send teacher notification on single subject update:', err);
  }

  // Update in Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    await setDoc(
      docRef,
      cleanObjectForFirestore({
        status: overallStatus,
        subjectStatuses: updatedStatuses,
        updatedAt: now,
        messages: updatedMessages,
      }),
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to update single subject status in Firestore:', err);
  }
}

/**
 * Update submission status by Pak Zaki with automated system log & teacher notification
 */
export async function updateAnalysisSubmissionStatus(
  id: string,
  status: AnalysisSubmissionStatus,
  adminNote?: string
): Promise<void> {
  const local = getLocalAnalysisSubmissions();
  const idx = local.findIndex((s) => s.id === id);

  let newMessages: SubmissionChatMessage[] = [];
  const now = new Date().toISOString();

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

  let updatedSubjectStatuses: Record<string, SubjectPrintStatus> | undefined = undefined;

  if (idx !== -1) {
    const existingMessages = Array.isArray(local[idx].messages) ? local[idx].messages! : [];
    newMessages = [...existingMessages, sysMsg];

    // If marking whole submission as printed or approved, cascade to subject statuses
    if (local[idx].subjectStatuses) {
      updatedSubjectStatuses = { ...local[idx].subjectStatuses };
      for (const k of Object.keys(updatedSubjectStatuses)) {
        updatedSubjectStatuses[k] = {
          ...updatedSubjectStatuses[k],
          status: status,
          ...(status === 'telah_diprint' ? { printedAt: now } : {}),
          ...(status === 'disetujui' ? { approvedAt: now } : {}),
        };
      }
    }

    const targetSub = local[idx];
    local[idx] = {
      ...targetSub,
      status,
      ...(updatedSubjectStatuses ? { subjectStatuses: updatedSubjectStatuses } : {}),
      adminNote: adminNote !== undefined ? adminNote : targetSub.adminNote,
      updatedAt: now,
      messages: newMessages,
    };
    saveLocalAnalysisSubmissions(local);

    // Send automated notification to Teacher
    try {
      let notifType: 'print' | 'revision' | 'approved' = 'print';
      let notifTitle = 'Soal Selesai Dicetak';
      if (status === 'revisi') {
        notifType = 'revision';
        notifTitle = 'Catatan Revisi dari Pak Zaki';
      } else if (status === 'disetujui') {
        notifType = 'approved';
        notifTitle = 'Analisis Soal Disetujui';
      }

      await sendTeacherNotification({
        teacherId: targetSub.teacherId,
        teacherName: targetSub.teacherName,
        title: notifTitle,
        message: `${targetSub.subjectName} (${targetSub.className}): ${systemText}`,
        type: notifType,
        submissionId: targetSub.id,
        subjectName: targetSub.subjectName,
        className: targetSub.className,
        linkAction: status === 'revisi' ? 'discussion' : 'analysis',
      });
    } catch (err) {
      console.warn('Failed to send teacher notification on submission status update:', err);
    }
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    await setDoc(
      docRef,
      cleanObjectForFirestore({
        status,
        ...(updatedSubjectStatuses ? { subjectStatuses: updatedSubjectStatuses } : {}),
        ...(adminNote !== undefined ? { adminNote } : {}),
        updatedAt: now,
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

    // If message is sent by Admin, automatically notify the teacher
    if (message.senderRole === 'admin') {
      try {
        await sendTeacherNotification({
          teacherId: local[idx].teacherId,
          teacherName: local[idx].teacherName,
          title: `Pesan Diskusi Baru dari ${message.senderName}`,
          message: `Di setoran ${local[idx].subjectName} (${local[idx].className}): "${message.text.trim()}"`,
          type: 'chat',
          submissionId: local[idx].id,
          subjectName: local[idx].subjectName,
          className: local[idx].className,
          adminSenderName: message.senderName,
          linkAction: 'discussion',
        });
      } catch (err) {
        console.warn('Failed to send teacher notification for admin chat:', err);
      }
    }
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

