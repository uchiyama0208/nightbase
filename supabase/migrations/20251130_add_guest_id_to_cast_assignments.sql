-- Add guest_id column to cast_assignments table
ALTER TABLE cast_assignments
ADD COLUMN guest_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_cast_assignments_guest_id ON cast_assignments(guest_id);

-- Add comment to explain the column
COMMENT ON COLUMN cast_assignments.guest_id IS 'The guest profile that this cast is assigned to (nullable for general table assignments)';
