create extension if not exists "pgcrypto";

create table if not exists guide_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  guide_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, guide_id)
);

alter table guide_bookmarks enable row level security;

drop policy if exists "Users read own guide bookmarks" on guide_bookmarks;
drop policy if exists "Users manage own guide bookmarks" on guide_bookmarks;

create policy "Users read own guide bookmarks"
  on guide_bookmarks
  for select
  using (auth.uid() = user_id);

create policy "Users manage own guide bookmarks"
  on guide_bookmarks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

