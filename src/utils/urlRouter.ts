import { NavTab } from '../types';

/**
 * Mapping from NavTab to canonical URL path.
 */
export const TAB_TO_PATH: Record<NavTab, string> = {
  dashboard: '/',
  administrasi: '/administrasi',
  soal: '/bank-soal',
  tracking_soal: '/tracking-soal',
  sertifikat: '/sertifikat',
  rapor: '/rapor',
  rapor_sts: '/rapor-sts',
  student_db: '/database-siswa',
  academic_settings: '/pengaturan-akademik',
  admin: '/pengaturan',
};

/**
 * Mapping aliases to standard NavTab to support various URL variations.
 * Examples:
 * /trackingsoal, /tracking-soal, /tracking -> 'tracking_soal'
 * /banksoal, /soal, /bank-soal -> 'soal'
 * /administrasi, /administrasi-guru -> 'administrasi'
 * /admin, /pengaturan, /settings -> 'admin'
 * /siswa, /database-siswa, /data-siswa -> 'student_db'
 * /kisi-kisi, /evaluasi, /evaluasi-soal -> 'dashboard' (with scroll/focus)
 */
const PATH_ALIASES: Record<string, NavTab> = {
  '': 'dashboard',
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/beranda': 'dashboard',
  '/home': 'dashboard',

  '/administrasi': 'administrasi',
  '/administrasi-guru': 'administrasi',
  '/administrasiguru': 'administrasi',
  '/perangkat': 'administrasi',
  '/perangkat-ajar': 'administrasi',

  '/soal': 'soal',
  '/banksoal': 'soal',
  '/bank-soal': 'soal',
  '/arsip-soal': 'soal',

  '/trackingsoal': 'tracking_soal',
  '/tracking-soal': 'tracking_soal',
  '/tracking': 'tracking_soal',
  '/pengumpulan-soal': 'tracking_soal',
  '/upload-soal': 'tracking_soal',
  '/uploadsoal': 'tracking_soal',

  '/sertifikat': 'sertifikat',
  '/piagam': 'sertifikat',
  '/arsip-sertifikat': 'sertifikat',

  '/rapor': 'rapor',
  '/raport': 'rapor',
  '/arsip-rapor': 'rapor',

  '/rapor-sts': 'rapor_sts',
  '/raporsts': 'rapor_sts',
  '/e-rapor': 'rapor_sts',
  '/erapor': 'rapor_sts',
  '/e-rapor-sts': 'rapor_sts',

  '/database-siswa': 'student_db',
  '/databasesiswa': 'student_db',
  '/siswa': 'student_db',
  '/data-siswa': 'student_db',
  '/datasiswa': 'student_db',

  '/pengaturan-akademik': 'academic_settings',
  '/akademik/pengaturan': 'academic_settings',
  '/master-akademik': 'academic_settings',

  '/admin': 'admin',
  '/pengaturan': 'admin',
  '/settings': 'admin',
  '/kelola': 'admin',
};

/**
 * Parses current window.location.pathname and returns the corresponding NavTab.
 */
export function getTabFromCurrentPath(): NavTab {
  if (typeof window === 'undefined') return 'dashboard';

  let pathname = window.location.pathname.toLowerCase().trim();
  // Remove trailing slashes (except root)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  if (PATH_ALIASES[pathname]) {
    return PATH_ALIASES[pathname];
  }

  // Also check if any prefix matches
  for (const [alias, tab] of Object.entries(PATH_ALIASES)) {
    if (alias && alias !== '/' && pathname.startsWith(alias)) {
      return tab;
    }
  }

  return 'dashboard';
}

/**
 * Updates browser URL path without reloading the page.
 */
export function syncUrlWithTab(tab: NavTab, replace: boolean = false): void {
  if (typeof window === 'undefined') return;

  const targetPath = TAB_TO_PATH[tab] || '/';
  const currentPath = window.location.pathname;

  // Don't push if already on the same path
  if (currentPath === targetPath) {
    return;
  }

  const stateData = { app: 'sdit-arsip', tab, modal: null };
  if (replace) {
    window.history.replaceState(stateData, '', targetPath);
  } else {
    window.history.pushState(stateData, '', targetPath);
  }
}
