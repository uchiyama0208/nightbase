-- Add LINE user ID column to profiles table (safe to run multiple times)
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
