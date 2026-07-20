# Reconciliação de reutilização — Impulso Empreendedor

**Versão:** 1.0  
**Data:** 2026-07-20  
**Estado:** `CONDITIONAL_PASS` para o gate G0.5

## Escopo e segurança

A referência `impulso-empreendedor.zip` foi analisada fora da árvore do repositório. A seleção considerou 102 arquivos-fonte e excluiu `node_modules`, `.next`, `.open-next`, caches, builds, `tsconfig.tsbuildinfo`, fontes e binários.

O código recebido não foi executado nem instalado no workspace oficial. Uma varredura estática por chaves privadas, tokens conhecidos, URLs PostgreSQL com senha e atribuições de segredo não encontrou valores materializados. Ocorrências de `service_role` eram nomes de papel/grants Supabase; ocorrências de `password` eram campos e validações de formulário.

Nenhum arquivo `LICENSE` foi localizado. Portanto:

- comportamento, modelo de domínio, UX e conhecimento operacional podem orientar `PORT_WITH_ADAPTATION`;
- cópia literal de código e assets permanece `BLOCKED_PENDING_AUTHORIZATION`;
- o deploy existente não será alterado nesta fase.

## Identificação da aplicação

Evidências do pacote:

- Next.js App Router, React e TypeScript;
- Supabase Auth, Postgres e RLS;
- OpenNext para Cloudflare Workers;
- `wrangler.jsonc` com worker `meus-projetos`, consistente com o deploy público informado;
- cadastro, diagnóstico, experiência participante e administração implementados;
- ausência de suíte de testes própria identificada;
- dependências de deploy com versões flutuantes em pontos críticos.

## Matriz de decisão por capacidade

| Capacidade | Impulso Empreendedor | Fundação canônica | Decisão | Elemento reutilizado | Elemento não portado diretamente |
|---|---|---|---|---|---|
| Cadastro público | nome, negócio, e-mail, senha e confirmação por e-mail | `iam/core` do LMS | `PORT_WITH_ADAPTATION` | fluxo mínimo, linguagem e ordem de captura | schema `public.users`, metadados como autoridade e mutações diretas |
| UTM first-touch | cookie HttpOnly e persistência inicial | eventos e modelo de atribuição do LMS | `PORT_WITH_ADAPTATION` | semântica first-touch e conjunto de campos | confiança em `raw_user_meta_data`, retenção indefinida e ausência de lineage |
| Login e recuperação | Supabase Auth funcional | porta de identidade do LMS | `REUSE_VISUAL_PATTERN` + `PORT_WITH_ADAPTATION` | UX, mensagens e fluxos | acoplamento direto do domínio ao provedor |
| Diagnóstico de maturidade | 6 perguntas/dimensões, score 0–100, Base/Tração/Evolução | `diagnostics.*` e contrato multi-eixo do LMS | `REUSE_DOMAIN_MODEL` + `REUSE_BUSINESS_RULE` | perguntas como referência, score, dimensão prioritária e explicações | fallback hardcoded, ausência de versão e taxonomia sem aprovação |
| Arquétipo | não implementa os quatro arquétipos | `configurable-product` | `KEEP_AND_INTEGRATE` | nenhuma substituição | não converter maturidade em arquétipo |
| Atribuição de trilhas | maturidade + dimensão prioritária | personalização/versionamento do LMS | `PORT_WITH_ADAPTATION` | regra operacional e UX | mutação sem contrato versionado e arquivamento implícito |
| Jornada e conteúdo | conteúdo OpenAI detalhado em TypeScript | `catalog.*` e pacote editorial oficial | `REUSE_CONTENT_AFTER_APPROVAL` | estrutura, textos, duração e critérios pedagógicos | conteúdo hardcoded como fonte canônica e duplicação de versão |
| Navegação participante | dashboard, jornada, cursos, player, perfil e engajamento | aplicação Next.js oficial | `REUSE_VISUAL_PATTERN` | fluxo e linguagem já usados | componentes literais sem autorização |
| Player de vídeo | YouTube API, progresso visual e conclusão em 98%/fim | atividade/progresso versionado do LMS | `PORT_WITH_ADAPTATION` | interação, retomada e critério como hipótese | conclusão confiada ao cliente, gravação direta e falta de eventos idempotentes |
| Rating 1–5 | componente acessível por botões e upsert | avaliação de utilidade do LMS | `PORT_WITH_ADAPTATION` | UX, labels e escala | gravação client-side direta, logs brutos e ausência de evento |
| Progresso agregado | parte real no player, parte hardcoded em `modules/journey/progress.ts` | progresso real do LMS | `REJECT` para helper hardcoded; `PORT_WITH_ADAPTATION` para player | comportamento real do player | números estáticos apresentados como progresso |
| Pontos | regras configuráveis em tabela e conteúdos de referência | ledger versionado do LMS | `REUSE_ACCEPTANCE_CRITERIA` | catálogo de ações e valores como proposta | tabela mutável como saldo canônico e grants amplos |
| Conquistas e certificados | fluxos e telas existentes | ledger/credenciais do LMS | `REUSE_VISUAL_PATTERN` + `KEEP_AND_INTEGRATE` no LMS | linguagem e experiência | schema paralelo |
| Entregas | submissões, revisão e telas administrativas | uploads, quarentena e scanner do LMS | `PORT_WITH_ADAPTATION` | fluxo operacional e estados | acesso amplo e ausência de scanner aprovado |
| Administração | usuários, cursos, trilhas, módulos, aulas, regras, entregas e relatórios | RBAC capability-based e biblioteca do LMS | `PORT_WITH_ADAPTATION` | fluxos, formulários, confirmação e organização do CMS | papel admin binário, grants `for all`, ações sem contratos versionados |
| Concessão de admin | confirmação textual para conceder e remoção direta | `iam.*` do LMS | `REUSE_VISUAL_PATTERN` | confirmação sensível e clareza de impacto | RBAC binário, ausência de proteção comprovada ao último admin e auditoria insuficiente |
| Relatórios | parte da UI e métricas estáticas | reporting + Data Hub | `REUSE_VISUAL_PATTERN` | estrutura visual e perguntas operacionais | dados hardcoded e reconstrução do Data Hub |
| RLS | 35 tabelas e 72 policies no schema paralelo | 265 migrations e RLS universal do LMS | `REJECT` como schema; `REUSE_ACCEPTANCE_CRITERIA` | casos de acesso participante/admin | policies amplas baseadas apenas em `is_admin()` |
| Cloudflare Workers | deploy existente e observabilidade básica | AWS staging/produção | `REUSE_OPERATIONAL_KNOWLEDGE` | continuidade, rollback e comparação de equivalência | mudança do alvo aprovado para Cloudflare |

## Riscos encontrados

1. `raw_user_meta_data` é usado para transportar perfil e UTM no trigger de criação; esse metadata é adequado como entrada, mas não pode ser fonte de autorização.
2. Funções `security definer` e grants precisam de revisão de `EXECUTE`, `search_path`, identidade do ator e escopo.
3. Policies administrativas amplas usam `for all` com um papel binário, inferior ao RBAC capability-based do LMS.
4. Rating e conclusão de aula são gravados diretamente pelo cliente e não possuem contrato de evento/idempotência equivalente ao LMS.
5. Parte do progresso agregado é hardcoded.
6. Diagnóstico e regras de atribuição não possuem versionamento metodológico suficiente.
7. Não há testes automatizados encontrados para capacidades críticas.
8. Dependências flutuantes de deploy impedem reprodução determinística.
9. Relatórios e alguns dados administrativos são estáticos ou demonstrativos.

## Revisão do backlog G1–G2

- Cadastro e UTM deixam de ser desenho do zero e passam a `PORT_WITH_ADAPTATION`.
- Diagnóstico multi-eixo deve incorporar o modelo de maturidade como definição versionada desativada até homologação.
- RBAC mantém o schema do LMS; somente fluxos de confirmação e CMS do Impulso são referências.
- Rating, progresso e player passam a ser tarefas de portabilidade comportamental, não criação sem referência.
- Administração mínima deve priorizar usuários, publicação de conteúdo e leitura do estado da vertical, reutilizando os fluxos do Impulso.
- Conteúdo deve ser reconciliado com o pacote oficial para impedir uma quarta versão.

## Critério do gate G0.5

```text
source_files_inventoried = true
generated_artifacts_excluded = true
untrusted_code_executed = false
materialized_secret_found = false
license_found = false
literal_code_copy_authorized = false
capability_comparison_complete = true
roadmap_reconciled = true
```

Resultado: `CONDITIONAL_PASS`.

A única condição pendente específica deste gate é autorização/licença para cópia literal. O trabalho subsequente deve usar comportamento, domínio e UX por `PORT_WITH_ADAPTATION`, sem copiar código ou assets.
