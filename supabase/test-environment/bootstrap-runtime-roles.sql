-- Supabase shared-test environment only. Do not reuse verbatim in AWS production.
-- Production roles and login/assumption are provisioned by IaC and Secrets Manager.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_worker') then
    create role app_worker nologin nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_readonly') then
    create role app_readonly nologin nobypassrls;
  end if;
end $$;

-- Allows the Supabase MCP/database administrator to SET ROLE for transactional
-- tests. This membership is a test-environment accommodation, not a production design.
grant app_runtime to postgres;
grant app_worker to postgres;
grant app_readonly to postgres;
