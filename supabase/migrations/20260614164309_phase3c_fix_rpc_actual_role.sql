-- Fix pay_supplier_bill role validation
CREATE OR REPLACE FUNCTION pay_supplier_bill(
    p_organization_id UUID,
    p_supplier_bill_id UUID,
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
    v_bill_status VARCHAR;
    v_outstanding_amount NUMERIC;
    v_supplier_id UUID;
    v_project_id UUID;
    v_bill_number VARCHAR;
    v_cash_bank_exists BOOLEAN;
    
    v_payment_id UUID;
    v_allocation_id UUID;
    v_journal_id UUID;
    
    v_ap_account_id UUID;
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
    
    IF v_user_role IS NULL OR v_user_role NOT IN ('CEO_ADMIN', 'FINANCE') THEN
        RAISE EXCEPTION 'Anda tidak memiliki akses (dibutuhkan CEO_ADMIN atau FINANCE)';
    END IF;

    -- 2. Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than 0.';
    END IF;

    -- 2.5 Check Closed Period
    IF EXISTS (
        SELECT 1 FROM accounting_periods 
        WHERE organization_id = p_organization_id 
          AND status = 'Closed' 
          AND p_payment_date >= start_date 
          AND p_payment_date <= end_date
    ) THEN
        RAISE EXCEPTION 'Periode akuntansi sudah ditutup';
    END IF;

    -- 3. Validate Cash/Bank Account
    SELECT EXISTS (
        SELECT 1 FROM cash_bank_accounts 
        WHERE id = p_cash_bank_account_id AND organization_id = p_organization_id
    ) INTO v_cash_bank_exists;
    
    IF NOT v_cash_bank_exists THEN
        RAISE EXCEPTION 'Kas/Bank wajib dipilih atau tidak valid.';
    END IF;

    -- 4. Lock and Validate Supplier Bill
    SELECT status, outstanding_amount, supplier_id, project_id, bill_number 
    INTO v_bill_status, v_outstanding_amount, v_supplier_id, v_project_id, v_bill_number
    FROM supplier_bills 
    WHERE id = p_supplier_bill_id AND organization_id = p_organization_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tagihan tidak valid untuk dibayar.';
    END IF;

    IF v_bill_status NOT IN ('Posted', 'Partially Paid', 'Open') THEN
        RAISE EXCEPTION 'Status tagihan tidak valid untuk pembayaran (Status: %)', v_bill_status;
    END IF;

    IF p_amount > v_outstanding_amount THEN
        RAISE EXCEPTION 'Pembayaran melebihi sisa tagihan.';
    END IF;

    -- 5. Idempotency and transaction_id
    IF p_transaction_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM supplier_payments WHERE transaction_id = p_transaction_id AND organization_id = p_organization_id) THEN
            RAISE EXCEPTION 'Pembayaran ini sudah pernah diproses.';
        END IF;
        v_transaction_id := p_transaction_id;
    ELSE
        v_transaction_id := gen_random_uuid();
    END IF;

    -- 6. Duplicate payment number
    IF EXISTS (SELECT 1 FROM supplier_payments WHERE payment_number = p_payment_number AND organization_id = p_organization_id) THEN
        RAISE EXCEPTION 'Nomor pembayaran sudah digunakan.';
    END IF;

    -- 7. Get Chart of Accounts
    -- AP Account
    SELECT id INTO v_ap_account_id FROM chart_of_accounts 
    WHERE organization_id = p_organization_id AND category = 'Accounts Payable' AND active = true LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account Payable belum dikonfigurasi.';
    END IF;

    -- Cash/Bank Account maps directly to accounts if it is linked, otherwise we find by cash_bank_accounts
    SELECT account_id INTO v_cash_account_id FROM cash_bank_accounts 
    WHERE id = p_cash_bank_account_id AND organization_id = p_organization_id;

    IF v_cash_account_id IS NULL THEN
        RAISE EXCEPTION 'Akun Kas/Bank tidak memiliki mapping ke Chart of Accounts.';
    END IF;

    -- 8. Create Supplier Payment
    INSERT INTO supplier_payments (
        organization_id, supplier_id, cash_bank_id, payment_number, payment_date,
        total_amount, allocated_amount, unallocated_amount, status, transaction_id, notes, created_by
    ) VALUES (
        p_organization_id, v_supplier_id, p_cash_bank_account_id, p_payment_number, p_payment_date,
        p_amount, p_amount, 0, 'Posted', v_transaction_id, p_notes, p_created_by
    ) RETURNING id INTO v_payment_id;

    -- 9. Create Allocation
    INSERT INTO supplier_payment_allocations (
        payment_id, bill_id, amount
    ) VALUES (
        v_payment_id, p_supplier_bill_id, p_amount
    ) RETURNING id INTO v_allocation_id;

    -- 10. Update Bill Outstanding and Status
    IF v_outstanding_amount - p_amount <= 0 THEN
        v_new_status := 'Paid';
    ELSE
        v_new_status := 'Partially Paid';
    END IF;

    UPDATE supplier_bills 
    SET outstanding_amount = outstanding_amount - p_amount,
        paid_amount = COALESCE(paid_amount, 0) + p_amount,
        status = v_new_status
    WHERE id = p_supplier_bill_id;

    -- 11. Post Journal Entry
    INSERT INTO journal_entries (
        organization_id, journal_number, journal_date, description,
        status, created_by, source_type, source_id, event_type
    ) VALUES (
        p_organization_id, 'JRN-PAY-' || p_payment_number, p_payment_date, 
        'Supplier Payment: ' || p_payment_number || ' for Bill ' || v_bill_number,
        'Posted', p_created_by, 'Supplier Payment', v_payment_id, 'Supplier Payment Creation'
    ) RETURNING id INTO v_journal_id;

    UPDATE supplier_payments SET journal_entry_id = v_journal_id WHERE id = v_payment_id;

    -- Debit AP
    INSERT INTO journal_entry_lines (
        journal_id, account_id, debit, credit, description, project_id
    ) VALUES (
        v_journal_id, v_ap_account_id, p_amount, 0, 'Supplier Payment ' || p_payment_number, v_project_id
    );

    -- Credit Cash/Bank
    INSERT INTO journal_entry_lines (
        journal_id, account_id, debit, credit, description, project_id
    ) VALUES (
        v_journal_id, v_cash_account_id, 0, p_amount, 'Supplier Payment ' || p_payment_number, v_project_id
    );

    -- 12. Audit Log
    INSERT INTO audit_logs (organization_id, created_by, action, entity_type, entity_id, new_value)
    VALUES (p_organization_id, p_created_by, 'CREATE', 'SUPPLIER_PAYMENT', v_payment_id, 
            jsonb_build_object(
                'payment_number', p_payment_number, 
                'amount', p_amount, 
                'bill_id', p_supplier_bill_id,
                'new_bill_status', v_new_status
            ));

    -- Return
    v_result := jsonb_build_object(
        'supplier_payment_id', v_payment_id,
        'payment_number', p_payment_number,
        'supplier_bill_id', p_supplier_bill_id,
        'amount', p_amount,
        'bill_status', v_new_status,
        'outstanding_amount', v_outstanding_amount - p_amount,
        'journal_entry_id', v_journal_id,
        'transaction_id', v_transaction_id
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
