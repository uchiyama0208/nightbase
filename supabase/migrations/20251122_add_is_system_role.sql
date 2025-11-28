-- Add is_system_role column to store_roles table
ALTER TABLE public.store_roles
ADD COLUMN IF NOT EXISTS is_system_role boolean DEFAULT false;

-- Rename existing "管理者" roles to "デフォルトスタッフ" and mark as system roles with all permissions
UPDATE public.store_roles
SET name = 'デフォルトスタッフ', 
    is_system_role = true,
    permissions = '{"can_manage_roles": true, "can_manage_users": true, "can_manage_settings": true, "can_manage_attendance": true, "can_manage_menus": true, "can_manage_bottles": true, "can_view_reports": true}'::jsonb
WHERE name = '管理者';

-- Also update existing "スタッフ" roles to "デフォルトスタッフ" with all permissions
UPDATE public.store_roles
SET name = 'デフォルトスタッフ',
    is_system_role = true,
    permissions = '{"can_manage_roles": true, "can_manage_users": true, "can_manage_settings": true, "can_manage_attendance": true, "can_manage_menus": true, "can_manage_bottles": true, "can_view_reports": true}'::jsonb
WHERE name = 'スタッフ' AND is_system_role = true;

-- Update existing "キャスト" roles to "デフォルトキャスト"
UPDATE public.store_roles
SET name = 'デフォルトキャスト'
WHERE name = 'キャスト' AND is_system_role = true;
