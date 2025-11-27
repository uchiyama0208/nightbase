-- Add new columns for split names and address/phone
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name_kana text,
ADD COLUMN IF NOT EXISTS first_name_kana text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS prefecture text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS building text,
ADD COLUMN IF NOT EXISTS phone_number text;

-- Comment on columns
COMMENT ON COLUMN public.profiles.last_name IS '姓';
COMMENT ON COLUMN public.profiles.first_name IS '名';
COMMENT ON COLUMN public.profiles.last_name_kana IS '姓（かな）';
COMMENT ON COLUMN public.profiles.first_name_kana IS '名（かな）';
COMMENT ON COLUMN public.profiles.zip_code IS '郵便番号';
COMMENT ON COLUMN public.profiles.prefecture IS '都道府県';
COMMENT ON COLUMN public.profiles.city IS '市区町村';
COMMENT ON COLUMN public.profiles.street IS '番地';
COMMENT ON COLUMN public.profiles.building IS '建物名';
COMMENT ON COLUMN public.profiles.phone_number IS '電話番号';
