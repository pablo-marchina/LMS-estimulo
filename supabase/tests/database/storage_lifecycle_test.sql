\set ON_ERROR_STOP on
begin;

-- This proof expects fixture IDs to be absent. It creates a minimal authorized
-- participant, exercises the database lifecycle and rolls everything back.
insert into iam.user_accounts(id,email_normalized,status)
values ('10101010-1010-4010-8010-101010101010','e12-storage-db@example.invalid','active');
insert into iam.external_identities(id,user_account_id,provider,issuer,subject,email_normalized,email_verified,claims_fingerprint)
values ('11111111-1010-4010-8010-101010101010','10101010-1010-4010-8010-101010101010','supabase','https://test.example/auth/v1','storage-user','e12-storage-db@example.invalid',true,repeat('a',64));
insert into iam.organizations(id,organization_type,slug,legal_name,display_name,status,metadata)
values ('20202020-2020-4020-8020-202020202020','operator','e12-storage-proof','E12 Storage Proof','E12 Storage Proof','active','{}');
insert into core.entrepreneurs(id,user_account_id,preferred_name,email_normalized,status,profile_data)
values ('30303030-3030-4030-8030-303030303030','10101010-1010-4010-8010-101010101010','Proof','e12-storage-db@example.invalid','active','{}');
insert into catalog.programs(id,owner_organization_id,code,name,status)
values ('40404040-4040-4040-8040-404040404040','20202020-2020-4020-8020-202020202020','e12-proof','E12 Proof','active');
insert into catalog.journey_definitions(id,program_id,owner_organization_id,code,slug,name,status)
values ('50505050-5050-4050-8050-505050505050','40404040-4040-4040-8040-404040404040','20202020-2020-4020-8020-202020202020','e12-proof','e12-proof','E12 Proof','active');
insert into catalog.journey_versions(id,journey_definition_id,version_number,status,title,configuration,schema_version,published_at,content_hash,created_by)
values ('60606060-6060-4060-8060-606060606060','50505050-5050-4050-8050-505050505050',1,'published','E12 Proof','{}','1',now(),repeat('b',64),'10101010-1010-4010-8010-101010101010');
insert into orchestration.enrollments(id,entrepreneur_id,journey_version_id,source,status,assigned_at)
values ('70707070-7070-4070-8070-707070707070','30303030-3030-4030-8030-303030303030','60606060-6060-4060-8060-606060606060','e12-proof','active',now());

create temporary table e12_storage_results(intent_id uuid,file_object_id uuid,target_object_key text) on commit drop;
insert into e12_storage_results(intent_id)
select intent_id from public.file_create_upload_intent('supabase','https://test.example/auth/v1','storage-user','e12-storage-db@example.invalid',true,repeat('c',64),'20202020-2020-4020-8020-202020202020','30303030-3030-4030-8030-303030303030','e12_storage_proof','supabase_storage','estimulo-private-test','proof.txt','text/plain',900);
with confirmed as (
  select r.intent_id,c.file_object_id from e12_storage_results r cross join lateral public.file_confirm_upload('supabase','https://test.example/auth/v1','storage-user','e12-storage-db@example.invalid',true,repeat('d',64),r.intent_id,'text/plain',18,repeat('e',64),'v1','etag-proof','{}') c
) update e12_storage_results r set file_object_id=c.file_object_id from confirmed c where c.intent_id=r.intent_id;
with scanned as (
  select r.file_object_id,s.target_object_key from e12_storage_results r cross join lateral public.file_record_scan_result(r.file_object_id,'test-scanner','1','clean','[]','[]','proof',now(),now()) s
) update e12_storage_results r set target_object_key=s.target_object_key from scanned s where s.file_object_id=r.file_object_id;
select public.file_complete_release(file_object_id,target_object_key,'v2','etag-release') from e12_storage_results;

do $$
declare v_ok boolean;
begin
  select i.status='confirmed' and f.security_status='clean' and f.object_key like 'protected/%'
    into v_ok
  from e12_storage_results r
  join core.file_upload_intents i on i.id=r.intent_id
  join core.file_objects f on f.id=r.file_object_id;
  if not coalesce(v_ok,false) then raise exception 'storage lifecycle proof failed'; end if;
end $$;

rollback;
