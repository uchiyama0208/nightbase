-- Add theme column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light';

-- Add check constraint to ensure theme is either 'light' or 'dark'
ALTER TABLE profiles ADD CONSTRAINT theme_check CHECK (theme IN ('light', 'dark'));
