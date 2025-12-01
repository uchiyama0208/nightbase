-- Add hide_from_slip column to menus table
ALTER TABLE menus ADD COLUMN IF NOT EXISTS hide_from_slip BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN menus.hide_from_slip IS '伝票で非表示にするかどうか';
