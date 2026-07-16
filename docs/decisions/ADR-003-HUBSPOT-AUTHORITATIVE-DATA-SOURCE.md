# ADR-003 — HubSpot como centro das informações do usuário

**Status:** refinada e alinhada à fonte superior  
**Data original:** 2026-07-10  
**Última revisão:** 2026-07-16  
**Escopo:** plataforma LMS e integrações da Estímulo

## Autoridade

Esta decisão implementa `premissas-desenvolvimento.md` conforme [SOURCE_AUTHORITY_HIERARCHY.md](../product/SOURCE_AUTHORITY_HIERARCHY.md).

O requisito superior é:

> todos os dados capturados ou usados relacionados ao usuário devem estar no HubSpot, que será o centro de suas informações.

Este ADR pode escolher o mecanismo técnico, mas não pode limitar o conjunto de dados do usuário representado no CRM.

## Contexto

A plataforma precisa simultaneamente:

- registrar todas as ações relevantes do usuário como dados estruturados;
- manter consistência transacional, versionamento, idempotência e auditoria;
- operar durante indisponibilidades temporárias de integrações;
- centralizar no HubSpot identidade, relacionamento, comportamento, progresso, contexto e histórico do usuário;
- permitir associação futura entre capacitação e crédito no mesmo registro.

Usar o HubSpot como banco transacional síncrono de cada ação criaria acoplamento e risco operacional. Usar apenas projeções seletivas, por outro lado, não atenderia à exigência de centralização completa dos dados do usuário.

## Decisão

### 1. Papel do HubSpot

O HubSpot é o centro recuperável das informações do usuário e deve possuir representação de todas as categorias de dados do usuário capturadas ou utilizadas pelo LMS.

Isso inclui, no mínimo:

- identidade, contato, CPF, telefone e CNPJ quando aplicável;
- UTMs, origem e consentimentos relevantes;
- negócio e vínculos com empresas;
- vínculo e momento da jornada de crédito;
- diagnóstico, respostas, versão, resultado e histórico;
- arquétipo vigente e histórico de atribuições;
- maturidade e outros contextos usados na personalização;
- matrículas, trilhas disponíveis e recomendações;
- progresso, sessões, atividades, avaliações e tentativas;
- comentários, avaliações de utilidade e práticas;
- uploads e referências seguras aos arquivos;
- pontos, conquistas, ranking, recompensas, selos e certificados;
- eventos comportamentais e sua sequência/contexto;
- comunicações, tarefas, segmentos e intervenções;
- dados usados ou produzidos em pesquisas futuras autorizadas.

A representação pode usar propriedades, objetos padrão, objetos personalizados, associações, eventos ou outros recursos aprovados da conta real.

### 2. Papel do PostgreSQL

O PostgreSQL permanece o banco operacional e técnico do LMS para:

- transações e concorrência;
- definições e versões;
- sessões e estado operacional;
- eventos granulares;
- outbox, inbox e idempotência;
- auditoria técnica;
- processamento e reconciliação;
- disponibilidade do produto durante falhas temporárias do CRM.

O PostgreSQL não substitui a obrigação de representação no HubSpot. Ele é a origem operacional e o mecanismo de entrega confiável.

### 3. Matriz completa de dados

Cada categoria de dado do usuário deve declarar:

```text
source_entity_or_event
business_name
business_purpose
personal_data_classification
hubspot_object
hubspot_property_event_or_association
representation_mode
transformation
sync_frequency
maximum_acceptable_delay
retention
access_scope
reconciliation_rule
failure_owner
```

A matriz não decide se um dado do usuário será integrado. Ela decide **como** será integrado.

Exceções somente são permitidas quando:

- o item não é informação do usuário, como segredo ou log puramente técnico;
- existe limitação técnica, contratual, legal ou de volume comprovada;
- uma representação alternativa preserva a recuperação e a rastreabilidade;
- a exceção é aprovada e registrada.

### 4. Eventos comportamentais

Todas as ações relevantes devem ser persistidas como eventos estruturados no event store.

O HubSpot deve receber representação recuperável desses eventos por uma estratégia aprovada, que pode ser:

- evento comportamental ou custom behavioral event;
- objeto personalizado associado ao contato/empresa;
- atividade/timeline adequada;
- agregado acompanhado de referência íntegra ao detalhe;
- lote ou snapshot quando a conta não suportar um registro por evento.

Uma referência ou agregado só encerra o requisito quando a operação consegue recuperar o detalhe exigido e a solução foi aprovada. “Não projetar cliques por padrão” não é mais uma regra válida para ações do usuário abrangidas pela premissa.

### 5. Sincronização

O fluxo padrão é assíncrono e confiável:

```text
transação no LMS
→ estado + evento + outbox
→ worker de transformação
→ escrita idempotente no HubSpot
→ receipt
→ retry ou reconciliação
```

Readback é obrigatório quando a ação seguinte depende de confirmação do HubSpot, por exemplo:

- resolução ou criação de identidade;
- deduplicação de contato/empresa;
- associação com operação de crédito;
- escrita crítica consumida imediatamente por workflow externo;
- confirmação de versão antes de ação irreversível.

Progresso e estudo podem continuar durante indisponibilidade temporária, desde que nenhuma informação seja perdida e o backlog de sincronização seja monitorado.

### 6. Identidade única

Clientes com crédito devem ser vinculados ao mesmo registro já existente.

Clientes sem crédito devem ser criados com:

- nome;
- e-mail;
- CPF;
- telefone;
- CNPJ opcional;
- origem/UTMs;
- identificadores internos necessários.

Quando houver crédito posterior, a operação deve ser associada ao mesmo usuário. Deduplicação não pode depender apenas de e-mail e deve seguir regras aprovadas para CPF, CNPJ, telefone, associações e conflitos.

### 7. Configuração e conteúdo

Formulários, jornadas, avaliações e políticas editoriais podem ser administrados e versionados no LMS.

O HubSpot deve receber as informações relacionadas ao usuário e as referências/versões necessárias para interpretar seu histórico. Não é obrigatório transformar toda entidade editorial sem usuário associado em objeto CRM.

### 8. Arquivos

Binários permanecem em storage privado apropriado.

O HubSpot recebe, quando o arquivo fizer parte do histórico do usuário:

- tipo e finalidade;
- proprietário e contexto;
- status de segurança e revisão;
- consentimento de uso;
- identificador/referência segura;
- metadados necessários para operação.

URLs assinadas temporárias, segredos e conteúdo inseguro não são persistidos no CRM.

### 9. Privacidade e crédito

A obrigação de centralização não elimina:

- minimização técnica;
- controle de acesso;
- finalidade;
- retenção;
- transparência;
- direitos do titular;
- necessidade de validação antes de uso em crédito.

Nenhum arquétipo ou sinal educacional pode aprovar, reprovar ou alterar crédito sem governança específica.

## Consequências

### Positivas

- cumpre a premissa de centro único das informações do usuário;
- preserva robustez transacional no LMS;
- permite visão completa de identidade, aprendizagem e relacionamento;
- reduz perda de dados durante falhas de integração;
- prepara a base para pesquisa futura e intervenções.

### Riscos

- maior volume e complexidade no HubSpot;
- necessidade provável de objetos/eventos personalizados;
- limites de API e licença;
- maior responsabilidade de privacidade;
- necessidade de reconciliação e monitoramento permanentes;
- possível necessidade de agregação aprovada para eventos de alta frequência.

Esses riscos devem ser resolvidos tecnicamente ou escalados como bloqueadores. Não autorizam reduzir o requisito silenciosamente.

## Gates obrigatórios

```text
hubspot_inventory_complete = true
hubspot_license_and_limits_verified = true
complete_user_data_matrix_approved = true
identity_deduplication_rules_approved = true
hubspot_real_adapter_implemented = true
all_user_data_categories_mapped = true
behavioral_event_representation_tested = true
idempotency_retry_and_rate_limit_tested = true
reconciliation_tested = true
critical_write_readback_tested = true
outage_backlog_recovery_tested = true
personal_data_access_controls_tested = true
credit_decision_from_unvalidated_training_signal = false
raw_secrets_sent_to_hubspot = false
```

## Relação com decisões anteriores

Esta revisão:

- preserva PostgreSQL como banco operacional;
- preserva sincronização assíncrona e outbox;
- substitui a interpretação de que somente “projeções relevantes” escolhidas tecnicamente precisam chegar ao HubSpot;
- implementa DEC-066 e a autoridade de `premissas-desenvolvimento.md`.
