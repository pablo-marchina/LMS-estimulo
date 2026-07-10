-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052849
-- Remote name: m13d3j_e14_record_response_revoke
-- Remote SQL SHA-256: ea2aff5f2094ea95451e5bc65bbc5ebbfc6f2c6bb9724ecabb0163ed650e3edd
-- Do not edit after reconciliation; corrections require a new migration.

revoke all on function public.e14_record_diagnostic_response(uuid,uuid,uuid,text,integer,integer,text) from public;
