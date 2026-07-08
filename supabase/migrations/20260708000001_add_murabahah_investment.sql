-- Migration for Murabahah/Flexible Profit Investments

-- Add investment_type and expected_profit to project_investments
ALTER TABLE project_investments
ADD COLUMN IF NOT EXISTS investment_type VARCHAR(50) DEFAULT 'Mudharabah',
ADD COLUMN IF NOT EXISTS expected_profit NUMERIC(18,2) DEFAULT 0;

-- Update existing records to Mudharabah explicitly (just to be safe)
UPDATE project_investments 
SET investment_type = 'Mudharabah' 
WHERE investment_type IS NULL;
