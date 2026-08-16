-- Complete the remaining structural remediation from Vanessa's walkthrough.
-- This migration matches the migration already applied to production.

select set_config('app.admin_live_edit','on',true);

-- Self-paced journeys may explicitly opt into having every published path
-- assigned. Runtime code consumes this generic flag; there is no OpenAI-specific
-- branch in the application.
update catalog.journey_versions jv
set configuration=jsonb_set(coalesce(jv.configuration,'{}'::jsonb),'{open_all_paths}','true'::jsonb,true)
from catalog.journey_definitions jd
where jd.id=jv.journey_definition_id
  and jd.code='capacitacao_ia_mei_openai'
  and jv.status='published';

create or replace function public.ensure_participant_open_paths(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_open_all boolean;
  v_entrepreneur_id uuid;
  v_actor_entrepreneur_id uuid;
  v_result jsonb;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);

  select coalesce((jv.configuration->>'open_all_paths')::boolean,false),e.entrepreneur_id
    into v_open_all,v_entrepreneur_id
  from orchestration.journey_instances ji
  join orchestration.enrollments e on e.id=ji.enrollment_id
  join catalog.journey_versions jv on jv.id=e.journey_version_id
  where ji.id=p_journey_instance_id;

  if not found then raise exception 'JOURNEY_INSTANCE_NOT_FOUND' using errcode='P0002'; end if;
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id<>v_entrepreneur_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;

  if not v_open_all then
    return jsonb_build_object('journey_instance_id',p_journey_instance_id,'open_all_paths',false,'reconciled',false);
  end if;

  v_result:=public.ensure_participant_default_path(p_actor_user_account_id,p_journey_instance_id,p_idempotency_key);
  return coalesce(v_result,'{}'::jsonb)||jsonb_build_object('open_all_paths',true,'reconciled',true);
end;
$$;
revoke all on function public.ensure_participant_open_paths(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.ensure_participant_open_paths(uuid,uuid,text) to service_role,app_worker;

-- Repair existing active participants immediately. New/returning participant
-- reads self-heal through getParticipantJourneyOutline.
do $$
declare v_row record;
begin
  for v_row in
    select ji.id as journey_instance_id,ce.user_account_id
    from orchestration.journey_instances ji
    join orchestration.enrollments e on e.id=ji.enrollment_id
    join core.entrepreneurs ce on ce.id=e.entrepreneur_id
    join catalog.journey_versions jv on jv.id=e.journey_version_id
    where ji.status in ('available','in_progress')
      and coalesce((jv.configuration->>'open_all_paths')::boolean,false)
      and ce.user_account_id is not null
  loop
    perform public.ensure_participant_open_paths(v_row.user_account_id,v_row.journey_instance_id,'open-paths-'||v_row.journey_instance_id::text);
  end loop;
end;
$$;

-- Distinguish trail assessments from the formation-base and advanced final
-- challenges. Each event now matches exactly one canonical point rule.
do $$
declare
  v_cfg record;
  v_definition engagement.point_rule_definitions%rowtype;
  v_current engagement.point_rule_versions%rowtype;
  v_next integer;
  v_policy jsonb;
begin
  for v_cfg in
    select * from (values
      ('pass_path_assessment','Aprovar a avaliação final da trilha',30,'path','per_path',array['marketing_aula_4','gestao_aula_5','codex_aula_6']::text[],array['marketing_vendas_ia','gestao_ia','desenvolvimento_codex']::text[],'Atingir a nota mínima da avaliação final de uma trilha.'),
      ('pass_basic_assessment','Aprovar o desafio final da formação-base',50,'journey','per_journey',array['openai_v2_avaliacao_base']::text[],array['avaliacao_base']::text[],'Atingir a nota mínima do desafio final da formação-base.'),
      ('pass_advanced_assessment','Aprovar o desafio avançado com Codex',50,'journey','per_journey',array['openai_v2_avaliacao_avancada']::text[],array['avaliacao_avancada']::text[],'Atingir a nota mínima do desafio avançado com Codex.')
    ) as x(code,new_name,amount,scope,frequency,activity_codes,path_codes,description)
  loop
    select * into strict v_definition from engagement.point_rule_definitions where code=v_cfg.code and status='active';
    select * into strict v_current from engagement.point_rule_versions where point_rule_definition_id=v_definition.id and status='published' order by version_number desc limit 1;
    update engagement.point_rule_versions set status='retired' where point_rule_definition_id=v_definition.id and status='published';
    update engagement.point_rule_definitions set name=v_cfg.new_name where id=v_definition.id;
    select coalesce(max(version_number),0)+1 into v_next from engagement.point_rule_versions where point_rule_definition_id=v_definition.id;
    v_policy:=jsonb_build_object(
      'scope',v_cfg.scope,
      'frequency',v_cfg.frequency,
      'maximum',1,
      'maximum_awards',1,
      'transferable',false,
      'description',v_cfg.description,
      'trigger',jsonb_build_object('event_name','assessment.attempt.passed','activity_codes',to_jsonb(v_cfg.activity_codes),'path_codes',to_jsonb(v_cfg.path_codes))
    );
    insert into engagement.point_rule_versions(point_rule_definition_id,version_number,status,amount,eligibility_rule_version_id,recurrence_policy,published_at)
    values(v_definition.id,v_next,'published',v_cfg.amount,v_current.eligibility_rule_version_id,v_policy,now());
  end loop;
end;
$$;

-- Fold in the former unapplied complete-lesson deduplication migration so
-- repository and production histories converge on one canonical migration.
with ranked_complete_lesson_rules as (
  select pv.id,row_number() over (
    partition by pd.owner_organization_id,pd.code
    order by (
      pv.amount=5 and pv.recurrence_policy->>'scope'='enrollment_activity'
      and pv.recurrence_policy->>'maximum'='1'
      and pv.recurrence_policy#>>'{trigger,event_name}'='learning.activity.completed'
    ) desc,pv.version_number desc,pv.published_at desc nulls last,pv.id desc
  ) as publication_rank
  from engagement.point_rule_definitions pd
  join engagement.point_rule_versions pv on pv.point_rule_definition_id=pd.id
  where pd.code='complete_lesson' and pd.status='active' and pv.status='published'
)
update engagement.point_rule_versions pv set status='retired'
from ranked_complete_lesson_rules ranked
where pv.id=ranked.id and ranked.publication_rank>1;

-- Remove superseded credential versions that still looked published to admins.
with ranked as (
  select bv.id,row_number() over (partition by bv.badge_definition_id order by (pt.id is not null) desc,bv.version_number desc,bv.published_at desc nulls last,bv.id desc) rn
  from engagement.badge_versions bv
  join engagement.badge_definitions bd on bd.id=bv.badge_definition_id and bd.status='active'
  left join orchestration.rule_versions rv on rv.id=bv.criteria_rule_version_id
  left join orchestration.path_templates pt on pt.id=(rv.expression->>'path_template_id')::uuid and pt.status='published'
  where bv.status='published'
)
update engagement.badge_versions bv set status='retired'
from ranked where bv.id=ranked.id and ranked.rn>1;

with ranked as (
  select rv.id,row_number() over (partition by rv.rule_definition_id order by (pt.id is not null) desc,rv.version_number desc,rv.published_at desc nulls last,rv.id desc) rn
  from orchestration.rule_versions rv
  join orchestration.rule_definitions rd on rd.id=rv.rule_definition_id and rd.status='active' and rd.rule_type='credential'
  left join orchestration.path_templates pt on pt.id=(rv.expression->>'path_template_id')::uuid and pt.status='published'
  where rv.status='published' and rv.expression->>'scope'='path'
)
update orchestration.rule_versions rv set status='retired'
from ranked where rv.id=ranked.id and ranked.rn>1;

update engagement.certificate_definitions cd
set status='retired'
where cd.code='certificado_capacitacao_openai'
  and cd.status='active'
  and not exists(select 1 from engagement.certificate_versions cv where cv.certificate_definition_id=cd.id);

-- Exactly one active certificate background may exist for a given scope.
with ranked as (
  select id,row_number() over (
    partition by owner_organization_id,scope_type,coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid)
    order by created_at desc,id desc
  ) rn
  from engagement.certificate_template_assignments
  where active
)
update engagement.certificate_template_assignments a
set active=false,updated_at=now()
from ranked where a.id=ranked.id and ranked.rn>1;

create unique index if not exists uq_certificate_template_assignments_active_scope
on engagement.certificate_template_assignments(
  owner_organization_id,
  scope_type,
  (coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid))
) where active;

-- Persist the profile-specific result copy that previously existed only as a
-- frontend fallback. Admin edits now start from the same text participants see.
update diagnostics.diagnostic_versions dv
set configuration=jsonb_set(
  jsonb_set(coalesce(dv.configuration,'{}'::jsonb),'{result_blocks}',
    '["maturity_map","focus","right_content","real_application","strengths","challenge","practical_tip","takeaway"]'::jsonb,true),
  '{result_content}',
  jsonb_build_object(
    'fazedor',jsonb_build_object(
      'strength',jsonb_build_object('title','O que já joga a seu favor','body','Você conhece o seu trabalho, resolve problemas com rapidez e mantém o negócio em movimento mesmo diante da pressão do dia a dia.'),
      'challenge',jsonb_build_object('title','Onde concentrar energia agora','body','Transformar sua energia de execução em uma gestão mais organizada, com rotinas e planejamento que reduzam decisões de última hora.'),
      'practical_tip',jsonb_build_object('title','Um passo para começar','body','Escolha uma rotina simples de gestão para fortalecer primeiro — por exemplo, acompanhar entradas e saídas toda semana ou definir três prioridades para o mês.'),
      'takeaway',jsonb_build_object('title','Uma frase para o seu momento','body','Organizar o que você já faz bem cria espaço para crescer com mais tranquilidade.')
    ),
    'batalhador',jsonb_build_object(
      'strength',jsonb_build_object('title','O que já joga a seu favor','body','Sua persistência e capacidade de atravessar desafios mostram uma base empreendedora forte e disposição para manter o negócio funcionando.'),
      'challenge',jsonb_build_object('title','Onde concentrar energia agora','body','Ganhar previsibilidade financeira e operacional para decidir com menos pressão e construir uma base mais estável.'),
      'practical_tip',jsonb_build_object('title','Um passo para começar','body','Comece pelo indicador que mais reduz incerteza no seu dia a dia e acompanhe-o com frequência até ele virar uma rotina de gestão.'),
      'takeaway',jsonb_build_object('title','Uma frase para o seu momento','body','Uma base mais organizada transforma esforço em segurança para o próximo passo.')
    ),
    'construtor',jsonb_build_object(
      'strength',jsonb_build_object('title','O que já joga a seu favor','body','Você já acompanha melhor o negócio, organiza informações e toma decisões com uma base mais consistente.'),
      'challenge',jsonb_build_object('title','Onde concentrar energia agora','body','Transformar organização em crescimento planejado, conectando metas, indicadores e oportunidades a uma direção clara.'),
      'practical_tip',jsonb_build_object('title','Um passo para começar','body','Defina uma meta de crescimento concreta, escolha poucos indicadores para acompanhá-la e revise o avanço em uma cadência fixa.'),
      'takeaway',jsonb_build_object('title','Uma frase para o seu momento','body','Crescer com direção é transformar uma boa base em escolhas cada vez mais intencionais.')
    ),
    'navegador',jsonb_build_object(
      'strength',jsonb_build_object('title','O que já joga a seu favor','body','Você já administra com visão de futuro, acompanha resultados e consegue tomar decisões pensando além das urgências do presente.'),
      'challenge',jsonb_build_object('title','Onde concentrar energia agora','body','Escalar sem perder a qualidade da gestão, fortalecendo processos, pessoas e capacidade de execução conforme o negócio cresce.'),
      'practical_tip',jsonb_build_object('title','Um passo para começar','body','Identifique o processo que mais depende de você hoje e documente uma forma simples de delegar, medir e melhorar essa rotina.'),
      'takeaway',jsonb_build_object('title','Uma frase para o seu momento','body','O próximo nível chega quando o negócio cresce sem precisar concentrar tudo em você.')
    )
  ),true
)
from diagnostics.diagnostic_definitions dd
where dd.id=dv.diagnostic_definition_id
  and dd.code='business_maturity_self_assessment'
  and dv.status='published';

select set_config('app.admin_live_edit','off',true);
