-- Remove the automatic profile creation trigger
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Create stores table (if not exists)
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

create policy "Admins can insert/update stores"
  on stores for all
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Modify profiles table to be a join table
-- First, ensure store_id exists
alter table public.profiles add column if not exists store_id uuid references public.stores(id);

-- Add other fields
alter table public.profiles add column if not exists real_name text;
alter table public.profiles add column if not exists real_name_kana text;

-- Remove unique constraint on user_id if it exists (to allow multiple profiles per user)
-- Note: This might fail if there is no explicit constraint name, but usually it's profiles_user_id_key or similar.
-- If you created the table via Supabase UI, it might be unique.
-- We will try to drop the constraint if we can identify it, or just add the new unique constraint.
-- Ideally, we want (user_id, store_id) to be unique.

alter table public.profiles drop constraint if exists profiles_user_id_key;

-- Add unique constraint for user_id + store_id
alter table public.profiles add constraint profiles_user_id_store_id_key unique (user_id, store_id);

-- Update RLS for profiles
-- Users can view their own profiles
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = user_id );

-- Users can update their own profile
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = user_id );

-- Admins of the SAME STORE can view/edit profiles in that store
drop policy if exists "Store admins can view profiles" on profiles;
create policy "Store admins can view profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles as my_profile
      where my_profile.user_id = auth.uid()
      and my_profile.store_id = profiles.store_id
      and my_profile.role = 'admin'
    )
  );
