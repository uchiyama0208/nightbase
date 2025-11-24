-- Remove invited_by column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS invited_by;
