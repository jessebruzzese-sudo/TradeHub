-- Profile verification visibility toggles
alter table public.users
  add column if not exists show_abn_on_profile boolean not null default false;

alter table public.users
  add column if not exists show_business_name_on_profile boolean not null default true;
