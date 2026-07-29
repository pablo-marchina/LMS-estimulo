## Objetivo

<!-- Qual problema este PR resolve? -->

## Requisito ou decisão afetada

<!-- Cite a especificação, decisão vigente ou bloqueador permanente afetado. -->

- Documento afetado:
- Comportamento preservado ou alterado:
- Aprovação necessária, quando aplicável:

## Escopo

<!-- Liste somente as capacidades alteradas. -->

## Decisões e alternativas

<!-- Explique escolhas relevantes e por que não reduzem requisitos vigentes. -->

## Evidências

<!-- Diferencie código, teste local, CI e verificação no ambiente. Não inclua segredos ou dados pessoais reais. -->

### Qualidade

- [ ] Instalação executada com o método canônico
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
- [ ] Nenhum bypass ou backend de teste foi incluído no runtime

### Interface e acessibilidade

- [ ] Este PR não altera experiência do usuário
- [ ] Desktop e mobile foram verificados
- [ ] Teclado, foco, labels e erros foram revisados
- [ ] Conteúdo multimídia considera legenda/transcrição

## Riscos e rollback

<!-- Como detectar, pausar, reverter, reconciliar ou recuperar? -->

## Fora do escopo

<!-- Liste itens adiados sem apagar requisitos ou bloqueadores vigentes. -->