-- Make user_id nullable in profiles to allow creating profiles without an auth user (e.g. guests)
alter table public.profiles alter column user_id drop not null;

-- Add RLS policy to allow store admins to insert new profiles (for guests/staff)
drop policy if exists "Store admins can insert profiles" on profiles;
create policy "Store admins can insert profiles"
  on profiles for insert
  with check (
    exists (
      select 1 from profiles as my_profile
      where my_profile.user_id = auth.uid()
      and my_profile.store_id = profiles.store_id
      and my_profile.role = 'admin'
    )
  );

-- Add RLS policy to allow store admins to update profiles in their store
drop policy if exists "Store admins can update profiles" on profiles;
create policy "Store admins can update profiles"
  on profiles for update
  using (
    exists (
      select 1 from profiles as my_profile
      where my_profile.user_id = auth.uid()
      and my_profile.store_id = profiles.store_id
      and my_profile.role = 'admin'
    )
  );
