-- 1. profiles.store_id -> CASCADE
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_store_id_fkey,
ADD CONSTRAINT profiles_store_id_fkey
FOREIGN KEY (store_id)
REFERENCES stores(id)
ON DELETE CASCADE;

-- 2. store_roles.store_id -> CASCADE
ALTER TABLE store_roles
DROP CONSTRAINT IF EXISTS store_roles_store_id_fkey,
ADD CONSTRAINT store_roles_store_id_fkey
FOREIGN KEY (store_id)
REFERENCES stores(id)
ON DELETE CASCADE;

-- 3. invitations.store_id -> CASCADE
ALTER TABLE invitations
DROP CONSTRAINT IF EXISTS invitations_store_id_fkey,
ADD CONSTRAINT invitations_store_id_fkey
FOREIGN KEY (store_id)
REFERENCES stores(id)
ON DELETE CASCADE;

-- 4. menus.store_id -> CASCADE
ALTER TABLE menus
DROP CONSTRAINT IF EXISTS menus_store_id_fkey,
ADD CONSTRAINT menus_store_id_fkey
FOREIGN KEY (store_id)
REFERENCES stores(id)
ON DELETE CASCADE;

-- 5. time_cards.profile_id -> CASCADE
-- ALTER TABLE time_cards
-- DROP CONSTRAINT IF EXISTS time_cards_profile_id_fkey,
-- ADD CONSTRAINT time_cards_profile_id_fkey
-- FOREIGN KEY (profile_id)
-- REFERENCES profiles(id)
-- ON DELETE CASCADE;

-- 6. profiles.user_id -> SET NULL
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
ADD CONSTRAINT profiles_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE SET NULL;
