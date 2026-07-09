-- Baseline provider-neutral request context.
-- Execute at the start of each authenticated transaction using parameterized values.

create schema if not exists app_private;

create or replace function app_private.set_request_context(
  p_user_account_id uuid,
  p_organization_id uuid,
  p_request_id text,
  p_actor_type text default 'user'
) returns void
language plpgsql
security invoker
set search_path = pg_catalog, public, app_private
as $$
begin
  perform set_config('app.user_account_id', coalesce(p_user_account_id::text, ''), true);
  perform set_config('app.organization_id', coalesce(p_organization_id::text, ''), true);
  perform set_config('app.request_id', coalesce(p_request_id, ''), true);
  perform set_config('app.actor_type', coalesce(p_actor_type, ''), true);
end;
$$;

create or replace function app_private.current_user_account_id()
returns uuid
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.user_account_id', true), '')::uuid;
$$;

create or replace function app_private.current_organization_id()
returns uuid
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.organization_id', true), '')::uuid;
$$;
