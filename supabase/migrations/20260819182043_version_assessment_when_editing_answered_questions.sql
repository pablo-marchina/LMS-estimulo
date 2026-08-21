begin;

-- Historical assessment responses must keep pointing at the question version
-- they answered. If editable question structure changes after responses exist,
-- use the existing activity-version copy-on-write path before replacing the
-- new version's questions. Metadata-only assessment edits stay in place.
do $patch$
declare
  v_src text;
  v_old text := 'if v_reference_count>1 then';
  v_new text := 'if v_reference_count>1 or (exists(select 1 from assessment.responses r join assessment.questions rq on rq.id=r.question_id where rq.activity_version_id=v_activity_version_id) and (case when jsonb_typeof(p_payload->''assessment'')=''object'' and jsonb_typeof(p_payload#>''{assessment,questions}'')=''array'' and jsonb_array_length(p_payload#>''{assessment,questions}'')>0 then not app_private.e14_assessment_questions_match_payload(v_activity_version_id,p_payload#>''{assessment,questions}'') else exists(select 1 from assessment.assessment_specs existing_spec where existing_spec.activity_version_id=v_activity_version_id) end)) then';
begin
  select p.prosrc
  into v_src
  from pg_proc p
  where p.oid = 'public.save_admin_lesson(uuid,uuid,jsonb,text)'::regprocedure;

  if (length(v_src) - length(replace(v_src, v_old, ''))) / length(v_old) <> 1 then
    raise exception 'SAVE_ADMIN_LESSON_REFERENCE_CLONE_MARKER_NOT_UNIQUE';
  end if;

  v_src := replace(v_src, v_old, v_new);

  execute format(
    'create or replace function public.save_admin_lesson(p_actor_user_account_id uuid,p_organization_id uuid,p_payload jsonb,p_idempotency_key text) returns jsonb language plpgsql security definer set search_path to ''pg_catalog'' as %L',
    v_src
  );
end;
$patch$;

commit;
