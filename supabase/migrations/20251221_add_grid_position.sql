-- Add grid position columns to session_guests
ALTER TABLE session_guests
ADD COLUMN IF NOT EXISTS grid_x INTEGER,
ADD COLUMN IF NOT EXISTS grid_y INTEGER;

-- Add grid position columns to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS grid_x INTEGER,
ADD COLUMN IF NOT EXISTS grid_y INTEGER;
