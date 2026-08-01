begin;

select set_config('app.admin_live_edit','on',true);

create temporary table _journey_canonical on commit drop as
select journey_definition_id,id as journey_id
from (
  select jv.journey_definition_id,jv.id,
    row_number() over (
      partition by jv.journey_definition_id
      order by case jv.status when 'published' then 0 when 'draft' then 1 else 2 end,
        jv.version_number desc,jv.created_at desc
    ) as rn
  from catalog.journey_versions jv
) ranked
where rn=1;

create temporary table _journey_obsolete on commit drop as
select jv.id,jv.journey_definition_id
from catalog.journey_versions jv
join _journey_canonical selected using(journey_definition_id)
where jv.id<>selected.journey_id;

create temporary table _journey_obsolete_paths on commit drop as
select pt.id,pt.code,obsolete.journey_definition_id
from orchestration.path_templates pt
join _journey_obsolete obsolete on obsolete.id=pt.journey_version_id;

create temporary table _journey_duplicate_assignments on commit drop as
select assignment.id
from orchestration.path_assignments assignment
join _journey_obsolete_paths old_path on old_path.id=assignment.path_template_id
join _journey_canonical selected on selected.journey_definition_id=old_path.journey_definition_id
join orchestration.path_templates current_path
  on current_path.journey_version_id=selected.journey_id and current_path.code=old_path.code
where exists (
  select 1 from orchestration.path_assignments existing
  where existing.journey_instance_id=assignment.journey_instance_id
    and existing.path_template_id=current_path.id
    and existing.id<>assignment.id
);

create temporary table _journey_duplicate_steps on commit drop as
select id from orchestration.step_instances
where path_assignment_id in (select id from _journey_duplicate_assignments);

create temporary table _journey_duplicate_attempts on commit drop as
select id from assessment.attempts
where step_instance_id in (select id from _journey_duplicate_steps);

create temporary table _journey_duplicate_submissions on commit drop as
select id from assessment.submissions
where step_instance_id in (select id from _journey_duplicate_steps);

delete from assessment.responses where attempt_id in (select id from _journey_duplicate_attempts);
delete from assessment.results where attempt_id in (select id from _journey_duplicate_attempts);
delete from assessment.attempts where id in (select id from _journey_duplicate_attempts);
delete from assessment.reviews where submission_id in (select id from _journey_duplicate_submissions);
delete from assessment.submission_evidence where submission_id in (select id from _journey_duplicate_submissions);
delete from assessment.submissions where id in (select id from _journey_duplicate_submissions);
delete from engagement.activity_utility_rating_revisions where step_instance_id in (select id from _journey_duplicate_steps);
delete from engagement.activity_utility_ratings where step_instance_id in (select id from _journey_duplicate_steps);
delete from engagement.activity_comments where step_instance_id in (select id from _journey_duplicate_steps);
delete from orchestration.activity_asset_progress where step_instance_id in (select id from _journey_duplicate_steps);
delete from orchestration.activity_sessions where step_instance_id in (select id from _journey_duplicate_steps);
delete from orchestration.step_instances where id in (select id from _journey_duplicate_steps);
delete from orchestration.path_assignments where id in (select id from _journey_duplicate_assignments);

update orchestration.path_assignments assignment
set path_template_id=current_path.id
from _journey_obsolete_paths old_path
join _journey_canonical selected on selected.journey_definition_id=old_path.journey_definition_id
join orchestration.path_templates current_path
  on current_path.journey_version_id=selected.journey_id and current_path.code=old_path.code
where assignment.path_template_id=old_path.id;

do $block$
begin
  if exists(select 1 from orchestration.enrollments where journey_version_id in (select id from _journey_obsolete))
    or exists(select 1 from orchestration.cohorts where journey_version_id in (select id from _journey_obsolete))
    or exists(select 1 from orchestration.assignment_policies where journey_version_id in (select id from _journey_obsolete))
    or exists(select 1 from orchestration.path_assignments where path_template_id in (select id from _journey_obsolete_paths)) then
    raise exception 'OBSOLETE_JOURNEY_HAS_UNMIGRATABLE_RUNTIME_DATA';
  end if;
end;
$block$;

delete from engagement.certificate_issuances
where certificate_version_id in (
  select id from engagement.certificate_versions
  where journey_version_id in (select id from _journey_obsolete)
);
delete from engagement.certificate_versions where journey_version_id in (select id from _journey_obsolete);
delete from catalog.library_item_journey_links where journey_version_id in (select id from _journey_obsolete);
delete from catalog.journey_competencies where journey_version_id in (select id from _journey_obsolete);
delete from orchestration.path_transitions where path_template_id in (select id from _journey_obsolete_paths);
delete from orchestration.path_steps where path_template_id in (select id from _journey_obsolete_paths);
delete from orchestration.path_templates where id in (select id from _journey_obsolete_paths);
delete from experience.admin_content_revisions where resource_type='journey_version';
delete from catalog.journey_versions where id in (select id from _journey_obsolete);

update catalog.journey_versions
set version_number=1,retired_at=null
where version_number<>1 or retired_at is not null;

alter table catalog.journey_versions
  drop constraint if exists uq_catalog_journey_versions_journey_definition_id_v_2e8961d1;
alter table catalog.journey_versions
  drop constraint if exists uq_catalog_journey_versions_journey_definition_id_c_280c122a;
alter table catalog.journey_versions
  drop constraint if exists ck_catalog_journey_versions_version_number_single;
alter table catalog.journey_versions
  add constraint ck_catalog_journey_versions_version_number_single check(version_number=1);
create unique index if not exists uq_catalog_single_journey_per_definition
  on catalog.journey_versions(journey_definition_id);

commit;