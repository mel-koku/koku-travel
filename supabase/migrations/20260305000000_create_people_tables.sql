-- People profiles (artisans, guides, interpreters)
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('artisan', 'guide', 'interpreter')),
  name text not null,
  name_japanese text,
  slug text unique not null,
  bio text,
  photo_url text,
  city text,
  prefecture text,
  region text,
  languages text[] default '{}',
  specialties text[] default '{}',
  years_experience int,
  license_number text,
  website_url text,
  social_links jsonb default '{}',
  is_published boolean default true,
  sanity_slug text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Join table: people ↔ experiences (by Sanity slug)
create table if not exists people_experiences (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  experience_slug text not null,
  role text not null default 'lead' check (role in ('lead', 'assistant', 'interpreter', 'host')),
  is_primary boolean default true,
  created_at timestamptz default now(),
  unique (person_id, experience_slug)
);

-- Indexes
create index if not exists idx_people_slug on people(slug);
create index if not exists idx_people_type on people(type);
create index if not exists idx_people_published on people(is_published) where is_published = true;
create index if not exists idx_people_experiences_slug on people_experiences(experience_slug);
create index if not exists idx_people_experiences_person on people_experiences(person_id);

-- RLS
alter table people enable row level security;
alter table people_experiences enable row level security;

create policy "People are publicly readable"
  on people for select using (is_published = true);

create policy "People experiences are publicly readable"
  on people_experiences for select using (true);
