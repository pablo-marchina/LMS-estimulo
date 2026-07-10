-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052857
-- Remote name: m13d3k_e14_record_response_access
-- Remote SQL SHA-256: 48460cd141e9afde0287ddf054332cdccde13b7dc15cdfec6b122960e04d782b
-- Do not edit after reconciliation; corrections require a new migration.

revoke all on function public.e14_record_diagnostic_response(uuid,uuid,uuid,text,integer,integer,text) from anon;
revoke all on function public.e14_record_diagnostic_response(uuid,uuid,uuid,text,integer,integer,text) from authenticated;
grant execute on function public.e14_record_diagnostic_response(uuid,uuid,uuid,text,integer,integer,text) to service_role;
grant execute on function public.e14_record_diagnostic_response(uuid,uuid,uuid,text,integer,integer,text) to app_worker;
