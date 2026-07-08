# Requisitos não funcionais — versão inicial

## Arquitetura e extensibilidade

| ID | Requisito inicial |
|---|---|
| NFR-AR-001 | A adição de nova jornada não deve exigir novas tabelas específicas nem alteração do núcleo de autenticação/eventos. |
| NFR-AR-002 | Regras e definições devem ser versionadas e rastreáveis. |
| NFR-AR-003 | O sistema deve começar como monólito modular, salvo evidência contrária na auditoria. |
| NFR-AR-004 | Integrações externas não devem controlar transações centrais do domínio. |

## Integridade e auditabilidade

| ID | Requisito inicial |
|---|---|
| NFR-DT-001 | Eventos, ledger de pontos e registros de auditoria devem ser append-only ou protegidos contra edição comum. |
| NFR-DT-002 | Toda transformação de evento para feature deve possuir linhagem. |
| NFR-DT-003 | Processamentos assíncronos devem ser idempotentes. |
| NFR-DT-004 | Migrations devem ser versionadas, reproduzíveis e testadas. |

## Segurança

| ID | Requisito inicial |
|---|---|
| NFR-SE-001 | Nenhum segredo pode ser armazenado no repositório. |
| NFR-SE-002 | Administração deve utilizar MFA quando suportado. |
| NFR-SE-003 | Autorização deve ser verificada no servidor e no banco quando aplicável. |
| NFR-SE-004 | Ambientes devem ser segregados. |
| NFR-SE-005 | Logs não devem registrar credenciais ou dados pessoais desnecessários. |

## Privacidade

| ID | Requisito inicial |
|---|---|
| NFR-PR-001 | O sistema deve coletar apenas dados necessários para finalidades documentadas. |
| NFR-PR-002 | Identidade pessoal deve ser separável da camada analítica. |
| NFR-PR-003 | Retenção, anonimização e exclusão devem ser planejadas por categoria de dado. |
| NFR-PR-004 | O uso de score deve ser claramente distinguido entre pesquisa, personalização e decisão. |

## Disponibilidade e recuperação

| ID | Requisito inicial |
|---|---|
| NFR-OP-001 | A aplicação deve possuir health checks, logs estruturados, métricas e rastreamento de erros. |
| NFR-OP-002 | Banco e arquivos devem possuir backup automatizado e teste de restauração. |
| NFR-OP-003 | Falha do HubSpot não deve impedir o uso central da plataforma. |
| NFR-OP-004 | Jobs com falha devem ter retry limitado e dead-letter/revisão manual. |

## Desempenho

| ID | Requisito inicial |
|---|---|
| NFR-PF-001 | Fluxos principais devem permanecer utilizáveis em conexão móvel comum. |
| NFR-PF-002 | Processos longos devem ser assíncronos. |
| NFR-PF-003 | Paginação e índices devem ser previstos para eventos e histórico. |

## Acessibilidade e experiência

| ID | Requisito inicial |
|---|---|
| NFR-UX-001 | A interface deve seguir WCAG 2.2 AA como baseline. |
| NFR-UX-002 | Fluxos devem funcionar por teclado e leitor de tela. |
| NFR-UX-003 | A experiência deve ser mobile-first ou, no mínimo, plenamente responsiva. |
| NFR-UX-004 | Estados de loading, vazio, erro, offline e retomada devem ser especificados. |

## Qualidade de engenharia

| ID | Requisito inicial |
|---|---|
| NFR-QA-001 | CI deve executar lint, typecheck, testes e build. |
| NFR-QA-002 | Jornadas críticas devem possuir testes de integração e E2E. |
| NFR-QA-003 | Contratos de eventos e APIs devem ser validados automaticamente. |
| NFR-QA-004 | Dependências devem ser analisadas e atualizadas de forma controlada. |

## Portabilidade de ambientes

| ID | Requisito inicial |
|---|---|
| NFR-PT-001 | O mesmo conjunto de migrations PostgreSQL deve ser aplicado em Supabase e Amazon RDS PostgreSQL. |
| NFR-PT-002 | Módulos de domínio não podem importar SDKs do Supabase, AWS, HubSpot ou OpenAI. |
| NFR-PT-003 | Autenticação deve usar um adapter OIDC/JWT e identidade interna independente do provedor. |
| NFR-PT-004 | Storage, filas, e-mail, secrets e observabilidade devem possuir contratos internos e implementações por ambiente. |
| NFR-PT-005 | Toda release deve passar por AWS staging antes da produção. |
| NFR-PT-006 | O CI deve validar compatibilidade de schema, RLS e contratos nos ambientes suportados. |
| NFR-PT-007 | Recursos proprietários do Supabase não podem ser dependência única de uma capacidade produtiva. |

## Prontidão para produção

| ID | Requisito inicial |
|---|---|
| NFR-PRD-001 | Toda funcionalidade incluída na release inicial deve estar conectada a dados reais, estado vazio honesto ou erro explícito; dados simulados não podem aparecer como reais. |
| NFR-PRD-002 | O deploy deve ser reproduzível, automatizado e possuir rollback documentado. |
| NFR-PRD-003 | Migrations devem ser verificadas em ambiente anterior à produção e mudanças destrutivas devem seguir estratégia compatível com operação contínua. |
| NFR-PRD-004 | A release deve possuir runbooks de incidente, integração, restauração e falha de processamento. |
| NFR-PRD-005 | A publicação deve utilizar checklist e gate de produção, com riscos residuais documentados. |
| NFR-PRD-006 | O rollout inicial deve permitir limitação de coorte, pausa de novas entradas e desativação segura de funcionalidades. |
| NFR-PRD-007 | Falhas de serviços externos não podem corromper o estado central nem bloquear funcionalidades que não dependam materialmente deles. |
| NFR-PRD-008 | O sistema deve permitir reconciliação entre estado operacional, eventos, integrações e projeções derivadas. |
| NFR-PRD-009 | Deve existir um processo definido de suporte, triagem e escalonamento para usuários reais. |
| NFR-PRD-010 | A Definition of Done de implementação deve incluir código, testes, telemetria, documentação, segurança e operação. |
