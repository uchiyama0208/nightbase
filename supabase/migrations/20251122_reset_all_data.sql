-- ⚠️ DANGER: This script will delete ALL data from your database.
-- Use this only for resetting the environment during development.

-- 1. Truncate all tables in the public schema
-- Using CASCADE to automatically handle foreign key constraints
TRUNCATE TABLE public.time_cards CASCADE;
TRUNCATE TABLE public.store_roles CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.stores CASCADE;
TRUNCATE TABLE public.users CASCADE;

-- 2. Delete all users from Supabase Auth
-- Note: This requires appropriate permissions. If running from the Supabase Dashboard SQL Editor, it should work.
DELETE FROM auth.users;

-- 3. Optional: Reset sequences if you want IDs to start from 1 (for integer IDs, though most here are UUIDs)
-- ALTER SEQUENCE table_name_id_seq RESTART WITH 1;
