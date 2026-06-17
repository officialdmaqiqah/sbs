-- Drop the old varchar signature function if it exists to avoid PGRST203 ambiguity
DROP FUNCTION IF EXISTS public.receive_purchase_order(
    p_organization_id uuid,
    p_purchase_order_id character varying,
    p_receipt_number character varying,
    p_receipt_date date,
    p_warehouse_location_id uuid,
    p_project_id uuid,
    p_supplier_id character varying,
    p_items jsonb,
    p_reference character varying,
    p_notes text,
    p_transaction_id uuid,
    p_created_by uuid
);
