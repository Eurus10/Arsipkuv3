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
import { GrafikKehadiranRow } from './administrasiExcelService';
import { sendTeacherNotification } from './teacherNotificationService';

export type AttendanceSubmissionStatus = 'menunggu' | 'telah_diprint' | 'disetujui' | 'revisi';

export interface AttendanceSubmissionItem {
  id: string;
  classId: string;
  className: string;
  schoolYear: string;
  periodType: 'month' | 'semester' | 'year';
  periodLabel: string;
  selectedMonth?: string;
  selectedYear?: string;
  teacherName: string;
  teacherId?: string;
  teacherRoleTitle?: string;
  headmasterName?: string;
  effectiveDays: number;
  totalStudents: number;
  totalH: number;
  totalS: number;
  totalI: number;
  totalA: number;
  attendanceRate: number; // e.g. 98.5
  status: AttendanceSubmissionStatus;
  adminNote?: string;
  teacherNote?: string;
  submittedAt: string;
  updatedAt: string;
  matrixData?: Record<
    string,
    { effectiveDays?: number; sakit?: number | string; izin?: number | string; alpha?: number | string }
  >;
  rows?: GrafikKehadiranRow[];
}

const LOCAL_STORAGE_KEY = 'sdit_attendance_submissions_v1';
const FIRESTORE_COLLECTION = 'attendance_submissions';

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

export function getLocalAttendanceSubmissions(): AttendanceSubmissionItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to get local attendance submissions:', err);
    return [];
  }
}

export function saveLocalAttendanceSubmissions(items: AttendanceSubmissionItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save local attendance submissions:', err);
  }
}

/**
 * Send attendance submission to Pak Zaki (Admin)
 * Uses smart deterministic matching to prevent duplicate documents.
 */
export async function sendAttendanceSubmission(
  data: Omit<AttendanceSubmissionItem, 'id' | 'submittedAt' | 'updatedAt' | 'status'>
): Promise<AttendanceSubmissionItem> {
  const currentLocal = getLocalAttendanceSubmissions();
  const now = new Date().toISOString();

  // Create deterministic ID based on class + period
  const cleanClass = (data.classId || '1A').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const cleanPeriod = (data.periodLabel || 'Bulanan').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const deterministicId = `abs_${cleanClass}_${cleanPeriod}`;

  const existing = currentLocal.find(
    (s) =>
      s.id === deterministicId ||
      (s.classId === data.classId &&
        s.periodLabel === data.periodLabel &&
        s.schoolYear === data.schoolYear)
  );

  const submissionId = existing ? existing.id : deterministicId;

  const targetSubmission: AttendanceSubmissionItem = {
    ...data,
    id: submissionId,
    status: existing?.status === 'telah_diprint' ? 'telah_diprint' : 'menunggu',
    submittedAt: existing?.submittedAt || now,
    updatedAt: now,
  };

  // 1. Update localStorage
  const updatedLocal = currentLocal.filter((s) => s.id !== submissionId);
  updatedLocal.unshift(targetSubmission);
  saveLocalAttendanceSubmissions(updatedLocal);

  // 2. Sync to Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    await setDoc(docRef, cleanObjectForFirestore(targetSubmission), { merge: true });
  } catch (err) {
    console.warn('Firestore attendance sync error (saved locally):', err);
  }

  return targetSubmission;
}

/**
 * Subscribe to attendance submissions list
 */
export function subscribeToAttendanceSubmissions(
  callback: (items: AttendanceSubmissionItem[]) => void
): () => void {
  // Initial immediate local delivery
  callback(getLocalAttendanceSubmissions());

  try {
    const colRef = collection(db, FIRESTORE_COLLECTION);
    const q = query(colRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreItems: AttendanceSubmissionItem[] = [];
        snapshot.forEach((docSnap) => {
          const item = docSnap.data() as AttendanceSubmissionItem;
          firestoreItems.push({
            ...item,
            id: docSnap.id,
          });
        });

        // Merge with local fallback
        const localItems = getLocalAttendanceSubmissions();
        const mergedMap = new Map<string, AttendanceSubmissionItem>();

        localItems.forEach((item) => mergedMap.set(item.id, item));
        firestoreItems.forEach((item) => mergedMap.set(item.id, item));

        const mergedList = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.updatedAt || b.submittedAt).getTime() - new Date(a.updatedAt || a.submittedAt).getTime()
        );

        saveLocalAttendanceSubmissions(mergedList);
        callback(mergedList);
      },
      (err) => {
        console.warn('Firestore attendance subscription warning:', err);
        callback(getLocalAttendanceSubmissions());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to setup attendance submissions listener:', err);
    return () => {};
  }
}

/**
 * Update attendance submission status (e.g. telah_diprint, disetujui, revisi)
 */
export async function updateAttendanceSubmissionStatus(
  id: string,
  status: AttendanceSubmissionStatus,
  adminNote?: string
): Promise<void> {
  const currentLocal = getLocalAttendanceSubmissions();
  const target = currentLocal.find((s) => s.id === id);
  const now = new Date().toISOString();

  if (target) {
    target.status = status;
    target.updatedAt = now;
    if (adminNote !== undefined) {
      target.adminNote = adminNote;
    }
    saveLocalAttendanceSubmissions([...currentLocal]);

    // Send notification to teacher if printed or revised
    if (target.teacherName && (status === 'telah_diprint' || status === 'revisi')) {
      try {
        await sendTeacherNotification({
          type: status === 'telah_diprint' ? 'print' : 'revision',
          title:
            status === 'telah_diprint'
              ? `🖨️ Rekap Absensi ${target.className} Telah Dicetak`
              : `⚠️ Catatan Revisi Rekap Absensi ${target.className}`,
          message:
            status === 'telah_diprint'
              ? `Alhamdulillah, rekap absensi periode ${target.periodLabel} untuk ${target.className} telah selesai dicetak fisik oleh Pak Zaki.`
              : adminNote || `Mohon cek kembali data presensi ${target.className} untuk periode ${target.periodLabel}.`,
          teacherId: target.teacherId,
          teacherName: target.teacherName,
          className: target.className,
          submissionId: target.id,
        });
      } catch (notifErr) {
        console.warn('Failed to send teacher notification for attendance:', notifErr);
      }
    }
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    const updateData: Record<string, any> = {
      status,
      updatedAt: now,
    };
    if (adminNote !== undefined) {
      updateData.adminNote = adminNote;
    }
    await setDoc(docRef, updateData, { merge: true });
  } catch (err) {
    console.warn('Firestore attendance status update error:', err);
  }
}

/**
 * Delete an attendance submission
 */
export async function deleteAttendanceSubmission(id: string): Promise<void> {
  const currentLocal = getLocalAttendanceSubmissions();
  const filtered = currentLocal.filter((s) => s.id !== id);
  saveLocalAttendanceSubmissions(filtered);

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore attendance delete error:', err);
  }
}
