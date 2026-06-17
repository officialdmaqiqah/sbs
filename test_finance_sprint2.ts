import { LocalStorage } from 'node-localstorage';
(global as any).localStorage = new LocalStorage('./scratch');

async function main() {
  localStorage.clear();
  
  const { cashBankService } = await import('./src/services/cashBankService');
  const { arApService } = await import('./src/services/arApService');
  const { db } = await import('./src/services/db');

  console.log('--- STARTING ACCOUNTING SPRINT 2 TESTS ---');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 0. Seed required GL accounts and mappings
    db.insert('accounts', { account_code: '1101', account_name: 'Kas', account_type: 'Asset', is_active: true, allow_posting: true, normal_balance: 'Debit' } as any);
    db.insert('accounts', { account_code: '1102', account_name: 'Piutang', account_type: 'Asset', is_active: true, allow_posting: true, normal_balance: 'Debit' } as any);
    db.insert('accounts', { account_code: '2101', account_name: 'Hutang', account_type: 'Liability', is_active: true, allow_posting: true, normal_balance: 'Credit' } as any);
    db.insert('accounts', { account_code: '2103', account_name: 'DP Customer', account_type: 'Liability', is_active: true, allow_posting: true, normal_balance: 'Credit' } as any);
    db.insert('accounts', { account_code: '1204', account_name: 'DP Supplier', account_type: 'Asset', is_active: true, allow_posting: true, normal_balance: 'Debit' } as any);
    db.insert('accounts', { account_code: '2202', account_name: 'Refund Cust', account_type: 'Liability', is_active: true, allow_posting: true, normal_balance: 'Credit' } as any);
    db.insert('accounts', { account_code: '1103', account_name: 'Refund Supp', account_type: 'Asset', is_active: true, allow_posting: true, normal_balance: 'Debit' } as any);
    db.insert('accounts', { account_code: '3100', account_name: 'Modal', account_type: 'Equity', is_active: true, allow_posting: false, normal_balance: 'Credit' } as any);
    db.insert('accounts', { account_code: '3199', account_name: 'Opening Balance Equity', account_type: 'Equity', is_active: true, allow_posting: true, normal_balance: 'Credit' } as any);
    
    // Seed mock mappings so accountingService doesn't fail on validations
    db.insert('accounting_mappings', { event_type: 'Sales Delivery', debit_account_id: '1102', credit_account_id: '4101' } as any);
    db.insert('accounting_mappings', { event_type: 'Purchase Receipt', debit_account_id: '1104', credit_account_id: '2101' } as any);
    db.insert('accounting_mappings', { event_type: 'Cash Receipt', debit_account_id: '1101', credit_account_id: '1102' } as any);
    db.insert('accounting_mappings', { event_type: 'Cash Payment', debit_account_id: '2101', credit_account_id: '1101' } as any);
    
    // Seed project
    db.insert('projects', { id: 'PROJ-1', name: 'Test Project', status: 'Active' } as any);

    // Seed return delivery
    db.insert('return_deliveries', { id: 'RET-1', return_number: 'RET-1', type: 'Customer Return' } as any);

    const kasAccount = db.query('accounts', (a: any) => a.account_code === '1101')[0] as any;

    // 1. Cash & Bank Master
    const cb = cashBankService.createCashBankAccount({
      account_code: 'CB-99',
      account_name: 'Test Bank',
      account_type: 'Bank',
      gl_account_id: kasAccount.id,
      currency: 'IDR',
      opening_balance: 0,
      opening_balance_date: '2024-01-01',
      active: true
    }, 'Tester');
    assert(cb.id !== undefined, 'Create CashBankAccount');

    // 2. Opening Balance
    cashBankService.postOpeningBalance(cb.id, 5000000, '2024-01-01', 'Tester');
    const cbUpdated = db.getById('cash_bank_accounts', cb.id) as any;
    assert(cbUpdated.opening_balance === 5000000, 'Post Opening Balance');

    // 3. Customer Invoice
    const inv = arApService.createCustomerInvoice({
      customer_id: 'CUST-1',
      project_id: 'PROJ-1',
      invoice_date: '2024-01-05',
      due_date: '2024-02-05',
      total_amount: 1000000,
      delivery_id: 'DO-1'
    }, 'Tester');
    assert(inv.outstanding_amount === 1000000, 'Create Customer Invoice');

    // 4. Customer DP
    const dp = arApService.receiveCustomerDP({
      customer_id: 'CUST-1',
      project_id: 'PROJ-1',
      date: '2024-01-02',
      cash_bank_account_id: cb.id,
      amount: 500000
    }, 'Tester');
    assert(dp.unapplied_amount === 500000, 'Receive Customer DP');

    // 5. Apply DP
    arApService.applyCustomerDP(dp.id, inv.id, 200000, 'Tester');
    const invAfterDp = db.getById('customer_invoices', inv.id) as any;
    const dpAfter = db.getById('customer_dps', dp.id) as any;
    assert(invAfterDp.outstanding_amount === 800000, 'Invoice outstanding reduced by DP');
    assert(dpAfter.unapplied_amount === 300000, 'DP unapplied reduced');

    // 6. Receive Customer Payment
    const pmt = arApService.receiveCustomerPayment({
      customer_id: 'CUST-1',
      project_id: 'PROJ-1',
      payment_date: '2024-01-10',
      cash_bank_account_id: cb.id,
      amount: 1000000,
      customer_name: 'CUST-1'
    }, [{ invoice_id: inv.id, amount: 800000 }], 'Tester');
    
    const invAfterPmt = db.getById('customer_invoices', inv.id) as any;
    assert(invAfterPmt.outstanding_amount === 0 && invAfterPmt.status === 'Paid', 'Invoice fully paid by payment');
    assert(pmt.unapplied_amount === 200000, 'Excess payment becomes unapplied');

    // 7. Supplier Bill
    const bill = arApService.createSupplierBill({
      supplier_id: 'SUPP-1',
      project_id: 'PROJ-1',
      bill_date: '2024-01-05',
      due_date: '2024-02-05',
      total_amount: 2000000,
      receipt_id: 'GR-1'
    }, 'Tester');
    assert(bill.outstanding_amount === 2000000, 'Create Supplier Bill');

    // 8. Supplier Payment
    const spmt = arApService.receiveSupplierPayment({
      supplier_id: 'SUPP-1',
      project_id: 'PROJ-1',
      payment_date: '2024-01-15',
      cash_bank_account_id: cb.id,
      amount: 1000000
    }, [{ supplier_bill_id: bill.id, amount: 1000000 }], 'Tester');
    
    const billAfter = db.getById('supplier_bills', bill.id) as any;
    assert(billAfter.outstanding_amount === 1000000 && billAfter.status === 'Partially Paid', 'Bill partially paid');

    // 9. Aging
    const arAging = arApService.getARAging('2024-03-01');
    const apAging = arApService.getAPAging('2024-03-01');
    assert(Array.isArray(arAging), 'AR Aging returns array');
    assert(Array.isArray(apAging) && apAging.find((b:any) => b.id === bill.id)?.bucket === '1-30 Days', 'AP Aging buckets correctly');

    const retDoc = db.insert('return_deliveries', { return_number: 'RET-1', type: 'Customer Return' } as any);
    const retDocSupp = db.insert('return_deliveries', { return_number: 'RET-2', type: 'Supplier Return' } as any);

    // 10. Refunds
    const cRef = arApService.issueCustomerRefund({
      customer_id: 'CUST-1',
      project_id: 'PROJ-1',
      date: '2024-01-20',
      return_id: retDoc.id,
      cash_bank_account_id: cb.id,
      amount: 100000,
      reason: 'Defect'
    }, 'Tester');
    assert(cRef.id !== undefined, 'Issue Customer Refund');

    const sRef = arApService.receiveSupplierRefund({
      supplier_id: 'SUPP-1',
      project_id: 'PROJ-1',
      date: '2024-01-20',
      return_id: retDocSupp.id,
      cash_bank_account_id: cb.id,
      amount: 100000,
      reason: 'Defect'
    }, 'Tester');
    assert(sRef.id !== undefined, 'Receive Supplier Refund');

    // 11. Cash Transaction Transfer
    const cb2 = cashBankService.createCashBankAccount({
      account_code: 'CB-100',
      account_name: 'Test Kas',
      account_type: 'Cash',
      gl_account_id: kasAccount.id,
      currency: 'IDR',
      opening_balance: 0,
      opening_balance_date: '2024-01-01',
      active: true
    }, 'Tester');

    const tf = cashBankService.createCashTransaction({
      transaction_type: 'Transfer',
      transaction_date: '2024-01-25',
      cash_bank_account_id: cb.id,
      destination_bank_account_id: cb2.id,
      amount: 500000,
      description: 'Test Transfer'
    }, 'Tester');

    cashBankService.postCashTransaction(tf.id, 'Tester');
    const tfAfter = db.getById('cash_transactions', tf.id) as any;
    assert(tfAfter.status === 'Posted', 'Post Cash Transfer');

  } catch (e: any) {
    console.error('TEST ERROR:', e.message);
  }

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
