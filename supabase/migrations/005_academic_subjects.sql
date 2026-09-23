-- ============================================================
-- 005_academic_subjects.sql
-- SDIT AL FIKRI
--
-- Master Mapel & Tujuan Pembelajaran (TP)
--
-- Prinsip:
-- 1. Data Mapel dimulai dari KOSONG. Tidak ada seed/default Mapel.
-- 2. Data TP dimulai dari KOSONG. Tidak ada seed/default TP.
-- 3. Mapel dimiliki oleh JENJANG, bukan rombel.
-- 4. TP dimiliki oleh MAPEL.
-- 5. Semua rombel pada jenjang yang sama menggunakan master
--    Mapel + TP yang sama.
-- 6. Mapel/TP yang sudah pernah digunakan sebaiknya dinonaktifkan
--    (active = false), bukan dihapus, agar histori nilai tetap aman.
-- ============================================================

-- ------------------------------------------------------------
-- 1. MASTER MATA PELAJARAN
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Jenjang pemilik Mapel.
    -- Contoh: grade_1, grade_2, dst.
    academic_level_id TEXT NOT NULL
        REFERENCES public.academic_levels(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    name TEXT NOT NULL,
    code TEXT,

    -- Urutan tampil pada e-Rapor.
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Soft delete / nonaktif agar histori akademik tetap aman.
    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT academic_subjects_name_not_blank
        CHECK (length(trim(name)) > 0),

    CONSTRAINT academic_subjects_code_not_blank
        CHECK (code IS NULL OR length(trim(code)) > 0)
);

-- Satu nama Mapel tidak boleh muncul dua kali pada jenjang yang sama,
-- tanpa membedakan huruf besar/kecil.
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_subjects_level_name
    ON public.academic_subjects (
        academic_level_id,
        lower(trim(name))
    );

-- Kode Mapel boleh kosong, tetapi jika diisi harus unik pada jenjang.
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_subjects_level_code
    ON public.academic_subjects (
        academic_level_id,
        lower(trim(code))
    )
    WHERE code IS NOT NULL AND length(trim(code)) > 0;

CREATE INDEX IF NOT EXISTS idx_academic_subjects_level
    ON public.academic_subjects (academic_level_id);

CREATE INDEX IF NOT EXISTS idx_academic_subjects_level_active_order
    ON public.academic_subjects (
        academic_level_id,
        active,
        display_order
    );

-- ------------------------------------------------------------
-- 2. MASTER TUJUAN PEMBELAJARAN (TP)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- TP mengikuti Mapel.
    subject_id UUID NOT NULL
        REFERENCES public.academic_subjects(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Kode TP bersifat opsional dan dapat disesuaikan sekolah.
    code TEXT,

    description TEXT NOT NULL,

    -- Urutan tampil TP pada e-Rapor.
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Soft delete / nonaktif.
    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT learning_objectives_description_not_blank
        CHECK (length(trim(description)) > 0),

    CONSTRAINT learning_objectives_code_not_blank
        CHECK (code IS NULL OR length(trim(code)) > 0)
);

-- Jika kode TP diisi, kode tersebut harus unik dalam satu Mapel.
CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_objectives_subject_code
    ON public.learning_objectives (
        subject_id,
        lower(trim(code))
    )
    WHERE code IS NOT NULL AND length(trim(code)) > 0;

CREATE INDEX IF NOT EXISTS idx_learning_objectives_subject
    ON public.learning_objectives (subject_id);

CREATE INDEX IF NOT EXISTS idx_learning_objectives_subject_active_order
    ON public.learning_objectives (
        subject_id,
        active,
        display_order
    );

-- ------------------------------------------------------------
-- 3. UPDATED_AT TRIGGER
-- Menggunakan fungsi set_updated_at() yang sudah dibuat
-- pada migration foundation sebelumnya.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_academic_subjects_updated_at
    ON public.academic_subjects;

CREATE TRIGGER trg_academic_subjects_updated_at
    BEFORE UPDATE ON public.academic_subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_learning_objectives_updated_at
    ON public.learning_objectives;

CREATE TRIGGER trg_learning_objectives_updated_at
    BEFORE UPDATE ON public.learning_objectives
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- Pola akses mengikuti migration academic foundation:
-- aplikasi dapat membaca dan mengelola master akademik.
-- ------------------------------------------------------------
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_objectives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_subjects_select"
    ON public.academic_subjects;
CREATE POLICY "academic_subjects_select"
    ON public.academic_subjects
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "academic_subjects_insert"
    ON public.academic_subjects;
CREATE POLICY "academic_subjects_insert"
    ON public.academic_subjects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "academic_subjects_update"
    ON public.academic_subjects;
CREATE POLICY "academic_subjects_update"
    ON public.academic_subjects
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "academic_subjects_delete"
    ON public.academic_subjects;
CREATE POLICY "academic_subjects_delete"
    ON public.academic_subjects
    FOR DELETE
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "learning_objectives_select"
    ON public.learning_objectives;
CREATE POLICY "learning_objectives_select"
    ON public.learning_objectives
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "learning_objectives_insert"
    ON public.learning_objectives;
CREATE POLICY "learning_objectives_insert"
    ON public.learning_objectives
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "learning_objectives_update"
    ON public.learning_objectives;
CREATE POLICY "learning_objectives_update"
    ON public.learning_objectives
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "learning_objectives_delete"
    ON public.learning_objectives;
CREATE POLICY "learning_objectives_delete"
    ON public.learning_objectives
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- ------------------------------------------------------------
-- 5. REALTIME
-- Supabase Realtime dipakai agar perubahan master dapat
-- diterima UI tanpa harus selalu refresh manual.
--
-- DO NOT ADD SEED DATA HERE.
-- ------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime
            ADD TABLE public.academic_subjects;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime
            ADD TABLE public.learning_objectives;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL;
    END;
END
$$;

-- ------------------------------------------------------------
-- 6. VERIFIKASI
-- Hasil yang diharapkan:
-- - tabel academic_subjects tersedia
-- - tabel learning_objectives tersedia
-- - jumlah data awal = 0
-- ------------------------------------------------------------
SELECT
    'academic_subjects' AS table_name,
    COUNT(*) AS row_count
FROM public.academic_subjects

UNION ALL

SELECT
    'learning_objectives' AS table_name,
    COUNT(*) AS row_count
FROM public.learning_objectives;
