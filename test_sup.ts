import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://duwismgfvafkotjjdext.supabase.co', process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  await supabase.auth.signInWithPassword({ email: 'ceo@sbs.com', password: 'password123' });
  const { data, error } = await supabase.from('purchase_orders').select('*, items:purchase_order_items(*)').order('created_at', { ascending: false }).limit(1);
  console.log(JSON.stringify(data, null, 2));
}
run();
