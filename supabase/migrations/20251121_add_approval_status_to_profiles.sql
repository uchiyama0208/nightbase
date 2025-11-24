-- Add approval_status column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';

-- Add comment
COMMENT ON COLUMN profiles.approval_status IS 'Approval status for join requests: approved, pending, rejected';

-- Add check constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_approval_status_check 
    CHECK (approval_status IN ('approved', 'pending', 'rejected'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_store_approval ON profiles(store_id, approval_status);
