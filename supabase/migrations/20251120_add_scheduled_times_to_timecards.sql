-- Add scheduled start and end time columns to time_cards table
-- These will store the rounded times based on store settings
-- while clock_in and clock_out preserve the actual punch times

ALTER TABLE time_cards
ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_end_time TIMESTAMPTZ;

-- Add comments for clarity
COMMENT ON COLUMN time_cards.scheduled_start_time IS '自動修正された開始時間（打刻時間の丸め処理後）';
COMMENT ON COLUMN time_cards.scheduled_end_time IS '自動修正された終了時間（打刻時間の丸め処理後）';
COMMENT ON COLUMN time_cards.clock_in IS '実際の打刻出勤時刻';
COMMENT ON COLUMN time_cards.clock_out IS '実際の打刻退勤時刻';
