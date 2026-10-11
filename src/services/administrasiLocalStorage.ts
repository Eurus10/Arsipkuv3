import { ProtaData } from '../components/administrasi/ProtaGeneratorModal';
import { PromesData } from '../components/administrasi/PromesGeneratorModal';

const PROTA_STORAGE_KEY = 'sdit_arsip_local_prota_drafts_v1';
const PROMES_STORAGE_KEY = 'sdit_arsip_local_promes_drafts_v1';

export interface SavedProtaDraft {
  id: string;
  judul: string;
  mataPelajaran: string;
  kelas: string;
  fase: string;
  tahunPelajaran: string;
  modeAcuan: string;
  totalJP: number;
  totalMinggu: number;
  updatedAt: string;
  protaData: ProtaData;
}

export interface SavedPromesDraft {
  id: string;
  judul: string;
  mataPelajaran: string;
  kelas: string;
  fase: string;
  semester: string;
  tahunPelajaran: string;
  modeAcuan: string;
  totalJP: number;
  updatedAt: string;
  promesData: PromesData;
}

// ==========================================
// PROTA STORAGE (BROWSER LOCALSTORAGE ONLY)
// ==========================================

export function getProtaDrafts(): SavedProtaDraft[] {
  try {
    const raw = localStorage.getItem(PROTA_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Gagal membaca draft Prota dari browser storage:', err);
    return [];
  }
}

export function saveProtaDraft(protaData: ProtaData): SavedProtaDraft {
  try {
    const existing = getProtaDrafts();
    const id = `prota_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mapel = protaData.identitas.mataPelajaran || 'Mata Pelajaran';
    const kls = protaData.identitas.kelas || 'SD';
    const tapel = protaData.identitas.tahunPelajaran || '2025/2026';
    const judul = `PROTA - ${mapel} (${kls} - TP ${tapel})`;

    const newDraft: SavedProtaDraft = {
      id,
      judul,
      mataPelajaran: mapel,
      kelas: kls,
      fase: protaData.identitas.fase || 'Fase B',
      tahunPelajaran: tapel,
      modeAcuan: protaData.identitas.modeAcuan || 'kurikulum_nasional',
      totalJP: protaData.rincianMingguEfektif?.totalJPTahunan || 0,
      totalMinggu: protaData.rincianMingguEfektif?.totalMingguEfektifTahunan || 0,
      updatedAt: new Date().toISOString(),
      protaData,
    };

    // Filter out same mapel & kelas if already exists, then prepend new one
    const updated = [newDraft, ...existing.filter((d) => !(d.mataPelajaran === mapel && d.kelas === kls && d.tahunPelajaran === tapel))].slice(0, 30);
    localStorage.setItem(PROTA_STORAGE_KEY, JSON.stringify(updated));
    return newDraft;
  } catch (err) {
    console.error('Gagal menyimpan draft Prota ke browser storage:', err);
    throw new Error('Penyimpanan lokal browser penuh atau tidak dapat diakses.');
  }
}

export function deleteProtaDraft(id: string): void {
  try {
    const existing = getProtaDrafts();
    const updated = existing.filter((d) => d.id !== id);
    localStorage.setItem(PROTA_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Gagal menghapus draft Prota dari browser storage:', err);
  }
}

// ==========================================
// PROMES STORAGE (BROWSER LOCALSTORAGE ONLY)
// ==========================================

export function getPromesDrafts(): SavedPromesDraft[] {
  try {
    const raw = localStorage.getItem(PROMES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Gagal membaca draft Promes dari browser storage:', err);
    return [];
  }
}

export function savePromesDraft(promesData: PromesData): SavedPromesDraft {
  try {
    const existing = getPromesDrafts();
    const id = `promes_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mapel = promesData.identitas.mataPelajaran || 'Mata Pelajaran';
    const kls = promesData.identitas.kelas || 'SD';
    const sem = promesData.identitas.semester || 'Semester 1';
    const tapel = promesData.identitas.tahunPelajaran || '2025/2026';
    const judul = `PROMES - ${mapel} (${kls} - ${sem} - TP ${tapel})`;

    const newDraft: SavedPromesDraft = {
      id,
      judul,
      mataPelajaran: mapel,
      kelas: kls,
      fase: promesData.identitas.fase || 'Fase B',
      semester: sem,
      tahunPelajaran: tapel,
      modeAcuan: promesData.identitas.modeAcuan || 'kurikulum_nasional',
      totalJP: promesData.rekapitulasiAgenda?.totalSemesterJP || promesData.identitas.totalJP || 0,
      updatedAt: new Date().toISOString(),
      promesData,
    };

    // Filter out same mapel, kelas, sem, tapel, then prepend
    const updated = [newDraft, ...existing.filter((d) => !(d.mataPelajaran === mapel && d.kelas === kls && d.semester === sem && d.tahunPelajaran === tapel))].slice(0, 30);
    localStorage.setItem(PROMES_STORAGE_KEY, JSON.stringify(updated));
    return newDraft;
  } catch (err) {
    console.error('Gagal menyimpan draft Promes ke browser storage:', err);
    throw new Error('Penyimpanan lokal browser penuh atau tidak dapat diakses.');
  }
}

export function deletePromesDraft(id: string): void {
  try {
    const existing = getPromesDrafts();
    const updated = existing.filter((d) => d.id !== id);
    localStorage.setItem(PROMES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Gagal menghapus draft Promes dari browser storage:', err);
  }
}
