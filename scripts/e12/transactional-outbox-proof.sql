-- Minimal proof pattern. Adapt table names to approved migrations.
-- The domain state, canonical event and outbox row must commit or roll back together.

begin;

-- Example only: update/insert the actual aggregate here.
-- insert into orchestration.journey_instances (...) values (...);

-- insert into eventing.event_log (... canonical envelope columns ...) values (...);
-- insert into eventing.event_outbox (... event_id, destination, status ...) values (...);

-- Verification query should confirm all three records are visible in this transaction.

rollback;
