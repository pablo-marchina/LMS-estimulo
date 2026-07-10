-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054556
-- Remote name: m13i2_e14_context_g
-- Remote SQL SHA-256: ac53657ef93549d0f9660717ce50a2f286ac94230eca00a712c57f84e4e4eebf
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_context_g(a uuid,b uuid,c uuid,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x app_private.e14_attempt_context%rowtype;o uuid;v jsonb;ok boolean;
begin
 select * into x from app_private.e14_attempt_context where attempt_id=b;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from x.entrepreneur_id then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if x.attempt_status<>'in_progress' then raise exception 'ATTEMPT_NOT_IN_PROGRESS' using errcode='P0001';end if;
 select ao.id,ao.value,ao.is_correct into o,v,ok from assessment.answer_options ao join assessment.questions q on q.id=ao.question_id where ao.question_id=c and ao.code=d and q.activity_version_id=x.activity_version_id;
 if not found then raise exception 'INVALID_ASSESSMENT_OPTION' using errcode='22023';end if;
 return jsonb_build_object('person',x.entrepreneur_id,'step',x.step_instance_id,'version',x.activity_version_id,'instance',x.instance_id,'org',x.org_id,'attempt_version',x.attempt_version,'option_id',o,'option_value',v,'correct',ok);
end;$$;
