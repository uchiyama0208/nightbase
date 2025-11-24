-- Add time rounding settings to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS time_rounding_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS time_rounding_method TEXT DEFAULT 'round', -- 'round' (四捨五入), 'floor' (繰り下げ), 'ceil' (繰り上げ)
ADD COLUMN IF NOT EXISTS time_rounding_minutes INTEGER DEFAULT 15; -- 5, 10, 15, 20, 30, 60

-- Add comments for clarity
COMMENT ON COLUMN stores.time_rounding_enabled IS '打刻時間の自動修正を有効にするか';
COMMENT ON COLUMN stores.time_rounding_method IS '修正方法: round (四捨五入), floor (繰り下げ), ceil (繰り上げ)';
COMMENT ON COLUMN stores.time_rounding_minutes IS '修正する時間の単位（分）: 5, 10, 15, 20, 30, 60';
