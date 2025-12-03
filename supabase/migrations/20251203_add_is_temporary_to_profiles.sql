-- Add is_temporary column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT FALSE;

-- Update existing temporary guests (those with null user_id and display_name starting with ゲスト)
UPDATE profiles
SET is_temporary = TRUE
WHERE user_id IS NULL AND display_name LIKE 'ゲスト%';
