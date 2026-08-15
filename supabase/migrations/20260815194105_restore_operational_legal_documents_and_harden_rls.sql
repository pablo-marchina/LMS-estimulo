begin;

alter table governance.legal_document_versions enable row level security;
alter table governance.legal_acceptances enable row level security;

revoke all privileges on table governance.legal_document_versions from public, anon, authenticated, service_role;
revoke all privileges on table governance.legal_acceptances from public, anon, authenticated, service_role;

do $migration$
declare
  v_organization_id uuid := app_private.extension_default_organization();
  v_actor_user_account_id uuid;
  v_terms_title text := 'Termos de Uso';
  v_terms_body text := E'1. Finalidade da plataforma\nA Plataforma Estímulo oferece jornadas de aprendizagem, diagnósticos de perfil, atividades, acompanhamento de progresso, certificados e ferramentas de apoio ao desenvolvimento empreendedor.\n\n2. Conta e acesso\nVocê deve fornecer informações verdadeiras, manter suas credenciais protegidas e utilizar somente a sua própria conta. Atividades realizadas na conta podem ser registradas para manter o progresso, a segurança e a rastreabilidade da experiência.\n\n3. Uso adequado\nNão é permitido tentar acessar dados de outras pessoas, contornar controles de segurança, enviar arquivos maliciosos, prejudicar o funcionamento da plataforma ou utilizar os conteúdos em violação a direitos de terceiros.\n\n4. Conteúdos e atividades\nOs conteúdos têm finalidade educacional. Diagnósticos personalizam recomendações de aprendizagem e não constituem avaliação de crédito, aconselhamento financeiro, jurídico ou profissional.\n\n5. Arquivos, certificados e entregas\nArquivos enviados devem ser legítimos e relacionados às funcionalidades disponíveis. A plataforma pode validar formato, tamanho e segurança, restringir downloads e remover conteúdo incompatível com estes termos.\n\n6. Disponibilidade e alterações\nA experiência pode ser atualizada para corrigir falhas, melhorar a segurança e evoluir as jornadas. Quando uma alteração material exigir novo consentimento, uma nova versão será apresentada.\n\n7. Privacidade\nO tratamento de dados pessoais é descrito na Política de Privacidade.\n\n8. Contato e revisão institucional\nEsta versão organiza o fluxo operacional e deve passar pela aprovação jurídica e de privacidade da organização antes da liberação definitiva para usuários reais.';
  v_privacy_title text := 'Política de Privacidade';
  v_privacy_body text := E'1. Dados tratados\nPodemos tratar dados de cadastro e contato, informações de identificação necessárias para confirmar a conta, dados opcionais do negócio, respostas de diagnóstico, progresso, atividades, comentários, certificados, arquivos enviados e registros técnicos de segurança.\n\n2. Finalidades\nOs dados são usados para autenticar a conta, evitar duplicidade, operar jornadas, personalizar recomendações, registrar progresso, emitir certificados, prestar suporte, prevenir abuso e produzir informações operacionais e educacionais autorizadas.\n\n3. CPF e informações sensíveis\nO CPF é solicitado somente após a confirmação do e-mail. Ele é validado e protegido no servidor e não deve ser exibido integralmente nas telas administrativas ou de participante.\n\n4. Compartilhamento\nO acesso é limitado a pessoas e fornecedores necessários para operar a plataforma, conforme permissões, contratos e requisitos de segurança. Não vendemos dados pessoais.\n\n5. Arquivos\nCertificados e evidências são armazenados de forma privada. Downloads dependem de autenticação e autorização, e os arquivos podem passar por validações de tipo, tamanho e segurança.\n\n6. Retenção e segurança\nOs dados são mantidos pelo período necessário para as finalidades informadas, obrigações aplicáveis, segurança e auditoria. São utilizados controles de acesso, rastreabilidade, proteção criptográfica e segregação por organização.\n\n7. Direitos da pessoa titular\nVocê pode solicitar confirmação de tratamento, acesso, correção, informações sobre compartilhamento e, quando aplicável, eliminação, oposição ou revogação de consentimentos opcionais.\n\n8. Alterações\nVersões materiais serão identificadas e poderão exigir novo aceite. A versão aceita fica vinculada ao cadastro.\n\n9. Revisão institucional\nEste aviso implementa a transparência mínima da interface e deve ser validado pelo responsável jurídico e de privacidade antes da liberação definitiva para usuários reais.';
begin
  select account.id
  into v_actor_user_account_id
  from iam.user_accounts account
  where account.status = 'active'
    and app_private.e14_actor_has_permission(
      account.id,
      v_organization_id,
      'engagement.manage'
    )
  order by account.created_at, account.id
  limit 1;

  if v_actor_user_account_id is null then
    raise exception 'LEGAL_DOCUMENT_SEED_ACTOR_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from governance.legal_document_versions document
    where document.organization_id = v_organization_id
      and document.document_type = 'terms_of_use'
  ) then
    insert into governance.legal_document_versions(
      organization_id,
      document_type,
      version_number,
      status,
      title,
      body,
      require_reacceptance,
      content_hash,
      published_at,
      created_by
    ) values (
      v_organization_id,
      'terms_of_use',
      1,
      'published',
      v_terms_title,
      v_terms_body,
      false,
      app_private.e14_request_hash(jsonb_build_object('title', v_terms_title, 'body', v_terms_body)),
      timestamptz '2026-07-30 04:10:01+00',
      v_actor_user_account_id
    );
  end if;

  if not exists (
    select 1
    from governance.legal_document_versions document
    where document.organization_id = v_organization_id
      and document.document_type = 'privacy_policy'
  ) then
    insert into governance.legal_document_versions(
      organization_id,
      document_type,
      version_number,
      status,
      title,
      body,
      require_reacceptance,
      content_hash,
      published_at,
      created_by
    ) values (
      v_organization_id,
      'privacy_policy',
      1,
      'published',
      v_privacy_title,
      v_privacy_body,
      false,
      app_private.e14_request_hash(jsonb_build_object('title', v_privacy_title, 'body', v_privacy_body)),
      timestamptz '2026-07-30 04:10:01+00',
      v_actor_user_account_id
    );
  end if;
end;
$migration$;

commit;
