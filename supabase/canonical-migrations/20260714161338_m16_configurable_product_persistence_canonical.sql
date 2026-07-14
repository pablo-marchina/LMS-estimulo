-- Canonical reference for the configurable-product operational persistence migration.
-- Executable SQL is materialized in the timestamped file under supabase/migrations.
-- This file deliberately references that single source to avoid duplicating a large SQL body.

-- BEGIN 20260714161338_configurable_product_operational_persistence
-- Remote SQL SHA-256: 99c7a1c9ef49387b0450a6ce8853511fdcb4736079e396910ffcb62b2b40187f
\ir ../migrations/20260714161338_configurable_product_operational_persistence.sql
-- END 20260714161338_configurable_product_operational_persistence
