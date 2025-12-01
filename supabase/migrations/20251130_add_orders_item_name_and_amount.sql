-- Add item_name column to orders table for non-menu items (set fee, nomination fee, etc.)
-- Make menu_id nullable to allow orders without a menu reference
-- Add amount column to store the actual price at the time of order

-- Make menu_id nullable
ALTER TABLE orders ALTER COLUMN menu_id DROP NOT NULL;

-- Add item_name column for display purposes when menu_id is null
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_name TEXT;

-- Add amount column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 0;

-- Add status column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add guest_id column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
