BEGIN;
SET LOCAL request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';
SELECT pay_customer_invoice(
    '11111111-1111-1111-1111-111111111111'::uuid,
    NULL,
    'a41a5a79-5c21-4322-a8a3-5b2db897d7c0'::uuid,
    '9b445dd2-7fec-4f6a-9b8a-749d44a54be5'::uuid,
    'PAY-TEST',
    '2026-06-15',
    1000,
    NULL,
    NULL,
    '11111111-1111-1111-1111-111111111111'::uuid
);
ROLLBACK;
