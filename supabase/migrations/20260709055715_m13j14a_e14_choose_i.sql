-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055715
-- Remote name: m13j14a_e14_choose_i
-- Remote SQL SHA-256: fa1e285aeb2260f523b1ccdbc1c215c777444310079f2532f9adda756a3d8623
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_choose_i(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
begin
 if (c->>'correct')::boolean then return app_private.e14_i1_done(a,b,c,d,e,f); end if;
 return app_private.e14_branch_i0(a,b,c,d,e,f);
end;$$;
