-- Create work_record_breaks table for multiple breaks per work record
CREATE TABLE IF NOT EXISTS work_record_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_record_id UUID NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
    break_start TIMESTAMPTZ NOT NULL,
    break_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_work_record_breaks_work_record_id ON work_record_breaks(work_record_id);

-- Enable RLS
ALTER TABLE work_record_breaks ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access breaks for their own work records
CREATE POLICY "Users can view own breaks" ON work_record_breaks
    FOR SELECT
    USING (
        work_record_id IN (
            SELECT id FROM work_records
            WHERE profile_id IN (
                SELECT p.id FROM profiles p
                JOIN users u ON u.current_profile_id = p.id
                WHERE u.id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert own breaks" ON work_record_breaks
    FOR INSERT
    WITH CHECK (
        work_record_id IN (
            SELECT id FROM work_records
            WHERE profile_id IN (
                SELECT p.id FROM profiles p
                JOIN users u ON u.current_profile_id = p.id
                WHERE u.id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update own breaks" ON work_record_breaks
    FOR UPDATE
    USING (
        work_record_id IN (
            SELECT id FROM work_records
            WHERE profile_id IN (
                SELECT p.id FROM profiles p
                JOIN users u ON u.current_profile_id = p.id
                WHERE u.id = auth.uid()
            )
        )
    );

-- Store managers can manage all breaks in their store
CREATE POLICY "Managers can view store breaks" ON work_record_breaks
    FOR SELECT
    USING (
        work_record_id IN (
            SELECT wr.id FROM work_records wr
            JOIN profiles p ON wr.store_id = p.store_id
            JOIN users u ON u.current_profile_id = p.id
            WHERE u.id = auth.uid() AND p.role IN ('owner', 'manager', 'staff')
        )
    );

CREATE POLICY "Managers can manage store breaks" ON work_record_breaks
    FOR ALL
    USING (
        work_record_id IN (
            SELECT wr.id FROM work_records wr
            JOIN profiles p ON wr.store_id = p.store_id
            JOIN users u ON u.current_profile_id = p.id
            WHERE u.id = auth.uid() AND p.role IN ('owner', 'manager')
        )
    );

-- Migrate existing break data from work_records to work_record_breaks
INSERT INTO work_record_breaks (work_record_id, break_start, break_end, created_at, updated_at)
SELECT id, break_start, break_end, created_at, updated_at
FROM work_records
WHERE break_start IS NOT NULL;

-- Note: We keep break_start and break_end columns in work_records for backward compatibility
-- They can be removed in a future migration after confirming the new system works
