# Registro de schemas e contratos

**Versão:** 0.1

## 1. Organização proposta

```text
contracts/events/
├── envelope/1.0.0.json
├── learning/activity-completed/1.0.0.json
├── diagnostic/response-recorded/1.0.0.json
├── examples/
└── catalog.yaml
```

Nesta fase, os contratos ficam em `docs/events/`; durante a implementação serão movidos para um pacote versionado consumido por backend, testes e ferramentas.

## 2. Regras de publicação

Um evento só pode ser produzido em produção se possuir:

- tipo no catálogo;
- proprietário lógico;
- schema JSON;
- exemplo válido;
- classificação de privacidade;
- política de retenção;
- consumidores declarados;
- estratégia de idempotência;
- compatibilidade testada;
- observabilidade definida.

## 3. Validação em CI

- validar JSON/YAML sintaticamente;
- validar cada exemplo contra envelope e payload;
- impedir duplicidade de `type`;
- verificar URI e SemVer;
- verificar campos obrigatórios do catálogo;
- detectar quebra de compatibilidade;
- gerar documentação a partir do catálogo;
- bloquear evento não catalogado no código.

## 4. Produtor e consumidor

O produtor valida antes de persistir. O dispatcher valida novamente apenas como proteção operacional. Consumidores não devem reinterpretar payload inválido; devem encaminhá-lo a quarentena e alertar.

## 5. Mapeamento opcional para xAPI

Para exportação futura:

| Estímulo | xAPI aproximado |
|---|---|
| `actor.entrepreneur_id` | Actor Account pseudônimo |
| `type` | Verb IRI mapeado |
| `subject`/recurso | Object Activity IRI |
| `data.result` | Result |
| `data.context` | Context |
| `time` | timestamp |

O mapeamento será uma projeção. O schema interno não será limitado pelo xAPI.

## 6. Artefatos já criados

- `event-catalog-v0.1.yaml`;
- `schemas/event-envelope-v1.schema.json`;
- schemas de exemplo de atividade e diagnóstico;
- exemplos JSON correspondentes.
