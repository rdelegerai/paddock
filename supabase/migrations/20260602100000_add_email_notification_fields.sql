alter table public.video_projects
add column if not exists owner_notified_at timestamptz,
add column if not exists customer_notified_at timestamptz;
