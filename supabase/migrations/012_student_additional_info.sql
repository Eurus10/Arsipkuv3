-- ============================================================
-- SDIT AL FIKRI - ACADEMIC CORE
-- MIGRATION 012 - CATATAN WALI KELAS, ABSENSI & EKSTRAKURIKULER
-- ============================================================
--
-- Tabel ini menyimpan data pelengkap e-Rapor (additional_info):
-- 1. Catatan Wali Kelas / Catatan Motivasi Guru (teacher_notes)
-- 2. Rekap Ketidakhadiran Akhir/Tengah Semester (Sakit, Izin, Alpha)
-- 3. Capaian Ekstrakurikuler (extracurriculars JSONB)
--
-- Data ini tersinkronisasi langsung ke Supabase Cloud sehingga:
-- - Guru dapat mengetik catatan di laptop masing-masing tanpa takut hilang saat reload/login ulang.
-- - Admin dapat menarik data catatan secara realtime saat rekap leger dan cetak rapor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.student_additional_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_period_id UUID NOT NULL
        REFERENCES public.academic_periods(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    class_id TEXT NOT NULL
        REFERENCES public.school_classes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    student_id UUID NOT NULL
        REFERENCES public.students(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    teacher_id TEXT NULL
        REFERENCES public.teachers(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    teacher_notes TEXT NULL,
    sakit INTEGER NOT NULL DEFAULT 0,
    izin INTEGER NOT NULL DEFAULT 0,
    alpha INTEGER NOT NULL DEFAULT 0,
    extracurriculars JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_additional_info
        UNIQUE (academic_period_id, class_id, student_id)
);

-- Pastikan kolom selalu ada jika tabel sudah ada sebelumnya
ALTER TABLE public.student_additional_info ADD COLUMN IF NOT EXISTS teacher_notes TEXT NULL;
ALTER TABLE public.student_additional_info ADD COLUMN IF NOT EXISTS sakit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.student_additional_info ADD COLUMN IF NOT EXISTS izin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.student_additional_info ADD COLUMN IF NOT EXISTS alpha INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.student_additional_info ADD COLUMN IF NOT EXISTS extracurriculars JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.student_additional_info ADD COLUMN IF NOT EXISTS teacher_id TEXT NULL;

-- Indexes untuk lookup cepat per periode dan rombel
CREATE INDEX IF NOT EXISTS idx_student_additional_info_lookup
    ON public.student_additional_info (academic_period_id, class_id);

CREATE INDEX IF NOT EXISTS idx_student_additional_info_student
    ON public.student_additional_info (student_id);

-- Enable RLS
ALTER TABLE public.student_additional_info ENABLE ROW LEVEL SECURITY;

-- Policies untuk akses baca dan tulis
DROP POLICY IF EXISTS "Allow all read on student_additional_info" ON public.student_additional_info;
CREATE POLICY "Allow all read on student_additional_info"
    ON public.student_additional_info FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow all write on student_additional_info" ON public.student_additional_info;
CREATE POLICY "Allow all write on student_additional_info"
    ON public.student_additional_info FOR ALL
    USING (true)
    WITH CHECK (true);

-- RPC untuk batch save catatan e-Rapor
CREATE OR REPLACE FUNCTION public.erapor_save_additional_info(
    p_academic_period_id UUID,
    p_class_id TEXT,
    p_teacher_id TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_student_id UUID;
    v_notes TEXT;
    v_sakit INT;
    v_izin INT;
    v_alpha INT;
    v_ekstra JSONB;
    v_count INT := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_student_id := (v_item->>'student_id')::UUID;
        v_notes := v_item->>'teacher_notes';
        v_sakit := COALESCE((v_item->>'sakit')::INT, 0);
        v_izin := COALESCE((v_item->>'izin')::INT, 0);
        v_alpha := COALESCE((v_item->>'alpha')::INT, 0);
        v_ekstra := COALESCE(v_item->'extracurriculars', '[]'::jsonb);

        INSERT INTO public.student_additional_info (
            academic_period_id,
            class_id,
            student_id,
            teacher_id,
            teacher_notes,
            sakit,
            izin,
            alpha,
            extracurriculars,
            updated_at
        ) VALUES (
            p_academic_period_id,
            p_class_id,
            v_student_id,
            p_teacher_id,
            v_notes,
            v_sakit,
            v_izin,
            v_alpha,
            v_ekstra,
            NOW()
        )
        ON CONFLICT (academic_period_id, class_id, student_id)
        DO UPDATE SET
            teacher_id = COALESCE(EXCLUDED.teacher_id, public.student_additional_info.teacher_id),
            teacher_notes = EXCLUDED.teacher_notes,
            sakit = EXCLUDED.sakit,
            izin = EXCLUDED.izin,
            alpha = EXCLUDED.alpha,
            extracurriculars = EXCLUDED.extracurriculars,
            updated_at = NOW();

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'saved_count', v_count
    );
END;
$$;
