-- 013_indexes_constraints.sql
-- Description: Additional Indexes and Constraints

-- Additional composite indexes for performance

-- Accounting reporting index
CREATE INDEX idx_journal_lines_account_project ON journal_entry_lines(account_id, project_id);

-- Inventory reporting index
CREATE INDEX idx_inventory_movements_org_item_date ON inventory_movements(organization_id, item_id, movement_date);

-- Check constraints were mostly added inline during table creation.
-- Ensure we don't have overlapping user roles without an end date
CREATE UNIQUE INDEX idx_user_roles_active_unique ON user_roles(user_id, organization_id, role_id, project_id) WHERE active = true;

-- Ensure that an active inventory location cannot be deactivated if there is stock
-- This is typically handled at the application or RPC layer, but complex constraints can be added here if needed.
