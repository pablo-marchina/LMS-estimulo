-- Cluster-level prerequisites for a clean E14 replay.
-- These roles exist in the authorized Supabase development/test environment and
-- are intentionally provisioned before schema migrations because PostgreSQL
-- roles are cluster-scoped rather than database-scoped.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_readonly') then
    create role app_readonly nologin inherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin inherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_worker') then
    create role app_worker nologin inherit;
  end if;
end
$$;

alter role app_readonly nologin inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit -1;
alter role app_runtime nologin inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit -1;
alter role app_worker nologin inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit -1;
