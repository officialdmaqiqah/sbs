# Supabase Architecture

## Overview
The SBS application utilizes Supabase as a Backend-as-a-Service (BaaS), providing:
- PostgreSQL Database
- Authentication & Authorization
- Row Level Security (RLS)
- RESTful API (via PostgREST)
- Storage (for attachments)

## Data Provider Abstraction
To ensure a smooth transition and maintain regression testing capabilities, the app uses a `DataProvider` pattern (`VITE_DATA_PROVIDER`).
- **local**: Uses `LocalDataProvider` (localStorage), mainly for unit/regression tests.
- **supabase**: Uses `SupabaseDataProvider` connected to the actual Supabase instance.

## Transaction Strategy
Client-side transactions are not supported directly in Supabase via PostgREST. Therefore, all atomic operations (e.g., posting a journal entry, dispatching delivery) are implemented as PostgreSQL Remote Procedure Calls (RPCs).

## Storage
- `sbs-documents`: A private bucket used for storing attachments related to transactions. Access is governed by RLS and signed URLs.
