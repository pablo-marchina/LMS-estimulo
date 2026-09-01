# Arquitetura de fluxos de dados ponta a ponta

**Revisado em:** 2026-09-01  
**Status:** contrato lógico implementado em desenvolvimento, teste e preview; operação AWS pendente

## Princípios

1. estado operacional, ledger, evento e outbox do mesmo fato são confirmados na mesma transação;
2. navegador envia comandos/observações, mas não declara conclusão, nota, pontos ou acesso como fato final;
3. consumidores são idempotentes e replay não repete efeito externo por padrão;
4. PostgreSQL é a fonte operacional; destinos externos são assíncronos/substituíveis;
5. PII/arquivos permanecem em stores protegidos e eventos usam IDs/metadados mínimos;
6. score comportamental é analítico e diagnóstico opcional não altera arquétipo/elegibilidade;
7. lifecycle editorial de **jornada** é `draft ↔ published` sobre o mesmo registro operacional; demais capacidades seguem seu próprio versionamento.

## Fluxo-base

```text
Browser/Admin
→ Route/Server Action/API
→ autenticação + autorização + validação + idempotência
→ RPC/caso de uso transacional
   ├─ estado
   ├─ ledger/histórico quando aplicável
   ├─ evento
   ├─ auditoria
   └─ outbox
→ commit
→ projeções/consumidores
```

## Stores

- identidade: contas, empreendedor, negócio, organizations/memberships;
- catálogo: jornada operacional, trilhas, atividades, biblioteca e temas;
- orquestração: matrícula, instância, etapas e progressão;
- diagnóstico/assessment: instrumentos, respostas, resultados, tentativas e entregas;
- engagement: ledgers, ranking, rewards, badges e certificados;
- eventing: evento, outbox e inbox;
- storage: objetos privados;
- behavior/reporting: análise e projeções;
- governance: legal, aceites e auditoria.

## Fluxos atuais relevantes

### Jornada

```text
draft → salvar/editar → publicar
published → editar ao vivo
published → despublicar → draft
```

A nomenclatura física `journey_version_id` permanece por compatibilidade; não existe migração editorial automática entre snapshots de jornada.

### Diagnóstico

```text
sessão → respostas → média por dimensão → classificação pela configuração publicada
```

Thresholds de perfis são limites superiores inclusivos avaliados do menor para o maior. Isso é semântica de execução, não metodologia oficial inventada.

### Quick check

`multiple_choice` é normalizado no cliente e validado no banco como igualdade exata entre conjunto selecionado e conjunto correto.

### Badge/ranking

Badge award é fato identificável; popup só reage a award novo. Ranking é projeção de pontos e recebe identificação já mascarada.

### Integração externa

```text
transação → evento/outbox → consumidor futuro → destino → checkpoint/reconciliação
```

`ETL_EXPORT_ENABLED=false` é o padrão. HubSpot ou outro destino não aparece no caminho síncrono da escrita de negócio.

## Falhas

Falha antes do commit não produz estado parcial. Falha de consumidor externo mantém outbox/retry/dead-letter sem reexecutar a transação de domínio. Replay de projeção mantém efeitos externos bloqueados.

## Fonte de verdade

- schema/transações: `supabase/migrations/`;
- outbox: [`../architecture/TRANSACTIONAL_OUTBOX.md`](../architecture/TRANSACTIONAL_OUTBOX.md);
- contratos atuais: [`../implementation/CURRENT_PLATFORM_BEHAVIOR.md`](../implementation/CURRENT_PLATFORM_BEHAVIOR.md).