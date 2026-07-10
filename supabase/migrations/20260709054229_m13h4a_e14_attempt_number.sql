-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054229
-- Remote name: m13h4a_e14_attempt_number
-- Remote SQL SHA-256: d93f37224767fb433a479b31365e37d50b35b36ce06e55dfc5de5f67b7907467
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_attempt_number(a uuid,b integer)
returns integer language plpgsql security definer set search_path=pg_catalog as $$
declare n integer;
begin
 if exists(select 1 from assessment.attempts where step_instance_id=a and status='in_progress') then raise exception 'ATTEMPT_ALREADY_IN_PROGRESS' using errcode='P0001';end if;
 select count(*)+1 into n from assessment.attempts where step_instance_id=a;
 if n>b then raise exception 'MAX_ATTEMPTS_REACHED' using errcode='P0001';end if;
 return n;
end;$$;
