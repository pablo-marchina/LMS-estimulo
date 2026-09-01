-- Preserve the original frozen five-argument quick-check facade and restore
-- its frozen execution grants. The multiple-choice behavior is implemented
-- below the facade in app_private.e14_context_g.

drop function if exists public.e14_record_quick_check_answer(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  bigint,
  text
);

revoke all on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text)
  from public;
revoke all on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text)
  from anon;
revoke all on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text)
  from authenticated;
grant execute on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text)
  to service_role;
grant execute on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text)
  to app_worker;
