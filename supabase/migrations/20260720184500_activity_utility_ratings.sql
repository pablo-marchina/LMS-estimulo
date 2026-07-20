set lock_timeout = '5s';
set statement_timeout = '5min';

create table engagement.activity_utility_ratings (
  step_instance_id uuid not null references orchestration.step_instances(id),
  actor_user_account_id uuid not null references iam.user_accounts(id),
  organization_id uuid not null references iam.organizations(id),
  journey_instance_id uuid not null references orchestration.journey_instances(id),
  entrepreneur_id uuid not null references core.entrepreneurs(id),
  activity_version_id uuid not null references catalog.activity_versions(id),
  rating smallint not null,
  revision integer not null,
  latest_event_id uuid not null references eventing.events(event_id),
  updated_at timestamptz not null,
  primary key(step_instance_id,actor_user_account_id),
  constraint activity_utility_ratings_rating_check check (rating between 1 and 5),
  constraint activity_utility_ratings_revision_check check (revision > 0)
);
create index activity_utility_ratings_org_updated_idx
  on engagement.activity_utility_ratings(organization_id,updated_at desc);
alter table engagement.activity_utility_ratings enable row level security;
alter table engagement.activity_utility_ratings force row level security;
revoke all on engagement.activity_utility_ratings from public,anon,authenticated;

create table engagement.activity_utility_rating_revisions (
  id uuid primary key,
  step_instance_id uuid not null references orchestration.step_instances(id),
  actor_user_account_id uuid not null references iam.user_accounts(id),
  organization_id uuid not null references iam.organizations(id),
  journey_instance_id uuid not null references orchestration.journey_instances(id),
  entrepreneur_id uuid not null references core.entrepreneurs(id),
  activity_version_id uuid not null references catalog.activity_versions(id),
  rating smallint not null,
  revision integer not null,
  idempotency_key text not null,
  request_hash text not null,
  event_id uuid not null references eventing.events(event_id),
  context jsonb not null,
  result_snapshot jsonb not null,
  created_at timestamptz not null,
  constraint activity_utility_rating_revisions_rating_check check (rating between 1 and 5),
  constraint activity_utility_rating_revisions_revision_check check (revision > 0),
  constraint activity_utility_rating_revisions_context_object check (jsonb_typeof(context)='object'),
  constraint activity_utility_rating_revisions_context_size check (octet_length(context::text)<=2048),
  constraint activity_utility_rating_revisions_idempotency_unique unique(actor_user_account_id,idempotency_key),
  constraint activity_utility_rating_revisions_revision_unique unique(step_instance_id,actor_user_account_id,revision)
);
create index activity_utility_rating_revisions_step_created_idx
  on engagement.activity_utility_rating_revisions(step_instance_id,created_at desc);
alter table engagement.activity_utility_rating_revisions enable row level security;
alter table engagement.activity_utility_rating_revisions force row level security;
revoke all on engagement.activity_utility_rating_revisions from public,anon,authenticated;
create trigger trg_activity_utility_rating_revisions_append_only
  before update or delete on engagement.activity_utility_rating_revisions
  for each row execute function governance.reject_mutation();

with schema_data as (
  select 'learning.activity.utility.rated'::text event_name,
    '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":false,"required":["step_instance_id","activity_version_id","rating","revision","crm_sync_status"],"properties":{"step_instance_id":{"type":"string","format":"uuid"},"activity_version_id":{"type":"string","format":"uuid"},"rating":{"type":"integer","minimum":1,"maximum":5},"revision":{"type":"integer","minimum":1},"crm_sync_status":{"const":"not_synced_pending_signal_catalog_approval"}}}'::jsonb schema_document
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select app_private.e14_deterministic_uuid('event-schema:'||event_name||':1'),event_name,1,
  'urn:estimulo:event:'||event_name||':1',schema_document,
  app_private.e14_request_hash(jsonb_build_object('event_name',event_name,'version',1,'schema',schema_document)),
  'published',now()
from schema_data
on conflict (event_name,event_version) do nothing;

create or replace function public.rate_activity_utility(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid,
  p_rating integer,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_journey_instance_id uuid;
  v_organization_id uuid;
  v_entrepreneur_id uuid;
  v_actor_entrepreneur_id uuid;
  v_activity_version_id uuid;
  v_step_status text;
  v_accepted_sections integer;
  v_required_sections integer;
  v_request_hash text;
  v_prior engagement.activity_utility_rating_revisions%rowtype;
  v_revision integer;
  v_event_id uuid;
  v_revision_id uuid;
  v_created_at timestamptz:=clock_timestamp();
  v_context jsonb;
  v_snapshot jsonb;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'ACTIVITY_UTILITY_RATING_INVALID' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('activity-utility:'||p_actor_user_account_id::text||':'||p_step_instance_id::text,0)
  );

  select pa.journey_instance_id,app_private.journey_owner_organization_id(pa.journey_instance_id),
         en.entrepreneur_id,si.activity_version_id,si.status,
         coalesce((select max(ac.accepted_observation_count) from orchestration.activity_sessions ac where ac.step_instance_id=si.id),0),
         jsonb_array_length(coalesce(av.configuration->'content_sections','[]'::jsonb))
  into v_journey_instance_id,v_organization_id,v_entrepreneur_id,v_activity_version_id,v_step_status,
       v_accepted_sections,v_required_sections
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  join orchestration.enrollments en on en.id=ji.enrollment_id
  join catalog.activity_versions av on av.id=si.activity_version_id
  where si.id=p_step_instance_id;

  if v_journey_instance_id is null then
    raise exception 'ACTIVITY_STEP_NOT_FOUND' using errcode='P0002';
  end if;
  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id<>v_entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_step_status not in ('in_progress','completed') then
    raise exception 'ACTIVITY_UTILITY_RATING_NOT_AVAILABLE' using errcode='55000';
  end if;
  if v_required_sections<1 or v_accepted_sections<v_required_sections then
    raise exception 'ACTIVITY_UTILITY_CONTENT_NOT_CONFIRMED' using errcode='55000';
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'step_instance_id',p_step_instance_id,'rating',p_rating
  ));
  select * into v_prior
  from engagement.activity_utility_rating_revisions
  where actor_user_account_id=p_actor_user_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_prior.request_hash<>v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return jsonb_build_object(
      'request_id',v_prior.event_id,'idempotency_key',p_idempotency_key,
      'replayed',true,'data',v_prior.result_snapshot
    );
  end if;

  select coalesce(max(r.revision),0)+1 into v_revision
  from engagement.activity_utility_rating_revisions r
  where r.step_instance_id=p_step_instance_id and r.actor_user_account_id=p_actor_user_account_id;
  v_event_id:=app_private.e14_command_event_id(
    'rate_activity_utility',p_actor_user_account_id,p_step_instance_id,p_idempotency_key
  );
  v_revision_id:=app_private.e14_deterministic_uuid(
    'activity-utility-rating:'||p_actor_user_account_id::text||':'||p_idempotency_key
  );
  v_context:=jsonb_build_object(
    'surface','activity',
    'step_status',v_step_status,
    'collection_purpose','perceived_utility',
    'credit_use','forbidden',
    'crm_sync_status','not_synced_pending_signal_catalog_approval'
  );
  v_snapshot:=jsonb_build_object(
    'step_instance_id',p_step_instance_id,
    'activity_version_id',v_activity_version_id,
    'rating',p_rating,
    'revision',v_revision,
    'updated_at',v_created_at
  );

  perform app_private.e14_append_event(
    v_event_id,'learning.activity.utility.rated','entrepreneur',v_entrepreneur_id,
    'user_account',p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    'activity_utility_rating',app_private.e14_deterministic_uuid(
      'activity-utility-rating-current:'||p_actor_user_account_id::text||':'||p_step_instance_id::text
    ),v_revision,v_event_id,null,
    jsonb_build_object(
      'step_instance_id',p_step_instance_id,
      'activity_version_id',v_activity_version_id,
      'rating',p_rating,
      'revision',v_revision,
      'crm_sync_status','not_synced_pending_signal_catalog_approval'
    )
  );

  insert into engagement.activity_utility_rating_revisions(
    id,step_instance_id,actor_user_account_id,organization_id,journey_instance_id,
    entrepreneur_id,activity_version_id,rating,revision,idempotency_key,request_hash,
    event_id,context,result_snapshot,created_at
  ) values(
    v_revision_id,p_step_instance_id,p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    v_entrepreneur_id,v_activity_version_id,p_rating,v_revision,p_idempotency_key,v_request_hash,
    v_event_id,v_context,v_snapshot,v_created_at
  );

  insert into engagement.activity_utility_ratings(
    step_instance_id,actor_user_account_id,organization_id,journey_instance_id,
    entrepreneur_id,activity_version_id,rating,revision,latest_event_id,updated_at
  ) values(
    p_step_instance_id,p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    v_entrepreneur_id,v_activity_version_id,p_rating,v_revision,v_event_id,v_created_at
  )
  on conflict (step_instance_id,actor_user_account_id) do update
    set rating=excluded.rating,
        revision=excluded.revision,
        latest_event_id=excluded.latest_event_id,
        updated_at=excluded.updated_at;

  return jsonb_build_object(
    'request_id',v_event_id,'idempotency_key',p_idempotency_key,
    'replayed',false,'data',v_snapshot
  );
end;
$$;

create or replace function public.get_activity_utility_rating(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_enrolled_entrepreneur_id uuid;
  v_actor_entrepreneur_id uuid;
  v_rating engagement.activity_utility_ratings%rowtype;
begin
  select en.entrepreneur_id into v_enrolled_entrepreneur_id
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  join orchestration.enrollments en on en.id=ji.enrollment_id
  where si.id=p_step_instance_id;
  if v_enrolled_entrepreneur_id is null then
    raise exception 'ACTIVITY_STEP_NOT_FOUND' using errcode='P0002';
  end if;
  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id<>v_enrolled_entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select * into v_rating
  from engagement.activity_utility_ratings r
  where r.step_instance_id=p_step_instance_id and r.actor_user_account_id=p_actor_user_account_id;
  return jsonb_build_object(
    'step_instance_id',p_step_instance_id,
    'rating',case when found then v_rating.rating else null end,
    'revision',case when found then v_rating.revision else 0 end,
    'updated_at',case when found then v_rating.updated_at else null end
  );
end;
$$;

revoke all on function public.rate_activity_utility(uuid,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.get_activity_utility_rating(uuid,uuid) from public,anon,authenticated;
grant execute on function public.rate_activity_utility(uuid,uuid,integer,text) to service_role,app_worker;
grant execute on function public.get_activity_utility_rating(uuid,uuid) to service_role,app_worker;
