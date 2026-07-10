-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060153
-- Remote name: m13k4_e14_public_q1
-- Remote SQL SHA-256: 5864a425ce1b6825a06d7fde48ff7691024ab4ae73de68fb736f87cfb7d8aea8
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_public_q1(a uuid,b uuid) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_q1(a,b)$$;
