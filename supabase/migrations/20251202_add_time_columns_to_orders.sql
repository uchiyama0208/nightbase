-- Add start_time and end_time columns to orders table for Nomination and Companion fees
ALTER TABLE orders ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

