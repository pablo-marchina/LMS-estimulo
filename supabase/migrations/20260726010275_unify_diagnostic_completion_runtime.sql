-- Keep one diagnostic completion implementation. The internal runtime is dynamic and creates the result, archetype and path.
create or replace function public.e14_complete_diagnostic(a uuid,b uuid,c bigint,d text)
returns jsonb language sql security definer set search_path to 'pg_catalog'
as $function$
  select app_private.e14_exec_c(a,b,c,d)
$function$;
