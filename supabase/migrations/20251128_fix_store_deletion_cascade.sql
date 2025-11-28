-- Fix CASCADE DELETE constraints for proper store deletion
-- This ensures all related data is properly deleted when a store is removed

-- 1. Add CASCADE DELETE for time_cards.user_id
-- This was commented out in 20251121_add_cascade_delete_constraints.sql
-- Note: time_cards uses user_id to reference profiles, not profile_id
ALTER TABLE time_cards
DROP CONSTRAINT IF EXISTS time_cards_user_id_fkey,
ADD CONSTRAINT time_cards_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 2. Add CASCADE DELETE for profile_relationships
-- Both source and target should cascade when profile is deleted
ALTER TABLE profile_relationships
DROP CONSTRAINT IF EXISTS profile_relationships_source_profile_id_fkey,
ADD CONSTRAINT profile_relationships_source_profile_id_fkey
FOREIGN KEY (source_profile_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

ALTER TABLE profile_relationships
DROP CONSTRAINT IF EXISTS profile_relationships_target_profile_id_fkey,
ADD CONSTRAINT profile_relationships_target_profile_id_fkey
FOREIGN KEY (target_profile_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 3. Fix comments.author_profile_id to SET NULL
-- Keep comments even if author is deleted, but set author to NULL
ALTER TABLE comments
DROP CONSTRAINT IF EXISTS comments_author_profile_id_fkey,
ADD CONSTRAINT comments_author_profile_id_fkey
FOREIGN KEY (author_profile_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- 4. Add CASCADE DELETE for comments.target_profile_id
-- Delete comments when the target profile is deleted
ALTER TABLE comments
DROP CONSTRAINT IF EXISTS comments_target_profile_id_fkey,
ADD CONSTRAINT comments_target_profile_id_fkey
FOREIGN KEY (target_profile_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 5. Add CASCADE DELETE for comment_likes.profile_id
ALTER TABLE comment_likes
DROP CONSTRAINT IF EXISTS comment_likes_profile_id_fkey,
ADD CONSTRAINT comment_likes_profile_id_fkey
FOREIGN KEY (profile_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON CONSTRAINT time_cards_user_id_fkey ON time_cards IS 
'Cascade delete time cards when profile is deleted';

COMMENT ON CONSTRAINT profile_relationships_source_profile_id_fkey ON profile_relationships IS 
'Cascade delete relationships when source profile is deleted';

COMMENT ON CONSTRAINT profile_relationships_target_profile_id_fkey ON profile_relationships IS 
'Cascade delete relationships when target profile is deleted';

COMMENT ON CONSTRAINT comments_author_profile_id_fkey ON comments IS 
'Set author to NULL when profile is deleted (preserve comment)';

COMMENT ON CONSTRAINT comments_target_profile_id_fkey ON comments IS 
'Cascade delete comments when target profile is deleted';

COMMENT ON CONSTRAINT comment_likes_profile_id_fkey ON comment_likes IS 
'Cascade delete likes when profile is deleted';
