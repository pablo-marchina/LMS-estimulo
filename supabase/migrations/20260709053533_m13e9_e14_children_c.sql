-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053533
-- Remote name: m13e9_e14_children_c
-- Remote SQL SHA-256: 46cc26a8bc3a5673badf35e2805f0641be588d0016d676016a37593025a91bc1
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_children_c(a uuid,b uuid,c jsonb,d jsonb,e jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare org uuid;inst uuid;r uuid;dec uuid;pa uuid;si uuid;x jsonb:='[]'::jsonb;ev uuid;
begin
 org:=(c->>'organization_id')::uuid;inst:=(c->>'instance_id')::uuid;r:=(e->>'result_id')::uuid;dec:=(e->>'decision_id')::uuid;pa:=(e->>'assignment_id')::uuid;si:=(e->>'step_instance_id')::uuid;
 ev:=app_private.e14_ec('e1dd0885-dca6-4d89-8741-5683e940b1c0',a,1,b,org,inst,'result',r,'result',r,1,jsonb_build_object('scores',d));x:=x||jsonb_build_array(ev);
 if (d->>'u')::integer>=2 then ev:=app_private.e14_ec('7bbd12dc-7834-4c8d-b566-d5d9d80427e2',a,2,b,org,inst,'decision',dec,'decision',dec,1,jsonb_build_object('uncertain_count',(d->>'u')::integer));x:=x||jsonb_build_array(ev);end if;
 ev:=app_private.e14_ec('7a5b9559-6b22-409a-a17d-39abd5e2c7c0',a,3,b,org,inst,'path_assignment',pa,'path_assignment',pa,0,jsonb_build_object('path_code',e->>'path_code'));x:=x||jsonb_build_array(ev);
 ev:=app_private.e14_ec('8a88414d-e44a-4ebe-984a-40733da7a489',a,4,b,org,inst,'path_assignment',pa,'path_assignment',pa,1,jsonb_build_object('path_code',e->>'path_code'));x:=x||jsonb_build_array(ev);
 ev:=app_private.e14_ec('646223e0-18c3-4a7b-8865-dff76db0d173',a,5,b,org,inst,'step_instance',si,'step_instance',si,0,jsonb_build_object('path_code',e->>'path_code'));x:=x||jsonb_build_array(ev);
 return x;
end;$$;
