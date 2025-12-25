-- Queue custom fields table (similar to reservation_custom_fields)
CREATE TABLE IF NOT EXISTS queue_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'checkbox')),
    label TEXT NOT NULL,
    options TEXT[] DEFAULT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Queue custom answers table (similar to reservation_custom_answers)
CREATE TABLE IF NOT EXISTS queue_custom_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_entry_id UUID NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES queue_custom_fields(id) ON DELETE CASCADE,
    answer_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(queue_entry_id, field_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_custom_fields_store_id ON queue_custom_fields(store_id);
CREATE INDEX IF NOT EXISTS idx_queue_custom_fields_sort_order ON queue_custom_fields(store_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_queue_custom_answers_queue_entry_id ON queue_custom_answers(queue_entry_id);
CREATE INDEX IF NOT EXISTS idx_queue_custom_answers_field_id ON queue_custom_answers(field_id);

-- RLS policies
ALTER TABLE queue_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_custom_answers ENABLE ROW LEVEL SECURITY;

-- Allow store members to manage custom fields
CREATE POLICY "Store members can view queue custom fields"
    ON queue_custom_fields FOR SELECT
    USING (
        store_id IN (
            SELECT store_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Store members can insert queue custom fields"
    ON queue_custom_fields FOR INSERT
    WITH CHECK (
        store_id IN (
            SELECT store_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Store members can update queue custom fields"
    ON queue_custom_fields FOR UPDATE
    USING (
        store_id IN (
            SELECT store_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Store members can delete queue custom fields"
    ON queue_custom_fields FOR DELETE
    USING (
        store_id IN (
            SELECT store_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Allow store members to manage custom answers
CREATE POLICY "Store members can view queue custom answers"
    ON queue_custom_answers FOR SELECT
    USING (
        queue_entry_id IN (
            SELECT qe.id FROM queue_entries qe
            JOIN profiles p ON qe.store_id = p.store_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Store members can insert queue custom answers"
    ON queue_custom_answers FOR INSERT
    WITH CHECK (
        queue_entry_id IN (
            SELECT qe.id FROM queue_entries qe
            JOIN profiles p ON qe.store_id = p.store_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Store members can update queue custom answers"
    ON queue_custom_answers FOR UPDATE
    USING (
        queue_entry_id IN (
            SELECT qe.id FROM queue_entries qe
            JOIN profiles p ON qe.store_id = p.store_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Store members can delete queue custom answers"
    ON queue_custom_answers FOR DELETE
    USING (
        queue_entry_id IN (
            SELECT qe.id FROM queue_entries qe
            JOIN profiles p ON qe.store_id = p.store_id
            WHERE p.id = auth.uid()
        )
    );
