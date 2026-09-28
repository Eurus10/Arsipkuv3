import { DEFAULT_CLASS_TEACHERS, TeacherProfile } from '../../types/raporSts';
import { GLOBAL_CONFIG_LOCAL_KEY, LOCAL_STORAGE_PREFIX } from '../raporStsService';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { MASTER_CLASSES } from '../../data/masterExamData';

/**
 * Service jembatan (Bridge) untuk membaca data Wali Kelas dari modul e-Rapor
 * secara murni read-only tanpa mengubah kode atau data e-Rapor sama sekali.
 */

// Memory cache untuk performa tinggi tanpa hit I/O berulang
let homeroomCache: Record<string, string> | null = null;

/**
 * Membaca peta nama wali kelas per kelas dari data e-Rapor (LocalStorage + default e-Rapor)
 */
export function getEraporHomeroomMap(): Record<string, string> {
  if (homeroomCache && Object.keys(homeroomCache).length > 0) {
    return { ...homeroomCache };
  }

  const map: Record<string, string> = {};

  // 1. Inisialisasi dari DEFAULT_CLASS_TEACHERS resmi e-Rapor
  Object.entries(DEFAULT_CLASS_TEACHERS).forEach(([cls, teacher]) => {
    if (teacher && teacher.name) {
      map[cls.toUpperCase()] = teacher.name.trim();
    }
  });

  // 2. Baca dari Global Config e-Rapor (sdit_rapor_sts_global_config)
  try {
    const rawGlobal = localStorage.getItem(GLOBAL_CONFIG_LOCAL_KEY);
    if (rawGlobal) {
      const parsed = JSON.parse(rawGlobal);
      if (parsed && parsed.classTeachers && typeof parsed.classTeachers === 'object') {
        const classTeachers = parsed.classTeachers as Record<string, TeacherProfile>;
        Object.entries(classTeachers).forEach(([cls, teacher]) => {
          if (teacher && teacher.name && teacher.name.trim()) {
            map[cls.toUpperCase()] = teacher.name.trim();
          }
        });
      }
    }
  } catch (err) {
    console.warn('[e-Rapor Bridge] Gagal membaca global config lokal:', err);
  }

  // 3. Baca dari file kelas tersimpan e-Rapor di LocalStorage (sdit_rapor_sts_class_*)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
        try {
          const rawClass = localStorage.getItem(key);
          if (rawClass) {
            const classObj = JSON.parse(rawClass);
            const classLevel = (classObj?.config?.classLevel || '').toUpperCase().trim();
            const teacherName = (classObj?.config?.teacherName || '').trim();
            if (classLevel && teacherName) {
              map[classLevel] = teacherName;
            }
          }
        } catch (e) {
          // ignore corrupted single entry
        }
      }
    }
  } catch (err) {
    console.warn('[e-Rapor Bridge] Gagal memindai cache kelas lokal:', err);
  }

  // 4. Fallback ke MASTER_CLASSES jika ada kelas yang belum terdaftar di e-Rapor
  MASTER_CLASSES.forEach((cls) => {
    const upperId = cls.id.toUpperCase();
    if (!map[upperId] && cls.waliKelas) {
      map[upperId] = cls.waliKelas;
    }
  });

  homeroomCache = map;
  return { ...map };
}

/**
 * Mengambil nama wali kelas berdasarkan classId (contoh: "1A", "4B", "6A")
 * Menggunakan pencarian case-insensitive & normalisasi format rombel.
 */
export function getEraporHomeroomForClass(
  classId: string,
  customMap?: Record<string, string>
): string {
  if (!classId) return '';
  const cleanId = classId.trim().toUpperCase();
  const map = customMap || getEraporHomeroomMap();

  // 1. Direct match
  if (map[cleanId]) return map[cleanId];

  // 2. Format strip match ("Kelas 1A" -> "1A")
  const stripped = cleanId.replace(/^KELAS\s*/i, '').trim();
  if (map[stripped]) return map[stripped];

  // 3. Case-insensitive key match
  const foundKey = Object.keys(map).find(
    (k) => k.toLowerCase() === cleanId.toLowerCase() || k.toLowerCase() === stripped.toLowerCase()
  );
  if (foundKey && map[foundKey]) return map[foundKey];

  return '';
}

/**
 * Sinkronisasi data wali kelas terbaru dari Cloud Firestore (rapor_sts_settings/global_config)
 * Dijalankan di background secara murni read-only.
 */
export async function syncEraporHomeroomFromCloud(): Promise<Record<string, string>> {
  try {
    const docRef = doc(db, 'rapor_sts_settings', 'global_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.classTeachers && typeof data.classTeachers === 'object') {
        const current = getEraporHomeroomMap();
        const cloudTeachers = data.classTeachers as Record<string, TeacherProfile>;
        Object.entries(cloudTeachers).forEach(([cls, teacher]) => {
          if (teacher && teacher.name && teacher.name.trim()) {
            current[cls.toUpperCase()] = teacher.name.trim();
          }
        });
        homeroomCache = current;
        return { ...current };
      }
    }
  } catch (err) {
    // Cloud offline / permission error, tetap gunakan local map
    console.debug('[e-Rapor Bridge] Menggunakan data offline e-rapor:', err);
  }

  return getEraporHomeroomMap();
}

/**
 * Invalidate cache jika user memperbarui pengaturan
 */
export function invalidateEraporHomeroomCache(): void {
  homeroomCache = null;
}
