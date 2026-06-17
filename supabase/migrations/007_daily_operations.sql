-- 007_daily_operations.sql
-- Description: Daily operations, flocks, and biological records

CREATE TABLE flocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
    flock_number VARCHAR(50) NOT NULL,
    strain VARCHAR(100),
    hatch_date DATE NOT NULL,
    arrival_date DATE NOT NULL,
    initial_population INT NOT NULL CHECK (initial_population > 0),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, flock_number)
);

CREATE TRIGGER update_flocks_modtime
    BEFORE UPDATE ON flocks
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE daily_chicken_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    population_start INT NOT NULL CHECK (population_start >= 0),
    dead INT NOT NULL DEFAULT 0 CHECK (dead >= 0),
    culled INT NOT NULL DEFAULT 0 CHECK (culled >= 0),
    population_end INT NOT NULL CHECK (population_end >= 0),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted
    transaction_id UUID, -- For mortality inventory movement
    reversal_transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(flock_id, record_date),
    CHECK (population_end = population_start - dead - culled)
);

CREATE TRIGGER update_daily_chicken_records_modtime
    BEFORE UPDATE ON daily_chicken_records
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE daily_feed_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity_kg NUMERIC(18,4) NOT NULL CHECK (quantity_kg >= 0),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted
    transaction_id UUID, -- For inventory OUT
    reversal_transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_daily_feed_records_modtime
    BEFORE UPDATE ON daily_feed_records
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE daily_egg_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    good_qty INT NOT NULL DEFAULT 0 CHECK (good_qty >= 0),
    good_weight_kg NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (good_weight_kg >= 0),
    abnormal_qty INT NOT NULL DEFAULT 0 CHECK (abnormal_qty >= 0),
    abnormal_weight_kg NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (abnormal_weight_kg >= 0),
    broken_qty INT NOT NULL DEFAULT 0 CHECK (broken_qty >= 0),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted
    transaction_id UUID, -- For inventory IN
    reversal_transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_daily_egg_records_modtime
    BEFORE UPDATE ON daily_egg_records
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
