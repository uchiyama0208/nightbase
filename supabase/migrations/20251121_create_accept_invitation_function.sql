-- Function to accept invitation and link profile
CREATE OR REPLACE FUNCTION accept_invitation(invitation_id UUID, target_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_profile_id UUID;
    target_role_id UUID;
BEGIN
    -- Get invitation details and lock the row
    SELECT profile_id, role_id INTO target_profile_id, target_role_id
    FROM invitations
    WHERE id = invitation_id AND status = 'pending'
    FOR UPDATE;

    IF target_profile_id IS NULL THEN
        RAISE EXCEPTION 'Invitation not found or invalid';
    END IF;

    -- Update profile with user_id
    -- Also update role if specified in invitation
    UPDATE profiles
    SET 
        user_id = target_user_id,
        role_id = COALESCE(target_role_id, role_id), -- Update role if provided, else keep existing
        updated_at = NOW()
    WHERE id = target_profile_id;

    -- Update invitation status
    UPDATE invitations
    SET 
        status = 'accepted',
        updated_at = NOW()
    WHERE id = invitation_id;

    -- If role_id was provided, we might need to ensure the role exists or do other checks, but FK handles existence.
    -- The profile update handles the role assignment.

END;
$$ LANGUAGE plpgsql;
