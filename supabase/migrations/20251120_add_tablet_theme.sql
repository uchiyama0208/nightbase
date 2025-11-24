-- Add tablet theme setting to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS tablet_theme text DEFAULT 'light' CHECK (tablet_theme IN ('light', 'dark'));

-- Add comment for documentation
COMMENT ON COLUMN public.stores.tablet_theme IS 'Theme for tablet timecard: light or dark';
