-- Fix: Enable RLS on supplier_bill_lines table and add appropriate policies
-- This table was created in phase3b migration without RLS

ALTER TABLE supplier_bill_lines ENABLE ROW LEVEL SECURITY;

-- Policy: CEO_ADMIN can do all operations on supplier_bill_lines
CREATE POLICY "CEO Admin ALL supplier_bill_lines"
  ON supplier_bill_lines
  FOR ALL
  USING (current_user_has_role('CEO_ADMIN'));

-- Policy: FINANCE can read and write supplier_bill_lines
CREATE POLICY "FINANCE rw supplier_bill_lines"
  ON supplier_bill_lines
  FOR ALL
  USING (current_user_has_role('FINANCE'))
  WITH CHECK (current_user_has_role('FINANCE'));

-- Policy: WAREHOUSE can read supplier_bill_lines (for receiving reference)
CREATE POLICY "WAREHOUSE read supplier_bill_lines"
  ON supplier_bill_lines
  FOR SELECT
  USING (current_user_has_role('WAREHOUSE'));
