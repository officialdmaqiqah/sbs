-- 001. Modify existing columns to be nullable
ALTER TABLE cash_bank_mutations 
  ALTER COLUMN from_cash_bank_id DROP NOT NULL,
  ALTER COLUMN to_cash_bank_id DROP NOT NULL,
  ALTER COLUMN project_id DROP NOT NULL;

-- 002. Drop the existing CHECK constraint from previous migration
ALTER TABLE cash_bank_mutations DROP CONSTRAINT IF EXISTS cash_bank_mutations_check;
ALTER TABLE cash_bank_mutations DROP CONSTRAINT IF EXISTS cash_bank_mutations_from_cash_bank_id_fkey;
ALTER TABLE cash_bank_mutations DROP CONSTRAINT IF EXISTS cash_bank_mutations_to_cash_bank_id_fkey;

-- Restore FK with CASCADE/SET NULL safely (Optional, but good for data integrity)
ALTER TABLE cash_bank_mutations ADD CONSTRAINT cash_bank_mutations_from_cash_bank_id_fkey FOREIGN KEY (from_cash_bank_id) REFERENCES cash_bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE cash_bank_mutations ADD CONSTRAINT cash_bank_mutations_to_cash_bank_id_fkey FOREIGN KEY (to_cash_bank_id) REFERENCES cash_bank_accounts(id) ON DELETE SET NULL;


-- 003. Add new columns
ALTER TABLE cash_bank_mutations 
  ADD COLUMN IF NOT EXISTS mutation_type text NOT NULL DEFAULT 'TRANSFER' CHECK (mutation_type IN ('IN', 'OUT', 'TRANSFER')),
  ADD COLUMN IF NOT EXISTS reference_type text NULL,
  ADD COLUMN IF NOT EXISTS reference_id uuid NULL,
  ADD COLUMN IF NOT EXISTS source_module text NULL;

-- Remove default after applying
ALTER TABLE cash_bank_mutations ALTER COLUMN mutation_type DROP DEFAULT;

-- 004. Add complex validation constraints
ALTER TABLE cash_bank_mutations ADD CONSTRAINT cash_bank_mutations_validation_check CHECK (
  (mutation_type = 'IN' AND to_cash_bank_id IS NOT NULL) OR
  (mutation_type = 'OUT' AND from_cash_bank_id IS NOT NULL) OR
  (mutation_type = 'TRANSFER' AND from_cash_bank_id IS NOT NULL AND to_cash_bank_id IS NOT NULL AND from_cash_bank_id != to_cash_bank_id)
);

-- 005. Add indexes
CREATE INDEX IF NOT EXISTS idx_cbm_project_id ON cash_bank_mutations(project_id);
CREATE INDEX IF NOT EXISTS idx_cbm_mutation_type ON cash_bank_mutations(mutation_type);
CREATE INDEX IF NOT EXISTS idx_cbm_mutation_date ON cash_bank_mutations(mutation_date);
CREATE INDEX IF NOT EXISTS idx_cbm_reference ON cash_bank_mutations(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_cbm_from_account ON cash_bank_mutations(from_cash_bank_id);
CREATE INDEX IF NOT EXISTS idx_cbm_to_account ON cash_bank_mutations(to_cash_bank_id);
CREATE INDEX IF NOT EXISTS idx_cbm_organization ON cash_bank_mutations(organization_id);

-- 006. Enable RLS
ALTER TABLE cash_bank_mutations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "CEO and Admin can manage cash mutations" ON cash_bank_mutations;
DROP POLICY IF EXISTS "Finance can manage cash mutations" ON cash_bank_mutations;

-- Policy 1: Admin & CEO
CREATE POLICY "CEO and Admin can manage cash bank accounts"
ON cash_bank_accounts
FOR ALL
USING (
  (SELECT auth.jwt()->>'role' = 'authenticated') AND
  (SELECT user_role FROM user_profiles WHERE id = auth.uid()) IN ('Admin', 'CEO')
)
WITH CHECK (
  (SELECT auth.jwt()->>'role' = 'authenticated') AND
  (SELECT user_role FROM user_profiles WHERE id = auth.uid()) IN ('Admin', 'CEO')
);

-- Policy 2: Finance
CREATE POLICY "Finance can view and use cash bank accounts"
ON cash_bank_accounts
FOR SELECT
USING (
  (SELECT auth.jwt()->>'role' = 'authenticated') AND
  (SELECT user_role FROM user_profiles WHERE id = auth.uid()) = 'Finance'
);


-- 007. Update AR/AP RPCs

-- Customer Payment RPC
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
    v_project_id UUID;
BEGIN
    SELECT current_setting('request.jwt.claims', true)::jsonb->>'role' INTO v_user_role;
    IF v_user_role IS NULL OR v_user_role != 'authenticated' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized. Must be authenticated.');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payment amount must be greater than zero.');
    END IF;

    IF p_customer_invoice_id IS NOT NULL THEN
        SELECT customer_id, transaction_id, project_id INTO v_customer_id, v_transaction_id, v_project_id
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

    -- BYPASS JOURNAL, INSERT INTO CASH_BANK_MUTATIONS
    INSERT INTO cash_bank_mutations (
        organization_id, project_id, from_cash_bank_id, to_cash_bank_id, amount, mutation_date, notes, created_by, mutation_type, reference_type, reference_id, source_module
    ) VALUES (
        p_organization_id, v_project_id, NULL, p_cash_bank_account_id, p_amount, p_payment_date, p_notes, p_created_by, 'IN', 'CUSTOMER_PAYMENT', v_payment_id, 'AR'
    );

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM, 'detail', SQLSTATE);
END;
$function$;


-- Supplier Payment RPC
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
    v_project_id UUID;
BEGIN
    SELECT current_setting('request.jwt.claims', true)::jsonb->>'role' INTO v_user_role;
    IF v_user_role IS NULL OR v_user_role != 'authenticated' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payment amount must be greater than zero.');
    END IF;

    SELECT supplier_id, transaction_id, project_id INTO v_supplier_id, v_transaction_id, v_project_id
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

    -- BYPASS JOURNAL, INSERT INTO CASH_BANK_MUTATIONS
    INSERT INTO cash_bank_mutations (
        organization_id, project_id, from_cash_bank_id, to_cash_bank_id, amount, mutation_date, notes, created_by, mutation_type, reference_type, reference_id, source_module
    ) VALUES (
        p_organization_id, v_project_id, p_cash_bank_account_id, NULL, p_amount, p_payment_date, p_notes, p_created_by, 'OUT', 'SUPPLIER_PAYMENT', v_payment_id, 'AP'
    );

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM, 'detail', SQLSTATE);
END;
$function$;
