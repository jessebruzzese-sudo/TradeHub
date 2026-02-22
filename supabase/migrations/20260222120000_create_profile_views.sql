create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewed_user_id uuid not null references public.users(id) on delete cascade,
  viewer_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

create index if not exists idx_profile_views_viewed_user_id
  on public.profile_views(viewed_user_id);

create index if not exists idx_profile_views_created_at
  on public.profile_views(created_at);

-- RLS
alter table public.profile_views enable row level security;

create policy "Users can insert their own views"
on public.profile_views
for insert
to authenticated
with check (auth.uid() = viewer_user_id);

create policy "Users can read their own profile views"
on public.profile_views
for select
to authenticated
using (auth.uid() = viewed_user_id);
