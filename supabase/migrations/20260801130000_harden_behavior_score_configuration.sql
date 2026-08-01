begin;

create or replace function app_private.validate_behavior_score_configuration_strict(p_configuration jsonb)
returns jsonb
language plpgsql
immutable
set search_path to 'pg_catalog'
as $function$
declare
  v_configuration jsonb:=app_private.validate_behavior_score_configuration(p_configuration);
  v_dimension jsonb;
  v_classification jsonb;
  v_codes text[]:=array[]::text[];
  v_total_weight numeric:=0;
  v_previous_maximum numeric;
  v_minimum numeric;
  v_maximum numeric;
  v_first boolean:=true;
begin
  for v_dimension in select value from jsonb_array_elements(v_configuration->'dimensions') loop v_total_weight:=v_total_weight+(v_dimension->>'weight')::numeric; end loop;
  if v_total_weight<=0 then raise exception 'BEHAVIOR_WEIGHT_TOTAL_INVALID' using errcode='22023'; end if;
  for v_classification in select value from jsonb_array_elements(v_configuration->'classifications') order by (value->>'minimum')::numeric,(value->>'maximum')::numeric loop
    if (v_classification->>'code')=any(v_codes) then raise exception 'BEHAVIOR_CLASSIFICATION_DUPLICATE' using errcode='22023'; end if;
    v_codes:=array_append(v_codes,v_classification->>'code');
    v_minimum:=(v_classification->>'minimum')::numeric; v_maximum:=(v_classification->>'maximum')::numeric;
    if v_first then
      if abs(v_minimum)>0.011 then raise exception 'BEHAVIOR_CLASSIFICATION_COVERAGE_INVALID' using errcode='22023'; end if;
      v_first:=false;
    else
      if v_minimum<=v_previous_maximum or v_minimum-v_previous_maximum>0.011 then raise exception 'BEHAVIOR_CLASSIFICATION_COVERAGE_INVALID' using errcode='22023'; end if;
    end if;
    v_previous_maximum:=v_maximum;
  end loop;
  if v_first or abs(v_previous_maximum-100)>0.011 then raise exception 'BEHAVIOR_CLASSIFICATION_COVERAGE_INVALID' using errcode='22023'; end if;
  return v_configuration;
end;
$function$;

create or replace function app_private.enforce_behavior_score_configuration()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $function$
begin
  new.configuration:=app_private.validate_behavior_score_configuration_strict(new.configuration);
  return new;
end;
$function$;

drop trigger if exists trg_behavior_score_configuration_validate on intelligence.behavior_score_configurations;
create trigger trg_behavior_score_configuration_validate before insert or update of configuration on intelligence.behavior_score_configurations for each row execute function app_private.enforce_behavior_score_configuration();
update intelligence.behavior_score_configurations set configuration=app_private.validate_behavior_score_configuration_strict(configuration) where true;
revoke all on function app_private.validate_behavior_score_configuration_strict(jsonb) from public,anon,authenticated;
revoke all on function app_private.enforce_behavior_score_configuration() from public,anon,authenticated;
grant execute on function app_private.validate_behavior_score_configuration_strict(jsonb) to service_role;
commit;
