set lock_timeout = '5s';
set statement_timeout = '5min';

update catalog.journey_definitions
set name = 'IA na prática para impulsionar o seu negócio',
    purpose = 'Aprenda a usar inteligência artificial para economizar tempo, vender mais e tomar melhores decisões no seu negócio. Uma jornada prática desenvolvida pela Estímulo em conjunto com a OpenAI (ChatGPT), com conteúdos para aplicar desde o primeiro dia.',
    updated_at = now()
where code = 'capacitacao_ia_mei_openai';

update catalog.journey_versions journey
set title = 'IA na prática para impulsionar o seu negócio',
    description = 'Aprenda a usar inteligência artificial para economizar tempo, vender mais e tomar melhores decisões no seu negócio. Uma jornada prática desenvolvida pela Estímulo em conjunto com a OpenAI (ChatGPT), com conteúdos para aplicar desde o primeiro dia.',
    content_hash = app_private.e14_request_hash(jsonb_build_object(
      'title', 'IA na prática para impulsionar o seu negócio',
      'description', 'Aprenda a usar inteligência artificial para economizar tempo, vender mais e tomar melhores decisões no seu negócio. Uma jornada prática desenvolvida pela Estímulo em conjunto com a OpenAI (ChatGPT), com conteúdos para aplicar desde o primeiro dia.',
      'configuration', journey.configuration
    ))
where journey.id = (
  select version.id
  from catalog.journey_versions version
  join catalog.journey_definitions definition on definition.id = version.journey_definition_id
  where definition.code = 'capacitacao_ia_mei_openai'
    and version.status = 'published'
  order by version.version_number desc
  limit 1
);
