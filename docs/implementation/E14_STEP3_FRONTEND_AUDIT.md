# E14 — Passo 3 — auditoria do frontend e dos dados fixos

**Data:** 2026-07-09  
**Status:** DONE — auditoria concluída; integração ainda não iniciada

## 1. Fontes analisadas

A auditoria comparou três fontes:

1. repositório privado `pablo-marchina/LMS-estimulo`, que permanece como fonte operacional;
2. fundação pública Next.js `denilsontorres2024/plataforma-estimulo`, commit `385faa2a0ec13e0a64a506091e5635c492c03b47`;
3. protótipo Dash Empreendedor no Lovable.

A fundação pública possui uma aplicação Next.js real, mas foi criada como demonstração inicial e não está integrada ao domínio privado.

## 2. Decisão de integração

A aplicação será incorporada ao repositório privado como:

```text
apps/web
```

O repositório privado passará a operar como monorepo. A fundação pública será usada somente como fonte seletiva de interface.

Não serão incorporados como verdade de produção:

- `database/schema.sql` e `database/seed.sql` da fundação;
- jornada OpenAI hardcoded;
- progresso calculado localmente;
- pontos, selos e certificados definidos em arquivos TypeScript;
- relatórios e entregas de exemplo;
- escrita direta do navegador em tabelas de domínio.

## 3. Inventário de rotas

Foram identificadas 24 rotas reais e cinco atalhos administrativos que apontam apenas para âncoras visuais.

### Marketing

| Rota | Classificação | Motivo |
|---|---|---|
| `/` | REFACTOR | Estrutura visual reaproveitável, mas contém afirmações editoriais e de publicação ainda não aprovadas. |

### Autenticação

| Rota | Classificação | Motivo |
|---|---|---|
| `/login` | REFACTOR | Formulário pode ser reaproveitado; falta mapear identidade interna e redirecionar por permissão. |
| `/cadastro` | REMOVE_FROM_RUNTIME | A vertical técnica usa matrícula controlada e identidades sintéticas, não cadastro público. |
| `/recuperar-senha` | REFACTOR | Fluxo Supabase pode ser mantido com mensagens e redirecionamentos revisados. |
| `/alterar-senha` | REFACTOR | Fluxo pode ser mantido após proteção da sessão de recuperação. |

### Participante

| Rota | Classificação | Destino |
|---|---|---|
| `/dashboard` | REFACTOR | Estado real da jornada e próxima ação. |
| `/jornada` | REPLACE | Deve consumir instância, caminho e etapas versionadas. |
| `/player/[lessonId]` | REPLACE | Deve usar `journey_instance_id` e `step_instance_id`, não ID de aula local. |
| `/cursos` | REPLACE | Deve representar catálogo multi-jornada, não um curso fixo. |
| `/pontuacao` | REFACTOR | Exibir ledger e regras aprovadas; retirar valores locais. |
| `/perfil` | REFACTOR | Carregar identidade real e persistir por comando próprio. |
| `/biblioteca` | REMOVE_FROM_RUNTIME | Fora da primeira vertical. |
| `/certificados` | REMOVE_FROM_RUNTIME | Certificados completos estão fora da primeira vertical. |
| `/configuracoes` | REMOVE_FROM_RUNTIME | Não necessária para provar o fluxo inicial. |
| `/conquistas` | REMOVE_FROM_RUNTIME | Selos e conquistas reais ainda não estão aprovados. |
| `/downloads` | REMOVE_FROM_RUNTIME | A atividade técnica não depende de arquivos. |
| `/entregas` | REMOVE_FROM_RUNTIME | Upload de participante está explicitamente fora do escopo imediato. |
| `/notificacoes` | REMOVE_FROM_RUNTIME | Não necessária para a prova inicial. |
| `/prompt-library` | REMOVE_FROM_RUNTIME | Conteúdo OpenAI e biblioteca editorial ainda estão bloqueados. |

### Administração

| Rota | Classificação | Destino |
|---|---|---|
| `/admin` | REFACTOR | Resumo operacional real, sem métricas locais. |
| `/admin/cursos` | REPLACE | Tornar-se administração de jornadas e versões. |
| `/admin/aulas` | REPLACE | Tornar-se administração de atividades versionadas. |
| `/admin/relatorios` | REPLACE | Tornar-se consulta de resultados e evidências. |
| `/admin/entregas` | REMOVE_FROM_RUNTIME | Fora da vertical técnica. |

Os atalhos `avaliacoes`, `usuarios`, `certificados`, `logs` e `configuracoes` no menu administrativo não são rotas funcionais; apontam para seções ou âncoras demonstrativas.

## 4. Componentes e módulos

### KEEP

Podem ser copiados após revisão visual e de acessibilidade:

- `Button`;
- `Card`;
- `Badge`;
- `Input`;
- `Progress`;
- `StatusPill`;
- `MotionCard`;
- logo e tokens visuais autorizados;
- configuração TypeScript, Tailwind e PostCSS.

### REFACTOR

- `StudentShell`: navegação deve depender das capacidades disponíveis e da matrícula.
- `AdminShell`: menu deve depender das permissões da organização.
- `MarketingNav`: retirar links e afirmações não disponíveis.
- `DashboardOverview`: substituir todos os valores locais por uma query de estado.
- `LessonPlayer`: transformar em renderer genérico de atividade.
- `AuthCard`: manter apresentação, mas padronizar erros e acessibilidade.
- factories Supabase browser/server: manter apenas como infraestrutura de autenticação e chamadas de API.
- proxy de sessão: adicionar proteção de rotas e separação participante/operador.

### REPLACE

- `modules/journey/journey-data.ts`;
- `modules/journey/progress.ts`;
- `modules/gamification/rules.ts`;
- `modules/courses/admin-data.ts`;
- `modules/courses/submissions.ts`;
- `types/domain.ts`;
- schema e seed locais da fundação.

Esses elementos devem ser substituídos por contratos gerados ou escritos a partir do domínio privado.

## 5. Dados fixos encontrados

Os principais dados demonstrativos estão em dez pontos:

1. curso OpenAI marcado como publicado em `journey-data.ts`;
2. vídeos e thumbnails vazios com aulas apresentadas como existentes;
3. progresso por índice de bloco em `progress.ts`;
4. regras de pontos, selos e certificados em `gamification/rules.ts`;
5. curso, professor, progresso e relatórios em `admin-data.ts`;
6. participantes e entregas fictícias em `submissions.ts`;
7. nome “Denilson”, 143 pontos e 2/5 selos no dashboard;
8. progresso fixo de 62% no player;
9. nome e e-mail fixos no perfil;
10. contadores administrativos fixos no painel.

Todos devem ser removidos do runtime antes da integração.

## 6. Problemas de autenticação e autorização

### P0 — rotas sem proteção

Os layouts de participante e administrador apenas renderizam shells. Eles não verificam sessão, matrícula, organização ou permissão.

### P0 — proxy sem fronteira de acesso

O proxy renova claims do Supabase, mas não bloqueia rotas privadas nem diferencia participante de operador.

### P0 — login sem contexto interno

Após autenticação, qualquer conta é enviada para `/dashboard`. Não há prova de mapeamento para `iam.user_accounts`, `core.entrepreneurs` ou permissões administrativas.

### P0 — cadastro público incompatível

A fundação permite `signUp` público. A vertical inicial requer participante sintético criado e matriculado de forma controlada.

### P1 — fallback incorreto

`getLessonById` retorna a primeira aula quando o ID não existe. O comportamento correto é `404` sem revelar outro conteúdo.

## 7. Problemas de integração de dados

A fundação pública não implementa o command layer do Passo 2. As telas críticas leem arrays locais e os botões não produzem efeitos persistidos.

O schema público também é incompatível porque:

- usa tabelas simples no schema `public`;
- não representa organizações, versões imutáveis, instâncias e decisões causais como o domínio privado;
- concede ao participante escrita direta em progresso, tentativas e respostas;
- não grava estado, evento e outbox na mesma transação.

O schema e o seed públicos não serão migrados.

## 8. Análise do Lovable

O Dash Empreendedor é útil como referência para linguagem e navegação entre Perfil, Trilhas, Progresso e Engajamento.

No estado observado:

- score, módulos concluídos e pontos aparecem vazios;
- arquétipo depende de um diagnóstico externo;
- não há evidência de persistência ou autorização;
- não há prova de integração com o domínio privado.

As ideias de navegação podem ser consideradas, mas score e arquétipo não entram na primeira vertical.

## 9. Superfícies mínimas da primeira vertical

### Participante

- login;
- estado atual da jornada;
- diagnóstico;
- explicação do caminho atribuído;
- atividade textual;
- confirmação das quatro seções;
- quick check e feedback;
- conclusão, progresso e pontos técnicos.

### Operador

- status de publicação da versão;
- criação de matrícula;
- consulta do participante;
- resultado com diagnóstico, caminho, avaliação, progresso, pontos e eventos.

## 10. Mapa de migração

1. criar `apps/web` no repositório privado;
2. copiar configurações e componentes aprovados da fundação pública;
3. não copiar `database/`, seeds ou módulos de dados fixos;
4. criar uma camada de cliente para os contratos do Passo 2;
5. implementar guards de participante e operador;
6. adaptar as rotas mínimas da vertical;
7. adicionar estados de loading, vazio, erro, conflito e repetição idempotente;
8. somente depois integrar os comandos reais do Passo 4.

## 11. Resultado

O Passo 3 está concluído como auditoria e mapa de integração.

A aplicação pública não será adotada integralmente nem descartada. A decisão é reaproveitar sua camada visual e reconstruir sua camada de dados, autenticação, autorização e domínio dentro de `apps/web` no repositório privado.
