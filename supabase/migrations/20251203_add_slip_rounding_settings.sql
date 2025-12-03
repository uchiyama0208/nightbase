-- Add slip rounding settings to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS slip_rounding_enabled BOOLEAN DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS slip_rounding_method TEXT DEFAULT 'round'; -- 'round', 'ceil', 'floor'
ALTER TABLE stores ADD COLUMN IF NOT EXISTS slip_rounding_unit INTEGER DEFAULT 10; -- 10, 100, 1000, 10000

COMMENT ON COLUMN stores.slip_rounding_enabled IS 'Enable/disable amount rounding for slips';
COMMENT ON COLUMN stores.slip_rounding_method IS 'Rounding method: round (四捨五入), ceil (繰り上げ), floor (繰り下げ)';
COMMENT ON COLUMN stores.slip_rounding_unit IS 'Rounding unit: 10, 100, 1000, or 10000';

