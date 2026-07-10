-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708233907
-- Remote name: m11f_dispatch_token_functions
-- Remote SQL SHA-256: b32c753d1ef9770bda6cd51f4cef2e956bb91b67a27241f80a30af1783991a25
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function eventing.issue_worker_dispatch_token(
  p_schedule_code text,
  p_worker_id text
) returns table(token_id uuid,raw_token text)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_schedule eventing.worker_schedules%rowtype;
  v_token text;
  v_hash text;
begin
  select * into v_schedule
  from eventing.worker_schedules
  where code=p_schedule_code and status='active'
  for share;
  if not found then raise exception 'worker_schedule_not_active' using errcode='P0002'; end if;
  if p_worker_id is null or length(trim(p_worker_id)) not between 1 and 160 then
    raise exception 'invalid_worker_id' using errcode='22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32),'hex');
  v_hash := encode(extensions.digest(convert_to(v_token,'UTF8'),'sha256'),'hex');

  insert into eventing.worker_dispatch_tokens(
    schedule_code,queue_code,token_hash,intended_worker_id,status,issued_at,expires_at
  ) values (
    v_schedule.code,v_schedule.queue_code,v_hash,trim(p_worker_id),'pending',now(),
    now()+make_interval(secs=>v_schedule.token_ttl_seconds)
  ) returning id into token_id;

  raw_token := v_token;
  return next;
end;
$$;

create or replace function public.queue_claim_dispatch_token(
  p_raw_token text,
  p_worker_id text
) returns table(
  schedule_code text,
  queue_code text,
  batch_size integer,
  visibility_timeout_seconds integer
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_hash text;
  v_token eventing.worker_dispatch_tokens%rowtype;
  v_schedule eventing.worker_schedules%rowtype;
begin
  if p_raw_token is null or p_raw_token !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_dispatch_token' using errcode='28000';
  end if;
  if p_worker_id is null or length(trim(p_worker_id)) not between 1 and 160 then
    raise exception 'invalid_worker_id' using errcode='22023';
  end if;

  v_hash := encode(extensions.digest(convert_to(p_raw_token,'UTF8'),'sha256'),'hex');
  select * into v_token
  from eventing.worker_dispatch_tokens
  where token_hash=v_hash
  for update;

  if not found or v_token.status<>'pending' or v_token.expires_at<=now() then
    raise exception 'dispatch_token_unavailable' using errcode='28000';
  end if;
  if v_token.intended_worker_id<>trim(p_worker_id) then
    raise exception 'dispatch_token_worker_mismatch' using errcode='28000';
  end if;

  select * into v_schedule from eventing.worker_schedules
  where code=v_token.schedule_code and status='active';
  if not found then raise exception 'worker_schedule_not_active' using errcode='55000'; end if;

  update eventing.worker_dispatch_tokens
  set status='claimed',claimed_at=now(),claimed_by=trim(p_worker_id)
  where id=v_token.id;

  return query select v_schedule.code,v_schedule.queue_code,v_schedule.batch_size,v_schedule.visibility_timeout_seconds;
end;
$$;

revoke all on function public.queue_claim_dispatch_token(text,text) from public,anon,authenticated;
grant execute on function public.queue_claim_dispatch_token(text,text) to service_role;
grant execute on function eventing.issue_worker_dispatch_token(text,text) to app_worker;
