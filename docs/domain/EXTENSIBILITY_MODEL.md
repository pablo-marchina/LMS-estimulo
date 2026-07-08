# Modelo de extensibilidade para novas jornadas

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Proposta técnica  
**Escopo:** E05-T05

## 1. Objetivo

Garantir que a Jornada OpenAI seja o primeiro conteúdo do produto, mas não determine o schema, os tipos ou os fluxos centrais. O teste de extensibilidade é a capacidade de cadastrar e executar uma segunda jornada hipotética sem:

- criar tabelas específicas;
- adicionar enums de negócio por jornada;
- alterar autenticação, eventos ou integração central;
- copiar páginas inteiras;
- inserir `if/else` baseado no slug da jornada;
- recalcular progresso por índices hardcoded.

## 2. O que deve ser configurável por dados

### Metadados

- nome, descrição, público e organização proprietária;
- período de vigência;
- identidade visual autorizada;
- idioma e acessibilidade.

### Estrutura

- cursos e módulos;
- atividades;
- modelos de trilha;
- etapas e transições;
- pré-requisitos;
- obrigatoriedade;
- prazos;
- conclusão.

### Personalização

- políticas de atribuição;
- resultado de diagnóstico;
- segmentos;
- contexto de crédito;
- escolha do participante;
- regras de intervenção.

### Avaliação e prática

- tipos suportados de pergunta;
- nota e tentativas;
- rubricas;
- submissões e revisão;
- feedback.

### Engajamento

- regras de pontos;
- selos;
- certificados;
- limites e idempotência;
- intervenções.

### Instrumentação

- eventos genéricos;
- propriedades específicas autorizadas;
- mapeamento para features;
- agregados enviados ao HubSpot.

## 3. O que pode exigir código novo

Extensibilidade não significa que qualquer comportamento arbitrário seja criado sem engenharia. Código novo pode ser necessário para:

- novo tipo de atividade interativa;
- nova integração externa;
- novo canal de entrega;
- algoritmo de correção especializado;
- experiência de interface estruturalmente nova;
- requisito regulatório ou de segurança novo.

Mesmo nesses casos, o código deve adicionar uma capacidade genérica e não uma condição exclusiva para uma jornada.

## 4. Representação de regras

Regras devem usar estrutura segura e validável, por exemplo:

```json
{
  "all": [
    { "fact": "activity.completed", "activityCode": "marketing.exam" },
    { "fact": "assessment.score", "operator": ">=", "value": 70 }
  ]
}
```

Características obrigatórias:

- schema versionado;
- operadores permitidos;
- validação antes da publicação;
- avaliação determinística;
- explicação legível;
- testes com exemplos;
- proibição de código arbitrário vindo do banco.

Texto como “desbloqueia após certificado base” deve ser descrição, não a única representação da regra.

## 5. Padrão definition/version/instance

```text
Definição estável
  └── Versão editável em rascunho
       └── Versão publicada imutável
            └── Instâncias de execução dos participantes
```

Aplicação:

| Conceito | Definição | Versão | Instância |
|---|---|---|---|
| Jornada | JourneyDefinition | JourneyVersion | JourneyParticipation |
| Curso | CourseDefinition | CourseVersion | uso na participação via etapa |
| Atividade | ActivityDefinition | ActivityVersion | ActivityInstance |
| Diagnóstico | DiagnosticDefinition | DiagnosticVersion | DiagnosticSession |
| Avaliação | AssessmentDefinition | AssessmentVersion | AssessmentAttempt |
| Intervenção | InterventionDefinition | InterventionVersion | InterventionInstance |
| Selo | BadgeDefinition | BadgeVersion | BadgeAward |
| Certificado | CertificateDefinition | CertificateVersion | CertificateIssuance |
| Feature | FeatureDefinition | FeatureVersion | FeatureValue |
| Score | ScoreDefinition | ScoreVersion | ScoreResult |

## 6. Caminho para cadastrar uma nova jornada

1. criar `JourneyDefinition`;
2. criar versão em rascunho;
3. cadastrar ou reutilizar versões de cursos/atividades;
4. montar modelos de trilha;
5. definir etapas e transições;
6. configurar regras de entrada, progressão e conclusão;
7. configurar diagnóstico/atribuição, se necessário;
8. configurar pontos, selos e certificado;
9. configurar intervenções;
10. validar schemas e regras;
11. executar preview editorial;
12. publicar versão imutável;
13. criar política de elegibilidade/atribuição;
14. iniciar coorte ou atribuições;
15. observar eventos e métricas.

Nenhum desses passos deve exigir migration de banco para uma jornada comum.

## 7. Teste com segunda jornada hipotética

### Jornada hipotética

**Gestão Financeira Essencial**

- diagnóstico curto de organização financeira;
- trilha básica para todos;
- ramificação para fluxo de caixa ou precificação;
- conteúdo em vídeo e checklist;
- avaliação objetiva;
- envio prático de fluxo de caixa;
- revisão humana opcional;
- selo de conclusão;
- certificado após validação da prática.

### Mapeamento no modelo

| Necessidade | Entidade/recurso existente |
|---|---|
| Identidade da jornada | JourneyDefinition |
| Versão publicada | JourneyVersion |
| Trilha básica e ramificações | PathTemplate / PathTransition |
| Vídeo e checklist | ActivityVersion / ContentAsset |
| Prova | atividade tipo assessment |
| Fluxo de caixa enviado | atividade prática / PracticalSubmission |
| Revisão | SubmissionReview |
| Selo | BadgeVersion / BadgeAward |
| Certificado | CertificateVersion / CertificateIssuance |
| Evento de conclusão | evento canônico genérico |
| Feature de persistência | FeatureVersion configurada sobre eventos |

### Resultado do teste conceitual

A jornada pode ser representada sem nova entidade, enum ou tabela específica. Ela pode exigir novos conteúdos e regras, mas utiliza as capacidades centrais já definidas.

## 8. Anti-padrões proibidos

```ts
if (journey.slug === "openai") { ... }
```

```ts
type BadgeKey = "ai_base" | "marketing_ai" | "management_ai";
```

```sql
create table openai_lessons (...);
create table financial_journey_lessons (...);
```

```ts
const progress = currentLessonIndex / 12;
```

```text
unlock_rule = "Liberar após certificado base"
```

Esses padrões podem existir apenas em seed/migração de conteúdo, nunca como regra central.

## 9. Estratégia de interface

A interface deve renderizar componentes por capacidade e tipo de atividade:

```text
JourneyRenderer
  ├── ContentActivityRenderer
  ├── AssessmentRenderer
  ├── PracticalActivityRenderer
  ├── SurveyRenderer
  └── ExternalActivityRenderer
```

Dados específicos da OpenAI entram como conteúdo e configuração. Layouts excepcionais precisam justificar uma capacidade genérica nova.

## 10. Estratégia de eventos

Eventos devem usar nomes genéricos:

- `journey.assigned`;
- `activity.started`;
- `activity.completed`;
- `assessment.submitted`;
- `practical_submission.approved`;
- `badge.awarded`;
- `certificate.issued`.

O contexto carrega IDs da jornada/atividade. Não criar eventos como `openai_marketing_module_completed`.

## 11. Estratégia de gamificação

Regra genérica:

```text
Quando evento X ocorrer e predicado Y for verdadeiro,
conceder recompensa Z uma vez por escopo K.
```

Isso permite pontos e selos diferentes por jornada sem alterar código.

## 12. Estratégia de migração de versão

Quando uma nova versão de jornada for publicada:

- novas participações usam a nova versão conforme política;
- participações existentes permanecem na versão original por padrão;
- migração opcional exige plano explícito;
- o plano informa mapeamento de etapas, equivalências e efeitos;
- toda migração é auditada e reversível quando tecnicamente possível.

## 13. Critérios de aceite de extensibilidade

- [ ] segunda jornada cadastrada sem migration específica;
- [ ] nenhum tipo/enum específico da OpenAI no núcleo;
- [ ] regras publicadas são estruturadas e validadas;
- [ ] participante permanece fixado à versão atribuída;
- [ ] atividades podem ser reutilizadas entre cursos/jornadas;
- [ ] progresso deriva de critérios, não da posição visual;
- [ ] eventos são genéricos;
- [ ] pontos são idempotentes e configuráveis;
- [ ] interface renderiza tipos genéricos de atividade;
- [ ] nova versão não altera participantes existentes silenciosamente.

## 14. Decisões pendentes

- nível de reutilização permitido entre organizações/parceiros;
- estratégia de tradução/localização;
- linguagem de regras e biblioteca de avaliação;
- granularidade de versionamento de módulos e ativos;
- política de migração para correções críticas;
- tipos de atividade incluídos na release inicial de produção.
