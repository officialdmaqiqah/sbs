-- 012_rls_policies.sql
-- Description: Row Level Security Policies
-- Enable RLS on all tables
CREATE OR REPLACE FUNCTION current_user_has_role(p_role_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    has_role BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.active = true
        AND r.code = p_role_code
        AND (ur.effective_end_date IS NULL OR ur.effective_end_date >= CURRENT_DATE)
    ) INTO has_role;
    RETURN has_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_worker_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cage_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cage_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE cage_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_recipe_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE flocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_chicken_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_feed_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_egg_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_distribution_investor_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_distribution_worker_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_distribution_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Helper to check if user is in an org
CREATE OR REPLACE FUNCTION user_in_org(p_org_id UUID) RETURNS BOOLEAN AS $$
    SELECT current_user_organization_id() = p_org_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Master data policies (e.g., items, suppliers, customers)
-- Everyone in org can read master data
CREATE POLICY "Org users can read master data" ON items FOR SELECT USING (user_in_org(organization_id));
CREATE POLICY "Org users can read suppliers" ON suppliers FOR SELECT USING (user_in_org(organization_id));
CREATE POLICY "Org users can read customers" ON customers FOR SELECT USING (user_in_org(organization_id));
CREATE POLICY "Org users can read products" ON products FOR SELECT USING (user_in_org(organization_id));
CREATE POLICY "Org users can read locations" ON inventory_locations FOR SELECT USING (user_in_org(organization_id));
CREATE POLICY "Org users can read COA" ON chart_of_accounts FOR SELECT USING (user_in_org(organization_id));

-- Admins can do ALL
CREATE POLICY "CEO Admin ALL items" ON items FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL movements" ON inventory_movements FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL attachments" ON attachments FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL accounting periods" ON accounting_periods FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL period snapshots" ON period_snapshots FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL COA" ON chart_of_accounts FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL journals" ON journal_entries FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL journal lines" ON journal_entry_lines FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL balances" ON inventory_balances FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL locations" ON inventory_locations FOR ALL USING (current_user_has_role('CEO_ADMIN'));
CREATE POLICY "CEO Admin ALL projects" ON projects FOR ALL USING (current_user_has_role('CEO_ADMIN'));

-- Projects
-- Users can see projects in their org
CREATE POLICY "Org users can see projects" ON projects FOR SELECT USING (user_in_org(organization_id));

-- Accounting / Finance
-- Finance role or CEO_ADMIN can read/write accounting
CREATE POLICY "Finance read accounting" ON journal_entries FOR SELECT USING (
    user_in_org(organization_id) AND 
    (current_user_has_permission('READ_ACCOUNTING') OR current_user_has_role('CEO_ADMIN'))
);

-- Investor Policies
-- Investors can only see their own investments
CREATE POLICY "Investors see own investments" ON project_investments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM investors i 
        WHERE i.id = project_investments.investor_id 
        AND i.user_id = auth.uid()
    )
    OR current_user_has_role('CEO_ADMIN')
    OR current_user_has_role('FINANCE')
);

CREATE POLICY "Investors see own payouts" ON profit_distribution_payouts FOR SELECT USING (
    recipient_user_id = auth.uid()
    OR (recipient_type = 'INVESTOR' AND EXISTS (
        SELECT 1 FROM investors i WHERE i.id = profit_distribution_payouts.recipient_investor_id AND i.user_id = auth.uid()
    ))
    OR current_user_has_role('CEO_ADMIN')
    OR current_user_has_role('FINANCE')
);

-- Worker Policies
-- Workers can see their own allocations and payouts
CREATE POLICY "Workers see own allocations" ON project_worker_allocations FOR SELECT USING (
    user_id = auth.uid()
    OR current_user_has_role('CEO_ADMIN')
    OR current_user_has_role('FINANCE')
);

-- Admin Fallback: Admins can do everything
-- This is a simplified fallback. In a real scenario we'd attach this to every table for ALL operations.
-- Example for organizations:
CREATE POLICY "Admins full access orgs" ON organizations FOR ALL USING (
    id = current_user_organization_id() AND current_user_has_role('CEO_ADMIN')
);

-- Note: In Phase 1, we rely heavily on the RPC functions (which are SECURITY DEFINER) to bypass RLS for complex writes,
-- while RLS is primarily used to restrict SELECT statements on the frontend.

-- Catch-all generator to ensure 100% RLS coverage for any newly created tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Enable RLS for all business tables
    FOR r IN (
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND c.relname NOT LIKE 'schema_migrations%'
          AND c.relname NOT LIKE 'seed_files%'
          AND c.relrowsecurity = false
    ) LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', r.relname);
    END LOOP;
    
    -- Create CEO_ADMIN policy for all business tables that don't have policies
    FOR r IN (
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND c.relname NOT LIKE 'schema_migrations%'
          AND c.relname NOT LIKE 'seed_files%'
          AND c.oid NOT IN (SELECT polrelid FROM pg_policy)
    ) LOOP
        EXECUTE format('CREATE POLICY "CEO Admin ALL %I" ON %I FOR ALL USING (current_user_has_role(''CEO_ADMIN''));', r.relname, r.relname);
    END LOOP;
END $$;
