/**
 * Passive Firestore Quota Usage Tracker
 * Monitors daily read, write, and delete operations in local storage
 * with zero network overhead and zero impact on application features.
 */

export interface DailyQuotaUsage {
  dateKey: string; // YYYY-MM-DD
  reads: number;
  writes: number;
  deletes: number;
  lastUpdated: number;
}

export const FIRESTORE_DAILY_LIMITS = {
  reads: 50000,
  writes: 20000,
  deletes: 20000,
};

const QUOTA_STORAGE_KEY = 'sdit_firestore_daily_quota_v1';
type QuotaListener = (usage: DailyQuotaUsage) => void;
const listeners = new Set<QuotaListener>();

function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Reads the current daily quota usage from localStorage.
 * Resets automatically if a new day has started.
 */
export function getDailyQuotaUsage(): DailyQuotaUsage {
  const todayKey = getTodayDateKey();
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (raw) {
      const parsed: DailyQuotaUsage = JSON.parse(raw);
      if (parsed.dateKey === todayKey) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading quota tracker storage:', err);
  }

  const fresh: DailyQuotaUsage = {
    dateKey: todayKey,
    reads: 0,
    writes: 0,
    deletes: 0,
    lastUpdated: Date.now(),
  };
  saveQuotaUsage(fresh);
  return fresh;
}

function saveQuotaUsage(usage: DailyQuotaUsage): void {
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(usage));
    notifyListeners(usage);
  } catch (err) {
    console.warn('Error saving quota usage to storage:', err);
  }
}

function notifyListeners(usage: DailyQuotaUsage): void {
  listeners.forEach((listener) => {
    try {
      listener(usage);
    } catch (e) {
      console.error('Error in quota listener:', e);
    }
  });
}

/**
 * Record a Firestore operation (reads, writes, or deletes).
 */
export function recordQuotaUsage(
  type: 'reads' | 'writes' | 'deletes',
  count: number = 1
): void {
  if (count <= 0) return;
  const current = getDailyQuotaUsage();
  current[type] = (current[type] || 0) + count;
  current.lastUpdated = Date.now();
  saveQuotaUsage(current);
}

/**
 * Subscribe to real-time quota changes.
 */
export function subscribeToQuotaUpdates(callback: QuotaListener): () => void {
  listeners.add(callback);
  // Send current state immediately
  callback(getDailyQuotaUsage());

  return () => {
    listeners.delete(callback);
  };
}

/**
 * Manually reset today's quota counter.
 */
export function resetDailyQuotaUsage(): DailyQuotaUsage {
  const todayKey = getTodayDateKey();
  const resetData: DailyQuotaUsage = {
    dateKey: todayKey,
    reads: 0,
    writes: 0,
    deletes: 0,
    lastUpdated: Date.now(),
  };
  saveQuotaUsage(resetData);
  return resetData;
}
