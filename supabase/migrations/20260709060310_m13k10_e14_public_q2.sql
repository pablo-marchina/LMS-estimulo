-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060310
-- Remote name: m13k10_e14_public_q2
-- Remote SQL SHA-256: 2cc2f6bf6f8c5a5691340d5fdda864fa8cadd48c8ea4724e3a6d62b1ed3c2ca5
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_public_q2(a uuid,b uuid,c uuid) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_q2(a,b,c)$$;
