-- Phase 4A Fix: Update deliver_sales_order to use DB functions instead of JWT claims
-- JWT claims like auth.jwt() ->> 'organization_id' are empty unless using custom claims hooks
-- Use current_user_organization_id() and current_user_has_role() DB functions instead

CREATE OR REPLACE FUNCTION deliver_sales_order(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_so_id UUID;
    v_delivery_id UUID;
    v_transaction_id UUID;
    v_item JSONB;
    v_so_record RECORD;
    v_current_stock NUMERIC;
    v_project_id UUID;
    v_location_id UUID;
    v_delivery_number VARCHAR;
    v_ordered NUMERIC;
    v_delivered NUMERIC;
BEGIN
    -- 1. Auth check using DB functions (not JWT claims)
    v_org_id := current_user_organization_id();
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or no organization assigned';
    END IF;

    -- Check role using DB function
    IF NOT (current_user_has_role('CEO_ADMIN') OR current_user_has_role('SALES') OR current_user_has_role('WAREHOUSE')) THEN
        RAISE EXCEPTION 'Access denied: insufficient role';
    END IF;

    -- Extract data from payload
    v_so_id := (p_payload->>'sales_order_id')::UUID;
    v_project_id := (p_payload->>'project_id')::UUID;
    v_location_id := (p_payload->>'location_id')::UUID;
    v_delivery_number := p_payload->>'delivery_number';

    -- Check Sales Order exists and is deliverable
    SELECT * INTO v_so_record FROM sales_orders WHERE id = v_so_id AND organization_id = v_org_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales order not found';
    END IF;

    IF v_so_record.status IN ('Completed', 'Cancelled', 'Delivered') THEN
        RAISE EXCEPTION 'Sales order is not deliverable (Status: %)', v_so_record.status;
    END IF;

    -- Duplicate delivery number check
    IF v_delivery_number IS NOT NULL AND EXISTS (
        SELECT 1 FROM sales_deliveries WHERE organization_id = v_org_id AND delivery_number = v_delivery_number
    ) THEN
        RAISE EXCEPTION 'Delivery number already exists';
    END IF;

    -- Generate delivery number if not provided
    IF v_delivery_number IS NULL THEN
        v_delivery_number := 'DO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8);
    END IF;

    -- Create Transaction ID for inventory movements
    v_transaction_id := gen_random_uuid();

    -- Insert Delivery record
    INSERT INTO sales_deliveries (
        organization_id,
        sales_order_id,
        location_id,
        delivery_number,
        delivery_date,
        status,
        dispatch_transaction_id,
        transaction_id,
        finance_status,
        driver,
        vehicle_number,
        customer_name,
        customer_address,
        scheduled_date,
        notes,
        created_by
    ) VALUES (
        v_org_id,
        v_so_id,
        v_location_id,
        v_delivery_number,
        COALESCE((p_payload->>'delivery_date')::DATE, CURRENT_DATE),
        'Delivered',
        v_transaction_id,
        v_transaction_id,
        'Invoice Eligible',
        p_payload->>'driver',
        p_payload->>'vehicle_number',
        p_payload->>'customer_name',
        p_payload->>'customer_address',
        CASE WHEN p_payload->>'scheduled_date' IS NOT NULL THEN (p_payload->>'scheduled_date')::TIMESTAMPTZ ELSE NULL END,
        p_payload->>'notes',
        auth.uid()
    ) RETURNING id INTO v_delivery_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        -- Inventory Check (physical_quantity is the correct column)
        SELECT physical_quantity INTO v_current_stock 
        FROM inventory_balances 
        WHERE organization_id = v_org_id 
          AND project_id = v_project_id
          AND location_id = v_location_id 
          AND item_id = (v_item->>'inventory_item_id')::UUID
        FOR UPDATE;

        IF v_current_stock IS NULL OR v_current_stock < (v_item->>'quantity_delivered')::NUMERIC THEN
            RAISE EXCEPTION 'Insufficient stock for item %', (v_item->>'inventory_item_id');
        END IF;

        -- Check Sales Order Item limits
        SELECT quantity, delivered_quantity INTO v_ordered, v_delivered
        FROM sales_order_items
        WHERE id = (v_item->>'sales_order_item_id')::UUID;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sales order item not found: %', (v_item->>'sales_order_item_id');
        END IF;

        IF v_delivered + (v_item->>'quantity_delivered')::NUMERIC > v_ordered THEN
            RAISE EXCEPTION 'Cannot deliver more than ordered quantity';
        END IF;

        -- Update Sales Order Item delivered_quantity
        UPDATE sales_order_items 
        SET delivered_quantity = delivered_quantity + (v_item->>'quantity_delivered')::NUMERIC
        WHERE id = (v_item->>'sales_order_item_id')::UUID;

        -- Insert Delivery Item
        INSERT INTO sales_delivery_items (
            sales_delivery_id,
            so_item_id,
            item_id,
            quantity_delivered,
            hpp_snapshot
        ) VALUES (
            v_delivery_id,
            (v_item->>'sales_order_item_id')::UUID,
            (v_item->>'inventory_item_id')::UUID,
            (v_item->>'quantity_delivered')::NUMERIC,
            COALESCE((v_item->>'unit_hpp')::NUMERIC, 0)
        );

        -- Insert Inventory Movement (OUT)
        INSERT INTO inventory_movements (
            organization_id,
            transaction_id,
            project_id,
            location_id,
            item_id,
            movement_type,
            direction,
            quantity,
            unit_cost,
            stock_before,
            stock_after,
            reference_type,
            reference_id,
            reference_number,
            movement_date,
            created_by
        ) VALUES (
            v_org_id,
            v_transaction_id,
            v_project_id,
            v_location_id,
            (v_item->>'inventory_item_id')::UUID,
            'Sales Delivery',
            'OUT',
            (v_item->>'quantity_delivered')::NUMERIC,
            COALESCE((v_item->>'unit_hpp')::NUMERIC, 0),
            v_current_stock,
            v_current_stock - (v_item->>'quantity_delivered')::NUMERIC,
            'sales_deliveries',
            v_delivery_id,
            v_delivery_number,
            COALESCE((p_payload->>'delivery_date')::DATE, CURRENT_DATE),
            auth.uid()
        );

        -- Update Inventory Balance
        UPDATE inventory_balances
        SET physical_quantity = physical_quantity - (v_item->>'quantity_delivered')::NUMERIC,
            updated_at = NOW()
        WHERE organization_id = v_org_id 
          AND project_id = v_project_id
          AND location_id = v_location_id 
          AND item_id = (v_item->>'inventory_item_id')::UUID;
    END LOOP;

    -- Update SO Status based on total delivery
    SELECT SUM(quantity), SUM(delivered_quantity) INTO v_ordered, v_delivered
    FROM sales_order_items
    WHERE so_id = v_so_id;

    IF v_delivered >= v_ordered THEN
        UPDATE sales_orders SET status = 'Delivered' WHERE id = v_so_id;
    ELSIF v_delivered > 0 THEN
        UPDATE sales_orders SET status = 'Partially Delivered' WHERE id = v_so_id;
    END IF;

    -- Audit Log
    INSERT INTO audit_logs (
        organization_id,
        entity_type,
        entity_id,
        action,
        new_value,
        created_by
    ) VALUES (
        v_org_id,
        'sales_deliveries',
        v_delivery_id,
        'CREATE',
        jsonb_build_object('delivery_number', v_delivery_number, 'sales_order_id', v_so_id),
        auth.uid()
    );

    RETURN jsonb_build_object(
        'success', true,
        'sales_delivery_id', v_delivery_id,
        'delivery_number', v_delivery_number
    );
END;
$$;
