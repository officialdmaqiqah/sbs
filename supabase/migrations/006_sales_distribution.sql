-- 006_sales_distribution.sql
-- Description: Sales and Distribution

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'New', -- New, Contacted, Qualified, Lost, Converted
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_leads_modtime
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE resellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    level VARCHAR(50) NOT NULL DEFAULT 'Standard',
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, customer_id)
);

CREATE TRIGGER update_resellers_modtime
    BEFORE UPDATE ON resellers
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    so_number VARCHAR(50) NOT NULL,
    so_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Confirmed, Partially Delivered, Completed, Cancelled
    total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, so_number)
);

CREATE TRIGGER update_sales_orders_modtime
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    so_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(18,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(18,2) NOT NULL CHECK (total_price >= 0),
    delivered_quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    CHECK (delivered_quantity <= quantity)
);

CREATE TABLE delivery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    so_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
    do_number VARCHAR(50) NOT NULL,
    delivery_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Dispatched, Delivered, Cancelled
    dispatch_transaction_id UUID, -- For inventory OUT
    reversal_transaction_id UUID,
    customer_acceptance_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, do_number)
);

CREATE TRIGGER update_delivery_orders_modtime
    BEFORE UPDATE ON delivery_orders
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE delivery_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    so_item_id UUID NOT NULL REFERENCES sales_order_items(id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT, -- The actual physical item
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    hpp_snapshot NUMERIC(18,2) DEFAULT 0, -- Snapshot of Cost of Goods Sold at time of dispatch
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    delivery_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE RESTRICT,
    return_number VARCHAR(50) NOT NULL,
    return_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Received, Processed, Cancelled
    transaction_id UUID, -- For inventory IN (if returned to stock)
    reversal_transaction_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, return_number)
);

CREATE TRIGGER update_sales_returns_modtime
    BEFORE UPDATE ON sales_returns
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE sales_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    delivery_item_id UUID NOT NULL REFERENCES delivery_order_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    condition VARCHAR(50) NOT NULL, -- Good, Damaged
    decision VARCHAR(50) NOT NULL, -- Return to Stock, Write-off
    created_at TIMESTAMPTZ DEFAULT now()
);
