import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  updatePassword,
  User
} from 'firebase/auth';
import { auth } from './firebase';

export const ADMIN_AUTH_EMAIL = (import.meta as any).env.VITE_ADMIN_AUTH_EMAIL || 'adminzaki@sditalfikri.sch.id';
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
    return isLocalLoggedIn || !!auth.currentUser;
  } catch {
    return !!auth.currentUser;
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

  const unsubscribeFirebase = onAuthStateChanged(auth, (user) => {
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
