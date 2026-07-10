\pset tuples_only on
\pset format unaligned

with routines as (
  select
    p.oid::regprocedure::text as signature,
    p.proname as name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as result_type,
    l.lanname as language,
    case p.provolatile
      when 'i' then 'immutable'
      when 's' then 'stable'
      else 'volatile'
    end as volatility,
    p.prosecdef as security_definer,
    array_to_string(coalesce(p.proconfig, array[]::text[]), ',') as config,
    coalesce(
      (
        select string_agg(
          rp.grantee || ':' || rp.privilege_type,
          ',' order by rp.grantee, rp.privilege_type
        )
        from information_schema.routine_privileges rp
        where rp.specific_schema = 'public'
          and rp.routine_name = p.proname
      ),
      ''
    ) as grants,
    encode(digest(pg_get_functiondef(p.oid), 'sha256'), 'hex') as definition_sha256
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'
    and p.proname like 'e14\_%' escape '\'
), canonical_rows as (
  select
    signature,
    name,
    identity_arguments,
    arguments,
    result_type,
    language,
    volatility,
    security_definer,
    config,
    grants,
    definition_sha256,
    signature || '|' || identity_arguments || '|' || arguments || '|' ||
      result_type || '|' || language || '|' || volatility || '|' ||
      security_definer::text || '|' || config || '|' || grants || '|' ||
      definition_sha256 as row_value
  from routines
)
select jsonb_build_object(
  'rpc_count', count(*),
  'contract_sha256', encode(
    digest(string_agg(row_value, E'\n' order by row_value), 'sha256'),
    'hex'
  ),
  'signatures', jsonb_agg(signature order by signature),
  'rpcs', jsonb_agg(
    jsonb_build_object(
      'name', name,
      'signature', signature,
      'arguments', arguments,
      'result_type', result_type,
      'language', language,
      'volatility', volatility,
      'security_definer', security_definer,
      'config', config,
      'grants', grants,
      'definition_sha256', definition_sha256
    ) order by signature
  )
)::text
from canonical_rows;
