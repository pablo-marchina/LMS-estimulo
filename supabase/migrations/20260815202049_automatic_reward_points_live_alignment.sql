begin;

-- August prioritization: engagement points are directly spendable reward points.
-- Keep the reward wallet as a transactional projection for redemptions, but
-- update it automatically from the immutable point ledger. No participant-side
-- conversion step is required.
create or replace function app_private.credit_reward_wallet_from_point_ledger()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_organization_id uuid;
  v_wallet engagement.reward_wallets%rowtype;
  v_user_account_id uuid;
  v_balance integer;
  v_reward_delta integer;
  v_idempotency_key text := 'point-ledger:' || new.id::text;
begin
  if new.amount = 0 then
    return new;
  end if;

  select definition.owner_organization_id
  into v_organization_id
  from engagement.point_rule_versions version
  join engagement.point_rule_definitions definition
    on definition.id = version.point_rule_definition_id
  where version.id = new.point_rule_version_id;

  if v_organization_id is null then
    raise exception 'POINT_REWARD_ORGANIZATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  select entrepreneur.user_account_id
  into v_user_account_id
  from core.entrepreneurs entrepreneur
  where entrepreneur.id = new.entrepreneur_id;

  if v_user_account_id is null then
    raise exception 'POINT_REWARD_PARTICIPANT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from engagement.reward_ledger ledger
    where ledger.entrepreneur_id = new.entrepreneur_id
      and ledger.idempotency_key = v_idempotency_key
  ) then
    return new;
  end if;

  insert into engagement.reward_wallets(
    entrepreneur_id,
    organization_id,
    balance,
    lifetime_converted
  ) values (
    new.entrepreneur_id,
    v_organization_id,
    0,
    0
  )
  on conflict (entrepreneur_id) do nothing;

  select wallet.*
  into v_wallet
  from engagement.reward_wallets wallet
  where wallet.entrepreneur_id = new.entrepreneur_id
  for update;

  if v_wallet.organization_id <> v_organization_id then
    raise exception 'REWARD_WALLET_ORGANIZATION_MISMATCH' using errcode = '22023';
  end if;

  v_balance := greatest(0, v_wallet.balance + new.amount);
  v_reward_delta := v_balance - v_wallet.balance;

  update engagement.reward_wallets
  set balance = v_balance,
      lifetime_converted = lifetime_converted + greatest(new.amount, 0),
      version = version + 1,
      updated_at = now()
  where entrepreneur_id = new.entrepreneur_id;

  insert into engagement.reward_ledger(
    entrepreneur_id,
    organization_id,
    reward_points_delta,
    engagement_points_delta,
    balance_after,
    reason,
    idempotency_key,
    metadata,
    created_by
  ) values (
    new.entrepreneur_id,
    v_organization_id,
    v_reward_delta,
    0,
    v_balance,
    'admin_adjustment',
    v_idempotency_key,
    jsonb_build_object(
      'adjustment_type', 'automatic_point_credit',
      'point_ledger_id', new.id,
      'point_rule_version_id', new.point_rule_version_id,
      'source_event_id', new.source_event_id,
      'point_delta', new.amount,
      'automatic', true
    ),
    v_user_account_id
  );

  return new;
end;
$function$;

revoke all on function app_private.credit_reward_wallet_from_point_ledger()
from public, anon, authenticated;

drop trigger if exists trg_credit_reward_wallet_from_point_ledger
on engagement.point_ledger;
create trigger trg_credit_reward_wallet_from_point_ledger
after insert on engagement.point_ledger
for each row
execute function app_private.credit_reward_wallet_from_point_ledger();

-- Disable the legacy conversion command at the ledger boundary. If an old
-- client still submits reward_convert, this exception rolls its transaction
-- back before it can leave the wallet double-credited.
create or replace function app_private.block_manual_reward_conversion()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
begin
  if new.reason = 'conversion' then
    raise exception 'REWARD_CONVERSION_DISABLED' using errcode = '0A000';
  end if;
  return new;
end;
$function$;

revoke all on function app_private.block_manual_reward_conversion()
from public, anon, authenticated;

drop trigger if exists trg_block_manual_reward_conversion
on engagement.reward_ledger;
create trigger trg_block_manual_reward_conversion
before insert on engagement.reward_ledger
for each row
execute function app_private.block_manual_reward_conversion();

-- Reconcile pre-existing participants once. Historical conversion entries stay
-- immutable for auditability, while the spendable balance becomes the current
-- net point ledger minus non-cancelled reward redemptions. Each participant is
-- processed once because reward_wallets is intentionally one wallet per person.
do $migration$
declare
  v_row record;
  v_old_balance integer;
  v_target_balance integer;
  v_redeemed integer;
  v_delta integer;
  v_user_account_id uuid;
begin
  for v_row in
    select
      entrepreneur.id as entrepreneur_id,
      coalesce(
        (array_agg(wallet.organization_id) filter (where wallet.organization_id is not null))[1],
        (array_agg(definition.owner_organization_id order by ledger.occurred_at desc))[1]
      ) as organization_id,
      coalesce(sum(ledger.amount), 0)::integer as net_points,
      coalesce(sum(greatest(ledger.amount, 0)), 0)::integer as lifetime_positive_points
    from engagement.point_ledger ledger
    join core.entrepreneurs entrepreneur
      on entrepreneur.id = ledger.entrepreneur_id
    join engagement.point_rule_versions version
      on version.id = ledger.point_rule_version_id
    join engagement.point_rule_definitions definition
      on definition.id = version.point_rule_definition_id
    left join engagement.reward_wallets wallet
      on wallet.entrepreneur_id = entrepreneur.id
    group by entrepreneur.id
  loop
    select entrepreneur.user_account_id
    into v_user_account_id
    from core.entrepreneurs entrepreneur
    where entrepreneur.id = v_row.entrepreneur_id;

    select coalesce(sum(redemption.points_spent), 0)::integer
    into v_redeemed
    from engagement.reward_redemptions redemption
    where redemption.entrepreneur_id = v_row.entrepreneur_id
      and redemption.status <> 'cancelled';

    v_target_balance := greatest(0, v_row.net_points - v_redeemed);

    insert into engagement.reward_wallets(
      entrepreneur_id,
      organization_id,
      balance,
      lifetime_converted
    ) values (
      v_row.entrepreneur_id,
      v_row.organization_id,
      0,
      0
    )
    on conflict (entrepreneur_id) do nothing;

    select wallet.balance
    into v_old_balance
    from engagement.reward_wallets wallet
    where wallet.entrepreneur_id = v_row.entrepreneur_id
    for update;

    v_delta := v_target_balance - coalesce(v_old_balance, 0);

    update engagement.reward_wallets
    set balance = v_target_balance,
        lifetime_converted = greatest(lifetime_converted, v_row.lifetime_positive_points),
        version = version + 1,
        updated_at = now()
    where entrepreneur_id = v_row.entrepreneur_id;

    if v_delta <> 0 and not exists (
      select 1
      from engagement.reward_ledger existing
      where existing.entrepreneur_id = v_row.entrepreneur_id
        and existing.idempotency_key = 'automatic-points-migration-v1'
    ) then
      insert into engagement.reward_ledger(
        entrepreneur_id,
        organization_id,
        reward_points_delta,
        engagement_points_delta,
        balance_after,
        reason,
        idempotency_key,
        metadata,
        created_by
      ) values (
        v_row.entrepreneur_id,
        v_row.organization_id,
        v_delta,
        0,
        v_target_balance,
        'admin_adjustment',
        'automatic-points-migration-v1',
        jsonb_build_object(
          'adjustment_type', 'automatic_points_migration',
          'net_points', v_row.net_points,
          'redeemed_points', v_redeemed,
          'previous_balance', coalesce(v_old_balance, 0),
          'reconciled_balance', v_target_balance,
          'automatic', true
        ),
        v_user_account_id
      );
    end if;
  end loop;
end;
$migration$;

commit;
