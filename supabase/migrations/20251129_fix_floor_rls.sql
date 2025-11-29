-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view tables in their store" ON tables;
DROP POLICY IF EXISTS "Users can manage tables in their store" ON tables;
DROP POLICY IF EXISTS "Users can view sessions in their store" ON table_sessions;
DROP POLICY IF EXISTS "Users can manage sessions in their store" ON table_sessions;
DROP POLICY IF EXISTS "Users can view assignments in their store" ON cast_assignments;
DROP POLICY IF EXISTS "Users can manage assignments in their store" ON cast_assignments;

-- Create permissive policies for authenticated users (for development/unblocking)
-- Tables
CREATE POLICY "Enable all for authenticated users" ON tables
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Table Sessions
CREATE POLICY "Enable all for authenticated users" ON table_sessions
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Cast Assignments
CREATE POLICY "Enable all for authenticated users" ON cast_assignments
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
