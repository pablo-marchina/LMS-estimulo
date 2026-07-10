-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054651
-- Remote name: m13i4_e14_response_view
-- Remote SQL SHA-256: a168f5b6f2672ee33980c1839e98b1be14e90a3a05c40616c638d528f3c57889
-- Do not edit after reconciliation; corrections require a new migration.

create or replace view app_private.e14_response_view as
select r.id rid,r.attempt_id aid,r.question_id qid,r.response_value val,a.aggregate_version ver
from assessment.responses r join assessment.attempts a on a.id=r.attempt_id;
revoke all on app_private.e14_response_view from public,anon,authenticated;
