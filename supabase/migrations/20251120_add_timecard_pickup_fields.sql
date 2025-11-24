alter table public.time_cards
  add column if not exists pickup_required boolean,
  add column if not exists pickup_destination text;
