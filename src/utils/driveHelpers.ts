import { isAdminLoggedIn } from '../services/auth';
import {
  getActiveTeacherSession,
  verifyActiveTeacherSessionRealtime,
} from '../services/teacherStorage';

export function getDriveFileType(url: string): {
  type: 'doc' | 'sheet' | 'slide' | 'folder' | 'form' | 'pdf' | 'link';
  label: string;
  badgeText: string;
  color: string;
  badgeDark: string;
} {
  const cleanUrl = (url || '').toLowerCase();

  if (cleanUrl.includes('drive.google.com/drive/folders')) {
    return {
      type: 'folder',
      label: 'Folder Drive',
      badgeText: 'DIR',
      color: 'text-amber-400',
      badgeDark: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
  }

  if (cleanUrl.includes('docs.google.com/document')) {
    return {
      type: 'doc',
      label: 'Google Docs',
      badgeText: 'DOCX',
      color: 'text-blue-400',
      badgeDark: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    };
  }

  if (cleanUrl.includes('docs.google.com/spreadsheets')) {
    return {
      type: 'sheet',
      label: 'Google Sheets',
      badgeText: 'XLSX',
      color: 'text-emerald-400',
      badgeDark: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
  }

  if (cleanUrl.includes('docs.google.com/presentation')) {
    return {
      type: 'slide',
      label: 'Google Slides',
      badgeText: 'PPTX',
      color: 'text-amber-400',
      badgeDark: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
  }

  if (cleanUrl.includes('docs.google.com/forms')) {
    return {
      type: 'form',
      label: 'Google Forms',
      badgeText: 'FORM',
      color: 'text-purple-400',
      badgeDark: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    };
  }

  if (cleanUrl.includes('.pdf') || cleanUrl.includes('pdf')) {
    return {
      type: 'pdf',
      label: 'PDF Document',
      badgeText: 'PDF',
      color: 'text-rose-400',
      badgeDark: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    };
  }

  return {
    type: 'link',
    label: 'Google Drive',
    badgeText: 'DRIVE',
    color: 'text-teal-400',
    badgeDark: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  };
}

export function sanitizeDriveUrl(url?: string): string {
  if (!url) return '';

  let trimmed = url.trim();

  if (!trimmed) return '';

  // Remove wrapping quotes if pasted with quotes
  trimmed = trimmed.replace(/^["']|["']$/g, '').trim();

  // If hash link (e.g. #tracking), return as is
  if (trimmed.startsWith('#')) {
    return trimmed;
  }

  // If user pasted a drive link without https://
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  return trimmed;
}

export function isValidUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim();

  return trimmed.length > 0;
}

/**
 * Robust link opener that works seamlessly inside iframes,
 * mobile devices, and standard browsers.
 */
export function openExternalDriveUrl(url?: string): boolean {
  const sanitized = sanitizeDriveUrl(url);

  if (!sanitized) {
    console.warn('Empty URL provided to openExternalDriveUrl');
    return false;
  }

  if (sanitized.startsWith('#')) {
    return false;
  }

  // 1. Programmatic anchor click fallback (most reliable across iframes and mobile browsers)
  try {
    const link = document.createElement('a');
    link.href = sanitized;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        link.remove();
      } catch {}
    }, 500);

    return true;
  } catch (err) {
    console.warn(
      'Anchor click fallback failed, attempting window.open:',
      err
    );
  }

  // 2. Direct window.open fallback
  try {
    const win = window.open(
      sanitized,
      '_blank',
      'noopener,noreferrer'
    );

    if (win) {
      win.focus();
      return true;
    }
  } catch (err) {
    console.error(
      'Failed to open link via window.open:',
      err
    );
  }

  return false;
}

/**
 * ============================================================
 * PROTECTED DRIVE OPENER
 * ============================================================
 *
 * Membuka arsip/dokumen Google Drive dengan proteksi sesi:
 * 1. Jika Admin aktif -> Izinkan akses penuh langsung.
 * 2. Jika Sesi Guru aktif -> Buka seketika (mencegah popup blocker),
 *    lalu verifikasi status realtime di latar belakang.
 * 3. Jika sesi tidak ada / diblokir -> Kunci akses & beri peringatan.
 */
export function openProtectedExternalDriveUrl(
  url?: string,
  options?: {
    onInvalidSession?: (message: string) => void;
  }
): boolean {
  const sanitized = sanitizeDriveUrl(url);

  if (!sanitized) {
    console.warn(
      'Empty URL provided to openProtectedExternalDriveUrl'
    );
    return false;
  }

  if (sanitized.startsWith('#')) {
    return false;
  }

  // 1. Cek apakah Admin sedang login
  const isAdmin = isAdminLoggedIn();

  // 2. Cek sesi lokal guru
  const activeTeacher = getActiveTeacherSession();

  // Jika bukan Admin dan tidak memiliki sesi guru yang aktif/diblokir
  if (!isAdmin && (!activeTeacher || activeTeacher.status === 'blocked')) {
    const message =
      options?.onInvalidSession
        ? 'Sesi akses guru belum aktif atau telah dicabut oleh Administrator.'
        : 'Sesi akses guru belum aktif atau telah dicabut oleh Administrator.';

    if (options?.onInvalidSession) {
      options.onInvalidSession(message);
    }

    window.dispatchEvent(
      new CustomEvent('teacher-session-invalidated', {
        detail: {
          message,
        },
      })
    );

    return false;
  }

  // 3. Buka URL secara langsung dalam siklus event klik pengguna untuk menghindari blokir popup browser
  const opened = openExternalDriveUrl(sanitized);

  // 4. Verifikasi realtime di latar belakang untuk guru (tanpa menunda pembukaan tab)
  if (!isAdmin && activeTeacher) {
    verifyActiveTeacherSessionRealtime()
      .then((verification) => {
        if (!verification.isValid) {
          const message =
            verification.message ||
            'Sesi akses Anda telah dicabut oleh Administrator.';

          if (options?.onInvalidSession) {
            options.onInvalidSession(message);
          }

          window.dispatchEvent(
            new CustomEvent('teacher-session-invalidated', {
              detail: {
                message,
              },
            })
          );
        }
      })
      .catch((err) => {
        console.warn('Background session verification error:', err);
      });
  }

  return opened;
}