-- Fix RLS policies for profiles table to allow store members to view/manage profiles

-- Allow users to view profiles in the same store
CREATE POLICY "profiles_select_store" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = profiles.store_id
    )
  );

-- Allow admins/staff to insert profiles in their store
CREATE POLICY "profiles_insert_store" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = profiles.store_id
      AND p.role IN ('admin', 'staff')
    )
  );

-- Allow admins/staff to update profiles in their store
CREATE POLICY "profiles_update_store" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = profiles.store_id
      AND p.role IN ('admin', 'staff')
    )
  );
