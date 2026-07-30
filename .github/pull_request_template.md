## Objetivo

<!-- Qual problema este PR resolve? -->

## Escopo

<!-- Liste somente as capacidades alteradas por este PR. -->

## Decisões e alternativas

<!-- Registre decisões não óbvias e por que alternativas foram descartadas. -->

## Evidências

<!-- Inclua comandos, resultados, screenshots ou artefatos reproduzíveis. Não inclua segredos ou dados pessoais reais. -->

### Qualidade

- [ ] Instalação executada com o método canônico do repositório
- [ ] Lint aprovado ou bloqueio explicitamente documentado
- [ ] Typecheck aprovado
- [ ] Testes relevantes aprovados
- [ ] Build de produção concluído
- [ ] Documentação sincronizada com o runtime
- [ ] Nenhum mock, fixture ou teste foi apresentado como prova de produção

### Banco e eventos

- [ ] Este PR não altera banco nem eventos
- [ ] Migration aditiva criada e replay validado
- [ ] RLS, índices, constraints e triggers revisados
- [ ] Estado, evento e outbox permanecem atômicos
- [ ] Toda ação nova relevante possui evento estruturado
- [ ] Schemas de eventos foram versionados e validados

### Dados, LGPD e HubSpot

- [ ] Este PR não cria nova coleta ou inferência de dados
- [ ] Finalidade, classificação, retenção e acesso foram definidos
- [ ] Cada novo dado/evento foi classificado como `linking_identifier`, `engagement_signal`, `calculation_input_or_result` ou `not_synced`
- [ ] Somente dados autorizados pela DEC-070 geram sincronização HubSpot
- [ ] Nenhum conteúdo editorial, binário, URL assinada, log técnico, token ou segredo é enviado ao HubSpot
- [ ] Dados de teste são sintéticos e marcados
- [ ] Uso em crédito permanece bloqueado quando não validado

### Ambientes e segurança

- [ ] Supabase e Vercel são usados somente em desenvolvimento, teste ou preview
- [ ] AWS permanece o ambiente definitivo de staging e produção
- [ ] Nenhum serviço AWS foi tratado como decidido sem ADR aprovado
- [ ] Dependências de infraestrutura permanecem atrás de adapters
- [ ] Fronteiras de produção ainda pendentes falham fechado
- [ ] Segredos não foram incluídos
- [ ] Secret scanning relevante foi executado
- [ ] Nenhum bypass ou backend de teste foi incluído no runtime de produção

### Interface e acessibilidade

- [ ] Este PR não altera experiência do usuário
- [ ] Desktop e mobile foram verificados
- [ ] Teclado, foco, labels e erros foram revisados
- [ ] Conteúdo multimídia considera legenda/transcrição

## Riscos e rollback

<!-- Como detectar, pausar, reverter, reconciliar ou recuperar? -->

## Fora do escopo

<!-- Liste itens adiados sem apagar requisitos ou bloqueadores vigentes. -->
