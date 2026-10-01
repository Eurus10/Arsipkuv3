import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { TeacherNotificationItem } from '../types/teacherNotificationTypes';

const LOCAL_STORAGE_KEY = 'sdit_teacher_notifications_v1';
const FIRESTORE_COLLECTION = 'teacher_notifications';

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

export function getLocalTeacherNotifications(): TeacherNotificationItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to get local teacher notifications:', err);
    return [];
  }
}

export function saveLocalTeacherNotifications(items: TeacherNotificationItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save local teacher notifications:', err);
  }
}

/**
 * Send a notification to a specific teacher or all teachers
 */
export async function sendTeacherNotification(
  data: Omit<TeacherNotificationItem, 'id' | 'createdAt' | 'isRead'>
): Promise<TeacherNotificationItem> {
  const notifId = 'notif-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const newNotification: TeacherNotificationItem = {
    ...data,
    id: notifId,
    createdAt: now,
    isRead: false,
  };

  // 1. Update local cache
  const local = getLocalTeacherNotifications();
  const updatedLocal = [newNotification, ...local.filter((n) => n.id !== notifId)].slice(0, 100);
  saveLocalTeacherNotifications(updatedLocal);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, notifId);
    await setDoc(docRef, cleanObjectForFirestore(newNotification));
  } catch (err) {
    console.warn('Failed to sync notification to Firestore, saved locally:', err);
  }

  return newNotification;
}

/**
 * Filter notifications for a specific teacher (matching teacherId, teacherName, or broadcast 'all')
 */
export function filterNotificationsForTeacher(
  allNotifications: TeacherNotificationItem[],
  teacherId?: string | null,
  teacherName?: string | null
): TeacherNotificationItem[] {
  if (!allNotifications || allNotifications.length === 0) return [];
  const cleanId = (teacherId || '').trim().toLowerCase();
  const cleanName = (teacherName || '').trim().toLowerCase();

  return allNotifications.filter((n) => {
    // Broadcast for everyone
    if (n.teacherId === 'all' || !n.teacherId) return true;

    // Direct match by teacherId
    if (cleanId && n.teacherId && n.teacherId.trim().toLowerCase() === cleanId) return true;

    // Direct match by teacherName
    if (cleanName && n.teacherName && n.teacherName.trim().toLowerCase() === cleanName) return true;

    return false;
  });
}

/**
 * Real-time listener for Teacher Notifications
 */
export function subscribeToTeacherNotifications(
  teacherId: string | null | undefined,
  teacherName: string | null | undefined,
  onUpdate: (notifications: TeacherNotificationItem[]) => void
): () => void {
  // Emit filtered local cache immediately
  const localFiltered = filterNotificationsForTeacher(
    getLocalTeacherNotifications(),
    teacherId,
    teacherName
  );
  onUpdate(localFiltered);

  try {
    const q = query(
      collection(db, FIRESTORE_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: TeacherNotificationItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as TeacherNotificationItem);
        });

        // Merge and update local storage
        saveLocalTeacherNotifications(items);
        const filtered = filterNotificationsForTeacher(items, teacherId, teacherName);
        onUpdate(filtered);
      },
      (err) => {
        console.warn('Firestore teacher notifications listener error, falling back to cache:', err);
        const cached = filterNotificationsForTeacher(
          getLocalTeacherNotifications(),
          teacherId,
          teacherName
        );
        onUpdate(cached);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to create Firestore listener for teacher notifications:', err);
    return () => {};
  }
}

/**
 * Mark a notification as read
 */
export async function markTeacherNotificationRead(id: string): Promise<void> {
  const local = getLocalTeacherNotifications();
  const updated = local.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  saveLocalTeacherNotifications(updated);

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    await setDoc(docRef, { isRead: true }, { merge: true });
  } catch (err) {
    console.error('Failed to mark notification read in Firestore:', err);
  }
}

/**
 * Mark all notifications as read for a teacher
 */
export async function markAllTeacherNotificationsRead(
  teacherId?: string | null,
  teacherName?: string | null
): Promise<void> {
  const local = getLocalTeacherNotifications();
  const targetIds: string[] = [];

  const updated = local.map((n) => {
    const isTarget =
      n.teacherId === 'all' ||
      (teacherId && n.teacherId === teacherId) ||
      (teacherName && n.teacherName?.toLowerCase() === teacherName.toLowerCase());

    if (isTarget && !n.isRead) {
      targetIds.push(n.id);
      return { ...n, isRead: true };
    }
    return n;
  });

  saveLocalTeacherNotifications(updated);

  try {
    await Promise.all(
      targetIds.map((id) =>
        setDoc(doc(db, FIRESTORE_COLLECTION, id), { isRead: true }, { merge: true })
      )
    );
  } catch (err) {
    console.error('Failed to batch mark notifications as read:', err);
  }
}

/**
 * Delete a notification
 */
export async function deleteTeacherNotification(id: string): Promise<void> {
  const local = getLocalTeacherNotifications().filter((n) => n.id !== id);
  saveLocalTeacherNotifications(local);

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete notification in Firestore:', err);
  }
}

/**
 * Send school broadcast announcement to all teachers
 */
export async function createBroadcastAnnouncement(
  title: string,
  message: string,
  adminSenderName: string = 'Pak Zaki (Admin)',
  linkAction?: 'analysis' | 'discussion' | 'rapor'
): Promise<TeacherNotificationItem> {
  return sendTeacherNotification({
    teacherId: 'all',
    teacherName: 'Semua Dewan Guru',
    title,
    message,
    type: 'announcement',
    adminSenderName,
    linkAction: linkAction || 'analysis',
  });
}
