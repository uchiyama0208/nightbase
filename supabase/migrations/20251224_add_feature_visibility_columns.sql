-- Add missing feature visibility columns to store_settings

-- Shift
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_pickup boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_my_shifts boolean DEFAULT true;

-- User
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_resumes boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_invitations boolean DEFAULT true;

-- Floor
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_floor boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_orders boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_queue boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_reservations boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_seats boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_slips boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_bottles boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_shopping boolean DEFAULT true;

-- Store
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_sales boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_payroll boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_ranking boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_pricing_systems boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_salary_systems boolean DEFAULT true;

-- Community
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_board boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_sns boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_ai_create boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_services boolean DEFAULT true;
