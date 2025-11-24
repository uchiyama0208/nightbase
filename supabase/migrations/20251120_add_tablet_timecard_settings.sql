-- Add tablet timecard settings to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS tablet_acceptance_start_time time,
ADD COLUMN IF NOT EXISTS tablet_acceptance_end_time time,
ADD COLUMN IF NOT EXISTS tablet_allowed_roles text[] DEFAULT ARRAY['staff', 'cast'];

-- Add comment for documentation
COMMENT ON COLUMN public.stores.tablet_acceptance_start_time IS 'Start time for tablet timecard acceptance (e.g., 18:00)';
COMMENT ON COLUMN public.stores.tablet_acceptance_end_time IS 'End time for tablet timecard acceptance (e.g., 05:00 next day)';
COMMENT ON COLUMN public.stores.tablet_allowed_roles IS 'Roles allowed to use tablet timecard: staff, cast, or both';
