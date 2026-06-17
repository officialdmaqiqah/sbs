-- Phase 4A Migration: Sales Delivery

-- 1. Rename tables
ALTER TABLE delivery_orders RENAME TO sales_deliveries;
ALTER TABLE delivery_order_items RENAME TO sales_delivery_items;

-- 2. Rename columns
ALTER TABLE sales_deliveries RENAME COLUMN do_number TO delivery_number;
ALTER TABLE sales_deliveries RENAME COLUMN so_id TO sales_order_id;
ALTER TABLE sales_delivery_items RENAME COLUMN delivery_id TO sales_delivery_id;
ALTER TABLE sales_delivery_items RENAME COLUMN quantity TO quantity_delivered;

-- 3. Add columns
ALTER TABLE sales_deliveries ADD COLUMN transaction_id UUID UNIQUE;
ALTER TABLE sales_deliveries ADD COLUMN finance_status VARCHAR(50) DEFAULT 'Invoice Eligible';

-- 4. Update Trigger
DROP TRIGGER IF EXISTS update_delivery_orders_modtime ON sales_deliveries;
CREATE TRIGGER update_sales_deliveries_modtime
    BEFORE UPDATE ON sales_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 5. Update Constraints
ALTER TABLE sales_deliveries DROP CONSTRAINT IF EXISTS delivery_orders_organization_id_do_number_key CASCADE;
ALTER TABLE sales_deliveries ADD CONSTRAINT sales_deliveries_organization_id_delivery_number_key UNIQUE(organization_id, delivery_number);

-- 6. RPC: deliver_sales_order
CREATE OR REPLACE FUNCTION deliver_sales_order(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_user_role VARCHAR;
    v_so_id UUID;
    v_delivery_id UUID;
    v_transaction_id UUID;
    v_item JSONB;
    v_so_record RECORD;
    v_total_amount NUMERIC := 0;
    v_current_stock NUMERIC;
    v_project_id UUID;
    v_location_id UUID;
    v_delivery_number VARCHAR;
BEGIN
    -- 1. Auth & Role check
    v_org_id := auth.jwt() ->> 'organization_id';
    v_user_role := auth.jwt() ->> 'role';
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF v_user_role NOT IN ('CEO_ADMIN', 'SALES', 'WAREHOUSE') THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Extract data
    v_so_id := (p_payload->>'sales_order_id')::UUID;
    v_project_id := (p_payload->>'project_id')::UUID;
    v_location_id := (p_payload->>'location_id')::UUID;
    v_delivery_number := p_payload->>'delivery_number';

    -- Check Sales Order exists and is open
    SELECT * INTO v_so_record FROM sales_orders WHERE id = v_so_id AND organization_id = v_org_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales order not found';
    END IF;

    IF v_so_record.status IN ('Completed', 'Cancelled', 'Delivered') THEN
        RAISE EXCEPTION 'Sales order is not deliverable (Status: %)', v_so_record.status;
    END IF;

    -- Duplicate check
    IF EXISTS (SELECT 1 FROM sales_deliveries WHERE organization_id = v_org_id AND delivery_number = v_delivery_number) THEN
        RAISE EXCEPTION 'Delivery number already exists';
    END IF;

    -- 2. Create Transaction ID for inventory movements
    v_transaction_id := gen_random_uuid();

    -- 3. Insert Delivery Order
    INSERT INTO sales_deliveries (
        organization_id,
        sales_order_id,
        project_id,
        location_id,
        delivery_number,
        delivery_date,
        status,
        dispatch_transaction_id,
        transaction_id,
        finance_status,
        notes,
        created_by
    ) VALUES (
        v_org_id,
        v_so_id,
        v_project_id,
        v_location_id,
        v_delivery_number,
        (p_payload->>'delivery_date')::DATE,
        'Delivered',
        v_transaction_id,
        v_transaction_id,
        'Invoice Eligible',
        p_payload->>'notes',
        (p_payload->>'created_by')::UUID
    ) RETURNING id INTO v_delivery_id;

    -- 4. Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        -- Inventory Check
        SELECT current_stock INTO v_current_stock 
        FROM inventory_balances 
        WHERE organization_id = v_org_id 
          AND project_id = v_project_id 
          AND location_id = v_location_id 
          AND item_id = (v_item->>'inventory_item_id')::UUID
        FOR UPDATE; -- lock row

        IF v_current_stock IS NULL OR v_current_stock < (v_item->>'quantity_delivered')::NUMERIC THEN
            RAISE EXCEPTION 'Insufficient stock for item %', (v_item->>'inventory_item_id');
        END IF;

        -- Check Sales Order Item limits
        DECLARE
            v_ordered NUMERIC;
            v_delivered NUMERIC;
        BEGIN
            SELECT quantity, delivered_quantity INTO v_ordered, v_delivered
            FROM sales_order_items
            WHERE id = (v_item->>'sales_order_item_id')::UUID;

            IF v_delivered + (v_item->>'quantity_delivered')::NUMERIC > v_ordered THEN
                RAISE EXCEPTION 'Cannot deliver more than ordered quantity';
            END IF;

            -- Update Sales Order Item
            UPDATE sales_order_items 
            SET delivered_quantity = delivered_quantity + (v_item->>'quantity_delivered')::NUMERIC
            WHERE id = (v_item->>'sales_order_item_id')::UUID;
        END;

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
            total_cost,
            stock_before,
            stock_after,
            reference_type,
            reference_id,
            reference_number,
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
            (v_item->>'quantity_delivered')::NUMERIC * COALESCE((v_item->>'unit_hpp')::NUMERIC, 0),
            v_current_stock,
            v_current_stock - (v_item->>'quantity_delivered')::NUMERIC,
            'sales_deliveries',
            v_delivery_id,
            v_delivery_number,
            (p_payload->>'created_by')::UUID
        );

        -- Update Inventory Balance
        UPDATE inventory_balances
        SET current_stock = current_stock - (v_item->>'quantity_delivered')::NUMERIC,
            last_movement_date = (p_payload->>'delivery_date')::DATE,
            updated_at = NOW()
        WHERE organization_id = v_org_id 
          AND project_id = v_project_id 
          AND location_id = v_location_id 
          AND item_id = (v_item->>'inventory_item_id')::UUID;
    END LOOP;

    -- 5. Update SO Status
    DECLARE
        v_total_ordered NUMERIC;
        v_total_delivered NUMERIC;
    BEGIN
        SELECT SUM(quantity), SUM(delivered_quantity) INTO v_total_ordered, v_total_delivered
        FROM sales_order_items
        WHERE so_id = v_so_id;

        IF v_total_delivered >= v_total_ordered THEN
            UPDATE sales_orders SET status = 'Delivered' WHERE id = v_so_id;
        ELSIF v_total_delivered > 0 THEN
            UPDATE sales_orders SET status = 'Partially Delivered' WHERE id = v_so_id;
        END IF;
    END;

    -- 6. Audit Log
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
        p_payload,
        (p_payload->>'created_by')::UUID
    );

    RETURN jsonb_build_object('success', true, 'sales_delivery_id', v_delivery_id, 'transaction_id', v_transaction_id);
END;
$$;

-- 7. Add RLS Policies for sales_deliveries and sales_delivery_items
ALTER TABLE sales_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_delivery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sales deliveries" ON sales_deliveries;
CREATE POLICY "Users can view sales deliveries" ON sales_deliveries
    FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::text);

DROP POLICY IF EXISTS "Users can insert sales deliveries" ON sales_deliveries;
CREATE POLICY "Users can insert sales deliveries" ON sales_deliveries
    FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::text AND auth.jwt() ->> 'role' IN ('CEO_ADMIN', 'SALES', 'WAREHOUSE'));

DROP POLICY IF EXISTS "Users can update sales deliveries" ON sales_deliveries;
CREATE POLICY "Users can update sales deliveries" ON sales_deliveries
    FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::text AND auth.jwt() ->> 'role' IN ('CEO_ADMIN', 'SALES', 'WAREHOUSE'));

DROP POLICY IF EXISTS "Users can view sales delivery items" ON sales_delivery_items;
CREATE POLICY "Users can view sales delivery items" ON sales_delivery_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sales_deliveries sd WHERE sd.id = sales_delivery_items.sales_delivery_id AND auth.jwt() ->> 'organization_id' = sd.organization_id::text
    ));

DROP POLICY IF EXISTS "Users can insert sales delivery items" ON sales_delivery_items;
CREATE POLICY "Users can insert sales delivery items" ON sales_delivery_items
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM sales_deliveries sd WHERE sd.id = sales_delivery_items.sales_delivery_id AND auth.jwt() ->> 'organization_id' = sd.organization_id::text AND auth.jwt() ->> 'role' IN ('CEO_ADMIN', 'SALES', 'WAREHOUSE')
    ));
