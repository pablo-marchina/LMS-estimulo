# Runbook do release final

**Revisado em:** 2026-09-01  
**Estado:** Gate A executável por SHA; Gate B bloqueado até arquitetura AWS

## Gate A — software

Workflows canônicos:

1. `Repository governance`;
2. `Dependency reproducibility`;
3. `Reproducibility`;
4. `Database gates`;
5. `Web CI`.

Todos precisam estar verdes no mesmo SHA. Captura visual é evidência complementar e, em PR, exige preview deployment do SHA exato.

## Checklist de regressão prioritária

### Autenticação/UI

- `/entrar` não contém atalho de equipe;
- `/entrar/administracao` inicia Google;
- callback usa `getUser()`, reconhece Google no registro do usuário e exige membership Estímulo;
- não depender de `getClaims()`/AMR para identificar provider no callback;
- `/ajuda` mantém header/shell participante;
- botão Entrar possui contraste legível;
- cards de jornada e título/thumbnail de aula abrem o destino sem controles aninhados conflitantes.

### Home/engajamento

- Jornada OpenAI/destaque pode aparecer para usuário elegível novo;
- falha na consulta opcional de elegibilidade não derruba toda a home;
- popup de badge não anuncia histórico como aquisição nova e reage a awards novos;
- ranking mascara e-mail.

### Diagnóstico/quick-check

- score de dimensão usa média dos scores configurados;
- thresholds são limites superiores inclusivos e faixas menores são avaliadas primeiro;
- nenhuma metodologia ausente é hardcoded;
- `multiple_choice` exige conjunto exato e ordem de seleção é irrelevante;
- facade quick-check/grants permanecem conforme contrato congelado.

### Banco

- replay desde zero;
- equivalência canônica;
- contratos públicos + contenção de legado;
- baselines só mudam quando replay prova mudança intencional;
- ranking masking e correções prioritárias passam na suíte SQL.

## Supabase preview

Além do Gate A, para validar o ambiente hospedado:

1. aplicar migrations ausentes;
2. alinhar Edge Functions;
3. executar `verify:supabase`;
4. sincronizar e verificar o template de confirmação com `npm run sync:supabase-confirmation-email`;
5. executar smoke autenticado com dados de teste.

## Captura visual

Para PR, publicar preview GitHub Deployment com `environment_url` para o SHA exato. Sem deployment, não alterar o workflow para apontar a outro SHA apenas para obter verde.

## Gate B — produção AWS

Exige arquitetura/ADRs, staging equivalente, identidade, banco/storage, E2E transacional, isolamento, capacidade, observabilidade, backup/restore/rollback, segurança, privacidade, conteúdo e acessibilidade.

Gate A verde não autoriza usuários reais em produção institucional.