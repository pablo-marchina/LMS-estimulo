# Modelo do banco — Plataforma Estímulo

**Revisado em:** 2026-07-31  
**Status:** modelo PostgreSQL executável e reproduzível por migrations  
**Ambiente implementado:** Supabase para desenvolvimento, teste e preview

## 1. Organização

O banco é um monólito modular dividido por contexto:

```text
iam             identidade, organizações, papéis e permissões
core            empreendedores, negócios, arquivos e aquisição
catalog         jornadas, atividades, biblioteca, temas e versões
orchestration   inscrições, instâncias, passos e progressão
diagnostics     diagnósticos principal e opcionais
assessment      avaliações, entregas, rubricas e revisões
engagement      pontos, carteira, recompensas, certificados e ledgers
experience      CMS, configurações gerais, páginas B2B e comandos
intervention    intervenções e segmentos
behavior        eventos comportamentais e modelos de score
eventing        eventos, outbox e inbox
integration     mapeamentos e estado de integrações genéricas
governance      documentos legais, aceites, auditoria e retenção
reporting       projeções e superfícies analíticas
app_private     helpers internos não expostos à Data API
public          RPCs autenticadas e fronteiras estáveis
```

A separação é lógica e de segurança; não implica microserviços ou bancos separados.

## 2. Padrões estruturais

### Definição → versão → execução

Jornadas, atividades, conteúdos, diagnósticos, certificados, páginas B2B e regras editoriais usam definição estável, versões em rascunho/publicadas/retiradas e instâncias históricas. Publicar uma versão não reescreve execuções anteriores.

### Ledgers e compensação

Pontos de engajamento e pontos de recompensa são movimentações imutáveis. Correções e cancelamentos criam compensações; o histórico não é sobrescrito.

### Comandos idempotentes

`experience.extension_commands` registra ator, escopo, idempotency key, hash da requisição e resultado. Repetir a mesma chave com payload divergente é recusado.

### Eventos e outbox

A transação de domínio grava estado, evento, outbox e auditoria juntos. Consumidores deduplicam por evento/idempotency key e usam checkpoint próprio.

## 3. Identidade e escopo

- `iam.user_accounts`: conta autenticável;
- `core.entrepreneurs`: pessoa participante;
- `core.businesses`: negócio atendido;
- `core.business_memberships`: relação pessoa–negócio;
- `iam.organizations`: Estímulo e organizações operadoras;
- `iam.organization_memberships`: conta–organização;
- papéis e permissões: RBAC com validade e auditoria.

IDs externos nunca são chaves primárias do domínio. Mapeamentos futuros permanecem na camada de integração.

## 4. Configurações e documentos legais

- `experience.platform_settings`: identidade, contatos, links e rodapé por organização;
- `governance.legal_document_versions`: Termos e Política versionados;
- `governance.legal_acceptances`: versão aceita, usuário, data, origem e metadados.

A unicidade parcial garante no máximo uma versão publicada por tipo e organização.

## 5. Temas, biblioteca e jornadas

- `catalog.themes`: taxonomia administrada;
- `catalog.library_item_theme_links`: relação N:N com conteúdos;
- `catalog.journey_theme_links`: relação N:N com jornadas;
- definições e versões de biblioteca, jornada, curso e atividade preservam publicação e histórico.

A FK com `ON DELETE RESTRICT` impede excluir tema em uso.

## 6. Templates de certificados

- `engagement.certificate_template_assets`: imagem/PDF e metadados do objeto;
- `engagement.certificate_template_assignments`: escopo `global`, `program` ou `journey`, período e estado.

Índice parcial garante uma atribuição ativa por escopo. A resolução segue jornada → programa → global.

## 7. Aquisição e UTM

- `core.tracking_links`: slug, destino, público, UTMs, parâmetros, validade, limite e etapas ignoráveis;
- `core.tracking_visits`: visita, token com hash, sessão, dispositivo, referenciador e associação posterior;
- `core.acquisition_touchpoints`: first touch, last touch, signup e conversion.

O token bruto não é persistido; a associação pós-login usa hash e idempotência.

## 8. B2B

- `experience.b2b_pages` e `b2b_page_versions`: página e conteúdo por blocos;
- `experience.b2b_access_groups` e `b2b_group_members`: grupos administrados;
- `experience.b2b_page_user_access`: concessão direta;
- `experience.b2b_page_group_access`: concessão por grupo.

A leitura participante aplica a autorização no banco antes de devolver a página.

## 9. Recompensas

- `engagement.reward_settings`: taxa de conversão;
- `engagement.reward_wallets`: saldo materializado e bloqueado transacionalmente;
- `engagement.reward_ledger`: origem, débito, crédito e compensação;
- `engagement.rewards`: catálogo, tipo, custo, estoque, período e regulamento;
- `engagement.reward_redemptions`: solicitação, estado, entrega e cancelamento.

Saldo e estoque são alterados na mesma transação. Cancelamento restaura ambos e registra motivo.

## 10. Entregas e IA

- `assessment.delivery_configurations`: alvo biblioteca/atividade, formatos, prazo, tentativas, estratégia e modo de correção;
- `assessment.delivery_submissions`: tentativa e estado;
- `assessment.delivery_submission_files`: evidências em `core.file_objects`;
- rubricas e critérios: pesos, escala, aprovação e referências;
- `assessment.delivery_reviews`: avaliação da IA ou humana, confiança, modelo, versão e feedback.

A entrega original permanece imutável. Reenvios criam nova tentativa. Código e ZIP são apenas analisados estaticamente.

## 11. Diagnósticos

O diagnóstico principal usa definições, versões, dimensões, itens, opções, sessões, respostas, resultados e atribuições de arquétipo. A publicação principal pode mapear perfis antigos para novos e atualizar elegibilidade transacionalmente.

Diagnósticos opcionais acrescentam:

- disponibilidade por público e período;
- sessões e tentativas próprias;
- resultados exibíveis conforme configuração.

Não existe FK ou comando opcional que atualize arquétipo principal ou acesso a jornadas.

## 12. Eventos e score comportamental

- eventos estruturados guardam ID idempotente, versão de schema, usuário, sessão, entidade, horário e propriedades;
- definições de dimensão e modelo são versionadas;
- snapshots de score guardam inputs, hash, cobertura, confiança, dimensões e explicação.

O score permanece em tabelas analíticas e não é referenciado por políticas de acesso, jornadas, recompensas ou navegação.

## 13. Integração e ETL

Produtores não armazenam contratos de um destino específico. A saída é preparada por eventos e outbox com:

- rota lógica;
- schema/versionamento;
- cursor e checkpoint;
- payload hash;
- idempotency key;
- tentativa, retry e dead letter;
- reconciliação.

A exportação externa permanece desligada por padrão.

## 14. Segurança

- RLS e privilégios seguem menor privilégio;
- comandos sensíveis usam RPCs `SECURITY DEFINER` com `search_path` fechado;
- `anon` e `authenticated` não executam diretamente as RPCs administrativas;
- o gateway valida o usuário autenticado e impede `actor` divergente;
- tabelas privadas e helpers internos não são superfícies da Data API;
- arquivos usam objetos opacos e buckets privados;
- auditoria registra alterações administrativas e revisões humanas.

## 15. Reprodutibilidade

`supabase/migrations` é a fonte executável. O CI:

1. inicia PostgreSQL limpo;
2. aplica todo o histórico na ordem;
3. valida fronteira e imutabilidade das migrations;
4. compara o inventário com `REMOTE_SCHEMA_BASELINE.json`;
5. executa contratos públicos e contenção de RPCs legadas;
6. repete a reconstrução no gate de reprodutibilidade.

Contagens transitórias de tabelas, colunas ou funções pertencem aos artefatos de CI e não são congeladas neste documento.

## 16. Limites de produção

O modelo lógico e o runtime Supabase estão implementados para desenvolvimento, teste e preview. Escolha do banco gerenciado AWS, estratégia de backup, DR, storage, filas, workers, observabilidade e capacidade de produção depende de ADR e Gate B.
