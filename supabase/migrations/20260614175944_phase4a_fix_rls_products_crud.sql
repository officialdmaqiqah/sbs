-- Phase 4A Fix: Add missing columns and RLS policies
-- Schema alignment: add convenience columns used by provider test

-- Add customer_name, customer_phone, customer_address to sales_orders for direct text (no FK needed)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ;

-- Add driver and vehicle_number to sales_deliveries
ALTER TABLE sales_deliveries ADD COLUMN IF NOT EXISTS driver VARCHAR(255);
ALTER TABLE sales_deliveries ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);
ALTER TABLE sales_deliveries ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;
ALTER TABLE sales_deliveries ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE sales_deliveries ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Add sales_order_id alias (already named sales_order_id but check delivery_items)
ALTER TABLE sales_delivery_items ADD COLUMN IF NOT EXISTS sales_order_item_id UUID;
ALTER TABLE sales_delivery_items ADD COLUMN IF NOT EXISTS inventory_item_id UUID;
ALTER TABLE sales_delivery_items ADD COLUMN IF NOT EXISTS unit_hpp NUMERIC DEFAULT 0;

-- Add missing RLS policies
-- Products: Add ALL for CEO_ADMIN (only SELECT existed)
CREATE POLICY "CEO Admin ALL products" ON products
  FOR ALL
  USING (current_user_has_role('CEO_ADMIN'))
  WITH CHECK (current_user_has_role('CEO_ADMIN'));

-- Customers: Add ALL for CEO_ADMIN (only SELECT existed)
CREATE POLICY "CEO Admin ALL customers" ON customers
  FOR ALL
  USING (current_user_has_role('CEO_ADMIN'))
  WITH CHECK (current_user_has_role('CEO_ADMIN'));

-- Sales Orders read for org users
CREATE POLICY "Org users can read sales_orders" ON sales_orders
  FOR SELECT
  USING (user_in_org(organization_id));

-- Sales Order Items read for org users (using so_id column)
CREATE POLICY "Org users can read sales_order_items" ON sales_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders so
      WHERE so.id = sales_order_items.so_id
        AND user_in_org(so.organization_id)
    )
  );
