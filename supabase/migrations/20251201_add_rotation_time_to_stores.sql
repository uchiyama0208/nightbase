-- Add rotation_time column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS rotation_time INTEGER DEFAULT 15;

COMMENT ON COLUMN stores.rotation_time IS '付け回し時間（分）';
