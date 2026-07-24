CREATE OR REPLACE FUNCTION app_private.e14_exec_c(a uuid, b uuid, c bigint, d text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare p jsonb;ctx jsonb;s jsonb;path jsonb;data jsonb;children jsonb;arch jsonb;
begin
 p:=app_private.e14_prepare_c(a,b,c,d);
 if (p->>'p')::boolean then return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',true,'data',app_private.e14_snapshot_c(b));end if;
 ctx:=app_private.e14_context_c(a,b,c);s:=app_private.e14_scores_c(b);path:=app_private.e14_path_c((ctx->>'journey_version_id')::uuid,s);
 perform app_private.e14_first_c((p->>'e')::uuid,a,ctx,b,c+1,p->>'h',p->>'k');
 data:=app_private.e14_apply_c(b,ctx,s,path,(p->>'e')::uuid);
 arch:=app_private.e14_archetype_c(b,(ctx->>'version_id')::uuid,(ctx->>'organization_id')::uuid,(ctx->>'entrepreneur_id')::uuid,(ctx->>'instance_id')::uuid);
 if arch is not null then data:=data||jsonb_build_object('archetype',arch); end if;
 children:=app_private.e14_children_c((p->>'e')::uuid,a,ctx,s,data);
 return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',false,'data',data||jsonb_build_object('event_ids',jsonb_build_array((p->>'e')::uuid)||children));
end;$function$;
