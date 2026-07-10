-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708222345
-- Remote name: m08o_split_all_policies_by_command
-- Remote SQL SHA-256: db578e51bbe6fa7c175e50a880fde000703b96e4870ef2cc1682f54d7d4eb5db
-- Do not edit after reconciliation; corrections require a new migration.

do $$
declare
  r record;
  v_roles text;
  v_has_select boolean;
  v_base text;
  v_select_name text;
  v_insert_name text;
  v_update_name text;
  v_delete_name text;
  v_using text;
  v_check text;
begin
  for r in
    select schemaname, tablename, policyname, roles, qual, with_check
    from pg_policies
    where schemaname in ('iam','core','orchestration','diagnostics','assessment','engagement','intervention','integration','intelligence','governance')
      and cmd = 'ALL'
    order by schemaname, tablename, policyname
  loop
    select string_agg(quote_ident(role_name), ', ')
      into v_roles
      from unnest(r.roles) as role_name;

    select exists (
      select 1 from pg_policies p
      where p.schemaname = r.schemaname
        and p.tablename = r.tablename
        and p.policyname <> r.policyname
        and p.cmd in ('SELECT','ALL')
    ) into v_has_select;

    v_using := coalesce(r.qual, 'true');
    v_check := coalesce(r.with_check, r.qual, 'true');
    v_base := left(r.policyname, 42) || '_' || substr(md5(r.schemaname || '.' || r.tablename || '.' || r.policyname), 1, 8);
    v_select_name := left(v_base || '_sel', 63);
    v_insert_name := left(v_base || '_ins', 63);
    v_update_name := left(v_base || '_upd', 63);
    v_delete_name := left(v_base || '_del', 63);

    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);

    if not v_has_select then
      execute format(
        'create policy %I on %I.%I for select to %s using (%s)',
        v_select_name, r.schemaname, r.tablename, v_roles, v_using
      );
    end if;

    execute format(
      'create policy %I on %I.%I for insert to %s with check (%s)',
      v_insert_name, r.schemaname, r.tablename, v_roles, v_check
    );
    execute format(
      'create policy %I on %I.%I for update to %s using (%s) with check (%s)',
      v_update_name, r.schemaname, r.tablename, v_roles, v_using, v_check
    );
    execute format(
      'create policy %I on %I.%I for delete to %s using (%s)',
      v_delete_name, r.schemaname, r.tablename, v_roles, v_using
    );
  end loop;
end $$;
