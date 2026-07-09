# ADR-002 — Rebaseline do E14 pelas premissas atuais

**Status:** Aceita  
**Data:** 2026-07-09  
**Escopo:** E14 e releases posteriores

## Contexto

O `Estimulo_all` é a referência máxima do produto. O objetivo não é apenas disponibilizar conteúdo: cada interação relevante do empreendedor deve gerar evidência comportamental estruturada, preservando o quê, quando, sequência e contexto, para personalização, relacionamento e pesquisa futura de utilidade em crédito.

Após a baseline E13 e a primeira vertical técnica E14, foram confirmadas premissas que alteram decisões anteriores:

1. o repositório oficial é `pablo-marchina/LMS-estimulo`;
2. o projeto Supabase `cfpfeavjlgheqqiaqtzv` é exclusivamente ambiente de desenvolvimento e teste;
3. staging e produção oficiais serão operados na AWS;
4. manutenção de longo prazo, clareza arquitetural, documentação atual e práticas de GitHub são requisitos de aceite;
5. todas as ações relevantes do usuário devem ser registradas como dados governáveis;
6. o HubSpot deve concentrar a visão integrada do usuário;
7. o diagnóstico deve usar um formulário configurável que atribui um de quatro arquétipos configuráveis;
8. formulário, regras e resultado precisam ser alteráveis de forma versionada e auditável;
9. a plataforma deve operar conteúdos próprios e de terceiros sem acoplamento ao provedor.

Essas premissas substituem interpretações anteriores que desativavam os quatro arquétipos ou limitavam o HubSpot a poucos agregados sem uma decisão explícita para cada dado de usuário.

## Hierarquia de autoridade

Quando houver conflito, aplicar esta ordem:

1. `Estimulo_all` e decisões explícitas posteriores fornecidas pela Estímulo;
2. este ADR e decisões aprovadas que o sucederem;
3. estado real do repositório oficial e dos ambientes autorizados;
4. demais documentos do projeto;
5. código, schemas, mockups e artefatos legados.

Nenhum artefato inferior nessa hierarquia pode redefinir silenciosamente uma premissa superior.

## Decisões

### 1. Ambientes e portabilidade

- Supabase será usado apenas em `local`, `development` e `test`.
- AWS será usada em `staging` e `production`.
- Nenhuma release poderá seguir diretamente do Supabase para produção.
- AWS staging é gate obrigatório antes da promoção produtiva.
- As migrations PostgreSQL versionadas no Git são a fonte única de verdade do schema.
- Regras de domínio e casos de uso não podem importar SDKs de Supabase ou AWS.
- Diferenças de identidade, storage, fila, segredos e observabilidade serão isoladas por portas e adapters.
- A aplicação será containerizada e deverá executar o mesmo código de negócio em todos os ambientes.

Mapeamento mínimo:

| Capacidade | Desenvolvimento/teste | Staging/produção |
|---|---|---|
| PostgreSQL | Supabase Postgres | Amazon RDS/Aurora PostgreSQL após decisão de capacidade |
| Identidade | Supabase Auth | Amazon Cognito |
| Objetos | Supabase Storage | Amazon S3 |
| Filas | adapter de teste/Supabase | Amazon SQS + DLQ |
| Workers | Edge Function ou processo de teste | AWS Lambda/ECS conforme perfil de execução |
| Segredos | ambiente seguro de teste | Secrets Manager/SSM Parameter Store |
| Telemetria | logs/OTLP de teste | CloudWatch/X-Ray via OpenTelemetry |

### 2. Arquitetura para manutenção

- O núcleo permanecerá um monólito modular com contextos delimitados.
- Padrões de projeto serão usados somente quando resolverem um problema identificado e documentado.
- Dependências apontarão de infraestrutura para aplicação/domínio, nunca no sentido inverso.
- Cada módulo possuirá contratos, propriedade de dados, testes e documentação explícitos.
- Código, migrations, contratos de eventos, testes e documentação da mesma mudança devem ser entregues no mesmo pull request.
- Funcionalidades obsoletas devem possuir plano de depreciação e remoção; não serão mantidas duas fontes de verdade em runtime.

### 3. Captura de ações e governança de dados

- Toda ação de usuário disponível em uma interface ativa deverá constar em um registro de interações.
- Cada ação deverá declarar finalidade, ator, contexto, schema, retenção, classificação, destino e teste.
- Eventos observados permanecem separados de inferências, features e scores.
- Evento, mudança de estado e outbox devem ser persistidos atomicamente quando fizerem parte do mesmo comando.
- Logs técnicos, traces e métricas de infraestrutura não serão tratados como comportamento do usuário.
- Captura indiscriminada é proibida: dados sem finalidade, base de tratamento, retenção ou uso definido não entram no runtime.

### 4. HubSpot como User 360

- HubSpot será o centro da visão integrada e operacional de relacionamento do usuário.
- PostgreSQL permanece a fonte transacional e histórica da plataforma.
- O event store permanece a fonte dos fatos comportamentais detalhados.
- Todo dado de domínio relacionado ao usuário deverá possuir uma decisão explícita de projeção no HubSpot.
- As decisões permitidas são: `SYNC_FULL`, `SYNC_AS_CURRENT_STATE`, `SYNC_AS_EVENT`, `SYNC_AS_AGGREGATE`, `REFERENCE_ONLY` ou `DO_NOT_SYNC_WITH_JUSTIFICATION`.
- `DO_NOT_SYNC_WITH_JUSTIFICATION` exige justificativa de finalidade, segurança, volume, limitação técnica ou minimização.
- O HubSpot não receberá payloads técnicos, segredos, binários, traces nem cliques brutos sem utilidade operacional.
- Sincronização será assíncrona por outbox, idempotente, observável, com retry, DLQ, reconciliação e readback.
- Nenhuma escrita de negócio dependerá da disponibilidade síncrona do HubSpot.

### 5. Formulário e quatro arquétipos

- A operação inicial deverá possuir exatamente quatro arquétipos ativos, definidos como dados configuráveis, não como enum ou condicionais hardcoded.
- Nomes, descrições, critérios, regras, pesos, mensagens e associações de trilha serão configuráveis.
- Formulários seguirão o padrão definição–versão–instância.
- Rascunhos serão editáveis; versões publicadas serão imutáveis.
- Alterações após publicação criarão nova versão.
- Submissões preservarão a versão do formulário e das regras usadas.
- O resultado atual poderá ser recalculado por uma nova submissão ou nova política explicitamente aplicada.
- Todo resultado anterior permanecerá no histórico.
- Override manual exigirá autorização, motivo, autor, timestamp e trilha de auditoria.
- A estratégia de atribuição será uma porta substituível. A primeira implementação poderá refletir a regra real do formulário fornecido, mas deverá expor versão, justificativa e evidências utilizadas.
- O resultado não poderá ser usado para aprovar, rejeitar ou condicionar crédito sem os gates jurídicos, de risco, explicabilidade e validação previstos no E13.

### 6. Conteúdo próprio e de terceiros

- Conteúdo terá um modelo unificado independente de provedor.
- Cada item declarará `ownership_type`, `provider`, `external_id`, `canonical_url`, política de embed, direitos/licença, disponibilidade, capacidades de tracking e fallback.
- Integrações externas serão adapters substituíveis.
- A primeira vertical usará um provedor real; novos provedores somente serão adicionados por necessidade comprovada.
- A conclusão de conteúdo não poderá ser inferida além da capacidade real do provedor.

### 7. Qualidade, documentação e GitHub

- Pull requests pequenos e rastreáveis serão preferidos a mudanças monolíticas.
- Branch protection, revisão, CI obrigatório, secret scanning e dependabot serão configurados quando suportados pelo repositório.
- O CI deverá validar no mínimo: instalação determinística, lint, typecheck, testes, build, migrations, schemas de eventos, documentação, segredos e contratos de portabilidade.
- Um documento somente poderá declarar uma capacidade como concluída quando houver prova executável correspondente.
- Documentação contraditória deverá ser marcada como superada ou atualizada; não poderá permanecer como instrução ativa.

## Decisões anteriores afetadas

- `DEC-005`: superada — o diagnóstico e os quatro arquétipos passam a ser requisitos configuráveis da release.
- `DEC-007`: mantida e refinada — HubSpot não é o event store bruto, mas toda informação de usuário exige decisão explícita de projeção.
- `DEC-030`: superada para a operação inicial — a plataforma deve operar quatro arquétipos, sem hardcode e sem impedir versões futuras.
- `DEC-032`: refinada — a estratégia de atribuição é versionada e substituível; probabilidades/confiança são usadas quando sustentadas pelo método real.
- `DEC-036`: superada — os quatro arquétipos não permanecem desativados na vertical-alvo.

## Critérios de aceite transversais

```text
supabase_used_for_production = false
aws_staging_gate_required = true
portable_postgresql_migrations = true
active_user_actions_without_registry = 0
active_user_actions_without_event_contract = 0
user_domain_fields_without_hubspot_projection_decision = 0
hardcoded_archetype_definitions = 0
published_form_versions_mutable = false
archetype_assignment_history_lost = false
external_content_without_rights_and_tracking_metadata = 0
documentation_claims_without_runtime_evidence = 0
```

## Consequências

- A vertical técnica E14 existente continua útil como fundação de runtime, mas não satisfaz sozinha as novas premissas.
- O próximo incremento deve começar por uma análise de lacunas de schema, eventos, HubSpot, formulário, arquétipos e conteúdo externo antes de criar novas tabelas.
- O Supabase continuará recebendo provas reais de desenvolvimento/teste, sem ser promovido ou descrito como ambiente produtivo.
- A AWS deverá ser preparada por infraestrutura como código e validada em staging antes do deploy oficial.