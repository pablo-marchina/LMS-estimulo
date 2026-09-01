# Fundação da aplicação

## Forma do sistema

O repositório é um monorepo npm. A aplicação web é um monólito modular Next.js/React/TypeScript:

- `apps/web/app/`: rotas, layouts e composition roots;
- `apps/web/components/`: UI compartilhada;
- `apps/web/lib/`: domínio de aplicação, modelos, casos de uso e adapters;
- `config/`: contratos e políticas legíveis por máquina;
- `supabase/`: migrations, functions, templates e configuração do provider de desenvolvimento/teste;
- `scripts/`: validação, operação e testes.

`config/module-boundaries.json` protege as dependências entre módulos.

## Persistência

PostgreSQL é a fonte operacional. O schema é reproduzido exclusivamente pelas migrations versionadas. Dados históricos que precisam de auditabilidade usam stores próprios, como tentativas, submissões, ledgers, eventos e auditoria.

## Providers

Supabase fornece Auth, PostgreSQL, Storage e Edge Functions no ambiente autorizado de desenvolvimento, teste e preview. Vercel fornece build e preview web. O domínio permanece desacoplado por ports/adapters para permitir a fronteira institucional definida pela estratégia de cloud.

Integrações externas não participam da transação síncrona do domínio; efeitos de borda são derivados de eventos/outbox.

## Identidade e autorização

Participante e administração têm entradas separadas. A administração exige identidade federada válida, resolução da identidade interna, membership Estímulo e RBAC. A autorização é verificada no servidor e, quando aplicável, reforçada por RLS e grants de banco.

## Catálogo e jornada

Cada jornada é uma entidade operacional única `draft ↔ published`. Nomes físicos legados `journey_version*` existem por compatibilidade de schema e não representam snapshots editoriais navegáveis.

Trilhas, aulas, atividades, avaliações, credenciais e outros subdomínios mantêm seu próprio modelo de histórico quando necessário para reproduzir uma tentativa, regra ou emissão.

## Diagnóstico

O motor de diagnóstico é configurável e versionado. Perguntas, opções, dimensões, perfis, thresholds, sessões, respostas e resultados permanecem auditáveis. O runtime executa apenas a configuração publicada; não cria metodologia, pesos ou cortes ausentes.

## Avaliação e prática

Quick checks, avaliações e entregas passam por validação server-side e mantêm idempotência. Múltipla escolha usa igualdade entre o conjunto selecionado e o conjunto configurado como correto, independentemente da ordem de seleção.

## Gamificação

Pontos derivam de ledger idempotente. Ranking, saldo e demais projeções derivam de fatos persistidos. Badges são awards identificáveis e certificados preservam critérios e evidência de emissão. Identificação exibida a outros participantes deve respeitar minimização e privacidade.

## Segurança

- browser não recebe service role;
- funções privilegiadas validam ator, organização e permissão;
- facades server-only não são concedidas a browser roles;
- arquivos permanecem privados e URLs assinadas são temporárias;
- segredos pertencem ao ambiente;
- logging e eventos aplicam minimização/redaction.

## Reprodutibilidade

O gate da aplicação valida dependências, arquitetura, testes, build, banco, contratos e secret scanning. Baselines de schema ou compatibilidade só mudam com alteração executável comprovada por replay.

Consulte os documentos especializados no [`PROJECT_INDEX.md`](../../PROJECT_INDEX.md).