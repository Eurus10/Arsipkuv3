import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  AnalysisSubmissionItem,
  AnalysisSubmissionStatus,
  SubjectPrintStatus,
  SubmissionChatMessage,
} from '../types/analysisSubmissionTypes';
import { sendTeacherNotification } from './teacherNotificationService';
import { isAdminLoggedIn } from './auth';
import { normalizeTeacherName } from './teacherStorage';
import { getEraporHomeroomForClass } from './analysis/eraporHomeroomBridge';
import { MASTER_CLASSES } from '../data/masterExamData';

const LOCAL_STORAGE_KEY = 'sdit_analysis_submissions_v1';
const FIRESTORE_COLLECTION = 'analysis_submissions';
const SUPABASE_TABLE = 'analysis_submissions';

// Shared subscriber pool to prevent duplicate listeners and wasteful network calls
type SubmissionListener = (items: AnalysisSubmissionItem[]) => void;
const subscribers = new Set<SubmissionListener>();
let isRealtimeSubscribed = false;
let realtimeChannel: any = null;
let lastFetchTimestamp = 0;
const FETCH_COOLDOWN_MS = 2500; // prevent rapid-fire requests

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

/**
 * Normalisasi identitas teks untuk pencocokan kelas/mapel yang toleran kapitalisasi
 * dan spasi berlebih.
 */
function normalizeSubmissionKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('id-ID');
}

/**
 * Alias identitas mapel. Nama/sheet tetap diperiksa walaupun ID tersedia,
 * supaya payload lama yang belum menyimpan subjectId tetap dapat dicocokkan.
 */
function getSessionSubjectAliases(subject: any): string[] {
  if (!subject || typeof subject !== 'object') return [];
  const aliases: string[] = [];
  const stableId = subject.subjectId ?? subject.subject_id ?? subject.id;
  if (stableId !== undefined && stableId !== null && String(stableId).trim()) {
    aliases.push(`id:${normalizeSubmissionKey(stableId)}`);
  }

  const name = subject.name ?? subject.subjectName ?? subject.subject_name;
  if (name !== undefined && name !== null && String(name).trim()) {
    aliases.push(`name:${normalizeSubmissionKey(name)}`);
  }

  const sheetName = subject.sheetName ?? subject.sheet_name;
  if (sheetName !== undefined && sheetName !== null && String(sheetName).trim()) {
    aliases.push(`sheet:${normalizeSubmissionKey(sheetName)}`);
  }
  return aliases;
}

/**
 * Gabungkan daftar mapel dari dua payload sesi.
 * - Mapel baru ditambahkan.
 * - Mapel dengan ID, nama, atau sheet yang cocok diganti oleh versi terbaru.
 * - Mapel lama yang tidak ada dalam kiriman terbaru tetap dipertahankan.
 * - Duplikat yang sudah ada pada payload lama juga dirapikan.
 */
function mergeSessionSubjects(existingSubjects: any[], incomingSubjects: any[]): any[] {
  const merged: any[] = [];

  const addOrReplace = (subject: any) => {
    if (!subject || typeof subject !== 'object') return;
    const aliases = getSessionSubjectAliases(subject);
    const matchingIndex = aliases.length > 0
      ? merged.findIndex((item) => {
          const itemAliases = getSessionSubjectAliases(item);
          return aliases.some((alias) => itemAliases.includes(alias));
        })
      : -1;

    if (matchingIndex === -1) {
      // Entri tanpa identitas dipertahankan secara terpisah agar tidak salah
      // dianggap sebagai mapel yang sama.
      merged.push(subject);
      return;
    }

    // Data kiriman terbaru menggantikan mapel lama. Untuk duplikat pada sumber
    // yang sama, entri yang muncul belakangan juga menjadi acuan.
    merged[matchingIndex] = subject;
  };

  existingSubjects.forEach(addOrReplace);
  incomingSubjects.forEach(addOrReplace);
  return merged;
}

/**
 * Gabungkan payload hanya untuk setoran bertipe session.
 * Metadata umum terbaru digunakan, tetapi subjects lama dipertahankan dan
 * diperbarui per mapel. Snapshot siswa lama menjadi fallback jika kiriman terbaru
 * tidak membawa snapshot yang valid.
 */
function mergeSessionPayload(existingPayload: any, incomingPayload: any): any {
  const oldPayload = existingPayload && typeof existingPayload === 'object' ? existingPayload : {};
  const newPayload = incomingPayload && typeof incomingPayload === 'object' ? incomingPayload : {};
  const oldSession = oldPayload.session && typeof oldPayload.session === 'object' ? oldPayload.session : {};
  const newSession = newPayload.session && typeof newPayload.session === 'object' ? newPayload.session : {};

  const oldSubjects = Array.isArray(oldSession.subjects) ? oldSession.subjects : [];
  const newSubjects = Array.isArray(newSession.subjects) ? newSession.subjects : [];
  const mergedSubjects = mergeSessionSubjects(oldSubjects, newSubjects);

  const incomingSnapshot = Array.isArray(newSession.studentSnapshot) && newSession.studentSnapshot.length > 0
    ? newSession.studentSnapshot
    : undefined;
  const oldSnapshot = Array.isArray(oldSession.studentSnapshot) && oldSession.studentSnapshot.length > 0
    ? oldSession.studentSnapshot
    : undefined;
  const incomingStudents = Array.isArray(newPayload.students) && newPayload.students.length > 0
    ? newPayload.students
    : undefined;
  const oldStudents = Array.isArray(oldPayload.students) && oldPayload.students.length > 0
    ? oldPayload.students
    : undefined;

  return {
    ...oldPayload,
    ...newPayload,
    ...(incomingStudents || oldStudents ? { students: incomingStudents || oldStudents } : {}),
    session: {
      ...oldSession,
      ...newSession,
      subjects: mergedSubjects,
      ...(incomingSnapshot || oldSnapshot ? { studentSnapshot: incomingSnapshot || oldSnapshot } : {}),
    },
  };
}

/**
 * Convert AnalysisSubmissionItem (TypeScript camelCase) to Supabase row (snake_case)
 */
export function toSupabaseAnalysisRow(item: AnalysisSubmissionItem): Record<string, any> {
  return {
    id: item.id,
    submission_type: item.submissionType || 'session',
    subject_name: item.subjectName || '',
    class_id: item.classId || '',
    class_name: item.className || '',
    exam_type: item.examType || '',
    school_year: item.schoolYear || '',
    teacher_name: item.teacherName || '',
    teacher_id: item.teacherId || null,
    teacher_role_title: item.teacherRoleTitle || null,
    kktp: item.kktp ?? 75,
    total_students: item.totalStudents || 0,
    completed_students: item.completedStudents || 0,
    passed_students: item.passedStudents || 0,
    average_grade: item.averageGrade || 0,
    teacher_note: item.teacherNote || null,
    admin_note: item.adminNote || null,
    status: item.status || 'menunggu',
    subject_statuses: item.subjectStatuses || {},
    messages: item.messages || [],
    payload: item.payload || {},
    first_submitted_at: item.firstSubmittedAt || item.submittedAt || new Date().toISOString(),
    submitted_at: item.submittedAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
    is_revision_resubmitted: Boolean(item.isRevisionResubmitted),
    last_revision_resubmitted_at: item.lastRevisionResubmittedAt || null,
  };
}

/**
 * Convert Supabase row (snake_case) to AnalysisSubmissionItem (TypeScript camelCase)
 */
export function fromSupabaseAnalysisRow(row: any): AnalysisSubmissionItem {
  return {
    id: row.id,
    submissionType: row.submission_type || 'session',
    subjectName: row.subject_name || '',
    classId: row.class_id || '',
    className: row.class_name || '',
    examType: row.exam_type || '',
    schoolYear: row.school_year || '',
    teacherName: row.teacher_name || '',
    teacherId: row.teacher_id || undefined,
    teacherRoleTitle: row.teacher_role_title || undefined,
    kktp: Number(row.kktp) || 75,
    totalStudents: Number(row.total_students) || 0,
    completedStudents: Number(row.completed_students) || 0,
    passedStudents: Number(row.passed_students) || 0,
    averageGrade: Number(row.average_grade) || 0,
    teacherNote: row.teacher_note || undefined,
    adminNote: row.admin_note || undefined,
    status: row.status || 'menunggu',
    subjectStatuses: row.subject_statuses || {},
    messages: Array.isArray(row.messages) ? row.messages : [],
    payload: row.payload || {},
    firstSubmittedAt: row.first_submitted_at || undefined,
    submittedAt: row.submitted_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
    isRevisionResubmitted: Boolean(row.is_revision_resubmitted),
    lastRevisionResubmittedAt: row.last_revision_resubmitted_at || undefined,
  };
}

function notifySubscribers(items: AnalysisSubmissionItem[]) {
  subscribers.forEach((cb) => {
    try {
      cb(items);
    } catch (e) {
      console.warn('Error in submission subscriber callback:', e);
    }
  });
}

export function getLocalAnalysisSubmissions(): AnalysisSubmissionItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort(
      (a, b) => new Date(b.updatedAt || b.submittedAt).getTime() - new Date(a.updatedAt || a.submittedAt).getTime()
    );
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

export const ANALYSIS_SUMMARY_COLUMNS = [
  'id',
  'submission_type',
  'subject_name',
  'class_id',
  'class_name',
  'exam_type',
  'school_year',
  'teacher_name',
  'teacher_id',
  'teacher_role_title',
  'kktp',
  'total_students',
  'completed_students',
  'passed_students',
  'average_grade',
  'teacher_note',
  'admin_note',
  'status',
  'subject_statuses',
  'messages',
  'first_submitted_at',
  'submitted_at',
  'updated_at',
  'is_revision_resubmitted',
  'last_revision_resubmitted_at',
].join(', ');

/**
 * Fetch fresh submissions from Supabase table with projection (hemat egress >99% tanpa payload raksasa)
 */
export async function fetchSubmissionsFromSupabase(force: boolean = false): Promise<AnalysisSubmissionItem[]> {
  const now = Date.now();
  if (!force && now - lastFetchTimestamp < FETCH_COOLDOWN_MS) {
    return getLocalAnalysisSubmissions();
  }
  lastFetchTimestamp = now;

  if (!isSupabaseConfigured()) {
    return getLocalAnalysisSubmissions();
  }

  try {
    let data: any[] | null = null;
    let error: any = null;

    // 1. Coba fetch ringan tanpa kolom payload raksasa (hemat transfer ratusan MB)
    const summaryRes = await supabase
      .from(SUPABASE_TABLE)
      .select(ANALYSIS_SUMMARY_COLUMNS)
      .order('submitted_at', { ascending: false });

    if (!summaryRes.error && summaryRes.data) {
      data = summaryRes.data;
    } else {
      // Fallback aman jika ada kolom baru yang belum ada di skema cache Supabase
      console.warn('[Supabase] Summary columns query fallback:', summaryRes.error?.message);
      const fallbackRes = await supabase
        .from(SUPABASE_TABLE)
        .select('id, submission_type, subject_name, class_id, class_name, exam_type, school_year, teacher_name, status, submitted_at, updated_at, kktp, total_students, completed_students, passed_students, average_grade, subject_statuses, messages')
        .order('submitted_at', { ascending: false });

      if (!fallbackRes.error && fallbackRes.data) {
        data = fallbackRes.data;
      } else {
        error = fallbackRes.error || summaryRes.error;
      }
    }

    if (error) {
      console.warn('[Supabase] Warning fetching analysis submissions:', error.message);
      return getLocalAnalysisSubmissions();
    }

    if (data && Array.isArray(data)) {
      const local = getLocalAnalysisSubmissions();
      const localMap = new Map(local.map((s) => [s.id, s]));

      const parsedItems = data.map((row) => {
        const item = fromSupabaseAnalysisRow(row);
        const existing = localMap.get(item.id);
        // Pertahankan payload yang sudah tersimpan di cache lokal agar tidak hilang
        if (existing?.payload && Object.keys(existing.payload).length > 0) {
          item.payload = existing.payload;
        }
        return item;
      });

      const supabaseIds = new Set(parsedItems.map((s) => s.id));
      const unpushedLocal = local.filter((s) => !supabaseIds.has(s.id));

      const merged = [...unpushedLocal, ...parsedItems].sort(
        (a, b) => new Date(b.updatedAt || b.submittedAt).getTime() - new Date(a.updatedAt || a.submittedAt).getTime()
      );

      saveLocalAnalysisSubmissions(merged);
      notifySubscribers(merged);

      // If we found local submissions that aren't in Supabase yet, push them in the background
      if (unpushedLocal.length > 0) {
        void syncLocalSubmissionsToSupabase();
      }

      return merged;
    }
  } catch (err) {
    console.warn('[Supabase] Exception fetching analysis submissions:', err);
  }

  return getLocalAnalysisSubmissions();
}

/**
 * Mengambil data payload analisis butir soal secara on-demand (hanya saat dibutuhkan).
 * Mencegah pemborosan kuota egress Supabase karena tidak mengunduh seluruh payload di awal.
 */
export async function fetchSubmissionPayloadById(id: string): Promise<Record<string, any> | null> {
  if (!id || !isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('payload')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn(`[Supabase] Gagal mengambil payload setoran ${id}:`, error.message);
      return null;
    }

    if (data?.payload && typeof data.payload === 'object') {
      const local = getLocalAnalysisSubmissions();
      const updated = local.map((item) =>
        item.id === id ? { ...item, payload: data.payload } : item
      );
      saveLocalAnalysisSubmissions(updated);
      return data.payload;
    }
  } catch (err) {
    console.warn(`[Supabase] Exception saat mengambil payload setoran ${id}:`, err);
  }

  return null;
}

/**
 * Upsert berkas setoran ke Supabase dengan toleransi otomatis jika ada kolom yang belum dibuat di database
 */
async function safeUpsertSubmissions(
  rows: Record<string, any>[]
): Promise<{ error?: any; omittedColumns?: string[] }> {
  let currentRows = rows.map((r) => ({ ...r }));
  const omittedColumns: string[] = [];
  const maxRetries = 15;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .upsert(currentRows, { onConflict: 'id' });

    if (!error) {
      return { omittedColumns: omittedColumns.length > 0 ? omittedColumns : undefined };
    }

    // Periksa apakah error disebabkan oleh kolom yang belum ada di schema cache Supabase
    const match = error.message.match(/Could not find the '([^']+)' column/i);
    if (match && match[1]) {
      const missingCol = match[1];
      console.warn(
        `[Supabase] Kolom '${missingCol}' belum terdaftar di tabel Supabase. Menyimpan data tanpa kolom '${missingCol}'...`
      );
      if (!omittedColumns.includes(missingCol)) {
        omittedColumns.push(missingCol);
      }
      currentRows = currentRows.map((r) => {
        const copy = { ...r };
        delete copy[missingCol];
        return copy;
      });
      continue;
    }

    return { error, omittedColumns };
  }

  return { error: new Error('Percobaan penyimpanan ke Supabase melebihi batas toleransi.') };
}

/**
 * Push all local cache submissions to Supabase (Emergency rescue & auto-migration)
 */
export async function syncLocalSubmissionsToSupabase(): Promise<{ total: number; pushed: number; error?: string; omittedColumns?: string[] }> {
  if (!isSupabaseConfigured()) {
    return {
      total: 0,
      pushed: 0,
      error: 'Koneksi Supabase belum dikonfigurasi. Silakan klik tombol pengaturan Supabase untuk mengisi URL & Anon Key.',
    };
  }

  const local = getLocalAnalysisSubmissions();
  if (local.length === 0) {
    return {
      total: 0,
      pushed: 0,
      error: 'Tidak ditemukan berkas setoran di cache lokal browser ini untuk disinkronkan.',
    };
  }

  try {
    const rows = local.map(toSupabaseAnalysisRow);
    const { error, omittedColumns } = await safeUpsertSubmissions(rows);

    if (error) {
      console.warn('[Supabase] Gagal menyimpan data lokal ke Supabase:', error.message);
      return { total: local.length, pushed: 0, error: `Supabase Error: ${error.message}` };
    }

    return { total: local.length, pushed: local.length, omittedColumns };
  } catch (err: any) {
    console.error('[Supabase] Exception syncing local submissions to Supabase:', err);
    return { total: local.length, pushed: 0, error: err?.message || 'Gagal sinkron' };
  }
}

/**
 * Tarik data setoran dari Firestore dan salin ke Supabase
 */
export async function syncFirestoreToSupabase(): Promise<{ total: number; pushed: number; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { total: 0, pushed: 0, error: 'Koneksi Supabase belum dikonfigurasi.' };
  }

  try {
    const q = collection(db, FIRESTORE_COLLECTION);
    const snapshot = await getDocs(q);
    const items: AnalysisSubmissionItem[] = [];
    snapshot.forEach((d) => {
      items.push(d.data() as AnalysisSubmissionItem);
    });

    if (items.length === 0) {
      return { total: 0, pushed: 0, error: 'Tidak ada dokumen setoran ditemukan di Firestore.' };
    }

    const rows = items.map(toSupabaseAnalysisRow);
    const { error } = await supabase.from(SUPABASE_TABLE).upsert(rows, { onConflict: 'id' });

    if (error) {
      return { total: items.length, pushed: 0, error: error.message };
    }

    saveLocalAnalysisSubmissions(items);
    notifySubscribers(items);
    return { total: items.length, pushed: items.length };
  } catch (err: any) {
    return {
      total: 0,
      pushed: 0,
      error: err?.message || 'Gagal membaca data dari Firestore (kemungkinan kuota Firestore sedang habis)',
    };
  }
}

let realtimeDebounceTimer: any = null;

function handleRealtimeSubmissionEvent(eventPayload: any) {
  try {
    const { eventType, new: newRow, old: oldRow } = eventPayload;
    const local = getLocalAnalysisSubmissions();

    if (eventType === 'DELETE' && oldRow?.id) {
      const filtered = local.filter((item) => item.id !== oldRow.id);
      saveLocalAnalysisSubmissions(filtered);
      notifySubscribers(filtered);
      return;
    }

    if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
      const incoming = fromSupabaseAnalysisRow(newRow);
      const existingIndex = local.findIndex((item) => item.id === newRow.id);

      let updated: AnalysisSubmissionItem[];
      if (existingIndex >= 0) {
        const existing = local[existingIndex];
        // Pertahankan payload dari lokal jika payload baru tidak disertakan dalam event
        if (existing?.payload && (!incoming.payload || Object.keys(incoming.payload).length === 0)) {
          incoming.payload = existing.payload;
        }
        updated = [...local];
        updated[existingIndex] = { ...existing, ...incoming };
      } else {
        updated = [incoming, ...local];
      }

      saveLocalAnalysisSubmissions(updated);
      notifySubscribers(updated);
      return;
    }
  } catch (err) {
    console.warn('[Supabase] Gagal memproses event realtime lokal:', err);
  }

  // Jika payload realtime tidak lengkap, lakukan fetch ringan dengan debounce 8 detik agar tidak membanjiri egress
  if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
  realtimeDebounceTimer = setTimeout(() => {
    void fetchSubmissionsFromSupabase(false);
  }, 8000);
}

/**
 * Setup lightweight Supabase Realtime channel for live updates without polling
 */
function ensureRealtimeSubscription() {
  if (isRealtimeSubscribed || !isSupabaseConfigured()) return;
  isRealtimeSubscribed = true;

  try {
    realtimeChannel = supabase
      .channel('public:analysis_submissions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_TABLE },
        (payload) => {
          handleRealtimeSubmissionEvent(payload);
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('[Supabase] Error initializing realtime channel for submissions:', err);
  }
}

/**
 * Realtime listener for Admin (Pak Zaki) & Teachers
 * - Emits local cache immediately (instant UI)
 * - Fetches from Supabase in background
 * - Uses single shared listener pool (Zero Firestore read overhead!)
 */
export function subscribeToAnalysisSubmissions(
  onUpdate: (submissions: AnalysisSubmissionItem[]) => void
): () => void {
  // 1. Emit local cache immediately
  const initialLocal = getLocalAnalysisSubmissions();
  onUpdate(initialLocal);

  // 2. Register subscriber
  subscribers.add(onUpdate);

  // 3. Ensure background realtime & fetch
  ensureRealtimeSubscription();
  void fetchSubmissionsFromSupabase();

  return () => {
    subscribers.delete(onUpdate);
  };
}

/**
 * Send an analysis submission to Pak Zaki (Admin)
 * Primary target: Supabase table (Zero Firestore quota used!)
 * Fallback: LocalStorage + optional Firestore backup
 */
export async function sendAnalysisSubmission(
  data: Omit<AnalysisSubmissionItem, 'id' | 'submittedAt' | 'status' | 'messages'>
): Promise<AnalysisSubmissionItem> {
  // Otoritas Keamanan: Cegah guru mengirimkan paket kelas penuh jika bukan Wali Kelas resmi
  if (data.submissionType === 'session' && data.teacherName) {
    const officialHomeroom =
      getEraporHomeroomForClass(data.classId) ||
      MASTER_CLASSES.find((c) => c.id.toUpperCase() === (data.classId || '').toUpperCase())?.waliKelas;

    if (!isAdminLoggedIn() && officialHomeroom) {
      const normTeacher = normalizeTeacherName(data.teacherName);
      const normHomeroom = normalizeTeacherName(officialHomeroom);
      if (normTeacher !== normHomeroom) {
        throw new Error(
          `Setoran paket kelas ditolak: Anda (${data.teacherName}) bukan Wali Kelas resmi ${data.className} (Wali Kelas: ${officialHomeroom}). Untuk menyetorkan nilai mapel yang Anda ampu, silakan gunakan mode Guru Bidang.`
        );
      }
    }
  }

  // Cache lokal menjadi sumber pencarian awal. Jangan memaksa refresh di sini:
  // fetch umum saat ini memilih versi Supabase untuk ID yang sama, sehingga bisa
  // menimpa payload lokal yang lebih baru ketika sinkronisasi sebelumnya gagal.
  const currentLocal = getLocalAnalysisSubmissions();
  const now = new Date().toISOString();
  const incomingClassId = normalizeSubmissionKey(data.classId);
  const incomingSchoolYear = normalizeSubmissionKey(data.schoolYear);
  const incomingExamType = normalizeSubmissionKey(data.examType);

  // Temukan setoran induk yang tepat. Untuk setoran sesi, jenis ujian ikut
  // menjadi pembeda agar STS/SAS yang berbeda tidak saling menimpa.
  const existingSubmission = currentLocal.find((s) => {
    const sameClass = normalizeSubmissionKey(s.classId) === incomingClassId;
    const sameYear = normalizeSubmissionKey(s.schoolYear) === incomingSchoolYear;
    if (!sameClass || !sameYear) return false;

    if (data.submissionType === 'session') {
      return (
        (s.submissionType || 'session') === 'session' &&
        normalizeSubmissionKey(s.examType) === incomingExamType
      );
    }

    return (
      (s.submissionType || 'subject') !== 'session' &&
      normalizeSubmissionKey(s.subjectName) === normalizeSubmissionKey(data.subjectName) &&
      normalizeSubmissionKey(s.examType) === incomingExamType
    );
  });

  const submissionId = existingSubmission
    ? existingSubmission.id
    : 'asub-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

  // Check if existing submission was previously under revision
  const wasUnderRevision =
    existingSubmission?.status === 'revisi' ||
    Object.values(existingSubmission?.subjectStatuses || {}).some((s) => s.status === 'revisi');

  // Prepare per-subject statuses
  const mergedSubjectStatuses: Record<string, SubjectPrintStatus> = {
    ...(existingSubmission?.subjectStatuses || {}),
  };

  if (data.submissionType === 'session' && data.payload?.session?.subjects) {
    const subjects = data.payload.session.subjects;
    const totalClassStudents =
      data.payload.students?.length ||
      data.payload.session.studentSnapshot?.length ||
      data.totalStudents ||
      0;

    for (const subj of subjects) {
      const name = (subj.name || subj.subjectName)?.trim();
      if (!name) continue;

      const completed =
        subj.completedStudentsCount !== undefined
          ? subj.completedStudentsCount
          : subj.studentResults
          ? Object.keys(subj.studentResults).length
          : 0;

      const existingStatusKey = Object.keys(mergedSubjectStatuses).find(
        (key) => normalizeSubmissionKey(key) === normalizeSubmissionKey(name)
      );
      const statusKey = existingStatusKey || name;
      const previousStatus = mergedSubjectStatuses[statusKey];

      if (!previousStatus) {
        mergedSubjectStatuses[statusKey] = {
          status: 'menunggu',
          lastSubmittedAt: now,
          completedStudents: completed,
          totalStudents: totalClassStudents || data.totalStudents,
        };
      } else {
        const nextStatus = previousStatus.status === 'revisi' ? 'menunggu' : previousStatus.status;
        mergedSubjectStatuses[statusKey] = {
          ...previousStatus,
          status: nextStatus,
          lastSubmittedAt: now,
          completedStudents: completed,
          totalStudents: totalClassStudents || data.totalStudents,
        };
      }
    }
  } else if (data.subjectName) {
    const subName = data.subjectName.trim();
    if (!mergedSubjectStatuses[subName]) {
      mergedSubjectStatuses[subName] = {
        status: existingSubmission?.status === 'telah_diprint' ? 'telah_diprint' : 'menunggu',
        lastSubmittedAt: now,
        completedStudents: data.completedStudents,
        totalStudents: data.totalStudents,
      };
    } else {
      const prevStatus = mergedSubjectStatuses[subName].status;
      const nextStatus = prevStatus === 'revisi' ? 'menunggu' : prevStatus;
      mergedSubjectStatuses[subName] = {
        ...mergedSubjectStatuses[subName],
        status: nextStatus,
        lastSubmittedAt: now,
        completedStudents: data.completedStudents,
        totalStudents: data.totalStudents,
      };
    }
  }

  // Calculate overall status
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

  // Prepare messages
  const existingMessages: SubmissionChatMessage[] = existingSubmission?.messages || [];
  const updatedMessages: SubmissionChatMessage[] = [...existingMessages];

  if (existingSubmission) {
    if (wasUnderRevision) {
      updatedMessages.push({
        id: 'msg-sys-' + Date.now().toString(36),
        senderName: 'Sistem SDIT',
        senderRole: 'system',
        text: `🔄 Guru (${data.teacherName || 'Guru Pengampu'}) telah mengirimkan perbaikan/revisi berkas analisis ${data.subjectName} (${data.className}) untuk verifikasi ulang Pak Zaki.`,
        timestamp: Date.now(),
        isSystem: true,
      });
    } else {
      updatedMessages.push({
        id: 'msg-sys-' + Date.now().toString(36),
        senderName: 'Sistem SDIT',
        senderRole: 'system',
        text: `🔄 Berkas analisis ${data.subjectName} (${data.className}) telah diperbarui dengan data setoran terbaru.`,
        timestamp: Date.now(),
        isSystem: true,
      });
    }
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

  const mergedPayload = data.submissionType === 'session'
    ? mergeSessionPayload(existingSubmission?.payload, data.payload)
    : (data.payload ?? existingSubmission?.payload ?? {});

  const targetSubmission: AnalysisSubmissionItem = {
    ...(existingSubmission || {}),
    ...data,
    id: submissionId,
    status: overallStatus,
    subjectStatuses: mergedSubjectStatuses,
    // Pertahankan payload sesi lama dan timpa hanya mapel yang dikirim ulang.
    payload: mergedPayload,
    firstSubmittedAt: existingSubmission?.firstSubmittedAt || existingSubmission?.submittedAt || now,
    submittedAt: now,
    updatedAt: now,
    isRevisionResubmitted: wasUnderRevision ? true : existingSubmission?.isRevisionResubmitted,
    lastRevisionResubmittedAt: wasUnderRevision ? now : existingSubmission?.lastRevisionResubmittedAt,
    messages: updatedMessages,
  };

  // 1. Save to local cache (instant response)
  const updatedLocal = [
    targetSubmission,
    ...currentLocal.filter((s) => s.id !== submissionId),
  ].sort((a, b) => new Date(b.updatedAt || b.submittedAt).getTime() - new Date(a.updatedAt || a.submittedAt).getTime());
  saveLocalAnalysisSubmissions(updatedLocal);
  notifySubscribers(updatedLocal);

  // 2. Persist to Supabase (Primary storage engine)
  if (isSupabaseConfigured()) {
    try {
      const row = toSupabaseAnalysisRow(targetSubmission);
      const { error } = await safeUpsertSubmissions([row]);
      if (error) {
        console.warn('[Supabase] Warning upserting submission:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Exception upserting submission:', err);
    }
  }

  // 3. Silent backup to Firestore (optional, non-blocking)
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    void setDoc(docRef, cleanObjectForFirestore(targetSubmission));
  } catch (err) {
    // Ignore firestore quota errors silently
  }

  return targetSubmission;
}

/**
 * Update print / approval status of a single subject within a submission
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

  // Update in local cache
  local[idx] = {
    ...sub,
    status: overallStatus,
    subjectStatuses: updatedStatuses,
    updatedAt: now,
    messages: updatedMessages,
  };
  saveLocalAnalysisSubmissions(local);
  notifySubscribers(local);

  // Send teacher notification
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

  // Update in Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from(SUPABASE_TABLE)
        .update({
          status: overallStatus,
          subject_statuses: updatedStatuses,
          updated_at: now,
          messages: updatedMessages,
        })
        .eq('id', submissionId);
    } catch (err) {
      console.warn('[Supabase] Warning updating single subject status:', err);
    }
  }

  // Silent Firestore update (catch errors safely)
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    void setDoc(
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
    // Ignore firestore quota errors
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

  let systemText = '';
  if (status === 'telah_diprint') {
    systemText = '🖨️ Berkas analisis telah selesai dicetak fisik oleh Pak Zaki (Admin TU).';
  } else if (status === 'disetujui') {
    systemText = '✅ Lembar analisis soal telah disetujui oleh Pak Zaki (Admin).';
  } else if (status === 'revisi') {
    systemText = `⚠️ Pak Zaki (Admin) meminta revisi berkas analisis ini.${adminNote ? ` Catatan: "${adminNote}"` : ''}`;
  } else {
    systemText = '⏳ Berkas dikembalikan ke status antrean menunggu.';
  }

  let updatedSubjectStatuses: Record<string, SubjectPrintStatus> | undefined;

  if (idx !== -1) {
    const currentSub = local[idx];
    const existingMsgs = currentSub.messages || [];

    const sysMsg: SubmissionChatMessage = {
      id: 'msg-sys-' + Date.now().toString(36),
      senderName: 'Sistem SDIT',
      senderRole: 'system',
      text: systemText,
      timestamp: Date.now(),
      isSystem: true,
    };
    newMessages = [...existingMsgs, sysMsg];

    if (currentSub.subjectStatuses && Object.keys(currentSub.subjectStatuses).length > 0) {
      updatedSubjectStatuses = { ...currentSub.subjectStatuses };
      for (const subjKey of Object.keys(updatedSubjectStatuses)) {
        updatedSubjectStatuses[subjKey] = {
          ...updatedSubjectStatuses[subjKey],
          status,
          ...(status === 'telah_diprint' ? { printedAt: now } : {}),
          ...(status === 'disetujui' ? { approvedAt: now } : {}),
          ...(adminNote !== undefined ? { revisionNote: adminNote } : {}),
        };
      }
    }

    local[idx] = {
      ...currentSub,
      status,
      ...(updatedSubjectStatuses ? { subjectStatuses: updatedSubjectStatuses } : {}),
      ...(adminNote !== undefined ? { adminNote } : {}),
      updatedAt: now,
      messages: newMessages,
    };
    saveLocalAnalysisSubmissions(local);
    notifySubscribers(local);

    try {
      const targetSub = local[idx];
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

  // Update in Supabase
  if (isSupabaseConfigured()) {
    try {
      const updateData: Record<string, any> = {
        status,
        updated_at: now,
        ...(updatedSubjectStatuses ? { subject_statuses: updatedSubjectStatuses } : {}),
        ...(adminNote !== undefined ? { admin_note: adminNote } : {}),
        ...(newMessages.length > 0 ? { messages: newMessages } : {}),
      };
      await supabase.from(SUPABASE_TABLE).update(updateData).eq('id', id);
    } catch (err) {
      console.warn('[Supabase] Warning updating submission status:', err);
    }
  }

  // Silent Firestore update (catch errors safely)
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    void setDoc(
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
    // Ignore firestore quota errors
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
    notifySubscribers(local);

    if (message.senderRole === 'admin') {
      try {
        await sendTeacherNotification({
          teacherId: local[idx].teacherId,
          teacherName: local[idx].teacherName,
          title: `Pesan Diskusi Analisis (${local[idx].subjectName})`,
          message: `💬 Pak Zaki: "${message.text.trim().substring(0, 80)}${message.text.trim().length > 80 ? '...' : ''}"`,
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

  // Update in Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from(SUPABASE_TABLE)
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
    } catch (err) {
      console.warn('[Supabase] Warning saving chat message:', err);
    }
  }

  // Silent Firestore update (catch errors safely)
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    void setDoc(
      docRef,
      cleanObjectForFirestore({
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (err) {
    // Ignore firestore quota errors
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
    notifySubscribers(local);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from(SUPABASE_TABLE)
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
    } catch (err) {
      console.warn('[Supabase] Warning deleting chat message:', err);
    }
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    void setDoc(
      docRef,
      cleanObjectForFirestore({
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (err) {
    // Ignore firestore errors
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
    notifySubscribers(local);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from(SUPABASE_TABLE)
        .update({
          messages: resetLog,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
    } catch (err) {
      console.warn('[Supabase] Warning clearing chat messages:', err);
    }
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, submissionId);
    void setDoc(
      docRef,
      cleanObjectForFirestore({
        messages: resetLog,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (err) {
    // Ignore firestore errors
  }
}

/**
 * Delete a submission by Pak Zaki
 * PERMANENTLY deletes from Supabase & LocalStorage & Firestore!
 * Meja langsung bersih, 0 MB tersisa di server.
 */
export async function deleteAnalysisSubmission(id: string): Promise<void> {
  // 1. Remove from local storage
  const local = getLocalAnalysisSubmissions().filter((s) => s.id !== id);
  saveLocalAnalysisSubmissions(local);
  notifySubscribers(local);

  // 2. Remove permanently from Supabase
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from(SUPABASE_TABLE).delete().eq('id', id);
      if (error) {
        console.warn('[Supabase] Warning deleting analysis submission:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Error deleting analysis submission:', err);
    }
  }

  // 3. Remove permanently from Firestore if possible
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    void deleteDoc(docRef);
  } catch (err) {
    // Ignore firestore errors
  }
}
