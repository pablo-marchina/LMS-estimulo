begin;

-- Public signup must bind the acceptance to the immutable legal document rows
-- that were actually presented. The privileged web runtime can resolve either
-- the two versions currently published or an explicit historical snapshot that
-- was published and later retired while the user was confirming their email.
create or replace function public.get_signup_legal_documents(p_version_ids uuid[] default null)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog'
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'document_type', d.document_type,
        'version_number', d.version_number,
        'title', d.title,
        'body', d.body,
        'content_hash', d.content_hash,
        'published_at', d.published_at,
        'status', d.status
      ) order by d.document_type
    ),
    '[]'::jsonb
  )
  from governance.legal_document_versions d
  where d.organization_id = app_private.extension_default_organization()
    and d.document_type in ('terms_of_use', 'privacy_policy')
    and (
      (
        coalesce(cardinality(p_version_ids), 0) = 0
        and d.status = 'published'
      )
      or
      (
        coalesce(cardinality(p_version_ids), 0) > 0
        and d.id = any(p_version_ids)
        and d.published_at is not null
        and d.status in ('published', 'retired')
      )
    );
$$;

revoke all on function public.get_signup_legal_documents(uuid[]) from public, anon, authenticated;
grant execute on function public.get_signup_legal_documents(uuid[]) to service_role;

-- legal_accept used to require the target row to still be the currently
-- published version. That reintroduced a race after signup: publishing vN+1
-- retires vN while a user may still be confirming the email for vN. Keep the
-- existing command and idempotency contract, but accept immutable versions
-- that have evidence of having been published at some point.
do $migration$
declare
  v_definition text;
  v_needle text := 'where d.id=(p_payload->>''legal_document_version_id'')::uuid and d.organization_id=v_organization_id and d.status=''published''';
  v_replacement text := 'where d.id=(p_payload->>''legal_document_version_id'')::uuid and d.organization_id=v_organization_id and d.status in (''published'',''retired'') and d.published_at is not null';
  v_occurrences integer;
begin
  v_definition := pg_get_functiondef('public.perform_participant_extension(uuid,text,jsonb,text)'::regprocedure);
  v_occurrences := (length(v_definition) - length(replace(v_definition, v_needle, ''))) / length(v_needle);

  if v_occurrences <> 1 then
    raise exception 'PERFORM_PARTICIPANT_EXTENSION_LEGAL_ACCEPT_SHAPE_CHANGED';
  end if;

  execute replace(v_definition, v_needle, v_replacement);
end
$migration$;

commit;
