-- 20260617000007_p4_production.sql

-- 1. Modify production_orders to support simple ad-hoc production
ALTER TABLE production_orders ALTER COLUMN target_location_id DROP NOT NULL;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS batch_name VARCHAR(255);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- 2. Create production_costs table
CREATE TABLE IF NOT EXISTS production_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    production_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    cost_date DATE NOT NULL,
    cost_type VARCHAR(50) NOT NULL, -- Upah, Listrik, Lainnya
    amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
    cash_bank_id UUID REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_production_costs_modtime
    BEFORE UPDATE ON production_costs
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_production_orders_project_id ON production_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_production_costs_project_id ON production_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_production_costs_production_id ON production_costs(production_id);

-- 4. Enable RLS for production_costs
ALTER TABLE production_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO and Admin can manage production costs"
ON production_costs
FOR ALL
USING (
  current_user_has_role('CEO_ADMIN')
);

CREATE POLICY "Produksi and Finance can view production costs"
ON production_costs
FOR SELECT
USING (
  current_user_has_role('FINANCE') OR current_user_has_role('WAREHOUSE')
);

CREATE POLICY "Produksi can manage production costs"
ON production_costs
FOR ALL
USING (
  current_user_has_role('WAREHOUSE')
);
