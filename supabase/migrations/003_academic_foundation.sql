-- ============================================================
-- SDIT AL FIKRI
-- SUPABASE ACADEMIC CORE
-- MIGRATION 003 - ACADEMIC FOUNDATION
-- ============================================================
--
-- Tujuan:
--   1. Menyimpan tahun ajaran + semester secara terstruktur.
--   2. Menyediakan master jenjang kelas 1-6.
--   3. Menyimpan histori penempatan siswa per periode akademik.
--
-- Prinsip penting:
--   - students = identitas utama siswa.
--   - school_classes = rombel yang tersedia, mengikuti data siswa.
--   - student_enrollments = histori siswa berada di rombel mana
--     pada periode akademik tertentu.
--   - Nilai/STS/SAS/SAT TIDAK dibuat di migration ini.
--   - Satu siswa dapat memiliki banyak enrollment lintas tahun.
--
-- Jalankan SELURUH script ini sekaligus di Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 0. EXTENSION
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- 1. ACADEMIC PERIODS
-- ============================================================
--
-- Contoh:
--   2026/2027 | Ganjil
--   2026/2027 | Genap
--   2027/2028 | Ganjil
--
-- Satu tahun ajaran memiliki maksimal dua semester.
-- ============================================================

create table if not exists public.academic_periods (
  id uuid primary key default gen_random_uuid(),

  school_year text not null,

  semester text not null,

  label text not null,

  is_active boolean not null default false,

  is_archived boolean not null default false,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint academic_periods_semester_check
    check (semester in ('Ganjil', 'Genap')),

  constraint academic_periods_school_year_check
    check (
      school_year ~ '^[0-9]{4}/[0-9]{4}$'
    ),

  constraint academic_periods_unique_period
    unique (school_year, semester)
);


create index if not exists idx_academic_periods_school_year
  on public.academic_periods (school_year);

create index if not exists idx_academic_periods_semester
  on public.academic_periods (semester);

create index if not exists idx_academic_periods_active
  on public.academic_periods (is_active);

create index if not exists idx_academic_periods_archived
  on public.academic_periods (is_archived);


drop trigger if exists trg_academic_periods_updated_at
on public.academic_periods;

create trigger trg_academic_periods_updated_at
before update on public.academic_periods
for each row
execute function public.set_updated_at();


-- ============================================================
-- 2. ACADEMIC LEVELS / JENJANG
-- ============================================================
--
-- Ini BUKAN rombel.
--
-- Contoh:
--   Kelas 1 = grade 1 = Fase A
--   Kelas 2 = grade 2 = Fase A
--   ...
--
-- Nantinya Mapel + TP akan dikaitkan ke jenjang ini,
-- bukan ke 1A/1B/1C secara terpisah.
-- ============================================================

create table if not exists public.academic_levels (
  id text primary key,

  name text not null,

  grade integer not null,

  phase text,

  active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint academic_levels_grade_unique
    unique (grade),

  constraint academic_levels_grade_check
    check (grade between 1 and 6)
);


create index if not exists idx_academic_levels_grade
  on public.academic_levels (grade);

create index if not exists idx_academic_levels_active
  on public.academic_levels (active);


drop trigger if exists trg_academic_levels_updated_at
on public.academic_levels;

create trigger trg_academic_levels_updated_at
before update on public.academic_levels
for each row
execute function public.set_updated_at();


-- ============================================================
-- 3. SEED JENJANG
-- ============================================================

insert into public.academic_levels
  (id, name, grade, phase, active)
values
  ('grade_1', 'Kelas 1', 1, 'Fase A', true),
  ('grade_2', 'Kelas 2', 2, 'Fase A', true),
  ('grade_3', 'Kelas 3', 3, 'Fase B', true),
  ('grade_4', 'Kelas 4', 4, 'Fase B', true),
  ('grade_5', 'Kelas 5', 5, 'Fase C', true),
  ('grade_6', 'Kelas 6', 6, 'Fase C', true)
on conflict (id) do update
set
  name = excluded.name,
  grade = excluded.grade,
  phase = excluded.phase,
  active = excluded.active;


-- ============================================================
-- 4. HUBUNGKAN SCHOOL_CLASSES DENGAN ACADEMIC_LEVELS
-- ============================================================
--
-- school_classes tetap menjadi sumber rombel aktual.
-- academic_level_id hanya menunjukkan jenjang dari rombel.
--
-- Contoh:
--   1A -> grade_1
--   1B -> grade_1
--   4A -> grade_4
--   4B -> grade_4
--
-- Ini penting agar semua rombel dalam satu jenjang
-- menggunakan Mapel + TP yang sama.
-- ============================================================

alter table public.school_classes
add column if not exists academic_level_id text;


update public.school_classes sc
set academic_level_id = al.id
from public.academic_levels al
where al.grade = sc.grade
  and (
    sc.academic_level_id is null
    or sc.academic_level_id <> al.id
  );


alter table public.school_classes
drop constraint if exists school_classes_academic_level_id_fkey;

alter table public.school_classes
add constraint school_classes_academic_level_id_fkey
foreign key (academic_level_id)
references public.academic_levels(id)
on update cascade
on delete restrict;


create index if not exists idx_school_classes_academic_level_id
  on public.school_classes (academic_level_id);


-- ============================================================
-- 5. STUDENT ENROLLMENTS / HISTORI PENEMPATAN SISWA
-- ============================================================
--
-- Tabel ini adalah KUNCI agar kenaikan kelas + acak rombel
-- tidak mengubah histori nilai siswa.
--
-- Contoh:
--
--   Ahmad | 2025/2026 Ganjil | 5A
--   Ahmad | 2025/2026 Genap  | 5A
--   Ahmad | 2026/2027 Ganjil | 6B
--
-- students.class_id tetap dapat digunakan sebagai kelas AKTIF
-- untuk kebutuhan aplikasi saat ini.
--
-- Histori resmi lintas tahun disimpan di sini.
-- ============================================================

create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null,

  academic_period_id uuid not null,

  class_id text not null,

  status text not null default 'Aktif',

  notes text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint student_enrollments_student_fkey
    foreign key (student_id)
    references public.students(id)
    on update cascade
    on delete cascade,

  constraint student_enrollments_period_fkey
    foreign key (academic_period_id)
    references public.academic_periods(id)
    on update cascade
    on delete restrict,

  constraint student_enrollments_class_fkey
    foreign key (class_id)
    references public.school_classes(id)
    on update cascade
    on delete restrict,

  constraint student_enrollments_status_check
    check (
      status in (
        'Aktif',
        'Lulus',
        'Mutasi Keluar',
        'Nonaktif'
      )
    ),

  constraint student_enrollments_unique_student_period
    unique (student_id, academic_period_id)
);


create index if not exists idx_student_enrollments_student
  on public.student_enrollments (student_id);

create index if not exists idx_student_enrollments_period
  on public.student_enrollments (academic_period_id);

create index if not exists idx_student_enrollments_class
  on public.student_enrollments (class_id);

create index if not exists idx_student_enrollments_period_class
  on public.student_enrollments (academic_period_id, class_id);


drop trigger if exists trg_student_enrollments_updated_at
on public.student_enrollments;

create trigger trg_student_enrollments_updated_at
before update on public.student_enrollments
for each row
execute function public.set_updated_at();


-- ============================================================
-- 6. RLS
-- ============================================================

alter table public.academic_periods enable row level security;
alter table public.academic_levels enable row level security;
alter table public.student_enrollments enable row level security;


-- ============================================================
-- 7. POLICY ACADEMIC PERIODS
-- ============================================================

drop policy if exists "academic_periods_select"
on public.academic_periods;

create policy "academic_periods_select"
on public.academic_periods
for select
to anon, authenticated
using (true);


drop policy if exists "academic_periods_insert"
on public.academic_periods;

create policy "academic_periods_insert"
on public.academic_periods
for insert
to anon, authenticated
with check (true);


drop policy if exists "academic_periods_update"
on public.academic_periods;

create policy "academic_periods_update"
on public.academic_periods
for update
to anon, authenticated
using (true)
with check (true);


drop policy if exists "academic_periods_delete"
on public.academic_periods;

create policy "academic_periods_delete"
on public.academic_periods
for delete
to anon, authenticated
using (true);


-- ============================================================
-- 8. POLICY ACADEMIC LEVELS
-- ============================================================

drop policy if exists "academic_levels_select"
on public.academic_levels;

create policy "academic_levels_select"
on public.academic_levels
for select
to anon, authenticated
using (true);


drop policy if exists "academic_levels_insert"
on public.academic_levels;

create policy "academic_levels_insert"
on public.academic_levels
for insert
to anon, authenticated
with check (true);


drop policy if exists "academic_levels_update"
on public.academic_levels;

create policy "academic_levels_update"
on public.academic_levels
for update
to anon, authenticated
using (true)
with check (true);


drop policy if exists "academic_levels_delete"
on public.academic_levels;

create policy "academic_levels_delete"
on public.academic_levels
for delete
to anon, authenticated
using (true);


-- ============================================================
-- 9. POLICY STUDENT ENROLLMENTS
-- ============================================================

drop policy if exists "student_enrollments_select"
on public.student_enrollments;

create policy "student_enrollments_select"
on public.student_enrollments
for select
to anon, authenticated
using (true);


drop policy if exists "student_enrollments_insert"
on public.student_enrollments;

create policy "student_enrollments_insert"
on public.student_enrollments
for insert
to anon, authenticated
with check (true);


drop policy if exists "student_enrollments_update"
on public.student_enrollments;

create policy "student_enrollments_update"
on public.student_enrollments
for update
to anon, authenticated
using (true)
with check (true);


drop policy if exists "student_enrollments_delete"
on public.student_enrollments;

create policy "student_enrollments_delete"
on public.student_enrollments
for delete
to anon, authenticated
using (true);


-- ============================================================
-- 10. OPTIONAL: PERIODE AKADEMIK AKTIF SAAT INI
-- ============================================================
--
-- Dibuat idempotent.
-- Jika periode 2026/2027 Ganjil sudah ada, tidak dibuat ulang.
--
-- Jangan otomatis membuat enrollment siswa di sini.
-- Enrollment akan kita isi melalui service aplikasi setelah
-- struktur fondasi berhasil diverifikasi.
-- ============================================================

insert into public.academic_periods
  (school_year, semester, label, is_active, is_archived)
values
  (
    '2026/2027',
    'Ganjil',
    '2026/2027 - Ganjil',
    true,
    false
  )
on conflict (school_year, semester) do nothing;


-- ============================================================
-- 11. VERIFIKASI
-- ============================================================

select
  id,
  school_year,
  semester,
  label,
  is_active,
  is_archived
from public.academic_periods
order by school_year desc, semester;


select
  id,
  name,
  grade,
  phase,
  active
from public.academic_levels
order by grade;


select
  id,
  name,
  grade,
  phase,
  academic_level_id,
  active
from public.school_classes
order by grade, name;


select
  count(*) as total_students
from public.students;


select
  count(*) as total_enrollments
from public.student_enrollments;
