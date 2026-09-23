-- ============================================================
-- SDIT AL FIKRI - ACADEMIC CORE
-- 002_teachers.sql
-- Migrasi whitelist + session guru dari Firestore ke Supabase
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.teachers (
  id text primary key,
  name text not null,
  normalized_name text not null,
  role_title text not null default 'Guru SDIT AL FIKRI',
  status text not null default 'active',
  max_devices integer not null default 2,
  active_sessions jsonb not null default '[]'::jsonb,
  last_login_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint teachers_status_check
    check (status in ('active', 'blocked')),
  constraint teachers_max_devices_check
    check (max_devices >= 1),
  constraint teachers_active_sessions_array_check
    check (jsonb_typeof(active_sessions) = 'array')
);

create index if not exists idx_teachers_name
  on public.teachers(name);

create index if not exists idx_teachers_normalized_name
  on public.teachers(normalized_name);

create index if not exists idx_teachers_status
  on public.teachers(status);

 drop trigger if exists trg_teachers_updated_at on public.teachers;

create trigger trg_teachers_updated_at
before update on public.teachers
for each row
execute function public.set_updated_at();

alter table public.teachers enable row level security;

-- Kebijakan development, konsisten dengan migration students.
-- Nanti dapat diperketat setelah sistem auth aplikasi selesai.
drop policy if exists "teachers_select_anon" on public.teachers;
drop policy if exists "teachers_insert_anon" on public.teachers;
drop policy if exists "teachers_update_anon" on public.teachers;
drop policy if exists "teachers_delete_anon" on public.teachers;
drop policy if exists "teachers_select_authenticated" on public.teachers;
drop policy if exists "teachers_insert_authenticated" on public.teachers;
drop policy if exists "teachers_update_authenticated" on public.teachers;
drop policy if exists "teachers_delete_authenticated" on public.teachers;

create policy "teachers_select_anon"
on public.teachers for select to anon using (true);

create policy "teachers_insert_anon"
on public.teachers for insert to anon with check (true);

create policy "teachers_update_anon"
on public.teachers for update to anon using (true) with check (true);

create policy "teachers_delete_anon"
on public.teachers for delete to anon using (true);

create policy "teachers_select_authenticated"
on public.teachers for select to authenticated using (true);

create policy "teachers_insert_authenticated"
on public.teachers for insert to authenticated with check (true);

create policy "teachers_update_authenticated"
on public.teachers for update to authenticated using (true) with check (true);

create policy "teachers_delete_authenticated"
on public.teachers for delete to authenticated using (true);

-- Aktifkan perubahan tabel guru untuk Supabase Realtime.
do $$
begin
  alter publication supabase_realtime add table public.teachers;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Seed hanya jika tabel masih benar-benar kosong.
insert into public.teachers (
  id,
  name,
  normalized_name,
  role_title,
  status,
  max_devices,
  active_sessions,
  note
)
values
  ('TCH-yeni', 'Bu Yeni', 'yeni', 'Wali Kelas 1A', 'active', 2, '[]'::jsonb, ''),
  ('TCH-okta', 'Bu Okta', 'okta', 'Wali Kelas 1B', 'active', 2, '[]'::jsonb, ''),
  ('TCH-tati', 'Bu Tati', 'tati', 'Wali Kelas 2A', 'active', 2, '[]'::jsonb, ''),
  ('TCH-ana', 'Bu Ana', 'ana', 'Wali Kelas 2B', 'active', 2, '[]'::jsonb, ''),
  ('TCH-fida', 'Bu Fida', 'fida', 'Wali Kelas 2C', 'active', 2, '[]'::jsonb, ''),
  ('TCH-siti', 'Bu Siti', 'siti', 'Wali Kelas 3A', 'active', 2, '[]'::jsonb, ''),
  ('TCH-tri', 'Bu Tri', 'tri', 'Wali Kelas 3B', 'active', 2, '[]'::jsonb, ''),
  ('TCH-andin', 'Bu Andin', 'andin', 'Wali Kelas 3C', 'active', 2, '[]'::jsonb, ''),
  ('TCH-teti', 'Bu Teti', 'teti', 'Wali Kelas 4A', 'active', 2, '[]'::jsonb, ''),
  ('TCH-ifah', 'Bu Ifah', 'ifah', 'Wali Kelas 4B', 'active', 2, '[]'::jsonb, ''),
  ('TCH-itoh', 'Bu Itoh', 'itoh', 'Wali Kelas 5A', 'active', 2, '[]'::jsonb, ''),
  ('TCH-nadiya', 'Bu Nadiya', 'nadiya', 'Wali Kelas 5B', 'active', 2, '[]'::jsonb, ''),
  ('TCH-mae', 'Bu Mae', 'mae', 'Wali Kelas 6A', 'active', 2, '[]'::jsonb, ''),
  ('TCH-rini', 'Bu Rini', 'rini', 'Wali Kelas 6B', 'active', 2, '[]'::jsonb, ''),
  ('TCH-nedya', 'Bu Hj. Nedya', 'nedya', 'Guru B. Arab / SKI', 'active', 2, '[]'::jsonb, ''),
  ('TCH-wiwit', 'Ms. Wiwit', 'wiwit', 'Guru B. Inggris', 'active', 2, '[]'::jsonb, ''),
  ('TCH-megi', 'Pak Megi', 'megi', 'Guru PJOK', 'active', 2, '[]'::jsonb, ''),
  ('TCH-ikhlas', 'Pak Ikhlas', 'ikhlas', 'Guru B. Arab', 'active', 2, '[]'::jsonb, ''),
  ('TCH-may', 'Bu May', 'may', 'Guru PAI', 'active', 2, '[]'::jsonb, '')
on conflict (id) do nothing;

select id, name, normalized_name, role_title, status, max_devices, active_sessions
from public.teachers
order by name asc;
