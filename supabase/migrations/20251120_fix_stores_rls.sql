-- Drop the old policy
drop policy if exists "Admins can insert/update stores" on public.stores;

-- Create new policy using the permission system
create policy "Admins can insert/update stores"
  on public.stores
  for update
  using (
    exists (
      select 1 from public.profiles
      left join public.store_roles on profiles.role_id = store_roles.id
      where profiles.user_id = auth.uid()
      and profiles.store_id = stores.id
      and (
        profiles.role = 'admin' -- Backward compatibility
        or (store_roles.permissions->>'can_manage_settings')::boolean = true
      )
    )
  );
