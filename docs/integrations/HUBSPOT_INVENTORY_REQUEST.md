# Solicitação de inventário completo do HubSpot

**Versão:** 1.0  
**Data:** 2026-07-16  
**Status:** P0 para adapter real e usuários reais

## Objetivo

Obter as informações necessárias para cumprir a premissa de que todos os dados do usuário capturados ou usados possuam representação no HubSpot.

O inventário deve permitir definir:

- identidade única;
- modelo físico;
- eventos comportamentais;
- associações com negócio e crédito;
- volumes e limites;
- segurança;
- sincronização e reconciliação.

Não enviar tokens, segredos, cookies, senhas ou exportações de dados pessoais reais por documentos, issues ou chat.

## Conta e acesso

- portal ID;
- sandbox ou test account;
- hubs, tiers e add-ons contratados;
- disponibilidade de custom objects;
- disponibilidade de custom behavioral events;
- limites de propriedades, objetos, eventos e armazenamento;
- modelo de autenticação aprovado;
- responsável administrativo;
- scopes concedíveis;
- política de criação de app privado ou público;
- limites diários, por segundo e de batch.

## Objetos e identificadores

- contatos;
- empresas;
- negócios/deals;
- tickets;
- objetos usados para crédito;
- objetos usados para capacitação ou relacionamento;
- objetos personalizados existentes;
- IDs externos aceitos;
- regras de CPF, CNPJ, e-mail e telefone;
- regras de deduplicação e merge;
- associações contato–empresa–crédito;
- identificadores das bases externas;
- propriedades já usadas para perfil, segmento, crédito, jornada ou capacitação.

## Workflows e operação

- workflows que leem ou escrevem campos relevantes;
- listas e segmentos ativos;
- pipelines e etapas;
- automações Zapier ou integrações existentes;
- SLAs operacionais;
- responsáveis por dados e CRM;
- convenção de nomes;
- processo de aprovação de propriedades/objetos;
- processo de correção de duplicidades;
- política de arquivamento e exclusão.

## APIs e eventos

- endpoints disponíveis;
- batch endpoints;
- search endpoints;
- webhooks;
- custom behavioral events;
- timeline/engagements;
- import APIs quando aplicável;
- limites e headers de rate limit;
- comportamento de consistência eventual;
- suporte a idempotência externa;
- retenção de eventos;
- mecanismos de replay.

## Matriz completa de dados a aprovar

A integração deve mapear todas as categorias de dados do usuário. A matriz define como representar cada categoria, não se ela será ignorada.

| Categoria | Exemplos | Finalidade | Destino físico | Frequência | Histórico | Sensibilidade |
|---|---|---|---|---|---|---|
| identidade | nome, e-mail, CPF, telefone, CNPJ | identidade única | a definir | criação/alteração | sim | pessoal |
| aquisição | UTM, origem, campanha | relacionamento e análise | a definir | entrada/alteração | sim | operacional |
| negócio | empresa, setor, porte, vínculo | User 360 | a definir | criação/alteração | sim | pessoal/negócio |
| crédito | operação, etapa e contexto autorizado | jornada e personalização | a definir | alteração | sim | elevado |
| diagnóstico | versão, respostas, resultado | personalização e pesquisa | a definir | resposta/conclusão/recálculo | sim | elevado |
| arquétipo e maturidade | atribuição, histórico, override | personalização | a definir | alteração | sim | elevado |
| elegibilidade e recomendação | trilhas visíveis e ativações | experiência | a definir | decisão | sim | comportamental |
| progresso | sessão, atividade, conclusão | acompanhamento | a definir | evento/marco | sim | comportamental |
| avaliações | respostas, tentativas, utilidade | aprendizagem | a definir | submissão | sim | comportamental |
| participação | comentários e interações | engajamento | a definir | evento | sim | pessoal |
| práticas e uploads | envio, consentimento, scan, revisão | evidência | a definir | alteração | sim | elevado |
| gamificação | pontos, conquistas, ranking, recompensas | engajamento | a definir | evento/marco | sim | comportamental |
| credenciais | selos, certificados, revogação | reconhecimento | a definir | emissão/alteração | sim | operacional |
| comunicação | tarefa, mensagem, intervenção | relacionamento | a definir | evento | sim | pessoal |
| eventos comportamentais | ação, sequência, tempo, contexto | dados e pesquisa | a definir | evento/lote | sim | comportamental |

## Eventos de alto volume

Para cada ação do usuário, avaliar:

- custom behavioral event;
- custom object;
- engagement/timeline;
- batch;
- snapshot/agregado;
- referência íntegra ao detalhe recuperável.

A estratégia deve preservar no mínimo:

- ID do usuário;
- tipo da ação;
- timestamp;
- sequência;
- jornada/atividade;
- versão;
- contexto;
- ID do evento de origem.

Qualquer redução de granularidade precisa ser tecnicamente justificada e aprovada.

## Arquivos

Definir como o HubSpot representará:

- tipo do arquivo;
- proprietário;
- atividade/jornada;
- consentimento de uso;
- status de scan;
- status de revisão;
- referência segura;
- retenção.

Não armazenar segredo, URL assinada temporária nem arquivo bloqueado.

## Privacidade e acesso

Obter:

- times e perfis com acesso;
- campos sensíveis;
- mecanismos de ocultação;
- exportação e atendimento ao titular;
- retenção e exclusão;
- logs de acesso;
- regras de uso em workflow;
- restrições de crédito;
- regiões e subprocessadores aplicáveis.

## Reconciliação

Definir consultas e relatórios para detectar:

- contato ausente;
- associação ausente;
- dado desatualizado;
- evento não entregue;
- duplicidade;
- hash divergente;
- categoria sem destino;
- backlog acima do limite;
- erro permanente.

## Critério de conclusão

```text
hubspot_account_metadata_received = true
hubspot_sandbox_available = true
license_and_feature_limits_recorded = true
identity_and_deduplication_defined = true
company_and_credit_associations_defined = true
all_user_data_categories_inventoried = true
complete_user_data_matrix_approved = true
behavioral_event_strategy_approved = true
required_scopes_approved = true
api_and_batch_limits_recorded = true
webhook_strategy_defined = true
privacy_and_access_rules_recorded = true
reconciliation_queries_defined = true
```

Somente depois desse gate o adapter real pode ser considerado corretamente especificado.
