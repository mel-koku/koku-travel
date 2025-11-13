create extension if not exists "pgcrypto";

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

alter table favorites enable row level security;

drop policy if exists "Users read own favorites" on favorites;
drop policy if exists "Users manage own favorites" on favorites;

create policy "Users read own favorites"
  on favorites
  for select
  using (auth.uid() = user_id);

create policy "Users manage own favorites"
  on favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


