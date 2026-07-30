-- The participant outline and administrative path editor consume required-state
-- and presentation metadata. The test project already has these columns, but
-- they were never represented in the canonical migration history.

alter table orchestration.path_templates
  add column if not exists is_required boolean;

update orchestration.path_templates
set is_required=true
where is_required is null;

alter table orchestration.path_templates
  alter column is_required set default true,
  alter column is_required set not null;

comment on column orchestration.path_templates.is_required is
  'Whether completion of this path is required for the journey contract.';

alter table orchestration.path_templates
  add column if not exists presentation jsonb;

update orchestration.path_templates
set presentation='{}'::jsonb
where presentation is null;

alter table orchestration.path_templates
  alter column presentation set default '{}'::jsonb,
  alter column presentation set not null;

comment on column orchestration.path_templates.presentation is
  'Visual and explanatory metadata for rendering one journey path; empty object means no presentation overrides.';
