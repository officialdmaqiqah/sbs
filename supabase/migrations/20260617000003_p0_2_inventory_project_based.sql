-- 20260617000003_p0_2_inventory_project_based.sql
-- Description: Make project_id optional in inventory tables and update related constraints and RPCs.

-- 1. Drop NOT NULL constraints
ALTER TABLE inventory_balances ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE inventory_movements ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE inventory_reservations ALTER COLUMN project_id DROP NOT NULL;

-- 2. Update unique constraint for inventory_balances
-- Postgres 15+ supports NULLS NOT DISTINCT. Supabase uses PG15+.
-- Drop the old constraint
ALTER TABLE inventory_balances DROP CONSTRAINT IF EXISTS inventory_balances_organization_id_project_id_location_id_key;
ALTER TABLE inventory_balances DROP CONSTRAINT IF EXISTS inventory_balances_organization_id_project_i_key; -- Just in case of different auto-name

-- Adding new constraint explicitly handling NULLs as not distinct
ALTER TABLE inventory_balances ADD CONSTRAINT inventory_balances_org_proj_loc_item_key UNIQUE NULLS NOT DISTINCT (organization_id, project_id, location_id, item_id);

-- 3. Update post_inventory_transaction to allow NULL project_id
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
    p_organization_id UUID DEFAULT current_user_organization_id()
) RETURNS JSONB AS $$
DECLARE
    v_transaction_id UUID;
    v_balance_record inventory_balances%ROWTYPE;
    v_movement_id UUID;
    v_stock_before NUMERIC;
    v_stock_after NUMERIC;
    v_result JSONB;
BEGIN
    -- Idempotency check
    IF p_transaction_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM inventory_movements WHERE transaction_id = p_transaction_id AND item_id = p_item_id AND location_id = p_location_id AND direction = p_direction) THEN
            RAISE EXCEPTION 'Duplicate transaction %', p_transaction_id;
        END IF;
        v_transaction_id := p_transaction_id;
    ELSE
        v_transaction_id := gen_random_uuid();
    END IF;

    -- Input validation
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than 0';
    END IF;

    IF p_organization_id IS NULL THEN
        RAISE EXCEPTION 'p_organization_id cannot be null';
    END IF;

    -- Lock the balance row for update to prevent race conditions
    -- Handling NULL project_id carefully in the query
    IF p_project_id IS NULL THEN
        SELECT * INTO v_balance_record
        FROM inventory_balances
        WHERE organization_id = p_organization_id
          AND project_id IS NULL
          AND location_id = p_location_id
          AND item_id = p_item_id
        FOR UPDATE;
    ELSE
        SELECT * INTO v_balance_record
        FROM inventory_balances
        WHERE organization_id = p_organization_id
          AND project_id = p_project_id
          AND location_id = p_location_id
          AND item_id = p_item_id
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        -- Create initial balance if it doesn't exist
        INSERT INTO inventory_balances (
            organization_id, project_id, location_id, item_id, physical_quantity, reserved_quantity
        ) VALUES (
            p_organization_id, p_project_id, p_location_id, p_item_id, 0, 0
        ) RETURNING * INTO v_balance_record;
    END IF;

    v_stock_before := v_balance_record.physical_quantity;

    IF p_direction = 'IN' THEN
        v_stock_after := v_stock_before + p_quantity;
    ELSIF p_direction = 'OUT' THEN
        v_stock_after := v_stock_before - p_quantity;
        IF v_stock_after < 0 THEN
            RAISE EXCEPTION 'Insufficient stock. Current: %, Required: %', v_stock_before, p_quantity;
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid direction: %', p_direction;
    END IF;

    -- Update balance
    UPDATE inventory_balances
    SET physical_quantity = v_stock_after,
        updated_at = NOW()
    WHERE id = v_balance_record.id;

    -- Insert movement record
    INSERT INTO inventory_movements (
        organization_id, project_id, location_id, item_id, transaction_id, movement_date,
        movement_type, reference_type, reference_id, reference_number, direction, quantity, unit_cost, stock_before, stock_after, notes
    ) VALUES (
        p_organization_id, p_project_id, p_location_id, p_item_id, v_transaction_id, p_movement_date,
        p_reference_type, p_reference_type, p_reference_id, p_reference_number, p_direction, p_quantity, p_unit_cost, v_stock_before, v_stock_after, p_notes
    ) RETURNING id INTO v_movement_id;

    -- Prepare result
    v_result := jsonb_build_object(
        'movement_id', v_movement_id,
        'balance_id', v_balance_record.id,
        'stock_before', v_stock_before,
        'stock_after', v_stock_after,
        'transaction_id', v_transaction_id
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
