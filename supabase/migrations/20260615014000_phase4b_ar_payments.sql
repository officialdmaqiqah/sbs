-- Migration for Phase 4B: Customer Payment (AR)

-- 1. Add journal_entry_id to customer_payments if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'customer_payments' AND column_name = 'journal_entry_id'
    ) THEN
        ALTER TABLE customer_payments ADD COLUMN journal_entry_id UUID REFERENCES journal_entries(id);
    END IF;
END $$;

-- 2. Create the RPC pay_customer_invoice
CREATE OR REPLACE FUNCTION pay_customer_invoice(
    p_organization_id UUID,
    p_customer_invoice_id UUID,
    p_cash_bank_account_id UUID,
    p_payment_number VARCHAR,
    p_payment_date DATE,
    p_amount NUMERIC,
    p_reference VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_transaction_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT auth.uid()
) RETURNS JSONB AS $$
DECLARE
    v_user_role VARCHAR;
    v_invoice_status VARCHAR;
    v_outstanding_amount NUMERIC;
    v_total_amount NUMERIC;
    v_paid_amount NUMERIC;
    v_customer_id UUID;
    v_project_id UUID;
    v_invoice_number VARCHAR;
    v_cash_bank_exists BOOLEAN;
    
    v_payment_id UUID;
    v_allocation_id UUID;
    v_journal_id UUID;
    
    v_ar_account_id UUID;
    v_cash_account_id UUID;
    
    v_new_status VARCHAR;
    v_transaction_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Validate role from user_roles
    SELECT r.code INTO v_user_role
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_created_by
      AND ur.organization_id = p_organization_id
      AND ur.active = true
      AND (ur.effective_end_date IS NULL OR ur.effective_end_date >= CURRENT_DATE);
    
    IF v_user_role IS NULL OR v_user_role NOT IN ('CEO_ADMIN', 'FINANCE', 'SALES') THEN
        RAISE EXCEPTION 'Anda tidak memiliki akses (dibutuhkan CEO_ADMIN, FINANCE, atau SALES)';
    END IF;

    -- 2. Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than 0.';
    END IF;

    -- 3. Validate Cash/Bank Account
    SELECT EXISTS (
        SELECT 1 FROM cash_bank_accounts 
        WHERE id = p_cash_bank_account_id AND organization_id = p_organization_id
    ) INTO v_cash_bank_exists;
    
    IF NOT v_cash_bank_exists THEN
        RAISE EXCEPTION 'Kas/Bank wajib dipilih atau tidak valid.';
    END IF;

    -- 4. Lock and Validate Customer Invoice
    SELECT status, total_amount, paid_amount, (total_amount - paid_amount), customer_id, project_id, invoice_number 
    INTO v_invoice_status, v_total_amount, v_paid_amount, v_outstanding_amount, v_customer_id, v_project_id, v_invoice_number
    FROM customer_invoices 
    WHERE id = p_customer_invoice_id AND organization_id = p_organization_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Faktur tidak valid untuk dibayar.';
    END IF;

    IF v_invoice_status NOT IN ('Posted', 'Partially Paid', 'Open') THEN
        RAISE EXCEPTION 'Status faktur tidak valid untuk pembayaran (Status: %)', v_invoice_status;
    END IF;

    IF p_amount > v_outstanding_amount THEN
        RAISE EXCEPTION 'Pembayaran melebihi sisa tagihan.';
    END IF;

    -- 5. Idempotency and transaction_id
    IF p_transaction_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM customer_payments WHERE transaction_id = p_transaction_id AND organization_id = p_organization_id) THEN
            RAISE EXCEPTION 'Pembayaran ini sudah pernah diproses.';
        END IF;
        v_transaction_id := p_transaction_id;
    ELSE
        v_transaction_id := gen_random_uuid();
    END IF;

    -- 6. Insert Payment Record
    INSERT INTO customer_payments (
        organization_id,
        customer_id,
        cash_bank_id,
        payment_number,
        payment_date,
        total_amount,
        allocated_amount,
        unallocated_amount,
        status,
        transaction_id,
        notes,
        created_by
    ) VALUES (
        p_organization_id,
        v_customer_id,
        p_cash_bank_account_id,
        p_payment_number,
        p_payment_date,
        p_amount,
        p_amount,
        0,
        'Posted',
        v_transaction_id,
        p_notes,
        p_created_by
    ) RETURNING id INTO v_payment_id;

    -- 7. Insert Payment Allocation
    INSERT INTO customer_payment_allocations (
        payment_id,
        invoice_id,
        amount
    ) VALUES (
        v_payment_id,
        p_customer_invoice_id,
        p_amount
    ) RETURNING id INTO v_allocation_id;

    -- 8. Update Invoice Status & Paid Amount
    v_new_status := CASE 
        WHEN v_paid_amount + p_amount >= v_total_amount THEN 'Paid'
        ELSE 'Partially Paid'
    END;

    UPDATE customer_invoices 
    SET 
        paid_amount = paid_amount + p_amount,
        status = v_new_status,
        updated_at = now()
    WHERE id = p_customer_invoice_id;

    -- 9. Setup Journal Entry
    -- Get AR Account (Piutang Usaha)
    SELECT id INTO v_ar_account_id 
    FROM chart_of_accounts 
    WHERE organization_id = p_organization_id 
      AND category = 'Account Receivable' 
    LIMIT 1;

    -- Get Cash/Bank Account (Kas/Bank)
    SELECT account_id INTO v_cash_account_id 
    FROM cash_bank_accounts 
    WHERE id = p_cash_bank_account_id;

    IF v_ar_account_id IS NULL OR v_cash_account_id IS NULL THEN
        RAISE EXCEPTION 'Akun jurnal (AR atau Kas) tidak ditemukan.';
    END IF;

    -- Note: Ensure accounting period is open
    IF NOT EXISTS (
        SELECT 1 FROM accounting_periods 
        WHERE organization_id = p_organization_id 
          AND p_payment_date >= start_date 
          AND p_payment_date <= end_date 
          AND status = 'Open'
    ) THEN
        RAISE EXCEPTION 'Periode akuntansi untuk tanggal % ditutup atau tidak ditemukan.', p_payment_date;
    END IF;

    -- Insert Journal Entry
    INSERT INTO journal_entries (
        organization_id,
        period_id,
        journal_number,
        entry_date,
        reference,
        description,
        total_debit,
        total_credit,
        status,
        created_by
    ) VALUES (
        p_organization_id,
        (SELECT id FROM accounting_periods WHERE organization_id = p_organization_id AND p_payment_date >= start_date AND p_payment_date <= end_date AND status = 'Open' LIMIT 1),
        'JE-' || p_payment_number,
        p_payment_date,
        p_payment_number,
        'Penerimaan Piutang: ' || v_invoice_number || COALESCE(' - ' || p_notes, ''),
        p_amount,
        p_amount,
        'Posted',
        p_created_by
    ) RETURNING id INTO v_journal_id;

    -- Update journal_entry_id in payment
    UPDATE customer_payments SET journal_entry_id = v_journal_id WHERE id = v_payment_id;

    -- Debit Cash/Bank
    INSERT INTO journal_lines (
        journal_entry_id, account_id, project_id, debit, credit
    ) VALUES (
        v_journal_id, v_cash_account_id, v_project_id, p_amount, 0
    );

    -- Credit Accounts Receivable
    INSERT INTO journal_lines (
        journal_entry_id, account_id, project_id, debit, credit
    ) VALUES (
        v_journal_id, v_ar_account_id, v_project_id, 0, p_amount
    );

    v_result := jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'journal_entry_id', v_journal_id,
        'status', v_new_status
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS Policies for Customer Invoices & Payments

-- customer_invoices
ALTER TABLE customer_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invoices in their organization" ON customer_invoices;
CREATE POLICY "Users can view invoices in their organization"
ON customer_invoices FOR SELECT
USING (organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert invoices in their organization" ON customer_invoices;
CREATE POLICY "Users can insert invoices in their organization"
ON customer_invoices FOR INSERT
WITH CHECK (organization_id IN (
    SELECT ur.organization_id 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
      AND r.code IN ('CEO_ADMIN', 'FINANCE', 'SALES')
      AND ur.active = true
));

DROP POLICY IF EXISTS "Users can update invoices in their organization" ON customer_invoices;
CREATE POLICY "Users can update invoices in their organization"
ON customer_invoices FOR UPDATE
USING (organization_id IN (
    SELECT ur.organization_id 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
      AND r.code IN ('CEO_ADMIN', 'FINANCE', 'SALES')
      AND ur.active = true
));

-- customer_payments
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view payments in their organization" ON customer_payments;
CREATE POLICY "Users can view payments in their organization"
ON customer_payments FOR SELECT
USING (organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert payments in their organization" ON customer_payments;
CREATE POLICY "Users can insert payments in their organization"
ON customer_payments FOR INSERT
WITH CHECK (organization_id IN (
    SELECT ur.organization_id 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
      AND r.code IN ('CEO_ADMIN', 'FINANCE')
      AND ur.active = true
));

DROP POLICY IF EXISTS "Users can update payments in their organization" ON customer_payments;
CREATE POLICY "Users can update payments in their organization"
ON customer_payments FOR UPDATE
USING (organization_id IN (
    SELECT ur.organization_id 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
      AND r.code IN ('CEO_ADMIN', 'FINANCE')
      AND ur.active = true
));

-- customer_payment_allocations
ALTER TABLE customer_payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view payment allocations in their organization" ON customer_payment_allocations;
CREATE POLICY "Users can view payment allocations in their organization"
ON customer_payment_allocations FOR SELECT
USING (
    payment_id IN (
        SELECT id FROM customer_payments WHERE organization_id IN (
            SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can insert payment allocations in their organization" ON customer_payment_allocations;
CREATE POLICY "Users can insert payment allocations in their organization"
ON customer_payment_allocations FOR INSERT
WITH CHECK (
    payment_id IN (
        SELECT id FROM customer_payments WHERE organization_id IN (
            SELECT ur.organization_id 
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
              AND r.code IN ('CEO_ADMIN', 'FINANCE')
              AND ur.active = true
        )
    )
);
