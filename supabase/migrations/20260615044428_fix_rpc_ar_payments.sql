-- Fix the pay_customer_invoice RPC to use category instead of account_type
CREATE OR REPLACE FUNCTION pay_customer_invoice(
    p_organization_id UUID,
    p_transaction_id UUID, -- For non-invoice specific receipts
    p_customer_invoice_id UUID, -- For invoice specific receipts
    p_cash_bank_account_id UUID,
    p_payment_number VARCHAR,
    p_payment_date DATE,
    p_amount NUMERIC,
    p_reference VARCHAR,
    p_notes TEXT,
    p_created_by UUID
) RETURNS JSONB AS $$
DECLARE
    v_customer_id UUID;
    v_payment_id UUID;
    v_journal_id UUID;
    v_ar_account_id UUID;
    v_cash_bank_coa_id UUID;
    v_current_period_id UUID;
    v_transaction_id UUID;
    v_user_role VARCHAR;
BEGIN
    -- 1. Security Check
    SELECT current_setting('request.jwt.claims', true)::jsonb->>'role' INTO v_user_role;
    IF v_user_role IS NULL OR v_user_role != 'authenticated' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized. Must be authenticated.');
    END IF;

    -- 2. Validate input
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payment amount must be greater than zero.');
    END IF;

    IF p_customer_invoice_id IS NULL AND p_transaction_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Either Invoice ID or Transaction ID must be provided.');
    END IF;

    -- 3. Check Accounting Period
    SELECT id INTO v_current_period_id
    FROM accounting_periods
    WHERE organization_id = p_organization_id
      AND p_payment_date >= start_date 
      AND p_payment_date <= end_date
      AND status = 'Open'
    LIMIT 1;

    IF v_current_period_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Accounting period is closed or invalid for the payment date.');
    END IF;

    -- 4. Get Customer from Invoice
    IF p_customer_invoice_id IS NOT NULL THEN
        SELECT customer_id, transaction_id INTO v_customer_id, v_transaction_id
        FROM customer_invoices
        WHERE id = p_customer_invoice_id AND organization_id = p_organization_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'message', 'Customer invoice not found.');
        END IF;
    ELSE
        -- Handling generic AR receipt (e.g., down payment) - would need customer_id explicitly
        -- For this phase, we assume invoice-based payments
        RETURN jsonb_build_object('success', false, 'message', 'Generic AR receipt not fully supported in this function version.');
    END IF;

    -- 5. Insert Payment
    INSERT INTO customer_payments (
        organization_id, customer_id, cash_bank_id, payment_number, payment_date,
        total_amount, allocated_amount, unallocated_amount, status, transaction_id, notes, created_by
    ) VALUES (
        p_organization_id, v_customer_id, p_cash_bank_account_id, p_payment_number, p_payment_date,
        p_amount, p_amount, 0, 'Posted', v_transaction_id, p_notes, p_created_by
    ) RETURNING id INTO v_payment_id;

    -- 6. Insert Allocation
    INSERT INTO customer_payment_allocations (
        payment_id, invoice_id, amount
    ) VALUES (
        v_payment_id, p_customer_invoice_id, p_amount
    );

    -- 7. Update Invoice Status & Paid Amount
    UPDATE customer_invoices 
    SET paid_amount = paid_amount + p_amount,
        status = CASE WHEN total_amount <= (paid_amount + p_amount) THEN 'Paid' ELSE 'Partially Paid' END
    WHERE id = p_customer_invoice_id;

    -- 8. Audit Log
    INSERT INTO audit_logs (
        organization_id, user_id, table_name, record_id, action, old_data, new_data, ip_address, user_agent
    ) VALUES (
        p_organization_id, p_created_by, 'customer_payments', v_payment_id, 'INSERT',
        NULL,
        jsonb_build_object('payment_number', p_payment_number, 'amount', p_amount, 'invoice_id', p_customer_invoice_id),
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        current_setting('request.headers', true)::json->>'user-agent'
    );

    -- 9. Setup Journal Entry
    -- Get AR Account (Piutang Usaha)
    SELECT id INTO v_ar_account_id 
    FROM chart_of_accounts 
    WHERE organization_id = p_organization_id 
      AND category = 'Account Receivable' 
    LIMIT 1;

    -- Get Cash/Bank Account (Kas/Bank)
    SELECT account_id INTO v_cash_bank_coa_id
    FROM cash_bank_accounts
    WHERE id = p_cash_bank_account_id AND organization_id = p_organization_id;

    IF v_ar_account_id IS NULL OR v_cash_bank_coa_id IS NULL THEN
        -- We won't block the transaction entirely, but this would typically trigger a warning or require setup
        RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'message', 'Payment recorded, but journal entry failed due to missing account mapping.');
    END IF;

    -- Create Journal Entry Header
    INSERT INTO journal_entries (
        organization_id, period_id, journal_number, date, reference, description, status, created_by
    ) VALUES (
        p_organization_id, v_current_period_id, 'JE-PAY-' || EXTRACT(EPOCH FROM now())::BIGINT, p_payment_date, p_payment_number, 'Customer Payment: ' || p_payment_number, 'Posted', p_created_by
    ) RETURNING id INTO v_journal_id;

    -- Create Journal Lines (Debit Cash/Bank, Credit AR)
    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    VALUES 
        (v_journal_id, v_cash_bank_coa_id, p_amount, 0), -- Debit Cash
        (v_journal_id, v_ar_account_id, 0, p_amount);    -- Credit AR

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
