# Modelo completo do banco — Plataforma Estímulo

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** baseline lógica e física preliminar — E10  
**Banco de referência:** PostgreSQL compatível; provedor gerenciado e adaptador de autenticação serão decididos no E12.

## 1. Objetivo

Transformar o modelo de domínio, o catálogo de 118 eventos e os fluxos ponta a ponta em uma estrutura relacional capaz de operar uma plataforma SaaS/LMS multi-jornada em produção.

O modelo precisa simultaneamente:

- executar jornadas e conteúdos;
- preservar versões editoriais e históricas;
- registrar fatos comportamentais imutáveis;
- permitir personalização sem arquétipos obrigatórios;
- processar integrações de forma idempotente;
- sustentar gamificação sem confundir recompensa com evidência;
- calcular features e scores experimentais com linhagem;
- aplicar autorização, LGPD, retenção e auditoria;
- acomodar novas jornadas sem novas tabelas específicas.

## 2. Decisão estrutural

O banco será organizado em schemas por contexto delimitado dentro de um monólito modular:

```text
iam
core
catalog
orchestration
diagnostics
assessment
engagement
intervention
eventing
integration
intelligence
governance
reporting
```

Essa separação é lógica e de segurança; não implica bancos ou microserviços diferentes.

## 3. Camadas de dados

```text
Identidade e cadastro
        ↓
Definições/versionamento editorial
        ↓
Execução operacional da jornada
        ↓
Fatos canônicos e ledgers imutáveis
        ↓
Projeções e integrações
        ↓
Features comportamentais
        ↓
Score experimental e validações
```

### 3.1 Estado operacional

Tabelas como `orchestration.journey_instances`, `step_instances`, `assessment.attempts` e `intervention.instances` representam o estado atual e aplicam invariantes de negócio.

### 3.2 Fatos imutáveis

`eventing.events`, `diagnostics.responses`, `engagement.point_ledger`, `governance.consent_records` e `governance.audit_log` preservam história. Correções ocorrem por novos registros, compensação ou supersessão, não por reescrita silenciosa.

### 3.3 Projeções

`progress_projections`, `point_balance_projections` e `streak_projections` existem para leitura eficiente. Elas não são fontes primárias e devem ser reconstruíveis.

### 3.4 Inteligência derivada

Features e scores nunca são gravados no perfil principal. Cada resultado aponta para definição, versão, execução, janela, qualidade, inputs e linhagem.

## 4. Padrão definição–versão–instância

O padrão é aplicado a:

- jornada;
- curso;
- atividade;
- diagnóstico;
- regra;
- segmento;
- avaliação e rubrica;
- regra de pontos;
- selo;
- certificado;
- intervenção;
- feature;
- score;
- mapeamento de integração.

```text
Definição estável
→ versão editável
→ versão publicada e imutável
→ instância de execução ou resultado
```

Participações permanecem associadas à versão publicada recebida. Publicar uma nova versão não altera execuções históricas.

## 5. Identidade e escopo

O modelo separa:

- `iam.user_accounts`: identidade autenticável;
- `core.entrepreneurs`: pessoa atendida;
- `core.businesses`: negócio beneficiário;
- `core.business_memberships`: vínculo pessoa–negócio;
- `iam.organizations`: Estímulo e parceiros operadores;
- `iam.organization_memberships`: vínculo conta–organização.

Nenhum ID do HubSpot ou de crédito é chave primária. IDs externos ficam em `integration.external_object_mappings`.

## 6. Catálogo multi-jornada

A Jornada OpenAI é carregada como dados em:

- `catalog.journey_definitions` e `journey_versions`;
- `orchestration.path_templates`, `path_steps` e `path_transitions`;
- `catalog.course_definitions`, `course_versions`, `modules`;
- `catalog.activity_definitions`, `activity_versions`, `content_assets`;
- tabelas especializadas de avaliação, prática e gamificação.

Uma segunda jornada usa as mesmas tabelas, os mesmos eventos e o mesmo orquestrador.

## 7. Regras e ramificações

Regras não são texto livre. `orchestration.rule_versions` armazena:

- linguagem de regra aprovada;
- expressão estruturada;
- schema de entrada;
- schema de saída;
- hash de conteúdo;
- estado de publicação.

A linguagem concreta será escolhida no E12. Regras publicadas precisam ser determinísticas, testáveis, limitadas e sem execução arbitrária de código.

## 8. Eventos e atomicidade

Para uma ação interna válida, a mesma transação deverá gravar:

1. estado operacional;
2. incremento de `aggregate_version`;
3. evento em `eventing.events`;
4. item em `eventing.outbox`;
5. auditoria mínima quando aplicável.

Consumidores deduplicam por `(consumer_id, event_id)` em `eventing.consumer_inbox`.

## 9. Diagnóstico e personalização

O banco suporta:

- dimensões contínuas;
- prontidão operacional;
- respostas revisáveis com histórico;
- resultados versionados;
- segmentos temporários;
- decisões de personalização explicáveis;
- estrutura futura para arquétipos probabilísticos.

Arquétipos permanecem desativados. Nenhuma coluna ou enum pressupõe exatamente quatro perfis.

## 10. Avaliações e práticas

Avaliações e atividades práticas são tipos de atividade, mas possuem tabelas especializadas para integridade:

- especificação da avaliação;
- questões e opções;
- tentativas, respostas e resultados;
- especificação da prática;
- submissões e arquivos protegidos;
- rubricas, revisões e notas.

Arquivos ficam em object storage e são referenciados por `core.file_objects`.

## 11. Gamificação e credenciais

Pontos são ledger, não saldo mutável. Selos e certificados guardam:

- versão da regra;
- evento causal;
- snapshot das evidências;
- contexto da jornada;
- histórico de revogação.

Pontos, selos e certificados não são entradas diretas de score por padrão.

## 12. Integrações

O modelo separa:

- configuração não secreta da conexão;
- referência ao segredo externo;
- contrato de mapeamento versionado;
- jobs idempotentes;
- tentativas;
- conflitos;
- reconciliações;
- webhooks recebidos.

HubSpot receberá somente propriedades e fatos selecionados. O event store detalhado permanece interno.

## 13. Features e score

### Features

Cada feature registra:

- definição e uso permitido;
- fórmula/versionamento;
- eventos ou features de origem;
- janela temporal;
- política de ausência;
- política de qualidade;
- execução de cálculo;
- valor, contexto, evidência e hash de linhagem.

### Score

Scores possuem:

- definição e propósito;
- versão do modelo;
- schema de inputs/outputs;
- execução;
- resultado;
- incerteza;
- contribuições explicativas;
- validações;
- aprovação de uso.

A estrutura não autoriza uso em crédito. Essa autorização depende de validação e governança posteriores.

## 14. Governança

O schema `governance` registra:

- finalidades;
- consentimentos/supersessões;
- solicitações de titulares;
- retenção;
- linhagem;
- aprovações de modelos;
- auditoria privilegiada.

Prazos reais de retenção continuam pendentes das políticas internas.

## 15. Quantidade e escopo

O baseline contém **121 tabelas**. Esse número não significa que todas precisarão ser implementadas na primeira migration. O plano de migrations organiza sua criação em camadas e diferencia:

- núcleo necessário para produção inicial;
- estruturas necessárias antes de ativar uma funcionalidade;
- estruturas futuras já modeladas, mas desativadas, como arquétipos e score.

## 16. Artefatos relacionados

- `database-model-v0.1.yaml`: fonte máquina-legível;
- `DATA_DICTIONARY.md`: tabela por tabela;
- `database-target-v0.1.sql`: DDL preliminar;
- `DATABASE_ERD.md`: relações principais;
- `DATABASE_CONSTRAINTS_AND_INTEGRITY.md`;
- `DATABASE_RLS_AND_SECURITY.md`;
- `DATABASE_INDEXING_PARTITIONING.md`;
- `DATABASE_MIGRATION_STRATEGY.md`.
