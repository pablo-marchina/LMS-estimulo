-- E14 — harden trigger helper function search_path.
-- Resolves Supabase Security Advisor function_search_path_mutable warnings.
alter function governance.set_updated_at() set search_path = pg_catalog;
alter function governance.reject_mutation() set search_path = pg_catalog;
