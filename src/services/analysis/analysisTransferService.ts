import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AnalysisSession } from '../../types/analysisTypes';

const TRANSFERS_COLLECTION = 'analysis_transfers';
const LOCAL_TRANSFERS_KEY = 'sdit_analysis_transfers_local';

/**
 * Generate 6-digit numeric transfer code (e.g. "492815")
 */
export function generate6DigitCode(): string {
  // Generate random 6-digit string between 100000 and 999999
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
}

/**
 * Simpan sesi analisis ke cloud dengan kode 6 digit (Sangat hemat kuota, payload JSON teks < 30KB)
 * Masa berlaku kode: 24 jam.
 */
export async function createTransferCode(session: AnalysisSession): Promise<{
  code: string;
  expiresAt: string;
}> {
  if (!session || !session.classId) {
    throw new Error('Sesi analisis tidak valid untuk dibuatkan kode tarik.');
  }

  const code = generate6DigitCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // Bersihkan data snapshot agar payload seminimal mungkin
  const compactPayload = {
    code,
    classId: session.classId,
    className: session.className,
    examType: session.examType,
    schoolYear: session.schoolYear,
    schoolName: session.schoolName || '',
    teacherName: session.teacherName || '',
    analysisDate: session.analysisDate || '',
    kktp: session.kktp || 70,
    sessionJson: JSON.stringify(session),
    createdAt: now.toISOString(),
    expiresAt,
    deviceInfo: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Mobile') ? 'HP / Smartphone' : 'Laptop / PC') : 'Web',
  };

  // Simpan ke Firestore
  try {
    const docRef = doc(db, TRANSFERS_COLLECTION, code);
    await setDoc(docRef, compactPayload);
  } catch (err) {
    console.warn('Firestore transfer save failed, fallback to local storage:', err);
  }

  // Simpan juga ke localStorage sebagai fallback offline / direct device
  try {
    const localMap = getLocalTransfers();
    localMap[code] = compactPayload;
    localStorage.setItem(LOCAL_TRANSFERS_KEY, JSON.stringify(localMap));
  } catch (e) {
    // ignore
  }

  return { code, expiresAt };
}

/**
 * Ambil sesi analisis menggunakan kode 6 digit
 */
export async function fetchSessionByTransferCode(rawCode: string): Promise<{
  session: AnalysisSession;
  deviceInfo?: string;
  createdAt?: string;
}> {
  const code = rawCode.trim().replace(/[^0-9]/g, '');
  if (code.length !== 6) {
    throw new Error('Kode tarik harus terdiri dari 6 digit angka.');
  }

  let foundData: any = null;

  // 1. Coba ambil dari Firestore
  try {
    const docRef = doc(db, TRANSFERS_COLLECTION, code);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      foundData = snap.data();
    }
  } catch (err) {
    console.warn('Firestore transfer read failed, checking local transfers:', err);
  }

  // 2. Jika belum ketemu, cek local storage
  if (!foundData) {
    const localMap = getLocalTransfers();
    if (localMap[code]) {
      foundData = localMap[code];
    }
  }

  if (!foundData) {
    throw new Error(`Kode tarik "${code}" tidak ditemukan atau telah kedaluwarsa.`);
  }

  // Periksa masa berlaku (24 jam)
  if (foundData.expiresAt) {
    const exp = new Date(foundData.expiresAt).getTime();
    if (Date.now() > exp) {
      throw new Error(`Kode tarik "${code}" sudah kedaluwarsa (berlaku 24 jam). Silakan buat kode baru.`);
    }
  }

  if (!foundData.sessionJson) {
    throw new Error('Format data sesi dalam kode tarik tidak valid.');
  }

  try {
    const session = JSON.parse(foundData.sessionJson) as AnalysisSession;
    return {
      session,
      deviceInfo: foundData.deviceInfo,
      createdAt: foundData.createdAt,
    };
  } catch (err) {
    throw new Error('Gagal menguraikan data sesi analisis.');
  }
}

function getLocalTransfers(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LOCAL_TRANSFERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
