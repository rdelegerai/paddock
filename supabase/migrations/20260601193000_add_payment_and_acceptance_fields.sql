alter table public.video_projects
add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
add column if not exists stripe_checkout_session_id text,
add column if not exists stripe_payment_intent_id text,
add column if not exists customer_email text,
add column if not exists amount_cents integer not null default 7900,
add column if not exists currency text not null default 'eur',
add column if not exists paid_at timestamptz,
add column if not exists accepted_terms_at timestamptz,
add column if not exists accepted_delay_at timestamptz,
add column if not exists accepted_image_rights_at timestamptz,
add column if not exists admin_token text not null default (
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
);

create unique index if not exists video_projects_admin_token_key
on public.video_projects (admin_token);

create unique index if not exists video_projects_stripe_checkout_session_id_key
on public.video_projects (stripe_checkout_session_id)
where stripe_checkout_session_id is not null;

create index if not exists video_projects_payment_status_idx
on public.video_projects (payment_status);
