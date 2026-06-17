import { supabase } from './src/lib/supabase'; 
async function test() { 
  const res = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' }); 
  console.log(res); 
} 
test();
