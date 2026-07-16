# ADR-003 — HubSpot para engajamento e dados úteis a cálculos

**Status:** aprovado e refinado  
**Data original:** 2026-07-10  
**Última revisão:** 2026-07-16  
**Escopo:** plataforma LMS e integrações da Estímulo

## Autoridade

Esta decisão implementa `premissas-desenvolvimento.md`, [SOURCE_AUTHORITY_HIERARCHY.md](../product/SOURCE_AUTHORITY_HIERARCHY.md) e a atualização aprovada em 2026-07-16.

## Contexto

A plataforma precisa registrar interações detalhadas, operar com consistência transacional e disponibilizar no HubSpot sinais úteis à operação e aos cálculos futuros.

Transformar o HubSpot no repositório integral do LMS criaria acoplamento, custo, volume e riscos de privacidade desnecessários. Armazenar somente dados agregados sem regra clara poderia, por outro lado, eliminar sinais relevantes de engajamento ou cálculo.

## Decisão

### 1. Papel do HubSpot

O HubSpot recebe somente:

1. **identificadores mínimos de vínculo**, necessários para associar o registro ao contato, empresa ou operação corretos;
2. **informações de engajamento do usuário na plataforma**;
3. **informações que possam ajudar em cálculos aprovados**, incluindo entradas, features e resultados de diagnóstico, classificação, personalização, análise ou pesquisa.

O HubSpot não é:

- banco transacional das aulas;
- event store integral;
- repositório de conteúdo editorial;
- storage de arquivos;
- sistema de logs técnicos;
- destino automático de todo campo existente no LMS.

### 2. Papel do PostgreSQL

O PostgreSQL é a fonte operacional e detalhada para:

- definições e versões;
- matrículas, sessões e estado;
- respostas e tentativas completas;
- comentários e submissões;
- eventos granulares;
- outbox, inbox e idempotência;
- auditoria e reconciliação;
- arquivos e metadados operacionais;
- cálculo e histórico reproduzível.

### 3. Classificação da sincronização

Cada campo, evento ou feature deve ser classificado como:

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

A matriz deve declarar:

```text
source
classification
business_purpose
calculation_or_engagement_use
hubspot_destination
transformation
aggregation
sync_frequency
sensitivity
retention
reconciliation_rule
```

### 4. Dados de engajamento

Podem ser sincronizados, conforme finalidade e granularidade aprovadas:

- primeiro e último acesso;
- frequência, recorrência e retorno;
- início, progresso e conclusão;
- consumo de conteúdo e retomada;
- participação, comentários e avaliações de utilidade;
- tentativas, aprovação e resultados agregados;
- práticas e uploads por status, sem binário;
- pontos, conquistas, recompensas, selos e certificados;
- abandono e sequência de marcos;
- recomendações e ativações recebidas.

O corpo integral de comentários, respostas abertas ou arquivos só será sincronizado quando houver finalidade específica e aprovação de privacidade.

### 5. Dados úteis para cálculo

Podem ser sincronizados quando forem necessários a um cálculo aprovado e versionado:

- respostas selecionadas do diagnóstico;
- escores por dimensão;
- arquétipo e maturidade;
- confiança, corte ou motivo de abstenção quando metodologicamente válidos;
- variáveis contextuais autorizadas;
- features derivadas de engajamento;
- resultado de classificação ou personalização;
- desfechos usados em avaliação ou pesquisa.

“Pode ajudar no cálculo” não autoriza sincronização indiscriminada. Cada variável precisa de finalidade, versão, origem, qualidade e governança.

### 6. Dados não sincronizados por padrão

- configurações editoriais completas;
- conteúdos, questões e alternativas como catálogo;
- payloads brutos sem utilidade aprovada;
- logs técnicos, traces, filas e retries;
- segredos e tokens;
- arquivos binários e URLs assinadas;
- dados temporários de processamento;
- informação duplicada sem necessidade operacional ou analítica.

### 7. Sincronização

```text
transação no LMS
→ estado + evento + outbox
→ transformação conforme matriz
→ escrita idempotente no HubSpot
→ receipt
→ retry ou reconciliação
```

Readback é obrigatório quando a próxima ação depende da confirmação do CRM, como resolução de identidade, associação com empresa/crédito ou escrita crítica usada imediatamente.

### 8. Identidade

Dados CRM de identidade podem existir no HubSpot independentemente do LMS. A integração do LMS usa somente identificadores mínimos para localizar e associar os sinais ao registro correto.

Deduplicação não deve depender apenas de e-mail e precisa de regras aprovadas para CPF, CNPJ, telefone, IDs internos e conflitos.

### 9. Privacidade e crédito

- dados sincronizados possuem finalidade, acesso e retenção;
- dados sensíveis usam granularidade mínima necessária;
- uso em cálculo deve ser explicável e versionado;
- sinais educacionais ou comportamentais não podem decidir crédito sem validação metodológica, análise de vieses, revisão humana e aprovação institucional.

## Consequências

### Positivas

- mantém o HubSpot útil para relacionamento e análise;
- reduz volume e duplicação desnecessários;
- preserva detalhe e reprodutibilidade no PostgreSQL;
- permite evolução de cálculos sem transformar o CRM em banco operacional;
- melhora governança e minimização.

### Riscos

- perda de detalhe se agregações forem mal definidas;
- sincronização de variáveis sem finalidade clara;
- divergência entre PostgreSQL e HubSpot;
- uso indevido de sinais em crédito.

Esses riscos exigem matriz, testes, reconciliação e governança.

## Gates obrigatórios

```text
hubspot_inventory_complete = true
hubspot_license_and_limits_verified = true
hubspot_sync_matrix_approved = true
identity_linking_rules_approved = true
hubspot_real_adapter_implemented = true
engagement_signals_mapped = true
calculation_variables_mapped = true
not_synced_categories_documented = true
idempotency_retry_rate_limit_tested = true
reconciliation_tested = true
critical_readback_tested = true
outage_backlog_recovery_tested = true
credit_decision_from_unvalidated_signal = false
raw_secrets_or_binaries_sent = false
```

## Relação com decisões anteriores

Esta revisão preserva PostgreSQL, outbox e sincronização assíncrona, mas substitui a interpretação de que todos os dados do LMS deveriam ser representados no HubSpot.
