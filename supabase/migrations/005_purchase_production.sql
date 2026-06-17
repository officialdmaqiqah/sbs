-- 005_purchase_production.sql
-- Description: Purchasing and Production (Cage & Feed)

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    po_number VARCHAR(50) NOT NULL,
    po_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Approved, Partially Received, Completed, Cancelled
    total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, po_number)
);

CREATE TRIGGER update_purchase_orders_modtime
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(18,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(18,2) NOT NULL CHECK (total_price >= 0),
    received_quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    CHECK (received_quantity <= quantity)
);

CREATE TABLE purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) NOT NULL,
    receipt_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted, Cancelled
    transaction_id UUID, -- Links to inventory_movements
    reversal_transaction_id UUID, -- Links to reversing movements if cancelled
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, receipt_number)
);

CREATE TRIGGER update_purchase_receipts_modtime
    BEFORE UPDATE ON purchase_receipts
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE purchase_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    po_item_id UUID NOT NULL REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Cage Production
CREATE TABLE cage_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TRIGGER update_cage_types_modtime
    BEFORE UPDATE ON cage_types
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE cage_boms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cage_type_id UUID NOT NULL REFERENCES cage_types(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(cage_type_id, version)
);

CREATE TRIGGER update_cage_boms_modtime
    BEFORE UPDATE ON cage_boms
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE cage_bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES cage_boms(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(bom_id, item_id)
);

CREATE TABLE production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    target_location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
    production_number VARCHAR(50) NOT NULL,
    production_date DATE NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'CAGE' or 'FEED'
    reference_id UUID, -- e.g., cage_bom_id or feed_recipe_version_id
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Completed, Cancelled
    transaction_id UUID, -- Logical grouping for movements
    reversal_transaction_id UUID,
    total_cost NUMERIC(18,2) DEFAULT 0, -- Costing status
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, production_number)
);

CREATE TRIGGER update_production_orders_modtime
    BEFORE UPDATE ON production_orders
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE production_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INPUT', 'OUTPUT')),
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(18,2) DEFAULT 0,
    total_cost NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Feed Production
CREATE TABLE feed_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    target_item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TRIGGER update_feed_recipes_modtime
    BEFORE UPDATE ON feed_recipes
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE feed_recipe_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES feed_recipes(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    effective_date DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(recipe_id, version)
);

CREATE TRIGGER update_feed_recipe_versions_modtime
    BEFORE UPDATE ON feed_recipe_versions
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE feed_recipe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES feed_recipe_versions(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(version_id, item_id)
);
