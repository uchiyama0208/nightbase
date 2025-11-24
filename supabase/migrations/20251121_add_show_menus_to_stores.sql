-- Add show_menus column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS show_menus BOOLEAN DEFAULT false;
