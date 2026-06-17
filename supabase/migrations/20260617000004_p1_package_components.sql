-- 20260617000004_p1_package_components.sql
-- Modify package_components to reference items table instead of packages table
-- Because the frontend uses items (item_type = 'PACKAGE') as packages.

ALTER TABLE package_components
DROP CONSTRAINT IF EXISTS package_components_package_id_fkey;

ALTER TABLE package_components
ADD CONSTRAINT package_components_package_id_fkey 
FOREIGN KEY (package_id) REFERENCES items(id) ON DELETE CASCADE;

-- Add component_type and required columns if not exists
ALTER TABLE package_components ADD COLUMN IF NOT EXISTS component_type VARCHAR(50) DEFAULT 'Lainnya';
ALTER TABLE package_components ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT true;
