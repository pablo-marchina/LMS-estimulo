-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709015643
-- Remote name: m00_extensions_schemas_context
-- Remote SQL SHA-256: 1a8bf965c41f2a58c83ffdd00323b528d05e33c0750b9cd4b4dff3fec25db497
-- Do not edit after reconciliation; corrections require a new migration.

-- Plataforma Estímulo — M00 — extensions, schemas and provider-neutral request context
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

-- Plataforma Estímulo — modelo físico executável v0.2
-- PostgreSQL-compatible and provider-neutral.
-- Supabase is used for local/test; the same migrations target Amazon RDS PostgreSQL.

create extension if not exists pgcrypto;

create schema if not exists iam;

create schema if not exists core;

create schema if not exists catalog;

create schema if not exists orchestration;

create schema if not exists diagnostics;

create schema if not exists assessment;

create schema if not exists engagement;

create schema if not exists intervention;

create schema if not exists eventing;

create schema if not exists integration;

create schema if not exists intelligence;

create schema if not exists governance;

create schema if not exists reporting;

create or replace function governance.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create or replace function governance.reject_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'table %.% is append-only', tg_table_schema, tg_table_name;
end
$$;

create schema if not exists app_private;

revoke all on schema app_private from public;

create or replace function app_private.set_request_context(
  p_user_account_id uuid,
  p_organization_id uuid,
  p_request_id text,
  p_actor_type text default 'user'
) returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if p_request_id is null or length(trim(p_request_id)) = 0 then
    raise exception 'request_id_required' using errcode = '22023';
  end if;
  if p_actor_type not in ('user', 'operator', 'worker', 'system') then
    raise exception 'invalid_actor_type' using errcode = '22023';
  end if;
  perform set_config('app.user_account_id', coalesce(p_user_account_id::text, ''), true);
  perform set_config('app.organization_id', coalesce(p_organization_id::text, ''), true);
  perform set_config('app.request_id', trim(p_request_id), true);
  perform set_config('app.actor_type', p_actor_type, true);
end;
$$;

create or replace function app_private.current_user_account_id()
returns uuid
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.user_account_id', true), '')::uuid;
$$;

create or replace function app_private.current_organization_id()
returns uuid
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.organization_id', true), '')::uuid;
$$;

create or replace function app_private.current_request_id()
returns text
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.request_id', true), '');
$$;

create or replace function app_private.current_actor_type()
returns text
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.actor_type', true), '');
$$;

create or replace function iam.current_user_account_id()
returns uuid
language sql stable security invoker
set search_path = pg_catalog, app_private
as $$
  select app_private.current_user_account_id();
$$;
