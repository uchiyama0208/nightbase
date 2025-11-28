-- Add guest_id, amount, status to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'; -- 'pending', 'served', 'cancelled'
