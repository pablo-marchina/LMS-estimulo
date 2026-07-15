\set ON_ERROR_STOP on

set statement_timeout='120s';
set lock_timeout='10s';

create temporary table library_test_results(
  name text primary key,
  value jsonb not null
) on commit preserve rows;

create or replace function pg_temp.library_assert(p_condition boolean,p_message text)
returns void language plpgsql as $$
begin
  if coalesce(p_condition,false) is not true then
    raise exception 'CONTENT_LIBRARY_ASSERTION_FAILED: %',p_message;
  end if;
end;
$$;

create or replace function pg_temp.library_expect_error(p_sql text,p_expected text)
returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlerrm=p_expected then return; end if;
    raise;
  end;
  raise exception 'CONTENT_LIBRARY_EXPECTED_ERROR_NOT_RAISED: %',p_expected;
end;
$$;

select
  app_private.e14_deterministic_uuid('e14:user:operator')::text operator_id,
  app_private.e14_deterministic_uuid('e14:user:participant')::text participant_id,
  app_private.e14_deterministic_uuid('e14:organization')::text organization_id,
  app_private.e14_deterministic_uuid('e14:journey-version:v1')::text journey_version_id,
  app_private.e14_deterministic_uuid('library:test:unauthorized-user')::text unauthorized_id
\gset library_

insert into iam.user_accounts(id,email_normalized,status)
values (:'library_unauthorized_id'::uuid,'library-unauthorized@estimulo.local','active')
on conflict (id) do update set status='active';

select count(*)::text events_before from eventing.events \gset library_
select count(*)::text outbox_before from eventing.outbox \gset library_

insert into library_test_results values(
  'save_article',
  public.save_library_content_draft(
    :'library_operator_id'::uuid,
    :'library_organization_id'::uuid,
    null,
    'fluxo-de-caixa-pratico',
    'Fluxo de caixa prático',
    'Organize entradas, saídas e decisões financeiras do negócio.',
    E'Comece registrando todas as entradas e saídas.\n\nRevise o saldo semanalmente e registre as decisões tomadas.',
    'article','guide','introductory',18,
    'estimulo','Estímulo','', 'pt-BR',
    array['Finanças','gestão','finanças'],
    'authenticated',
    array[:'library_journey_version_id'::uuid],
    'library-save-article-v1'
  )
);

select
  value#>>'{data,library_item_id}' article_item_id,
  value#>>'{data,library_item_version_id}' article_version_id,
  value#>>'{data,content_hash}' article_content_hash
from library_test_results where name='save_article'
\gset library_

select pg_temp.library_assert(
  (select value->>'replayed'='false' from library_test_results where name='save_article'),
  'first article draft must not replay'
);
select pg_temp.library_assert(
  (select topics=array['finanças','gestão']::text[] from catalog.library_item_versions where id=:'library_article_version_id'::uuid),
  'topics must be normalized and deduplicated'
);
select pg_temp.library_assert(
  (select count(*)=1 from catalog.library_item_journey_links where library_item_version_id=:'library_article_version_id'::uuid and journey_version_id=:'library_journey_version_id'::uuid),
  'journey link missing'
);

insert into library_test_results values(
  'save_article_replay',
  public.save_library_content_draft(
    :'library_operator_id'::uuid,
    :'library_organization_id'::uuid,
    null,
    'fluxo-de-caixa-pratico',
    'Fluxo de caixa prático',
    'Organize entradas, saídas e decisões financeiras do negócio.',
    E'Comece registrando todas as entradas e saídas.\n\nRevise o saldo semanalmente e registre as decisões tomadas.',
    'article','guide','introductory',18,
    'estimulo','Estímulo','', 'pt-BR',
    array['Finanças','gestão','finanças'],
    'authenticated',
    array[:'library_journey_version_id'::uuid],
    'library-save-article-v1'
  )
);
select pg_temp.library_assert(
  (select value->>'replayed'='true' from library_test_results where name='save_article_replay'),
  'article save replay flag missing'
);
select pg_temp.library_expect_error(format(
  $sql$select public.save_library_content_draft(%L::uuid,%L::uuid,null,%L,%L,%L,%L,%L,%L,%L,%s,%L,%L,%L,%L,array[%L]::text[],%L,array[%L::uuid],%L)$sql$,
  :'library_operator_id',:'library_organization_id','fluxo-de-caixa-pratico','Título alterado',
  'Organize entradas, saídas e decisões financeiras do negócio.','Texto alterado','article','guide','introductory',18,
  'estimulo','Estímulo','','pt-BR','finanças','authenticated',:'library_journey_version_id','library-save-article-v1'
),'IDEMPOTENCY_KEY_REUSED');
select pg_temp.library_expect_error(format(
  $sql$select public.save_library_content_draft(%L::uuid,%L::uuid,null,%L,%L,%L,%L,%L,%L,%L,%s,%L,%L,%L,%L,array[%L]::text[],%L,'{}'::uuid[],%L)$sql$,
  :'library_participant_id',:'library_organization_id','indevido','Conteúdo indevido',
  'Este conteúdo não deveria ser criado.','Texto suficiente para a validação.','article','article','introductory',10,
  'estimulo','Estímulo','','pt-BR','teste','authenticated','library-forbidden-save'
),'FORBIDDEN');

insert into library_test_results values(
  'operator_draft',public.list_operator_library_content(:'library_operator_id'::uuid,:'library_organization_id'::uuid)
);
select pg_temp.library_assert(
  (select jsonb_array_length(value->'items')>=1 from library_test_results where name='operator_draft'),
  'operator list must include draft'
);

insert into library_test_results values(
  'publish_article',public.publish_library_content(
    :'library_operator_id'::uuid,:'library_organization_id'::uuid,
    :'library_article_version_id'::uuid,:'library_article_content_hash','library-publish-article-v1'
  )
);
select pg_temp.library_assert(
  (select value#>>'{data,status}'='published' from library_test_results where name='publish_article'),
  'article must publish'
);
select pg_temp.library_assert(
  (select status='published' and published_at is not null from catalog.library_item_versions where id=:'library_article_version_id'::uuid),
  'published article state missing'
);

insert into library_test_results values(
  'save_external',
  public.save_library_content_draft(
    :'library_operator_id'::uuid,
    :'library_organization_id'::uuid,
    null,
    'video-planejamento-parceiro',
    'Planejamento em 20 minutos',
    'Vídeo externo com uma rotina objetiva de planejamento semanal.',
    '',
    'external_link','video','introductory',20,
    'partner','Parceiro Educacional','https://example.org/planejamento', 'pt-BR',
    array['planejamento','gestão'],
    'organization','{}'::uuid[],
    'library-save-external-v1'
  )
);
select
  value#>>'{data,library_item_version_id}' external_version_id,
  value#>>'{data,content_hash}' external_content_hash
from library_test_results where name='save_external'
\gset library_

insert into library_test_results values(
  'publish_external',public.publish_library_content(
    :'library_operator_id'::uuid,:'library_organization_id'::uuid,
    :'library_external_version_id'::uuid,:'library_external_content_hash','library-publish-external-v1'
  )
);

insert into library_test_results values(
  'search_finance',public.list_library_content(
    :'library_participant_id'::uuid,'fluxo caixa','finanças',null,null,null,24,0
  )
);
select pg_temp.library_assert(
  (select value->>'total'='1' from library_test_results where name='search_finance'),
  'finance search must return one result'
);
select pg_temp.library_assert(
  (select value#>>'{items,0,slug}'='fluxo-de-caixa-pratico' from library_test_results where name='search_finance'),
  'finance result slug mismatch'
);
select pg_temp.library_assert(
  (select value#>>'{items,0,journeys,0,journey_version_id}'=:'library_journey_version_id' from library_test_results where name='search_finance'),
  'search result journey link missing'
);

insert into library_test_results values(
  'article_detail',public.get_library_content(:'library_participant_id'::uuid,'fluxo-de-caixa-pratico')
);
select pg_temp.library_assert(
  (select value->>'content_kind'='article' and value->>'body' like 'Comece registrando%' from library_test_results where name='article_detail'),
  'article detail body missing'
);

insert into library_test_results values(
  'article_view',public.record_library_content_access(
    :'library_participant_id'::uuid,:'library_article_version_id'::uuid,'view','library_detail',null,'library-view-article-v1'
  )
);
select count(*)::text events_before_view_replay from eventing.events \gset library_
insert into library_test_results values(
  'article_view_replay',public.record_library_content_access(
    :'library_participant_id'::uuid,:'library_article_version_id'::uuid,'view','library_detail',null,'library-view-article-v1'
  )
);
select pg_temp.library_assert(
  (select value->>'replayed'='true' from library_test_results where name='article_view_replay'),
  'view replay flag missing'
);
select pg_temp.library_assert(
  (select count(*)=:'library_events_before_view_replay'::bigint from eventing.events),
  'view replay duplicated event'
);

insert into library_test_results values(
  'external_open',public.record_library_content_access(
    :'library_participant_id'::uuid,:'library_external_version_id'::uuid,'open','library_detail',null,'library-open-external-v1'
  )
);
select pg_temp.library_assert(
  (select value#>>'{data,external_url}'='https://example.org/planejamento' from library_test_results where name='external_open'),
  'external destination missing'
);

select pg_temp.library_expect_error(format(
  'select public.get_library_content(%L::uuid,%L)',:'library_unauthorized_id','video-planejamento-parceiro'
),'LIBRARY_CONTENT_NOT_FOUND');
select pg_temp.library_expect_error(format(
  'select public.publish_library_content(%L::uuid,%L::uuid,%L::uuid,%L,%L)',
  :'library_participant_id',:'library_organization_id',:'library_external_version_id',:'library_external_content_hash','library-forbidden-publish'
),'FORBIDDEN');

select pg_temp.library_assert(
  (select count(*)=3 from eventing.events where event_name in (
    'catalog.library_content.draft_saved','catalog.library_content.published','learning.library_content.accessed'
  ) and event_id in (
    app_private.e14_command_event_id('save_library_content_draft',:'library_operator_id'::uuid,:'library_article_item_id'::uuid,'library-save-article-v1'),
    app_private.e14_command_event_id('publish_library_content',:'library_operator_id'::uuid,:'library_article_version_id'::uuid,'library-publish-article-v1'),
    app_private.e14_command_event_id('record_library_content_access',:'library_participant_id'::uuid,:'library_article_version_id'::uuid,'library-view-article-v1')
  )),
  'expected command events missing'
);
select pg_temp.library_assert(
  (select count(*)-:'library_events_before'::bigint=6 from eventing.events),
  'library event total mismatch'
);
select pg_temp.library_assert(
  (select count(*)-:'library_outbox_before'::bigint=6 from eventing.outbox),
  'library outbox total mismatch'
);

set role authenticated;
do $$
begin
  begin
    perform public.list_library_content(
      current_setting('library.actor',true)::uuid,null,null,null,null,null,24,0
    );
    raise exception 'authenticated role unexpectedly executed server-only library RPC';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select jsonb_build_object(
  'status','passed',
  'article_version_id',:'library_article_version_id',
  'external_version_id',:'library_external_version_id',
  'events_delta',(select count(*)-:'library_events_before'::bigint from eventing.events),
  'outbox_delta',(select count(*)-:'library_outbox_before'::bigint from eventing.outbox)
) as content_library_e2e_result;
