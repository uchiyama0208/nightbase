-- =============================================
-- データ型の改善マイグレーション
-- CHECK制約の追加とデータ整合性の強化
-- =============================================

-- 注: 金額はINTEGERのまま維持（日本円で小数点不要）
-- DECIMAL(10,2)への変更はアプリケーションコードへの影響が大きいため見送り

-- 1. menus テーブル
-- price は0以上
ALTER TABLE menus ADD CONSTRAINT check_menus_price_non_negative CHECK (price >= 0);

-- cast_back_amount は0以上
ALTER TABLE menus ADD CONSTRAINT check_menus_cast_back_non_negative CHECK (cast_back_amount >= 0);

-- 2. table_sessions テーブル
-- total_amount は0以上（すでにguest_countは追加済み）
ALTER TABLE table_sessions ADD CONSTRAINT check_total_amount_non_negative CHECK (total_amount >= 0);

-- 3. bill_settings テーブル（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bill_settings') THEN
    -- 各種料率/金額のCHECK制約
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'bill_settings' AND constraint_name = 'check_bill_settings_values'
    ) THEN
      ALTER TABLE bill_settings ADD CONSTRAINT check_bill_settings_values CHECK (
        (service_rate >= 0) AND
        (tax_rate >= 0 AND tax_rate <= 1) AND
        (hourly_charge >= 0) AND
        (extension_fee_30m >= 0) AND
        (extension_fee_60m >= 0) AND
        (shime_fee >= 0) AND
        (jounai_fee >= 0)
      );
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. profiles テーブル
-- height は正の整数または NULL
DO $$
BEGIN
  ALTER TABLE profiles ADD CONSTRAINT check_height_positive CHECK (height IS NULL OR height > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- desired_hourly_wage は正の整数または NULL
DO $$
BEGIN
  ALTER TABLE profiles ADD CONSTRAINT check_hourly_wage_positive CHECK (desired_hourly_wage IS NULL OR desired_hourly_wage > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. bottle_keeps テーブル
-- remaining_amount は 0-100
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bottle_keeps') THEN
    -- 既存の制約があるかチェック
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'bottle_keeps' AND constraint_name = 'check_remaining_amount_range'
    ) THEN
      ALTER TABLE bottle_keeps ADD CONSTRAINT check_remaining_amount_range
        CHECK (remaining_amount >= 0 AND remaining_amount <= 100);
    END IF;
  END IF;
END $$;

-- 6. cast_assignments テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cast_assignments') THEN
    -- grid_x, grid_y は正の整数または NULL
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'cast_assignments' AND constraint_name = 'check_grid_position'
    ) THEN
      ALTER TABLE cast_assignments ADD CONSTRAINT check_grid_position
        CHECK ((grid_x IS NULL OR grid_x >= 0) AND (grid_y IS NULL OR grid_y >= 0));
    END IF;
  END IF;
END $$;

-- 7. updated_at 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 主要テーブルにupdated_atトリガーを追加
DO $$
DECLARE
  tbl TEXT;
  tables_with_updated_at TEXT[] := ARRAY[
    'profiles', 'stores', 'menus', 'orders', 'comments',
    'time_cards', 'table_sessions', 'bottle_keeps', 'store_roles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_updated_at
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I', tbl, tbl);
      EXECUTE format('
        CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
    END IF;
  END LOOP;
END $$;
