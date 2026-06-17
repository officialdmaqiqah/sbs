# Local to Supabase Migration Plan

## Phase 1: Architecture & Foundations (Current)
- Establish Supabase schema matching the existing local architecture.
- Implement Repository abstraction to allow toggling between `local` and `supabase` data providers.
- Maintain existing local regression tests.

## Phase 2: Read Services Cutover
- Implement `SupabaseDataProvider` methods for all read operations (`list`, `getById`).
- Verify UI renders correctly when toggled to Supabase.
- Optimize indexing and query plans based on frontend access patterns.

## Phase 3: Write Services & RPC Cutover
- Replace local `CommandService` and `TransactionService` direct mutations with Supabase RPC calls.
- Verify inventory and accounting posting constraints are accurately enforced by the database.

## Phase 4: Data Migration
- Export `localStorage` JSON blobs from the staging/legacy environment.
- Map local UUIDs and structures to the new normalized Supabase schema.
- Import via script into Supabase.
- Perform reconciliation checks (Total Assets, Inventory Balances).

## Phase 5: Production Release
- Switch `VITE_DATA_PROVIDER=supabase` in production `.env`.
- Remove `LocalDataProvider` code entirely to clean up the bundle.
