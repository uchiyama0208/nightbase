-- 1. Create store_roles table
create table if not exists public.store_roles (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  permissions jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(store_id, name)
);

-- 2. Add role_id to profiles (Must be done before creating policies that reference it)
alter table public.profiles add column if not exists role_id uuid references public.store_roles(id) on delete set null;

-- Enable RLS
alter table public.store_roles enable row level security;

-- RLS: Store members can view roles
create policy "Store members can view roles"
  on store_roles for select
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.store_id = store_roles.store_id
    )
  );

-- RLS: Only admins (initially defined by existing role='admin' or new permission) can manage roles
create policy "Admins can manage roles"
  on store_roles for all
  using (
    exists (
      select 1 from profiles
      left join store_roles as my_role on profiles.role_id = my_role.id
      where profiles.user_id = auth.uid()
      and profiles.store_id = store_roles.store_id
      and (
        profiles.role = 'admin' -- Backward compatibility
        or (my_role.permissions->>'can_manage_roles')::boolean = true
      )
    )
  );

-- 3. Create default "Admin" role for existing stores
insert into public.store_roles (store_id, name, permissions)
select id, '管理者', '{"can_manage_roles": true, "can_manage_users": true, "can_manage_settings": true}'::jsonb
from public.stores
on conflict (store_id, name) do nothing;

-- 4. Migrate existing 'admin' users to the new '管理者' role
update public.profiles
set role_id = (
  select id from public.store_roles
  where store_roles.store_id = profiles.store_id
  and store_roles.name = '管理者'
)
where role = 'admin';

-- 5. Update profiles 'role' column to 'staff' for migrated admins (since 'admin' is being removed/deprecated)
-- Note: You might want to keep 'admin' temporarily or switch them to 'staff'
update public.profiles
set role = 'staff'
where role = 'admin';

-- 6. Update RLS policies on profiles to use the new permissions system
-- (Example: Allow users with 'can_manage_users' permission to insert/update profiles)

drop policy if exists "Store admins can insert profiles" on profiles;
create policy "Store admins can insert profiles"
  on profiles for insert
  with check (
    exists (
      select 1 from profiles as my_profile
      left join store_roles as my_role on my_profile.role_id = my_role.id
      where my_profile.user_id = auth.uid()
      and my_profile.store_id = profiles.store_id
      and (
        my_profile.role = 'admin' -- Backward compatibility
        or (my_role.permissions->>'can_manage_users')::boolean = true
      )
    )
  );

drop policy if exists "Store admins can update profiles" on profiles;
create policy "Store admins can update profiles"
  on profiles for update
  using (
    exists (
      select 1 from profiles as my_profile
      left join store_roles as my_role on my_profile.role_id = my_role.id
      where my_profile.user_id = auth.uid()
      and my_profile.store_id = profiles.store_id
      and (
        my_profile.role = 'admin' -- Backward compatibility
        or (my_role.permissions->>'can_manage_users')::boolean = true
      )
    )
  );
