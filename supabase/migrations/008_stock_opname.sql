-- 008_stock_opname.sql
-- Description: Stock Opname (Inventory Physical Count)

CREATE TABLE stock_opnames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
    opname_number VARCHAR(50) NOT NULL,
    opname_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, In Progress, Submitted, Approved, Posted, Cancelled
    notes TEXT,
    snapshot_time TIMESTAMPTZ, -- Time when the initial snapshot was taken
    transaction_id UUID, -- For adjustment movements
    reversal_transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, opname_number)
);

CREATE TRIGGER update_stock_opnames_modtime
    BEFORE UPDATE ON stock_opnames
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE stock_opname_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opname_id UUID NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    system_qty NUMERIC(18,4) NOT NULL DEFAULT 0, -- Snapshot of system quantity
    actual_qty NUMERIC(18,4), -- Input from physical count
    difference_qty NUMERIC(18,4), -- Computed: actual_qty - system_qty
    concurrency_override BOOLEAN DEFAULT false, -- If system_qty changed since snapshot, user must acknowledge
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(opname_id, item_id)
);
