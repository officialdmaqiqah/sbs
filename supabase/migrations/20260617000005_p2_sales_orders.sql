-- 20260617000005_p2_sales_orders.sql

-- 1. Modify sales_order_items to reference items table instead of products table
-- Because the frontend uses items (item_type = 'PRODUCT' or 'PACKAGE') as products/packages.
ALTER TABLE sales_order_items
DROP CONSTRAINT IF EXISTS sales_order_items_product_id_fkey;

ALTER TABLE sales_order_items
ADD CONSTRAINT sales_order_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES items(id) ON DELETE RESTRICT;

-- 2. Add columns for payment and stock deduction tracking
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Tunai';
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Belum Lunas';
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS stock_processed_at TIMESTAMPTZ;
