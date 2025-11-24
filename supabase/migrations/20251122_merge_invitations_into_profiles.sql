-- Add invitation columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS invite_token UUID UNIQUE DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS invite_status TEXT DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted', 'expired', 'canceled')),
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invite_password_hash TEXT,
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index on invite_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_invite_token ON profiles(invite_token);

-- Drop invitations table
DROP TABLE IF EXISTS invitations;

-- Update RLS policies for profiles to allow viewing by invite token (for public access)
-- We need a function to securely fetch profile by invite token, similar to what we had for invitations
CREATE OR REPLACE FUNCTION get_profile_by_invite_token(lookup_token UUID)
RETURNS TABLE (
    id UUID,
    store_id UUID,
    user_id UUID,
    role TEXT, -- Using the existing role column
    invite_status TEXT,
    invite_expires_at TIMESTAMP WITH TIME ZONE,
    invite_password_hash TEXT,
    store_name TEXT,
    profile_name TEXT -- display_name
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.store_id,
        p.user_id,
        p.role::TEXT,
        p.invite_status,
        p.invite_expires_at,
        p.invite_password_hash,
        s.name AS store_name,
        p.display_name AS profile_name
    FROM profiles p
    JOIN stores s ON p.store_id = s.id
    WHERE p.invite_token = lookup_token
    AND p.invite_status = 'pending'
    AND (p.invite_expires_at IS NULL OR p.invite_expires_at > NOW());
END;
$$ LANGUAGE plpgsql;
