-- Reservation custom answers table
CREATE TABLE IF NOT EXISTS reservation_custom_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES reservation_custom_fields(id) ON DELETE CASCADE,
    answer_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(reservation_id, field_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservation_custom_answers_reservation_id ON reservation_custom_answers(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_custom_answers_field_id ON reservation_custom_answers(field_id);

-- RLS policies
ALTER TABLE reservation_custom_answers ENABLE ROW LEVEL SECURITY;

-- Allow store members to manage custom answers
CREATE POLICY "Store members can view reservation custom answers"
    ON reservation_custom_answers FOR SELECT
    USING (
        reservation_id IN (
            SELECT r.id FROM reservations r
            JOIN profiles p ON r.store_id = p.store_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Store members can insert reservation custom answers"
    ON reservation_custom_answers FOR INSERT
    WITH CHECK (
        reservation_id IN (
            SELECT r.id FROM reservations r
            JOIN profiles p ON r.store_id = p.store_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Store members can update reservation custom answers"
    ON reservation_custom_answers FOR UPDATE
    USING (
        reservation_id IN (
            SELECT r.id FROM reservations r
            JOIN profiles p ON r.store_id = p.store_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Store members can delete reservation custom answers"
    ON reservation_custom_answers FOR DELETE
    USING (
        reservation_id IN (
            SELECT r.id FROM reservations r
            JOIN profiles p ON r.store_id = p.store_id
            WHERE p.id = auth.uid()
        )
    );
