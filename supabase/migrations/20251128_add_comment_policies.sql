-- Add UPDATE policy for comments
CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE
    USING (author_profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ))
    WITH CHECK (author_profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));

-- Add DELETE policy for comments
CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE
    USING (author_profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));
