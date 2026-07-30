-- Explicitly replace the opaque helper introduced earlier in the migration
-- history. PostgreSQL cannot rename input parameters through CREATE OR REPLACE,
-- so the old function is dropped and recreated with a descriptive contract.
-- pg_depend inspection confirms that no stored object depends on this function;
-- callers resolve it by signature at execution time.

drop function if exists app_private.e14_dimension_scores_c(uuid);

create function app_private.e14_dimension_scores_c(
  p_session_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  with latest_responses as (
    select distinct on (response.item_id)
      response.item_id,
      response.response_value
    from diagnostics.responses response
    where response.session_id = p_session_id
    order by response.item_id, response.revision desc
  ), dimension_scores as (
    select
      dimension.code,
      sum((latest_response.response_value ->> 'score')::integer) as score
    from latest_responses latest_response
    join diagnostics.items item on item.id = latest_response.item_id
    join diagnostics.dimensions dimension on dimension.id = item.dimension_id
    group by dimension.code
  )
  select coalesce(jsonb_object_agg(dimension_scores.code, dimension_scores.score), '{}'::jsonb)
  from dimension_scores;
$$;

revoke all on function app_private.e14_dimension_scores_c(uuid)
  from public, anon, authenticated;
grant execute on function app_private.e14_dimension_scores_c(uuid)
  to postgres, service_role, app_worker;

comment on function app_private.e14_dimension_scores_c(uuid) is
  'Returns latest diagnostic score totals by dimension for one diagnostic session.';
