begin;

create table if not exists intelligence.behavior_score_configurations (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null unique references iam.organizations(id) on delete cascade,
  configuration jsonb not null check (jsonb_typeof(configuration)='object'),
  status text not null default 'active' check (status in ('active','inactive')),
  updated_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists intelligence.behavior_score_configuration_history (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid not null references intelligence.behavior_score_configurations(id) on delete cascade,
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  configuration jsonb not null check (jsonb_typeof(configuration)='object'),
  changed_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now()
);

alter table intelligence.behavior_score_snapshots
  add column if not exists raw_score numeric,
  add column if not exists classification text,
  add column if not exists configuration_id uuid references intelligence.behavior_score_configurations(id),
  add column if not exists configuration_snapshot jsonb not null default '{}'::jsonb;

create table if not exists intelligence.behavior_score_history (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  entrepreneur_id uuid not null references core.entrepreneurs(id) on delete cascade,
  score_version_id uuid not null references intelligence.score_versions(id),
  configuration_id uuid references intelligence.behavior_score_configurations(id),
  raw_score numeric not null,
  total_score numeric not null,
  dimensions jsonb not null check (jsonb_typeof(dimensions)='object'),
  classification text,
  confidence numeric not null,
  event_count bigint not null,
  input_snapshot_hash text not null,
  calculated_at timestamptz not null default now()
);

create index if not exists ix_behavior_score_history_entrepreneur_calculated
  on intelligence.behavior_score_history(entrepreneur_id,calculated_at desc);
create index if not exists ix_behavior_score_history_organization_calculated
  on intelligence.behavior_score_history(owner_organization_id,calculated_at desc);

alter table intelligence.behavior_score_configurations enable row level security;
alter table intelligence.behavior_score_configurations force row level security;
alter table intelligence.behavior_score_configuration_history enable row level security;
alter table intelligence.behavior_score_configuration_history force row level security;
alter table intelligence.behavior_score_history enable row level security;
alter table intelligence.behavior_score_history force row level security;

revoke all on intelligence.behavior_score_configurations from public,anon,authenticated;
revoke all on intelligence.behavior_score_configuration_history from public,anon,authenticated;
revoke all on intelligence.behavior_score_history from public,anon,authenticated;

create or replace function app_private.default_behavior_score_configuration()
returns jsonb
language sql
immutable
set search_path to 'pg_catalog'
as $function$
  select '{
    "formula":"weighted_average",
    "normalization":{"minimum":0,"maximum":100},
    "confidence":{"events_for_full_confidence":30},
    "dimensions":[
      {"code":"engagement","name":"Engajamento","metric":"event_count","weight":1,"multiplier":2.5,"offset":0,"cap":100},
      {"code":"consistency","name":"Consistência","metric":"active_days","weight":1,"multiplier":8,"offset":0,"cap":100},
      {"code":"depth","name":"Profundidade","metric":"depth_events","weight":1,"multiplier":5,"offset":0,"cap":100},
      {"code":"completion","name":"Conclusão","metric":"completion_events","weight":1,"multiplier":12,"offset":0,"cap":100},
      {"code":"autonomy","name":"Autonomia","metric":"autonomy_events","weight":1,"multiplier":7,"offset":0,"cap":100},
      {"code":"quality","name":"Qualidade","metric":"quality_average","weight":1,"multiplier":1,"offset":0,"cap":100},
      {"code":"evolution","name":"Evolução","metric":"completion_events","weight":1,"multiplier":8,"offset":0,"cap":100},
      {"code":"return_frequency","name":"Frequência de retorno","metric":"active_weeks","weight":1,"multiplier":15,"offset":0,"cap":100}
    ],
    "classifications":[
      {"code":"initial","label":"Início","minimum":0,"maximum":39.99},
      {"code":"developing","label":"Em desenvolvimento","minimum":40,"maximum":69.99},
      {"code":"advanced","label":"Avançado","minimum":70,"maximum":100}
    ]
  }'::jsonb
$function$;

create or replace function app_private.validate_behavior_score_configuration(p_configuration jsonb)
returns jsonb
language plpgsql
immutable
set search_path to 'pg_catalog'
as $function$
declare
  v_configuration jsonb:=coalesce(p_configuration,app_private.default_behavior_score_configuration());
  v_dimension jsonb;
  v_classification jsonb;
  v_codes text[]:=array[]::text[];
  v_formula text;
  v_minimum numeric;
  v_maximum numeric;
  v_events numeric;
begin
  if jsonb_typeof(v_configuration)<>'object' then raise exception 'BEHAVIOR_CONFIGURATION_INVALID' using errcode='22023'; end if;
  v_formula:=coalesce(nullif(v_configuration->>'formula',''),'weighted_average');
  if v_formula not in ('weighted_average','weighted_sum') then raise exception 'BEHAVIOR_FORMULA_INVALID' using errcode='22023'; end if;
  if jsonb_typeof(v_configuration->'dimensions')<>'array'
    or jsonb_array_length(v_configuration->'dimensions') not between 1 and 20 then
    raise exception 'BEHAVIOR_DIMENSIONS_INVALID' using errcode='22023';
  end if;

  for v_dimension in select value from jsonb_array_elements(v_configuration->'dimensions')
  loop
    if jsonb_typeof(v_dimension)<>'object'
      or coalesce(v_dimension->>'code','')!~'^[a-z][a-z0-9_]{1,49}$'
      or nullif(btrim(v_dimension->>'name'),'') is null
      or v_dimension->>'metric' not in (
        'event_count','active_days','depth_events','completion_events',
        'autonomy_events','quality_average','active_weeks'
      )
      or coalesce((v_dimension->>'weight')::numeric,-1)<0
      or coalesce((v_dimension->>'multiplier')::numeric,0)<=0
      or coalesce((v_dimension->>'cap')::numeric,-1) not between 0 and 100 then
      raise exception 'BEHAVIOR_DIMENSION_INVALID' using errcode='22023';
    end if;
    if (v_dimension->>'code')=any(v_codes) then raise exception 'BEHAVIOR_DIMENSION_DUPLICATE' using errcode='22023'; end if;
    v_codes:=array_append(v_codes,v_dimension->>'code');
  end loop;

  v_minimum:=coalesce((v_configuration#>>'{normalization,minimum}')::numeric,0);
  v_maximum:=coalesce((v_configuration#>>'{normalization,maximum}')::numeric,100);
  if v_minimum>=v_maximum then raise exception 'BEHAVIOR_NORMALIZATION_INVALID' using errcode='22023'; end if;
  v_events:=coalesce((v_configuration#>>'{confidence,events_for_full_confidence}')::numeric,30);
  if v_events<=0 then raise exception 'BEHAVIOR_CONFIDENCE_INVALID' using errcode='22023'; end if;

  if jsonb_typeof(v_configuration->'classifications')<>'array'
    or jsonb_array_length(v_configuration->'classifications') not between 1 and 12 then
    raise exception 'BEHAVIOR_CLASSIFICATIONS_INVALID' using errcode='22023';
  end if;
  for v_classification in select value from jsonb_array_elements(v_configuration->'classifications')
  loop
    if jsonb_typeof(v_classification)<>'object'
      or coalesce(v_classification->>'code','')!~'^[a-z][a-z0-9_]{1,49}$'
      or nullif(btrim(v_classification->>'label'),'') is null
      or (v_classification->>'minimum')::numeric>(v_classification->>'maximum')::numeric
      or (v_classification->>'minimum')::numeric<0
      or (v_classification->>'maximum')::numeric>100 then
      raise exception 'BEHAVIOR_CLASSIFICATION_INVALID' using errcode='22023';
    end if;
  end loop;

  return jsonb_build_object(
    'formula',v_formula,
    'normalization',jsonb_build_object('minimum',v_minimum,'maximum',v_maximum),
    'confidence',jsonb_build_object('events_for_full_confidence',v_events),
    'dimensions',v_configuration->'dimensions',
    'classifications',v_configuration->'classifications'
  );
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'BEHAVIOR_CONFIGURATION_INVALID_NUMBER' using errcode='22023';
end;
$function$;

commit;
