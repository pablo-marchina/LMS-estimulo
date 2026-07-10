-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052119
-- Remote name: m13d1a_e14_start_command_shell
-- Remote SQL SHA-256: 4102b996815b6368715218327da55d9e2bb28a51c624eebd3d5e5abd6c14be93
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_cmd_start(p_actor uuid,p_instance uuid,p_expected bigint,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
begin
 return jsonb_build_object('status','not_configured');
end;$$;
revoke all on function app_private.e14_cmd_start(uuid,uuid,bigint,text) from public,anon,authenticated;
