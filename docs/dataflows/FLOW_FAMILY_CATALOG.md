# Catálogo de fluxos por família

**Revisado em:** 2026-09-01  
**Status:** visão operacional vigente

## Identidade e acesso

```text
cadastro/login
→ provider Auth
→ identidade interna
→ participante OU contexto administrativo
```

Administração usa entrada Google separada, `getUser()` validado, identidade Google, vínculo interno, membership Estímulo e RBAC. Domínio do e-mail sozinho não é autorização.

## Legal

```text
versão publicada do documento
→ apresentação obrigatória quando aplicável
→ aceite explícito
→ registro da versão/data/origem
```

Legal continua versionado; isso não implica versionamento editorial de jornada.

## Jornada

```text
criar draft
→ editar estrutura/conteúdo
→ validar
→ publicar o mesmo registro
→ operar matrículas
→ editar published ao vivo OU despublicar para draft
```

Não há clone editorial/nova versão de jornada a cada publicação. Nomes físicos legados são compatibilidade.

## Diagnóstico

```text
start
→ respostas
→ cálculo por dimensão
→ classificação configurada
→ resultado/atribuição
```

O principal pode atribuir um dos quatro perfis configurados. Opcionais nunca alteram a atribuição principal. Faixas usam thresholds inclusivos em ordem crescente; metodologia ausente não é inventada.

## Conteúdo e progresso

Browser registra observações permitidas; servidor decide conclusão. Início, consumo, quick check, prática e conclusão são fatos distintos.

## Quick checks/avaliações

```text
tentativa
→ resposta(s)
→ validação/correção server-side
→ resultado
→ feedback/progressão conforme regra
```

Para múltipla escolha, conjunto selecionado deve ser exatamente o conjunto correto.

## Práticas e arquivos

Upload passa por autenticação/autorização, validação de tipo/tamanho, objeto privado e submissão. Revisão humana/IA segue configuração e não executa código enviado.

## Gamificação

Pontos usam ledger idempotente. Badge é concedido por award persistido; UI anuncia apenas awards novos. Ranking é derivado de pontos e mascara identificação.

## Eventos/outbox

Operação crítica confirma estado + evento/outbox atomically. Consumidor externo usa retry/deduplicação/checkpoint e não é necessário para confirmar a escrita de domínio.

## Recuperação

- validação/autorização: rejeita sem efeito parcial;
- concorrência: conflito explícito;
- consumidor transitório: backoff/retry;
- permanente: dead-letter/reconciliação;
- replay: efeitos externos desligados por padrão.

O catálogo de eventos e as migrations determinam nomes/estruturas executáveis; este documento não congela contagens transitórias de tipos de evento.