-- Create function to get profile by ID for invitation (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION get_profile_by_id_for_invite(lookup_id UUID)
RETURNS TABLE (
    id UUID,
    store_id UUID,
    user_id UUID,
    role TEXT,
    invite_status TEXT,
    invite_expires_at TIMESTAMP WITH TIME ZONE,
    invite_password_hash TEXT,
    store_name TEXT,
    profile_name TEXT
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
    WHERE p.id = lookup_id
    AND p.invite_status = 'pending'
    AND (p.invite_expires_at IS NULL OR p.invite_expires_at > NOW());
END;
$$ LANGUAGE plpgsql;
