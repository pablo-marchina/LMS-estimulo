-- Published content is immutable unless the trusted administrative RPC enables
-- live editing inside the current transaction. A missing custom GUC must be
-- treated as `off`; otherwise SQL three-valued logic lets the postgres role
-- bypass the guard when current_setting(..., true) returns NULL.

create or replace function app_private.e14_reject_published_row_mutation()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $function$
begin
  if old.status = 'published'
    and not (
      current_user = 'postgres'
      and coalesce(current_setting('app.admin_live_edit', true), 'off') = 'on'
    ) then
    raise exception 'PUBLISHED_VERSION_IMMUTABLE' using errcode = '55000';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function app_private.e14_reject_published_row_mutation() from public, anon, authenticated;

comment on function app_private.e14_reject_published_row_mutation() is
  'Rejects mutation of published rows unless a trusted postgres transaction explicitly enables app.admin_live_edit=on.';
