-- Add location fields to stores table
alter table public.stores add column if not exists latitude double precision;
alter table public.stores add column if not exists longitude double precision;
alter table public.stores add column if not exists location_radius integer default 50;
alter table public.stores add column if not exists location_check_enabled boolean default false;
