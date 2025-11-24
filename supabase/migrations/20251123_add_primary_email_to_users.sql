-- Add primary_email column to public.users table
-- This column stores the user-specified email address for login and display
-- while the email column continues to store LINE-based placeholder emails for LINE authentication

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS primary_email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_primary_email ON public.users(primary_email);

-- Backfill primary_email for existing users
-- For non-LINE placeholder emails, copy email to primary_email
-- For LINE placeholder emails (@line.nightbase.app), leave primary_email as NULL
UPDATE public.users
SET primary_email = CASE
    WHEN email NOT LIKE '%@line.nightbase.app' THEN email
    ELSE NULL
END
WHERE primary_email IS NULL;

COMMENT ON COLUMN public.users.primary_email IS 'User-specified email address for login and display. NULL for LINE-only users who have not set an email.';
