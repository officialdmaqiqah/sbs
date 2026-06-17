const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = envStr.split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testDB() {
  console.log('Testing cash_bank_mutations...');
  const { data, error } = await supabase.from('cash_bank_mutations').select('*').limit(1);
  if (error) {
    console.error('Error fetching cash_bank_mutations:', error.message);
  } else {
    console.log('cash_bank_mutations is accessible. Columns:', data.length > 0 ? Object.keys(data[0]) : 'Empty table, but accessible');
  }

  console.log('Testing cash_bank_accounts...');
  const { data: accounts, error: accError } = await supabase.from('cash_bank_accounts').select('*').limit(1);
  if (accError) {
    console.error('Error fetching cash_bank_accounts:', accError.message);
  } else {
    console.log('cash_bank_accounts is accessible.');
  }
}

testDB();
