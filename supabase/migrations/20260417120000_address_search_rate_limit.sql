create table if not exists public.address_search_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  sessions_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index if not exists address_search_usage_user_idx
  on public.address_search_usage (user_id, usage_date desc);

alter table public.address_search_usage enable row level security;

create policy "users can read own usage"
  on public.address_search_usage for select
  using (auth.uid() = user_id);

-- All writes go through the service role from the API route
create policy "service role manages usage"
  on public.address_search_usage for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.increment_address_search_usage(p_user_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  new_count integer;
begin
  insert into public.address_search_usage (user_id, usage_date, sessions_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set
    sessions_count = public.address_search_usage.sessions_count + 1,
    updated_at = now()
  returning sessions_count into new_count;
  return new_count;
end;
$$;

revoke all on function public.increment_address_search_usage(uuid) from public;
grant execute on function public.increment_address_search_usage(uuid) to service_role;
