-- Modify profile_comments to support both profiles and bottle_keeps
-- Make target_profile_id nullable and add target_bottle_keep_id
ALTER TABLE profile_comments 
    ALTER COLUMN target_profile_id DROP NOT NULL,
    ADD COLUMN target_bottle_keep_id UUID REFERENCES bottle_keeps(id) ON DELETE CASCADE,
    ADD CONSTRAINT check_comment_target CHECK (
        (target_profile_id IS NOT NULL AND target_bottle_keep_id IS NULL) OR
        (target_profile_id IS NULL AND target_bottle_keep_id IS NOT NULL)
    );

-- Rename table to generic 'comments' for clarity (optional but recommended)
ALTER TABLE profile_comments RENAME TO comments;

-- Update profile_comment_likes to reference the renamed table
ALTER TABLE profile_comment_likes RENAME TO comment_likes;

-- Add index for bottle_keep comments
CREATE INDEX idx_comments_bottle_keep_id ON comments(target_bottle_keep_id);

-- Remove memo field from bottle_keeps
ALTER TABLE bottle_keeps DROP COLUMN IF EXISTS memo;
