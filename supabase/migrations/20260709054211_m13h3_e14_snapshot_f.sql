-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054211
-- Remote name: m13h3_e14_snapshot_f
-- Remote SQL SHA-256: 9bed3e25171e65e21701816c592dbe13bbadb1c2c7281edeb97f20eced350a41
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_snapshot_f(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('attempt_id',x.id,'attempt_number',x.attempt_number,'status',x.status,'aggregate_version',x.aggregate_version,'question_id',q.id,'prompt',q.prompt,'options',(select jsonb_agg(jsonb_build_object('code',o.code,'label',o.label) order by o.position) from assessment.answer_options o where o.question_id=q.id))
 from assessment.attempts x join assessment.questions q on q.activity_version_id=x.activity_version_id and q.position=1 where x.id=a
$$;
