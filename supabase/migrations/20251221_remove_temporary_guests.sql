-- 仮ゲスト（is_temporary）を廃止し、session_guestsにゲスト名を直接保存する仕組みに変更
-- guest_idがNULLの場合はguest_nameでゲスト名を表示する

-- 1. session_guestsにguest_nameカラムを追加
ALTER TABLE session_guests ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- 2. session_guestsのguest_idをNULL許可に変更
ALTER TABLE session_guests ALTER COLUMN guest_id DROP NOT NULL;

-- 3. ordersにsession_guest_idカラムを追加（名前だけのゲストのセット料金追跡用）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_guest_id UUID REFERENCES session_guests(id) ON DELETE SET NULL;

-- 4. 既存の一時ゲストのdisplay_nameをguest_nameにコピー
UPDATE session_guests sg
SET guest_name = p.display_name
FROM profiles p
WHERE sg.guest_id = p.id
AND p.is_temporary = true;

-- 5. 既存のordersにsession_guest_idを設定（一時ゲスト分）
UPDATE orders o
SET session_guest_id = sg.id
FROM session_guests sg
JOIN profiles p ON sg.guest_id = p.id
WHERE o.guest_id = p.id
AND o.table_session_id = sg.table_session_id
AND p.is_temporary = true;

-- 6. session_guestsから一時ゲストへの参照をNULLに（guest_nameにコピー済み）
UPDATE session_guests sg
SET guest_id = NULL
FROM profiles p
WHERE sg.guest_id = p.id
AND p.is_temporary = true;

-- 7. ordersから一時ゲストへの参照をNULLに（session_guest_idで追跡）
UPDATE orders o
SET guest_id = NULL
FROM profiles p
WHERE o.guest_id = p.id
AND p.is_temporary = true;

-- 8. 既存の一時ゲスト（is_temporary = true）を削除
DELETE FROM profiles WHERE is_temporary = true;

-- 9. is_temporaryカラムを削除（もう不要）
ALTER TABLE profiles DROP COLUMN IF EXISTS is_temporary;

-- 10. guest_idまたはguest_nameのどちらかが必須であることを保証するチェック制約を追加
ALTER TABLE session_guests ADD CONSTRAINT session_guests_guest_check
CHECK (guest_id IS NOT NULL OR guest_name IS NOT NULL);
