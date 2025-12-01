-- Add total_amount column to table_sessions
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS total_amount INTEGER DEFAULT 0;
