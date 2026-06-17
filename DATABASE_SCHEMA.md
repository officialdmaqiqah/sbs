# Database Schema

The SBS database is designed for multi-tenancy via the `organization_id` column present on almost all business tables.

## Core Modules

### Organization & Auth
- `organizations`: Tenants.
- `profiles`: Extension of `auth.users`.
- `roles`, `permissions`, `role_permissions`, `user_roles`: RBAC implementation.

### Projects & Investments
- `projects`: High-level grouping of operations.
- `project_members`: Users assigned to a project.
- `investors` & `project_investments`: Funding tracking.
- `project_worker_allocations`: Profit sharing percentages.

### Master Data & Inventory
- `items`: Physical goods.
- `inventory_locations`: Warehouses/sites.
- `inventory_balances`: Current stock levels.
- `inventory_movements`: Immutable ledger of stock changes.
- `inventory_reservations`: Soft-locks on stock.

### Production
- `production_orders` & `production_order_items`: Generic headers for Cage and Feed production.
- `cage_types`, `cage_boms`: Cage setups.
- `feed_recipes`: Feed mixtures.

### Sales & Distribution
- `sales_orders`, `delivery_orders`, `sales_returns`: Order to cash cycle.

### Daily Operations
- `flocks`: Biological asset groups.
- `daily_chicken_records`: Mortality/culling tracking.
- `daily_feed_records`: Feed consumption.
- `daily_egg_records`: Egg production.

### Accounting
- `chart_of_accounts`, `accounting_periods`.
- `journal_entries`, `journal_entry_lines`: Immutable financial ledger.
- `customer_invoices`, `supplier_bills`, `payments`: AP/AR tracking.
- `profit_distributions`: Payout logic based on project snapshots.
