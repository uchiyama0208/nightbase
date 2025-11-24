-- Create profile_relationships table
CREATE TABLE IF NOT EXISTS profile_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    source_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('compatibility_good', 'compatibility_bad', 'nomination', 'in_charge')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Ensure source_profile_id < target_profile_id for bidirectional uniqueness
    CONSTRAINT check_bidirectional_order CHECK (source_profile_id < target_profile_id),
    UNIQUE(source_profile_id, target_profile_id, relationship_type)
);

-- Create profile_comments table
CREATE TABLE IF NOT EXISTS profile_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    target_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    author_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE profile_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_comments ENABLE ROW LEVEL SECURITY;

-- Policies for profile_relationships
CREATE POLICY "Users can view relationships in their store" ON profile_relationships
    FOR SELECT
    USING (store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    ));

CREATE POLICY "Users can insert relationships in their store" ON profile_relationships
    FOR INSERT
    WITH CHECK (store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    ));

CREATE POLICY "Users can delete relationships in their store" ON profile_relationships
    FOR DELETE
    USING (store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    ));

-- Policies for profile_comments
CREATE POLICY "Users can view comments in their store" ON profile_comments
    FOR SELECT
    USING (store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    ));

CREATE POLICY "Users can insert comments in their store" ON profile_comments
    FOR INSERT
    WITH CHECK (store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    ));

-- No update policy for comments (immutable usually, or add if needed)
-- No delete policy for comments (or add if needed)
