# E14-R1 — Lacuna de fonte de verdade do runtime

**Versão:** 0.1  
**Data:** 2026-07-09  
**Status:** P0 — bloqueia novas migrations funcionais  
**Ambiente inspecionado:** Supabase de desenvolvimento/teste `cfpfeavjlgheqqiaqtzv`

## 1. Resumo executivo

O backend E14 comprovado no Supabase de teste não está integralmente reproduzível a partir do Git.

A inspeção read-only de `supabase_migrations.schema_migrations` encontrou:

| Grupo | Quantidade de versões | Intervalo | SQL armazenado |
|---|---:|---|---:|
| Runtime M13 | 165 | `20260709051056`–`20260709060330` | 123.636 bytes |
| Transportes/exportações temporárias | 9 | `20260709165813`–`20260709174710` | não canônico |
| Aplicação M14/M14b | 2 | a partir de `20260709183504` | 12.045 bytes |

Os 165 arquivos M13 correspondentes não estão presentes em `supabase/migrations`. O repositório também não contém o SQL canônico consolidado que reconstrói esse runtime em um PostgreSQL vazio.

Isso viola os requisitos de:

- Git como fonte de verdade;
- instalação e replay reproduzíveis;
- manutenção de longo prazo;
- revisão de segurança;
- portabilidade Supabase → AWS;
- recuperação de desastre;
- documentação alinhada ao runtime.

## 2. Divergência M14

O banco registra:

```text
20260709183504_m14_step5_application_read_surfaces
20260709184749_m14b_step5_operator_workspace
```

O Git contém:

```text
20260709183000_m14_step5_application_read_surfaces.sql
20260709184500_m14b_step5_operator_workspace.sql
```

Mesmo que o conteúdo funcional seja equivalente, os identificadores de migration não são iguais. Para a ferramenta de migrations, são versões diferentes.

Consequências:

- o histórico remoto não pode ser reconciliado apenas pelo nome lógico;
- os arquivos locais podem ser interpretados como migrations ainda não aplicadas;
- um replay limpo não representa fielmente o ambiente testado;
- um push futuro pode tentar reaplicar DDL equivalente.

## 3. Complexidade e nomenclatura do runtime

O schema remoto contém dezenas de funções `app_private.e14_*` com nomes opacos, por exemplo:

```text
e14_apply_a
e14_apply_b
e14_exec_c
e14_write_c3
e14_event_i4
e14_q1
e14_q2
```

As funções públicas possuem nomes de caso de uso mais claros, mas dependem de uma cadeia extensa de helpers internos abreviados.

Essa organização foi suficiente para provar a vertical técnica, porém não atende às premissas atuais de manutenção:

- intenção não é identificável pelo nome;
- revisão exige reconstruir chamadas indiretas;
- ownership por contexto não está explícito;
- testes unitários e de contrato ficam acoplados a aliases;
- alterações futuras aumentam risco de regressão;
- a portabilidade para AWS fica mais difícil de auditar.

Nenhuma nova capacidade deve ampliar esse padrão.

## 4. Estado estrutural comprovado

Apesar da lacuna de versionamento, a fundação remota possui controles úteis que devem ser preservados:

- todas as tabelas auditadas possuem RLS;
- versões publicadas de diagnóstico possuem trigger de imutabilidade;
- itens e opções de diagnóstico publicado são protegidos contra mutação;
- respostas são append-only;
- eventos são append-only e passam por redaction/hash;
- eventos preservam versão agregada única;
- outbox impede rota duplicada por evento;
- jobs de integração possuem idempotency key única;
- tentativas de sincronização são append-only;
- sessões possuem proteção contra mais de uma sessão ativa por jornada.

A recuperação da fonte de verdade deve preservar esses controles e não substituí-los por uma implementação paralela.

## 5. Problemas adicionais encontrados

### 5.1 Atribuições de arquétipo não são append-only

`diagnostics.archetype_assignments` possui RLS, FKs e checks de probabilidade, mas o worker autorizado pode executar `UPDATE` e `DELETE`. Não há trigger de imutabilidade, cadeia de supersessão, evento de origem ou vínculo obrigatório à sessão/resultado.

Para atender histórico, recálculo e override, atribuições futuras devem ser append-only. O estado atual deve ser derivado da cadeia de atribuições, não da sobrescrita da linha anterior.

### 5.2 Conteúdo externo possui localização, mas não governança suficiente

`catalog.content_assets` exige exatamente um entre arquivo e URL externa e possui posição única por atividade. Porém, ainda não registra provider, direitos, licença, política de embed, capacidades de tracking, disponibilidade e fallback.

### 5.3 Integração já possui boa fundação

As tabelas de integração já cobrem connections, mappings versionados, objetos externos, jobs, tentativas, conflitos, reconciliação e webhooks. O HubSpot deve reutilizar essa fundação.

## 6. Plano obrigatório de recuperação

### Fase A — Exportação verificável

1. Exportar exatamente os 165 statements M13 armazenados no histórico remoto.
2. Calcular SHA-256 do SQL por versão e do conjunto ordenado.
3. Registrar versão, nome, tamanho e hash em manifest máquina-legível.
4. Exportar M14/M14b diretamente do histórico remoto e comparar com os arquivos Git.
5. Confirmar que os nove artefatos temporários não deixam objetos ativos necessários ao runtime.

### Fase B — Reconciliação de migrations

Usar a estratégia já adotada no repositório:

- um ou mais arquivos canônicos legíveis em `supabase/canonical-migrations` para replay integral;
- arquivos carrier em `supabase/migrations` com os **timestamps remotos exatos**;
- carriers intermediários podem ser no-op quando o efeito estiver consolidado em um arquivo canônico anterior;
- o replay em banco vazio deve produzir o mesmo schema final;
- os arquivos M14 com timestamps locais divergentes devem ser substituídos pelos identificadores remotos exatos, preservando conteúdo e histórico.

Não alterar ou apagar o histórico remoto para fazê-lo coincidir artificialmente com o Git.

### Fase C — Prova de equivalência

Executar em PostgreSQL limpo:

1. todas as migrations locais;
2. inventário de tabelas, colunas, constraints, índices, triggers, policies e funções;
3. comparação automática com o Supabase de teste;
4. testes de contrato dos RPCs públicos;
5. E2E backend da vertical;
6. checks negativos de RLS, idempotência e concorrência;
7. export de evidência sem segredos.

Gate:

```text
remote_versions_missing_locally = 0
local_versions_not_expected_remotely = 0
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
```

### Fase D — Refatoração sem big bang

Depois da equivalência:

1. manter os RPCs públicos estáveis;
2. introduzir helpers internos com nomes semânticos e ownership claro;
3. migrar um caso de uso por vez;
4. testar equivalência de resultado, evento e outbox;
5. verificar dependências com `pg_depend`;
6. remover aliases opacos somente quando não houver chamadas;
7. não combinar a refatoração inteira com a implementação dos quatro arquétipos.

Exemplos de direção:

```text
app_private.diagnostic_start_session
app_private.diagnostic_record_response
app_private.diagnostic_complete_session
app_private.journey_start_instance
app_private.assessment_submit_attempt
app_private.event_append_with_outbox
```

Os nomes finais devem refletir os contextos delimitados existentes e não necessariamente estes exemplos literais.

## 7. Sequência corrigida

```text
E14-R1a: recuperar migrations M13/M14 no Git
→ E14-R1b: provar replay e equivalência
→ E14-R1c: mapear e congelar contratos públicos
→ refatoração incremental de helpers opacos
→ delta final de schema para arquétipos e conteúdo externo
→ nova migration funcional
```

A numeração da próxima migration funcional somente será definida após a reconciliação. Nenhum arquivo deve receber o nome M15 antecipadamente apenas para manter o plano anterior.

## 8. Critérios para desbloquear o desenvolvimento

```text
m13_remote_versions = 165
m13_sql_bytes = 123636
m13_source_in_git = false
m14_version_identifiers_match = false
clean_replay_available = false
runtime_helper_naming_maintainable = false
new_functional_migration_authorized = false
```

O desenvolvimento de frontend e documentação não destrutiva pode continuar. Mudanças de schema e novos comandos de domínio permanecem bloqueados até as fases A–C.