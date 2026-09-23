-- ============================================================
-- SDIT AL FIKRI
-- SUPABASE ACADEMIC CORE
-- MIGRATION 001 - STUDENTS & SCHOOL CLASSES
-- ============================================================
--
-- Modul:
--   1. school_classes
--   2. students
--
-- Digunakan oleh:
--   src/services/studentStorage.ts
--
-- Jangan menjalankan SQL ini sebagian.
-- Jalankan seluruh script sekaligus di Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 0. EXTENSION
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- 1. UPDATED_AT HELPER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- 2. TABEL SCHOOL_CLASSES
-- ============================================================
--
-- Digunakan oleh studentStorage.ts untuk:
-- - memastikan class/rombel tersedia
-- - menyimpan id kelas
-- - menyimpan nama kelas
-- - menentukan tingkat/grade
-- - menentukan fase
--
-- Contoh:
-- 1A
-- 1B
-- 2A
-- 2B
-- dst.
-- ============================================================

create table if not exists public.school_classes (
  id text primary key,
  name text not null,
  grade integer not null,
  phase text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint school_classes_grade_check
    check (grade between 1 and 6)
);


-- ============================================================
-- 3. INDEX SCHOOL_CLASSES
-- ============================================================

create index if not exists idx_school_classes_grade
  on public.school_classes (grade);

create index if not exists idx_school_classes_active
  on public.school_classes (active);


-- ============================================================
-- 4. TRIGGER SCHOOL_CLASSES
-- ============================================================

drop trigger if exists trg_school_classes_updated_at
on public.school_classes;

create trigger trg_school_classes_updated_at
before update on public.school_classes
for each row
execute function public.set_updated_at();


-- ============================================================
-- 5. TABEL STUDENTS
-- ============================================================
--
-- Struktur ini disesuaikan dengan studentStorage.ts:
--
-- id
-- name
-- class_id
-- school_name
-- nim
-- nisn
-- tempat_lahir
-- tanggal_lahir
-- gender
-- status
-- created_at
-- updated_at
-- ============================================================

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  class_id text not null,

  school_name text not null default 'SDIT Al Fikri',

  nim text,

  nisn text,

  tempat_lahir text,

  tanggal_lahir text,

  gender text,

  status text not null default 'Aktif',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint students_class_id_fkey
    foreign key (class_id)
    references public.school_classes(id)
    on update cascade
    on delete restrict,

  constraint students_gender_check
    check (
      gender is null
      or gender in ('L', 'P')
    ),

  constraint students_status_check
    check (
      status in (
        'Aktif',
        'Mutasi Keluar',
        'Lulus',
        'Nonaktif'
      )
    )
);


-- ============================================================
-- 6. INDEX STUDENTS
-- ============================================================

create index if not exists idx_students_name
  on public.students (name);

create index if not exists idx_students_class_id
  on public.students (class_id);

create index if not exists idx_students_school_name
  on public.students (school_name);

create index if not exists idx_students_nisn
  on public.students (nisn);

create index if not exists idx_students_status
  on public.students (status);


-- ============================================================
-- 7. TRIGGER STUDENTS
-- ============================================================

drop trigger if exists trg_students_updated_at
on public.students;

create trigger trg_students_updated_at
before update on public.students
for each row
execute function public.set_updated_at();


-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

alter table public.school_classes enable row level security;

alter table public.students enable row level security;


-- ============================================================
-- 9. POLICY SCHOOL_CLASSES
-- ============================================================
--
-- Untuk tahap migrasi/development:
-- aplikasi yang menggunakan anon key dapat:
-- - membaca kelas
-- - menambah kelas
-- - mengubah kelas
-- - menghapus kelas
--
-- Nanti setelah sistem authentication/role Supabase
-- selesai, policy ini sebaiknya diperketat.
-- ============================================================

drop policy if exists "school_classes_select"
on public.school_classes;

create policy "school_classes_select"
on public.school_classes
for select
to anon, authenticated
using (true);


drop policy if exists "school_classes_insert"
on public.school_classes;

create policy "school_classes_insert"
on public.school_classes
for insert
to anon, authenticated
with check (true);


drop policy if exists "school_classes_update"
on public.school_classes;

create policy "school_classes_update"
on public.school_classes
for update
to anon, authenticated
using (true)
with check (true);


drop policy if exists "school_classes_delete"
on public.school_classes;

create policy "school_classes_delete"
on public.school_classes
for delete
to anon, authenticated
using (true);


-- ============================================================
-- 10. POLICY STUDENTS
-- ============================================================
--
-- Untuk tahap migrasi/development:
-- aplikasi dapat melakukan CRUD terhadap data siswa.
--
-- Sama seperti policy di atas, nanti bisa diperketat
-- setelah sistem authentication/role selesai.
-- ============================================================

drop policy if exists "students_select"
on public.students;

create policy "students_select"
on public.students
for select
to anon, authenticated
using (true);


drop policy if exists "students_insert"
on public.students;

create policy "students_insert"
on public.students
for insert
to anon, authenticated
with check (true);


drop policy if exists "students_update"
on public.students;

create policy "students_update"
on public.students
for update
to anon, authenticated
using (true)
with check (true);


drop policy if exists "students_delete"
on public.students;

create policy "students_delete"
on public.students
for delete
to anon, authenticated
using (true);


-- ============================================================
-- 11. DATA KELAS AWAL
-- ============================================================
--
-- Data ini bukan data siswa.
-- Hanya membuat struktur rombel dasar agar
-- import siswa dapat langsung menggunakan class_id.
--
-- Contoh kelas:
-- 1A, 1B, 2A, 2B, ... 6A, 6B
--
-- Jika sekolah memiliki rombel berbeda,
-- data ini masih bisa ditambah/diedit nanti.
-- ============================================================

insert into public.school_classes
  (id, name, grade, phase, active)
values
  ('1A', '1A', 1, 'Fase A', true),
  ('1B', '1B', 1, 'Fase A', true),
  ('2A', '2A', 2, 'Fase A', true),
  ('2B', '2B', 2, 'Fase A', true),
  ('3A', '3A', 3, 'Fase B', true),
  ('3B', '3B', 3, 'Fase B', true),
  ('4A', '4A', 4, 'Fase B', true),
  ('4B', '4B', 4, 'Fase B', true),
  ('5A', '5A', 5, 'Fase C', true),
  ('5B', '5B', 5, 'Fase C', true),
  ('6A', '6A', 6, 'Fase C', true),
  ('6B', '6B', 6, 'Fase C', true)
on conflict (id) do nothing;


-- ============================================================
-- 12. VERIFIKASI
-- ============================================================
--
-- Setelah script selesai, dua query berikut akan
-- menampilkan struktur/data awal.
-- ============================================================

select
  id,
  name,
  grade,
  phase,
  active
from public.school_classes
order by grade, name;


select
  id,
  name,
  class_id,
  school_name,
  nim,
  nisn,
  tempat_lahir,
  tanggal_lahir,
  gender,
  status,
  created_at,
  updated_at
from public.students
order by name;