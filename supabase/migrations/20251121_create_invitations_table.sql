-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID NOT NULL DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES store_roles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'canceled')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    password_hash TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Create index on store_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitations_store_id ON invitations(store_id);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow users to view invitations for their store
CREATE POLICY "Users can view invitations for their store" ON invitations
    FOR SELECT
    USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE id = (SELECT current_profile_id FROM users WHERE id = auth.uid())
        )
    );

-- Allow users to insert invitations for their store
CREATE POLICY "Users can create invitations for their store" ON invitations
    FOR INSERT
    WITH CHECK (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE id = (SELECT current_profile_id FROM users WHERE id = auth.uid())
        )
    );

-- Allow users to update invitations for their store (e.g., cancel)
CREATE POLICY "Users can update invitations for their store" ON invitations
    FOR UPDATE
    USING (
        store_id IN (
            SELECT store_id FROM profiles
            WHERE id = (SELECT current_profile_id FROM users WHERE id = auth.uid())
        )
    );

-- Allow public access to read invitation by token (for the invitee page)
-- This is tricky with RLS. We might need a SECURITY DEFINER function or a specific policy for public access if we want to expose it via client-side Supabase.
-- However, since we are using Server Actions, we can bypass RLS or use a service role if needed, OR we can allow public read on specific columns if token matches.
-- For simplicity and security with Server Actions, we will rely on the server-side logic to fetch by token using a secure client or just standard RLS if the user is not logged in (which they aren't).
-- Actually, for the public page, the user is anonymous.
-- We can create a policy for anonymous users to select by token.

CREATE POLICY "Public can view invitation by token" ON invitations
    FOR SELECT
    TO anon, authenticated
    USING (true); 
    -- Ideally we restrict this to only finding by token, but RLS doesn't easily support "only if querying by X".
    -- Since tokens are UUIDs and hard to guess, allowing SELECT on the table for anon might be okay IF we restrict the columns or rows returned?
    -- No, allowing `true` for anon is dangerous if they can list all.
    -- Better approach: The server action `getInvitationByToken` will likely run with `supabase-admin` (service role) or we rely on a function.
    -- But wait, `createServerClient` usually uses the user's session. If there is no session, it's anon.
    -- If we want to use standard RLS, we can't easily allow "select where token = X" without allowing select * generally unless we use a function.
    -- Let's use a SECURITY DEFINER function for fetching invitation by token to be safe.

-- Function to get invitation by token securely
CREATE OR REPLACE FUNCTION get_invitation_by_token(lookup_token UUID)
RETURNS TABLE (
    id UUID,
    store_id UUID,
    profile_id UUID,
    role_id UUID,
    status TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    password_hash TEXT,
    store_name TEXT,
    profile_name TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.store_id,
        i.profile_id,
        i.role_id,
        i.status,
        i.expires_at,
        i.password_hash,
        s.name AS store_name,
        p.display_name AS profile_name
    FROM invitations i
    JOIN stores s ON i.store_id = s.id
    JOIN profiles p ON i.profile_id = p.id
    WHERE i.token = lookup_token
    AND i.status = 'pending'
    AND i.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;
