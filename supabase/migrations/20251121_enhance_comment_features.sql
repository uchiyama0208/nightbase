-- Create profile_comment_likes table
CREATE TABLE IF NOT EXISTS profile_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES profile_comments(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(comment_id, profile_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON profile_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_profile_id ON profile_comment_likes(profile_id);

-- Add RLS policies
ALTER TABLE profile_comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies for profile_comment_likes
CREATE POLICY "Users can view likes in their store" ON profile_comment_likes
    FOR SELECT
    USING (
        comment_id IN (
            SELECT id FROM profile_comments WHERE store_id IN (
                SELECT store_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert likes in their store" ON profile_comment_likes
    FOR INSERT
    WITH CHECK (
        comment_id IN (
            SELECT id FROM profile_comments WHERE store_id IN (
                SELECT store_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete their own likes" ON profile_comment_likes
    FOR DELETE
    USING (profile_id = auth.uid()::uuid OR profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
