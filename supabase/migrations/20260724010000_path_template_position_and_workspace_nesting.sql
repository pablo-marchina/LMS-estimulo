-- Task 1 of the OpenAI-journey/admin-builder/Frente-5 plan: give trilhas
-- (orchestration.path_templates) an explicit, admin-editable display/execution
-- order, and extend get_admin_product_workspace's journeys[].versions[]
-- branch with a nested `trilhas` array so the guided admin builder (a later
-- task) has a full jornada -> trilha -> aula -> (assessment|practice) tree to
-- read. Every other top-level branch (diagnostics, activities, paths, rules,
-- point_rules, badges, certificates) and every other key already present on
-- the journeys[].versions[] objects is carried over byte-identical from the
-- live function body (pulled via pg_get_functiondef before editing).
--
-- Note: the assessment sub-select uses `asp.activity_version_id` as the
-- assessment's identifier (`spec_id`), not `asp.id` -- assessment_specs has
-- no `id` column; its primary key is activity_version_id (1:1 with the
-- activity version).
alter table orchestration.path_templates add column if not exists position integer not null default 0;
comment on column orchestration.path_templates.position is 'Display/execution order of this trilha within its jornada. Admin-editable via the guided builder.';

CREATE OR REPLACE FUNCTION public.get_admin_product_workspace(p_actor_user_account_id uuid, p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_allowed boolean;
begin
  v_allowed:=app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'diagnostic.configuration.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'reporting.read');
  if not v_allowed then raise exception 'FORBIDDEN' using errcode='42501'; end if;

  return jsonb_build_object(
    'organization_id',p_organization_id,
    'programs',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'code',p.code,'name',p.name,'status',p.status) order by p.name),'[]'::jsonb) from catalog.programs p where p.owner_organization_id=p_organization_id),
    'journeys',(select coalesce(jsonb_agg(jsonb_build_object(
      'definition_id',jd.id,'program_id',jd.program_id,'code',jd.code,'slug',jd.slug,'name',jd.name,'purpose',jd.purpose,'status',jd.status,
      'versions',(select coalesce(jsonb_agg(jsonb_build_object('id',jv.id,'version_number',jv.version_number,'status',jv.status,'title',jv.title,'description',jv.description,'configuration',jv.configuration,'content_hash',jv.content_hash,'published_at',jv.published_at,'eligible_archetype_codes',jv.eligible_archetype_codes,
        'trilhas',(select coalesce(jsonb_agg(jsonb_build_object(
          'id',pt.id,'code',pt.code,'name',pt.name,'description',pt.description,
          'position',pt.position,'status',pt.status,
          'badge',(select jsonb_build_object('badge_version_id',bv.id,'title',bv.title,'description',bv.description)
            from engagement.badge_versions bv
            join orchestration.rule_versions rv on rv.id=bv.criteria_rule_version_id
            where rv.language='credential-v1' and rv.expression->>'scope'='path'
              and rv.expression->>'path_template_id'=pt.id::text
            order by bv.id desc limit 1),
          'aulas',(select coalesce(jsonb_agg(jsonb_build_object(
            'step_id',ps.id,'code',ps.code,'position',ps.position_hint,'is_required',ps.is_required,
            'activity_version_id',av.id,'title',av.title,'description',av.description,
            'activity_type',av.activity_type,'configuration',av.configuration,
            'assessment',(select jsonb_build_object(
                'spec_id',asp.activity_version_id,'passing_score',asp.passing_score,'max_attempts',asp.max_attempts,
                'questions',(select coalesce(jsonb_agg(jsonb_build_object(
                    'id',q.id,'code',q.code,'prompt',q.prompt,'position',q.position,
                    'options',(select coalesce(jsonb_agg(jsonb_build_object(
                        'id',o.id,'code',o.code,'label',o.label,'is_correct',o.is_correct,'position',o.position
                      ) order by o.position),'[]'::jsonb)
                      from assessment.answer_options o where o.question_id=q.id)
                  ) order by q.position),'[]'::jsonb)
                  from assessment.questions q where q.activity_version_id=av.id)
              ) from assessment.assessment_specs asp where asp.activity_version_id=av.id),
            'practice',(select jsonb_build_object(
                'submission_mode',pxs.submission_mode,'allowed_evidence_types',pxs.allowed_evidence_types,
                'review_required',pxs.review_required
              ) from assessment.practice_specs pxs where pxs.activity_version_id=av.id)
          ) order by ps.position_hint),'[]'::jsonb)
            from orchestration.path_steps ps join catalog.activity_versions av on av.id=ps.activity_version_id
            where ps.path_template_id=pt.id)
        ) order by pt.position),'[]'::jsonb) from orchestration.path_templates pt where pt.journey_version_id=jv.id)
      ) order by jv.version_number desc),'[]'::jsonb) from catalog.journey_versions jv where jv.journey_definition_id=jd.id)
    ) order by jd.name),'[]'::jsonb) from catalog.journey_definitions jd where jd.owner_organization_id=p_organization_id),
    'activities',(select coalesce(jsonb_agg(jsonb_build_object(
      'definition_id',ad.id,'code',ad.code,'name',ad.name,'activity_type',ad.activity_type,'status',ad.status,
      'versions',(select coalesce(jsonb_agg(jsonb_build_object('id',av.id,'version_number',av.version_number,'status',av.status,'title',av.title,'description',av.description,'activity_type',av.activity_type,'configuration',av.configuration,'estimated_minutes',av.estimated_minutes,'content_hash',av.content_hash) order by av.version_number desc),'[]'::jsonb) from catalog.activity_versions av where av.activity_definition_id=ad.id)
    ) order by ad.name),'[]'::jsonb) from catalog.activity_definitions ad where ad.owner_organization_id=p_organization_id),
    'paths',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',pt.id,'journey_version_id',pt.journey_version_id,'code',pt.code,'name',pt.name,'description',pt.description,'is_default',pt.is_default,'status',pt.status,
      'steps',(select coalesce(jsonb_agg(jsonb_build_object('id',ps.id,'code',ps.code,'activity_version_id',ps.activity_version_id,'position',ps.position_hint,'is_required',ps.is_required,'availability_rule_version_id',ps.availability_rule_version_id,'completion_rule_version_id',ps.completion_rule_version_id,'due_offset',ps.due_offset,'metadata',ps.metadata) order by ps.position_hint),'[]'::jsonb) from orchestration.path_steps ps where ps.path_template_id=pt.id)
    ) order by pt.name),'[]'::jsonb)
      from orchestration.path_templates pt join catalog.journey_versions jv on jv.id=pt.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where jd.owner_organization_id=p_organization_id),
    'rules',(select coalesce(jsonb_agg(jsonb_build_object(
      'definition_id',rd.id,'code',rd.code,'rule_type',rd.rule_type,'name',rd.name,'status',rd.status,
      'versions',(select coalesce(jsonb_agg(jsonb_build_object('id',rv.id,'version_number',rv.version_number,'status',rv.status,'language',rv.language,'expression',rv.expression,'input_schema',rv.input_schema,'output_schema',rv.output_schema,'content_hash',rv.content_hash) order by rv.version_number desc),'[]'::jsonb) from orchestration.rule_versions rv where rv.rule_definition_id=rd.id)
    ) order by rd.name),'[]'::jsonb) from orchestration.rule_definitions rd where rd.owner_organization_id=p_organization_id),
    'diagnostics',(select coalesce(jsonb_agg(jsonb_build_object(
      'definition_id',dd.id,'code',dd.code,'name',dd.name,'purpose',dd.purpose,'status',dd.status,
      'versions',(select coalesce(jsonb_agg(jsonb_build_object(
        'id',dv.id,'version_number',dv.version_number,'status',dv.status,'configuration',dv.configuration,'content_hash',dv.content_hash,'published_at',dv.published_at,
        'dimensions',(select coalesce(jsonb_agg(jsonb_build_object('id',dim.id,'code',dim.code,'name',dim.name,'description',dim.description,'minimum_answer_ratio',dim.minimum_answer_ratio,'position',dim.position) order by dim.position),'[]'::jsonb) from diagnostics.dimensions dim where dim.diagnostic_version_id=dv.id),
        'items',(select coalesce(jsonb_agg(jsonb_build_object(
          'id',it.id,'code',it.code,'item_type',it.item_type,'prompt',it.prompt,'position',it.position,'is_required',it.is_required,
          'dimension_code',(select dim2.code from diagnostics.dimensions dim2 where dim2.id=it.dimension_id),
          'options',(select coalesce(jsonb_agg(jsonb_build_object('id',opt.id,'code',opt.code,'label',opt.label,'value',opt.value,'position',opt.position) order by opt.position),'[]'::jsonb) from diagnostics.item_options opt where opt.item_id=it.id)
        ) order by it.position),'[]'::jsonb) from diagnostics.items it where it.diagnostic_version_id=dv.id),
        'archetypes',(select coalesce(jsonb_agg(jsonb_build_object('code',ad2.code,'name',ad2.name,'description',ad2.description) order by ad2.name),'[]'::jsonb)
          from diagnostics.archetype_definitions ad2
          where ad2.owner_organization_id=p_organization_id
            and exists (select 1 from diagnostics.archetype_versions av2 where av2.archetype_definition_id=ad2.id and av2.model_reference=dv.id::text))
      ) order by dv.version_number desc),'[]'::jsonb) from diagnostics.diagnostic_versions dv where dv.diagnostic_definition_id=dd.id)
    ) order by dd.name),'[]'::jsonb) from diagnostics.diagnostic_definitions dd where dd.owner_organization_id=p_organization_id),
    'point_rules',(select coalesce(jsonb_agg(jsonb_build_object('definition_id',pd.id,'code',pd.code,'name',pd.name,'status',pd.status,'versions',(select coalesce(jsonb_agg(to_jsonb(pv) order by pv.version_number desc),'[]'::jsonb) from engagement.point_rule_versions pv where pv.point_rule_definition_id=pd.id)) order by pd.name),'[]'::jsonb) from engagement.point_rule_definitions pd where pd.owner_organization_id=p_organization_id),
    'badges',(select coalesce(jsonb_agg(jsonb_build_object('definition_id',bd.id,'code',bd.code,'name',bd.name,'status',bd.status,'versions',(select coalesce(jsonb_agg(to_jsonb(bv) order by bv.version_number desc),'[]'::jsonb) from engagement.badge_versions bv where bv.badge_definition_id=bd.id)) order by bd.name),'[]'::jsonb) from engagement.badge_definitions bd where bd.owner_organization_id=p_organization_id),
    'certificates',(select coalesce(jsonb_agg(jsonb_build_object('definition_id',cd.id,'code',cd.code,'name',cd.name,'status',cd.status,'versions',(select coalesce(jsonb_agg(to_jsonb(cv) order by cv.version_number desc),'[]'::jsonb) from engagement.certificate_versions cv where cv.certificate_definition_id=cd.id)) order by cd.name),'[]'::jsonb) from engagement.certificate_definitions cd where cd.owner_organization_id=p_organization_id)
  );
end;
$function$;
