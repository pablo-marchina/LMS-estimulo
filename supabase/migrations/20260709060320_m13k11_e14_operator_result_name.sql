-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060320
-- Remote name: m13k11_e14_operator_result_name
-- Remote SQL SHA-256: 2af9f7da912e50b49755cf350aa544a01a4719cc3e7c8ee29948900772177e35
-- Do not edit after reconciliation; corrections require a new migration.

alter function public.e14_public_q2(uuid,uuid,uuid) rename to e14_get_operator_result;
