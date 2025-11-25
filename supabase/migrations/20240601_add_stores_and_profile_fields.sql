-- Create stores table
create table if not exists public.stores (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on stores
alter table public.stores enable row level security;

-- Stores policies
create policy "Stores are viewable by everyone"
  on stores for select
  using ( true );

-- Admin policy will be created after profiles table exists
-- This is moved to a later migration to avoid dependency issues
-- create policy "Admins can insert/update stores"
--   on stores for all
--   using (
--     exists (
--       select 1 from profiles
--       where profiles.user_id = auth.uid()
--       and profiles.role = 'admin'
--     )
--   );

-- Modify profiles table
alter table public.profiles add column if not exists real_name text;
alter table public.profiles add column if not exists real_name_kana text;
alter table public.profiles add column if not exists store_id uuid references public.stores(id);

-- Update profiles policies to allow reading store_id
-- (Existing policies should cover this as they select *)
