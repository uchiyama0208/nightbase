-- Add layout_data and rotation to tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS layout_data JSONB DEFAULT '{"seats": [], "objects": []}';
ALTER TABLE tables ADD COLUMN IF NOT EXISTS rotation INTEGER DEFAULT 0;
