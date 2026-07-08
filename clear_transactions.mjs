import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://duwismgfvafkotjjdext.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1d2lzbWdmdmFma290ampkZXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDQ4MzYsImV4cCI6MjA5Njg4MDgzNn0.npyahEW7F8G6_6JGNX8c8PyAoYCsb2vYUPqt3KR8mag';

async function clearTransactions() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // Login as CEO
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
    email: 'ceo@sbs.com', 
    password: 'password123' 
  });
  
  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }
  
  console.log('Logged in successfully. Beginning data cleanup...');

  // Tables to clear (order matters due to foreign keys)
  const tables = [
    'accounting_journal_lines',
    'accounting_journals',
    'cash_mutations',
    'stock_opname_items',
    'stock_opnames',
    'delivery_order_items',
    'delivery_orders',
    'sales_order_items',
    'sales_orders',
    'purchase_receipt_items',
    'purchase_receipts',
    'purchase_order_items',
    'purchase_orders',
    'inventory_transactions',
    'daily_records',
    'project_investors',
    'projects'
  ];

  for (const table of tables) {
    try {
      // In Supabase REST API, deleting without a filter is not allowed, so we filter by id not being null
      const { data, error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.error(`Error clearing ${table}:`, error.message);
      } else {
        console.log(`Cleared ${table} successfully`);
      }
    } catch (e) {
      console.error(`Exception clearing ${table}:`, e.message);
    }
  }
  
  console.log('Data cleanup finished.');
}

clearTransactions();
