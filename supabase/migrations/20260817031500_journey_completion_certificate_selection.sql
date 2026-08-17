-- Make the journey editor the explicit source of the completion-certificate policy.
--
-- The certificate catalog remains the source of certificate definitions/templates.
-- The journey configuration chooses whether completion emits a certificate and,
-- when enabled, exactly which published certificate version is eligible.

create or replace function app_private.validate_journey_completion_certificate_policy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_policy jsonb;
  v_enabled boolean;
  v_certificate_version_id uuid;
begin
  v_policy := new.configuration->'completion_certificate';

  if v_policy is null then
    return new;
  end if;

  if jsonb_typeof(v_policy) <> 'object' then
    raise exception 'INVALID_COMPLETION_CERTIFICATE_POLICY' using errcode = '22023';
  end if;

  begin
    v_enabled := coalesce((v_policy->>'enabled')::boolean, false);
  exception when invalid_text_representation then
    raise exception 'INVALID_COMPLETION_CERTIFICATE_POLICY' using errcode = '22023';
  end;

  if not v_enabled then
    return new;
  end if;

  begin
    v_certificate_version_id := nullif(v_policy->>'certificate_version_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'INVALID_COMPLETION_CERTIFICATE_VERSION' using errcode = '22023';
  end;

  if v_certificate_version_id is null then
    raise exception 'COMPLETION_CERTIFICATE_REQUIRED' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from engagement.certificate_versions cv
    join engagement.certificate_definitions cd
      on cd.id = cv.certificate_definition_id
    where cv.id = v_certificate_version_id
      and cv.journey_version_id = new.id
      and cv.status = 'published'
      and cd.status = 'active'
  ) then
    raise exception 'COMPLETION_CERTIFICATE_NOT_AVAILABLE_FOR_JOURNEY' using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function app_private.validate_journey_completion_certificate_policy() from public;
revoke all on function app_private.validate_journey_completion_certificate_policy() from anon, authenticated;

-- Existing journeys receive an explicit policy. Exactly one compatible published
-- certificate is safe to activate automatically. Zero or multiple candidates are
-- left disabled so the administrator must make the choice explicitly.
-- Published journey rows use the same transaction-local live-edit switch as the
-- canonical save_admin_journey command, preserving the immutability guard outside
-- this controlled migration transaction.
select set_config('app.admin_live_edit', 'on', true);

with certificate_candidates as (
  select
    jv.id as journey_version_id,
    count(cd.id) as candidate_count,
    (array_agg(cv.id order by cv.id) filter (where cd.id is not null))[1] as single_certificate_version_id
  from catalog.journey_versions jv
  left join engagement.certificate_versions cv
    on cv.journey_version_id = jv.id
   and cv.status = 'published'
  left join engagement.certificate_definitions cd
    on cd.id = cv.certificate_definition_id
   and cd.status = 'active'
  where jv.status in ('draft', 'published')
  group by jv.id
)
update catalog.journey_versions jv
set configuration = jsonb_set(
  coalesce(jv.configuration, '{}'::jsonb),
  '{completion_certificate}',
  jsonb_build_object(
    'enabled', candidates.candidate_count = 1,
    'certificate_version_id', case
      when candidates.candidate_count = 1 then candidates.single_certificate_version_id
      else null
    end,
    'trigger_event', 'journey.instance.completed',
    'data_fields', jsonb_build_array(
      'participant_name',
      'journey_title',
      'issued_at',
      'verification_code'
    )
  ),
  true
)
from certificate_candidates candidates
where candidates.journey_version_id = jv.id
  and not (coalesce(jv.configuration, '{}'::jsonb) ? 'completion_certificate');

select set_config('app.admin_live_edit', 'off', true);

drop trigger if exists trg_validate_journey_completion_certificate_policy
  on catalog.journey_versions;
create trigger trg_validate_journey_completion_certificate_policy
before insert or update of configuration on catalog.journey_versions
for each row
execute function app_private.validate_journey_completion_certificate_policy();

create or replace function app_private.learning_certificate_candidates(p_context jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  v_certificates jsonb := '[]'::jsonb;
  v_record record;
  v_issuance_id uuid;
  v_verification_code text;
  v_expires_at timestamptz;
  v_journey_instance_id uuid := (p_context->>'journey_instance_id')::uuid;
  v_journey_version_id uuid := (p_context->>'journey_version_id')::uuid;
  v_policy jsonb;
  v_enabled boolean := false;
  v_selected_certificate_version_id uuid;
begin
  if p_context->>'journey_status' <> 'completed' then
    return v_certificates;
  end if;

  select coalesce(jv.configuration->'completion_certificate', '{}'::jsonb)
  into v_policy
  from catalog.journey_versions jv
  where jv.id = v_journey_version_id;

  if not found then
    return v_certificates;
  end if;

  begin
    v_enabled := coalesce((v_policy->>'enabled')::boolean, false);
    v_selected_certificate_version_id := nullif(v_policy->>'certificate_version_id', '')::uuid;
  exception when invalid_text_representation then
    return v_certificates;
  end;

  if not v_enabled or v_selected_certificate_version_id is null then
    return v_certificates;
  end if;

  for v_record in
    select
      cv.id,
      cv.requirements_rule_version_id,
      cv.validity_policy,
      cd.name
    from engagement.certificate_versions cv
    join engagement.certificate_definitions cd
      on cd.id = cv.certificate_definition_id
    where cv.id = v_selected_certificate_version_id
      and cv.status = 'published'
      and cd.status = 'active'
      and cv.journey_version_id = v_journey_version_id
      and app_private.credential_rule_matches(
        cv.requirements_rule_version_id,
        'journey',
        v_journey_version_id,
        null,
        true,
        (p_context->>'required_steps_completed')::boolean,
        (p_context->>'required_assessments_passed')::boolean
      )
    order by cv.version_number desc, cv.id
  loop
    v_issuance_id := app_private.e14_deterministic_uuid(
      'certificate-issuance:' || v_journey_instance_id::text || ':' || v_record.id::text
    );
    v_verification_code := 'EST-' || upper(substr(
      app_private.e14_request_hash(jsonb_build_object('certificate_issuance_id', v_issuance_id)),
      1,
      20
    ));
    v_expires_at := null;

    if coalesce(v_record.validity_policy->>'expires_after_days', '') ~ '^[1-9][0-9]*$' then
      v_expires_at := clock_timestamp() + make_interval(
        days => (v_record.validity_policy->>'expires_after_days')::integer
      );
    elsif coalesce(v_record.validity_policy->>'duration_months', '') ~ '^[1-9][0-9]*$' then
      v_expires_at := clock_timestamp() + make_interval(
        months => (v_record.validity_policy->>'duration_months')::integer
      );
    end if;

    v_certificates := v_certificates || jsonb_build_array(jsonb_build_object(
      'issuance_id', v_issuance_id,
      'certificate_version_id', v_record.id,
      'name', v_record.name,
      'verification_code', v_verification_code,
      'expires_at', v_expires_at,
      'rule_version_id', v_record.requirements_rule_version_id
    ));
  end loop;

  return v_certificates;
end;
$function$;

comment on function app_private.validate_journey_completion_certificate_policy() is
  'Validates the certificate selected in catalog.journey_versions.configuration.completion_certificate.';
comment on function app_private.learning_certificate_candidates(jsonb) is
  'Returns at most the single published certificate explicitly enabled by the journey completion-certificate policy.';
