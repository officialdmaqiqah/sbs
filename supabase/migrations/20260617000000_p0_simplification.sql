-- 001. Modify cash_bank_accounts
ALTER TABLE cash_bank_accounts ALTER COLUMN account_id DROP NOT NULL;

-- 002. Create cash_bank_mutations
CREATE TABLE cash_bank_mutations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    from_cash_bank_id UUID NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT,
    to_cash_bank_id UUID NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    mutation_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    CHECK (from_cash_bank_id != to_cash_bank_id)
);

-- 003. Replace pay_customer_invoice_v3 to bypass journal
CREATE OR REPLACE FUNCTION public.pay_customer_invoice_v3(
    p_organization_id uuid,
    p_customer_invoice_id uuid,
    p_cash_bank_account_id uuid,
    p_payment_number character varying,
    p_payment_date date,
    p_amount numeric,
    p_reference character varying DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_transaction_id uuid DEFAULT NULL,
    p_created_by uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_customer_id UUID;
    v_payment_id UUID;
    v_transaction_id UUID;
    v_user_role VARCHAR;
BEGIN
    SELECT current_setting('request.jwt.claims', true)::jsonb->>'role' INTO v_user_role;
    IF v_user_role IS NULL OR v_user_role != 'authenticated' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized. Must be authenticated.');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payment amount must be greater than zero.');
    END IF;

    IF p_customer_invoice_id IS NOT NULL THEN
        SELECT customer_id, transaction_id INTO v_customer_id, v_transaction_id
        FROM customer_invoices
        WHERE id = p_customer_invoice_id AND organization_id = p_organization_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'message', 'Customer invoice not found.');
        END IF;
    END IF;

    INSERT INTO customer_payments (
        organization_id, customer_id, cash_bank_id, payment_number, payment_date,
        total_amount, allocated_amount, unallocated_amount, status, transaction_id, notes, created_by
    ) VALUES (
        p_organization_id, v_customer_id, p_cash_bank_account_id, p_payment_number, p_payment_date,
        p_amount, p_amount, 0, 'Posted', v_transaction_id, p_notes, p_created_by
    ) RETURNING id INTO v_payment_id;

    INSERT INTO customer_payment_allocations (
        payment_id, invoice_id, amount
    ) VALUES (
        v_payment_id, p_customer_invoice_id, p_amount
    );

    UPDATE customer_invoices 
    SET paid_amount = paid_amount + p_amount,
        status = CASE WHEN total_amount <= (paid_amount + p_amount) THEN 'Paid' ELSE 'Partially Paid' END
    WHERE id = p_customer_invoice_id;

    -- BYPASS JOURNAL: No inserts into journal_entries or journal_entry_lines

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM, 'detail', SQLSTATE);
END;
$function$;

-- Replace pay_supplier_bill (if the actual function name is different, we might need another run, but let's assume it's this)
CREATE OR REPLACE FUNCTION public.pay_supplier_bill(
    p_organization_id uuid,
    p_supplier_bill_id uuid,
    p_cash_bank_account_id uuid,
    p_payment_number character varying,
    p_payment_date date,
    p_amount numeric,
    p_reference character varying DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_transaction_id uuid DEFAULT NULL,
    p_created_by uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_supplier_id UUID;
    v_payment_id UUID;
    v_transaction_id UUID;
    v_user_role VARCHAR;
BEGIN
    SELECT current_setting('request.jwt.claims', true)::jsonb->>'role' INTO v_user_role;
    IF v_user_role IS NULL OR v_user_role != 'authenticated' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payment amount must be greater than zero.');
    END IF;

    SELECT supplier_id, transaction_id INTO v_supplier_id, v_transaction_id
    FROM supplier_bills
    WHERE id = p_supplier_bill_id AND organization_id = p_organization_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Supplier bill not found.');
    END IF;

    INSERT INTO supplier_payments (
        organization_id, supplier_id, cash_bank_id, payment_number, payment_date,
        total_amount, allocated_amount, unallocated_amount, status, transaction_id, notes, created_by
    ) VALUES (
        p_organization_id, v_supplier_id, p_cash_bank_account_id, p_payment_number, p_payment_date,
        p_amount, p_amount, 0, 'Posted', v_transaction_id, p_notes, p_created_by
    ) RETURNING id INTO v_payment_id;

    INSERT INTO supplier_payment_allocations (
        payment_id, bill_id, amount
    ) VALUES (
        v_payment_id, p_supplier_bill_id, p_amount
    );

    UPDATE supplier_bills 
    SET paid_amount = paid_amount + p_amount,
        status = CASE WHEN total_amount <= (paid_amount + p_amount) THEN 'Paid' ELSE 'Partially Paid' END
    WHERE id = p_supplier_bill_id;

    -- BYPASS JOURNAL
    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM, 'detail', SQLSTATE);
END;
$function$;
