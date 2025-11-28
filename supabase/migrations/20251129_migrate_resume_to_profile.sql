-- Add resume fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_cast_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_hourly_wage INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_shift_days TEXT;

-- Add profile_id column to past_employments
ALTER TABLE past_employments ADD COLUMN IF NOT EXISTS profile_id UUID;

-- Migrate data from resumes to profiles
UPDATE profiles
SET 
    desired_cast_name = resumes.desired_cast_name,
    desired_hourly_wage = resumes.desired_hourly_wage,
    desired_shift_days = resumes.desired_shift_days
FROM resumes
WHERE profiles.id = resumes.profile_id;

-- Migrate past_employments.resume_id to profile_id
UPDATE past_employments
SET profile_id = resumes.profile_id
FROM resumes
WHERE past_employments.resume_id = resumes.id;

-- Drop old RLS policies that depend on resume_id
DROP POLICY IF EXISTS "Users can view their own past employments" ON past_employments;
DROP POLICY IF EXISTS "Staff can view all past employments in their store" ON past_employments;
DROP POLICY IF EXISTS "Users can manage their own past employments" ON past_employments;

-- Drop old foreign key constraint
ALTER TABLE past_employments DROP CONSTRAINT IF EXISTS past_employments_resume_id_fkey;

-- Drop resume_id column
ALTER TABLE past_employments DROP COLUMN IF EXISTS resume_id;

-- Make profile_id NOT NULL
ALTER TABLE past_employments ALTER COLUMN profile_id SET NOT NULL;

-- Add new foreign key constraint
ALTER TABLE past_employments ADD CONSTRAINT past_employments_profile_id_fkey 
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Drop resume-related tables (in correct order due to dependencies)
DROP TABLE IF EXISTS resume_answers CASCADE;
DROP TABLE IF EXISTS resume_questions CASCADE;
DROP TABLE IF EXISTS resumes CASCADE;

-- Create new RLS policies for past_employments
CREATE POLICY "Users can view their own past employments" ON past_employments
    FOR SELECT
    USING (
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view all past employments in their store" ON past_employments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles AS p1
            WHERE p1.user_id = auth.uid()
            AND p1.role IN ('staff', 'admin')
            AND p1.store_id = (SELECT store_id FROM profiles WHERE id = past_employments.profile_id)
        )
    );

CREATE POLICY "Users can manage their own past employments" ON past_employments
    FOR ALL
    USING (
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );
