-- 009_accounting.sql
-- Description: Accounting, General Ledger, Invoicing, Payments, and Profit Distribution

CREATE TABLE accounting_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    fiscal_year_start_month INT NOT NULL DEFAULT 1,
    default_currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id)
);

CREATE TRIGGER update_accounting_settings_modtime
    BEFORE UPDATE ON accounting_settings
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE accounting_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_name VARCHAR(50) NOT NULL, -- e.g., '2024-01'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Open', -- Open, Closed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, period_name)
);

CREATE TRIGGER update_accounting_periods_modtime
    BEFORE UPDATE ON accounting_periods
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
    category VARCHAR(100), -- Cash, Accounts Receivable, Inventory, etc.
    is_group BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TRIGGER update_chart_of_accounts_modtime
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE accounting_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mapping_key VARCHAR(100) NOT NULL, -- e.g., 'INVENTORY_ASSET', 'SALES_REVENUE'
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, mapping_key)
);

CREATE TRIGGER update_accounting_mappings_modtime
    BEFORE UPDATE ON accounting_mappings
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    journal_number VARCHAR(50) NOT NULL,
    journal_date DATE NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted, Cancelled
    source_type VARCHAR(50), -- e.g., 'DELIVERY_ORDER', 'PURCHASE_RECEIPT'
    source_id UUID,
    event_type VARCHAR(50), -- e.g., 'DISPATCH', 'RECEIVE'
    reversal_of_journal_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, journal_number),
    -- Source event uniqueness to prevent double posting
    UNIQUE NULLS NOT DISTINCT (organization_id, source_type, source_id, event_type)
);

CREATE TRIGGER update_journal_entries_modtime
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE RESTRICT,
    debit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup indexes for GL
CREATE INDEX idx_journal_lines_account ON journal_entry_lines(account_id);
CREATE INDEX idx_journal_lines_project ON journal_entry_lines(project_id);
CREATE INDEX idx_journal_date ON journal_entries(journal_date);

CREATE TABLE period_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES accounting_periods(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- Null means unallocated/org-wide
    opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_change NUMERIC(18,2) NOT NULL DEFAULT 0,
    closing_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    UNIQUE NULLS NOT DISTINCT (period_id, account_id, project_id)
);

-- Accounts Payable/Receivable
CREATE TABLE customer_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount NUMERIC(18,2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted, Partially Paid, Paid, Cancelled
    source_type VARCHAR(50),
    source_id UUID,
    transaction_id UUID, -- Journal Entry ID
    reversal_transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, invoice_number),
    CHECK (paid_amount <= total_amount)
);

CREATE TRIGGER update_customer_invoices_modtime
    BEFORE UPDATE ON customer_invoices
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE supplier_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE RESTRICT,
    bill_number VARCHAR(50) NOT NULL,
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount NUMERIC(18,2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted, Partially Paid, Paid, Cancelled
    source_type VARCHAR(50),
    source_id UUID,
    transaction_id UUID, -- Journal Entry ID
    reversal_transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, bill_number),
    CHECK (paid_amount <= total_amount)
);

CREATE TRIGGER update_supplier_bills_modtime
    BEFORE UPDATE ON supplier_bills
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Payments
CREATE TABLE cash_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Cash, Bank
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TRIGGER update_cash_bank_accounts_modtime
    BEFORE UPDATE ON cash_bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE customer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    cash_bank_id UUID NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT,
    payment_number VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    total_amount NUMERIC(18,2) NOT NULL CHECK (total_amount > 0),
    allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    unallocated_amount NUMERIC(18,2) NOT NULL, -- total_amount - allocated_amount
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted, Cancelled
    transaction_id UUID,
    reversal_transaction_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, payment_number),
    CHECK (allocated_amount <= total_amount),
    CHECK (unallocated_amount >= 0)
);

CREATE TRIGGER update_customer_payments_modtime
    BEFORE UPDATE ON customer_payments
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE customer_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES customer_payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES customer_invoices(id) ON DELETE RESTRICT,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    cash_bank_id UUID NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT,
    payment_number VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    total_amount NUMERIC(18,2) NOT NULL CHECK (total_amount > 0),
    allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    unallocated_amount NUMERIC(18,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted, Cancelled
    transaction_id UUID,
    reversal_transaction_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, payment_number),
    CHECK (allocated_amount <= total_amount),
    CHECK (unallocated_amount >= 0)
);

CREATE TRIGGER update_supplier_payments_modtime
    BEFORE UPDATE ON supplier_payments
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE supplier_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES supplier_bills(id) ON DELETE RESTRICT,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Profit Distribution
CREATE TABLE profit_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    distribution_number VARCHAR(50) NOT NULL,
    distribution_date DATE NOT NULL,
    net_profit NUMERIC(18,2) NOT NULL,
    company_percentage NUMERIC(5,2) NOT NULL,
    investor_percentage NUMERIC(5,2) NOT NULL,
    worker_percentage NUMERIC(5,2) NOT NULL,
    company_amount NUMERIC(18,2) NOT NULL,
    investor_amount NUMERIC(18,2) NOT NULL,
    worker_amount NUMERIC(18,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted, Cancelled
    transaction_id UUID,
    reversal_transaction_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, distribution_number)
);

CREATE TRIGGER update_profit_distributions_modtime
    BEFORE UPDATE ON profit_distributions
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE profit_distribution_investor_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_id UUID NOT NULL REFERENCES profit_distributions(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    capital_amount NUMERIC(18,2) NOT NULL,
    capital_percentage NUMERIC(8,4) NOT NULL,
    profit_amount NUMERIC(18,2) NOT NULL,
    paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profit_distribution_worker_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_id UUID NOT NULL REFERENCES profit_distributions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    allocation_percentage NUMERIC(5,2) NOT NULL,
    profit_amount NUMERIC(18,2) NOT NULL,
    paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profit_distribution_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    distribution_id UUID NOT NULL REFERENCES profit_distributions(id) ON DELETE RESTRICT,
    cash_bank_id UUID NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT,
    recipient_type VARCHAR(50) NOT NULL, -- INVESTOR, WORKER
    recipient_investor_id UUID REFERENCES investors(id),
    recipient_user_id UUID REFERENCES profiles(id),
    payout_number VARCHAR(50) NOT NULL,
    payout_date DATE NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Posted, Cancelled
    transaction_id UUID,
    reversal_transaction_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, payout_number),
    CHECK (
        (recipient_type = 'INVESTOR' AND recipient_investor_id IS NOT NULL AND recipient_user_id IS NULL) OR
        (recipient_type = 'WORKER' AND recipient_user_id IS NOT NULL AND recipient_investor_id IS NULL)
    )
);

CREATE TRIGGER update_profit_distribution_payouts_modtime
    BEFORE UPDATE ON profit_distribution_payouts
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
