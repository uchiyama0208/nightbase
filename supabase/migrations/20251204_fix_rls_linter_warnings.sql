-- =============================================
-- RLSリンター警告の修正
-- 1. auth.uid() → (select auth.uid()) に変更
-- 2. 重複ポリシーを統合
-- =============================================

-- 1. stores のポリシー修正
DROP POLICY IF EXISTS "stores_update_staff" ON stores;
CREATE POLICY "stores_update_staff" ON stores FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = (select auth.uid())
    AND p.store_id = stores.id
    AND p.role IN ('admin', 'staff')
  ));

DROP POLICY IF EXISTS "stores_delete_staff" ON stores;
CREATE POLICY "stores_delete_staff" ON stores FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = (select auth.uid())
    AND p.store_id = stores.id
    AND p.role IN ('admin', 'staff')
  ));

-- 2. time_cards のポリシー修正
DROP POLICY IF EXISTS "time_cards_insert" ON time_cards;
CREATE POLICY "time_cards_insert" ON time_cards FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = time_cards.user_id
    AND profiles.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "time_cards_update" ON time_cards;
CREATE POLICY "time_cards_update" ON time_cards FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = time_cards.user_id
    AND profiles.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "time_cards_delete" ON time_cards;
CREATE POLICY "time_cards_delete" ON time_cards FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = time_cards.user_id
    AND profiles.user_id = (select auth.uid())
  ));

-- 3. past_employments - 重複ポリシー削除
DROP POLICY IF EXISTS "past_employments_manage_own" ON past_employments;

-- 4. table_types - 重複ポリシー削除
DROP POLICY IF EXISTS "table_types_all" ON table_types;

-- 5. profiles - 統合
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_store" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR is_store_member(store_id)
  );

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_store" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR is_store_admin_or_staff(store_id)
  );

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_store" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR is_store_admin_or_staff(store_id)
  );

-- 6. store_roles - 統合
DROP POLICY IF EXISTS "store_roles_all_admin" ON store_roles;
DROP POLICY IF EXISTS "store_roles_select_members" ON store_roles;
DROP POLICY IF EXISTS "Store members can view roles" ON store_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON store_roles;

CREATE POLICY "store_roles_select" ON store_roles FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY "store_roles_insert" ON store_roles FOR INSERT
  WITH CHECK (is_store_admin_or_staff(store_id));

CREATE POLICY "store_roles_update" ON store_roles FOR UPDATE
  USING (is_store_admin_or_staff(store_id));

CREATE POLICY "store_roles_delete" ON store_roles FOR DELETE
  USING (is_store_admin_or_staff(store_id));
