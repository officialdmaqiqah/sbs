# Supabase Setup Guide

## Remote Dev Project Setup (Phase 1 Validated)
For environments where local Docker is unavailable or problematic, you can spin up a remote Supabase project for testing.
1. Create a project on the Supabase Dashboard (e.g. Remote Dev Project).
2. Install Supabase CLI: `npm install -g supabase`
3. Link your local project to the remote dev project: `supabase link --project-ref <your-project-ref>`
4. Setup your `.env.local` to point to the remote dev instance URL and Anon Key. **NEVER** commit `.env.local`.
5. Run migrations: `supabase db reset --linked --yes` (This drops the public schema, applies all migrations, and runs `seed.sql`).

## Production Deployment
1. Create a Production project on the Supabase Dashboard.
2. Set the Project URL and `anon` public key to your production CI/CD environment variables.
3. Link your local project: `supabase link --project-ref <your-production-project-ref>`.
4. Push migrations: `supabase db push`.
5. Run the seed script manually or via CLI for static master data.

## Backup Strategy
- Enable Point-in-Time Recovery (PITR) for the production database.
- Regularly export `auth.users` using the CLI as they are not included in standard pg_dumps by default.

## Rollback
- If a migration fails, the CLI will roll back the transaction.
- Do not edit old migrations; always create a new migration (`supabase migration new <name>`) to alter or fix schemas.
