-- Create a security definer function to check permissions without triggering RLS loops
create or replace function public.has_permission(_store_id uuid, _permission text)
returns boolean
language plpgsql
security definer
as $$
declare
  _has_permission boolean;
begin
  select (
    p.role = 'admin'
    or (sr.permissions->>_permission)::boolean = true
  )
  into _has_permission
  from profiles p
  left join store_roles sr on p.role_id = sr.id
  where p.user_id = auth.uid()
  and p.store_id = _store_id;

  return coalesce(_has_permission, false);
end;
$$;

-- Drop the problematic policy
drop policy if exists "Admins can manage roles" on store_roles;

-- Re-create the policy using the function
create policy "Admins can manage roles"
  on store_roles
  for all
  using (
    public.has_permission(store_id, 'can_manage_roles')
  );

-- Update profiles policies to use the function as well (cleaner)
drop policy if exists "Store admins can insert profiles" on profiles;
create policy "Store admins can insert profiles"
  on profiles for insert
  with check (
    public.has_permission(store_id, 'can_manage_users')
  );

drop policy if exists "Store admins can update profiles" on profiles;
create policy "Store admins can update profiles"
  on profiles for update
  using (
    public.has_permission(store_id, 'can_manage_users')
  );
