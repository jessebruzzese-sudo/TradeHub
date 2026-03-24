-- Transactional email event log and queue foundation.
-- Source of truth remains platform/billing data; emails are side effects only.

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  to_email text not null,
  email_type text not null,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_events_type_check
    check (email_type in ('welcome', 'premium_upgraded', 'job_invite', 'hire_confirmed')),
  constraint email_events_status_check
    check (status in ('pending', 'sent', 'failed'))
);

create index if not exists email_events_status_idx
  on public.email_events(status);

create index if not exists email_events_user_id_idx
  on public.email_events(user_id);

create index if not exists email_events_type_idx
  on public.email_events(email_type);

-- Ensure only one welcome email is queued per user.
create unique index if not exists email_events_one_welcome_per_user_idx
  on public.email_events(user_id, email_type)
  where email_type = 'welcome';

-- Queue welcome email when profile row is created (typically from signup trigger).
create or replace function public.queue_welcome_email_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.email_events (
    user_id,
    to_email,
    email_type,
    status,
    payload
  )
  values (
    new.id,
    new.email,
    'welcome',
    'pending',
    jsonb_build_object(
      'firstName', split_part(coalesce(new.name, ''), ' ', 1),
      'source', 'users_insert_trigger'
    )
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trigger_queue_welcome_email_event on public.users;
create trigger trigger_queue_welcome_email_event
  after insert on public.users
  for each row
  execute function public.queue_welcome_email_event();

