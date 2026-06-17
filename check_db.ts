import { supabase } from './src/lib/supabase';
async function run() {
  const { data } = await supabase.from('purchase_receipts').select('id, receipt_number, finance_status').order('created_at', {ascending: false}).limit(1);
  console.log('Latest receipt:', data);
}
run();
