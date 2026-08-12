do $migration$
declare
  v_function record;
  v_definition text;
  v_old_guard constant text := '(''article'',''video'',''podcast'',''guide'',''tool'',''course'',''other'')';
  v_new_guard constant text := '(''article'',''video'',''podcast'',''guide'',''tool'',''course'',''image'',''pdf'',''audio'',''other'')';
begin
  for v_function in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='save_library_content_draft'
  loop
    v_definition := pg_get_functiondef(v_function.oid);
    if position(v_new_guard in v_definition)>0 then
      continue;
    end if;
    if position(v_old_guard in v_definition)=0 then
      raise exception 'LIBRARY_FORMAT_GUARD_NOT_FOUND';
    end if;
    execute replace(v_definition,v_old_guard,v_new_guard);
  end loop;
end;
$migration$;
