create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id text not null,
  user_id uuid not null,
  title text not null,
  description text null,
  project_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  primary key (id, user_id)
);

create table if not exists public.chapters (
  id text not null,
  user_id uuid not null,
  project_id text not null,
  title text not null,
  content text not null default '',
  synopsis text null,
  "order" integer not null default 0,
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  primary key (id, user_id)
);

create table if not exists public.characters (
  id text not null,
  user_id uuid not null,
  project_id text not null,
  name text not null,
  description text null,
  first_appearance text null,
  attributes jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  primary key (id, user_id)
);

create table if not exists public.terms (
  id text not null,
  user_id uuid not null,
  project_id text not null,
  term text not null,
  definition text null,
  category text null,
  "order" integer not null default 0,
  first_appearance text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  primary key (id, user_id)
);

create table if not exists public.world_documents (
  id text not null,
  user_id uuid not null,
  project_id text not null,
  doc_type text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  primary key (id, user_id),
  unique (user_id, project_id, doc_type)
);

create table if not exists public.memos (
  id text not null,
  user_id uuid not null,
  project_id text not null,
  title text not null,
  content text not null default '',
  tags jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  primary key (id, user_id)
);

create table if not exists public.snapshots (
  id text not null,
  user_id uuid not null,
  project_id text not null,
  chapter_id text null,
  content_length integer not null default 0,
  content_path text null,
  content_inline text null,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  primary key (id, user_id)
);

create table if not exists public.tombstones (
  id text not null,
  user_id uuid not null,
  project_id text not null,
  entity_type text not null,
  entity_id text not null,
  deleted_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

create table if not exists public.device_checkpoints (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  device_id text not null,
  last_synced_at timestamptz not null default now(),
  last_synced_revision text null,
  updated_at timestamptz not null default now(),
  primary key (id),
  unique (user_id, device_id)
);

create index if not exists idx_projects_user_project_updated on public.projects (user_id, id, updated_at);
create index if not exists idx_projects_user_deleted on public.projects (user_id, deleted_at);

create index if not exists idx_chapters_user_project_updated on public.chapters (user_id, project_id, updated_at);
create index if not exists idx_chapters_user_deleted on public.chapters (user_id, deleted_at);

create index if not exists idx_characters_user_project_updated on public.characters (user_id, project_id, updated_at);
create index if not exists idx_terms_user_project_updated on public.terms (user_id, project_id, updated_at);
create index if not exists idx_world_documents_user_project_updated on public.world_documents (user_id, project_id, updated_at);
create index if not exists idx_memos_user_project_updated on public.memos (user_id, project_id, updated_at);
create index if not exists idx_snapshots_user_project_updated on public.snapshots (user_id, project_id, updated_at);
create index if not exists idx_tombstones_user_project_deleted on public.tombstones (user_id, project_id, deleted_at);

alter table public.projects enable row level security;
alter table public.chapters enable row level security;
alter table public.characters enable row level security;
alter table public.terms enable row level security;
alter table public.world_documents enable row level security;
alter table public.memos enable row level security;
alter table public.snapshots enable row level security;
alter table public.tombstones enable row level security;
alter table public.device_checkpoints enable row level security;

drop policy if exists projects_owner_rw on public.projects;
create policy projects_owner_rw on public.projects
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists chapters_owner_rw on public.chapters;
create policy chapters_owner_rw on public.chapters
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists characters_owner_rw on public.characters;
create policy characters_owner_rw on public.characters
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists terms_owner_rw on public.terms;
create policy terms_owner_rw on public.terms
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists world_documents_owner_rw on public.world_documents;
create policy world_documents_owner_rw on public.world_documents
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists memos_owner_rw on public.memos;
create policy memos_owner_rw on public.memos
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists snapshots_owner_rw on public.snapshots;
create policy snapshots_owner_rw on public.snapshots
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists tombstones_owner_rw on public.tombstones;
create policy tombstones_owner_rw on public.tombstones
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists device_checkpoints_owner_rw on public.device_checkpoints;
create policy device_checkpoints_owner_rw on public.device_checkpoints
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('luie-snapshots', 'luie-snapshots', false)
on conflict (id) do nothing;

drop policy if exists luie_snapshots_select on storage.objects;
create policy luie_snapshots_select on storage.objects
for select
to authenticated
using (
  bucket_id = 'luie-snapshots'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists luie_snapshots_insert on storage.objects;
create policy luie_snapshots_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'luie-snapshots'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists luie_snapshots_update on storage.objects;
create policy luie_snapshots_update on storage.objects
for update
to authenticated
using (
  bucket_id = 'luie-snapshots'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'luie-snapshots'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists luie_snapshots_delete on storage.objects;
create policy luie_snapshots_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'luie-snapshots'
  and split_part(name, '/', 1) = auth.uid()::text
);
