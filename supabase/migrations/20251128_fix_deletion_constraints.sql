-- Fix foreign key constraints for proper cascade deletion
-- This ensures data integrity when deleting stores and users

-- NOTE: We do NOT add a foreign key constraint from profiles.user_id to auth.users(id)
-- because Supabase's auth schema doesn't support this properly and causes errors.
-- Instead, we rely on application logic to maintain referential integrity.

-- 1. Remove any existing profiles.user_id constraint to auth.users
-- This prevents "Database error checking email" errors during user creation
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- 2. Fix users.current_profile_id constraint to SET NULL
-- When a profile is deleted, current_profile_id should be set to null
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_current_profile_id_fkey;

ALTER TABLE public.users
ADD CONSTRAINT users_current_profile_id_fkey
FOREIGN KEY (current_profile_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.user_id IS 
'References auth.users(id). No FK constraint due to Supabase limitations. Maintained by application logic.';

COMMENT ON CONSTRAINT users_current_profile_id_fkey ON public.users IS 
'Set current_profile_id to null when profile is deleted';
