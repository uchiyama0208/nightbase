-- Remove status column from bottle_keeps table
ALTER TABLE bottle_keeps DROP COLUMN IF EXISTS status;
