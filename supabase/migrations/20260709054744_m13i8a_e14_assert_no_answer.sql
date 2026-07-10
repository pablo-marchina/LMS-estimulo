-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054744
-- Remote name: m13i8a_e14_assert_no_answer
-- Remote SQL SHA-256: e3de2496c1c4baa2ac9da9941f025a73b518081d75ab37a44e4cbb9dc5b5729c
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_assert_no_answer(a uuid,b uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
begin
 if exists(select 1 from assessment.responses where attempt_id=a and question_id=b) then raise exception 'ANSWER_ALREADY_RECORDED' using errcode='P0001';end if;
end;$$;
