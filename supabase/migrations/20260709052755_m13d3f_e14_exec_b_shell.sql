-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052755
-- Remote name: m13d3f_e14_exec_b_shell
-- Remote SQL SHA-256: 9ddc7aa6198ee688e32b69738d4b8fbf5e144a76c748b6c846a47d5ea76c0a9f
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_exec_b(a uuid,b uuid,c uuid,d text,e integer,f integer,g text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare p jsonb;
begin
 p:=app_private.e14_prepare_b(a,b,c,d,e,f,g);
 return p;
end;$$;
