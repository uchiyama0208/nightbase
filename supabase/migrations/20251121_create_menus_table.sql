-- Create menus table
CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view menus of their store" ON menus
    FOR SELECT
    USING (store_id IN (
        SELECT current_profile_id FROM users WHERE id = auth.uid()
    ) OR store_id IN (
        SELECT store_id FROM profiles 
        WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can insert menus to their store" ON menus
    FOR INSERT
    WITH CHECK (store_id IN (
        SELECT store_id FROM profiles 
        WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can update menus of their store" ON menus
    FOR UPDATE
    USING (store_id IN (
        SELECT store_id FROM profiles 
        WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can delete menus of their store" ON menus
    FOR DELETE
    USING (store_id IN (
        SELECT store_id FROM profiles 
        WHERE id IN (SELECT current_profile_id FROM users WHERE id = auth.uid())
    ));

-- Create index for faster lookups
CREATE INDEX idx_menus_store_id ON menus(store_id);
CREATE INDEX idx_menus_category ON menus(category);
