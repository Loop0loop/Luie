create table if not exists public.memory_canonical_rows (
  id text not null,
  user_id uuid not null,
  project_id text not null,
  table_name text not null,
  row jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  primary key (id, user_id)
);

create index if not exists idx_memory_canonical_rows_user_project_updated
on public.memory_canonical_rows (user_id, project_id, updated_at);

create index if not exists idx_memory_canonical_rows_user_project_table
on public.memory_canonical_rows (user_id, project_id, table_name);

alter table public.memory_canonical_rows enable row level security;

drop policy if exists memory_canonical_rows_owner_rw on public.memory_canonical_rows;
create policy memory_canonical_rows_owner_rw on public.memory_canonical_rows
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
