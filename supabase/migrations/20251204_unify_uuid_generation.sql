-- =============================================
-- UUID生成関数の統一マイグレーション
-- uuid_generate_v4() → gen_random_uuid() に統一
-- gen_random_uuid() は PostgreSQL 13+ で標準で使用可能
-- =============================================

-- 1. stores テーブル
ALTER TABLE stores ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. table_types テーブル
ALTER TABLE table_types ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. time_cards テーブル
ALTER TABLE time_cards ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 注: 既存データには影響なし。新規レコードのみが影響を受ける。

-- コメント追加
COMMENT ON COLUMN stores.id IS 'UUID（gen_random_uuid()で自動生成）';
COMMENT ON COLUMN table_types.id IS 'UUID（gen_random_uuid()で自動生成）';
COMMENT ON COLUMN time_cards.id IS 'UUID（gen_random_uuid()で自動生成）';
