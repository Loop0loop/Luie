-- project_path is app-local attachment metadata and must not live in sync schema.
alter table if exists public.projects
  drop column if exists project_path;
