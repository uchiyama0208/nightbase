-- =============================================
-- インデックス追加マイグレーション
-- RLSパフォーマンス向上と検索最適化のため
-- =============================================

-- 1. profiles テーブル
-- user_id 単体のインデックス（RLSポリシーで頻繁に使用）
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- store_id + role 複合インデックス（権限チェック用）
CREATE INDEX IF NOT EXISTS idx_profiles_store_role ON profiles(store_id, role);

-- 2. time_cards テーブル
-- user_id + work_date 複合インデックス（日付範囲クエリ用）
CREATE INDEX IF NOT EXISTS idx_time_cards_user_date ON time_cards(user_id, work_date DESC);

-- 3. table_sessions テーブル
-- store_id + status 複合インデックス（アクティブセッション検索用）
CREATE INDEX IF NOT EXISTS idx_table_sessions_store_status ON table_sessions(store_id, status);

-- store_id + created_at 複合インデックス（履歴検索用）
CREATE INDEX IF NOT EXISTS idx_table_sessions_store_created ON table_sessions(store_id, created_at DESC);

-- 4. orders テーブル
-- table_session_id + created_at 複合インデックス（時系列クエリ用）
CREATE INDEX IF NOT EXISTS idx_orders_session_created ON orders(table_session_id, created_at DESC);

-- 5. comments テーブル
-- store_id + created_at 複合インデックス（フィード用）
CREATE INDEX IF NOT EXISTS idx_comments_store_created ON comments(store_id, created_at DESC);

-- 6. store_roles テーブル（不足していたインデックス）
CREATE INDEX IF NOT EXISTS idx_store_roles_store_id ON store_roles(store_id);
