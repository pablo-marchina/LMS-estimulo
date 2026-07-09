-- Run as the database administrator after roles are provisioned by the environment.
-- The portable migrations do not create login roles or store credentials.

-- Example runtime roles:
--   app_runtime: synchronous API requests with RLS and request context
--   app_worker: asynchronous consumers; still NOBYPASSRLS
--   app_readonly: controlled operational support/reporting

-- Supabase test environment may create these NOLOGIN group roles manually.
-- Amazon RDS should provision login/assume-role access with IaC and Secrets Manager.

do $$
begin
  if exists(select 1 from pg_roles where rolname = 'app_runtime') then
    grant usage on schema app_private, iam, core, catalog, orchestration, diagnostics, assessment, engagement, intervention to app_runtime;
    -- No broad table DML is granted to app_runtime. Domain command functions/views
    -- receive explicit grants as they are implemented.
    grant select on all tables in schema catalog to app_runtime;
    grant execute on all functions in schema app_private to app_runtime;
    grant execute on function iam.resolve_external_identity(text,text,text,text,boolean,text) to app_runtime;
  end if;
  if exists(select 1 from pg_roles where rolname = 'app_worker') then
    grant usage on schema app_private, iam, core, catalog, orchestration, diagnostics, assessment, engagement, intervention, eventing, integration, intelligence, governance to app_worker;
    grant select, insert, update, delete on all tables in schema iam, core, catalog, orchestration, diagnostics, assessment, engagement, intervention, eventing, integration, intelligence, governance to app_worker;
    grant execute on all functions in schema app_private, iam, eventing to app_worker;
    grant usage on schema extensions to app_worker;
    grant execute on function extensions.digest(bytea, text) to app_worker;
  end if;
end $$;
