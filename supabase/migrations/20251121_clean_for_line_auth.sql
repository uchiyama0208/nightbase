-- Clean start for LINE authentication
-- This will delete all existing users and related data

-- 1. Delete all existing data (cascading deletes will handle related records)
TRUNCATE TABLE stores CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- 2. Delete all auth users
-- Note: This must be done via Supabase Dashboard -> Authentication -> Users
-- Or use the following approach with auth.users (if you have access)

-- 3. Add line_user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'line_user_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN line_user_id TEXT UNIQUE;
        CREATE INDEX idx_profiles_line_user_id ON profiles(line_user_id);
        COMMENT ON COLUMN profiles.line_user_id IS 'LINE user ID for LINE login integration';
    END IF;
END $$;

-- 4. Verify the cleanup
SELECT 'Stores count: ' || COUNT(*) FROM stores;
SELECT 'Profiles count: ' || COUNT(*) FROM profiles;
