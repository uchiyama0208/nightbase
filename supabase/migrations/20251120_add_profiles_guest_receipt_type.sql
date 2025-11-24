-- Add guest receipt type field to profiles for guest role
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS guest_receipt_type text DEFAULT 'none';

COMMENT ON COLUMN public.profiles.guest_receipt_type IS 'Receipt preference for guests: none, amount_only, with_date.';
