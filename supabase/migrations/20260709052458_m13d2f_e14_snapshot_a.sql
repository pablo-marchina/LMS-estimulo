-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052458
-- Remote name: m13d2f_e14_snapshot_a
-- Remote SQL SHA-256: 6ea9aefcbcfcc03ac46a4ab3497ac5cedc8736f9cfd7e650c71204308dd21845
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_snapshot_a(p_session uuid,p_diag uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('session_id',p_session,'status',s.status,'aggregate_version',s.aggregate_version,'item_count',(select count(*) from diagnostics.items where diagnostic_version_id=p_diag)) from diagnostics.sessions s where s.id=p_session
$$;
