-- Remove ALL foreign key constraints to auth.users
-- These constraints cause "Database error checking email" errors in Supabase

-- 1. Remove profiles.user_id constraint to auth.users (if it exists)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- 2. Remove profiles.invited_by constraint to auth.users (if it exists)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_invited_by_fkey;

-- 3. Remove invitations.created_by constraint to auth.users (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
        ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_created_by_fkey;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.user_id IS 
'References auth.users(id). No FK constraint due to Supabase limitations. Maintained by application logic.';

COMMENT ON COLUMN public.profiles.invited_by IS 
'References auth.users(id). No FK constraint due to Supabase limitations. Maintained by application logic.';

SELECT 'All auth.users foreign key constraints removed successfully' as result;
