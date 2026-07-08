# Auditoria da fundação técnica

**Versão:** 0.1  
**Data:** 2026-07-08  
**Escopo:** análise estática do ZIP `plataforma-estimulo-main.zip`  
**Status:** Parcialmente concluída; build/typecheck ainda não validados por indisponibilidade de acesso ao registry no ambiente de auditoria.

## Resumo executivo

O repositório é uma fundação visual e conceitual útil para a futura plataforma, com boa separação inicial entre rotas, componentes, features, módulos e serviços. Ele já representa a Jornada OpenAI, páginas de aluno/admin, autenticação Supabase, schema inicial de LMS, progressão visual, avaliações, entregas, pontos, selos e certificados.

Entretanto, no estado atual, não é uma aplicação funcional ponta a ponta. A maior parte das superfícies é demonstrativa e usa dados estáticos. O Supabase só é chamado nas ações de autenticação; conteúdo, progresso, avaliações, entregas, gamificação, relatórios e administração não leem nem escrevem no banco. Também não existem diagnóstico, arquétipos, intervenções, event store, features comportamentais, score, integração HubSpot, processamento assíncrono, testes ou observabilidade.

A recomendação é **manter a fundação visual e parte da organização do código**, mas **refatorar o domínio e substituir o schema antes de transformar as telas em produto**.

## Evidências técnicas

- 2.803 linhas de TypeScript/TSX nas pastas principais.
- 30 tabelas no schema inicial.
- 20 rotas de página entre marketing, autenticação, aluno e administração.
- Apenas `modules/auth/actions.ts` realiza operações reais contra Supabase.
- Não existem rotas de API, handlers de webhook, jobs, workers ou consumidores de eventos.
- Não existem arquivos de teste.
- Progresso, métricas, notificações, perfil, pontuação e entregas estão hardcoded.
- A Jornada OpenAI está definida diretamente em `modules/journey/journey-data.ts`.

## Classificação por componente

| Componente | Estado | Decisão inicial | Motivo |
|---|---|---|---|
| Next.js App Router | Fundação coerente | MANTER COM VALIDAÇÃO | Adequado a monólito modular e SSR, mas build ainda não executado. |
| React/TypeScript | Fundação coerente | MANTER | Tipagem é útil, embora os contratos atuais sejam específicos da Jornada OpenAI. |
| Tailwind e componentes UI | Reutilizável | MANTER/REFINAR | Componentes simples, consistentes e sem forte acoplamento de dados. |
| Layouts aluno/admin | Reutilizáveis como referência | REFATORAR | Não possuem proteção de rota nem dados reais. |
| Autenticação Supabase | Parcial | REFATORAR | Ações existem, mas não há criação garantida do perfil público, proteção de rotas ou autorização administrativa. |
| Jornada em arquivo TypeScript | Demonstrativa | SUBSTITUIR | Conteúdo e regras precisam ser versionados e persistidos no banco. |
| Progresso | Mock | REESCREVER | Valores são derivados por índices fixos. |
| Gamificação | Regra estática útil como referência | REESCREVER COMO MOTOR GENÉRICO | Enum e tipos estão acoplados à Jornada OpenAI; falta idempotência e ledger completo. |
| Avaliações | UI/schema inicial | REFATORAR | Não há execução, correção, política de tentativas ou versionamento real. |
| Entregas práticas | Mock/schema inicial | REFATORAR | Falta upload seguro, workflow, histórico de revisão e eventos. |
| Certificados | Schema inicial | REFATORAR | Falta emissão, revogação operacional, versão do requisito e integridade de validação pública. |
| Admin | Mock visual | REESCREVER SOBRE CASOS DE USO | Botões não executam ações e não há autorização administrativa. |
| Relatórios | Mock | REMOVER DO RUNTIME ATÉ TER DADOS | Métricas fixas podem induzir leitura incorreta. |
| Banco atual | Protótipo LMS | SUBSTITUIR POR NOVO MODELO | Não representa empresas, jornadas versionadas, eventos, intervenções, features, score ou HubSpot. |
| HubSpot | Ausente | IMPLEMENTAR | Integração obrigatória ainda sem contrato. |
| Eventos comportamentais | Ausente | IMPLEMENTAR ANTES DAS FEATURES | Requisito central do produto. |
| Score comportamental | Ausente | MODELAR COMO EXPERIMENTAL | Precisa de linhagem, versões e governança. |
| Testes | Ausentes | IMPLEMENTAR | Não há proteção contra regressões. |
| Observabilidade | Ausente | IMPLEMENTAR | Sem logs estruturados, métricas, traces ou monitoramento de erro. |

## Achados críticos

### AUD-001 — Ausência de dados reais fora da autenticação

Todas as páginas de aprendizagem e administração utilizam dados importados de arquivos TypeScript. Não há leitura de cursos, progresso, avaliações, pontos ou entregas no Supabase.

**Impacto:** a aplicação não comprova integração ponta a ponta.  
**Ação:** criar uma vertical slice real antes de expandir as telas.

### AUD-002 — Rotas de aluno e administração não estão protegidas

Os layouts apenas renderizam shells. O proxy atual atualiza a sessão, mas não redireciona usuário não autenticado nem verifica papéis para `/admin`.

**Impacto:** risco crítico de acesso indevido quando as telas passarem a expor dados reais.  
**Ação:** implementar guards no servidor, autorização por caso de uso e RLS coerente.

### AUD-003 — Cadastro não garante registro em `public.users`

`signUpAction` cria o usuário em `auth.users`, mas o schema não possui trigger/função para criar a linha correspondente em `public.users`. O redirect para `/dashboard` também ocorre mesmo quando confirmação por e-mail pode impedir uma sessão ativa.

**Impacto:** registros dependentes de `public.users` podem falhar; jornada pós-cadastro inconsistente.  
**Ação:** desenhar provisioning transacional/idempotente e tratar confirmação de e-mail.

### AUD-004 — Domínio codificado para a Jornada OpenAI

`BadgeKey`, `PointAction`, `CertificateKind`, regras de pontos e blocos da jornada são unions/enums específicos do curso inicial.

**Impacto:** adicionar nova jornada exigiria alterar código, tipos e enum do banco.  
**Ação:** mover definições para entidades versionadas e regras configuráveis.

### AUD-005 — Ferramentas declaradas mas não usadas

TanStack Query, React Hook Form e o cliente browser Supabase estão instalados, porém não aparecem nos fluxos da aplicação. A dependência amplia superfície sem entregar funcionalidade.

**Impacto:** complexidade e manutenção sem benefício atual.  
**Ação:** remover temporariamente ou adotar quando houver caso real.

### AUD-006 — Build não reproduzido no ambiente de auditoria

O repositório exige pnpm, mas `package.json` não fixa `packageManager`. O ambiente não conseguiu baixar pnpm/dependências devido à indisponibilidade do registry. O TypeScript global disponível é 5.8.3 e rejeita `ignoreDeprecations: "6.0"`, enquanto o projeto declara TypeScript 6.0.3.

**Impacto:** ainda não há prova independente de build/typecheck.  
**Ação:** adicionar versão de Node/pnpm, CI e executar build em ambiente com registry disponível.

## Achados altos

- Não há error boundaries, páginas de loading ou tratamento de estados offline.
- Não há Server Actions para CRUD de conteúdo/admin, apesar do texto das telas sugerir funcionalidade completa.
- Botões de avaliação, progresso, upload, pontos e revisão não possuem handlers.
- O player não valida `lessonId`; uma ID inexistente pode causar falha ao acessar propriedades de valor indefinido.
- Dados pessoais de exemplo aparecem hardcoded em perfil e entregas.
- O admin exibe contagens fixas e métricas fictícias sem rótulo de demonstração.
- Não existe camada de serviço/repositório entre domínio e Supabase.
- Não existe contrato de API ou schema de eventos compartilhado.
- Não existe pipeline CI/CD ou configuração de testes.
- Não há estratégia de feature flags, migrations incrementais ou rollback.

## Pontos positivos a preservar

- Estrutura por `app`, `components`, `features`, `modules`, `services` e `types` é uma base melhor do que organizar apenas por camada técnica.
- Componentes visuais são pequenos e reutilizáveis.
- A jornada foi convertida para uma estrutura tipada, útil para validar o primeiro modelo conceitual.
- O schema usa constraints, foreign keys, RLS e grants explícitos como ponto de partida.
- O documento de arquitetura reconhece que regras de negócio não devem ficar nos componentes visuais.
- O design system explicita contraste, tokens e direção visual, embora ainda precise de validação formal da marca.

## Próximas ações técnicas

1. Corrigir a reprodutibilidade do ambiente e adicionar CI.
2. Definir o modelo de domínio genérico antes de alterar o banco.
3. Projetar schema novo com versionamento, inscrições, empresas, eventos, intervenções, features e score.
4. Implementar uma vertical slice real: identidade -> inscrição -> conteúdo -> progresso -> evento.
5. Implementar proteção de rotas e autorização administrativa.
6. Remover métricas e dados fictícios do runtime ou marcá-los claramente como demonstração.
7. Substituir a Jornada OpenAI hardcoded por conteúdo versionado no banco.
8. Adicionar testes de domínio, integração com Postgres/Supabase e E2E.
