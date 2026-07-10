-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054717
-- Remote name: m13i6_e14_insert_h
-- Remote SQL SHA-256: bc398fa8f5507670799cb1dc49b8dc5c3e0f71bfff73aa70ee4f79726f7d1451
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_insert_h(a uuid,b uuid,c uuid,d jsonb,e uuid,f text)
returns void language sql security definer set search_path=pg_catalog as $$
 insert into assessment.responses(id,attempt_id,question_id,response_value,responded_at,source_event_id)
 values(a,b,c,jsonb_build_object('option_id',(d->>'option_id')::uuid,'option_code',f,'correct',(d->>'correct')::boolean),now(),e)
$$;
