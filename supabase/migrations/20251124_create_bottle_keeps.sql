-- Create bottle_keeps table
CREATE TABLE IF NOT EXISTS bottle_keeps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    remaining_amount INTEGER NOT NULL DEFAULT 100 CHECK (remaining_amount >= 0 AND remaining_amount <= 100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'empty', 'returned')),
    opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create bottle_keep_holders table (Many-to-Many relationship between bottle_keeps and profiles)
CREATE TABLE IF NOT EXISTS bottle_keep_holders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bottle_keep_id UUID NOT NULL REFERENCES bottle_keeps(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(bottle_keep_id, profile_id)
);

-- Enable RLS
ALTER TABLE bottle_keeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_keep_holders ENABLE ROW LEVEL SECURITY;

-- Policies for bottle_keeps
CREATE POLICY "Users can view bottle keeps of their store" ON bottle_keeps
    FOR SELECT
    USING (store_id IN (
        SELECT store_id FROM profiles 
        WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can insert bottle keeps to their store" ON bottle_keeps
    FOR INSERT
    WITH CHECK (store_id IN (
        SELECT store_id FROM profiles 
        WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can update bottle keeps of their store" ON bottle_keeps
    FOR UPDATE
    USING (store_id IN (
        SELECT store_id FROM profiles 
        WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can delete bottle keeps of their store" ON bottle_keeps
    FOR DELETE
    USING (store_id IN (
        SELECT store_id FROM profiles 
        WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
    ));

-- Policies for bottle_keep_holders
-- Access is controlled via the parent bottle_keep record, but we need explicit policies for the junction table too.
-- We can check if the user has access to the related bottle_keep's store.

CREATE POLICY "Users can view bottle keep holders of their store" ON bottle_keep_holders
    FOR SELECT
    USING (bottle_keep_id IN (
        SELECT id FROM bottle_keeps WHERE store_id IN (
            SELECT store_id FROM profiles 
            WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
        )
    ));

CREATE POLICY "Users can insert bottle keep holders to their store" ON bottle_keep_holders
    FOR INSERT
    WITH CHECK (bottle_keep_id IN (
        SELECT id FROM bottle_keeps WHERE store_id IN (
            SELECT store_id FROM profiles 
            WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
        )
    ));

CREATE POLICY "Users can delete bottle keep holders of their store" ON bottle_keep_holders
    FOR DELETE
    USING (bottle_keep_id IN (
        SELECT id FROM bottle_keeps WHERE store_id IN (
            SELECT store_id FROM profiles 
            WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
        )
    ));

-- Create indexes
CREATE INDEX idx_bottle_keeps_store_id ON bottle_keeps(store_id);
CREATE INDEX idx_bottle_keeps_menu_id ON bottle_keeps(menu_id);
CREATE INDEX idx_bottle_keep_holders_bottle_keep_id ON bottle_keep_holders(bottle_keep_id);
CREATE INDEX idx_bottle_keep_holders_profile_id ON bottle_keep_holders(profile_id);
