-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Modify existing profiles table
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists phone_number text;

-- Update role column default if needed (optional, based on your requirement)
alter table public.profiles alter column role set default 'guest';

-- Create attendance table
create table if not exists public.attendance (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  status text not null check (status in ('scheduled', 'working', 'finished', 'absent')),
  start_time time,
  end_time time,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create time_cards table
create table if not exists public.time_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  work_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.attendance enable row level security;
alter table public.time_cards enable row level security;
alter table public.profiles enable row level security;

-- Profiles policies
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = user_id );

-- Attendance policies
drop policy if exists "Users can view their own attendance" on attendance;
create policy "Users can view their own attendance"
  on attendance for select
  using (auth.uid() = user_id);

drop policy if exists "Admins and Staff can view all attendance" on attendance;
create policy "Admins and Staff can view all attendance"
  on attendance for select
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role in ('admin', 'staff')
    )
  );

drop policy if exists "Admins and Staff can insert/update attendance" on attendance;
create policy "Admins and Staff can insert/update attendance"
  on attendance for all
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role in ('admin', 'staff')
    )
  );

-- Time Card policies
drop policy if exists "Users can view their own time cards" on time_cards;
create policy "Users can view their own time cards"
  on time_cards for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert/update their own time cards" on time_cards;
create policy "Users can insert/update their own time cards"
  on time_cards for all
  using (auth.uid() = user_id);

drop policy if exists "Admins and Staff can view all time cards" on time_cards;
create policy "Admins and Staff can view all time cards"
  on time_cards for select
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role in ('admin', 'staff')
    )
  );

-- Trigger for new user creation (Update existing or create new)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, display_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name', coalesce(new.raw_user_meta_data->>'role', 'guest'))
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
