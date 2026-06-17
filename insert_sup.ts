import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://duwismgfvafkotjjdext.supabase.co', process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  await supabase.auth.signInWithPassword({ email: 'ceo@sbs.com', password: 'password123' });
  const { data, error } = await supabase.from('purchase_orders').insert({
    organization_id: '11111111-1111-1111-1111-111111111111',
    supplier_id: '22222222-2222-2222-2222-222222222222',
    project_id: '33333333-3333-3333-3333-333333333333',
    po_number: 'PO-TEST',
    date: '2026-06-13',
    status: 'Ordered'
  });
  console.log(error || 'Success');
}
run();
