-- Add target and visibility columns to menus table
ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_for_guest BOOLEAN DEFAULT true;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_for_cast BOOLEAN DEFAULT true;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

COMMENT ON COLUMN menus.is_for_guest IS 'ゲスト向けメニューかどうか';
COMMENT ON COLUMN menus.is_for_cast IS 'キャスト向けメニューかどうか';
COMMENT ON COLUMN menus.is_hidden IS '非表示かどうか';
