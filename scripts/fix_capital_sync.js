import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// read .env
const envStr = fs.readFileSync(path.join(process.cwd(), '.env.production'), 'utf-8');
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
  // Find all investments that say they are synced
  const { data: investments, error: invErr } = await supabase
    .from('project_investments')
    .select('*')
    .eq('is_synced_to_cash', true);

  if (invErr) {
    console.error(invErr);
    return;
  }

  let resetCount = 0;
  for (const inv of investments) {
    // check if mutation exists
    const { data: muts, error: mutErr } = await supabase
      .from('cash_bank_mutations')
      .select('*')
      .eq('reference_id', inv.id)
      .eq('source_module', 'PROJECT_CAPITAL');
    
    if (muts && muts.length === 0) {
      console.log(`Resetting sync for investment ${inv.id}`);
      await supabase.from('project_investments').update({ is_synced_to_cash: false }).eq('id', inv.id);
      resetCount++;
    }
  }
  console.log(`Done. Reset ${resetCount} investments.`);
}
run();
