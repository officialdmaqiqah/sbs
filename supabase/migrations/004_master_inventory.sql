-- 004_master_inventory.sql
-- Description: Master data and core inventory tables

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    uom VARCHAR(50) NOT NULL, -- Unit of Measure
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TRIGGER update_items_modtime
    BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Warehouse',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TRIGGER update_inventory_locations_modtime
    BEFORE UPDATE ON inventory_locations
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE inventory_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    physical_quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
    reserved_quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
    -- Available quantity can be computed or enforced via constraint: physical_quantity - reserved_quantity >= 0
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, project_id, location_id, item_id),
    CHECK (physical_quantity >= 0),
    CHECK (reserved_quantity >= 0),
    CHECK (physical_quantity >= reserved_quantity)
);

CREATE TRIGGER update_inventory_balances_modtime
    BEFORE UPDATE ON inventory_balances
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL, -- Logical grouping for atomic transactions
    movement_date DATE NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- Receipt, Issue, Transfer, Adjustment
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('IN', 'OUT')),
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    stock_before NUMERIC(18,4) NOT NULL,
    stock_after NUMERIC(18,4) NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    reversal_of_movement_id UUID REFERENCES inventory_movements(id), -- Nullable, set if this reverses another movement
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index for fast movement lookups
CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_project ON inventory_movements(project_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(movement_date);
CREATE INDEX idx_inventory_movements_tx ON inventory_movements(transaction_id);

CREATE TABLE inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    reference_type VARCHAR(50) NOT NULL, -- e.g., 'SALES_ORDER'
    reference_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Released, Consumed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_inventory_reservations_modtime
    BEFORE UPDATE ON inventory_reservations
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- External Partners
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TRIGGER update_suppliers_modtime
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TRIGGER update_customers_modtime
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Products (Sellable items)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(18,2) NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, code),
    UNIQUE(organization_id, item_id)
);

CREATE TRIGGER update_products_modtime
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Packages (Bundles of items/products)
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(18,2) NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TRIGGER update_packages_modtime
    BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE package_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(package_id, item_id)
);
