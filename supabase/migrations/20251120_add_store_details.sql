-- Add new columns to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS business_start_time time,
ADD COLUMN IF NOT EXISTS business_end_time time,
ADD COLUMN IF NOT EXISTS day_switch_time time,
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS closed_days text[],
ADD COLUMN IF NOT EXISTS prefecture text;

-- Add comment for clarity
COMMENT ON COLUMN public.stores.day_switch_time IS 'Time when the business day switches (e.g., 05:00)';
