# Authentication & RBAC

## Authentication
Authentication is handled entirely by Supabase Auth (GoTrue).
- Users authenticate via Email/Password.
- In Phase 1 MVP, self-registration is disabled. Users must be invited or created by an Administrator.
- Session tokens are stored securely by the Supabase client and automatically refreshed.

## Role-Based Access Control (RBAC)
SBS implements a custom RBAC model built on top of Supabase Auth.
- **Profiles**: Connects `auth.users` to an `organization_id`.
- **Roles**: Defined at the organization level (e.g., `CEO_ADMIN`, `FINANCE`).
- **Permissions**: System-level definitions of actions on modules.
- **Role-Permissions**: Mapping of roles to permissions.
- **User-Roles**: Assignment of users to roles within an organization, optionally scoped to a specific `project_id`.

## Route Guards
The React frontend uses `ProtectedRoute` wrappers to:
1. Verify authentication status.
2. Check `user_roles` against required permissions before rendering a route.
3. Redirect to `/login` or `/unauthorized` accordingly.
