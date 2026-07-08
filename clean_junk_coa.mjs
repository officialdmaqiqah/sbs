import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://duwismgfvafkotjjdext.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1d2lzbWdmdmFma290ampkZXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDQ4MzYsImV4cCI6MjA5Njg4MDgzNn0.npyahEW7F8G6_6JGNX8c8PyAoYCsb2vYUPqt3KR8mag';

async function cleanJunk() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // Login as CEO to bypass RLS
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
    email: 'ceo@sbs.com', 
    password: 'password123' 
  });
  
  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }
  
  const { data: all } = await supabase.from('chart_of_accounts').select('*');
  if(!all) {
    console.log("No accounts found at all.");
    return;
  }

  const toDelete = all.filter(c => c.account_code.startsWith('INV-') || c.account_code.length > 10);
  console.log(`Found ${toDelete.length} junk records.`);
  
  if (toDelete.length > 0) {
    const ids = toDelete.map(c => c.id);
    const { error } = await supabase.from('chart_of_accounts').delete().in('id', ids);
    if(error) console.error(error);
    else console.log('Successfully deleted ' + ids.length + ' junk records.');
  }
}

cleanJunk();
