# Delta de schema e autoridade de dados

**Versão:** 1.1  
**Data:** 2026-07-14  
**Status:** fundação reproduzível; deltas funcionais dependem da configuração oficial

## Estado técnico comprovado

```text
recovered_migration_count = 244
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
```

A migration M15a permanece no histórico porque foi aplicada e reconciliada. Ela não cria obrigação de continuar substituindo o legado antes do produto.

## Autoridade operacional

- PostgreSQL é o banco operacional do LMS.
- HubSpot é o User 360 e recebe projeções de dados de negócio relevantes.
- O event store preserva interações granulares e evidências.
- Storage autorizado preserva arquivos e artefatos.

Nenhum desses componentes deve ser transformado em cópia integral dos demais.

## Estruturas existentes que serão reutilizadas

### Produto e jornada

- definições e versões de formulários;
- sessões e respostas;
- jornadas, etapas e matrículas;
- avaliações e tentativas;
- progresso e resultados;
- ledger de pontos;
- eventos e outbox.

### Integração

- connections;
- mapping definitions;
- external object mappings;
- sync jobs e attempts;
- webhook receipts;
- conflicts;
- reconciliation runs.

### Aplicação

- bridge de identidade;
- consultas de participante e operador;
- 18 RPCs públicos preservados durante a compatibilidade.

## Fixtures técnicas

O replay contém fixtures sintéticas:

```text
4 diagnostic items
16 diagnostic options
2 path templates
2 path steps
29 canonical event schema identifiers
```

Elas validam o runtime, mas não são configuração oficial.

## Deltas funcionais realmente necessários

Uma nova migration funcional só deve ser criada quando uma capacidade oficial exigir mudança que não possa ser atendida pelas estruturas existentes.

Prioridades:

1. configuração oficial do diagnóstico e dos quatro arquétipos;
2. Jornada OpenAI e avaliações reais;
3. comentários e moderação básica;
4. uploads ligados a aula/módulo;
5. provas, selos e certificados;
6. resgates mínimos de recompensas;
7. mapeamentos necessários para identidade e HubSpot;
8. adaptações para AWS que não possam ser resolvidas por configuração.

Cada delta deverá demonstrar:

- requisito de origem;
- consumidor real;
- impossibilidade de reutilizar estrutura existente;
- replay limpo;
- preservação dos contratos afetados;
- teste E2E da capacidade.

## HubSpot

O modelo físico HubSpot será composto somente após inventário da conta e aprovação da matriz de projeção.

Não é requisito criar no CRM objetos para cada formulário, questão, resposta, jornada ou evento.

O fluxo padrão é:

```text
transação no LMS
→ evento/outbox
→ projeção para HubSpot
→ retry e reconciliação
```

Readback é reservado para escritas CRM críticas.

## Legado

O legado está inventariado e contido:

```text
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
new_opaque_database_helpers_allowed = false
```

Não haverá cutover em massa. Alterações ocorrerão somente quando um componente bloquear requisito, AWS, segurança ou manutenção necessária.

## Gates

```text
product_configuration_approved = false
openai_journey_configuration_loaded = false
lms_must_haves_complete = false
hubspot_inventory_complete = false
hubspot_projection_matrix_approved = false
hubspot_real_adapter_implemented = false
aws_staging_validated = false
legacy_replacement_required_for_release = false
new_functional_migration_authorized = false
```

`new_functional_migration_authorized` pode se tornar `true` para uma capacidade oficial após revisão do delta específico; não depende da substituição integral do legado nem da modelagem completa do HubSpot.