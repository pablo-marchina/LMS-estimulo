revoke execute on function public.retire_admin_point_rule(uuid, uuid, uuid, text) from public;
revoke execute on function public.retire_admin_point_rule(uuid, uuid, uuid, text) from anon;
revoke execute on function public.retire_admin_point_rule(uuid, uuid, uuid, text) from authenticated;
grant execute on function public.retire_admin_point_rule(uuid, uuid, uuid, text) to service_role;
