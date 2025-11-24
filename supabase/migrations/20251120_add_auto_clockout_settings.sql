-- Add auto clock-out settings to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS auto_clockout_enabled BOOLEAN DEFAULT false;

-- Add forgot_clockout flag to time_cards table
ALTER TABLE time_cards
ADD COLUMN IF NOT EXISTS forgot_clockout BOOLEAN DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN stores.auto_clockout_enabled IS '退勤忘れ時の自動退勤処理を有効にするかどうか';
COMMENT ON COLUMN time_cards.forgot_clockout IS '退勤打刻を忘れて自動的に退勤処理された場合true';
