-- Fix RLS recursion by using SECURITY DEFINER functions

-- 1. Create helper function to check store membership without RLS recursion
CREATE OR REPLACE FUNCTION is_store_member(lookup_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND store_id = lookup_store_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create helper function to check admin/staff role without RLS recursion
CREATE OR REPLACE FUNCTION is_store_admin_or_staff(lookup_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND store_id = lookup_store_id
    AND role IN ('admin', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update profiles policies to use the functions
DROP POLICY IF EXISTS "profiles_select_store" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_store" ON profiles;
DROP POLICY IF EXISTS "profiles_update_store" ON profiles;

CREATE POLICY "profiles_select_store" ON profiles
  FOR SELECT USING (
    is_store_member(store_id)
  );

CREATE POLICY "profiles_insert_store" ON profiles
  FOR INSERT WITH CHECK (
    is_store_admin_or_staff(store_id)
  );

CREATE POLICY "profiles_update_store" ON profiles
  FOR UPDATE USING (
    is_store_admin_or_staff(store_id)
  );

-- 4. Ensure users table has SELECT policy
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = (select auth.uid()));
