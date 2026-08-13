begin;

create or replace function app_private.reconcile_complete_lesson_points(
  p_limit integer default 500
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_event record;
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 5000));
  v_repaired integer := 0;
  v_failed integer := 0;
  v_error text;
begin
  for v_event in
    select
      event.event_id,
      event.actor_id,
      event.journey_instance_id,
      event.aggregate_id,
      event.occurred_at
    from eventing.events event
    join engagement.point_rule_definitions definition
      on definition.owner_organization_id = event.organization_id
     and definition.code = 'complete_lesson'
     and definition.status = 'active'
    where event.event_name = 'learning.activity.completed'
      and event.actor_type = 'user_account'
      and event.actor_id is not null
      and event.aggregate_id is not null
      and exists (
        select 1
        from engagement.point_rule_versions version
        where version.point_rule_definition_id = definition.id
          and version.status = 'published'
          and version.published_at is not null
      )
      and not exists (
        select 1
        from engagement.point_ledger ledger
        where ledger.id = app_private.e14_deterministic_uuid(
          'points|' || event.actor_id::text || '|complete_lesson|' || event.aggregate_id::text
        )
      )
    order by event.occurred_at, event.event_id
    limit v_limit
  loop
    begin
      perform public.award_participant_action_points(
        v_event.actor_id,
        v_event.journey_instance_id,
        'complete_lesson',
        v_event.aggregate_id::text,
        'reconcile-lesson-' || v_event.event_id::text
      );

      update eventing.dead_letters
      set status = 'resolved',
          resolved_at = now(),
          resolution = 'POINT_AWARD_RECONCILED'
      where event_id = v_event.event_id
        and source_type = 'point_award'
        and reason_code = 'POINT_AWARD_FAILED'
        and status <> 'resolved';

      v_repaired := v_repaired + 1;
    exception when others then
      v_error := sqlerrm;
      v_failed := v_failed + 1;

      if exists (
        select 1
        from eventing.dead_letters
        where event_id = v_event.event_id
          and source_type = 'point_award'
          and reason_code = 'POINT_AWARD_FAILED'
          and status = 'open'
      ) then
        update eventing.dead_letters
        set reason_details = jsonb_build_object(
          'action_code', 'complete_lesson',
          'source_reference', v_event.aggregate_id::text,
          'last_error', v_error,
          'last_attempt_at', now()
        )
        where event_id = v_event.event_id
          and source_type = 'point_award'
          and reason_code = 'POINT_AWARD_FAILED'
          and status = 'open';
      else
        insert into eventing.dead_letters(
          event_id,
          consumer_id,
          source_type,
          reason_code,
          reason_details,
          status
        ) values (
          v_event.event_id,
          null,
          'point_award',
          'POINT_AWARD_FAILED',
          jsonb_build_object(
            'action_code', 'complete_lesson',
            'source_reference', v_event.aggregate_id::text,
            'last_error', v_error,
            'last_attempt_at', now()
          ),
          'open'
        );
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'repaired', v_repaired,
    'failed', v_failed,
    'limit', v_limit
  );
end;
$function$;

revoke all on function app_private.reconcile_complete_lesson_points(integer)
from public, anon, authenticated;
grant execute on function app_private.reconcile_complete_lesson_points(integer)
to postgres, service_role, app_worker;

select cron.schedule(
  'reconcile-complete-lesson-points',
  '* * * * *',
  $cron$select app_private.reconcile_complete_lesson_points(500);$cron$
);

commit;
