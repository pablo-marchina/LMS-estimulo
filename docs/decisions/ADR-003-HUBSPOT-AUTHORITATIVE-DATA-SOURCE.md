# ADR-003 — HubSpot como User 360 e integração dos dados de negócio

**Status:** Refinada  
**Data original:** 2026-07-10  
**Última revisão:** 2026-07-14  
**Escopo:** plataforma LMS e integrações da Estímulo

## Contexto

Os documentos de referência determinam que o HubSpot concentre as informações relevantes do empreendedor e que os dados coletados e utilizados pelo produto estejam disponíveis para relacionamento, acompanhamento e análise.

A versão anterior deste ADR interpretava essa premissa como obrigação de:

- persistir toda resposta e configuração primeiro no HubSpot;
- executar readback antes de qualquer regra de negócio;
- impedir classificação, progresso ou personalização durante indisponibilidade do CRM;
- tratar o HubSpot como banco operacional do LMS.

Essa interpretação não é exigida pelas referências e criaria latência, indisponibilidade acoplada, consumo desnecessário de API e complexidade de modelagem no CRM.

## Decisão

### 1. Papel do HubSpot

O HubSpot é o **User 360 e sistema autoritativo de relacionamento** para:

- identidade e vínculo do empreendedor com seus negócios;
- informações de negócio usadas pela operação da Estímulo;
- momento relevante da jornada de crédito;
- resultado vigente do diagnóstico e arquétipo;
- matrícula, progresso agregado e conclusão de jornadas;
- selos, certificados e sinais comportamentais aprovados para uso operacional;
- segmentos, tarefas, comunicações e demais ações de relacionamento.

O HubSpot não será utilizado como event store detalhado, repositório de arquivos, banco transacional das aulas ou armazenamento obrigatório de cada clique.

### 2. Papel do banco operacional

O PostgreSQL nos ambientes autorizados é o sistema operacional do LMS para:

- definições e versões de jornadas, conteúdos, formulários e avaliações;
- matrículas, sessões, respostas, progresso e tentativas;
- comentários, uploads e metadados de arquivos;
- ledger de pontos, resgates, selos e certificados;
- eventos granulares, outbox, idempotência e auditoria técnica;
- estado necessário para que o produto continue funcionando com consistência.

Esses dados não substituem o HubSpot como visão integrada do empreendedor. As projeções relevantes são sincronizadas conforme matriz de dados aprovada.

### 3. Sincronização

O fluxo padrão será:

```text
transação no LMS
→ persistência operacional
→ evento e outbox na mesma transação
→ sincronização idempotente com HubSpot
→ confirmação, retry e reconciliação
```

Readback é obrigatório quando a operação depende de confirmação imediata do CRM, por exemplo:

- criação ou associação de identidade CRM;
- alteração de campo crítico usado imediatamente por workflow externo;
- atualização cuja versão precisa ser confirmada antes de uma ação irreversível.

Readback não é obrigatório antes de cada resposta, cálculo de progresso, quick check ou interação da aula.

### 4. Configuração do produto

Formulários, perguntas, opções, arquétipos, políticas, jornadas e regras editoriais são versionados e administrados pela plataforma.

O HubSpot recebe, no mínimo:

- identificador e versão da configuração publicada;
- resultado vigente e histórico necessário para operação;
- principais agregados e sinais aprovados;
- referências que permitam rastrear a origem no LMS.

Não é requisito materializar cada entidade editorial como objeto CRM.

### 5. Eventos e sinais

Interações granulares permanecem no event store. Somente eventos, agregados ou features com finalidade aprovada são projetados no HubSpot.

A matriz de projeção deverá declarar:

```text
fonte
finalidade
campo ou objeto de destino
frequência
sensibilidade
retenção
regra de reconciliação
```

### 6. Indisponibilidade

Quando o HubSpot estiver indisponível:

- o LMS continua operando nas funcionalidades que dependem apenas de seu estado operacional;
- sincronizações permanecem pendentes na outbox;
- funcionalidades que exigem estado CRM mais recente podem usar último snapshot válido ou apresentar estado temporariamente indisponível;
- retries e reconciliação não podem duplicar efeitos.

A indisponibilidade do HubSpot não deve impedir, por padrão, o participante de estudar, responder avaliações ou registrar progresso.

### 7. Crédito

O contexto de crédito pode personalizar a capacitação quando houver integração e finalidade aprovadas.

Nenhum sinal educacional ou arquétipo poderá aprovar, reprovar ou alterar condições de crédito sem validação metodológica e governança específica.

## Consequências

### Positivas

- o CRM continua oferecendo visão integrada do empreendedor;
- o LMS não fica indisponível por dependência síncrona desnecessária;
- eventos detalhados permanecem no armazenamento apropriado;
- a modelagem física no HubSpot fica proporcional à operação real;
- a integração pode evoluir sem reescrever o núcleo do produto.

### Riscos controlados

- pode existir atraso entre uma transação do LMS e sua projeção no HubSpot;
- a reconciliação deve detectar divergências e falhas permanentes;
- cada dado relevante precisa de destino e finalidade explícitos.

## Gates obrigatórios

```text
hubspot_inventory_complete = true
hubspot_field_projection_matrix_approved = true
hubspot_real_adapter_implemented = true
hubspot_idempotency_and_retry_tested = true
hubspot_reconciliation_tested = true
critical_write_readback_tested = true
lms_operates_during_hubspot_outage = true
raw_technical_logs_sent_to_hubspot = false
credit_decision_from_unvalidated_training_signal = false
```

## Relação com decisões anteriores

Este texto preserva a intenção da DEC-054: HubSpot como centro da visão integrada, com decisão explícita de projeção. Ele substitui a interpretação posterior de que todo dado operacional e toda configuração deveriam obrigatoriamente nascer e ser relidos do HubSpot antes de uso.