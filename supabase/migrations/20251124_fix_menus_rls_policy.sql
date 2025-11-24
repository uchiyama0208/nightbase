-- Fix menus RLS policy for SELECT
-- The original policy incorrectly compared current_profile_id with store_id

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view menus of their store" ON menus;

-- Create the corrected policy
CREATE POLICY "Users can view menus of their store" ON menus
    FOR SELECT
    USING (store_id IN (
        SELECT store_id FROM profiles 
        WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
    ));
