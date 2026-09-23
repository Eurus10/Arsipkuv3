-- ============================================================
-- Migration: 010_erapor_security_and_trusted_identity.sql
-- Description: Trusted Teacher Session Authentication, 
--              Strict Database Authorization, and RLS Hardening
-- ============================================================

-- 1. Pastikan kolom erapor_pin_hash tersedia pada tabel teachers
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS erapor_pin_hash TEXT;

-- 2. Buat tabel sesi guru terpercaya (erapor_teacher_sessions)
CREATE TABLE IF NOT EXISTS public.erapor_teacher_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks performa sesi
CREATE INDEX IF NOT EXISTS idx_erapor_sessions_token 
ON public.erapor_teacher_sessions(session_token) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_erapor_sessions_teacher 
ON public.erapor_teacher_sessions(teacher_id);

-- Enable RLS pada erapor_teacher_sessions (Hanya dapat diakses melalui SECURITY DEFINER functions)
ALTER TABLE public.erapor_teacher_sessions ENABLE ROW LEVEL SECURITY;

-- 3. FUNCTION: Set PIN e-Rapor Guru (Security Definer)
CREATE OR REPLACE FUNCTION public.erapor_set_teacher_pin(
    p_teacher_id TEXT,
    p_pin_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_teacher RECORD;
BEGIN
    IF p_teacher_id IS NULL OR p_pin_hash IS NULL OR length(trim(p_pin_hash)) < 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Parameter ID guru atau PIN hash tidak valid.');
    END IF;

    SELECT id, name, status INTO v_teacher
    FROM public.teachers
    WHERE id = p_teacher_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Data guru tidak ditemukan.');
    END IF;

    IF v_teacher.status = 'blocked' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Akun guru sedang diblokir.');
    END IF;

    UPDATE public.teachers
    SET erapor_pin_hash = p_pin_hash,
        updated_at = now()
    WHERE id = p_teacher_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'PIN e-Rapor berhasil disimpan.'
    );
END;
$$;

-- 4. FUNCTION: Login Guru & Pembuatan Trusted Session Token
CREATE OR REPLACE FUNCTION public.erapor_teacher_login(
    p_teacher_id TEXT,
    p_pin_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_teacher RECORD;
    v_token TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF p_teacher_id IS NULL OR p_pin_hash IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'ID guru dan PIN wajib diisi.');
    END IF;

    SELECT id, name, status, erapor_pin_hash INTO v_teacher
    FROM public.teachers
    WHERE id = p_teacher_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Data guru tidak ditemukan.');
    END IF;

    IF v_teacher.status = 'blocked' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Akun guru ini sedang diblokir oleh Administrator.');
    END IF;

    IF v_teacher.erapor_pin_hash IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Guru belum memiliki PIN e-Rapor.');
    END IF;

    IF v_teacher.erapor_pin_hash != p_pin_hash THEN
        RETURN jsonb_build_object('success', false, 'message', 'PIN e-Rapor tidak sesuai.');
    END IF;

    -- Nonaktifkan sesi aktif sebelumnya untuk guru ini
    UPDATE public.erapor_teacher_sessions
    SET is_active = false
    WHERE teacher_id = p_teacher_id AND is_active = true;

    -- Buat token kriptografis baru
    v_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := now() + interval '24 hours';

    INSERT INTO public.erapor_teacher_sessions (
        teacher_id,
        session_token,
        created_at,
        expires_at,
        is_active,
        last_accessed_at
    ) VALUES (
        p_teacher_id,
        v_token,
        now(),
        v_expires_at,
        true,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Login e-Rapor berhasil.',
        'session_token', v_token,
        'teacher_id', v_teacher.id,
        'teacher_name', v_teacher.name,
        'expires_at', v_expires_at
    );
END;
$$;

-- 5. FUNCTION: Logout Sesi Guru
CREATE OR REPLACE FUNCTION public.erapor_teacher_logout(
    p_session_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_session_token IS NULL THEN
        RETURN false;
    END IF;

    UPDATE public.erapor_teacher_sessions
    SET is_active = false
    WHERE session_token = p_session_token;

    RETURN true;
END;
$$;

-- 6. HELPER: Verifikasi Session Token Guru
CREATE OR REPLACE FUNCTION public.erapor_verify_teacher_session(
    p_session_token TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
BEGIN
    IF p_session_token IS NULL OR trim(p_session_token) = '' THEN
        RETURN NULL;
    END IF;

    SELECT teacher_id, expires_at INTO v_session
    FROM public.erapor_teacher_sessions
    WHERE session_token = p_session_token
      AND is_active = true
      AND expires_at > now();

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Perbarui last_accessed_at
    UPDATE public.erapor_teacher_sessions
    SET last_accessed_at = now()
    WHERE session_token = p_session_token;

    RETURN v_session.teacher_id;
END;
$$;

-- 7. HELPER: Verifikasi Hak Akses Guru terhadap Rombel dan Mapel
CREATE OR REPLACE FUNCTION public.erapor_can_teacher_score(
    p_teacher_id TEXT,
    p_academic_period_id UUID,
    p_class_id TEXT,
    p_subject_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_access BOOLEAN := false;
    v_class_level_id TEXT;
    v_subject_level_id TEXT;
BEGIN
    IF p_teacher_id IS NULL OR p_academic_period_id IS NULL OR p_class_id IS NULL OR p_subject_id IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Cek assignment langsung sebagai Guru Mapel (subject_teacher)
    SELECT EXISTS (
        SELECT 1 
        FROM public.teacher_assignments
        WHERE teacher_id = p_teacher_id
          AND academic_period_id = p_academic_period_id
          AND class_id = p_class_id
          AND subject_id = p_subject_id
          AND assignment_type = 'subject_teacher'
          AND active = true
    ) INTO v_has_access;

    IF v_has_access THEN
        RETURN true;
    END IF;

    -- 2. Cek apakah guru adalah Wali Kelas (homeroom_teacher) untuk kelas ini
    -- Jika ya, guru berhak atas semua mapel aktif pada jenjang kelas tersebut
    SELECT EXISTS (
        SELECT 1
        FROM public.teacher_assignments
        WHERE teacher_id = p_teacher_id
          AND academic_period_id = p_academic_period_id
          AND class_id = p_class_id
          AND assignment_type = 'homeroom_teacher'
          AND active = true
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RETURN false;
    END IF;

    -- Verifikasi bahwa subject_id memang milik academic_level yang sama dengan class_id
    SELECT academic_level_id INTO v_class_level_id
    FROM public.school_classes
    WHERE id = p_class_id;

    SELECT academic_level_id INTO v_subject_level_id
    FROM public.academic_subjects
    WHERE id = p_subject_id;

    IF v_class_level_id IS NOT NULL AND v_subject_level_id IS NOT NULL AND v_class_level_id = v_subject_level_id THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- 8. HELPER: Verifikasi bahwa Siswa benar-benar terdaftar di Kelas pada Periode tersebut
CREATE OR REPLACE FUNCTION public.erapor_verify_student_in_class(
    p_student_id UUID,
    p_class_id TEXT,
    p_academic_period_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Cek via student_enrollments terlebih dahulu
    IF EXISTS (
        SELECT 1 
        FROM public.student_enrollments
        WHERE student_id = p_student_id
          AND class_id = p_class_id
          AND academic_period_id = p_academic_period_id
          AND status = 'Aktif'
    ) THEN
        RETURN true;
    END IF;

    -- Fallback cek langsung pada tabel students
    IF EXISTS (
        SELECT 1
        FROM public.students
        WHERE id = p_student_id
          AND class_id = p_class_id
          AND (status IS NULL OR status = 'Aktif')
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- 9. HELPER: Verifikasi bahwa TP (Learning Objective) benar milik Subject yang dinilai
CREATE OR REPLACE FUNCTION public.erapor_verify_lo_in_subject(
    p_lo_id UUID,
    p_subject_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.learning_objectives
        WHERE id = p_lo_id
          AND subject_id = p_subject_id
          AND active = true
    );
END;
$$;

-- 10. RPC: Simpan Nilai Mapel Secara Aman (Batch)
CREATE OR REPLACE FUNCTION public.erapor_save_subject_scores(
    p_session_token TEXT,
    p_academic_period_id UUID,
    p_class_id TEXT,
    p_subject_id UUID,
    p_scores JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_teacher_id TEXT;
    v_period_active BOOLEAN;
    v_item JSONB;
    v_student_id UUID;
    v_sts_score NUMERIC;
    v_final_score NUMERIC;
    v_auto_desc TEXT;
    v_custom_desc TEXT;
    v_teacher_note TEXT;
    v_count INT := 0;
BEGIN
    -- 1. Verifikasi Session Token
    v_teacher_id := public.erapor_verify_teacher_session(p_session_token);
    IF v_teacher_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Sesi guru tidak valid atau telah berakhir. Silakan login kembali.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Verifikasi Periode Akademik Aktif
    SELECT is_active INTO v_period_active
    FROM public.academic_periods
    WHERE id = p_academic_period_id;

    IF v_period_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Forbidden: Periode akademik tidak aktif atau sudah ditutup.'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Verifikasi Hak Akses Assignment Guru
    IF NOT public.erapor_can_teacher_score(v_teacher_id, p_academic_period_id, p_class_id, p_subject_id) THEN
        RAISE EXCEPTION 'Forbidden: Guru (%) tidak memiliki izin assignment untuk Kelas (%) dan Mapel (%).', 
            v_teacher_id, p_class_id, p_subject_id
            USING ERRCODE = '42501';
    END IF;

    -- 4. Iterasi dan Simpan Setiap Nilai
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_scores)
    LOOP
        v_student_id := (v_item->>'student_id')::UUID;
        
        -- Validasi siswa terdaftar di rombel
        IF NOT public.erapor_verify_student_in_class(v_student_id, p_class_id, p_academic_period_id) THEN
            RAISE EXCEPTION 'Integrity Error: Siswa (%) tidak terdaftar di Kelas (%).', v_student_id, p_class_id
                USING ERRCODE = '23503';
        END IF;

        -- Ambil dan sanitasi nilai
        v_sts_score := CASE 
            WHEN v_item->>'sts_score' IS NOT NULL AND trim(v_item->>'sts_score') != '' 
            THEN (v_item->>'sts_score')::NUMERIC 
            ELSE NULL 
        END;

        v_final_score := CASE 
            WHEN v_item->>'final_score' IS NOT NULL AND trim(v_item->>'final_score') != '' 
            THEN (v_item->>'final_score')::NUMERIC 
            ELSE v_sts_score 
        END;

        IF v_sts_score IS NOT NULL AND (v_sts_score < 0 OR v_sts_score > 100) THEN
            RAISE EXCEPTION 'Validation Error: Nilai STS (%) harus berada dalam rentang 0-100.', v_sts_score;
        END IF;

        IF v_final_score IS NOT NULL AND (v_final_score < 0 OR v_final_score > 100) THEN
            RAISE EXCEPTION 'Validation Error: Nilai Akhir (%) harus berada dalam rentang 0-100.', v_final_score;
        END IF;

        v_auto_desc := v_item->>'auto_description';
        v_custom_desc := v_item->>'custom_description';
        v_teacher_note := v_item->>'teacher_note';

        -- Lakukan UPSERT dengan teacher_id terverifikasi dari session
        INSERT INTO public.student_subject_scores (
            academic_period_id,
            class_id,
            student_id,
            subject_id,
            teacher_id,
            sts_score,
            final_score,
            auto_description,
            custom_description,
            teacher_note,
            updated_at
        ) VALUES (
            p_academic_period_id,
            p_class_id,
            v_student_id,
            p_subject_id,
            v_teacher_id,
            v_sts_score,
            v_final_score,
            v_auto_desc,
            v_custom_desc,
            v_teacher_note,
            now()
        )
        ON CONFLICT (academic_period_id, class_id, student_id, subject_id)
        DO UPDATE SET
            teacher_id = v_teacher_id,
            sts_score = EXCLUDED.sts_score,
            final_score = EXCLUDED.final_score,
            auto_description = EXCLUDED.auto_description,
            custom_description = EXCLUDED.custom_description,
            teacher_note = EXCLUDED.teacher_note,
            updated_at = now();

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'saved_count', v_count
    );
END;
$$;

-- 11. RPC: Simpan Capaian TP Secara Aman (Batch)
CREATE OR REPLACE FUNCTION public.erapor_save_lo_scores(
    p_session_token TEXT,
    p_academic_period_id UUID,
    p_class_id TEXT,
    p_subject_id UUID,
    p_scores JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_teacher_id TEXT;
    v_period_active BOOLEAN;
    v_item JSONB;
    v_student_id UUID;
    v_lo_id UUID;
    v_is_achieved BOOLEAN;
    v_score NUMERIC;
    v_count INT := 0;
BEGIN
    -- 1. Verifikasi Session Token
    v_teacher_id := public.erapor_verify_teacher_session(p_session_token);
    IF v_teacher_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Sesi guru tidak valid atau telah berakhir. Silakan login kembali.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Verifikasi Periode Akademik Aktif
    SELECT is_active INTO v_period_active
    FROM public.academic_periods
    WHERE id = p_academic_period_id;

    IF v_period_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Forbidden: Periode akademik tidak aktif atau sudah ditutup.'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Verifikasi Hak Akses Assignment Guru
    IF NOT public.erapor_can_teacher_score(v_teacher_id, p_academic_period_id, p_class_id, p_subject_id) THEN
        RAISE EXCEPTION 'Forbidden: Guru (%) tidak memiliki izin assignment untuk Kelas (%) dan Mapel (%).', 
            v_teacher_id, p_class_id, p_subject_id
            USING ERRCODE = '42501';
    END IF;

    -- 4. Iterasi dan Simpan Setiap Capaian TP
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_scores)
    LOOP
        v_student_id := (v_item->>'student_id')::UUID;
        v_lo_id := (v_item->>'learning_objective_id')::UUID;

        -- Validasi TP benar-benar milik Mapel yang sedang dinilai
        IF NOT public.erapor_verify_lo_in_subject(v_lo_id, p_subject_id) THEN
            RAISE EXCEPTION 'Integrity Error: TP (%) bukan bagian dari Mata Pelajaran (%).', v_lo_id, p_subject_id
                USING ERRCODE = '23503';
        END IF;

        -- Validasi siswa terdaftar di rombel
        IF NOT public.erapor_verify_student_in_class(v_student_id, p_class_id, p_academic_period_id) THEN
            RAISE EXCEPTION 'Integrity Error: Siswa (%) tidak terdaftar di Kelas (%).', v_student_id, p_class_id
                USING ERRCODE = '23503';
        END IF;

        v_is_achieved := (v_item->>'is_achieved')::BOOLEAN;
        v_score := CASE 
            WHEN v_item->>'score' IS NOT NULL AND trim(v_item->>'score') != '' 
            THEN (v_item->>'score')::NUMERIC 
            ELSE NULL 
        END;

        INSERT INTO public.student_learning_objective_scores (
            academic_period_id,
            class_id,
            student_id,
            learning_objective_id,
            is_achieved,
            score,
            updated_at
        ) VALUES (
            p_academic_period_id,
            p_class_id,
            v_student_id,
            v_lo_id,
            COALESCE(v_is_achieved, false),
            v_score,
            now()
        )
        ON CONFLICT (academic_period_id, class_id, student_id, learning_objective_id)
        DO UPDATE SET
            is_achieved = EXCLUDED.is_achieved,
            score = EXCLUDED.score,
            updated_at = now();

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'saved_count', v_count
    );
END;
$$;

-- 12. HARDEN RLS POLICIES PADA TABEL NILAI (STUDENT SCORES)
-- Drop policy publik lama yang terbuka (USING true / WITH CHECK true)
DROP POLICY IF EXISTS "Allow anon full access on student_subject_scores" ON public.student_subject_scores;
DROP POLICY IF EXISTS "Allow all operations for anon on student_subject_scores" ON public.student_subject_scores;
DROP POLICY IF EXISTS "Allow anon full access on student_learning_objective_scores" ON public.student_learning_objective_scores;
DROP POLICY IF EXISTS "Allow all operations for anon on student_learning_objective_scores" ON public.student_learning_objective_scores;

-- Policy Seleksi & Proteksi student_subject_scores:
-- Penulisan (INSERT/UPDATE/DELETE) langsung via anon diblokir; wajib lewat Security Definer RPC
CREATE POLICY "student_subject_scores_select_policy"
ON public.student_subject_scores
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "student_subject_scores_write_restricted"
ON public.student_subject_scores
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "student_subject_scores_update_restricted"
ON public.student_subject_scores
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "student_subject_scores_delete_restricted"
ON public.student_subject_scores
FOR DELETE
TO authenticated
USING (true);

-- Policy Seleksi & Proteksi student_learning_objective_scores:
CREATE POLICY "student_lo_scores_select_policy"
ON public.student_learning_objective_scores
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "student_lo_scores_write_restricted"
ON public.student_learning_objective_scores
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "student_lo_scores_update_restricted"
ON public.student_learning_objective_scores
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "student_lo_scores_delete_restricted"
ON public.student_learning_objective_scores
FOR DELETE
TO authenticated
USING (true);

-- 13. Proteksi Penulisan pada Master Data (Mencegah modifikasi sembarangan oleh Anon)
-- Master tables tetap dapat dibaca untuk kebutuhan UI/monitoring/dropdown
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
