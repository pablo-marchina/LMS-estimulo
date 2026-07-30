-- The participant outline and administrative path editor both consume path
-- presentation metadata. The test project already has this column, but it was
-- never represented in the canonical migration history, so a fresh database
-- failed only when the outline function was executed.

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
