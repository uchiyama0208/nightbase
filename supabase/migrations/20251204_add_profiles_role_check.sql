-- =============================================
-- profiles.role の CHECK 制約追加
-- システムロール（role）とカスタムロール（role_id）を両立
-- =============================================

-- role カラムの有効値を制限
-- admin, staff, cast, guest のみ許可
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('admin', 'staff', 'cast', 'guest')
);

-- コメントを追加して設計意図を明確化
COMMENT ON COLUMN profiles.role IS 'システムロール（基本権限）: admin, staff, cast, guest';
COMMENT ON COLUMN profiles.role_id IS 'カスタムロール（追加権限）: store_roles テーブルを参照';

-- table_sessions の guest_count に CHECK 制約追加（正の整数）
ALTER TABLE table_sessions ADD CONSTRAINT check_guest_count_positive CHECK (guest_count > 0);
