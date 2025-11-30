-- Add detailed address fields to stores table and keep latitude/longitude for location-based features
-- The address fields will be the primary user-facing fields
-- Latitude/longitude will be automatically populated via geocoding

-- Add new address fields
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS address_line1 text,
ADD COLUMN IF NOT EXISTS address_line2 text,
ADD COLUMN IF NOT EXISTS postal_code text;

-- Add comments for documentation
COMMENT ON COLUMN public.stores.prefecture IS '都道府県';
COMMENT ON COLUMN public.stores.city IS '市区町村';
COMMENT ON COLUMN public.stores.address_line1 IS '丁目・番地';
COMMENT ON COLUMN public.stores.address_line2 IS '建物名・部屋番号';
COMMENT ON COLUMN public.stores.postal_code IS '郵便番号';
COMMENT ON COLUMN public.stores.latitude IS '緯度（住所から自動取得、または手動設定）';
COMMENT ON COLUMN public.stores.longitude IS '経度（住所から自動取得、または手動設定）';
