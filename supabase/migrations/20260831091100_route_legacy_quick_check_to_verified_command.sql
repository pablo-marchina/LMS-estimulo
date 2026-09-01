-- Cleanup for the temporary seven-argument quick-check overload used while
-- developing the multiple-choice correction. The production web boundary is
-- the frozen five-argument RPC and must not be recreated or expanded here.

drop function if exists public.e14_record_quick_check_answer(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  bigint,
  text
);
