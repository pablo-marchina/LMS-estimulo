-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053556
-- Remote name: m13e11_e14_exec_c
-- Remote SQL SHA-256: 196d98a3e4f54102aaa02d7ecb0e02e98c8dc75245a822f7b597ce85e5b42be5
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_exec_c(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare p jsonb;ctx jsonb;s jsonb;path jsonb;data jsonb;children jsonb;
begin
 p:=app_private.e14_prepare_c(a,b,c,d);
 if (p->>'p')::boolean then return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',true,'data',app_private.e14_snapshot_c(b));end if;
 ctx:=app_private.e14_context_c(a,b,c);s:=app_private.e14_scores_c(b);path:=app_private.e14_path_c((ctx->>'journey_version_id')::uuid,s);
 perform app_private.e14_first_c((p->>'e')::uuid,a,ctx,b,c+1,p->>'h',p->>'k');
 data:=app_private.e14_apply_c(b,ctx,s,path,(p->>'e')::uuid);
 children:=app_private.e14_children_c((p->>'e')::uuid,a,ctx,s,data);
 return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',false,'data',data||jsonb_build_object('event_ids',jsonb_build_array((p->>'e')::uuid)||children));
end;$$;
