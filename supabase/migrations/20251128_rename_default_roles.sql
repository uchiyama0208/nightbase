-- Rename existing system roles to デフォルトスタッフ and デフォルトキャスト
-- Also update デフォルトスタッフ to have all permissions

-- Update "スタッフ" to "デフォルトスタッフ" with all permissions
UPDATE public.store_roles
SET name = 'デフォルトスタッフ',
    permissions = '{"can_manage_roles": true, "can_manage_users": true, "can_manage_settings": true, "can_manage_attendance": true, "can_manage_menus": true, "can_manage_bottles": true, "can_view_reports": true}'::jsonb
WHERE name = 'スタッフ' AND is_system_role = true;

-- Update "キャスト" to "デフォルトキャスト" with target: "cast" so it appears in cast tab
UPDATE public.store_roles
SET name = 'デフォルトキャスト',
    permissions = '{"target": "cast"}'::jsonb
WHERE name = 'キャスト' AND is_system_role = true;
