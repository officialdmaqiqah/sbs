# Row Level Security (RLS) Policies

Supabase Row Level Security (RLS) is heavily utilized to enforce multi-tenancy and role-based data visibility.

## Multi-Tenancy Boundary
Almost all policies include a check against `current_user_organization_id()`. This ensures that a user can *never* read or write data belonging to an organization they are not a part of.

## Data Visibility
RLS is primarily used to restrict `SELECT` operations to ensure UI components only receive authorized data:
- **Workers** can only view their own payout lines.
- **Investors** can only view their own investment details.
- **Finance** can view all organizational project and accounting data.

## Write Operations
While RLS `INSERT/UPDATE/DELETE` policies can be defined, the SBS application relies on PL/pgSQL RPC Functions (running as `SECURITY DEFINER`) for complex, multi-table transactions (e.g., posting a journal entry). The RPC functions perform explicit permission checks using `current_user_has_permission()` before executing the transaction, ensuring atomic integrity and authorization bypasses only where strictly designed.
