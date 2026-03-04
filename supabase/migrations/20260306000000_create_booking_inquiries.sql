-- Create booking_inquiries table for Phase 2 Local Experts inquiry flow
create table booking_inquiries (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_email text not null,
  preferred_dates_start date,
  preferred_dates_end date,
  group_size int check (group_size > 0 and group_size <= 100),
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_booking_inquiries_person_id on booking_inquiries(person_id);
create index idx_booking_inquiries_user_id on booking_inquiries(user_id);
create index idx_booking_inquiries_status on booking_inquiries(status);

-- RLS: users can read and insert their own rows
alter table booking_inquiries enable row level security;

create policy "Users can read own inquiries"
  on booking_inquiries for select
  using (auth.uid() = user_id);

create policy "Users can insert own inquiries"
  on booking_inquiries for insert
  with check (auth.uid() = user_id);
