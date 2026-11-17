import {
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';
import { auth } from './firebase';

export const ADMIN_AUTH_EMAIL = (import.meta as any).env.VITE_ADMIN_AUTH_EMAIL || 'adminzaki@sditalfikri.sch.id';

const EXTRA_GOOGLE_ADMIN_EMAILS: string[] = String((import.meta as any).env.VITE_ADMIN_GOOGLE_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_GOOGLE_EMAILS: string[] = Array.from(
  new Set(['sditaf23@gmail.com', 'sdit.alfikri@gmail.com', ...EXTRA_GOOGLE_ADMIN_EMAILS])
);

const LOCAL_ADMIN_KEY = 'sdit_admin_logged_in';
const ADMIN_PASSWORD_KEY = 'sdit_admin_custom_password';

const DEFAULT_ADMIN_PASSWORD = (import.meta as any).env.VITE_ADMIN_PASSWORD || 'adminzaki';

// Get current custom admin password or default from environment
function getStoredAdminPassword(): string {
  try {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
  } catch {
    return DEFAULT_ADMIN_PASSWORD;
  }
}

function setStoredAdminPassword(pass: string): void {
  try {
    localStorage.setItem(ADMIN_PASSWORD_KEY, pass);
  } catch (err) {
    console.error('Error saving admin password:', err);
  }
}

/**
 * Checks whether the active Firebase Auth user is a verified Admin email
 * permitted by Firestore security rules to mutate Tracking Soal records.
 */
export function isFirebaseTrackingAdminReady(): boolean {
  const user = auth.currentUser;
  if (!user || !user.email || !user.emailVerified) {
    return false;
  }
  return ADMIN_GOOGLE_EMAILS.includes(user.email.toLowerCase());
}

/**
 * Sign in Admin using Google Popup and verify email allowlist.
 */
export async function loginAdminWithGoogle(
  rememberMe: boolean = true
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;
    const email = (user?.email || '').toLowerCase();

    if (!user?.emailVerified || !ADMIN_GOOGLE_EMAILS.includes(email)) {
      await signOut(auth).catch(() => {});
      return {
        success: false,
        error: `Akun Google (${user?.email || 'tidak diketahui'}) tidak terdaftar sebagai Administrator SDIT Al Fikri.`,
      };
    }

    localStorage.setItem(LOCAL_ADMIN_KEY, 'true');
    return { success: true, email: user.email || undefined };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return {
        success: false,
        error: 'Login Google dibatalkan.',
      };
    }
    return {
      success: false,
      error: err?.message || 'Gagal melakukan autentikasi Google Admin.',
    };
  }
}

/**
 * Log in admin using Firebase Authentication with robust local fallback.
 */
export async function loginAdmin(password: string, rememberMe: boolean = true): Promise<boolean> {
  if (!password || !password.trim()) {
    return false;
  }

  const trimmedPassword = password.trim();
  const currentAdminPass = getStoredAdminPassword();

  // Validate password
  if (trimmedPassword === currentAdminPass || trimmedPassword === DEFAULT_ADMIN_PASSWORD) {
    try {
      localStorage.setItem(LOCAL_ADMIN_KEY, 'true');
      // Attempt Firebase auth in background if enabled
      try {
        const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        await signInWithEmailAndPassword(auth, ADMIN_AUTH_EMAIL, trimmedPassword);
      } catch (fbErr) {
        // Firebase auth might not be enabled in console; local fallback is active
        console.warn('Firebase Auth note:', fbErr);
      }
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  }

  // Try standard Firebase Auth if password doesn't match default/custom local password
  try {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    await signInWithEmailAndPassword(auth, ADMIN_AUTH_EMAIL, trimmedPassword);
    localStorage.setItem(LOCAL_ADMIN_KEY, 'true');
    return true;
  } catch (err: any) {
    console.error('Admin login error:', err);
    return false;
  }
}

/**
 * Update admin password.
 */
export async function setAdminPassword(newPassword: string): Promise<boolean> {
  if (!newPassword || newPassword.trim().length < 3) {
    return false;
  }
  try {
    const trimmed = newPassword.trim();
    setStoredAdminPassword(trimmed);
    
    // Also try updating in Firebase if user is logged in
    const user = auth.currentUser;
    if (user) {
      try {
        await updatePassword(user, trimmed);
      } catch (fbErr) {
        console.warn('Firebase password update note:', fbErr);
      }
    }
    return true;
  } catch (err) {
    console.error('Error updating admin password:', err);
    return false;
  }
}

/**
 * Log out admin.
 */
export async function logoutAdmin(): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_ADMIN_KEY);
    await signOut(auth);
  } catch (err) {
    console.error('Error logging out admin:', err);
  }
}

/**
 * Check if admin is logged in.
 */
export function isAdminLoggedIn(): boolean {
  try {
    const isLocalLoggedIn = localStorage.getItem(LOCAL_ADMIN_KEY) === 'true';
    return isLocalLoggedIn || isFirebaseTrackingAdminReady();
  } catch {
    return isFirebaseTrackingAdminReady();
  }
}

/**
 * Subscribe to authentication state changes.
 */
export function subscribeToAuth(callback: (isLoggedIn: boolean, user: User | null) => void): () => void {
  const checkState = () => {
    callback(isAdminLoggedIn(), auth.currentUser);
  };

  // Initial check
  checkState();

  const unsubscribeFirebase = onAuthStateChanged(auth, () => {
    checkState();
  });

  // Storage event listener for multi-tab sync
  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_ADMIN_KEY) {
      checkState();
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    unsubscribeFirebase();
    window.removeEventListener('storage', handleStorage);
  };
}
