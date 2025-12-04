-- =============================================
-- RLSポリシー最適化マイグレーション
-- SECURITY DEFINER関数を活用してパフォーマンス向上
-- =============================================

-- 1. ユーザーの全店舗IDを取得する関数（キャッシュ効果を期待）
CREATE OR REPLACE FUNCTION get_user_store_ids()
RETURNS UUID[] AS $$
DECLARE
  store_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(store_id) INTO store_ids
  FROM profiles
  WHERE user_id = auth.uid()
  AND store_id IS NOT NULL;

  RETURN COALESCE(store_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. ユーザーの全profile IDを取得する関数
CREATE OR REPLACE FUNCTION get_user_profile_ids()
RETURNS UUID[] AS $$
DECLARE
  profile_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO profile_ids
  FROM profiles
  WHERE user_id = auth.uid();

  RETURN COALESCE(profile_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. ユーザーが管理者またはスタッフとして所属する店舗IDを取得
CREATE OR REPLACE FUNCTION get_user_admin_store_ids()
RETURNS UUID[] AS $$
DECLARE
  store_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(store_id) INTO store_ids
  FROM profiles
  WHERE user_id = auth.uid()
  AND store_id IS NOT NULL
  AND role IN ('admin', 'staff');

  RETURN COALESCE(store_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. 既存関数にsearch_pathを設定（セキュリティ向上）
CREATE OR REPLACE FUNCTION is_store_member(lookup_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND store_id = lookup_store_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. time_cards のRLSポリシーを最適化
DROP POLICY IF EXISTS "time_cards_select" ON time_cards;
CREATE POLICY "time_cards_select" ON time_cards
  FOR SELECT USING (
    -- 自分のtime_cardか、同じ店舗の管理者/スタッフ
    user_id = ANY(get_user_profile_ids())
    OR EXISTS (
      SELECT 1 FROM profiles tc_owner
      WHERE tc_owner.id = time_cards.user_id
      AND tc_owner.store_id = ANY(get_user_admin_store_ids())
    )
  );

-- 6. menus のRLSポリシーを最適化
DROP POLICY IF EXISTS "menus_select" ON menus;
CREATE POLICY "menus_select" ON menus
  FOR SELECT USING (store_id = ANY(get_user_store_ids()));

DROP POLICY IF EXISTS "menus_insert" ON menus;
CREATE POLICY "menus_insert" ON menus
  FOR INSERT WITH CHECK (store_id = ANY(get_user_store_ids()));

DROP POLICY IF EXISTS "menus_update" ON menus;
CREATE POLICY "menus_update" ON menus
  FOR UPDATE USING (store_id = ANY(get_user_store_ids()));

DROP POLICY IF EXISTS "menus_delete" ON menus;
CREATE POLICY "menus_delete" ON menus
  FOR DELETE USING (store_id = ANY(get_user_store_ids()));

-- 7. comments のRLSポリシーを最適化
DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (store_id = ANY(get_user_store_ids()));

-- 8. bottle_keeps のRLSポリシーを最適化（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bottle_keeps' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "bottle_keeps_select" ON bottle_keeps;
    EXECUTE 'CREATE POLICY "bottle_keeps_select" ON bottle_keeps FOR SELECT USING (store_id = ANY(get_user_store_ids()))';

    DROP POLICY IF EXISTS "bottle_keeps_insert" ON bottle_keeps;
    EXECUTE 'CREATE POLICY "bottle_keeps_insert" ON bottle_keeps FOR INSERT WITH CHECK (store_id = ANY(get_user_store_ids()))';

    DROP POLICY IF EXISTS "bottle_keeps_update" ON bottle_keeps;
    EXECUTE 'CREATE POLICY "bottle_keeps_update" ON bottle_keeps FOR UPDATE USING (store_id = ANY(get_user_store_ids()))';

    DROP POLICY IF EXISTS "bottle_keeps_delete" ON bottle_keeps;
    EXECUTE 'CREATE POLICY "bottle_keeps_delete" ON bottle_keeps FOR DELETE USING (store_id = ANY(get_user_admin_store_ids()))';
  END IF;
END $$;
