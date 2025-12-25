-- Add pickup_enabled settings for cast and staff to store_settings
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS pickup_enabled_cast BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pickup_enabled_staff BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN store_settings.pickup_enabled_cast IS 'Enable pickup destination input for cast members during clock-in';
COMMENT ON COLUMN store_settings.pickup_enabled_staff IS 'Enable pickup destination input for staff members during clock-in';
