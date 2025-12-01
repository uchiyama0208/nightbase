ALTER TABLE pricing_systems
ADD COLUMN nomination_set_duration_minutes INTEGER DEFAULT 60,
ADD COLUMN companion_set_duration_minutes INTEGER DEFAULT 60;
