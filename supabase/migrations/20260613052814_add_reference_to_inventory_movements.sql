-- Add missing columns to inventory_movements table for Phase 2 Vertical Slice
ALTER TABLE inventory_movements
ADD COLUMN reference_type VARCHAR(50),
ADD COLUMN reference_id UUID,
ADD COLUMN unit_cost NUMERIC(18,4);
