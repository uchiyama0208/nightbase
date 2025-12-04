-- =============================================
-- UNRESTRICTED RLSポリシーの修正
-- 全ユーザーに許可されていたポリシーを店舗メンバーのみに制限
-- =============================================

-- 1. cast_assignments - 店舗メンバーのみ
DROP POLICY IF EXISTS "Enable all for authenticated users" ON cast_assignments;

CREATE POLICY "cast_assignments_select" ON cast_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM table_sessions ts
      WHERE ts.id = cast_assignments.table_session_id
      AND ts.store_id = ANY(get_user_store_ids())
    )
  );

CREATE POLICY "cast_assignments_insert" ON cast_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM table_sessions ts
      WHERE ts.id = cast_assignments.table_session_id
      AND ts.store_id = ANY(get_user_store_ids())
    )
  );

CREATE POLICY "cast_assignments_update" ON cast_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM table_sessions ts
      WHERE ts.id = cast_assignments.table_session_id
      AND ts.store_id = ANY(get_user_store_ids())
    )
  );

CREATE POLICY "cast_assignments_delete" ON cast_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM table_sessions ts
      WHERE ts.id = cast_assignments.table_session_id
      AND ts.store_id = ANY(get_user_store_ids())
    )
  );

-- 2. menu_categories - 店舗メンバーのみ
DROP POLICY IF EXISTS "Enable read access for all users" ON menu_categories;

CREATE POLICY "menu_categories_select" ON menu_categories
  FOR SELECT USING (store_id = ANY(get_user_store_ids()));

CREATE POLICY "menu_categories_insert" ON menu_categories
  FOR INSERT WITH CHECK (store_id = ANY(get_user_store_ids()));

CREATE POLICY "menu_categories_update" ON menu_categories
  FOR UPDATE USING (store_id = ANY(get_user_store_ids()));

CREATE POLICY "menu_categories_delete" ON menu_categories
  FOR DELETE USING (store_id = ANY(get_user_admin_store_ids()));

-- 3. pricing_systems - 店舗メンバーのみ
DROP POLICY IF EXISTS "Enable all for authenticated users" ON pricing_systems;

CREATE POLICY "pricing_systems_select" ON pricing_systems
  FOR SELECT USING (store_id = ANY(get_user_store_ids()));

CREATE POLICY "pricing_systems_insert" ON pricing_systems
  FOR INSERT WITH CHECK (store_id = ANY(get_user_admin_store_ids()));

CREATE POLICY "pricing_systems_update" ON pricing_systems
  FOR UPDATE USING (store_id = ANY(get_user_admin_store_ids()));

CREATE POLICY "pricing_systems_delete" ON pricing_systems
  FOR DELETE USING (store_id = ANY(get_user_admin_store_ids()));

-- 4. stores - SELECTは維持（招待リンク等で必要）、変更は店舗メンバーのみ
-- 注: "Stores are viewable by everyone" は招待機能で必要なので維持

-- 5. table_sessions - 店舗メンバーのみ
DROP POLICY IF EXISTS "Enable all for authenticated users" ON table_sessions;

CREATE POLICY "table_sessions_select" ON table_sessions
  FOR SELECT USING (store_id = ANY(get_user_store_ids()));

CREATE POLICY "table_sessions_insert" ON table_sessions
  FOR INSERT WITH CHECK (store_id = ANY(get_user_store_ids()));

CREATE POLICY "table_sessions_update" ON table_sessions
  FOR UPDATE USING (store_id = ANY(get_user_store_ids()));

CREATE POLICY "table_sessions_delete" ON table_sessions
  FOR DELETE USING (store_id = ANY(get_user_admin_store_ids()));

-- 6. tables - 店舗メンバーのみ
DROP POLICY IF EXISTS "Enable all for authenticated users" ON tables;

CREATE POLICY "tables_select" ON tables
  FOR SELECT USING (store_id = ANY(get_user_store_ids()));

CREATE POLICY "tables_insert" ON tables
  FOR INSERT WITH CHECK (store_id = ANY(get_user_store_ids()));

CREATE POLICY "tables_update" ON tables
  FOR UPDATE USING (store_id = ANY(get_user_store_ids()));

CREATE POLICY "tables_delete" ON tables
  FOR DELETE USING (store_id = ANY(get_user_admin_store_ids()));

-- 7. table_types - 店舗メンバーのみ（既存ポリシーを確認して追加）
DROP POLICY IF EXISTS "Enable all for authenticated users" ON table_types;

CREATE POLICY "table_types_select" ON table_types
  FOR SELECT USING (store_id = ANY(get_user_store_ids()));

CREATE POLICY "table_types_insert" ON table_types
  FOR INSERT WITH CHECK (store_id = ANY(get_user_admin_store_ids()));

CREATE POLICY "table_types_update" ON table_types
  FOR UPDATE USING (store_id = ANY(get_user_admin_store_ids()));

CREATE POLICY "table_types_delete" ON table_types
  FOR DELETE USING (store_id = ANY(get_user_admin_store_ids()));

-- 8. past_employments - プロフィール所有者または店舗管理者のみ
DROP POLICY IF EXISTS "past_employments_all" ON past_employments;

CREATE POLICY "past_employments_select" ON past_employments
  FOR SELECT USING (
    profile_id = ANY(get_user_profile_ids())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = past_employments.profile_id
      AND p.store_id = ANY(get_user_admin_store_ids())
    )
  );

CREATE POLICY "past_employments_insert" ON past_employments
  FOR INSERT WITH CHECK (profile_id = ANY(get_user_profile_ids()));

CREATE POLICY "past_employments_update" ON past_employments
  FOR UPDATE USING (profile_id = ANY(get_user_profile_ids()));

CREATE POLICY "past_employments_delete" ON past_employments
  FOR DELETE USING (profile_id = ANY(get_user_profile_ids()));
