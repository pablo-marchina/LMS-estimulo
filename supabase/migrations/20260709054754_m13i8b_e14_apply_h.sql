-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054754
-- Remote name: m13i8b_e14_apply_h
-- Remote SQL SHA-256: 46d728edea0a91e9c06fbe088daaa03f328f7ad5673252256d2f091489d9f52b
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_apply_h(a uuid,b uuid,c uuid,d text,e uuid,f uuid,g text,h text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;n bigint;
begin
 x:=app_private.e14_context_g(a,b,c,d);
 perform app_private.e14_assert_no_answer(b,c);
 perform app_private.e14_emit_h(f,a,x,e,b,g,h);
 perform app_private.e14_insert_h(e,b,c,x,f,d);
 n:=app_private.e14_increment_attempt(b);
 return jsonb_build_object('response_id',e,'attempt_id',b,'question_id',c,'response_value',jsonb_build_object('option_code',d),'attempt_aggregate_version',n);
end;$$;
