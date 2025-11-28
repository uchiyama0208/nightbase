-- Add status column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'profile_status'
    ) THEN
        CREATE TYPE profile_status AS ENUM (
            '通常',
            '未面接',
            '保留',
            '不合格',
            '体入',
            '休職中',
            '退店済み'
        );
    END IF;
END $$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status profile_status DEFAULT '通常';

COMMENT ON COLUMN profiles.status IS 'プロフィールの状態';
