-- Phase 3A Purchase Receipt Fixes
-- 1. Add source_type and source_id to inventory_movements
ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_id UUID;

-- 2. Update post_inventory_transaction to support source_type and source_id
CREATE OR REPLACE FUNCTION post_inventory_transaction(
    p_project_id UUID,
    p_location_id UUID,
    p_item_id UUID,
    p_movement_date DATE,
    p_reference_type VARCHAR,
    p_direction VARCHAR,
    p_quantity NUMERIC,
    p_unit_cost NUMERIC DEFAULT NULL,
    p_reference_number VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_transaction_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT current_user_organization_id(),
    p_source_type VARCHAR DEFAULT NULL,
    p_source_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_transaction_id UUID;
    v_balance_record inventory_balances%ROWTYPE;
    v_movement_id UUID;
    v_stock_before NUMERIC;
    v_stock_after NUMERIC;
    v_result JSONB;
BEGIN
    IF p_transaction_id IS NOT NULL THEN
        v_transaction_id := p_transaction_id;
    ELSE
        v_transaction_id := gen_random_uuid();
    END IF;

    -- Get current balance
    SELECT * INTO v_balance_record
    FROM inventory_balances
    WHERE project_id = p_project_id AND location_id = p_location_id AND item_id = p_item_id
    FOR UPDATE;

    IF FOUND THEN
        v_stock_before := v_balance_record.physical_quantity;
    ELSE
        v_stock_before := 0;
        
        -- Create initial balance record if it doesn't exist
        INSERT INTO inventory_balances (
            organization_id, project_id, location_id, item_id, physical_quantity
        ) VALUES (
            p_organization_id, p_project_id, p_location_id, p_item_id, 0
        ) RETURNING * INTO v_balance_record;
    END IF;

    -- Calculate new stock
    IF p_direction = 'IN' THEN
        v_stock_after := v_stock_before + p_quantity;
    ELSIF p_direction = 'OUT' THEN
        v_stock_after := v_stock_before - p_quantity;
    ELSE
        RAISE EXCEPTION 'Invalid direction: %', p_direction;
    END IF;

    -- Insert movement record
    INSERT INTO inventory_movements (
        organization_id, project_id, location_id, item_id, transaction_id,
        movement_date, movement_type, direction, quantity, unit_cost,
        stock_before, stock_after, reference_number, reference_type, reference_id, notes,
        source_type, source_id
    ) VALUES (
        p_organization_id, p_project_id, p_location_id, p_item_id, v_transaction_id,
        p_movement_date, p_reference_type, p_direction, p_quantity, p_unit_cost,
        v_stock_before, v_stock_after, p_reference_number, p_reference_type, p_reference_id, p_notes,
        p_source_type, p_source_id
    ) RETURNING id INTO v_movement_id;

    -- Update balance record
    UPDATE inventory_balances
    SET physical_quantity = v_stock_after,
        updated_at = now()
    WHERE id = v_balance_record.id;

    v_result := jsonb_build_object(
        'movement_id', v_movement_id,
        'transaction_id', v_transaction_id,
        'stock_before', v_stock_before,
        'stock_after', v_stock_after
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update receive_purchase_order to pass source_type and source_id
CREATE OR REPLACE FUNCTION receive_purchase_order(
    p_organization_id UUID,
    p_purchase_order_id UUID,
    p_receipt_number VARCHAR,
    p_receipt_date DATE,
    p_warehouse_location_id UUID,
    p_project_id UUID,
    p_supplier_id UUID,
    p_items JSONB,
    p_reference VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_transaction_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT auth.uid()
) RETURNS JSONB AS $$
DECLARE
    v_receipt_id UUID;
    v_transaction_id UUID;
    v_po_status VARCHAR;
    v_item JSONB;
    v_po_item_id UUID;
    v_item_id UUID;
    v_qty NUMERIC;
    v_unit_cost NUMERIC;
    v_item_notes TEXT;
    
    v_ordered_qty NUMERIC;
    v_prev_received NUMERIC;
    v_new_received NUMERIC;
    
    v_all_fully_received BOOLEAN := TRUE;
    v_any_received BOOLEAN := FALSE;
    
    v_inv_movement_ids UUID[] := '{}';
    v_inv_result JSONB;
    v_result JSONB;
BEGIN
    -- Validate PO
    SELECT status INTO v_po_status FROM purchase_orders 
    WHERE id = p_purchase_order_id AND organization_id = p_organization_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found';
    END IF;
    
    IF v_po_status IN ('Completed', 'Cancelled', 'Fully Received') THEN
        RAISE EXCEPTION 'PO tidak dapat diterima (Status: %)', v_po_status;
    END IF;
    
    -- Idempotency
    IF p_transaction_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM purchase_receipts WHERE transaction_id = p_transaction_id AND organization_id = p_organization_id) THEN
            RAISE EXCEPTION 'Penerimaan ini sudah pernah diproses';
        END IF;
        v_transaction_id := p_transaction_id;
    ELSE
        v_transaction_id := gen_random_uuid();
    END IF;
    
    -- Insert Purchase Receipt
    INSERT INTO purchase_receipts (
        organization_id, po_id, location_id, receipt_number, receipt_date, 
        status, transaction_id, notes, created_by, finance_status
    ) VALUES (
        p_organization_id, p_purchase_order_id, p_warehouse_location_id, p_receipt_number, p_receipt_date,
        'Posted', v_transaction_id, p_notes, p_created_by, 'Bill Eligible'
    ) RETURNING id INTO v_receipt_id;
    
    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_po_item_id := (v_item->>'po_item_id')::UUID;
        v_item_id := (v_item->>'item_id')::UUID;
        v_qty := (v_item->>'quantity_received')::NUMERIC;
        v_unit_cost := COALESCE((v_item->>'unit_cost')::NUMERIC, 0);
        v_item_notes := v_item->>'notes';
        
        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Quantity received must be greater than 0';
        END IF;
        
        -- Lock PO item
        SELECT quantity, received_quantity INTO v_ordered_qty, v_prev_received 
        FROM purchase_order_items WHERE id = v_po_item_id AND po_id = p_purchase_order_id FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'PO Item % not found', v_po_item_id;
        END IF;
        
        v_new_received := v_prev_received + v_qty;
        
        IF v_new_received > v_ordered_qty THEN
            RAISE EXCEPTION 'Jumlah terima melebihi sisa PO';
        END IF;
        
        -- Insert Receipt Item
        INSERT INTO purchase_receipt_items (
            receipt_id, po_item_id, item_id, quantity
        ) VALUES (
            v_receipt_id, v_po_item_id, v_item_id, v_qty
        );
        
        -- Post Inventory Transaction IN
        v_inv_result := post_inventory_transaction(
            p_project_id := p_project_id,
            p_location_id := p_warehouse_location_id,
            p_item_id := v_item_id,
            p_movement_date := p_receipt_date,
            p_reference_type := 'Purchase Receipt',
            p_direction := 'IN',
            p_quantity := v_qty,
            p_unit_cost := v_unit_cost,
            p_reference_number := p_receipt_number,
            p_reference_id := v_receipt_id,
            p_notes := v_item_notes,
            p_transaction_id := v_transaction_id,
            p_organization_id := p_organization_id,
            p_source_type := 'Purchase Receipt',
            p_source_id := v_receipt_id
        );
        
        v_inv_movement_ids := array_append(v_inv_movement_ids, (v_inv_result->>'movement_id')::UUID);
        
        -- Update PO Item
        UPDATE purchase_order_items 
        SET received_quantity = v_new_received
        WHERE id = v_po_item_id;
        
    END LOOP;
    
    -- Determine new PO status based on all its items
    SELECT 
        BOOL_AND(received_quantity >= quantity),
        BOOL_OR(received_quantity > 0)
    INTO v_all_fully_received, v_any_received
    FROM purchase_order_items 
    WHERE po_id = p_purchase_order_id;
    
    IF v_all_fully_received THEN
        v_po_status := 'Fully Received';
    ELSIF v_any_received THEN
        v_po_status := 'Partially Received';
    ELSE
        v_po_status := v_po_status;
    END IF;
    
    UPDATE purchase_orders 
    SET status = v_po_status
    WHERE id = p_purchase_order_id;
    
    -- Insert Audit Log
    INSERT INTO audit_logs (organization_id, created_by, action, entity_type, entity_id, new_value)
    VALUES (p_organization_id, p_created_by, 'RECEIVE', 'PURCHASE_ORDER', p_purchase_order_id, 
            jsonb_build_object('receipt_id', v_receipt_id, 'receipt_number', p_receipt_number, 'new_status', v_po_status));
    
    v_result := jsonb_build_object(
        'receipt_id', v_receipt_id,
        'receipt_number', p_receipt_number,
        'purchase_order_id', p_purchase_order_id,
        'status', 'Posted',
        'inventory_transaction_id', v_transaction_id,
        'movement_ids', v_inv_movement_ids,
        'finance_status', 'Bill Eligible'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
