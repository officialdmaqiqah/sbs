-- Migration for Phase 3B: Supplier Bill from Bill Eligible Purchase Receipt

-- 1. Add outstanding_amount to supplier_bills
ALTER TABLE supplier_bills 
ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(18,2) NOT NULL DEFAULT 0;

ALTER TABLE supplier_bills 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Add CHECK constraint for outstanding_amount
ALTER TABLE supplier_bills
DROP CONSTRAINT IF EXISTS chk_supplier_bills_outstanding_amount;

ALTER TABLE supplier_bills
ADD CONSTRAINT chk_supplier_bills_outstanding_amount CHECK (outstanding_amount >= 0 AND outstanding_amount <= total_amount);

-- 3. Update existing records if any
UPDATE supplier_bills SET outstanding_amount = total_amount - paid_amount WHERE outstanding_amount = 0 AND total_amount > 0;

-- 4. Add Unique Constraint to prevent duplicate bills for the same source
ALTER TABLE supplier_bills
DROP CONSTRAINT IF EXISTS unique_supplier_bill_source;

ALTER TABLE supplier_bills
ADD CONSTRAINT unique_supplier_bill_source UNIQUE (organization_id, source_type, source_id);

-- 5. Create supplier_bill_lines table
CREATE TABLE IF NOT EXISTS supplier_bill_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES supplier_bills(id) ON DELETE CASCADE,
    po_item_id UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
    item_id UUID REFERENCES items(id) ON DELETE RESTRICT,
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(18,2) NOT NULL CHECK (unit_cost >= 0),
    total_price NUMERIC(18,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create RPC create_supplier_bill_from_receipt
CREATE OR REPLACE FUNCTION create_supplier_bill_from_receipt(
    p_organization_id UUID,
    p_purchase_receipt_id UUID,
    p_bill_number VARCHAR,
    p_bill_date DATE,
    p_due_date DATE,
    p_supplier_id UUID,
    p_project_id UUID,
    p_notes TEXT,
    p_transaction_id UUID,
    p_created_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_receipt RECORD;
    v_total_amount NUMERIC(18,2) := 0;
    v_bill_id UUID;
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_ap_account_id UUID;
    v_role VARCHAR;
    v_period_open BOOLEAN;
BEGIN
    -- 1. Role Validation
    SELECT raw_user_meta_data->>'role' INTO v_role
    FROM auth.users
    WHERE id = p_created_by;

    IF v_role NOT IN ('CEO_ADMIN', 'FINANCE') THEN
        RAISE EXCEPTION 'Unauthorized: Only CEO_ADMIN or FINANCE can create supplier bills.';
    END IF;

    -- 2. Validate receipt exists and is Bill Eligible
    SELECT id, finance_status, receipt_number INTO v_receipt
    FROM purchase_receipts
    WHERE id = p_purchase_receipt_id AND organization_id = p_organization_id;

    IF v_receipt.id IS NULL THEN
        RAISE EXCEPTION 'Purchase Receipt not found.';
    END IF;

    IF v_receipt.finance_status != 'Bill Eligible' THEN
        RAISE EXCEPTION 'Receipt is not Bill Eligible (Current status: %).', v_receipt.finance_status;
    END IF;

    -- 3. Check for existing bill (Idempotency / Duplicate Prevention)
    IF EXISTS (
        SELECT 1 FROM supplier_bills
        WHERE organization_id = p_organization_id
          AND source_type = 'Purchase Receipt'
          AND source_id = p_purchase_receipt_id
    ) THEN
        RAISE EXCEPTION 'Receipt ini sudah dibuatkan tagihan';
    END IF;

    IF EXISTS (
        SELECT 1 FROM supplier_bills
        WHERE organization_id = p_organization_id
          AND bill_number = p_bill_number
    ) THEN
        RAISE EXCEPTION 'Nomor tagihan sudah digunakan';
    END IF;

    -- 4. Check Accounting Period
    SELECT EXISTS (
        SELECT 1 FROM accounting_periods
        WHERE organization_id = p_organization_id
          AND p_bill_date >= start_date
          AND p_bill_date <= end_date
          AND status = 'Open'
    ) INTO v_period_open;

    -- Note: If we don't have accounting periods set up yet, we might allow it, but we should strictly check if period table exists.
    -- For safety, we'll assume if no periods exist, it's open, OR if a period exists it must be open.
    IF NOT v_period_open THEN
        IF EXISTS (SELECT 1 FROM accounting_periods WHERE organization_id = p_organization_id) THEN
            RAISE EXCEPTION 'Periode akuntansi sudah ditutup';
        END IF;
    END IF;

    -- 5. Retrieve Accounting Mappings
    SELECT account_id INTO v_inventory_account_id
    FROM accounting_mappings
    WHERE organization_id = p_organization_id AND mapping_key = 'INVENTORY_ASSET';

    SELECT account_id INTO v_ap_account_id
    FROM accounting_mappings
    WHERE organization_id = p_organization_id AND mapping_key = 'AP_SUPPLIER';

    IF v_inventory_account_id IS NULL OR v_ap_account_id IS NULL THEN
        RAISE EXCEPTION 'Mapping akuntansi belum lengkap';
    END IF;

    -- 6. Calculate Amount & Insert Bill Lines
    -- We will insert the bill first to get the ID, but we need total amount.
    -- We can do it by inserting the bill with 0 amount, then inserting lines, then updating bill.
    
    INSERT INTO supplier_bills (
        organization_id, supplier_id, project_id, bill_number, 
        bill_date, due_date, total_amount, paid_amount, outstanding_amount, status,
        source_type, source_id, transaction_id, notes, created_by
    ) VALUES (
        p_organization_id, p_supplier_id, p_project_id, p_bill_number,
        p_bill_date, p_due_date, 0, 0, 0, 'Posted',
        'Purchase Receipt', p_purchase_receipt_id, p_transaction_id, p_notes, p_created_by
    ) RETURNING id INTO v_bill_id;

    -- Insert Lines and calculate sum
    WITH inserted_lines AS (
        INSERT INTO supplier_bill_lines (bill_id, po_item_id, item_id, quantity, unit_cost, total_price)
        SELECT 
            v_bill_id,
            pri.po_item_id,
            pri.item_id,
            pri.quantity,
            poi.unit_price,
            (pri.quantity * poi.unit_price)
        FROM purchase_receipt_items pri
        JOIN purchase_order_items poi ON poi.id = pri.po_item_id
        WHERE pri.receipt_id = p_purchase_receipt_id
        RETURNING total_price
    )
    SELECT COALESCE(SUM(total_price), 0) INTO v_total_amount FROM inserted_lines;

    IF v_total_amount <= 0 THEN
        RAISE EXCEPTION 'Total amount must be greater than 0.';
    END IF;

    -- Update bill with total amount
    UPDATE supplier_bills
    SET total_amount = v_total_amount, outstanding_amount = v_total_amount
    WHERE id = v_bill_id;

    -- 7. Update Purchase Receipt Status
    UPDATE purchase_receipts
    SET finance_status = 'Billed'
    WHERE id = p_purchase_receipt_id;

    -- 8. Post Journal Entry
    INSERT INTO journal_entries (
        organization_id, journal_number, journal_date, description, reference_type, reference_id,
        status, created_by, source_type, source_id, event_type
    ) VALUES (
        p_organization_id, 'JRN-AP-' || p_bill_number, p_bill_date, 
        'Supplier Bill from Receipt: ' || v_receipt.receipt_number, 'SupplierBill', v_bill_id,
        'Posted', p_created_by, 'Purchase Receipt', p_purchase_receipt_id, 'Supplier Bill Creation'
    ) RETURNING id INTO v_journal_id;

    UPDATE supplier_bills SET journal_entry_id = v_journal_id WHERE id = v_bill_id;

    -- Debit INVENTORY_ASSET
    INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, debit, credit, description, project_id
    ) VALUES (
        v_journal_id, v_inventory_account_id, v_total_amount, 0, 'Inventory received', p_project_id
    );

    -- Credit AP_SUPPLIER
    INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, debit, credit, description, project_id
    ) VALUES (
        v_journal_id, v_ap_account_id, 0, v_total_amount, 'Account Payable to Supplier', p_project_id
    );

    -- 9. Audit Log
    INSERT INTO audit_logs (
        organization_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        p_organization_id, p_created_by, 'CREATE', 'SupplierBill', v_bill_id,
        jsonb_build_object(
            'bill_number', p_bill_number,
            'receipt_id', p_purchase_receipt_id,
            'total_amount', v_total_amount
        )
    );

    RETURN json_build_object(
        'supplier_bill_id', v_bill_id,
        'bill_number', p_bill_number,
        'total_amount', v_total_amount,
        'outstanding_amount', v_total_amount,
        'journal_entry_id', v_journal_id,
        'finance_status', 'Billed',
        'transaction_id', p_transaction_id
    );
END;
$$;
