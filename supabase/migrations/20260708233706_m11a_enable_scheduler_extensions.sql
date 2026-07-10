-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708233706
-- Remote name: m11a_enable_scheduler_extensions
-- Remote SQL SHA-256: 3a7f5431ac718b1d4854073c083529c17edd62eede70763d5c00699b00a347ff
-- Do not edit after reconciliation; corrections require a new migration.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
