import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// read .env
const envStr = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
const env = {};
envStr.split('\n').forEach(line => {
  if (line && line.includes('=')) {
    const [k, v] = line.split('=');
    env[k.trim()] = v.trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: muts, error: mutErr } = await supabase
    .from('cash_bank_mutations')
    .select('*');
    
  console.log("MUTATIONS:", muts);
}
run();
