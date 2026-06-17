import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://duwismgfvafkotjjdext.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1d2lzbWdmdmFma290ampkZXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDQ4MzYsImV4cCI6MjA5Njg4MDgzNn0.npyahEW7F8G6_6JGNX8c8PyAoYCsb2vYUPqt3KR8mag';

async function seed() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: 'ceo@sbs.com', password: 'password123' });
  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }
  const { data: roleData } = await supabase.from('user_roles').select('organization_id').eq('user_id', authData.user.id).single();
  const orgId = roleData?.organization_id;
  console.log('Org ID:', orgId);

  const pRes = await supabase.from('projects').upsert({ organization_id: orgId, name: 'E2E PO Project', code: 'PRJ-1', status: 'Aktif' }, { onConflict: 'organization_id,code' });
  const iRes = await supabase.from('items').upsert({ organization_id: orgId, name: 'E2E Item', code: 'ITM-1', uom: 'PCS', category: 'RAW_MATERIAL', active: true }, { onConflict: 'organization_id,code' });
  const lRes = await supabase.from('inventory_locations').upsert({ organization_id: orgId, name: 'E2E Gudang', code: 'LOC-1', type: 'WAREHOUSE', active: true }, { onConflict: 'organization_id,code' });

  console.log('Projects:', pRes.error || 'OK');
  console.log('Items:', iRes.error || 'OK');
  console.log('Locations:', lRes.error || 'OK');
}

seed();
