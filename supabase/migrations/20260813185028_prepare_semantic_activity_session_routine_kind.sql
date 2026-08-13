begin;

-- Production no longer retains this transitional helper, but a clean replay of
-- the historical chain can still expose it as a FUNCTION. The production-only
-- semantic migration that follows (20260813185029) intentionally recreates the
-- helper as a PROCEDURE while serializing those fixes. PostgreSQL cannot change
-- a routine kind via CREATE OR REPLACE, so remove only the legacy FUNCTION kind
-- here. This is a no-op when the helper is absent (the current production state)
-- and deliberately leaves an already-correct PROCEDURE untouched.
do $$
declare
  v_function_oid oid;
begin
  select p.oid
    into v_function_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'app_private'
    and p.proname = 'extension_migrate_activity_session_legacy_compatibility'
    and p.prokind = 'f'
    and pg_get_function_identity_arguments(p.oid) = 'uuid'
  limit 1;

  if v_function_oid is not null then
    execute 'drop function app_private.extension_migrate_activity_session_legacy_compatibility(uuid)';
  end if;
end;
$$;

commit;
