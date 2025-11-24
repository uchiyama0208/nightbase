-- Fix RLS policies to allow store creation

-- Stores: Allow any authenticated user to create a store
drop policy if exists "Admins can insert/update stores" on stores;

create policy "Authenticated users can create stores"
  on stores for insert
  with check ( auth.role() = 'authenticated' );

create policy "Admins can update stores"
  on stores for update
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.store_id = stores.id
      and profiles.role = 'admin'
    )
  );

create policy "Admins can delete stores"
  on stores for delete
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.store_id = stores.id
      and profiles.role = 'admin'
    )
  );

-- Profiles: Ensure users can insert their own profile (if not already exists)
-- We drop and recreate to be sure
drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = user_id );
