-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708230247
-- Remote name: m10a_enable_pgmq
-- Remote SQL SHA-256: 1b4e9c677d47ebe58edbcd0c920bd8ee2712f2953cc0ab28fe98cf52a5989d24
-- Do not edit after reconciliation; corrections require a new migration.

create extension if not exists pgmq;
