-- ============================================================
-- SDIT AL FIKRI
-- MIGRATION 011 - MEJA TITIPAN PUSAT SETORAN ANALISIS GURU
-- ============================================================
--
-- Tabel ini menggantikan penggunaan Firestore untuk meja setoran
-- analisis nilai dan verifikasi cetak fisik Pak Zaki.
--
-- Karakteristik:
-- - Bebas kuota harian (Unlimited reads & writes)
-- - Sifat sementara / transit: jika Pak Zaki menghapus berkas
--   setelah dicetak, baris akan dihapus bersih (DELETE) tanpa sisa.
-- - Nilai e-Rapor berada di tabel terpisah sehingga tetap aman 100%.
--
-- Jalankan seluruh script ini di Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analysis_submissions (
    id TEXT PRIMARY KEY,
    submission_type TEXT NOT NULL DEFAULT 'session',
    subject_name TEXT NOT NULL,
    class_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    exam_type TEXT,
    school_year TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    teacher_id TEXT,
    teacher_role_title TEXT,
    kktp NUMERIC DEFAULT 75,
    total_students INTEGER DEFAULT 0,
    completed_students INTEGER DEFAULT 0,
    passed_students INTEGER DEFAULT 0,
    average_grade NUMERIC DEFAULT 0,
    teacher_note TEXT,
    admin_note TEXT,
    status TEXT NOT NULL DEFAULT 'menunggu', -- 'menunggu' | 'disetujui' | 'revisi' | 'telah_diprint'
    subject_statuses JSONB DEFAULT '{}'::jsonb,
    messages JSONB DEFAULT '[]'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_submitted_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_revision_resubmitted BOOLEAN DEFAULT false,
    last_revision_resubmitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pastikan seluruh kolom tersedia jika tabel sebelumnya sudah pernah dibuat
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS average_grade NUMERIC DEFAULT 0;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS passed_students INTEGER DEFAULT 0;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS completed_students INTEGER DEFAULT 0;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS kktp NUMERIC DEFAULT 75;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'session';
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS exam_type TEXT;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS teacher_role_title TEXT;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS teacher_note TEXT;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'menunggu';
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS subject_statuses JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS first_submitted_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS is_revision_resubmitted BOOLEAN DEFAULT false;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS last_revision_resubmitted_at TIMESTAMPTZ;
ALTER TABLE public.analysis_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Indeks Performa Query
CREATE INDEX IF NOT EXISTS idx_analysis_subs_class_year 
    ON public.analysis_submissions(class_id, school_year);

CREATE INDEX IF NOT EXISTS idx_analysis_subs_status 
    ON public.analysis_submissions(status);

CREATE INDEX IF NOT EXISTS idx_analysis_subs_submitted_at 
    ON public.analysis_submissions(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_subs_teacher 
    ON public.analysis_submissions(teacher_name);

-- Row Level Security (RLS)
ALTER TABLE public.analysis_submissions ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses (Anon & Authenticated)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on analysis_submissions" ON public.analysis_submissions;
    DROP POLICY IF EXISTS "Allow insert on analysis_submissions" ON public.analysis_submissions;
    DROP POLICY IF EXISTS "Allow update on analysis_submissions" ON public.analysis_submissions;
    DROP POLICY IF EXISTS "Allow delete on analysis_submissions" ON public.analysis_submissions;
END $$;

CREATE POLICY "Allow select on analysis_submissions" 
    ON public.analysis_submissions FOR SELECT USING (true);

CREATE POLICY "Allow insert on analysis_submissions" 
    ON public.analysis_submissions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on analysis_submissions" 
    ON public.analysis_submissions FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete on analysis_submissions" 
    ON public.analysis_submissions FOR DELETE USING (true);

-- Aktifkan Realtime Replication untuk tabel ini (opsional jika Realtime diaktifkan)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_submissions;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
    WHEN OTHERS THEN NULL;
END $$;

-- Muat ulang schema cache PostgREST agar Supabase langsung mengenali kolom baru
NOTIFY pgrst, 'reload schema';
