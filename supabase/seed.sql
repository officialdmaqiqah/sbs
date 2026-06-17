-- supabase/seed.sql
-- Description: Initial seed data for SBS Application

-- 1. Organization
INSERT INTO organizations (id, code, name, legal_name, currency, timezone, active)
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'SBS', 
    'Sistem Bisnis SBS', 
    'PT. SBS', 
    'IDR', 
    'Asia/Jakarta', 
    true
) ON CONFLICT (code) DO NOTHING;

-- 2. Default Roles
INSERT INTO roles (id, organization_id, code, name, description) VALUES
('22222222-2222-2222-2222-100000000001', '11111111-1111-1111-1111-111111111111', 'CEO_ADMIN', 'CEO / Admin', 'Full access to all modules and settings'),
('22222222-2222-2222-2222-100000000002', '11111111-1111-1111-1111-111111111111', 'FINANCE', 'Finance', 'Access to accounting, payments, and financial reports'),
('22222222-2222-2222-2222-100000000003', '11111111-1111-1111-1111-111111111111', 'PRODUCTION', 'Production', 'Manage cages, feed, and daily records'),
('22222222-2222-2222-2222-100000000004', '11111111-1111-1111-1111-111111111111', 'DISTRIBUTION', 'Distribution', 'Manage sales, deliveries, and returns'),
('22222222-2222-2222-2222-100000000005', '11111111-1111-1111-1111-111111111111', 'WAREHOUSE', 'Warehouse', 'Manage inventory, receipts, and stock opname'),
('22222222-2222-2222-2222-100000000006', '11111111-1111-1111-1111-111111111111', 'REVIEWER', 'Reviewer', 'Read-only access for auditing'),
('22222222-2222-2222-2222-100000000007', '11111111-1111-1111-1111-111111111111', 'WORKER', 'Worker', 'Access to personal tasks and allocations'),
('22222222-2222-2222-2222-100000000008', '11111111-1111-1111-1111-111111111111', 'INVESTOR', 'Investor', 'Access to investment portfolio and project reports')
ON CONFLICT (organization_id, code) DO NOTHING;

-- 3. Permissions (Basic subset for MVP)
INSERT INTO permissions (id, code, name, module, action) VALUES
('33333333-3333-3333-3333-100000000001', 'MANAGE_USERS', 'Manage Users', 'AUTH', 'ALL'),
('33333333-3333-3333-3333-100000000002', 'READ_ACCOUNTING', 'Read Accounting', 'FINANCE', 'READ'),
('33333333-3333-3333-3333-100000000003', 'WRITE_ACCOUNTING', 'Write Accounting', 'FINANCE', 'WRITE'),
('33333333-3333-3333-3333-100000000004', 'MANAGE_INVENTORY', 'Manage Inventory', 'INVENTORY', 'ALL'),
('33333333-3333-3333-3333-100000000005', 'MANAGE_SALES', 'Manage Sales', 'SALES', 'ALL')
ON CONFLICT (code) DO NOTHING;

-- 4. Map Permissions to Roles (CEO gets everything)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'CEO_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'FINANCE' AND p.module = 'FINANCE'
ON CONFLICT DO NOTHING;

-- 5. Accounting Settings
INSERT INTO accounting_settings (organization_id, fiscal_year_start_month, default_currency)
VALUES ('11111111-1111-1111-1111-111111111111', 1, 'IDR')
ON CONFLICT (organization_id) DO NOTHING;

-- 6. Basic Chart of Accounts
INSERT INTO chart_of_accounts (id, organization_id, code, name, type, category, is_group) VALUES
('44444444-4444-4444-4444-100000000001', '11111111-1111-1111-1111-111111111111', '1000', 'Assets', 'Asset', 'Asset', true),
('44444444-4444-4444-4444-100000000002', '11111111-1111-1111-1111-111111111111', '1100', 'Cash and Cash Equivalents', 'Asset', 'Cash', true),
('44444444-4444-4444-4444-100000000003', '11111111-1111-1111-1111-111111111111', '1101', 'Petty Cash', 'Asset', 'Cash', false),
('44444444-4444-4444-4444-100000000004', '11111111-1111-1111-1111-111111111111', '1102', 'Bank BCA', 'Asset', 'Cash', false),
('44444444-4444-4444-4444-100000000005', '11111111-1111-1111-1111-111111111111', '1200', 'Accounts Receivable', 'Asset', 'Accounts Receivable', false),
('44444444-4444-4444-4444-100000000006', '11111111-1111-1111-1111-111111111111', '1300', 'Inventory', 'Asset', 'Inventory', false),
('44444444-4444-4444-4444-200000000001', '11111111-1111-1111-1111-111111111111', '2000', 'Liabilities', 'Liability', 'Liability', true),
('44444444-4444-4444-4444-200000000002', '11111111-1111-1111-1111-111111111111', '2100', 'Accounts Payable', 'Liability', 'Accounts Payable', false),
('44444444-4444-4444-4444-300000000001', '11111111-1111-1111-1111-111111111111', '3000', 'Equity', 'Equity', 'Equity', true),
('44444444-4444-4444-4444-300000000002', '11111111-1111-1111-1111-111111111111', '3100', 'Paid-in Capital', 'Equity', 'Equity', false),
('44444444-4444-4444-4444-400000000001', '11111111-1111-1111-1111-111111111111', '4000', 'Revenue', 'Revenue', 'Revenue', true),
('44444444-4444-4444-4444-400000000002', '11111111-1111-1111-1111-111111111111', '4100', 'Sales Revenue', 'Revenue', 'Revenue', false),
('44444444-4444-4444-4444-500000000001', '11111111-1111-1111-1111-111111111111', '5000', 'Expenses', 'Expense', 'Expense', true),
('44444444-4444-4444-4444-500000000002', '11111111-1111-1111-1111-111111111111', '5100', 'Cost of Goods Sold', 'Expense', 'Expense', false)
ON CONFLICT (organization_id, code) DO NOTHING;

-- Update parent IDs
UPDATE chart_of_accounts SET parent_id = '44444444-4444-4444-4444-100000000001' WHERE code IN ('1100', '1200', '1300');
UPDATE chart_of_accounts SET parent_id = '44444444-4444-4444-4444-100000000002' WHERE code IN ('1101', '1102');
UPDATE chart_of_accounts SET parent_id = '44444444-4444-4444-4444-200000000001' WHERE code IN ('2100');
UPDATE chart_of_accounts SET parent_id = '44444444-4444-4444-4444-300000000001' WHERE code IN ('3100');
UPDATE chart_of_accounts SET parent_id = '44444444-4444-4444-4444-400000000001' WHERE code IN ('4100');
UPDATE chart_of_accounts SET parent_id = '44444444-4444-4444-4444-500000000001' WHERE code IN ('5100');

-- 7. Accounting Mappings
INSERT INTO accounting_mappings (organization_id, mapping_key, account_id, description) VALUES
('11111111-1111-1111-1111-111111111111', 'INVENTORY_ASSET', '44444444-4444-4444-4444-100000000006', 'Default inventory asset account'),
('11111111-1111-1111-1111-111111111111', 'SALES_REVENUE', '44444444-4444-4444-4444-400000000002', 'Default sales revenue account'),
('11111111-1111-1111-1111-111111111111', 'COGS', '44444444-4444-4444-4444-500000000002', 'Default cost of goods sold account')
ON CONFLICT (organization_id, mapping_key) DO NOTHING;

-- 8. Default Cage Types
INSERT INTO cage_types (id, organization_id, code, name, capacity) VALUES
('55555555-5555-5555-5555-100000000001', '11111111-1111-1111-1111-111111111111', 'CT-01', 'Kandang Standard', 500)
ON CONFLICT (organization_id, code) DO NOTHING;

-- Seed admin user setup is generally handled via Supabase dashboard or script executing `auth.users` insert directly,
-- but standard practice in seed.sql is to let the developer sign up and manually link, or use standard mock user.
-- Since we are in development, we won't seed actual users here to avoid exposing passwords, 
-- but you can link a created auth.user to `profiles` and `user_roles` later.

-- 9. Paket SBS Resmi
INSERT INTO packages (id, organization_id, code, name, description, price) VALUES
('66666666-6666-6666-6666-100000000001', '11111111-1111-1111-1111-111111111111', 'PKG-SUL-PLAT', 'Sultan Platinum', 'Paket Sultan Platinum', 28000000.00),
('66666666-6666-6666-6666-100000000002', '11111111-1111-1111-1111-111111111111', 'PKG-SUL-GOLD', 'Sultan Gold', 'Paket Sultan Gold', 28000000.00),
('66666666-6666-6666-6666-100000000003', '11111111-1111-1111-1111-111111111111', 'PKG-SUL-PRIME', 'Sultan Prime', 'Paket Sultan Prime', 15000000.00),
('66666666-6666-6666-6666-100000000004', '11111111-1111-1111-1111-111111111111', 'PKG-SUL-GROW', 'Sultan Grow', 'Paket Sultan Grow', 15000000.00),
('66666666-6666-6666-6666-100000000005', '11111111-1111-1111-1111-111111111111', 'PKG-SUL-STARTER', 'Sultan Starter', 'Paket Sultan Starter', 7750000.00),
('66666666-6666-6666-6666-100000000006', '11111111-1111-1111-1111-111111111111', 'PKG-SUL-FAVORIT', 'Sultan Favorit', 'Paket Sultan Favorit', 6000000.00),
('66666666-6666-6666-6666-100000000007', '11111111-1111-1111-1111-111111111111', 'PKG-EKO-BERKAH', 'Ekonomis Berkah', 'Paket Ekonomis Berkah', 3000000.00)
ON CONFLICT (organization_id, code) DO NOTHING;

-- test_users.sql
-- Creates mock users in auth.users and links them to profiles and roles

DO $$
DECLARE
    org_id UUID := '11111111-1111-1111-1111-111111111111';
    
    ceo_uid UUID := gen_random_uuid();
    fin_uid UUID := gen_random_uuid();
    wrk_uid UUID := gen_random_uuid();
    inv_uid UUID := gen_random_uuid();
    whs_uid UUID := gen_random_uuid();
    
    role_ceo UUID := '22222222-2222-2222-2222-100000000001';
    role_fin UUID := '22222222-2222-2222-2222-100000000002';
    role_wrk UUID := '22222222-2222-2222-2222-100000000007';
    role_inv UUID := '22222222-2222-2222-2222-100000000008';
    role_whs UUID := '22222222-2222-2222-2222-100000000005';
BEGIN
    -- 1. Insert into auth.users (password: password123)
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES
    (ceo_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ceo@sbs.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (fin_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'finance@sbs.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (wrk_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker@sbs.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (inv_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'investor@sbs.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (whs_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'warehouse@sbs.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', '');

    -- 2. Insert into auth.identities
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES
    (gen_random_uuid(), ceo_uid, ceo_uid::text, format('{"sub":"%s","email":"ceo@sbs.com"}', ceo_uid)::jsonb, 'email', now(), now(), now()),
    (gen_random_uuid(), fin_uid, fin_uid::text, format('{"sub":"%s","email":"finance@sbs.com"}', fin_uid)::jsonb, 'email', now(), now(), now()),
    (gen_random_uuid(), wrk_uid, wrk_uid::text, format('{"sub":"%s","email":"worker@sbs.com"}', wrk_uid)::jsonb, 'email', now(), now(), now()),
    (gen_random_uuid(), inv_uid, inv_uid::text, format('{"sub":"%s","email":"investor@sbs.com"}', inv_uid)::jsonb, 'email', now(), now(), now()),
    (gen_random_uuid(), whs_uid, whs_uid::text, format('{"sub":"%s","email":"warehouse@sbs.com"}', whs_uid)::jsonb, 'email', now(), now(), now());

    -- 3. Insert into public.profiles
    INSERT INTO public.profiles (id, organization_id, full_name, phone, active) VALUES
    (ceo_uid, org_id, 'Test CEO', '0811', true),
    (fin_uid, org_id, 'Test Finance', '0812', true),
    (wrk_uid, org_id, 'Test Worker', '0813', true),
    (inv_uid, org_id, 'Test Investor', '0814', true),
    (whs_uid, org_id, 'Test Warehouse', '0815', true);

    -- 4. Assign Roles
    INSERT INTO user_roles (user_id, organization_id, role_id, active) VALUES
    (ceo_uid, org_id, role_ceo, true),
    (fin_uid, org_id, role_fin, true),
    (wrk_uid, org_id, role_wrk, true),
    (inv_uid, org_id, role_inv, true),
    (whs_uid, org_id, role_whs, true);
END $$;

