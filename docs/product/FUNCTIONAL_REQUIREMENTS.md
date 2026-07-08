# Requisitos funcionais — versão inicial

**Legenda:** MUST = obrigatório na release inicial de produção; SHOULD = importante, possivelmente posterior; FUTURE = visão futura.

## Identidade e empresa

| ID | Prioridade | Requisito |
|---|---|---|
| FR-ID-001 | MUST | O sistema deve identificar unicamente o empreendedor. |
| FR-ID-002 | MUST | O sistema deve relacionar o empreendedor a uma empresa sem assumir relação 1:1 permanente. |
| FR-ID-003 | MUST | O sistema deve manter identificadores externos, incluindo o HubSpot, sem usá-los como chave interna primária. |
| FR-ID-004 | MUST | O sistema deve autenticar usuários e aplicar autorização no servidor. |
| FR-ID-005 | SHOULD | O sistema deve suportar múltiplos papéis administrativos. |

## Catálogo e jornadas

| ID | Prioridade | Requisito |
|---|---|---|
| FR-JR-001 | MUST | O sistema deve cadastrar programas, jornadas, versões, trilhas, módulos, conteúdos, atividades e avaliações. |
| FR-JR-002 | MUST | O sistema deve publicar versões imutáveis de uma jornada. |
| FR-JR-003 | MUST | Participantes existentes devem permanecer associados à versão correta. |
| FR-JR-004 | MUST | A Jornada OpenAI deve ser configurada por dados, não por condição específica no núcleo do código. |
| FR-JR-005 | MUST | Deve ser possível cadastrar uma segunda jornada sem criar novas tabelas específicas. |
| FR-JR-006 | MUST | O sistema deve definir pré-requisitos, obrigatoriedade, ordem e regras de conclusão. |
| FR-JR-007 | SHOULD | Conteúdos devem ser reutilizáveis entre jornadas e trilhas. |

## Diagnóstico e personalização

| ID | Prioridade | Requisito |
|---|---|---|
| FR-DG-001 | MUST | O sistema deve suportar definições e versões de diagnóstico. |
| FR-DG-002 | MUST | O sistema deve registrar sessões, respostas, alterações, conclusão e resultado. |
| FR-DG-003 | MUST | O resultado deve ser reproduzível para uma mesma versão e conjunto de respostas. |
| FR-DG-004 | MUST | O diagnóstico deve poder produzir dimensões e classificação com incerteza registrada. |
| FR-DG-005 | MUST | A atribuição de trilha/intervenção deve registrar regra, versão e justificativa. |
| FR-DG-006 | SHOULD | O diagnóstico deve poder ser reaplicado e manter histórico. |

## Participação e progressão

| ID | Prioridade | Requisito |
|---|---|---|
| FR-PG-001 | MUST | O sistema deve criar uma instância de participação por pessoa e versão de jornada. |
| FR-PG-002 | MUST | O sistema deve registrar início, progresso, pausa, retomada, conclusão, expiração e cancelamento. |
| FR-PG-003 | MUST | O próximo passo deve ser calculável a partir das regras da jornada e do estado do participante. |
| FR-PG-004 | MUST | O sistema deve distinguir visualização, início, progresso e conclusão válida. |

## Avaliações e prática

| ID | Prioridade | Requisito |
|---|---|---|
| FR-AS-001 | MUST | O sistema deve cadastrar avaliações versionadas. |
| FR-AS-002 | MUST | O sistema deve registrar tentativas, respostas, resultado e tempo. |
| FR-AS-003 | MUST | O sistema deve suportar atividades práticas separadas de avaliações teóricas. |
| FR-AS-004 | MUST | A atividade prática deve poder receber evidência, status de validação e feedback. |

## Gamificação e certificado

| ID | Prioridade | Requisito |
|---|---|---|
| FR-GM-001 | MUST | Pontos devem ser registrados em ledger auditável. |
| FR-GM-002 | MUST | Regras de pontos e selos devem possuir versão. |
| FR-GM-003 | SHOULD | O sistema deve suportar sequências, níveis e selos. |
| FR-GM-004 | MUST | Certificados devem ser emitidos a partir de critérios verificáveis e poder ser revogados. |

## Eventos comportamentais

| ID | Prioridade | Requisito |
|---|---|---|
| FR-EV-001 | MUST | Toda interação relevante deve gerar evento canônico versionado. |
| FR-EV-002 | MUST | Eventos brutos devem ser imutáveis. |
| FR-EV-003 | MUST | Eventos devem registrar actor, contexto, jornada, sessão, timestamps, origem e correlação. |
| FR-EV-004 | MUST | O sistema deve prevenir efeitos duplicados por idempotência. |
| FR-EV-005 | MUST | O sistema deve permitir replay controlado e auditoria de processamento. |
| FR-EV-006 | MUST | Dados pessoais desnecessários não devem ser incluídos no payload. |

## Features e score experimental

| ID | Prioridade | Requisito |
|---|---|---|
| FR-SC-001 | MUST | Features comportamentais devem ter definição, fórmula, janela, versão e eventos de origem. |
| FR-SC-002 | MUST | O sistema deve preservar os valores históricos de cada feature. |
| FR-SC-003 | SHOULD | Scores experimentais devem possuir versão, execução, explicação e dados utilizados. |
| FR-SC-004 | MUST | Score experimental não deve alterar decisão de crédito na release inicial de produção. |

## HubSpot

| ID | Prioridade | Requisito |
|---|---|---|
| FR-HS-001 | MUST | O sistema deve mapear pessoa e empresa aos objetos corretos do HubSpot. |
| FR-HS-002 | MUST | Cada campo sincronizado deve possuir sistema proprietário. |
| FR-HS-003 | MUST | A integração deve ser idempotente e assíncrona quando apropriado. |
| FR-HS-004 | MUST | Falhas devem ser registradas, retentadas e reconciliáveis. |
| FR-HS-005 | MUST | Eventos detalhados não devem ser enviados indiscriminadamente ao CRM. |

## Administração

| ID | Prioridade | Requisito |
|---|---|---|
| FR-AD-001 | MUST | Administração deve gerenciar conteúdo, versões e publicação. |
| FR-AD-002 | MUST | Administração deve consultar participantes, progresso e eventos. |
| FR-AD-003 | MUST | Operação deve visualizar falhas de integração e reprocessá-las com autorização. |
| FR-AD-004 | MUST | Toda ação administrativa sensível deve gerar auditoria. |
| FR-AD-005 | SHOULD | O sistema deve permitir exportações autorizadas para análise. |
