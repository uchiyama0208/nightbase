-- Fix stores update policy to allow staff role to update stores
-- This is needed for slip settings and other store settings that staff should be able to update

DROP POLICY IF EXISTS "stores_update_admin" ON stores;

CREATE POLICY "stores_update_admin_staff" ON stores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (select auth.uid())
      AND p.store_id = stores.id
      AND p.role IN ('admin', 'staff')
    )
  );

