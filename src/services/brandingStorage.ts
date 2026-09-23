import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface AppBranding {
  logoType: 'text' | 'image';
  logoText: string;
  logoImageUrl?: string;

  // Personal Profile Info (Pojok Kanan Atas)
  personalName?: string;
  personalRole?: string;
  personalAvatarUrl?: string;
  personalEmail?: string;

  // Personal QRIS Info (Sebelah Logo Pribadi)
  personalQrisImageUrl?: string;
  personalQrisMerchantName?: string;
  personalQrisNmid?: string;
  personalQrisBankName?: string;
  personalQrisAccountNumber?: string;
  personalQrisDescription?: string;

  // Header Banner Background Photo
  headerBgImageUrl?: string;

  updatedAt?: string;
}

export const DEFAULT_BRANDING: AppBranding = {
  logoType: 'text',
  logoText: 'AF',
  logoImageUrl: '',
  personalName: 'Pengembang Portal',
  personalRole: 'Guru / Inisiator',
  personalAvatarUrl: '',
  personalEmail: 'sditaf23@gmail.com',
  personalQrisImageUrl: '',
  personalQrisMerchantName: 'DUKUNGAN PENGEMBANG',
  personalQrisNmid: 'ID1020304050607',
  personalQrisBankName: 'BSI / DANA / QRIS',
  personalQrisAccountNumber: '',
  personalQrisDescription: 'Dukungan & Apresiasi Pengembangan Aplikasi Portal Guru',
  headerBgImageUrl: '/assets/Templateadmin/dashboard_header_background.webp',
};

const LOCAL_BRANDING_KEY = 'sdit_al_fikri_app_branding_v1';
const FIRESTORE_BRANDING_DOC = 'app_branding';

export function getLocalBranding(): AppBranding {
  try {
    const raw = localStorage.getItem(LOCAL_BRANDING_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const parsed = JSON.parse(raw);
    return {
      logoType: parsed.logoType === 'image' ? 'image' : 'text',
      logoText: parsed.logoText || 'AF',
      logoImageUrl: parsed.logoImageUrl || '',
      personalName: parsed.personalName || DEFAULT_BRANDING.personalName,
      personalRole: parsed.personalRole || DEFAULT_BRANDING.personalRole,
      personalAvatarUrl: parsed.personalAvatarUrl || '',
      personalEmail: parsed.personalEmail || DEFAULT_BRANDING.personalEmail,
      personalQrisImageUrl: parsed.personalQrisImageUrl || '',
      personalQrisMerchantName: parsed.personalQrisMerchantName || DEFAULT_BRANDING.personalQrisMerchantName,
      personalQrisNmid: parsed.personalQrisNmid || DEFAULT_BRANDING.personalQrisNmid,
      personalQrisBankName: parsed.personalQrisBankName || DEFAULT_BRANDING.personalQrisBankName,
      personalQrisAccountNumber: parsed.personalQrisAccountNumber || '',
      personalQrisDescription: parsed.personalQrisDescription || DEFAULT_BRANDING.personalQrisDescription,
      headerBgImageUrl: parsed.headerBgImageUrl || DEFAULT_BRANDING.headerBgImageUrl,
      updatedAt: parsed.updatedAt,
    };
  } catch (err) {
    console.error('Error reading branding from localStorage:', err);
    return DEFAULT_BRANDING;
  }
}

export function saveLocalBranding(branding: AppBranding): void {
  try {
    localStorage.setItem(LOCAL_BRANDING_KEY, JSON.stringify(branding));
  } catch (err) {
    console.error('Error saving branding to localStorage:', err);
  }
}

export async function updateStoredBranding(branding: AppBranding): Promise<void> {
  saveLocalBranding(branding);
  try {
    const ref = doc(db, 'settings', FIRESTORE_BRANDING_DOC);
    await setDoc(ref, {
      ...branding,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore branding update failed, saved locally:', err);
  }
}

export function subscribeToBranding(callback: (branding: AppBranding) => void): () => void {
  const ref = doc(db, 'settings', FIRESTORE_BRANDING_DOC);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppBranding;
        const branding: AppBranding = {
          logoType: data.logoType === 'image' ? 'image' : 'text',
          logoText: data.logoText || 'AF',
          logoImageUrl: data.logoImageUrl || '',
          personalName: data.personalName || DEFAULT_BRANDING.personalName,
          personalRole: data.personalRole || DEFAULT_BRANDING.personalRole,
          personalAvatarUrl: data.personalAvatarUrl || '',
          personalEmail: data.personalEmail || DEFAULT_BRANDING.personalEmail,
          personalQrisImageUrl: data.personalQrisImageUrl || '',
          personalQrisMerchantName: data.personalQrisMerchantName || DEFAULT_BRANDING.personalQrisMerchantName,
          personalQrisNmid: data.personalQrisNmid || DEFAULT_BRANDING.personalQrisNmid,
          personalQrisBankName: data.personalQrisBankName || DEFAULT_BRANDING.personalQrisBankName,
          personalQrisAccountNumber: data.personalQrisAccountNumber || '',
          personalQrisDescription: data.personalQrisDescription || DEFAULT_BRANDING.personalQrisDescription,
          headerBgImageUrl: data.headerBgImageUrl || DEFAULT_BRANDING.headerBgImageUrl,
          updatedAt: data.updatedAt,
        };
        saveLocalBranding(branding);
        callback(branding);
      } else {
        callback(getLocalBranding());
      }
    },
    (err) => {
      console.warn('Firestore branding listener error:', err);
      callback(getLocalBranding());
    }
  );
}

export function processLogoImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang diunggah harus berupa gambar (PNG, JPG, SVG, WebP).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('Gagal membaca file gambar.'));
        return;
      }
      if (file.type.includes('svg')) {
        resolve(result);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 300;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/png', 0.9);
        resolve(compressed);
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function processBannerImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang diunggah harus berupa gambar (PNG, JPG, WebP).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('Gagal membaca file gambar.'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1280;
        const maxH = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
        if (height > maxH) {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed);
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function processQrisImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang diunggah harus berupa gambar (PNG, JPG, WebP, SVG).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('Gagal membaca file gambar QRIS.'));
        return;
      }
      if (file.type.includes('svg')) {
        resolve(result);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1600; // High definition for crisp barcodes & text
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        // Use high-quality PNG or high-res JPEG for barcode sharpness
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressed = canvas.toDataURL(format, 0.94);
        resolve(compressed);
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

