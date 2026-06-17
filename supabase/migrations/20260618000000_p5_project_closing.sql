-- 20260618000000_p5_project_closing.sql

CREATE TABLE project_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    closing_date DATE NOT NULL,
    gross_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
    company_cash_share NUMERIC(18,2) NOT NULL DEFAULT 0,
    worker_pool NUMERIC(18,2) NOT NULL DEFAULT 0,
    investor_pool NUMERIC(18,2) NOT NULL DEFAULT 0,
    csr_pool NUMERIC(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Ditutup',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(project_id) -- 1 project hanya boleh punya 1 closing final
);

CREATE TABLE project_profit_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_closing_id UUID NOT NULL REFERENCES project_closings(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_role VARCHAR(100) NOT NULL, -- 'CEO', 'Worker', 'Investor Internal', 'CSR', 'Kas Perusahaan'
    capital_amount NUMERIC(18,2) DEFAULT 0,
    capital_percentage NUMERIC(5,2) DEFAULT 0,
    worker_share NUMERIC(18,2) DEFAULT 0,
    investor_share NUMERIC(18,2) DEFAULT 0,
    total_share NUMERIC(18,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Belum Dibayar', -- Belum Dibayar, Sebagian Dibayar, Sudah Dibayar
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_project_closings_project_id ON project_closings(project_id);
CREATE INDEX idx_project_profit_dist_closing_id ON project_profit_distributions(project_closing_id);
CREATE INDEX idx_project_profit_dist_project_id ON project_profit_distributions(project_id);

-- Enable RLS
ALTER TABLE project_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_profit_distributions ENABLE ROW LEVEL SECURITY;

-- Policies for project_closings
CREATE POLICY "CEO Admin can manage project closings"
ON project_closings
FOR ALL
USING (current_user_has_role('CEO_ADMIN'));

CREATE POLICY "Finance can view project closings"
ON project_closings
FOR SELECT
USING (current_user_has_role('FINANCE'));

CREATE POLICY "Anyone in org can view their project closings if involved"
ON project_closings
FOR SELECT
USING (
  current_user_organization_id() = organization_id
);

-- Policies for project_profit_distributions
CREATE POLICY "CEO Admin can manage project distributions"
ON project_profit_distributions
FOR ALL
USING (current_user_has_role('CEO_ADMIN'));

CREATE POLICY "Finance can view project distributions"
ON project_profit_distributions
FOR SELECT
USING (current_user_has_role('FINANCE'));

CREATE POLICY "Anyone in org can view project distributions"
ON project_profit_distributions
FOR SELECT
USING (current_user_organization_id() = organization_id);
