begin;

create or replace function public.get_public_landing_journey()
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  select coalesce((
    select jsonb_build_object(
      'journey_id',jv.id,
      'slug',jd.slug,
      'title',jv.title,
      'description',jv.description,
      'published_at',jv.published_at,
      'presentation',coalesce(jv.configuration->'presentation','{}'::jsonb),
      'track_count',(
        select count(*)
        from orchestration.path_templates pt
        where pt.journey_version_id=jv.id and pt.status='published'
      ),
      'lesson_count',(
        select count(*)
        from orchestration.path_steps ps
        join orchestration.path_templates pt on pt.id=ps.path_template_id
        where pt.journey_version_id=jv.id and pt.status='published'
      ),
      'estimated_minutes',coalesce((
        select sum(coalesce(av.estimated_minutes,0))
        from orchestration.path_steps ps
        join orchestration.path_templates pt on pt.id=ps.path_template_id
        join catalog.activity_versions av on av.id=ps.activity_version_id
        where pt.journey_version_id=jv.id and pt.status='published'
      ),0)
    )
    from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where jv.status='published'
      and jd.status='active'
      and lower(jv.title) not like '%openai%'
      and lower(coalesce(jv.description,'')) not like '%openai%'
      and lower(coalesce(jv.configuration::text,'')) not like '%openai%'
    order by
      case when coalesce((jv.configuration#>>'{presentation,featured}')::boolean,false) then 0 else 1 end,
      coalesce((jv.configuration#>>'{presentation,featured_rank}')::integer,9999),
      jv.published_at desc nulls last,
      jv.created_at desc
    limit 1
  ),'{}'::jsonb)
$function$;

revoke all on function public.get_public_landing_journey() from public;
grant execute on function public.get_public_landing_journey() to anon,authenticated,service_role;

commit;