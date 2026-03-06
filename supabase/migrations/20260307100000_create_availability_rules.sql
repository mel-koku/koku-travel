-- Availability rules for people (artisans, guides, interpreters)
-- Weekly patterns (day_of_week set, specific_date null) + specific date overrides
create table if not exists availability_rules (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  day_of_week integer check (day_of_week between 0 and 6), -- 0=Sun, 1=Mon, ..., 6=Sat
  specific_date date,                                       -- overrides weekly rule for that date
  morning_available boolean not null default true,          -- 10:00–12:00
  afternoon_available boolean not null default true,        -- 14:00–16:00
  is_available boolean not null default true,               -- false = blackout
  created_at timestamptz default now(),
  check (
    (day_of_week is not null and specific_date is null) or
    (day_of_week is null and specific_date is not null)
  )
);

create index if not exists idx_availability_person on availability_rules(person_id);
create index if not exists idx_availability_date on availability_rules(specific_date) where specific_date is not null;
create index if not exists idx_availability_dow on availability_rules(day_of_week) where day_of_week is not null;

alter table availability_rules enable row level security;

create policy "Availability rules are publicly readable"
  on availability_rules for select using (true);
