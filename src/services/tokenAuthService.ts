import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

export type TokenScope = 'all' | 'evaluation' | 'analysis';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  browser: string;
  activatedAt: string;
  lastActiveAt: string;
}

export interface AccessToken {
  code: string;
  clientName: string;
  scope: TokenScope;
  createdAt: string;
  expiresAt: string; // ISO date string or 'lifetime'
  status: 'active' | 'revoked';
  maxDevices: number; // Max allowed devices (default 1)
  devices?: DeviceInfo[];
  note?: string;
  batchId?: string; // Optional identifier for bulk generation
}

const TOKENS_COLLECTION = 'access_tokens';
const USER_TOKEN_KEY = 'sdit_activated_access_token';
const LOCAL_TOKENS_BACKUP_KEY = 'sdit_system_access_tokens_list';
const DEVICE_ID_KEY = 'sdit_device_fingerprint_id';

// Default starter token if no internet/firestore yet
const DEFAULT_SYSTEM_TOKENS: AccessToken[] = [
  {
    code: 'AF-PRO-2026',
    clientName: 'Lisensi Resmi SDIT Al Fikri (Default Master)',
    scope: 'all',
    createdAt: new Date().toISOString(),
    expiresAt: 'lifetime',
    status: 'active',
    maxDevices: 10,
    note: 'Token default sistem',
  },
  {
    code: 'DEMO-7HARI',
    clientName: 'Pengguna Demo Guru',
    scope: 'all',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    maxDevices: 3,
    note: 'Trial / Demo 7 Hari',
  },
];

let fallbackMemoryDeviceId: string | null = null;

/**
 * Get or create persistent unique device fingerprint
 */
export const getOrGenerateDeviceId = (): string => {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
      deviceId = `DEV-${Date.now().toString(36).toUpperCase()}-${randomStr}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (e) {
    if (!fallbackMemoryDeviceId) {
      const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
      fallbackMemoryDeviceId = `DEV-MEM-${Date.now().toString(36).toUpperCase()}-${randomStr}`;
    }
    return fallbackMemoryDeviceId;
  }
};

/**
 * Detect friendly device name & browser with detailed hardware model & OS
 */
export const getDeviceFriendlyName = (): {
  deviceName: string;
  browser: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
} => {
  const ua = navigator.userAgent;
  let browser = 'Browser';
  let deviceName = 'Komputer / Laptop';
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';

  // 1. Browser Detection
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome') && !ua.includes('Edg/')) browser = 'Google Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';

  // 2. Mobile / Tablet / Desktop Specific Device Detection
  const isTablet = /iPad|Tablet|(Android(?!.*Mobile))/i.test(ua);
  const isMobile = /iPhone|iPod|Android.*Mobile|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  if (isTablet) {
    deviceType = 'tablet';
    if (/iPad/i.test(ua)) {
      deviceName = 'iPad (Tablet iOS)';
    } else if (/Android/i.test(ua)) {
      // Coba ekstrak model android tablet jika ada
      const match = ua.match(/Android\s+([0-9.]+);\s*([^;)]+)/);
      deviceName = match && match[2] ? `Tablet Android (${match[2].trim()})` : 'Tablet Android';
    } else {
      deviceName = 'Tablet';
    }
  } else if (isMobile) {
    deviceType = 'mobile';
    if (/iPhone/i.test(ua)) {
      deviceName = 'iPhone (Smartphone iOS)';
    } else if (/Android/i.test(ua)) {
      // Ekstrak nama model HP Android (misal: "SM-A525F", "Redmi Note 10", "Pixel 7")
      const match = ua.match(/Android\s+[0-9.]+;\s*([A-Za-z0-9\s\-]+)(?:\s+Build|\))/i);
      const model = match && match[1] && !match[1].includes('Linux') ? match[1].trim() : '';
      deviceName = model ? `HP Android (${model})` : 'Smartphone Android';
    } else {
      deviceName = 'Smartphone';
    }
  } else {
    deviceType = 'desktop';
    if (/Macintosh|Mac OS X/i.test(ua)) {
      deviceName = 'MacBook / Mac OS';
    } else if (/Windows NT 10.0/i.test(ua)) {
      deviceName = 'Laptop / PC Windows 10/11';
    } else if (/Windows/i.test(ua)) {
      deviceName = 'Laptop / PC Windows';
    } else if (/Linux/i.test(ua) && !/Android/i.test(ua)) {
      deviceName = 'PC / Laptop Linux';
    } else if (/CrOS/i.test(ua)) {
      deviceName = 'Chromebook / ChromeOS';
    } else {
      deviceName = 'Laptop / Komputer';
    }
  }

  return { deviceName, browser, deviceType };
};

/**
 * Generate a random formatted token code (e.g. AF-X8K2-9M4Q)
 */
export const generateRandomTokenCode = (prefix: string = 'AF'): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const seg2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${seg1}-${seg2}`;
};

/**
 * Get all tokens from Firestore with local fallback
 */
export const fetchAllTokens = async (): Promise<AccessToken[]> => {
  try {
    const tokensRef = collection(db, TOKENS_COLLECTION);
    const snapshot = await getDocs(tokensRef);
    if (!snapshot.empty) {
      const list: AccessToken[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          code: docSnap.id.toUpperCase(),
          clientName: d.clientName || 'Klien',
          scope: d.scope || 'all',
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() || d.createdAt || new Date().toISOString(),
          expiresAt: d.expiresAt || 'lifetime',
          status: d.status || 'active',
          maxDevices: typeof d.maxDevices === 'number' ? d.maxDevices : 1,
          devices: Array.isArray(d.devices) ? d.devices : [],
          note: d.note || '',
          batchId: d.batchId || '',
        };
      });
      localStorage.setItem(LOCAL_TOKENS_BACKUP_KEY, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Could not fetch tokens from firestore, using local backup', err);
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(LOCAL_TOKENS_BACKUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // ignore
  }

  localStorage.setItem(LOCAL_TOKENS_BACKUP_KEY, JSON.stringify(DEFAULT_SYSTEM_TOKENS));
  return DEFAULT_SYSTEM_TOKENS;
};

/**
 * Save / Create new Single Token
 */
export const createToken = async (params: {
  code: string;
  clientName: string;
  scope: TokenScope;
  durationDays: number | 'lifetime' | string; // number of days, 'lifetime', or ISO string
  maxDevices?: number;
  note?: string;
  batchId?: string;
}): Promise<AccessToken> => {
  const cleanCode = params.code.trim().toUpperCase();
  if (!cleanCode) throw new Error('Kode token tidak boleh kosong.');

  const now = new Date();
  let expiresAt = 'lifetime';
  if (params.durationDays !== 'lifetime') {
    if (typeof params.durationDays === 'number') {
      const expDate = new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    } else if (typeof params.durationDays === 'string' && params.durationDays.includes('-')) {
      expiresAt = new Date(params.durationDays).toISOString();
    }
  }

  const newToken: AccessToken = {
    code: cleanCode,
    clientName: params.clientName.trim() || 'Klien Baru',
    scope: params.scope,
    createdAt: now.toISOString(),
    expiresAt,
    status: 'active',
    maxDevices: params.maxDevices && params.maxDevices > 0 ? params.maxDevices : 1,
    devices: [],
    note: params.note?.trim() || '',
    batchId: params.batchId || '',
  };

  // 1. Save to firestore
  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, cleanCode);
    await setDoc(tokenDocRef, {
      ...newToken,
      createdAtServer: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to save token to firestore, saved locally:', err);
  }

  // 2. Save to local storage
  const current = await fetchAllTokens();
  const filtered = current.filter((t) => t.code !== cleanCode);
  filtered.unshift(newToken);
  localStorage.setItem(LOCAL_TOKENS_BACKUP_KEY, JSON.stringify(filtered));

  return newToken;
};

/**
 * Bulk / Batch Generate Multiple Tokens simultaneously
 */
export const createBulkTokens = async (params: {
  count: number;
  prefix: string;
  clientBaseName: string;
  scope: TokenScope;
  durationDays: number | 'lifetime' | string;
  maxDevices?: number;
  note?: string;
}): Promise<AccessToken[]> => {
  const count = Math.min(Math.max(1, params.count), 100); // safety 1 to 100
  const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date();

  let expiresAt = 'lifetime';
  if (params.durationDays !== 'lifetime') {
    if (typeof params.durationDays === 'number') {
      const expDate = new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    } else if (typeof params.durationDays === 'string' && params.durationDays.includes('-')) {
      expiresAt = new Date(params.durationDays).toISOString();
    }
  }

  const newTokens: AccessToken[] = [];
  for (let i = 1; i <= count; i++) {
    const code = generateRandomTokenCode(params.prefix || 'AF');
    const clientName = count === 1 
      ? params.clientBaseName.trim() || 'Klien Baru'
      : `${params.clientBaseName.trim() || 'Voucher Lisensi'} #${i}`;

    newTokens.push({
      code,
      clientName,
      scope: params.scope,
      createdAt: now.toISOString(),
      expiresAt,
      status: 'active',
      maxDevices: params.maxDevices && params.maxDevices > 0 ? params.maxDevices : 1,
      devices: [],
      note: params.note ? `${params.note} (Batch ${batchId})` : `Batch ${batchId}`,
      batchId,
    });
  }

  // Save to Firestore using writeBatch if available
  try {
    const batch = writeBatch(db);
    newTokens.forEach((tok) => {
      const tokenDocRef = doc(db, TOKENS_COLLECTION, tok.code);
      batch.set(tokenDocRef, {
        ...tok,
        createdAtServer: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to bulk save to firestore, saving locally:', err);
  }

  // Save to local storage
  const current = await fetchAllTokens();
  const existingCodes = new Set(newTokens.map((t) => t.code));
  const filtered = current.filter((t) => !existingCodes.has(t.code));
  const updatedList = [...newTokens, ...filtered];
  localStorage.setItem(LOCAL_TOKENS_BACKUP_KEY, JSON.stringify(updatedList));

  return newTokens;
};

/**
 * Extend or update token expiration date directly
 */
export const updateTokenExpiry = async (
  code: string,
  newExpiresAt: string // ISO date or 'lifetime'
): Promise<void> => {
  const cleanCode = code.trim().toUpperCase();
  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, cleanCode);
    await updateDoc(tokenDocRef, { expiresAt: newExpiresAt });
  } catch (e) {
    console.warn('Failed to update expiry in firestore', e);
  }

  const current = await fetchAllTokens();
  const updated = current.map((t) => (t.code === cleanCode ? { ...t, expiresAt: newExpiresAt } : t));
  localStorage.setItem(LOCAL_TOKENS_BACKUP_KEY, JSON.stringify(updated));

  // If this token is also the currently activated one in this browser, update it
  const active = getUserActivatedToken();
  if (active && active.code === cleanCode) {
    active.expiresAt = newExpiresAt;
    localStorage.setItem(USER_TOKEN_KEY, JSON.stringify(active));
  }
};

/**
 * Update token max devices limit
 */
export const updateTokenMaxDevices = async (code: string, maxDevices: number): Promise<void> => {
  const cleanCode = code.trim().toUpperCase();
  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, cleanCode);
    await updateDoc(tokenDocRef, { maxDevices });
  } catch (e) {
    console.warn('Failed to update maxDevices in firestore', e);
  }

  const current = await fetchAllTokens();
  const updated = current.map((t) => (t.code === cleanCode ? { ...t, maxDevices } : t));
  localStorage.setItem(LOCAL_TOKENS_BACKUP_KEY, JSON.stringify(updated));
};

/**
 * Remove / Kick a registered device from a token
 */
export const removeDeviceFromToken = async (code: string, deviceId: string): Promise<void> => {
  const cleanCode = code.trim().toUpperCase();
  const allTokens = await fetchAllTokens();
  const target = allTokens.find((t) => t.code === cleanCode);
  if (!target) return;

  const updatedDevices = (target.devices || []).filter((d) => d.deviceId !== deviceId);

  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, cleanCode);
    await updateDoc(tokenDocRef, { devices: updatedDevices });
  } catch (e) {
    console.warn('Failed to remove device in firestore', e);
  }

  const updatedList = allTokens.map((t) => (t.code === cleanCode ? { ...t, devices: updatedDevices } : t));
  localStorage.setItem(LOCAL_TOKENS_BACKUP_KEY, JSON.stringify(updatedList));

  // If this browser was the removed device, deactivate it
  const myDeviceId = getOrGenerateDeviceId();
  if (myDeviceId === deviceId) {
    deactivateUserToken();
  }
};

/**
 * Revoke or Change status of a token
 */
export const revokeTokenStatus = async (code: string, newStatus: 'active' | 'revoked'): Promise<void> => {
  const cleanCode = code.trim().toUpperCase();
  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, cleanCode);
    await updateDoc(tokenDocRef, { status: newStatus });
  } catch (e) {
    console.warn('Failed to update token in firestore', e);
  }

  const current = await fetchAllTokens();
  const updated = current.map((t) => (t.code === cleanCode ? { ...t, status: newStatus } : t));
  localStorage.setItem(LOCAL_TOKENS_BACKUP_KEY, JSON.stringify(updated));

  // If this token is currently activated in local storage, purge it immediately if revoked
  const active = getUserActivatedToken();
  if (active && active.code === cleanCode && newStatus === 'revoked') {
    deactivateUserToken();
  }
};

/**
 * Delete token permanently
 */
export const deleteTokenPermanently = async (code: string): Promise<void> => {
  const cleanCode = code.trim().toUpperCase();
  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, cleanCode);
    await deleteDoc(tokenDocRef);
  } catch (e) {
    console.warn('Failed to delete token from firestore', e);
  }

  const current = await fetchAllTokens();
  const updated = current.filter((t) => t.code !== cleanCode);
  localStorage.setItem(LOCAL_TOKENS_BACKUP_KEY, JSON.stringify(updated));

  const active = getUserActivatedToken();
  if (active && active.code === cleanCode) {
    deactivateUserToken();
  }
};

/**
 * Get active user activated token stored in browser
 */
export const getUserActivatedToken = (): AccessToken | null => {
  try {
    const raw = localStorage.getItem(USER_TOKEN_KEY);
    if (!raw) return null;
    const token: AccessToken = JSON.parse(raw);
    if (!token || !token.code) return null;

    // Local expiration check
    if (token.expiresAt !== 'lifetime') {
      const exp = new Date(token.expiresAt).getTime();
      if (Date.now() > exp) {
        localStorage.removeItem(USER_TOKEN_KEY);
        return null;
      }
    }
    return token;
  } catch (e) {
    return null;
  }
};

/**
 * Validate and Activate token in user browser with device tracking & slot checking
 */
export const activateUserToken = async (
  inputCode: string
): Promise<{ success: boolean; token?: AccessToken; message: string }> => {
  const clean = inputCode.trim().toUpperCase();
  if (!clean) {
    return { success: false, message: 'Harap masukkan kode token lisensi.' };
  }

  // Always fetch latest from Firestore or local fallback
  let found: AccessToken | null = null;
  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, clean);
    const snap = await getDoc(tokenDocRef);
    if (snap.exists()) {
      const d = snap.data();
      found = {
        code: snap.id.toUpperCase(),
        clientName: d.clientName || 'Klien',
        scope: d.scope || 'all',
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || d.createdAt || new Date().toISOString(),
        expiresAt: d.expiresAt || 'lifetime',
        status: d.status || 'active',
        maxDevices: typeof d.maxDevices === 'number' ? d.maxDevices : 1,
        devices: Array.isArray(d.devices) ? d.devices : [],
        note: d.note || '',
        batchId: d.batchId || '',
      };
    }
  } catch (e) {
    console.warn('Direct fetch from firestore failed, checking all tokens list', e);
  }

  if (!found) {
    const allTokens = await fetchAllTokens();
    found = allTokens.find((t) => t.code.toUpperCase() === clean) || null;
  }

  if (!found) {
    return { success: false, message: 'Kode token tidak ditemukan atau tidak valid.' };
  }

  if (found.status === 'revoked') {
    return { success: false, message: 'Token lisensi ini telah dinonaktifkan (revoked) oleh administrator.' };
  }

  if (found.expiresAt !== 'lifetime') {
    const exp = new Date(found.expiresAt).getTime();
    if (Date.now() > exp) {
      return { success: false, message: 'Masa aktif token lisensi ini telah berakhir (expired).' };
    }
  }

  // Device slot registration check
  const deviceId = getOrGenerateDeviceId();
  const { deviceName, browser } = getDeviceFriendlyName();
  const existingDevices = found.devices || [];
  const maxAllowed = found.maxDevices || 1;

  const currentDeviceIndex = existingDevices.findIndex((d) => d.deviceId === deviceId);

  if (currentDeviceIndex === -1 && existingDevices.length >= maxAllowed) {
    return {
      success: false,
      message: `Batas kuota perangkat penuh! Token ini telah digunakan pada ${existingDevices.length} dari maksimal ${maxAllowed} perangkat. Hubungi Admin untuk mereset atau menambah kuota.`,
    };
  }

  // Update or append this device info
  const nowIso = new Date().toISOString();
  let updatedDevices: DeviceInfo[] = [...existingDevices];

  if (currentDeviceIndex >= 0) {
    updatedDevices[currentDeviceIndex] = {
      ...updatedDevices[currentDeviceIndex],
      deviceName,
      browser,
      lastActiveAt: nowIso,
    };
  } else {
    updatedDevices.push({
      deviceId,
      deviceName,
      browser,
      activatedAt: nowIso,
      lastActiveAt: nowIso,
    });
  }

  found.devices = updatedDevices;

  // Persist updated devices to Firestore
  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, clean);
    await updateDoc(tokenDocRef, { devices: updatedDevices });
  } catch (err) {
    console.warn('Failed to update device list in firestore', err);
  }

  // Save active token to browser
  localStorage.setItem(USER_TOKEN_KEY, JSON.stringify(found));
  return {
    success: true,
    token: found,
    message: `Aktivasi berhasil! Selamat datang, ${found.clientName}. (Perangkat: ${deviceName} - Slot ${updatedDevices.length}/${maxAllowed})`,
  };
};

/**
 * Clear user token
 */
export const deactivateUserToken = (): void => {
  localStorage.removeItem(USER_TOKEN_KEY);
};

/**
 * Check if current user has access to a commercial feature (Synchronous fast check)
 */
export const checkFeatureAccess = (
  feature: 'evaluation' | 'analysis',
  isAdmin: boolean
): { hasAccess: boolean; token: AccessToken | null; reason?: string } => {
  if (isAdmin) {
    return {
      hasAccess: true,
      token: {
        code: 'SUPER-ADMIN',
        clientName: 'Administrator SDIT Al Fikri',
        scope: 'all',
        createdAt: new Date().toISOString(),
        expiresAt: 'lifetime',
        status: 'active',
        maxDevices: 999,
      },
    };
  }

  const activeToken = getUserActivatedToken();
  if (!activeToken) {
    return { hasAccess: false, token: null, reason: 'Belum memasukkan token' };
  }

  if (activeToken.status === 'revoked') {
    deactivateUserToken();
    return { hasAccess: false, token: null, reason: 'Token telah dinonaktifkan oleh administrator' };
  }

  if (activeToken.expiresAt !== 'lifetime') {
    const exp = new Date(activeToken.expiresAt).getTime();
    if (Date.now() > exp) {
      deactivateUserToken();
      return { hasAccess: false, token: null, reason: 'Masa aktif token telah berakhir' };
    }
  }

  if (activeToken.scope === 'all' || activeToken.scope === feature) {
    return { hasAccess: true, token: activeToken };
  }

  return { hasAccess: false, token: activeToken, reason: 'Paket token tidak mencakup fitur ini' };
};

let cachedTokenCheck: {
  tokenCode: string;
  feature: string;
  timestamp: number;
  result: { isValid: boolean; message?: string };
} | null = null;

/**
 * REAL-TIME Verifier: Asynchronously checks Firestore to ensure the token hasn't been revoked,
 * deleted, or expired on the server while the user is using the app.
 * Caches recent positive results for 3 minutes to optimize Firestore read quota during watchdog checks.
 */
export const verifyActiveTokenRealtime = async (
  feature: 'evaluation' | 'analysis',
  isAdmin: boolean,
  forceRefresh: boolean = false
): Promise<{ isValid: boolean; message?: string }> => {
  if (isAdmin) {
    return { isValid: true };
  }

  const activeToken = getUserActivatedToken();
  if (!activeToken) {
    return { isValid: false, message: 'Harap masukkan token lisensi terlebih dahulu.' };
  }

  // Use 3-minute cache for frequent watchdog background checks if token code & feature match
  if (
    !forceRefresh &&
    cachedTokenCheck &&
    cachedTokenCheck.tokenCode === activeToken.code.toUpperCase() &&
    cachedTokenCheck.feature === feature &&
    Date.now() - cachedTokenCheck.timestamp < 3 * 60 * 1000
  ) {
    return cachedTokenCheck.result;
  }

  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, activeToken.code.toUpperCase());
    const snap = await getDoc(tokenDocRef);

    if (!snap.exists()) {
      deactivateUserToken();
      cachedTokenCheck = null;
      return { isValid: false, message: 'Token lisensi tidak ditemukan di server atau telah dihapus.' };
    }

    const serverData = snap.data();
    if (serverData.status === 'revoked') {
      deactivateUserToken();
      cachedTokenCheck = null;
      return { isValid: false, message: 'Token lisensi Anda telah dinonaktifkan (revoked) oleh Administrator.' };
    }

    if (serverData.expiresAt && serverData.expiresAt !== 'lifetime') {
      const exp = new Date(serverData.expiresAt).getTime();
      if (Date.now() > exp) {
        deactivateUserToken();
        cachedTokenCheck = null;
        return { isValid: false, message: 'Masa aktif token lisensi ini telah berakhir (expired).' };
      }
    }

    // Check if device was removed/kicked
    const myDeviceId = getOrGenerateDeviceId();
    const serverDevices: DeviceInfo[] = Array.isArray(serverData.devices) ? serverData.devices : [];
    const isDeviceAllowed = serverDevices.some((d) => d.deviceId === myDeviceId);

    if (serverDevices.length > 0 && !isDeviceAllowed) {
      deactivateUserToken();
      cachedTokenCheck = null;
      return { isValid: false, message: 'Perangkat ini telah dicabut (kicked) dari daftar lisensi aktif oleh Administrator.' };
    }

    // Update local snapshot with server data
    const updatedLocalToken: AccessToken = {
      ...activeToken,
      expiresAt: serverData.expiresAt || activeToken.expiresAt,
      status: serverData.status || activeToken.status,
      maxDevices: typeof serverData.maxDevices === 'number' ? serverData.maxDevices : activeToken.maxDevices,
      scope: serverData.scope || activeToken.scope,
    };
    localStorage.setItem(USER_TOKEN_KEY, JSON.stringify(updatedLocalToken));

    if (updatedLocalToken.scope !== 'all' && updatedLocalToken.scope !== feature) {
      const scopeResult = { isValid: false, message: 'Lisensi token Anda tidak mencakup modul ini.' };
      cachedTokenCheck = null;
      return scopeResult;
    }

    const successResult = { isValid: true };
    cachedTokenCheck = {
      tokenCode: activeToken.code.toUpperCase(),
      feature,
      timestamp: Date.now(),
      result: successResult,
    };
    return successResult;
  } catch (err) {
    // If offline / network error, fallback to strict local check
    const localCheck = checkFeatureAccess(feature, isAdmin);
    return { isValid: localCheck.hasAccess, message: localCheck.reason };
  }
};

