create or replace function public.e14_resolve_current_identity()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_subject uuid := auth.uid();
  v_email text;
  v_provider text;
  v_issuer text := nullif(auth.jwt() ->> 'iss', '');
  v_fingerprint text;
begin
  if v_subject is null then
    raise exception 'authenticated_session_required' using errcode = '28000';
  end if;

  select lower(trim(au.email)), au.raw_app_meta_data ->> 'provider'
    into v_email, v_provider
  from auth.users au
  where au.id = v_subject
    and au.deleted_at is null
    and au.email_confirmed_at is not null;

  if not found or v_email is null or length(v_email) = 0 then
    raise exception 'verified_email_required' using errcode = '28000';
  end if;
  if v_provider not in ('email', 'google') then
    raise exception 'supported_auth_provider_required' using errcode = '28000';
  end if;
  if v_issuer is null or v_issuer not like 'https://%/auth/v1' then
    raise exception 'verified_issuer_required' using errcode = '28000';
  end if;

  v_fingerprint := md5(jsonb_build_object(
    'issuer', v_issuer,
    'subject', v_subject,
    'email', v_email,
    'provider', v_provider,
    'app_metadata', (select au.raw_app_meta_data from auth.users au where au.id = v_subject)
  )::text);

  return public.e14_resolve_identity(
    v_provider,
    v_issuer,
    v_subject::text,
    v_email,
    true,
    v_fingerprint
  );
end;
$function$;

revoke all on function public.e14_resolve_current_identity() from public;
revoke all on function public.e14_resolve_current_identity() from anon;
grant execute on function public.e14_resolve_current_identity() to authenticated;
grant execute on function public.e14_resolve_current_identity() to service_role;
