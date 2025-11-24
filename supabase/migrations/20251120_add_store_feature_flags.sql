-- Add feature visibility flags to stores (per-store feature settings)
alter table public.stores
  add column if not exists show_dashboard boolean not null default true,
  add column if not exists show_attendance boolean not null default true,
  add column if not exists show_timecard boolean not null default true,
  add column if not exists show_users boolean not null default true,
  add column if not exists show_roles boolean not null default true;
