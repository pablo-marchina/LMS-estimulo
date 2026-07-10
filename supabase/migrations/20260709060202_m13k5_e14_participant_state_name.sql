-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060202
-- Remote name: m13k5_e14_participant_state_name
-- Remote SQL SHA-256: a760c15df21c18c70b27d1a708bd4090d2cdc29dcf78646a2c2e1ac7b554ccb8
-- Do not edit after reconciliation; corrections require a new migration.

alter function public.e14_public_q1(uuid,uuid) rename to e14_get_participant_state;
