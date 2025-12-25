-- Add id_verification_images column to resume_submissions table
ALTER TABLE resume_submissions
ADD COLUMN IF NOT EXISTS id_verification_images TEXT[] DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN resume_submissions.id_verification_images IS 'Array of storage paths for ID verification images';
