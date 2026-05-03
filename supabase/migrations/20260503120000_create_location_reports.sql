-- User-reported wrong-info pipeline.
-- Public form on /places/[id] writes rows here via the service-role client in /api/locations/report.
-- RLS enabled with NO public policies — every write goes through the API route (rate-limited,
-- input-validated). Anon clients calling from the browser cannot insert directly.
-- Reads happen in Supabase Studio (service role) for manual triage; no /admin UI in v1.

create table if not exists public.location_reports (
  id uuid primary key default gen_random_uuid(),
  -- locations.id is a slug (text), not uuid — see CLAUDE.md "path param validation" note.
  location_id text not null references public.locations(id) on delete cascade,
  report_type text not null
    check (report_type in (
      'permanently_closed', 'wrong_hours', 'wrong_address',
      'photo_issue', 'inaccurate_info', 'other'
    )),
  description text not null,
  reporter_email text,
  reporter_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'spam')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  resolution_note text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_location_reports_pending
  on public.location_reports (created_at desc) where status = 'pending';

create index if not exists idx_location_reports_location
  on public.location_reports (location_id);

create trigger set_location_reports_updated_at
  before update on public.location_reports
  for each row execute function update_updated_at_column();

alter table public.location_reports enable row level security;

-- No policies. Service-role bypasses RLS for inserts (via /api/locations/report) and reads
-- (via Studio). This matches the concierge_inquiries pattern and prevents anon clients from
-- bypassing the API's rate limit / validation by inserting directly.

comment on table public.location_reports is
  'User-submitted reports of wrong info on /places/[id]. Service-role write only via /api/locations/report. Manual triage in Supabase Studio.';
