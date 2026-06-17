-- 20260617000006_p3_distribution.sql

-- 1. Modify delivery_orders to serve as distribution_shipments
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE RESTRICT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255);
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);

-- Make location_id nullable since we don't strictly use complex warehouse locations right now
ALTER TABLE delivery_orders ALTER COLUMN location_id DROP NOT NULL;

-- 2. Create distribution_costs table
CREATE TABLE IF NOT EXISTS distribution_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    shipment_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    cost_date DATE NOT NULL,
    cost_type VARCHAR(50) NOT NULL, -- BBM, Tol/Parkir, Upah Kirim, Lainnya
    amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
    cash_bank_id UUID REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_distribution_costs_modtime
    BEFORE UPDATE ON distribution_costs
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_delivery_orders_project_id ON delivery_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_distribution_costs_project_id ON distribution_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_distribution_costs_shipment_id ON distribution_costs(shipment_id);

-- 4. Enable RLS for distribution_costs
ALTER TABLE distribution_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO and Admin can manage distribution costs"
ON distribution_costs
FOR ALL
USING (
  current_user_has_role('CEO_ADMIN')
);

CREATE POLICY "Distribusi and Finance can view distribution costs"
ON distribution_costs
FOR SELECT
USING (
  current_user_has_role('FINANCE') OR current_user_has_role('WAREHOUSE')
);

CREATE POLICY "Distribusi can manage distribution costs"
ON distribution_costs
FOR ALL
USING (
  current_user_has_role('WAREHOUSE')
);
