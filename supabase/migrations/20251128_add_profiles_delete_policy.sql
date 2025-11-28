-- Add DELETE policy for profiles table
-- Staff members can delete profiles in their store (except themselves)

CREATE POLICY "Staff can delete profiles in their store" ON profiles
    FOR DELETE
    USING (
        -- The profile being deleted must be in the same store as the current user
        store_id IN (
            SELECT store_id FROM profiles 
            WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
        )
        -- And the current user must be a staff member
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
            AND role = 'staff'
        )
        -- Cannot delete yourself
        AND id NOT IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
    );
