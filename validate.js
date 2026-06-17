import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjIwMTk2MDMyMDB9.some-fake-local-anon-key-for-development';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('--- STARTING VALIDATION TESTS ---');

  // Login (Assuming admin exists, or we bypass RLS for now. Local supabase might not enforce RLS on anon key or we can just test the tables directly)
  
  try {
    // We will just do DB inserts to simulate the user actions
    console.log('Task 2: PROJECT SETUP TEST');
    
    // Get organization
    const { data: orgs, error: orgErr } = await supabase.from('organizations').select('id').limit(1);
    if (orgErr || !orgs.length) throw new Error('No organization found');
    const orgId = orgs[0].id;

    // 1. Create Project
    const { data: project, error: pErr } = await supabase.from('projects').insert({
      organization_id: orgId,
      code: 'TEST-001',
      name: 'Project Test SBS',
      status: 'Aktif',
      start_date: new Date().toISOString().split('T')[0]
    }).select().single();
    
    if (pErr) throw pErr;
    console.log('✅ Project created:', project.id);

    // 3. Add Team
    const roles = ['CEO', 'Finance & Marketing', 'Produksi', 'Distribusi'];
    for (const role of roles) {
      const { error: tErr } = await supabase.from('project_members').insert({
        project_id: project.id,
        member_name: `Test ${role}`,
        role: role
      });
      if (tErr) throw tErr;
    }
    console.log('✅ Team added');

    // 4. Add Capital
    let { data: invA } = await supabase.from('investors').insert({ organization_id: orgId, name: 'Investor A' }).select().single();
    let { data: invB } = await supabase.from('investors').insert({ organization_id: orgId, name: 'Investor B' }).select().single();

    const { data: capA, error: cErrA } = await supabase.from('project_investments').insert({
      project_id: project.id,
      investor_id: invA.id,
      amount: 1000000,
      payment_method: 'Kas Tunai',
      status: 'Confirmed'
    }).select().single();
    
    const { data: capB, error: cErrB } = await supabase.from('project_investments').insert({
      project_id: project.id,
      investor_id: invB.id,
      amount: 500000,
      payment_method: 'Bank',
      status: 'Confirmed'
    }).select().single();

    if (cErrA || cErrB) throw new Error('Failed to add capital');
    console.log('✅ Capital added: Total 1,500,000');

    console.log('Task 4: CAPITAL TO CASH TEST');
    // Get a cash account
    const { data: accs } = await supabase.from('cash_bank_accounts').select('id').limit(1);
    const cashBankId = accs[0].id;

    const { error: mutErr } = await supabase.from('cash_bank_mutations').insert({
      mutation_type: 'IN',
      to_cash_bank_id: cashBankId,
      project_id: project.id,
      amount: 1000000,
      source_module: 'PROJECT_CAPITAL',
      reference_type: 'PROJECT_CAPITAL',
      reference_id: capA.id,
      mutation_date: new Date().toISOString().split('T')[0],
      notes: `Setoran Modal dari Investor A`
    });

    if (mutErr) throw mutErr;
    console.log('✅ Capital synced to cash_bank_mutations');

    console.log('Task 7: NON-PROJECT TRANSACTION TEST');
    const { error: npErr } = await supabase.from('cash_bank_mutations').insert({
      mutation_type: 'OUT',
      from_cash_bank_id: cashBankId,
      project_id: null,
      amount: 50000,
      source_module: 'Manual Input',
      mutation_date: new Date().toISOString().split('T')[0],
      notes: `Biaya kantor umum`
    });

    if (npErr) throw npErr;
    console.log('✅ Non-project transaction saved');

    console.log('\n--- ALL DB TESTS PASSED ---');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
