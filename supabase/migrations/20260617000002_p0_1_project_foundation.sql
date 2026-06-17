-- 20260617000002_p0_1_project_foundation.sql

-- 1. Modify `projects` table
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS target_notes TEXT;

-- 2. Modify `project_members` table
ALTER TABLE project_members 
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS member_name VARCHAR(255);

-- Check Constraint to ensure at least one is provided
ALTER TABLE project_members
  ADD CONSTRAINT project_members_identity_check 
  CHECK (user_id IS NOT NULL OR member_name IS NOT NULL);

-- 3. Modify `project_investments` table
ALTER TABLE project_investments
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50), -- 'Cash', 'Bank', 'Other'
  ADD COLUMN IF NOT EXISTS cash_bank_id UUID REFERENCES cash_bank_accounts(id),
  ADD COLUMN IF NOT EXISTS is_synced_to_cash BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Create RLS Policies for new/modified columns and flows if needed
-- (Inherits existing RLS mostly, but let's make sure project_members and project_investments are accessible)

-- project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON project_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_members;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON project_members;

CREATE POLICY "Enable read access for all authenticated users" ON project_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "CEO and Admin can manage project members" ON project_members FOR ALL USING (
  current_user_has_role('CEO_ADMIN')
);

-- project_investments
ALTER TABLE project_investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON project_investments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_investments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON project_investments;

CREATE POLICY "Enable read access for all authenticated users" ON project_investments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "CEO Admin and Finance can manage project investments" ON project_investments FOR ALL USING (
  current_user_has_role('CEO_ADMIN') OR current_user_has_role('FINANCE')
);

-- investors
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON investors;
CREATE POLICY "Enable read access for all authenticated users" ON investors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "CEO Admin and Finance can manage investors" ON investors FOR ALL USING (
  current_user_has_role('CEO_ADMIN') OR current_user_has_role('FINANCE')
);
