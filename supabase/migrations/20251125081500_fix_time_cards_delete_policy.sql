-- Fix RLS policy for time_cards table to allow deletion
-- This policy allows authenticated users to delete time cards based on permissions

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can delete time cards" ON public.time_cards;

-- Create new policy for deleting time cards
CREATE POLICY "Users can delete time cards"
ON public.time_cards
FOR DELETE
TO authenticated
USING (
  -- User can delete their own time cards
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
    AND (user_id = u.current_profile_id OR user_id = u.id)
  )
  OR
  -- Or if they have permission in the same store as the target profile
  EXISTS (
    SELECT 1
    FROM profiles p
    INNER JOIN users u ON u.current_profile_id = p.id
    INNER JOIN profiles target ON target.id = time_cards.user_id
    WHERE u.id = auth.uid()
    AND p.store_id = target.store_id
    AND p.role IN ('admin', 'staff')
  )
);
