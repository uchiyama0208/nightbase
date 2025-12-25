-- Add 'cancelled' to queue_entries status constraint
ALTER TABLE queue_entries DROP CONSTRAINT IF EXISTS queue_entries_status_check;
ALTER TABLE queue_entries ADD CONSTRAINT queue_entries_status_check
    CHECK (status IN ('waiting', 'visited', 'notified', 'cancelled'));
