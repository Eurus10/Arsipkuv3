import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

// Suppress internal Firebase console.error logs for Firestore quota limits (resource-exhausted)
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map((a) => (typeof a === 'string' ? a : a?.message || a?.code || '')).join(' ');
    if (
      msg.includes('resource-exhausted') ||
      msg.includes('Quota exceeded') ||
      msg.includes('maximum backoff delay')
    ) {
      console.warn('[Firestore Cache Mode Active]', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Use the dedicated databaseId if provided, fallback to default, ensuring undefined fields don't throw
export const db = config.firestoreDatabaseId
  ? initializeFirestore(app, { ignoreUndefinedProperties: true }, config.firestoreDatabaseId)
  : initializeFirestore(app, { ignoreUndefinedProperties: true });

export default app;

