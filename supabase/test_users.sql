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
    (ceo_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ceo@sbs.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (fin_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'finance@sbs.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (wrk_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker@sbs.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (inv_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'investor@sbs.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (whs_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'warehouse@sbs.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', '');

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
