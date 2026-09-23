import {
  EvaluationBlueprint,
  EvaluationQuestionPackage,
  EvaluationReviewResult,
  CurriculumReference,
} from '../../types/evaluationTypes';

const BLUEPRINTS_STORAGE_KEY =
  'arsipku_evaluation_blueprints_v1';

const QUESTIONS_STORAGE_KEY =
  'arsipku_evaluation_questions_v1';

const REVIEWS_STORAGE_KEY =
  'arsipku_evaluation_reviews_v1';

const CURRICULUM_STORAGE_KEY =
  'arsipku_evaluation_curriculum_v1';

// ==========================================
// 1. KISI-KISI STORAGE
// ==========================================

export function getStoredBlueprints(): EvaluationBlueprint[] {
  try {
    const raw = localStorage.getItem(
      BLUEPRINTS_STORAGE_KEY
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      console.error(
        '[Evaluation Storage] Data blueprint bukan array.'
      );

      return [];
    }

    return parsed;
  } catch (e) {
    console.error(
      '[Evaluation Storage] Failed to parse evaluation blueprints:',
      e
    );

    return [];
  }
}

export function saveBlueprint(
  blueprint: EvaluationBlueprint
): void {
  try {
    const existing =
      getStoredBlueprints();

    const idx =
      existing.findIndex(
        (b) => b.id === blueprint.id
      );

    if (idx >= 0) {
      existing[idx] = {
        ...blueprint,
        updatedAt:
          new Date().toISOString(),
      };
    } else {
      existing.unshift(blueprint);
    }

    localStorage.setItem(
      BLUEPRINTS_STORAGE_KEY,
      JSON.stringify(existing)
    );

    console.log(
      '[Evaluation Storage] Blueprint saved:',
      blueprint.id
    );
  } catch (e) {
    console.error(
      '[Evaluation Storage] Failed to save blueprint:',
      e
    );
  }
}

/**
 * Menghapus satu kisi-kisi berdasarkan ID.
 *
 * Return:
 * true  = berhasil menemukan dan menghapus data
 * false = ID tidak ditemukan / terjadi error
 */
export function deleteBlueprint(
  id: string
): boolean {
  try {
    const raw =
      localStorage.getItem(
        BLUEPRINTS_STORAGE_KEY
      );

    if (!raw) {
      console.warn(
        '[Evaluation Storage] Tidak ada blueprint tersimpan.'
      );

      return false;
    }

    const existing: EvaluationBlueprint[] =
      JSON.parse(raw);

    if (!Array.isArray(existing)) {
      console.error(
        '[Evaluation Storage] Data blueprint bukan array.'
      );

      return false;
    }

    const beforeCount =
      existing.length;

    const updated =
      existing.filter(
        (blueprint) =>
          blueprint.id !== id
      );

    /*
     * Jika jumlah data tidak berubah,
     * berarti ID tidak ditemukan.
     */
    if (
      updated.length === beforeCount
    ) {
      console.warn(
        '[Evaluation Storage] Blueprint tidak ditemukan:',
        id
      );

      return false;
    }

    /*
     * Simpan kembali data yang sudah
     * kehilangan blueprint tersebut.
     */
    localStorage.setItem(
      BLUEPRINTS_STORAGE_KEY,
      JSON.stringify(updated)
    );

    /*
     * Verifikasi ulang.
     * Ini penting supaya kita tahu bahwa
     * data benar-benar hilang dari storage.
     */
    const verificationRaw =
      localStorage.getItem(
        BLUEPRINTS_STORAGE_KEY
      );

    const verificationData =
      verificationRaw
        ? JSON.parse(verificationRaw)
        : [];

    const stillExists =
      Array.isArray(
        verificationData
      ) &&
      verificationData.some(
        (blueprint: EvaluationBlueprint) =>
          blueprint.id === id
      );

    if (stillExists) {
      console.error(
        '[Evaluation Storage] Verifikasi gagal. Blueprint masih ada:',
        id
      );

      return false;
    }

    console.log(
      '[Evaluation Storage] Blueprint berhasil dihapus:',
      id
    );

    return true;
  } catch (e) {
    console.error(
      '[Evaluation Storage] Failed to delete blueprint:',
      e
    );

    return false;
  }
}

// ==========================================
// 2. SOAL PACKAGES STORAGE
// ==========================================

export function getStoredQuestionPackages(): EvaluationQuestionPackage[] {
  try {
    const raw = localStorage.getItem(
      QUESTIONS_STORAGE_KEY
    );

    return raw
      ? JSON.parse(raw)
      : [];
  } catch (e) {
    console.error(
      'Failed to parse question packages:',
      e
    );

    return [];
  }
}

export function saveQuestionPackage(
  pkg: EvaluationQuestionPackage
): void {
  try {
    const existing =
      getStoredQuestionPackages();

    const idx =
      existing.findIndex(
        (q) => q.id === pkg.id
      );

    if (idx >= 0) {
      existing[idx] = {
        ...pkg,
        updatedAt:
          new Date().toISOString(),
      };
    } else {
      existing.unshift(pkg);
    }

    localStorage.setItem(
      QUESTIONS_STORAGE_KEY,
      JSON.stringify(existing)
    );
  } catch (e) {
    console.error(
      'Failed to save question package:',
      e
    );
  }
}

export function deleteQuestionPackage(
  id: string
): boolean {
  try {
    const raw = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    if (!raw) return true;

    const existing: EvaluationQuestionPackage[] = JSON.parse(raw);
    if (!Array.isArray(existing)) return true;

    const updated = existing.filter((q) => q.id !== id);
    localStorage.setItem(
      QUESTIONS_STORAGE_KEY,
      JSON.stringify(updated)
    );

    console.log('[Evaluation Storage] Paket soal berhasil dihapus:', id);
    return true;
  } catch (e) {
    console.error(
      'Failed to delete question package:',
      e
    );
    return false;
  }
}

// ==========================================
// 3. REVIEW HASIL UJIAN STORAGE
// ==========================================

export function getStoredReviews(): EvaluationReviewResult[] {
  try {
    const raw = localStorage.getItem(
      REVIEWS_STORAGE_KEY
    );

    return raw
      ? JSON.parse(raw)
      : [];
  } catch (e) {
    console.error(
      'Failed to parse evaluation reviews:',
      e
    );

    return [];
  }
}

export function saveReviewResult(
  review: EvaluationReviewResult
): void {
  try {
    const existing =
      getStoredReviews();

    const idx =
      existing.findIndex(
        (r) => r.id === review.id
      );

    if (idx >= 0) {
      existing[idx] = review;
    } else {
      existing.unshift(review);
    }

    localStorage.setItem(
      REVIEWS_STORAGE_KEY,
      JSON.stringify(existing)
    );
  } catch (e) {
    console.error(
      'Failed to save evaluation review:',
      e
    );
  }
}

export function deleteReviewResult(
  id: string
): void {
  try {
    const existing =
      getStoredReviews()
        .filter(
          (r) => r.id !== id
        );

    localStorage.setItem(
      REVIEWS_STORAGE_KEY,
      JSON.stringify(existing)
    );
  } catch (e) {
    console.error(
      'Failed to delete evaluation review:',
      e
    );
  }
}

// ==========================================
// 4. KURIKULUM NASIONAL STORAGE (ADMIN)
// ==========================================

export function getStoredCurriculumReferences(): CurriculumReference[] {
  try {
    const raw = localStorage.getItem(
      CURRICULUM_STORAGE_KEY
    );

    return raw
      ? JSON.parse(raw)
      : [];
  } catch (e) {
    console.error(
      'Failed to parse curriculum references:',
      e
    );

    return [];
  }
}

export function saveCurriculumReference(
  item: CurriculumReference
): void {
  try {
    const existing =
      getStoredCurriculumReferences();

    const idx =
      existing.findIndex(
        (c) => c.id === item.id
      );

    if (idx >= 0) {
      existing[idx] = item;
    } else {
      existing.unshift(item);
    }

    localStorage.setItem(
      CURRICULUM_STORAGE_KEY,
      JSON.stringify(existing)
    );
  } catch (e) {
    console.error(
      'Failed to save curriculum reference:',
      e
    );
  }
}

export function deleteCurriculumReference(
  id: string
): void {
  try {
    const existing =
      getStoredCurriculumReferences()
        .filter(
          (c) => c.id !== id
        );

    localStorage.setItem(
      CURRICULUM_STORAGE_KEY,
      JSON.stringify(existing)
    );
  } catch (e) {
    console.error(
      'Failed to delete curriculum reference:',
      e
    );
  }
}