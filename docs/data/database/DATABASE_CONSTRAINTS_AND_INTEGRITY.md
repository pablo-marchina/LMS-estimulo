# Constraints e integridade

**Revisado em:** 2026-09-01

## Princípios

1. Integridade estrutural é aplicada no banco sempre que possível.
2. Regras que cruzam agregados usam comandos transacionais testados.
3. Estado, evento, outbox e auditoria são atômicos quando pertencem à mesma operação.
4. Fatos históricos não são corrigidos por update/delete comum; usam compensação, nova revisão ou processo governado.
5. RLS, grants, idempotência e `search_path` fazem parte da integridade, não apenas da segurança periférica.

## Identidade

- IDs externos nunca substituem UUIDs internos;
- acesso administrativo exige identidade autenticada/vinculada e membership organizacional válida;
- domínio de e-mail sozinho não concede capability;
- actor enviado ao banco deve corresponder à identidade resolvida pelo gateway.

## Jornada

O lifecycle atual é exceção explícita ao antigo padrão de “versão publicada imutável”:

```text
draft <-> published
```

- uma jornada possui um único registro operacional;
- edição de `published` é permitida pelo comando administrativo controlado;
- publicação/despublicação não cria clone;
- despublicação encerra matrículas/instâncias ativas conforme o contrato executável;
- draft só é removido fisicamente quando não há dependências; fatos históricos não são apagados.

Nomes físicos `journey_version*` permanecem por compatibilidade.

## Capacidades realmente versionadas

Para diagnóstico, documentos legais e outras capacidades que preservam snapshot:

- versão publicada usada por uma execução permanece identificável;
- mudança metodológica/editorial segue o lifecycle específico da capacidade;
- histórico não é reescrito silenciosamente.

Não aplicar a regra de versionamento de uma capacidade automaticamente à jornada.

## Diagnóstico

- respostas/resultados mantêm a versão do instrumento;
- score de dimensão é calculado a partir dos scores configurados das respostas;
- thresholds de perfis configurados são comparados de forma inclusiva e da faixa menor para a maior;
- ausência de metodologia oficial não pode ser suprida por cutoff hardcoded;
- diagnóstico opcional não altera arquétipo principal.

## Quick check

- opção selecionada deve existir;
- `multiple_choice` normaliza e deduplica códigos;
- resposta correta exige igualdade exata entre conjunto selecionado e conjunto configurado como correto;
- ordem de seleção não altera o resultado/idempotência;
- a facade pública congelada não recebe implementação paralela nem grants ao navegador.

## Gamificação

- ledger não duplica lançamento para a mesma chave idempotente;
- cancelamentos usam compensação;
- badge award é fato identificável;
- ranking ordena por pontos e mascara identificação pública antes da exposição.

## Eventos e integrações

- `event_id`/idempotency key impedem duplicidade conforme o contrato;
- replay interno não dispara efeitos externos;
- consumidor externo deduplica e reconcilia;
- integração não faz overwrite silencioso de fonte interna.

## Testes obrigatórios

- replay desde banco vazio;
- equivalência canônica;
- contratos públicos e contenção de legado;
- idempotência e autorização negativas;
- lifecycle `draft ↔ published` da jornada;
- diagnóstico e quick-check de borda;
- ranking/privacidade;
- RLS e ausência de execução direta por `anon`/`authenticated` onde proibido.