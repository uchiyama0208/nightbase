-- Add is_system_role column to store_roles table
ALTER TABLE public.store_roles
ADD COLUMN IF NOT EXISTS is_system_role boolean DEFAULT false;

-- Rename existing "管理者" roles to "スタッフ" and mark as system roles
UPDATE public.store_roles
SET name = 'スタッフ', is_system_role = true
WHERE name = '管理者';
