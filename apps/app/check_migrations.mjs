import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ghjuspyjqlmjlqvfstmz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoanVzcHlqcWxtamxxdmZzdG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDM0MTk4MCwiZXhwIjoyMDc5OTE3OTgwfQ.gNOjIXRCOGUfv02YPNQF69waqwGytcW9pb701WsIUMA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'supabase_migrations' }
});

// Try to read the migration history
const { data, error } = await supabase
  .from('schema_migrations')
  .select('*');

if (error) {
  console.log('Error:', error.message);
} else {
  console.log('Current migrations:', data);
}
