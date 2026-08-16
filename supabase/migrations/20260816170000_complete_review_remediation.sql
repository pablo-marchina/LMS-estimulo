-- Complete the final Vanessa review remediation without rewriting historical records.
-- 1) Global announcements may never point to participant-private runtime instances.
-- 2) A point rule may have at most one published version; superseded versions are retired.

begin;

-- Repair any currently published global announcement that points to an individual
-- participant runtime instance. These routes are identity-scoped and cannot be a
-- safe destination for a global carousel item.
update engagement.announcements
set cta_url = '/empreendedor/jornadas',
    updated_at = now()
where status = 'published'
  and cta_url is not null
  and cta_url ~* '/empreendedor/(jornada|trilha|atividade|validacao)/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(/|[?#]|$)';

-- Existing published point-rule rows are immutable by default. The maintenance
-- flag is transaction-local and is used only to retire superseded publications.
select set_config('app.admin_live_edit', 'on', true);

with ranked as (
  select id,
         row_number() over (
           partition by point_rule_definition_id
           order by version_number desc, published_at desc nulls last, id desc
         ) as publication_rank
  from engagement.point_rule_versions
  where status = 'published'
)
update engagement.point_rule_versions version
set status = 'retired'
from ranked
where version.id = ranked.id
  and ranked.publication_rank > 1;

create or replace function app_private.retire_superseded_point_rule_publications()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status = 'published' then
    perform set_config('app.admin_live_edit', 'on', true);
    update engagement.point_rule_versions
       set status = 'retired'
     where point_rule_definition_id = new.point_rule_definition_id
       and status = 'published'
       and id <> new.id;
  end if;
  return new;
end;
$$;

revoke all on function app_private.retire_superseded_point_rule_publications() from public;

drop trigger if exists trg_retire_superseded_point_rule_publications on engagement.point_rule_versions;
create trigger trg_retire_superseded_point_rule_publications
before insert on engagement.point_rule_versions
for each row
when (new.status = 'published')
execute function app_private.retire_superseded_point_rule_publications();

create unique index if not exists uq_point_rule_versions_single_published
on engagement.point_rule_versions(point_rule_definition_id)
where status = 'published';

commit;
