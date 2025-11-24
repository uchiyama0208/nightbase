-- Add allow_join_requests column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS allow_join_requests BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN stores.allow_join_requests IS 'Whether the store allows users to request to join via store ID search';
