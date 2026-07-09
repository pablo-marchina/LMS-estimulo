begin;
create extension if not exists pgtap;
select plan(12);

select has_table('iam', 'external_identities', 'external identities table exists');
select has_function('app_private', 'set_request_context', array['uuid','uuid','text','text'], 'request context function exists');
select has_function('iam', 'resolve_external_identity', array['text','text','text','text','boolean','text'], 'identity resolver exists');
select has_function('eventing', 'append_event', 'transactional event append exists');
select has_function('eventing', 'claim_outbox_batch', array['text','integer','interval'], 'outbox claim exists');
select row_security_is_enabled('core', 'entrepreneurs', 'entrepreneurs RLS enabled');
select row_security_is_enabled('orchestration', 'journey_instances', 'journey instances RLS enabled');
select row_security_is_enabled('assessment', 'submissions', 'submissions RLS enabled');
select row_security_is_enabled('intelligence', 'score_results', 'score results RLS enabled');
select policies_are('iam', 'user_accounts', array['user_accounts_select_self_or_admin','user_accounts_write_admin'], 'user account policies are explicit');
select policies_are('core', 'entrepreneurs', array['entrepreneurs_select_authorized','entrepreneurs_write_authorized'], 'entrepreneur policies are explicit');
select policies_are('eventing', 'events', array[]::text[], 'event store has no direct RLS policy because direct grants are denied');

select * from finish();
rollback;
