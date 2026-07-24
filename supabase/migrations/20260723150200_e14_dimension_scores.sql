create or replace function app_private.e14_dimension_scores_c(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 with l as (select distinct on (r.item_id) r.item_id,r.response_value from diagnostics.responses r where r.session_id=a order by r.item_id,r.revision desc),
 s as (select d.code, sum((l.response_value->>'score')::integer) v from l join diagnostics.items i on i.id=l.item_id join diagnostics.dimensions d on d.id=i.dimension_id group by d.code)
 select coalesce(jsonb_object_agg(s.code, s.v), '{}'::jsonb) from s
$$;
revoke all on function app_private.e14_dimension_scores_c(uuid) from public,anon,authenticated;
