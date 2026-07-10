-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052716
-- Remote name: m13d3d_e14_apply_b
-- Remote SQL SHA-256: 267f27c4bac816f3403666d9c1aea71cc7e8a72db3505ef1543e0e00fdee3e49
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_apply_b(a uuid,b uuid,c uuid,d text,e integer,f integer,g uuid,h uuid,i text,j text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;newver bigint;val jsonb;
begin
 x:=app_private.e14_context_b(a,b,c,d);
 if e<>(x->>'latest_revision')::integer+1 then raise exception 'INVALID_RESPONSE_REVISION' using errcode='P0001';end if;
 val:=jsonb_build_object('option_id',(x->>'option_id')::uuid,'option_code',d,'score',((x->'option_value')->>'score')::integer,'uncertain',coalesce(((x->'option_value')->>'uncertain')::boolean,false));
 perform app_private.e14_emit_b(h,a,(x->>'organization_id')::uuid,(x->>'instance_id')::uuid,g,b,e,i,j);
 insert into diagnostics.responses(id,session_id,item_id,revision,response_value,response_time_ms,recorded_at,supersedes_response_id,source_event_id) values(g,b,c,e,val,f,now(),nullif(x->>'previous_id','')::uuid,h);
 update diagnostics.sessions set aggregate_version=aggregate_version+1 where id=b returning aggregate_version into newver;
 return jsonb_build_object('response_id',g,'revision',e,'response_value',val,'session_aggregate_version',newver);
end;$$;
