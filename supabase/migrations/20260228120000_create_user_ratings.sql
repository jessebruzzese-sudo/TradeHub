-- Thumbs up/down ratings for profiles
create table if not exists public.user_ratings (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.users(id) on delete cascade,
  rater_user_id uuid not null references public.users(id) on delete cascade,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz default now(),
  unique (target_user_id, rater_user_id)
);

create index if not exists idx_user_ratings_target
  on public.user_ratings(target_user_id);

create index if not exists idx_user_ratings_rater
  on public.user_ratings(rater_user_id);

alter table public.user_ratings enable row level security;

-- Anyone authenticated can read ratings (for counts)
create policy "Authenticated can read user_ratings"
  on public.user_ratings
  for select
  to authenticated
  using (true);

-- Users can insert their own rating
create policy "Users can insert own rating"
  on public.user_ratings
  for insert
  to authenticated
  with check (auth.uid() = rater_user_id);
