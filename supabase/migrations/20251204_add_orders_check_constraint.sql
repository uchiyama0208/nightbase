-- =============================================
-- orders テーブルの CHECK 制約追加
-- menu_id または item_name のどちらか一方が必須
-- =============================================

-- 既存の不整合データを修正（menu_idもitem_nameもNULLの場合）
UPDATE orders
SET item_name = 'その他'
WHERE menu_id IS NULL AND item_name IS NULL;

-- CHECK制約を追加
-- menu_id と item_name は排他的（どちらか一方が必須）
ALTER TABLE orders ADD CONSTRAINT check_menu_or_item_name CHECK (
  (menu_id IS NOT NULL) OR (item_name IS NOT NULL AND item_name <> '')
);

-- quantity は正の整数である必要がある
ALTER TABLE orders ADD CONSTRAINT check_orders_quantity_positive CHECK (quantity > 0);

-- amount は0以上である必要がある
ALTER TABLE orders ADD CONSTRAINT check_orders_amount_non_negative CHECK (amount >= 0);
