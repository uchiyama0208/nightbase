-- Add referral_source column to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS referral_source text;
