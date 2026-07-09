# Premissas e escopo

**Versão:** 0.3  
**Data:** 2026-07-09  
**Status:** Baseline revalidada para o E14

## Hierarquia de referência

Quando houver conflito, aplicar esta ordem:

1. `Estimulo_all` e decisões explícitas posteriores fornecidas pela Estímulo;
2. ADRs e decisões aprovadas atuais;
3. estado real do repositório oficial e dos ambientes autorizados;
4. demais documentos;
5. código, schemas, mockups e artefatos legados.

## Problema central

A Estímulo precisa transformar capacitação de uma entrega isolada em uma camada integrada à jornada de crédito. Cada interação relevante deve ser registrada como fato comportamental estruturado, preservando contexto, sequência e temporalidade para personalização, relacionamento e pesquisa futura de utilidade em crédito.

## Resultado de produto esperado

Uma plataforma interna que permita:

- hospedar, referenciar e versionar jornadas, trilhas, cursos, módulos, conteúdos próprios e conteúdos de terceiros;
- configurar e publicar formulários de diagnóstico;
- operar quatro arquétipos configuráveis na jornada inicial;
- atribuir, recalcular e alterar resultados de arquétipo com versão, justificativa, autorização e histórico;
- personalizar a experiência a partir de diagnóstico, arquétipo, contexto e momento da jornada;
- registrar progressão, avaliações, atividades práticas, pontos, selos e certificados;
- capturar eventos comportamentais brutos e imutáveis para todas as ações relevantes disponíveis no produto;
- derivar características comportamentais versionadas, separadas dos eventos observados;
- manter no HubSpot a visão integrada e operacional do usuário;
- atribuir a todo dado de usuário uma decisão explícita de projeção no HubSpot;
- manter PostgreSQL como fonte transacional e histórica e o event store como fonte dos fatos detalhados;
- acomodar novas jornadas, formulários, arquétipos e provedores de conteúdo sem duplicar tabelas ou criar código específico por jornada.

## Natureza da primeira entrega

A primeira entrega será uma **release inicial de produção**, pronta para deploy e operação real. O escopo será deliberadamente limitado, mas todo componente incluído deverá atender aos requisitos de segurança, integridade, testes, observabilidade, recuperação, acessibilidade, documentação e manutenção.

A validação funcional ocorrerá primeiro no Supabase de desenvolvimento/teste. Nenhuma execução no Supabase será tratada como deploy produtivo. A release deverá passar por AWS staging antes de qualquer promoção para produção oficial na AWS.

## Arquitetura de ambientes

- `local`, `development` e `test`: Supabase e adapters de teste;
- `staging` e `production`: AWS;
- migrations PostgreSQL únicas e versionadas no Git;
- domínio e aplicação independentes de SDKs de Supabase e AWS;
- Supabase Auth e Storage somente por adapters de desenvolvimento/teste;
- Cognito, S3, SQS, KMS, Secrets Manager/SSM e observabilidade AWS por adapters de staging/produção;
- o mesmo código de negócio deve executar nos dois ambientes;
- nenhuma promoção direta do Supabase para produção.

## Escopo funcional inicial

- Uma jornada com conteúdo inicial: **Jornada OpenAI/IA**.
- Estrutura preparada para múltiplas jornadas futuras.
- Formulário de diagnóstico configurável e versionado.
- Exatamente quatro arquétipos ativos na operação inicial, definidos como dados configuráveis e não como enum ou condicionais hardcoded.
- Regras de atribuição versionadas e substituíveis.
- Histórico integral de submissões, revisões, atribuições, recálculos e overrides.
- Conteúdo próprio e de terceiros por modelo unificado e adapters de provedor.
- Registro estruturado de todas as ações relevantes disponíveis na interface ativa.
- Gamificação com ledger auditável e regras versionadas.
- HubSpot como CRM e centro da visão integrada do usuário.
- PostgreSQL como fonte operacional, transacional e histórica.
- Score comportamental inicialmente experimental, explicável e não decisório.
- Supabase exclusivamente como ambiente de desenvolvimento/teste.
- AWS como ambiente de staging e produção oficial.

## HubSpot e dados do usuário

- Todo campo, estado, evento ou agregado de domínio ligado ao usuário deverá possuir uma decisão de projeção.
- As decisões permitidas são `SYNC_FULL`, `SYNC_AS_CURRENT_STATE`, `SYNC_AS_EVENT`, `SYNC_AS_AGGREGATE`, `REFERENCE_ONLY` ou `DO_NOT_SYNC_WITH_JUSTIFICATION`.
- O HubSpot não substitui o banco transacional nem o event store.
- Cliques brutos, traces, métricas técnicas, segredos, binários e payloads sem utilidade operacional não serão copiados para o CRM.
- A sincronização será assíncrona, idempotente, reconciliável e fora do caminho crítico da transação de negócio.

## Formulário e arquétipos

- Formulários seguem definição–versão–instância.
- Rascunhos são editáveis; versões publicadas são imutáveis.
- Mudanças criam nova versão.
- A submissão preserva a versão do formulário e da regra aplicada.
- O resultado atual pode mudar por nova submissão, recálculo explícito ou override autorizado.
- Resultados anteriores não são sobrescritos.
- Override exige motivo, ator, autorização e auditoria.
- O resultado não pode ser usado para aprovar, rejeitar ou condicionar crédito sem os gates jurídicos, de risco, explicabilidade e validação previstos.

## Conteúdo de terceiros

Cada conteúdo externo deve declarar:

- propriedade e origem;
- provedor e identificador externo;
- URL canônica e política de embed;
- direitos/licença;
- disponibilidade e fallback;
- capacidades reais de tracking;
- regra de conclusão compatível com essas capacidades;
- versão e histórico das alterações.

## Fora do escopo da fase inicial

- decisão automática de crédito;
- score produtivo usado para aprovar ou rejeitar crédito;
- múltiplas jornadas completas com conteúdo final;
- múltiplos provedores externos sem demanda real;
- marketplace;
- aplicativo mobile nativo;
- compra de LMS;
- comunidade social completa;
- automações multicanal complexas;
- microserviços sem necessidade comprovada;
- produção no Supabase;
- ativação indiscriminada de todos os eventos apenas por completude de catálogo;
- cópia de logs técnicos para o HubSpot.

## Princípios

1. `Estimulo_all` e as premissas atuais têm precedência sobre artefatos antigos.
2. Eventos observados devem ser separados de interpretações, features e scores.
3. O modelo de dados não deve depender da interface atual.
4. A Jornada OpenAI não pode ficar codificada como caso especial.
5. Os quatro arquétipos da operação inicial são configuráveis e não hardcoded.
6. Toda regra, jornada, formulário, diagnóstico, arquétipo, conteúdo, feature e score deve possuir versão.
7. Toda ação relevante disponível ao usuário deve possuir registro, finalidade, contrato de evento, retenção e teste.
8. Todo dado de usuário deve possuir uma decisão explícita de projeção no HubSpot.
9. HubSpot é a visão integrada do usuário; PostgreSQL e event store preservam transações e histórico detalhado.
10. Conclusão de conteúdo não equivale a aprendizagem, aplicação ou menor risco.
11. Arquitetura e schema existentes precisam ser provados, não presumidos.
12. Supabase é apenas teste; AWS staging é gate obrigatório para produção.
13. Padrões de projeto só serão adotados quando resolverem problema documentado.
14. Código, banco, testes e documentação devem mudar juntos.
15. Escopo inicial limitado não reduz o padrão de produção.
16. Não serão publicados mocks, métricas fictícias ou fluxos sem recuperação operacional.
17. Nenhuma capacidade será declarada concluída apenas por existir em documento ou migration aplicada manualmente.
18. A liberação inicial poderá ser progressiva, mas ocorrerá em ambiente produtivo oficial na AWS.