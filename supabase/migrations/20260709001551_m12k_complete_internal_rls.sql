-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709001551
-- Remote name: m12k_complete_internal_rls
-- Remote SQL SHA-256: babb6e3aef5c11212ff22e7bf3be0b8f4f786883f83f1c61e494258c50fbd7ef
-- Do not edit after reconciliation; corrections require a new migration.

do $$
declare
  r record;
  v_runtime_select boolean;
begin
  for r in
    select c.oid,n.nspname,c.relname
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='r'
      and n.nspname in ('iam','core','catalog','orchestration','diagnostics','assessment','engagement','intervention','eventing','integration','intelligence','governance','reporting')
      and not c.relrowsecurity
    order by n.nspname,c.relname
  loop
    v_runtime_select:=has_table_privilege('app_runtime',r.oid,'SELECT');
    execute format('alter table %I.%I enable row level security',r.nspname,r.relname);
    if has_table_privilege('app_worker',r.oid,'SELECT') and not exists(select 1 from pg_policies where schemaname=r.nspname and tablename=r.relname and policyname='m12_worker_select') then
      execute format('create policy m12_worker_select on %I.%I for select to app_worker using (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if has_table_privilege('app_worker',r.oid,'INSERT') and not exists(select 1 from pg_policies where schemaname=r.nspname and tablename=r.relname and policyname='m12_worker_insert') then
      execute format('create policy m12_worker_insert on %I.%I for insert to app_worker with check (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if has_table_privilege('app_worker',r.oid,'UPDATE') and not exists(select 1 from pg_policies where schemaname=r.nspname and tablename=r.relname and policyname='m12_worker_update') then
      execute format('create policy m12_worker_update on %I.%I for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if has_table_privilege('app_worker',r.oid,'DELETE') and not exists(select 1 from pg_policies where schemaname=r.nspname and tablename=r.relname and policyname='m12_worker_delete') then
      execute format('create policy m12_worker_delete on %I.%I for delete to app_worker using (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if v_runtime_select and not exists(select 1 from pg_policies where schemaname=r.nspname and tablename=r.relname and policyname='m12_runtime_select') then
      execute format('create policy m12_runtime_select on %I.%I for select to app_runtime using (true)',r.nspname,r.relname);
    end if;
  end loop;
end $$;

update governance.production_readiness_controls
set evidence_reference='migrations:m12f_internal_rls_and_default_privileges,m12k_complete_internal_rls',verified_at=now()
where environment='production' and control_code='INTERNAL_RLS_COMPLETE' and status='passed';
