-- ============================================================
-- SDIT AL FIKRI - ACADEMIC CORE
-- 009_rapor_scores.sql
--
-- Fondasi Database Nilai e-Rapor (Phase 1)
--
-- Tabel:
-- 1. public.student_subject_scores (Nilai STS, Nilai Akhir, Deskripsi, Catatan Guru)
-- 2. public.student_learning_objective_scores (Ketercapaian TP / Nilai TP)
--
-- Prinsip:
-- 1. Menggunakan master akademik Supabase sebagai sumber relasi:
--    - academic_periods (UUID)
--    - school_classes (TEXT)
--    - students (UUID)
--    - academic_subjects (UUID)
--    - learning_objectives (UUID)
--    - teachers (TEXT)
-- 2. Unique constraints mencegah duplikasi nilai per periode, rombel, dan siswa.
-- 3. Check constraints memastikan skor berada dalam rentang valid 0 - 100.
-- 4. Tidak mengubah tabel, UI, atau service legacy yang sudah berjalan.
-- ============================================================

-- ============================================================
-- 0. EXTENSION & TRIGGER HELPER
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. TABEL STUDENT_SUBJECT_SCORES (NILAI MATA PELAJARAN)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_subject_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    academic_period_id UUID NOT NULL
        REFERENCES public.academic_periods(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    class_id TEXT NOT NULL
        REFERENCES public.school_classes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    student_id UUID NOT NULL
        REFERENCES public.students(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    subject_id UUID NOT NULL
        REFERENCES public.academic_subjects(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    teacher_id TEXT NULL
        REFERENCES public.teachers(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    sts_score NUMERIC(5,2) NULL,
    final_score NUMERIC(5,2) NULL,
    auto_description TEXT NULL,
    custom_description TEXT NULL,
    teacher_note TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT student_subject_scores_sts_check
        CHECK (sts_score IS NULL OR (sts_score >= 0 AND sts_score <= 100)),

    CONSTRAINT student_subject_scores_final_check
        CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 100)),

    CONSTRAINT uq_student_subject_scores
        UNIQUE (academic_period_id, class_id, student_id, subject_id)
);

-- Indexes untuk query cepat per periode, rombel, mapel, dan siswa
CREATE INDEX IF NOT EXISTS idx_student_subject_scores_lookup
    ON public.student_subject_scores (academic_period_id, class_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_student_subject_scores_student_period
    ON public.student_subject_scores (student_id, academic_period_id);

CREATE INDEX IF NOT EXISTS idx_student_subject_scores_class
    ON public.student_subject_scores (class_id);

CREATE INDEX IF NOT EXISTS idx_student_subject_scores_teacher
    ON public.student_subject_scores (teacher_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_student_subject_scores_updated_at
    ON public.student_subject_scores;

CREATE TRIGGER trg_student_subject_scores_updated_at
    BEFORE UPDATE ON public.student_subject_scores
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. TABEL STUDENT_LEARNING_OBJECTIVE_SCORES (CAPAIAN / SKOR TP)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_learning_objective_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    academic_period_id UUID NOT NULL
        REFERENCES public.academic_periods(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    class_id TEXT NOT NULL
        REFERENCES public.school_classes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    student_id UUID NOT NULL
        REFERENCES public.students(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    learning_objective_id UUID NOT NULL
        REFERENCES public.learning_objectives(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    is_achieved BOOLEAN NOT NULL DEFAULT FALSE,
    score NUMERIC(5,2) NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT student_learning_objective_scores_score_check
        CHECK (score IS NULL OR (score >= 0 AND score <= 100)),

    CONSTRAINT uq_student_learning_objective_scores
        UNIQUE (academic_period_id, class_id, student_id, learning_objective_id)
);

-- Indexes untuk query capaian TP per siswa & per TP
CREATE INDEX IF NOT EXISTS idx_student_tp_scores_lookup
    ON public.student_learning_objective_scores (academic_period_id, class_id, student_id);

CREATE INDEX IF NOT EXISTS idx_student_tp_scores_objective
    ON public.student_learning_objective_scores (learning_objective_id);

CREATE INDEX IF NOT EXISTS idx_student_tp_scores_student
    ON public.student_learning_objective_scores (student_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_student_learning_objective_scores_updated_at
    ON public.student_learning_objective_scores;

CREATE TRIGGER trg_student_learning_objective_scores_updated_at
    BEFORE UPDATE ON public.student_learning_objective_scores
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.student_subject_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_learning_objective_scores ENABLE ROW LEVEL SECURITY;

-- Policy untuk student_subject_scores
DROP POLICY IF EXISTS "student_subject_scores_select"
    ON public.student_subject_scores;
CREATE POLICY "student_subject_scores_select"
    ON public.student_subject_scores
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "student_subject_scores_insert"
    ON public.student_subject_scores;
CREATE POLICY "student_subject_scores_insert"
    ON public.student_subject_scores
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "student_subject_scores_update"
    ON public.student_subject_scores;
CREATE POLICY "student_subject_scores_update"
    ON public.student_subject_scores
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "student_subject_scores_delete"
    ON public.student_subject_scores;
CREATE POLICY "student_subject_scores_delete"
    ON public.student_subject_scores
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- Policy untuk student_learning_objective_scores
DROP POLICY IF EXISTS "student_learning_objective_scores_select"
    ON public.student_learning_objective_scores;
CREATE POLICY "student_learning_objective_scores_select"
    ON public.student_learning_objective_scores
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "student_learning_objective_scores_insert"
    ON public.student_learning_objective_scores;
CREATE POLICY "student_learning_objective_scores_insert"
    ON public.student_learning_objective_scores
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "student_learning_objective_scores_update"
    ON public.student_learning_objective_scores;
CREATE POLICY "student_learning_objective_scores_update"
    ON public.student_learning_objective_scores
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "student_learning_objective_scores_delete"
    ON public.student_learning_objective_scores;
CREATE POLICY "student_learning_objective_scores_delete"
    ON public.student_learning_objective_scores
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- ============================================================
-- 4. SUPABASE REALTIME
-- ============================================================

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime
            ADD TABLE public.student_subject_scores;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime
            ADD TABLE public.student_learning_objective_scores;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL;
    END;
END
$$;

-- ============================================================
-- 5. VERIFIKASI AWAL
-- ============================================================

SELECT
    'student_subject_scores' AS table_name,
    COUNT(*) AS row_count
FROM public.student_subject_scores

UNION ALL

SELECT
    'student_learning_objective_scores' AS table_name,
    COUNT(*) AS row_count
FROM public.student_learning_objective_scores;
