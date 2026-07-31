begin;

create or replace function public.capture_tracking_visit(
  p_slug text,
  p_visit_token text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_link core.tracking_links%rowtype;
  v_hash text;
  v_visit_id uuid;
  v_uses bigint;
  v_result jsonb;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9_-]{2,79}$' then raise exception 'TRACKING_LINK_INVALID' using errcode='22023'; end if;
  if p_visit_token is null or length(p_visit_token)<24 or length(p_visit_token)>200 then raise exception 'TRACKING_TOKEN_INVALID' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))<>'object' then raise exception 'TRACKING_METADATA_INVALID' using errcode='22023'; end if;

  select * into v_link from core.tracking_links
  where slug=p_slug and status='active'
    and (starts_at is null or starts_at<=now())
    and (ends_at is null or ends_at>now())
  for share;
  if not found then raise exception 'TRACKING_LINK_NOT_FOUND' using errcode='P0002'; end if;

  if v_link.max_uses is not null then
    select count(*) into v_uses from core.tracking_visits where tracking_link_id=v_link.id;
    if v_uses>=v_link.max_uses then raise exception 'TRACKING_LINK_LIMIT_REACHED' using errcode='22023'; end if;
  end if;

  v_hash:=encode(extensions.digest(convert_to(p_visit_token,'UTF8'),'sha256'),'hex');
  insert into core.tracking_visits(
    tracking_link_id,visit_token_hash,anonymous_id,session_id,landing_path,referrer,
    device_type,browser,operating_system,user_agent,ip_hash,parameters,occurred_at
  ) values (
    v_link.id,v_hash,nullif(p_metadata->>'anonymous_id',''),nullif(p_metadata->>'session_id',''),
    coalesce(nullif(p_metadata->>'landing_path',''),'/r/'||p_slug),nullif(p_metadata->>'referrer',''),
    nullif(p_metadata->>'device_type',''),nullif(p_metadata->>'browser',''),nullif(p_metadata->>'operating_system',''),
    left(nullif(p_metadata->>'user_agent',''),1000),nullif(p_metadata->>'ip_hash',''),
    coalesce(p_metadata->'parameters','{}'::jsonb)||v_link.custom_parameters||jsonb_strip_nulls(jsonb_build_object(
      'utm_source',v_link.utm_source,'utm_medium',v_link.utm_medium,'utm_campaign',v_link.utm_campaign,
      'utm_content',v_link.utm_content,'utm_term',v_link.utm_term,'partner',v_link.partner,'channel',v_link.channel
    )),now()
  )
  on conflict(visit_token_hash) do update set parameters=core.tracking_visits.parameters||excluded.parameters
  returning id into v_visit_id;

  v_result:=jsonb_build_object(
    'visit_id',v_visit_id,'destination_path',v_link.destination_path,'audience',v_link.audience,
    'skip_steps',v_link.skip_steps,'expires_at',least(coalesce(v_link.ends_at,now()+interval '30 days'),now()+interval '30 days')
  );
  return v_result;
end;
$$;

create or replace function public.get_delivery_grading_payload(p_submission_id uuid)
returns jsonb
language sql
security definer
set search_path to 'pg_catalog'
as $$
  select jsonb_build_object(
    'submission',to_jsonb(s),
    'configuration',to_jsonb(c),
    'files',coalesce((
      select jsonb_agg(to_jsonb(f)||jsonb_build_object(
        'bucket',fo.bucket,'object_key',fo.object_key,'content_type',fo.content_type,
        'original_filename',fo.original_filename,'size_bytes',fo.size_bytes
      ) order by f.position)
      from assessment.delivery_submission_files f join core.file_objects fo on fo.id=f.file_object_id
      where f.delivery_submission_id=s.id
    ),'[]'::jsonb)
  )
  from assessment.delivery_submissions s
  join assessment.delivery_configurations c on c.id=s.delivery_configuration_id
  where s.id=p_submission_id
$$;

create or replace function public.apply_ai_delivery_review(
  p_submission_id uuid,
  p_result jsonb,
  p_model_reference text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_config assessment.delivery_configurations%rowtype;
  v_status text;
begin
  select c.* into v_config from assessment.delivery_configurations c
  join assessment.delivery_submissions s on s.delivery_configuration_id=c.id
  where s.id=p_submission_id
  for share;
  if not found then raise exception 'DELIVERY_SUBMISSION_NOT_FOUND' using errcode='P0002'; end if;
  if jsonb_typeof(coalesce(p_result,'{}'::jsonb))<>'object' then raise exception 'AI_REVIEW_INVALID' using errcode='22023'; end if;

  update assessment.delivery_reviews set status='superseded'
  where delivery_submission_id=p_submission_id and review_type='ai' and status in ('proposed','approved');
  v_status:=case
    when v_config.grading_mode='automatic' and coalesce((p_result->>'confidence')::numeric,0)>=0.65 then 'approved'
    else 'proposed'
  end;
  insert into assessment.delivery_reviews(
    delivery_submission_id,review_type,rubric_snapshot,criterion_scores,score,feedback,confidence,model_reference,status,metadata
  ) values (
    p_submission_id,'ai',v_config.rubric,coalesce(p_result->'criterion_scores','[]'::jsonb),
    nullif(p_result->>'score','')::numeric,nullif(p_result->>'feedback',''),
    nullif(p_result->>'confidence','')::numeric,p_model_reference,v_status,coalesce(p_result->'metadata','{}'::jsonb)
  );
  update assessment.delivery_submissions set
    final_score=case when v_status='approved' then nullif(p_result->>'score','')::numeric else final_score end,
    final_feedback=case when v_status='approved' then nullif(p_result->>'feedback','') else final_feedback end,
    confidence=nullif(p_result->>'confidence','')::numeric,grading_model=p_model_reference,grading_version='1',
    status=case when v_status='approved' then 'approved' else 'awaiting_human_review' end,
    approved_at=case when v_status='approved' then now() else approved_at end,updated_at=now()
  where id=p_submission_id;
  return jsonb_build_object(
    'submission_id',p_submission_id,'review_status',v_status,
    'submission_status',case when v_status='approved' then 'approved' else 'awaiting_human_review' end
  );
end;
$$;

revoke all on function public.capture_tracking_visit(text,text,jsonb) from public;
grant execute on function public.capture_tracking_visit(text,text,jsonb) to anon,authenticated,service_role;
revoke all on function public.get_delivery_grading_payload(uuid) from public,anon,authenticated;
grant execute on function public.get_delivery_grading_payload(uuid) to service_role;
revoke all on function public.apply_ai_delivery_review(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.apply_ai_delivery_review(uuid,jsonb,text) to service_role;

commit;
