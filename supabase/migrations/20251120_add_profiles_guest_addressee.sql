-- Add guest addressee field to profiles for guest role
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS guest_addressee text;

COMMENT ON COLUMN public.profiles.guest_addressee IS 'Addressee (宛名) used mainly for guest profiles.';
