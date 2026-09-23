-- =========================================================
-- 004_sync_student_enrollments.sql
-- Sinkronisasi siswa aktif ke periode akademik aktif
-- =========================================================


-- =========================================================
-- 1. INSERT ENROLLMENT SISWA AKTIF
-- =========================================================

INSERT INTO public.student_enrollments (
    student_id,
    academic_period_id,
    class_id,
    status
)
SELECT
    s.id AS student_id,
    ap.id AS academic_period_id,
    s.class_id,
    s.status
FROM public.students s
JOIN public.academic_periods ap
    ON ap.is_active = true
JOIN public.school_classes sc
    ON sc.id = s.class_id
WHERE s.status = 'Aktif'
  AND NOT EXISTS (
      SELECT 1
      FROM public.student_enrollments se
      WHERE se.student_id = s.id
        AND se.academic_period_id = ap.id
  );


-- =========================================================
-- 2. CEK JUMLAH SISWA AKTIF
-- =========================================================

SELECT
    COUNT(*) AS total_siswa_aktif
FROM public.students
WHERE status = 'Aktif';


-- =========================================================
-- 3. CEK JUMLAH ENROLLMENT PADA PERIODE AKTIF
-- =========================================================

SELECT
    COUNT(*) AS total_enrollment_periode_aktif
FROM public.student_enrollments se
JOIN public.academic_periods ap
    ON ap.id = se.academic_period_id
WHERE ap.is_active = true;


-- =========================================================
-- 4. CEK DISTRIBUSI SISWA PER ROMBEL
-- =========================================================

SELECT
    sc.id AS class_id,
    sc.name AS class_name,
    COUNT(se.id) AS jumlah_siswa
FROM public.school_classes sc
LEFT JOIN public.student_enrollments se
    ON se.class_id = sc.id
GROUP BY
    sc.id,
    sc.name,
    sc.grade
ORDER BY
    sc.grade,
    sc.id;


-- =========================================================
-- 5. CEK SISWA YANG BELUM MEMILIKI ENROLLMENT
-- =========================================================

SELECT
    s.id,
    s.name,
    s.class_id,
    s.status
FROM public.students s
WHERE s.status = 'Aktif'
  AND NOT EXISTS (
      SELECT 1
      FROM public.student_enrollments se
      JOIN public.academic_periods ap
          ON ap.id = se.academic_period_id
      WHERE se.student_id = s.id
        AND ap.is_active = true
  )
ORDER BY s.name;