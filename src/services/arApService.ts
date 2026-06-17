import { db, runMockTransaction } from './db';
import type { 
  CustomerInvoice, CustomerPayment, SupplierBill, CustomerDP,
  SupplierPayment, PaymentAllocation, CustomerRefund, SupplierRefund, Account, JournalEntryLine
} from '../types';
import { accountingService } from './accountingService';

export const arApService = {
  // --------------------------------------------------------------------------
  // CUSTOMER INVOICE
  // --------------------------------------------------------------------------
  getCustomerInvoices(): CustomerInvoice[] {
    return db.getAll<CustomerInvoice>('customer_invoices').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  createCustomerInvoice(data: Omit<CustomerInvoice, 'id' | 'invoice_number' | 'status' | 'paid_amount' | 'outstanding_amount' | 'dp_applied' | 'created_at' | 'created_by' | 'journal_entry_id'>, createdBy: string) {
    if (data.total_amount <= 0) throw new Error('Invoice amount must be positive');
    
    return runMockTransaction((txDb): any => {
      // Create invoice document ONLY. Revenue journal is already booked in Delivery.
      // This document acts as a sub-ledger anchor for the existing AR created by delivery.
      
      const invNumber = `INV-${new Date().getTime().toString().slice(-6)}`;
      
      const inv = txDb.insert('customer_invoices', {
        ...data,
        invoice_number: invNumber,
        status: 'Posted', // We assume it's directly valid since it's from DO
        paid_amount: 0,
        dp_applied: 0,
        outstanding_amount: data.total_amount,
        created_at: new Date().toISOString(),
        created_by: createdBy
      } as any) as CustomerInvoice;

      return inv;
    });
  },

  // --------------------------------------------------------------------------
  // SUPPLIER BILL
  // --------------------------------------------------------------------------
  getSupplierBills(): SupplierBill[] {
    return db.getAll<SupplierBill>('supplier_bills').sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  },

  createSupplierBill(data: Omit<SupplierBill, 'id' | 'bill_number' | 'status' | 'paid_amount' | 'outstanding_amount' | 'created_at' | 'created_by' | 'journal_entry_id'>, createdBy: string) {
    if (data.total_amount <= 0) throw new Error('Bill amount must be positive');
    
    return runMockTransaction((txDb): any => {
      // Create bill document ONLY. AP journal is already booked in Receipt.
      const billNumber = `BILL-${new Date().getTime().toString().slice(-6)}`;
      
      const bill = txDb.insert('supplier_bills', {
        ...data,
        bill_number: billNumber,
        status: 'Posted',
        paid_amount: 0,
        outstanding_amount: data.total_amount,
        created_at: new Date().toISOString(),
        created_by: createdBy
      } as any) as SupplierBill;

      return bill;
    });
  },

  // --------------------------------------------------------------------------
  // PAYMENTS & ALLOCATIONS
  // --------------------------------------------------------------------------
  getCustomerPayments(): CustomerPayment[] {
    return db.getAll<CustomerPayment>('customer_payments').sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  },

  receiveCustomerPayment(data: Omit<CustomerPayment, 'id' | 'payment_number' | 'status' | 'unapplied_amount' | 'journal_entry_id'>, allocations: { invoice_id: string, amount: number }[], postedBy: string) {
    if (data.amount <= 0) throw new Error('Payment amount must be positive');
    
    return runMockTransaction((txDb): any => {
      // 1. Validations
      const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
      if (totalAllocated > data.amount) throw new Error('Total allocation exceeds payment amount');

      const unapplied = data.amount - totalAllocated;

      const paymentNumber = `RCV-${new Date().getTime().toString().slice(-6)}`;
      const payment = txDb.insert('customer_payments', {
        ...data,
        payment_number: paymentNumber,
        status: 'Posted',
        unapplied_amount: unapplied
      } as any) as CustomerPayment;

      // 2. Process Allocations
      for (const alloc of allocations) {
        if (alloc.amount <= 0) continue;
        const inv = txDb.getById('customer_invoices', alloc.invoice_id) as CustomerInvoice;
        if (!inv || inv.status === 'Paid' || inv.status === 'Cancelled' || inv.status === 'Reversed') {
          throw new Error(`Invoice ${inv?.invoice_number} is not eligible for payment`);
        }
        if (alloc.amount > inv.outstanding_amount) {
          throw new Error(`Allocation to ${inv.invoice_number} exceeds outstanding amount`);
        }

        // Apply
        const newPaid = inv.paid_amount + alloc.amount;
        const newOut = inv.outstanding_amount - alloc.amount;
        const newStatus = newOut <= 0 ? 'Paid' : 'Partially Paid';

        txDb.update('customer_invoices', inv.id, { paid_amount: newPaid, outstanding_amount: newOut, status: newStatus });

        // Record allocation
        txDb.insert('payment_allocations', {
          payment_id: payment.id,
          invoice_id: inv.id,
          allocated_amount: alloc.amount,
          allocation_date: data.payment_date,
          created_at: new Date().toISOString()
        } as any);
      }

      // 3. Generate Journal
      // Debit: Kas/Bank
      // Credit: Piutang Usaha (Total Allocated)
      // Credit: Uang Muka / DP Customer (Unapplied)

      // Fetch accounts (assume mapped for AR)
      // // const mappings = txDb.getAll('accounting_mappings') as any[];
      // (This uses hardcoded account code lookup for simplicity in mock, ideally we'd use mapping service)
      const arAcc = txDb.query('accounts', (a: any) => a.account_code === '1102')[0] as Account; // Piutang Usaha
      const dpAcc = txDb.query('accounts', (a: any) => a.account_code === '2103')[0] as Account; // Uang Muka Customer
      const cbAcc = txDb.getById('cash_bank_accounts', data.cash_bank_account_id) as any;

      if (!arAcc || !dpAcc || !cbAcc) throw new Error('Accounting mappings/accounts for AR/DP/Bank not found');

      const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [];
      
      lines.push({ account_id: cbAcc.gl_account_id, debit: data.amount, credit: 0, description: `Customer payment ${paymentNumber}`, project_id: data.project_id });
      
      if (totalAllocated > 0) {
        lines.push({ account_id: arAcc.id, debit: 0, credit: totalAllocated, description: `Apply payment to invoices`, project_id: data.project_id });
      }
      if (unapplied > 0) {
        lines.push({ account_id: dpAcc.id, debit: 0, credit: unapplied, description: `Unapplied customer payment (DP)`, project_id: data.project_id });
      }

      const header = {
        journal_number: `JRN-${paymentNumber}`,
        journal_date: data.payment_date,
        project_id: data.project_id,
        source_type: 'Customer Payment',
        source_id: payment.id,
        description: `Customer payment ${paymentNumber}`,
        created_by: postedBy
      };

      const draft = accountingService.createDraftJournal(header, lines, txDb);
      if (!draft.success) throw new Error(draft.message);
      
      accountingService.postJournal(draft.journalId!, postedBy, txDb);
      txDb.update('customer_payments', payment.id, { journal_entry_id: draft.journalId! });

      return txDb.getById('customer_payments', payment.id) as CustomerPayment;
    });
  },

  getSupplierPayments(): SupplierPayment[] {
    return db.getAll<SupplierPayment>('supplier_payments').sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  },

  receiveSupplierPayment(data: Omit<SupplierPayment, 'id' | 'payment_number' | 'status' | 'unapplied_amount' | 'journal_entry_id'>, allocations: { supplier_bill_id: string, amount: number }[], postedBy: string) {
    if (data.amount <= 0) throw new Error('Payment amount must be positive');
    
    return runMockTransaction((txDb): any => {
      const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
      if (totalAllocated > data.amount) throw new Error('Total allocation exceeds payment amount');

      const unapplied = data.amount - totalAllocated;

      const paymentNumber = `PAY-${new Date().getTime().toString().slice(-6)}`;
      const payment = txDb.insert('supplier_payments', {
        ...data,
        payment_number: paymentNumber,
        status: 'Posted',
        unapplied_amount: unapplied
      } as any) as SupplierPayment;

      for (const alloc of allocations) {
        if (alloc.amount <= 0) continue;
        const bill = txDb.getById('supplier_bills', alloc.supplier_bill_id) as SupplierBill;
        if (!bill || bill.status === 'Paid' || bill.status === 'Cancelled' || bill.status === 'Reversed') {
          throw new Error(`Bill ${bill?.bill_number} is not eligible for payment`);
        }
        if (alloc.amount > bill.outstanding_amount) {
          throw new Error(`Allocation to ${bill.bill_number} exceeds outstanding amount`);
        }

        const newPaid = bill.paid_amount + alloc.amount;
        const newOut = bill.outstanding_amount - alloc.amount;
        const newStatus = newOut <= 0 ? 'Paid' : 'Partially Paid';

        txDb.update('supplier_bills', bill.id, { paid_amount: newPaid, outstanding_amount: newOut, status: newStatus });

        txDb.insert('payment_allocations', {
          payment_id: payment.id,
          supplier_bill_id: bill.id,
          allocated_amount: alloc.amount,
          allocation_date: data.payment_date,
          created_at: new Date().toISOString()
        } as any);
      }

      // Generate Journal
      const apAcc = txDb.query('accounts', (a: any) => a.account_code === '2101')[0] as Account; // Hutang Usaha
      const dpAcc = txDb.query('accounts', (a: any) => a.account_code === '1204')[0] as Account; // Uang Muka Supplier
      const cbAcc = txDb.getById('cash_bank_accounts', data.cash_bank_account_id) as any;

      if (!apAcc || !cbAcc) throw new Error('Accounting mappings/accounts for AP/Bank not found');
      if (unapplied > 0 && !dpAcc) throw new Error('Account for Supplier Advance not found');

      const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [];
      
      lines.push({ account_id: cbAcc.gl_account_id, debit: 0, credit: data.amount, description: `Supplier Payment ${paymentNumber}`, supplier_id: data.supplier_id, project_id: data.project_id });
      
      if (totalAllocated > 0) {
        lines.push({ account_id: apAcc.id, debit: totalAllocated, credit: 0, description: `Apply payment to bills`, supplier_id: data.supplier_id, project_id: data.project_id });
      }
      if (unapplied > 0) {
        lines.push({ account_id: dpAcc.id, debit: unapplied, credit: 0, description: `Unapplied supplier payment (Advance)`, supplier_id: data.supplier_id, project_id: data.project_id });
      }

      const header = {
        journal_number: `JRN-${paymentNumber}`,
        journal_date: data.payment_date,
        project_id: data.project_id,
        source_type: 'Supplier Payment',
        source_id: payment.id,
        description: 'Supplier payment', created_by: postedBy };

      const draft = accountingService.createDraftJournal(header, lines, txDb);
      if (!draft.success) throw new Error(draft.message);
      
      accountingService.postJournal(draft.journalId!, postedBy, txDb);
      txDb.update('supplier_payments', payment.id, { journal_entry_id: draft.journalId! });

      return txDb.getById('supplier_payments', payment.id) as SupplierPayment;
    });
  },

  // --------------------------------------------------------------------------
  // AGING REPORTS
  // --------------------------------------------------------------------------
  getARAging(date: string) {
    const invoices = this.getCustomerInvoices().filter(inv => 
      (inv.status === 'Posted' || inv.status === 'Partially Paid' || inv.status === 'Overdue') &&
      inv.outstanding_amount > 0 &&
      inv.invoice_date <= date
    );

    const refDate = new Date(date).getTime();
    
    return invoices.map(inv => {
      const due = new Date(inv.due_date).getTime();
      const diffDays = Math.floor((refDate - due) / (1000 * 60 * 60 * 24));
      
      let bucket = 'Current';
      if (diffDays > 90) bucket = '>90 Days';
      else if (diffDays > 60) bucket = '61-90 Days';
      else if (diffDays > 30) bucket = '31-60 Days';
      else if (diffDays > 0) bucket = '1-30 Days';

      return {
        ...inv,
        days_overdue: diffDays > 0 ? diffDays : 0,
        bucket
      };
    });
  },

  getAPAging(date: string) {
    const bills = this.getSupplierBills().filter(bill => 
      (bill.status === 'Posted' || bill.status === 'Partially Paid' || bill.status === 'Overdue') &&
      bill.outstanding_amount > 0 &&
      bill.bill_date <= date
    );

    const refDate = new Date(date).getTime();
    
    return bills.map(bill => {
      const due = new Date(bill.due_date).getTime();
      const diffDays = Math.floor((refDate - due) / (1000 * 60 * 60 * 24));
      
      let bucket = 'Current';
      if (diffDays > 90) bucket = '>90 Days';
      else if (diffDays > 60) bucket = '61-90 Days';
      else if (diffDays > 30) bucket = '31-60 Days';
      else if (diffDays > 0) bucket = '1-30 Days';

      return {
        ...bill,
        days_overdue: diffDays > 0 ? diffDays : 0,
        bucket
      };
    });
  },

  // --------------------------------------------------------------------------
  // DP & REFUNDS
  // --------------------------------------------------------------------------
  getCustomerDPs(): CustomerDP[] {
    return db.getAll<CustomerDP>('customer_dps').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  receiveCustomerDP(data: Omit<CustomerDP, 'id' | 'receipt_number' | 'status' | 'unapplied_amount' | 'journal_entry_id' | 'created_at'>, postedBy: string) {
    if (data.amount <= 0) throw new Error('DP amount must be positive');
    
    return runMockTransaction((txDb): any => {
      const receiptNumber = `DP-${new Date().getTime().toString().slice(-6)}`;
      const dp = txDb.insert('customer_dps', {
        ...data,
        receipt_number: receiptNumber,
        status: 'Posted',
        unapplied_amount: data.amount,
        created_at: new Date().toISOString()
      } as any) as CustomerDP;

      const dpAcc = txDb.query('accounts', (a: any) => a.account_code === '2103')[0] as Account;
      const cbAcc = txDb.getById('cash_bank_accounts', data.cash_bank_account_id) as any;

      if (!dpAcc || !cbAcc) throw new Error('Accounts for DP/Bank not found');

      const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [
        { account_id: cbAcc.gl_account_id, debit: data.amount, credit: 0, description: `Customer DP `, project_id: data.project_id },
        { account_id: dpAcc.id, debit: 0, credit: data.amount, description: `Customer DP received`, project_id: data.project_id }
      ];

      const header = {
        journal_number: `JRN-DP-${new Date().getTime().toString().slice(-6)}`,
        journal_date: dp.date,
        project_id: dp.project_id,
        source_type: 'Customer DP',
        source_id: dp.id,
        description: 'Customer DP', created_by: postedBy };

      const draft = accountingService.createDraftJournal(header, lines, txDb);
      if (!draft.success) throw new Error(draft.message);
      
      accountingService.postJournal(draft.journalId!, postedBy, txDb);
      txDb.update('customer_dps', dp.id, { journal_entry_id: draft.journalId! });

      return txDb.getById('customer_dps', dp.id) as any;
    });
  },

  applyCustomerDP(dpId: string, invoiceId: string, amount: number, postedBy: string) {
    if (amount <= 0) throw new Error('Applied amount must be positive');

    return runMockTransaction((txDb): any => {
      const dp = txDb.getById('customer_dps', dpId) as CustomerDP;
      if (!dp || (dp.status !== 'Posted' && dp.status !== 'Partially Applied')) throw new Error('Invalid DP state');
      if (dp.unapplied_amount < amount) throw new Error('Amount exceeds unapplied DP balance');

      const inv = txDb.getById('customer_invoices', invoiceId) as CustomerInvoice;
      if (!inv || (inv.status === 'Paid' || inv.status === 'Cancelled')) throw new Error('Invalid Invoice state');
      if (inv.outstanding_amount < amount) throw new Error('Amount exceeds outstanding invoice balance');

      // Update DP
      const newDpUnapplied = dp.unapplied_amount - amount;
      const newDpStatus = newDpUnapplied <= 0 ? 'Fully Applied' : 'Partially Applied';
      txDb.update('customer_dps', dp.id, { unapplied_amount: newDpUnapplied, status: newDpStatus });

      // Update Invoice
      const newInvPaid = inv.paid_amount + amount;
      const newInvDpApplied = (inv.dp_applied || 0) + amount;
      const newInvOut = inv.outstanding_amount - amount;
      const newInvStatus = newInvOut <= 0 ? 'Paid' : 'Partially Paid';
      txDb.update('customer_invoices', inv.id, { paid_amount: newInvPaid, outstanding_amount: newInvOut, dp_applied: newInvDpApplied, status: newInvStatus });

      // Journal: Debit: DP, Credit: AR
      const arAcc = txDb.query('accounts', (a: any) => a.account_code === '1102')[0] as Account;
      const dpAcc = txDb.query('accounts', (a: any) => a.account_code === '2103')[0] as Account;

      if (!arAcc || !dpAcc) throw new Error('Accounting mappings for AR/DP not found');

      const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [
        { account_id: dpAcc.id, debit: amount, credit: 0, description: `Apply DP  to ${inv.invoice_number}`, customer_id: dp.customer_id, project_id: dp.project_id },
        { account_id: arAcc.id, debit: 0, credit: amount, description: `Apply DP  to ${inv.invoice_number}`, customer_id: inv.customer_id, project_id: inv.project_id }
      ];

      const header = {
        journal_number: `JRN-APP-${new Date().getTime().toString().slice(-6)}`,
        journal_date: new Date().toISOString().split('T')[0],
        project_id: inv.project_id,
        source_type: 'Customer DP Application',
        source_id: dp.id + '-' + inv.id,
        description: 'Apply DP', created_by: postedBy };

      const draft = accountingService.createDraftJournal(header, lines, txDb);
      if (!draft.success) throw new Error(draft.message);
      
      accountingService.postJournal(draft.journalId!, postedBy, txDb);

      return true;
    });
  },

  getCustomerRefunds(): CustomerRefund[] {
    return db.getAll<CustomerRefund>('customer_refunds').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  issueCustomerRefund(data: Omit<CustomerRefund, 'id' | 'refund_number' | 'status' | 'journal_entry_id' | 'created_at'>, postedBy: string) {
    if (data.amount <= 0) throw new Error('Refund amount must be positive');

    return runMockTransaction((txDb): any => {
      const returnDoc = txDb.getById('return_deliveries', data.return_id) as any;
      if (!returnDoc) throw new Error('Return document not found');

      const refundNumber = `RFND-${new Date().getTime().toString().slice(-6)}`;
      const refund = txDb.insert('customer_refunds', {
        ...data,
        refund_number: refundNumber,
        status: 'Posted',
        created_at: new Date().toISOString()
      } as any) as CustomerRefund;

      const refundAcc = txDb.query('accounts', (a: any) => a.account_code === '2202')[0] as Account; // Hutang Refund Customer
      const cbAcc = txDb.getById('cash_bank_accounts', data.cash_bank_account_id) as any;

      if (!refundAcc || !cbAcc) throw new Error('Accounts for Refund/Bank not found');

      const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [
        { account_id: refundAcc.id, debit: data.amount, credit: 0, description: `Customer Refund ${refundNumber}`, project_id: data.project_id },
        { account_id: cbAcc.gl_account_id, debit: 0, credit: data.amount, description: `Customer Refund Paid`, project_id: data.project_id }
      ];

      const header = {
        journal_number: `JRN-${refundNumber}`,
        journal_date: data.date,
        project_id: data.project_id,
        source_type: 'Customer Refund',
        source_id: refund.id,
        description: 'Customer Refund', created_by: postedBy };

      const draft = accountingService.createDraftJournal(header, lines, txDb);
      if (!draft.success) throw new Error(draft.message);
      
      accountingService.postJournal(draft.journalId!, postedBy, txDb);
      txDb.update('customer_refunds', refund.id, { journal_entry_id: draft.journalId! });

      return txDb.getById('customer_refunds', refund.id) as any;
    });
  },

  getSupplierRefunds(): SupplierRefund[] {
    return db.getAll<SupplierRefund>('supplier_refunds').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  receiveSupplierRefund(data: Omit<SupplierRefund, 'id' | 'refund_number' | 'status' | 'journal_entry_id' | 'created_at'>, postedBy: string) {
    if (data.amount <= 0) throw new Error('Refund amount must be positive');

    return runMockTransaction((txDb): any => {
      const returnDoc = txDb.getById('return_deliveries', data.return_id) as any;
      if (!returnDoc) throw new Error('Return document not found');

      const refundNumber = `SRFND-${new Date().getTime().toString().slice(-6)}`;
      const refund = txDb.insert('supplier_refunds', {
        ...data,
        refund_number: refundNumber,
        status: 'Posted',
        created_at: new Date().toISOString()
      } as any) as SupplierRefund;

      const refundAcc = txDb.query('accounts', (a: any) => a.account_code === '1103')[0] as Account; // Piutang Refund Supplier
      const cbAcc = txDb.getById('cash_bank_accounts', data.cash_bank_account_id) as any;

      if (!refundAcc || !cbAcc) throw new Error('Accounts for Refund/Bank not found');

      const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [
        { account_id: cbAcc.gl_account_id, debit: data.amount, credit: 0, description: `Supplier Refund Received`, supplier_id: data.supplier_id, project_id: data.project_id },
        { account_id: refundAcc.id, debit: 0, credit: data.amount, description: `Supplier Refund ${refundNumber}`, supplier_id: data.supplier_id, project_id: data.project_id }
      ];

      const header = {
        journal_number: `JRN-${refundNumber}`,
        journal_date: data.date,
        project_id: data.project_id,
        source_type: 'Supplier Refund',
        source_id: refund.id,
        description: 'Supplier Refund', created_by: postedBy };

      const draft = accountingService.createDraftJournal(header, lines, txDb);
      if (!draft.success) throw new Error(draft.message);
      
      accountingService.postJournal(draft.journalId!, postedBy, txDb);
      txDb.update('supplier_refunds', refund.id, { journal_entry_id: draft.journalId! });

      return txDb.getById('supplier_refunds', refund.id) as any;
    });
  },

  reverseCustomerPayment(paymentId: string, reversedBy: string, reason: string) {
    return runMockTransaction((txDb): any => {
      const payment = txDb.getById('customer_payments', paymentId) as CustomerPayment;
      if (!payment || payment.status !== 'Posted') throw new Error('Payment cannot be reversed');

      const allocations = txDb.query('payment_allocations', (a: any) => a.payment_id === paymentId) as PaymentAllocation[];
      for (const alloc of allocations) {
        if (alloc.invoice_id) {
          const inv = txDb.getById('customer_invoices', alloc.invoice_id) as CustomerInvoice;
          if (inv) {
            const newPaid = inv.paid_amount - alloc.allocated_amount;
            const newOut = inv.outstanding_amount + alloc.allocated_amount;
            const newStatus = newPaid <= 0 ? 'Posted' : 'Partially Paid';
            txDb.update('customer_invoices', inv.id, { paid_amount: newPaid, outstanding_amount: newOut, status: newStatus });
          }
        }
      }

      if (payment.journal_entry_id) {
        accountingService.reverseJournal(payment.journal_entry_id, reversedBy, reason, txDb);
      }
      
      txDb.update('customer_payments', payment.id, { status: 'Reversed' });
      return true;
    });
  },

  reverseSupplierPayment(paymentId: string, reversedBy: string, reason: string) {
    return runMockTransaction((txDb): any => {
      const payment = txDb.getById('supplier_payments', paymentId) as SupplierPayment;
      if (!payment || payment.status !== 'Posted') throw new Error('Payment cannot be reversed');

      const allocations = txDb.query('payment_allocations', (a: any) => a.payment_id === paymentId) as PaymentAllocation[];
      for (const alloc of allocations) {
        if (alloc.supplier_bill_id) {
          const bill = txDb.getById('supplier_bills', alloc.supplier_bill_id) as SupplierBill;
          if (bill) {
            const newPaid = bill.paid_amount - alloc.allocated_amount;
            const newOut = bill.outstanding_amount + alloc.allocated_amount;
            const newStatus = newPaid <= 0 ? 'Posted' : 'Partially Paid';
            txDb.update('supplier_bills', bill.id, { paid_amount: newPaid, outstanding_amount: newOut, status: newStatus });
          }
        }
      }

      if (payment.journal_entry_id) {
        accountingService.reverseJournal(payment.journal_entry_id, reversedBy, reason, txDb);
      }
      
      txDb.update('supplier_payments', payment.id, { status: 'Reversed' });
      return true;
    });
  },

  reverseCustomerDP(dpId: string, reversedBy: string, reason: string) {
    return runMockTransaction((txDb): any => {
      const dp = txDb.getById('customer_dps', dpId) as CustomerDP;
      if (!dp || dp.status !== 'Posted') throw new Error('DP cannot be reversed');
      if (dp.unapplied_amount !== dp.amount) throw new Error('Cannot reverse DP that has been partially or fully applied');

      if (dp.journal_entry_id) {
        accountingService.reverseJournal(dp.journal_entry_id, reversedBy, reason, txDb);
      }
      txDb.update('customer_dps', dp.id, { status: 'Reversed' });
      return true;
    });
  },

  reverseCustomerRefund(refundId: string, reversedBy: string, reason: string) {
    return runMockTransaction((txDb): any => {
      const refund = txDb.getById('customer_refunds', refundId) as CustomerRefund;
      if (!refund || refund.status !== 'Posted') throw new Error('Refund cannot be reversed');

      if (refund.journal_entry_id) {
        accountingService.reverseJournal(refund.journal_entry_id, reversedBy, reason, txDb);
      }
      txDb.update('customer_refunds', refund.id, { status: 'Reversed' });
      return true;
    });
  },

  reverseSupplierRefund(refundId: string, reversedBy: string, reason: string) {
    return runMockTransaction((txDb): any => {
      const refund = txDb.getById('supplier_refunds', refundId) as SupplierRefund;
      if (!refund || refund.status !== 'Posted') throw new Error('Refund cannot be reversed');

      if (refund.journal_entry_id) {
        accountingService.reverseJournal(refund.journal_entry_id, reversedBy, reason, txDb);
      }
      txDb.update('supplier_refunds', refund.id, { status: 'Reversed' });
      return true;
    });
  }

};
