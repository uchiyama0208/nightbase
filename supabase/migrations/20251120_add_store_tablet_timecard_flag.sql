alter table public.stores
  add column if not exists tablet_timecard_enabled boolean not null default false;
