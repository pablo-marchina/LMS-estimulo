do $$
declare v_org uuid; v_rule uuid; r record; v_def uuid; v_ver integer;
begin
 select id into v_org from iam.organizations where slug in ('estimulo','e14-internal') order by (slug='estimulo') desc limit 1;
 select id into v_rule from orchestration.rule_versions where status='published' order by published_at desc nulls last,created_at desc limit 1;
 for r in select * from (values
 ('rate_lesson','Avaliar uma aula',1,'Compartilhar uma avaliação sobre o conteúdo.','per_activity'),
 ('complete_quick_activity','Responder uma atividade rápida',2,'Concluir a verificação rápida de aprendizagem.','per_assessment'),
 ('complete_lesson','Concluir uma aula',5,'Assistir e concluir uma aula publicada.','per_activity'),
 ('complete_welcome','Concluir as boas-vindas',10,'Finalizar a etapa inicial da plataforma.','once'),
 ('complete_basic_module','Concluir o módulo básico',15,'Finalizar todos os conteúdos do módulo básico.','per_journey'),
 ('submit_practice','Enviar uma atividade prática',20,'Entregar uma aplicação prática do conteúdo.','per_activity'),
 ('pass_path_assessment','Aprovar-se na avaliação da trilha',30,'Atingir a nota mínima da trilha.','per_path'),
 ('complete_bonus_content','Concluir o conteúdo bônus',30,'Finalizar o conteúdo bônus avançado.','per_activity'),
 ('choose_application_objective','Escolher um objetivo de aplicação',50,'Definir o caso de uso que será desenvolvido.','once'),
 ('pass_basic_assessment','Aprovar-se na avaliação básica',50,'Atingir a nota mínima da avaliação básica.','per_journey'),
 ('pass_advanced_assessment','Aprovar-se na avaliação avançada',50,'Atingir a nota mínima da avaliação avançada.','per_journey')
 ) x(code,name,amount,description,frequency)
 loop
   v_def:=app_private.e14_deterministic_uuid('point-rule-definition|'||r.code);
   insert into engagement.point_rule_definitions(id,owner_organization_id,code,name,status)
   values(v_def,v_org,r.code,r.name,'active')
   on conflict(id) do update set name=excluded.name,status='active';
   select coalesce(max(version_number),0)+1 into v_ver from engagement.point_rule_versions where point_rule_definition_id=v_def;
   if not exists(select 1 from engagement.point_rule_versions prv where prv.point_rule_definition_id=v_def and prv.status='published' and prv.amount=r.amount and prv.recurrence_policy->>'description'=r.description) then
     update engagement.point_rule_versions set status='retired' where point_rule_definition_id=v_def and status='published';
     insert into engagement.point_rule_versions(id,point_rule_definition_id,version_number,status,amount,eligibility_rule_version_id,recurrence_policy,published_at)
     values(app_private.e14_deterministic_uuid('point-rule-version|'||r.code||'|'||r.amount::text),v_def,v_ver,'published',r.amount,v_rule,jsonb_build_object('frequency',r.frequency,'maximum_awards',1,'description',r.description),now())
     on conflict(id) do update set status='published',amount=excluded.amount,recurrence_policy=excluded.recurrence_policy,published_at=now();
   end if;
 end loop;
end $$;

create or replace function public.award_participant_action_points(p_actor_user_account_id uuid,p_journey_instance_id uuid,p_action_code text,p_source_reference text,p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
 v_ent uuid; v_org uuid; v_rule uuid; v_amount integer; v_ledger uuid; v_event uuid; v_projection uuid; v_balance integer;
begin
 perform app_private.e14_validate_idempotency_key(p_idempotency_key);
 v_ent:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
 if v_ent is null then raise exception 'ENTREPRENEUR_NOT_FOUND' using errcode='P0002'; end if;
 select coalesce(jd.owner_organization_id,(select id from iam.organizations where slug='estimulo' limit 1)) into v_org
 from orchestration.journey_instances ji join orchestration.enrollments en on en.id=ji.enrollment_id join catalog.journey_versions jv on jv.id=en.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
 where ji.id=p_journey_instance;
 if v_org is null then select id into v_org from iam.organizations order by created_at limit 1; end if;
 select prv.id,prv.amount into v_rule,v_amount from engagement.point_rule_definitions prd join engagement.point_rule_versions prv on prv.point_rule_definition_id=prd.id where prd.code=p_action_code and prd.status='active' and prv.status='published' order by prv.version_number desc limit 1;
 if v_rule is null then raise exception 'POINT_RULE_NOT_PUBLISHED' using errcode='P0002'; end if;
 v_ledger:=app_private.e14_deterministic_uuid('points|'||p_actor_user_account_id::text||'|'||p_action_code||'|'||coalesce(p_source_reference,''));
 if exists(select 1 from engagement.point_ledger where id=v_ledger or idempotency_key=p_idempotency_key) then
   select amount into v_amount from engagement.point_ledger where id=v_ledger or idempotency_key=p_idempotency_key limit 1;
   return jsonb_build_object('replayed',true,'amount',v_amount,'action_code',p_action_code);
 end if;
 v_event:=app_private.e14_deterministic_uuid('points-event|'||v_ledger::text);
 perform app_private.e14_append_event(v_event,'engagement.points.awarded','point_ledger',v_ledger,'user_account',p_actor_user_account_id,v_org,p_journey_instance_id,'entrepreneur',v_ent,1,v_event,null,jsonb_build_object('code',p_action_code,'amount',v_amount,'source_reference',p_source_reference));
 insert into engagement.point_ledger(id,entrepreneur_id,journey_instance_id,point_rule_version_id,amount,source_event_id,idempotency_key,reason,reverses_entry_id,occurred_at)
 values(v_ledger,v_ent,p_journey_instance_id,v_rule,v_amount,v_event,p_idempotency_key,p_action_code,null,now());
 select id,balance into v_projection,v_balance from engagement.point_balance_projections where entrepreneur_id=v_ent and journey_instance_id is not distinct from p_journey_instance_id order by updated_at desc limit 1;
 if v_projection is null then
   insert into engagement.point_balance_projections(id,entrepreneur_id,journey_instance_id,balance,last_ledger_entry_id,projection_version,updated_at)
   values(app_private.e14_deterministic_uuid('point-balance|'||v_ent::text||'|'||coalesce(p_journey_instance_id::text,'global')),v_ent,p_journey_instance_id,v_amount,v_ledger,1,now());
 else
   update engagement.point_balance_projections set balance=balance+v_amount,last_ledger_entry_id=v_ledger,projection_version=projection_version+1,updated_at=now() where id=v_projection;
 end if;
 return jsonb_build_object('replayed',false,'amount',v_amount,'action_code',p_action_code,'ledger_id',v_ledger);
end;
$$;
revoke all on function public.award_participant_action_points(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.award_participant_action_points(uuid,uuid,text,text,text) to service_role;