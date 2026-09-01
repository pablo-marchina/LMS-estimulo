# Modelo do banco — Plataforma Estímulo

## Fonte de verdade

`supabase/migrations/` é a fonte física do banco. Este documento descreve os padrões conceituais sem duplicar todas as colunas, contagens ou hashes do catálogo, que são verificados pelos gates de replay e equivalência.

## Schemas

```text
iam             identidade, organizações, papéis e permissões
core            participantes, negócios, arquivos e aquisição
catalog         jornadas, atividades, biblioteca e temas
orchestration   matrículas, instâncias e progressão
diagnostics     diagnósticos principal e opcionais
assessment      avaliações, quick checks, entregas e revisões
engagement      pontos, ranking, recompensas, badges e certificados
experience      CMS, configurações e B2B
behavior        eventos comportamentais e score analítico
eventing        eventos, outbox e inbox
integration     estado e mapeamentos de integrações desacopladas
governance      documentos legais, aceites, auditoria e retenção
reporting       projeções analíticas
app_private     helpers internos
public          facades/RPCs autorizadas
```

## Jornada

O schema preserva `catalog.journey_definitions` e `catalog.journey_versions` por compatibilidade física, mas o produto opera uma relação 1:1. A linha operacional da jornada alterna entre `draft` e `published`; `version_number=1` e `schema_version='single'` não representam snapshots editoriais navegáveis.

- publicação não clona a jornada;
- edição de `published` passa pelo comando administrativo autorizado;
- despublicação retorna o mesmo registro a `draft`;
- exclusão respeita dependências e nunca apaga fatos históricos por conveniência editorial.

## Capacidades versionadas

Diagnósticos, documentos legais, instrumentos de avaliação, regras de credencial e outras capacidades que precisam reproduzir a regra usada por uma execução mantêm definição/versão conforme seus contratos próprios.

## Identidade

`iam.user_accounts`, `core.entrepreneurs`, `core.businesses` e memberships são entidades separadas. IDs externos não substituem PKs internas. Operações privilegiadas resolvem identidade, organização e autorização antes da mutação.

## Diagnóstico

O diagnóstico principal possui definição, versões, dimensões, itens, opções, sessões, respostas, resultados e atribuições.

- score de dimensão deriva da média dos scores aplicáveis definidos pelo instrumento;
- thresholds de perfil configurados como limites superiores inclusivos são avaliados do menor para o maior;
- o runtime executa a configuração publicada e não cria metodologia oficial ausente;
- diagnósticos opcionais não atualizam automaticamente o arquétipo principal nem a elegibilidade de jornada.

## Quick checks e avaliações

- respostas e tentativas preservam a configuração aplicável;
- `multiple_choice` é validado pela igualdade exata entre o conjunto selecionado e o conjunto correto, independentemente da ordem;
- compatibilidade legada permanece contida pelas facades/helpers já governados, sem criar superfície pública paralela desnecessária.

## Gamificação e privacidade

- pontos e recompensas usam ledgers/idempotência;
- badge awards possuem identidade própria;
- ranking deriva de fatos de pontuação e protege a identificação dos demais participantes;
- certificados preservam emissão, validade e revogação sem apagar o fato histórico.

## Eventos e integrações

Quando fazem parte do mesmo comando, estado, evento, outbox e auditoria são persistidos de forma consistente. Produtores não conhecem o destino externo. Exportação usa consumidor assíncrono, idempotência e reconciliação.

## Segurança

- RLS é habilitada nas tabelas aplicáveis;
- RPCs sensíveis usam `SECURITY DEFINER` e `search_path` fechado conforme o contrato;
- facades privilegiadas não são concedidas diretamente às browser roles;
- gateways validam sessão, identidade, ator, payload e allowlist;
- helpers privados não são superfície pública da aplicação.

## Reprodutibilidade

O CI reconstrói um banco vazio, aplica o histórico, valida migrations, compara schema canônico e verifica contratos públicos e contenção de legado. Baselines legíveis por máquina só mudam quando o replay comprova uma alteração executável intencional.

Consulte [`DATABASE_ERD.md`](DATABASE_ERD.md), [`DATABASE_CONSTRAINTS_AND_INTEGRITY.md`](DATABASE_CONSTRAINTS_AND_INTEGRITY.md) e [`../../implementation/PUBLIC_RPC_CONTRACTS.md`](../../implementation/PUBLIC_RPC_CONTRACTS.md).