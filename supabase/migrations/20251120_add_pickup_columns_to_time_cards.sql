-- Add pickup_required and pickup_destination columns to time_cards table
ALTER TABLE public.time_cards 
ADD COLUMN IF NOT EXISTS pickup_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pickup_destination text;
