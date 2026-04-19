-- C14 tip telemetry (minimum viable): event table for trip-level banner engagement.
-- Stores one row per banner render or dismiss, gated client-side by analytics_storage consent.
--
-- Scope: trip-level banners only (prep, disaster, earthquake, goshuin, accessibility).
-- Activity-level tips and cultural moments are not logged.
--
-- PII policy: user_id only (via auth.users FK). No email, displayName, or tip content.
-- Guest sessions record guest_id (the rotating UUID from AppState) so per-guest patterns
-- can still be analyzed without polluting auth.users.

create table if not exists public.tip_engagements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  guest_id text,
  trip_id text not null,
  tip_id text not null,
  action text not null check (action in ('rendered', 'dismissed')),
  region text,
  created_at timestamptz not null default now(),

  -- Exactly one of user_id / guest_id must be populated. Lets us query
  -- authenticated engagement separately from guest, without joining auth.users
  -- for anonymous rows.
  constraint tip_engagements_exactly_one_identity check (
    (user_id is not null and guest_id is null) or
    (user_id is null and guest_id is not null)
  )
);

create index if not exists tip_engagements_trip_idx
  on public.tip_engagements (trip_id, created_at desc);

create index if not exists tip_engagements_tip_action_idx
  on public.tip_engagements (tip_id, action, created_at desc);

create index if not exists tip_engagements_user_idx
  on public.tip_engagements (user_id, created_at desc)
  where user_id is not null;

alter table public.tip_engagements enable row level security;

-- Authenticated users: insert and read their own rows only.
create policy "users insert own tip_engagements"
  on public.tip_engagements
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users read own tip_engagements"
  on public.tip_engagements
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Anonymous sessions: may insert guest rows only. No read back (guests can't
-- introspect other guests' data and don't need to read their own). Service
-- role is used for any analytics queries.
create policy "anon insert guest tip_engagements"
  on public.tip_engagements
  for insert
  to anon
  with check (user_id is null and guest_id is not null);

comment on table public.tip_engagements is
  'C14 tip telemetry. Trip-level banner render/dismiss events. Consent-gated client-side via GA Consent Mode v2 (analytics_storage).';
