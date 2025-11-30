-- Create table_types table
CREATE TABLE IF NOT EXISTS table_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for store_id
CREATE INDEX IF NOT EXISTS idx_table_types_store_id ON table_types(store_id);

-- Add type_id column to tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES table_types(id) ON DELETE SET NULL;

-- Create index for type_id
CREATE INDEX IF NOT EXISTS idx_tables_type_id ON tables(type_id);

-- Enable RLS
ALTER TABLE table_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for table_types
CREATE POLICY "Users can view table types in their store"
    ON table_types FOR SELECT
    USING (
        store_id IN (
            SELECT store_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert table types in their store"
    ON table_types FOR INSERT
    WITH CHECK (
        store_id IN (
            SELECT store_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update table types in their store"
    ON table_types FOR UPDATE
    USING (
        store_id IN (
            SELECT store_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete table types in their store"
    ON table_types FOR DELETE
    USING (
        store_id IN (
            SELECT store_id FROM profiles WHERE user_id = auth.uid()
        )
    );
