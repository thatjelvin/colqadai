-- Materials table: stores uploaded files / YouTube links with AI-generated summaries.
-- Run this migration in the Supabase SQL editor or via psql.

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('pdf', 'ppt', 'image', 'youtube', 'note')),
  title text not null,
  summary text,
  storage_url text,
  created_at timestamptz not null default now()
);

create index if not exists materials_user_id_idx on public.materials(user_id);
create index if not exists materials_created_at_idx on public.materials(created_at desc);

alter table public.materials enable row level security;

drop policy if exists "materials_select_own" on public.materials;
create policy "materials_select_own"
  on public.materials for select
  using (auth.uid() = user_id);

drop policy if exists "materials_insert_own" on public.materials;
create policy "materials_insert_own"
  on public.materials for insert
  with check (auth.uid() = user_id);

drop policy if exists "materials_update_own" on public.materials;
create policy "materials_update_own"
  on public.materials for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "materials_delete_own" on public.materials;
create policy "materials_delete_own"
  on public.materials for delete
  using (auth.uid() = user_id);

-- Supabase Storage bucket for uploaded material files (50 MB per file limit).
-- NOTE: storage.buckets is a real Postgres table in Supabase — this insert creates
-- the bucket if it does not already exist.
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 52428800)
on conflict (id) do nothing;

-- Storage RLS: users can only access their own files.
-- Files are stored under the path {user_id}/{material_id}/{filename}.

drop policy if exists "materials_storage_upload" on storage.objects;
create policy "materials_storage_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'materials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "materials_storage_select" on storage.objects;
create policy "materials_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'materials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "materials_storage_delete" on storage.objects;
create policy "materials_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'materials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
