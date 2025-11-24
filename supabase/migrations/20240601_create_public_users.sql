-- Create public.users table to mirror auth.users
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on users
alter table public.users enable row level security;

-- Users policies
create policy "Users can view their own user record"
  on users for select
  using ( auth.uid() = id );

-- Trigger to sync auth.users to public.users
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Re-create the trigger on auth.users
-- Note: We previously dropped the trigger for profiles. Now we add one for users.
drop trigger if exists on_auth_user_created_sync_users on auth.users;
create trigger on_auth_user_created_sync_users
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Backfill existing users from auth.users to public.users
insert into public.users (id, email, created_at)
select id, email, created_at from auth.users
on conflict (id) do nothing;

-- Update profiles table to reference public.users
-- (The user_id column already contains UUIDs that match. We just update the FK constraint if needed)
-- Ideally, we want profiles.user_id to reference public.users.id
alter table public.profiles drop constraint if exists profiles_user_id_fkey;
alter table public.profiles add constraint profiles_user_id_fkey 
  foreign key (user_id) references public.users(id) on delete cascade;

-- Remove email from profiles as it is now in users
alter table public.profiles drop column if exists email;
