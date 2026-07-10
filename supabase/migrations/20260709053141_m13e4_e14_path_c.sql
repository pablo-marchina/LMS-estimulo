-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053141
-- Remote name: m13e4_e14_path_c
-- Remote SQL SHA-256: c2221d373f761e31a511a5da4a20f5b4b99cb466319b67a7fddccc54479ce47c
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_path_c(a uuid,b jsonb)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('p',pt.code,'t',pt.id,'s',ps.id,'v',ps.activity_version_id,'l',((b->>'u')::integer>=2))
 from orchestration.path_templates pt join orchestration.path_steps ps on ps.path_template_id=pt.id
 where pt.journey_version_id=a and pt.status='published' and pt.code=case when (b->>'u')::integer<2 and (b->>'x')::integer>=3 and (b->>'y')::integer>=3 then 'standard' else 'guided' end
 order by ps.position_hint limit 1
$$;
