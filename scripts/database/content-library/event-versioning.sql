\set ON_ERROR_STOP on

create or replace function app_private.library_event_aggregate_version_trigger()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.event_name = 'learning.library_content.accessed' then
    new.aggregate_type := 'library_content_access';
    new.aggregate_id := new.event_id;
    new.aggregate_version := 1;
    return new;
  end if;

  if new.event_name in (
    'catalog.library_content.draft_saved',
    'catalog.library_content.published'
  ) then
    perform pg_advisory_xact_lock(
      hashtextextended('library-item:' || new.aggregate_id::text, 0)
    );
    select coalesce(max(e.aggregate_version), 0) + 1
    into new.aggregate_version
    from eventing.events e
    where e.aggregate_type = 'library_item'
      and e.aggregate_id = new.aggregate_id;
  end if;

  return new;
end;
$$;

drop trigger if exists library_event_aggregate_version on eventing.events;
create trigger library_event_aggregate_version
before insert on eventing.events
for each row
when (new.event_name in (
  'catalog.library_content.draft_saved',
  'catalog.library_content.published',
  'learning.library_content.accessed'
))
execute function app_private.library_event_aggregate_version_trigger();

revoke all on function app_private.library_event_aggregate_version_trigger() from public, anon, authenticated;
