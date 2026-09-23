-- ============================================================
-- 006_teacher_assignments.sql
-- SDIT AL FIKRI
--
-- Penugasan Guru:
-- teachers
--    ↓
-- teacher_assignments
--    ├── academic_period
--    ├── academic_level
--    ├── class / rombel
--    └── subject (untuk guru mapel)
--
-- Prinsip:
-- 1. Penugasan guru disimpan per periode akademik.
-- 2. Guru dapat mengajar lebih dari satu rombel.
-- 3. Guru dapat mengajar lebih dari satu Mapel/rombel jika memang
--    ditugaskan demikian.
-- 4. Guru wali kelas disimpan sebagai assignment_type = homeroom_teacher.
-- 5. Guru mapel disimpan sebagai assignment_type = subject_teacher.
-- 6. Mapel wajib sesuai dengan jenjang rombel.
-- 7. Penugasan aktif tidak boleh dobel.
-- 8. Data tidak dihapus untuk kebutuhan histori; gunakan active=false.
-- 9. Tidak mengubah tabel teachers, students, school_classes, atau
--    academic_subjects yang sudah ada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABEL PENUGASAN GURU
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    teacher_id TEXT NOT NULL
        REFERENCES public.teachers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    academic_period_id UUID NOT NULL
        REFERENCES public.academic_periods(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    academic_level_id TEXT NOT NULL
        REFERENCES public.academic_levels(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    class_id TEXT NOT NULL
        REFERENCES public.school_classes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Wajib untuk subject_teacher.
    -- NULL untuk homeroom_teacher.
    subject_id UUID
        REFERENCES public.academic_subjects(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    assignment_type TEXT NOT NULL DEFAULT 'subject_teacher',

    active BOOLEAN NOT NULL DEFAULT TRUE,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT teacher_assignments_type_check
        CHECK (
            assignment_type IN (
                'subject_teacher',
                'homeroom_teacher'
            )
        ),

    CONSTRAINT teacher_assignments_subject_required_check
        CHECK (
            (
                assignment_type = 'subject_teacher'
                AND subject_id IS NOT NULL
            )
            OR
            (
                assignment_type = 'homeroom_teacher'
                AND subject_id IS NULL
            )
        )
);

-- ------------------------------------------------------------
-- 2. INDEX
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher
    ON public.teacher_assignments (teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_period
    ON public.teacher_assignments (academic_period_id);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_level
    ON public.teacher_assignments (academic_level_id);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class
    ON public.teacher_assignments (class_id);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject
    ON public.teacher_assignments (subject_id);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_active
    ON public.teacher_assignments (active);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_period
    ON public.teacher_assignments (
        teacher_id,
        academic_period_id,
        active
    );

-- ------------------------------------------------------------
-- 3. UNIQUE PENUGASAN GURU MAPEL
--
-- Satu guru tidak boleh memiliki assignment aktif yang sama
-- untuk periode + rombel + mapel yang sama.
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_assignments_subject_active
    ON public.teacher_assignments (
        teacher_id,
        academic_period_id,
        class_id,
        subject_id
    )
    WHERE active = TRUE
      AND assignment_type = 'subject_teacher';

-- ------------------------------------------------------------
-- 4. UNIQUE GURU MAPEL DALAM SATU ROMBEL
--
-- Secara default satu Mapel pada satu rombel hanya memiliki
-- satu guru aktif.
--
-- Jika suatu saat sekolah membutuhkan co-teacher, constraint ini
-- perlu ditinjau kembali secara sadar.
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_assignments_class_subject_active
    ON public.teacher_assignments (
        academic_period_id,
        class_id,
        subject_id
    )
    WHERE active = TRUE
      AND assignment_type = 'subject_teacher';

-- ------------------------------------------------------------
-- 5. UNIQUE WALI KELAS
--
-- Satu rombel hanya memiliki satu wali kelas aktif pada satu
-- periode akademik.
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_assignments_homeroom_active
    ON public.teacher_assignments (
        academic_period_id,
        class_id
    )
    WHERE active = TRUE
      AND assignment_type = 'homeroom_teacher';

-- ------------------------------------------------------------
-- 6. VALIDASI RELASI JENJANG ↔ ROMBEL ↔ MAPEL
--
-- Tidak cukup memakai CHECK constraint karena harus membaca
-- tabel lain. Trigger berikut memastikan:
--
-- A. class_id memang milik academic_level_id assignment.
-- B. subject_id (jika guru mapel) memang milik academic_level_id.
-- C. subject_teacher wajib memiliki subject.
-- D. homeroom_teacher tidak boleh memiliki subject.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_teacher_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    class_level_id TEXT;
    subject_level_id TEXT;
BEGIN
    SELECT sc.academic_level_id
    INTO class_level_id
    FROM public.school_classes sc
    WHERE sc.id = NEW.class_id;

    IF class_level_id IS NULL THEN
        RAISE EXCEPTION
            'Rombel % belum memiliki academic_level_id.',
            NEW.class_id;
    END IF;

    IF class_level_id <> NEW.academic_level_id THEN
        RAISE EXCEPTION
            'academic_level_id penugasan tidak sesuai dengan jenjang rombel.';
    END IF;

    IF NEW.assignment_type = 'subject_teacher' THEN
        IF NEW.subject_id IS NULL THEN
            RAISE EXCEPTION
                'subject_id wajib diisi untuk subject_teacher.';
        END IF;

        SELECT s.academic_level_id
        INTO subject_level_id
        FROM public.academic_subjects s
        WHERE s.id = NEW.subject_id;

        IF subject_level_id IS NULL THEN
            RAISE EXCEPTION
                'Mapel % tidak ditemukan.',
                NEW.subject_id;
        END IF;

        IF subject_level_id <> NEW.academic_level_id THEN
            RAISE EXCEPTION
                'Mapel yang dipilih tidak sesuai dengan jenjang rombel.';
        END IF;
    ELSE
        IF NEW.subject_id IS NOT NULL THEN
            RAISE EXCEPTION
                'subject_id harus NULL untuk homeroom_teacher.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_teacher_assignment
    ON public.teacher_assignments;

CREATE TRIGGER trg_validate_teacher_assignment
    BEFORE INSERT OR UPDATE
    ON public.teacher_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_teacher_assignment();

-- ------------------------------------------------------------
-- 7. UPDATED_AT
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_teacher_assignments_updated_at
    ON public.teacher_assignments;

CREATE TRIGGER trg_teacher_assignments_updated_at
    BEFORE UPDATE ON public.teacher_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
--
-- Untuk tahap development mengikuti pola migration akademik
-- sebelumnya. Hak akses rinci guru akan diperketat ketika
-- authentication + RLS akademik sudah kita finalisasi.
-- ------------------------------------------------------------
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_assignments_select"
    ON public.teacher_assignments;

CREATE POLICY "teacher_assignments_select"
    ON public.teacher_assignments
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "teacher_assignments_insert"
    ON public.teacher_assignments;

CREATE POLICY "teacher_assignments_insert"
    ON public.teacher_assignments
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "teacher_assignments_update"
    ON public.teacher_assignments;

CREATE POLICY "teacher_assignments_update"
    ON public.teacher_assignments
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "teacher_assignments_delete"
    ON public.teacher_assignments;

CREATE POLICY "teacher_assignments_delete"
    ON public.teacher_assignments
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- ------------------------------------------------------------
-- 9. REALTIME
-- ------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime
            ADD TABLE public.teacher_assignments;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL;
    END;
END
$$;

-- ------------------------------------------------------------
-- 10. VERIFIKASI
-- Harapan awal:
-- teacher_assignments = 0
--
-- Kita sengaja TIDAK memasukkan data seed.
-- Assignment akan dibuat melalui UI setelah migration ini.
-- ------------------------------------------------------------
SELECT
    'teacher_assignments' AS table_name,
    COUNT(*) AS row_count
FROM public.teacher_assignments;
