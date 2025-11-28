-- Add set_duration_minutes to bill_settings
ALTER TABLE bill_settings ADD COLUMN IF NOT EXISTS set_duration_minutes INTEGER NOT NULL DEFAULT 60;
