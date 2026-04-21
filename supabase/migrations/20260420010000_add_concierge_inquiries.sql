-- Concierge landing page lead capture.
-- Public form (unauthenticated) at /concierge writes rows here via service-role client.
-- RLS enabled with no public policies — only service-role reads from the admin dashboard.

create table if not exists public.concierge_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  source text not null default 'concierge-landing',
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'archived')),
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists concierge_inquiries_created_at_idx
  on public.concierge_inquiries (created_at desc);

create index if not exists concierge_inquiries_status_idx
  on public.concierge_inquiries (status, created_at desc);

alter table public.concierge_inquiries enable row level security;

-- No policies for anon or authenticated. Inserts happen via service-role client
-- in /api/concierge/inquiries. Reads happen in the Supabase dashboard (service role).

comment on table public.concierge_inquiries is
  'Lead captures from the /concierge landing page. Service-role write only.';
