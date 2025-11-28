-- Create menu_categories table
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id, name)
);

-- Add indexes
CREATE INDEX idx_menu_categories_store_id ON menu_categories(store_id);

-- Add category_id to menus
ALTER TABLE menus ADD COLUMN category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL;

-- Migrate existing data
DO $$
DECLARE
    r RECORD;
    cat_id UUID;
BEGIN
    -- Loop through distinct categories in menus
    FOR r IN SELECT DISTINCT store_id, category FROM menus WHERE category IS NOT NULL LOOP
        -- Insert into menu_categories
        INSERT INTO menu_categories (store_id, name)
        VALUES (r.store_id, r.category)
        ON CONFLICT (store_id, name) DO UPDATE SET name = EXCLUDED.name -- Dummy update to ensure ID is returned if needed, or just select
        RETURNING id INTO cat_id;

        -- Update menus
        UPDATE menus SET category_id = cat_id WHERE store_id = r.store_id AND category = r.category;
    END LOOP;
END $$;

-- Drop old column
ALTER TABLE menus DROP COLUMN category;

-- Make category_id NOT NULL
ALTER TABLE menus ALTER COLUMN category_id SET NOT NULL;

-- Enable RLS
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Enable read access for all users" ON menu_categories FOR SELECT USING (true);

CREATE POLICY "Enable insert for staff" ON menu_categories FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.store_id = menu_categories.store_id
        AND (profiles.role = 'staff' OR profiles.role = 'admin')
    )
);

CREATE POLICY "Enable update for staff" ON menu_categories FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.store_id = menu_categories.store_id
        AND (profiles.role = 'staff' OR profiles.role = 'admin')
    )
);

CREATE POLICY "Enable delete for staff" ON menu_categories FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.store_id = menu_categories.store_id
        AND (profiles.role = 'staff' OR profiles.role = 'admin')
    )
);
