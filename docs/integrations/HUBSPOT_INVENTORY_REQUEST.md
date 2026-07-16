# Solicitação de inventário do HubSpot

**Versão:** 1.1  
**Data:** 2026-07-16  
**Status:** P0 para adapter real e usuários reais

## Objetivo

Obter as informações necessárias para sincronizar, a partir do LMS:

- identificadores mínimos de vínculo;
- dados de engajamento;
- dados úteis para cálculos aprovados.

O inventário não deve transformar o HubSpot no repositório integral do LMS.

Não enviar tokens, segredos, cookies, senhas ou exportações de dados pessoais reais por documentos, issues ou chat.

## Conta e acesso

- portal ID;
- sandbox ou test account;
- hubs, tiers e add-ons;
- custom objects disponíveis;
- custom behavioral events disponíveis;
- limites de propriedades, objetos, eventos e armazenamento;
- modelo de autenticação;
- scopes concedíveis;
- responsável administrativo;
- limites diários, por segundo e de batch.

## Objetos e identificadores

- contatos;
- empresas;
- deals ou objetos de crédito;
- objetos de capacitação existentes;
- objetos personalizados;
- IDs externos;
- regras de CPF, CNPJ, e-mail e telefone;
- deduplicação e merge;
- associações contato–empresa–crédito;
- identificadores das bases externas.

A integração do LMS deve usar somente os identificadores necessários para localizar e associar corretamente os sinais.

## Workflows e operação

- workflows que leem ou escrevem campos relevantes;
- listas e segmentos;
- pipelines e etapas;
- integrações existentes;
- SLAs operacionais;
- convenção de nomes;
- aprovação de novas propriedades ou objetos;
- processo de correção de duplicidades;
- política de arquivamento e exclusão.

## APIs e eventos

- endpoints de objetos, search e batch;
- webhooks;
- custom behavioral events;
- timeline ou engagements;
- headers e limites de rate limit;
- consistência eventual;
- suporte a idempotência;
- retenção de eventos;
- mecanismos de replay.

## Matriz de sincronização

Cada campo ou evento deve receber uma classificação:

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

### Identificadores mínimos

| Dado | Finalidade | Destino | Regra de uso |
|---|---|---|---|
| ID interno | vínculo | a definir | obrigatório para rastreabilidade |
| ID contato HubSpot | vínculo | contato | obrigatório quando resolvido |
| ID empresa | vínculo | associação | somente quando necessário |
| ID operação de crédito | vínculo/contexto | associação | somente quando autorizado |

### Engajamento

| Categoria | Exemplos | Frequência possível | Granularidade a definir |
|---|---|---|---|
| acesso | primeiro/último acesso, frequência | evento ou agregado | diária/semanal/evento |
| progresso | início, percentual, conclusão | evento ou marco | atividade/trilha/jornada |
| participação | comentário, avaliação de utilidade | evento | metadado ou conteúdo aprovado |
| avaliação | tentativa, aprovação, resultado | evento ou agregado | avaliação/versão |
| prática | envio, scan, revisão | alteração de estado | sem binário |
| gamificação | pontos, conquistas, recompensas | evento ou saldo | ledger/agregado |
| credenciais | selo, certificado, revogação | evento | credencial/versão |
| retenção | abandono, retorno, recorrência | agregado | janela temporal |

### Dados úteis para cálculo

| Categoria | Exemplos | Condição de sincronização |
|---|---|---|
| diagnóstico | respostas selecionadas, dimensões, resultado | necessário ao cálculo aprovado |
| perfil derivado | arquétipo, maturidade, confiança | metodologia versionada |
| features | frequência, consistência, conclusão | definição e versão aprovadas |
| contexto | momento autorizado, segmento | finalidade documentada |
| resultado | classificação, recomendação, ativação | rastreabilidade e explicação |
| pesquisa | variáveis e desfechos | protocolo e governança aprovados |

### Não sincronizados

- configuração editorial completa;
- conteúdo integral;
- catálogo de questões e alternativas;
- respostas abertas sem finalidade específica;
- arquivos binários e URLs assinadas;
- logs, traces, filas e retries;
- segredos e tokens;
- dados temporários sem uso de engajamento ou cálculo.

## Privacidade e acesso

Obter:

- times e perfis com acesso;
- campos sensíveis;
- mecanismos de ocultação;
- exportação e direitos do titular;
- retenção e exclusão;
- logs de acesso;
- restrições para uso em crédito;
- regiões e subprocessadores.

## Reconciliação

Definir consultas para detectar:

- contato ou associação ausente;
- sinal elegível não entregue;
- feature ou resultado desatualizado;
- duplicidade;
- hash divergente;
- categoria sem decisão de sincronização;
- backlog acima do limite;
- erro permanente.

## Critério de conclusão

```text
hubspot_account_metadata_received = true
hubspot_sandbox_available = true
license_and_feature_limits_recorded = true
identity_linking_defined = true
engagement_catalog_approved = true
calculation_variable_catalog_approved = true
not_synced_catalog_approved = true
hubspot_sync_matrix_approved = true
required_scopes_approved = true
api_and_batch_limits_recorded = true
webhook_strategy_defined = true
privacy_and_access_rules_recorded = true
reconciliation_queries_defined = true
```
