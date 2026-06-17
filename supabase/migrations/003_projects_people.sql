-- 003_projects_people.sql
-- Description: Projects, workers, investors, and profit distribution setup

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Active, Closed
    start_date DATE,
    end_date DATE,
    total_capital NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, code)
);

CREATE TRIGGER update_projects_modtime
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Add project_id FK to user_roles now that projects exist
ALTER TABLE user_roles 
    ADD CONSTRAINT fk_user_roles_project 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- People involved in a project
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL, -- Project Manager, etc (different from system roles if needed)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Investment tracking
CREATE TABLE investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id), -- Nullable if investor doesn't have an app login yet
    name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_investors_modtime
    BEFORE UPDATE ON investors
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE project_investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Confirmed, Cancelled
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_project_investments_modtime
    BEFORE UPDATE ON project_investments
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Project Financial Snapshots for historical reporting without joining massive tables
CREATE TABLE project_financial_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_capital NUMERIC(18,2) DEFAULT 0,
    total_revenue NUMERIC(18,2) DEFAULT 0,
    total_expense NUMERIC(18,2) DEFAULT 0,
    net_profit NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, snapshot_date)
);

-- Worker allocations for profit distribution
CREATE TABLE project_worker_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    allocation_percentage NUMERIC(5,2) NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, user_id)
);

CREATE TRIGGER update_project_worker_allocations_modtime
    BEFORE UPDATE ON project_worker_allocations
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
