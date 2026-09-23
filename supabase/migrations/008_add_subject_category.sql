-- ============================================================
-- 008_add_subject_category.sql
-- SDIT AL FIKRI
--
-- Menambahkan kolom category pada tabel academic_subjects
-- Kategori mapel: 'agama' | 'umum' | 'mulok'
-- ============================================================

ALTER TABLE public.academic_subjects 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'umum' 
CHECK (category IN ('agama', 'umum', 'mulok'));

-- Index untuk mempercepat filter kategori pada e-Rapor dan cetak rapor
CREATE INDEX IF NOT EXISTS idx_academic_subjects_category 
ON public.academic_subjects (category);
