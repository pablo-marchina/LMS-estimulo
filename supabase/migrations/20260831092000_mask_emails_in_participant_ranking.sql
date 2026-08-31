-- Replace opaque participant codes in the public participant ranking with a
-- privacy-preserving masked e-mail. The complete address never leaves the
-- engagement read-model.

create or replace function app_private.mask_ranking_email(p_email text)
returns text
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  v_email text := lower(btrim(p_email));
  v_local text;
  v_domain text;
  v_domain_dot_from_end integer;
  v_domain_base_length integer;
  v_tld text;
begin
  if position('@' in v_email) <= 1 then
    return '••••••@•••••';
  end if;

  v_local := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);

  if v_domain = '' then
    return substr(v_local, 1, 1) || repeat('•', greatest(3, length(v_local) - 1)) || '@•••••';
  end if;

  v_domain_dot_from_end := position('.' in reverse(v_domain));
  if v_domain_dot_from_end > 1 then
    v_tld := right(v_domain, v_domain_dot_from_end - 1);
    v_domain_base_length := greatest(3, length(v_domain) - v_domain_dot_from_end);
  else
    v_tld := '';
    v_domain_base_length := greatest(3, length(v_domain));
  end if;

  return
    case
      when length(v_local) <= 2 then substr(v_local, 1, 1) || repeat('•', 3)
      else substr(v_local, 1, 1) || repeat('•', length(v_local) - 2) || right(v_local, 1)
    end
    || '@'
    || repeat('•', v_domain_base_length)
    || case when v_tld <> '' then '.' || v_tld else '' end;
end;
$$;

revoke all on function app_private.mask_ranking_email(text) from public, anon, authenticated;
grant execute on function app_private.mask_ranking_email(text) to postgres, service_role, app_worker;

comment on function app_private.mask_ranking_email(text) is
  'Masks ranking e-mails as first/last local-part characters plus bullets and a masked domain, retaining only the final TLD.';

do $ranking_email_projection$
declare
  v_oid oid;
  v_definition text;
  v_pattern text := $pattern$case\s+when\s+ranked\.entrepreneur_id\s*=\s*v_entrepreneur_id\s+then\s+'Você'\s+else\s+'Empreendedor '\s*\|\|\s*upper\s*\(\s*substr\s*\(\s*md5\s*\(\s*ranked\.entrepreneur_id::text\s*\)\s*,\s*1\s*,\s*4\s*\)\s*\)\s+end$pattern$;
  v_replacement text := $replacement$app_private.mask_ranking_email((
      select account.email_normalized
      from core.entrepreneurs entrepreneur
      join iam.user_accounts account on account.id = entrepreneur.user_account_id
      where entrepreneur.id = ranked.entrepreneur_id
      limit 1
    ))$replacement$;
  v_matches integer;
begin
  select routine.oid
  into v_oid
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'get_participant_engagement_hub'
    and pg_get_function_identity_arguments(routine.oid) = 'p_actor_user_account_id uuid';

  if v_oid is null then
    raise exception 'ENGAGEMENT_HUB_FUNCTION_NOT_FOUND';
  end if;

  v_definition := pg_get_functiondef(v_oid);
  v_matches := regexp_count(v_definition, v_pattern, 1, 'i');
  if v_matches <> 1 then
    raise exception 'ENGAGEMENT_HUB_PARTICIPANT_LABEL_SOURCE_UNEXPECTED: expected 1 match, found %', v_matches;
  end if;

  v_definition := regexp_replace(v_definition, v_pattern, v_replacement, 'i');
  execute v_definition;
end;
$ranking_email_projection$;

do $verify$
declare
  v_definition text;
begin
  select pg_get_functiondef(routine.oid)
  into v_definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'get_participant_engagement_hub'
    and pg_get_function_identity_arguments(routine.oid) = 'p_actor_user_account_id uuid';

  if position('mask_ranking_email' in v_definition) = 0 then
    raise exception 'RANKING_EMAIL_MASK_NOT_ACTIVE';
  end if;
  if position('Empreendedor ' in v_definition) > 0 then
    raise exception 'OPAQUE_RANKING_CODE_STILL_ACTIVE';
  end if;
end;
$verify$;
