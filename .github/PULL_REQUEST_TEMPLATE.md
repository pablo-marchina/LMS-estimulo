## Objetivo

<!-- Qual problema este PR resolve? -->

## Fonte e autoridade

<!-- Cite premissas-desenvolvimento, documento do pacote, decisão aprovada ou issue. -->

- Fonte superior afetada:
- Requisito preservado ou alterado:
- Aprovação da alteração, quando aplicável:

## Escopo

<!-- Liste somente as capacidades alteradas. -->

## Decisões e alternativas

<!-- Decisão técnica não pode reduzir requisito superior silenciosamente. -->

## Evidências

<!-- Diferencie prova sintética de prova real. Não inclua segredos ou dados pessoais reais. -->

### Qualidade

- [ ] Instalação executada com o método canônico
- [ ] Lint aprovado ou bloqueio documentado
- [ ] Typecheck aprovado
- [ ] Testes relevantes aprovados
- [ ] Build de produção concluído
- [ ] Documentação sincronizada com fonte e runtime
- [ ] Nenhuma capacidade sintética foi apresentada como oficial

### Banco e eventos

- [ ] Este PR não altera banco nem eventos
- [ ] Migration aditiva criada e replay validado
- [ ] RLS, índices, constraints e triggers revisados
- [ ] Estado, evento e outbox permanecem atômicos
- [ ] Toda ação nova relevante possui evento estruturado
- [ ] Schemas de eventos foram versionados e validados

### Dados, privacidade e HubSpot

- [ ] Este PR não cria nova coleta ou inferência
- [ ] Finalidade, classificação, retenção e acesso foram definidos
- [ ] Cada novo dado/evento foi classificado como `linking_identifier`, `engagement_signal`, `calculation_input_or_result` ou `not_synced`
- [ ] Somente identificadores mínimos, engajamento e dados úteis para cálculos aprovados geram sincronização HubSpot
- [ ] Itens `not_synced` possuem justificativa e permanecem no sistema apropriado
- [ ] Nenhum conteúdo editorial, binário, URL assinada, log técnico, token ou segredo é enviado ao HubSpot
- [ ] Variáveis de cálculo possuem origem, versão e finalidade
- [ ] Dados de teste são sintéticos e marcados
- [ ] Uso em crédito permanece bloqueado quando não validado

### Ambientes e segurança

- [ ] Supabase é usado somente em desenvolvimento/teste
- [ ] A mudança preserva ou comprova portabilidade para AWS
- [ ] Dependências de infraestrutura permanecem atrás de adapters
- [ ] O gate de AWS staging permanece explícito
- [ ] Segredos não foram incluídos
- [ ] Secret scanning relevante foi executado
- [ ] Recursos exclusivos de teste falham fechados em produção

### Interface e acessibilidade

- [ ] Este PR não altera experiência do usuário
- [ ] Desktop e mobile foram verificados
- [ ] Teclado, foco, labels e erros foram revisados
- [ ] Conteúdo multimídia considera legenda/transcrição
- [ ] Guia visual e mockups foram usados como referência subordinada

## Riscos e rollback

<!-- Como detectar, pausar, reverter, reconciliar ou recuperar? -->

## Fora do escopo

<!-- Liste itens adiados sem removê-los do requisito superior. -->
