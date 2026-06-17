-- 001_extensions.sql
-- Description: Enable necessary PostgreSQL extensions for the SBS application

-- uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto for hashing if needed (though Supabase auth handles passwords)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
