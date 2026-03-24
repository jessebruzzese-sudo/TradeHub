-- Durable posting-history log for free-tier job posting limits.
-- Deleting a job must NOT free the free-tier posting slot.

create table if not exists public.job_post_events (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.users(id) on delete cascade,
  job_id uuid null references public.jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_post_events_contractor_created_at
  on public.job_post_events (contractor_id, created_at desc);

comment on table public.job_post_events is
  'Immutable log of job posting events used for free-tier rolling 30-day enforcement. Deleting jobs must not free quota slots.';
