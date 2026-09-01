# Modelo do banco — Plataforma Estímulo

**Revisado em:** 2026-09-01  
**Status:** modelo PostgreSQL executável e reproduzível por migrations  
**Ambiente implementado:** Supabase para desenvolvimento, teste e preview

## Fonte de verdade

`supabase/migrations/` é a fonte física do banco. Este documento explica os padrões vigentes sem duplicar todas as colunas, contagens ou hashes do catálogo, que são verificados por replay e equivalência.

## Schemas

```text
iam             identidade, organizações, papéis e permissões
core            empreendedores, negócios, arquivos e aquisição
catalog         jornadas, atividades, biblioteca e temas
orchestration   matrículas, instâncias e progressão
diagnostics     diagnósticos principal e opcionais
assessment      avaliações, quick checks, entregas e revisões
engagement      pontos, ranking, recompensas, badges e certificados
experience      CMS, configurações e B2B
behavior        eventos comportamentais e score analítico
eventing        eventos, outbox e inbox
integration     estado/mapeamentos de integrações desacopladas
governance      documentos legais, aceites, auditoria e retenção
reporting       projeções analíticas
app_private     helpers internos
public          facades/RPCs autorizadas
```

## Ciclos de vida

### Jornada

A implementação vigente preserva tabelas `catalog.journey_definitions` e `catalog.journey_versions`, mas opera uma relação 1:1 para o produto. A linha física de `journey_versions` é o registro operacional da jornada e alterna entre `draft` e `published`. `version_number=1` e `schema_version='single'` existem como compatibilidade.

- publicação não clona a jornada;
- edição de `published` é permitida pelo comando administrativo controlado;
- despublicação retorna a mesma linha a `draft` e interrompe acessos ativos conforme a migration;
- exclusão de draft faz hard delete apenas quando não há dependências; caso contrário o legado pode ser retirado/retired sem apagar fatos.

### Capacidades versionadas

Diagnósticos, documentos legais, configurações de avaliação/credencial e outras capacidades que precisam reproduzir a regra utilizada continuam usando snapshots/versionamento conforme suas migrations.

## Identidade

`iam.user_accounts`, `core.entrepreneurs`, `core.businesses` e memberships permanecem separados. IDs externos não são PKs internas. Administração resolve identidade autenticada e membership antes de executar casos de uso privilegiados.

## Diagnóstico

O diagnóstico principal possui definição, versões, dimensões, itens, opções, sessões, respostas, resultados e atribuições. A classificação executa a configuração publicada; a correção de 31/08 garante média de scores e interpretação consistente dos thresholds configurados como limites superiores inclusivos ordenados do menor para o maior. Isso não cria metodologia oficial ausente.

Diagnósticos opcionais não atualizam arquétipo principal nem elegibilidade de jornada.

## Quick checks e avaliação

Respostas de múltipla escolha são validadas como conjunto exato. A correção reutiliza o helper legado já inventariado e preserva a facade pública congelada; não existe RPC pública paralela para esse comportamento.

## Gamificação e privacidade

- pontos e recompensas usam ledgers/idempotência;
- badge awards possuem identidade própria;
- ranking deriva de pontos e mascara e-mail antes de expor a identificação de outro participante;
- certificados preservam emissão/revogação sem apagar o fato.

## Eventos e integração

Estado, evento, outbox e auditoria são persistidos juntos quando fazem parte do mesmo comando. Produtores não conhecem HubSpot ou outro destino. Exportação externa permanece desabilitada por padrão e exige consumidor/reconciliação próprios.

## Segurança

- RLS habilitada nas tabelas aplicáveis;
- RPCs sensíveis usam `SECURITY DEFINER` e `search_path` fechado;
- `public`, `anon` e `authenticated` não recebem execução direta de facades privilegiadas;
- gateway valida sessão, identidade, ator, payload, timeout e allowlist;
- helpers privados não são superfície da Data API.

## Reprodutibilidade

O CI inicia banco vazio, aplica o histórico, valida migrations ativas, compara schema canônico, verifica contratos públicos e contenção de legado e executa regressões transacionais. Baselines legíveis por máquina são alterados somente quando o replay prova a mudança intencional.

Consulte [`DATABASE_ERD.md`](DATABASE_ERD.md), [`DATABASE_CONSTRAINTS_AND_INTEGRITY.md`](DATABASE_CONSTRAINTS_AND_INTEGRITY.md) e [`../../implementation/PUBLIC_RPC_CONTRACTS.md`](../../implementation/PUBLIC_RPC_CONTRACTS.md).