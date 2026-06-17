-- 011_functions.sql
-- Description: RPC Functions for atomic transactions

-- Generic function to get current user's organization
CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM profiles
    WHERE id = auth.uid();
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has permission
CREATE OR REPLACE FUNCTION current_user_has_permission(p_permission_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid()
        AND ur.active = true
        AND p.code = p_permission_code
        AND (ur.effective_end_date IS NULL OR ur.effective_end_date >= CURRENT_DATE)
    ) INTO has_perm;
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Inventory Posting
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
    SELECT * INTO v_balance_record
    FROM inventory_balances
    WHERE organization_id = p_organization_id
      AND project_id = p_project_id
      AND location_id = p_location_id
      AND item_id = p_item_id
    FOR UPDATE;

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

-- 2. Journal Posting
CREATE OR REPLACE FUNCTION post_journal(
    p_organization_id UUID,
    p_journal_number VARCHAR,
    p_journal_date DATE,
    p_description TEXT,
    p_source_type VARCHAR,
    p_source_id UUID,
    p_event_type VARCHAR,
    p_lines JSONB -- Array of { account_id, project_id, debit, credit, description }
) RETURNS UUID AS $$
DECLARE
    v_journal_id UUID;
    v_total_debit NUMERIC := 0;
    v_total_credit NUMERIC := 0;
    v_line JSONB;
    v_period_id UUID;
BEGIN
    -- Check period is open
    SELECT id INTO v_period_id
    FROM accounting_periods
    WHERE organization_id = p_organization_id
      AND status = 'Open'
      AND p_journal_date >= start_date
      AND p_journal_date <= end_date;

    IF v_period_id IS NULL THEN
        RAISE EXCEPTION 'No open accounting period found for date %', p_journal_date;
    END IF;

    -- Validate balance
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::NUMERIC, 0);
        v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::NUMERIC, 0);
    END LOOP;

    IF v_total_debit <> v_total_credit THEN
        RAISE EXCEPTION 'Journal is not balanced. Debit: %, Credit: %', v_total_debit, v_total_credit;
    END IF;

    -- Insert Header
    INSERT INTO journal_entries (
        organization_id, journal_number, journal_date, description,
        status, source_type, source_id, event_type, created_by
    ) VALUES (
        p_organization_id, p_journal_number, p_journal_date, p_description,
        'Posted', p_source_type, p_source_id, p_event_type, auth.uid()
    ) RETURNING id INTO v_journal_id;

    -- Insert Lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        INSERT INTO journal_entry_lines (
            journal_id, account_id, project_id, debit, credit, description
        ) VALUES (
            v_journal_id,
            (v_line->>'account_id')::UUID,
            NULLIF(v_line->>'project_id', '')::UUID,
            COALESCE((v_line->>'debit')::NUMERIC, 0),
            COALESCE((v_line->>'credit')::NUMERIC, 0),
            v_line->>'description'
        );

        -- Update Period Snapshot (simplified, typically done async or end of month, but doing it here for completeness)
        INSERT INTO period_snapshots (period_id, account_id, project_id, opening_balance, net_change, closing_balance)
        VALUES (
            v_period_id,
            (v_line->>'account_id')::UUID,
            NULLIF(v_line->>'project_id', '')::UUID,
            0,
            COALESCE((v_line->>'debit')::NUMERIC, 0) - COALESCE((v_line->>'credit')::NUMERIC, 0),
            COALESCE((v_line->>'debit')::NUMERIC, 0) - COALESCE((v_line->>'credit')::NUMERIC, 0)
        )
        ON CONFLICT (period_id, account_id, project_id)
        DO UPDATE SET
            net_change = period_snapshots.net_change + EXCLUDED.net_change,
            closing_balance = period_snapshots.closing_balance + EXCLUDED.net_change;
    END LOOP;

    RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql;

-- Stubs for other RPCs (to be fully implemented in Phase 2 or when specific feature is migrated)
-- They return true for now to allow local testing if called.
CREATE OR REPLACE FUNCTION reverse_inventory_transaction(p_transaction_id UUID) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION receive_purchase_order(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION complete_cage_production(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION reverse_cage_production(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION complete_feed_production(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION reverse_feed_production(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION post_stock_opname(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION post_daily_chicken_record(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION reserve_sales_order_stock(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION release_sales_order_stock(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION dispatch_delivery(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION reverse_delivery_dispatch(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION reverse_journal(p_journal_id UUID) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION allocate_customer_payment(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION reverse_customer_payment(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION allocate_supplier_payment(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION reverse_supplier_payment(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION close_accounting_period(p_period_id UUID) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION reopen_accounting_period(p_period_id UUID) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION close_project(p_project_id UUID) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION reopen_project(p_project_id UUID) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION post_profit_distribution(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION post_profit_payout(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION reverse_profit_payout(p_payload JSONB) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;

-- 4. Schema Security Scanner
CREATE OR REPLACE FUNCTION scan_rls_schema()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count BIGINT,
    has_using_true BOOLEAN,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH business_tables AS (
        SELECT c.relname::TEXT as t_name,
               c.relrowsecurity as rls_en
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
    ),
    policies AS (
        SELECT c.relname::TEXT as tablename,
               COUNT(*)::BIGINT as cnt,
               BOOL_OR(pg_get_expr(p.polqual, p.polrelid) = 'true' OR pg_get_expr(p.polwithcheck, p.polrelid) = 'true') as has_using_true
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        GROUP BY c.relname
    )
    SELECT
        b.t_name,
        b.rls_en,
        COALESCE(p.cnt, 0),
        COALESCE(p.has_using_true, false),
        CASE
            WHEN NOT b.rls_en THEN 'FAIL_NO_RLS'
            WHEN COALESCE(p.cnt, 0) = 0 THEN 'FAIL_NO_POLICY'
            WHEN COALESCE(p.has_using_true, false) THEN 'FAIL_USING_TRUE'
            ELSE 'PASS'
        END
    FROM business_tables b
    LEFT JOIN policies p ON p.tablename = b.t_name
    WHERE b.t_name NOT LIKE 'schema_migrations%'
      AND b.t_name NOT LIKE 'seed_files%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
