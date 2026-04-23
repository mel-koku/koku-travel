-- 20260419000003_add_trip_advisories_seen.sql
create table if not exists trip_advisories_seen (
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  advisory_key text not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, trip_id, advisory_key)
);

alter table trip_advisories_seen enable row level security;

create policy "Users read own trip_advisories_seen" on trip_advisories_seen
  for select using (auth.uid() = user_id);

create policy "Users insert own trip_advisories_seen" on trip_advisories_seen
  for insert with check (auth.uid() = user_id);

create policy "Users delete own trip_advisories_seen" on trip_advisories_seen
  for delete using (auth.uid() = user_id);
