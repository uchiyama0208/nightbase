-- Add LINE user ID column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);

-- Add comment
COMMENT ON COLUMN profiles.line_user_id IS 'LINE user ID for LINE login integration';
