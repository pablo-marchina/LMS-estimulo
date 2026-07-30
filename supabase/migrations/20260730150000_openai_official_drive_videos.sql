do $$
declare
  v_journey_version_id uuid := 'ba283018-dcab-572e-a1c6-293b2a0b716d'::uuid;
  v_inserted_or_present integer;
begin
  if not exists (
    select 1
    from catalog.journey_versions version
    join catalog.journey_definitions definition on definition.id = version.journey_definition_id
    where version.id = v_journey_version_id
      and definition.code = 'capacitacao_ia_mei_openai'
      and version.status = 'published'
  ) then
    raise notice 'OpenAI published journey fixture is not present during structural replay; official videos were not seeded.';
    return;
  end if;

  -- Remove the two generic inspirational-playlist placeholders. They were useful
  -- during the demo phase but are not part of the final Estímulo <> OpenAI course.
  delete from catalog.content_assets
  where id in (
    '65b9b10a-2432-5f11-a999-b9ffbc7b7832'::uuid,
    '6775693f-6edd-5581-aa43-302a3d043e0c'::uuid
  );

  insert into catalog.content_assets (
    id,
    activity_version_id,
    file_object_id,
    asset_type,
    title,
    external_url,
    language_code,
    accessibility_metadata,
    position,
    is_required,
    library_item_version_id
  )
  select
    app_private.e14_deterministic_uuid('openai-official-video|' || source.file_id),
    source.activity_version_id,
    null,
    'video',
    source.title,
    'https://drive.google.com/file/d/' || source.file_id || '/view',
    'pt-BR',
    jsonb_build_object(
      'source', 'google_drive',
      'source_name', 'Estímulo <> OpenAI',
      'source_collection_id', '1JIU-6NZhNI84zUMxHgYal_i8nb7up4ET',
      'source_file_id', source.file_id,
      'module', source.module_code,
      'original_filename', source.original_filename,
      'description', 'Vídeo oficial da capacitação Estímulo <> OpenAI disponibilizado no Google Drive institucional.'
    ),
    source.asset_position,
    true,
    null
  from (
    values
      ('7b7fd49b-911e-5bd1-a1eb-220d15850051'::uuid, 1, '17nnIhKrlo1ZGTZSBkdyMV0Vv8egsEfz_', 'Módulo 1 — Introdução', 'M01', '03. MODULO 1 - 0.0 Introdução.mp4'),
      ('4f3a8899-6ee7-50f1-a0bd-f9e97f19ae31'::uuid, 1, '1gwA0s4kNLER8Bz5nUZLrpiVLR2fzXSyo', 'Módulo 1 — Aula 1.1', 'M01', '03. MODULO 1 - 01.1.mp4'),
      ('2d45d1a7-88fa-524f-a90e-f37c9a4b7754'::uuid, 1, '1mhAtgRtNrGaoUQm0arFhMB0HbwriUWGE', 'Módulo 1 — Aula 1.2', 'M01', '03. MODULO 1 - 01.2_REF.mp4'),
      ('6410d021-1bcc-55a2-aa2b-c754261235d9'::uuid, 1, '1fUzL_CI9TWGsP8Yub5Nm5NOwrUEoaBBR', 'Módulo 1 — Aula 1.3', 'M01', '03. MODULO 1 - 01.3.mp4'),
      ('31322679-4c35-5620-a25c-6fe16a084198'::uuid, 1, '1Ystm1yqYOItnPKSGe-JBCGkfh9xy0Vre', 'Módulo 2 — Aula 1.1', 'M02', '03. MODULO 2 - 01.1.mp4'),
      ('7ae0212f-c72a-5bcd-acdc-39406aaf6b9a'::uuid, 1, '1tSWFCpQSFUSNlewh5HTu5mRyGcMPOMwT', 'Módulo 2 — Aula 1.2', 'M02', '03. MODULO 2 - 01.2.mp4'),
      ('faae0c87-603a-56f3-aa01-38190cc5cd7b'::uuid, 1, '1nVHegLtBvbepWRdX-KNdXQSMaKuTw5J0', 'Módulo 3 — Parte 1: introdução', 'M03.1', '03. MODULO 3 - 0.0 Introdução 1.mp4'),
      ('00abd1d4-0616-5b6c-a8f3-3a53d9583678'::uuid, 1, '1jiyX4oPmOBCk7zNZay1ZNFKFb6QiOVmj', 'Módulo 3 — Parte 1: aula 1.1', 'M03.1', '03. MODULO 3 - 01.1.mp4'),
      ('7cb00150-52f3-5aa1-a33f-7caff651a288'::uuid, 1, '1GdYiIBZRByhLMv7E1_iFgpKgSRRGsmG2', 'Módulo 3 — Parte 1: aula 1.2', 'M03.1', '03. MODULO 3 - 01.2.mp4'),
      ('faae0c87-603a-56f3-aa01-38190cc5cd7b'::uuid, 2, '1LJyZxZ8snEPSbmXjUYDFXUbf4mWgRVjT', 'Módulo 3 — Parte 1: aula 1.3', 'M03.1', '03. MODULO 3 - 01.3.mp4'),
      ('00abd1d4-0616-5b6c-a8f3-3a53d9583678'::uuid, 2, '1ppSyEOVSRG_wWLjv34cZj0GTBRRESrs_', 'Módulo 3 — Parte 1: aula 1.4', 'M03.1', '03. MODULO 3 - 01.4.mp4'),
      ('7cb00150-52f3-5aa1-a33f-7caff651a288'::uuid, 2, '1hujbo_kVWadcaGdRcGHnnJOFyQvsBUgz', 'Módulo 3 — Parte 1: aula 1.5', 'M03.1', '03. MODULO 3 - 01.5.mp4'),
      ('89167e81-2b33-5bac-a387-36c1498d389c'::uuid, 1, '1bjh1hCH6gkju9G4c0DVmS1QP06IbTSVK', 'Módulo 3 — Parte 2: introdução', 'M03.2', '03. MODULO 3 - 02.0 Introdução 2.mp4'),
      ('dbef7d4b-5956-582f-a373-526ee9938f51'::uuid, 1, '15-Us4QaqQZ-mTVtg4cEknZJUQRwWPX8V', 'Módulo 3 — Parte 2: aula 2.1', 'M03.2', '03. MODULO 3 - 02.1.mp4'),
      ('93d29ddc-6d04-5985-a059-9e4cd687c6a0'::uuid, 1, '1TOzAW--drOEiCrnPf0i_WPAKkXP2yAYO', 'Módulo 3 — Parte 2: aula 2.2', 'M03.2', '03. MODULO 3 - 02.2.mp4'),
      ('cd8b1eb8-def7-5b2b-a7a8-5d20b99d7e4c'::uuid, 1, '1OUwQUIM2PqV7KNnZBHtUCVZuACzG-WZf', 'Módulo 3 — Parte 2: aula 2.3', 'M03.2', '03. MODULO 3 - 02.3.mp4'),
      ('03b2108b-9fe7-5385-a40e-50dfbc35bae3'::uuid, 1, '1afnzU5JUJuOOtSsuNYFjlv-w0fhAjwE9', 'Módulo 3 — Parte 2: aula 2.4', 'M03.2', '03. MODULO 3 - 02.4.mp4'),
      ('4738ff58-b64a-5d3c-a364-e3a9557033df'::uuid, 1, '1XJ7RqqSqSrXeIYgEiIIUzNUuEE1EggcG', 'Módulo 3 — Parte 2: aula 2.5', 'M03.2', '03. MODULO 3 - 02.5.mp4'),
      ('4dbf441b-fb5f-582c-a235-52326db1f25d'::uuid, 1, '1f5GezWfBGcySHQ1Jmw12PMltnn87Pdq8', 'Módulo 4 — Introdução', 'M04', '03. MODULO 4 - 0.0 Introdução.mp4'),
      ('db3c39d5-79ee-5359-a0ed-f32f39ec2ef6'::uuid, 1, '1noiwIJHKXh1NniGX8vl01R21y0IS4bTV', 'Módulo 4 — Aula 0.1', 'M04', '03. MODULO 4 - 0.1.mp4'),
      ('af1c6475-4178-5ba0-abc2-84a12543f717'::uuid, 1, '1p9DxgrFP-g4quy5blqqh5bs1ro5-icAA', 'Módulo 4 — Aula 0.2', 'M04', '03. MODULO 4 - 0.2.mp4'),
      ('251997f7-c148-577f-a51b-51bdd5243245'::uuid, 1, '1vxahKW3_LsoOjz1-nUqdYaf5YKNKTiCg', 'Módulo 4 — Aula 0.3', 'M04', '03. MODULO 4 - 0.3.mp4'),
      ('1f089770-8461-5e79-aaa4-d4e1e9faade1'::uuid, 1, '1eMKfklyrPqK69jS443CyqvF0YuHAQHSJ', 'Módulo 4 — Aula 0.4', 'M04', '03. MODULO 4 - 0.4.mp4'),
      ('37202b35-d1b8-5c31-a18b-fa6358e3a8f5'::uuid, 1, '126zjP6CpsfVBCaTm_d-4n4VOXbpV9CjU', 'Conclusão da capacitação', 'CONCLUSAO', '04. Conclusão.mp4')
  ) as source(activity_version_id, asset_position, file_id, title, module_code, original_filename)
  where exists (
    select 1
    from orchestration.path_steps step
    join orchestration.path_templates template on template.id = step.path_template_id
    where step.activity_version_id = source.activity_version_id
      and template.journey_version_id = v_journey_version_id
  )
  on conflict do nothing;

  select count(*)::integer
    into v_inserted_or_present
  from catalog.content_assets asset
  join orchestration.path_steps step on step.activity_version_id = asset.activity_version_id
  join orchestration.path_templates template on template.id = step.path_template_id
  where template.journey_version_id = v_journey_version_id
    and asset.accessibility_metadata->>'source_collection_id' = '1JIU-6NZhNI84zUMxHgYal_i8nb7up4ET';

  if v_inserted_or_present <> 24 then
    raise exception 'OPENAI_OFFICIAL_VIDEO_COUNT_MISMATCH: %', v_inserted_or_present using errcode = '23514';
  end if;
end
$$;
