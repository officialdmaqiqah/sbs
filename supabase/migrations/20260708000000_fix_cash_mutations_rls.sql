-- Enable RLS (already enabled in previous migration, but good to be safe)
ALTER TABLE cash_bank_mutations ENABLE ROW LEVEL SECURITY;

-- Drop any accidentally recreated policies just in case
DROP POLICY IF EXISTS "CEO and Admin can manage cash mutations" ON cash_bank_mutations;
DROP POLICY IF EXISTS "Finance can manage cash mutations" ON cash_bank_mutations;
DROP POLICY IF EXISTS "Users can manage cash mutations" ON cash_bank_mutations;

-- Recreate proper policies for cash_bank_mutations
CREATE POLICY "Users can manage cash mutations"
ON cash_bank_mutations
FOR ALL
USING (
  current_user_has_role('CEO_ADMIN') OR current_user_has_role('FINANCE')
)
WITH CHECK (
  current_user_has_role('CEO_ADMIN') OR current_user_has_role('FINANCE')
);
