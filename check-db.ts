import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStore() {
    const storeId = 'f76c0bfe-df7b-4577-a7ef-5f13a915941d';
    const { data, error } = await supabase
        .from('stores')
        .select('id, name, tablet_timecard_enabled')
        .eq('id', storeId)
        .single();

    if (error) {
        console.error('Error selecting store:', error);
    } else {
        console.log('Store data:', data);
    }
}

checkStore();
