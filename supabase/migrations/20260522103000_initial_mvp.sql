create extension if not exists pgcrypto;

create table if not exists public.video_projects (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'in_review', 'video_in_progress', 'delivered', 'archived')),
  pilot_name text not null default '',
  birth_year integer check (birth_year is null or birth_year between 1900 and 2100),
  discipline text,
  practice_period text,
  selected_offer text not null default 'short'
    check (selected_offer in ('short', 'standard', 'long')),
  contact_name text,
  contact_email text,
  generated_story text,
  final_story text,
  web_notes text,
  answers jsonb not null default '{}'::jsonb,
  photo_files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.video_projects(id) on delete cascade,
  source_url text,
  source_title text,
  note text not null,
  confidence text not null default 'to_verify'
    check (confidence in ('to_verify', 'confirmed', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.video_projects(id) on delete cascade,
  bucket text not null default 'pilot-photos',
  object_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.video_projects enable row level security;
alter table public.research_notes enable row level security;
alter table public.project_media enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_video_projects_updated_at on public.video_projects;
create trigger set_video_projects_updated_at
before update on public.video_projects
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pilot-photos',
  'pilot-photos',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
