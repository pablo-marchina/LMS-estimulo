-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053127
-- Remote name: m13e3_e14_scores_c
-- Remote SQL SHA-256: bb4a477268bb1a6ccab1294a3fa1094f8b652fe76f3fc54ef94bb10959eeb74d
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_scores_c(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 with l as (select distinct on (r.item_id) r.item_id,r.response_value from diagnostics.responses r where r.session_id=a order by r.item_id,r.revision desc),
 s as (select d.position p,sum((l.response_value->>'score')::integer) v from l join diagnostics.items i on i.id=l.item_id join diagnostics.dimensions d on d.id=i.dimension_id group by d.position)
 select jsonb_build_object('n',(select count(*) from l),'u',(select count(*) from l where coalesce((response_value->>'uncertain')::boolean,false)),'x',coalesce((select v from s where p=1),0),'y',coalesce((select v from s where p=2),0))
$$;
