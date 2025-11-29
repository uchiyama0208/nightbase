-- Add grid position columns to cast_assignments
ALTER TABLE cast_assignments 
ADD COLUMN IF NOT EXISTS grid_x INTEGER,
ADD COLUMN IF NOT EXISTS grid_y INTEGER;
