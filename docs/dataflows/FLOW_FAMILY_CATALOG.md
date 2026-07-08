# Catálogo de fluxos por família

**Versão:** 0.1  
**Status:** Baseline E09 para produção

## 1. Leitura

Cada família abaixo especifica origem, validações, escritas síncronas, eventos, consumidores, efeitos externos e recuperação. O arquivo `event-routing-matrix-v0.1.csv` contém uma linha para cada um dos 118 tipos de evento.

## 2. Identidade, convite e acesso

**Origem:** operação interna, HubSpot futuramente ou fluxo administrativo autorizado.  
**Fonte de verdade:** Identity store da plataforma; HubSpot mantém contexto de relacionamento, não credenciais.

```text
Criar convite
→ validar finalidade, elegibilidade e duplicidade
→ persistir Invitation
→ identity.invitation.created
→ notification_orchestrator
→ provedor de mensagem
→ sent/delivered/opened
→ cadastro e verificação
→ account.registered/email.verified/account.activated
→ inscrição ou ação seguinte
```

Validações: convite não expirado, destinatário associado ao empreendedor correto, finalidade autorizada, limites de reenvio, token de uso único e ausência de PII no evento. Abertura de mensagem é evidência fraca e não comprova engajamento.

Falhas: envio volta para retry; token expirado exige novo convite; cadastro duplicado passa por resolução de identidade, nunca cria novo empreendedor silenciosamente.

## 3. Governança e consentimentos

```text
Apresentar finalidade e versão do termo
→ registrar decisão explícita
→ consent.granted/withdrawn
→ consent_projection
→ autorização de usos dependentes
```

A retirada não apaga automaticamente fatos cuja retenção tenha outra base aprovada, mas bloqueia usos que dependam daquele consentimento. Permissão de uso de prática é separada da participação na jornada.

## 4. Catálogo, publicação e segunda jornada

```text
Rascunho de definição
→ edição de versão
→ validações editoriais/técnicas
→ revisão e aprovação
→ publicação atômica do snapshot
→ catalog.*.published
→ catalog_projection/cache invalidation
→ versão disponível para novas inscrições
```

Uma versão publicada é imutável. Retirada impede novas atribuições, mas preserva participações existentes. O teste de produção deve criar uma segunda jornada sintética sem migrations, endpoints ou branches específicos.

## 5. Inscrição e orquestração de jornada

```text
Regra/ação de inscrição
→ journey.enrollment.created
→ ativação
→ journey.instance.available
→ path assigned
→ first step available
→ participant starts
→ progressão por eventos validados
→ milestones
→ completed/expired/cancelled
```

A inscrição fixa `journey_version_id`. A orquestração calcula disponibilidade a partir de regras estruturadas e eventos de domínio; não lê nomes ou slugs de jornadas.

Concorrência: transições usam versão do agregado. Comandos repetidos retornam o resultado existente. Uma etapa só é desbloqueada uma vez por regra e versão.

## 6. Diagnóstico e personalização operacional

```text
session.started
→ respostas gravadas/alteradas
→ abandono ou conclusão
→ result.generated
→ recommendation.generated
→ recommendation.presented
→ segmentos temporários atribuídos
→ path/support configuration
```

As respostas completas ficam no store de diagnóstico. Eventos carregam IDs de pergunta/opção e versão, sem texto livre desnecessário. O resultado da release inicial é operacional, sem arquétipo e sem uso decisório de crédito.

Se a classificação estiver incompleta ou inconsistente, `personalization.uncertainty.recorded` é emitido e o fluxo padrão seguro permanece disponível.

## 7. Entrega de conteúdo e progresso

```text
activity.started
→ asset opened / progress observations
→ pause/resume/revisit
→ regra server-side avalia conclusão
→ activity.completed
→ progress_projection
→ journey_orchestration
→ possíveis pontos/intervenções
```

Observações do cliente usam `client_event_id`, rate limit e consolidação. Eventos de progresso devem ser limitados por mudança significativa ou intervalo mínimo, evitando evento por segundo. Conclusão depende da política versionada da atividade.

## 8. Avaliações

```text
attempt.started
→ answer.recorded
→ attempt.submitted
→ scoring
→ attempt.scored
→ passed ou failed
→ feedback.available
→ retry.available ou desbloqueio da jornada
```

A tentativa referencia versões imutáveis da avaliação e das questões. Respostas não são armazenadas integralmente no evento. O scoring deve ser reproduzível com `scoring_policy_version`. Invalidação é ação auditada e não apaga a tentativa.

Falha de scoring mantém a tentativa como `submitted_pending_scoring`; não permite nova submissão concorrente sem política explícita.

## 9. Práticas e evidências

```text
practice.activity.started
→ draft_saved
→ evidence attached/removed
→ submission.submitted
→ review queue
→ review.started
→ accepted | rejected | revision.requested
→ resubmission
→ application self-reported
→ application verified quando houver evidência
```

Arquivos seguem upload direto para object storage por URL curta e assinada; o backend confirma metadados, tipo, tamanho, hash e scanner antes de associar. Eventos carregam apenas IDs e metadados permitidos.

Autorrelato e aplicação verificada são fatos diferentes. A concessão de permissão para uso de uma prática é independente da submissão e pode ser retirada.

## 10. Gamificação

```text
fato elegível
→ regra versionada avaliada
→ ledger entry único por rule_version + source_event_id
→ points.awarded / badge.awarded
→ projeção de saldo e conquistas
```

Reversões criam novos lançamentos; não alteram o lançamento original. Retry não pode duplicar pontos ou selos. Eventos derivados não entram como evidência bruta de comportamento.

## 11. Certificados

```text
requisitos satisfeitos
→ credential engine valida snapshot
→ certificate issued
→ arquivo/verificação pública gerados
→ download observado
→ revogação auditável se necessária
```

O certificado guarda versão da jornada, regras satisfeitas, data e identificador verificável. Download não equivale a aprendizagem. Revogação não apaga emissão histórica.

## 12. Intervenções e suporte

```text
evento/estado elegível
→ eligibility.detected
→ prioridade + cooldown + supressões
→ instance.created ou suppressed
→ mensagem enviada/entregue/aberta
→ action.taken ou dismissed
→ resultado observado em janela definida
```

O motor deve impedir excesso de mensagens, respeitar opt-out e registrar por que uma intervenção foi criada ou suprimida. Abertura é evidência fraca. Pedido explícito de suporte cria item operacional; cumprimento é registrado separadamente.

## 13. HubSpot — fluxo lógico

```text
evento interno relevante
→ regra de projeção CRM
→ integration.sync.requested
→ job idempotente
→ upsert/association no HubSpot
→ succeeded | failed | conflict
→ histórico e reconciliação
```

HubSpot receberá somente identidade de relacionamento e fatos/agregados aprovados. Não receberá o event log, respostas detalhadas, arquivos ou features experimentais por padrão. O mapeamento final depende do inventário do sandbox.

Entrada do HubSpot, quando necessária:

```text
HubSpot webhook
→ receipt bruto com retenção curta
→ assinatura e replay validation
→ identificação do objeto/mapping
→ canonical integration event
→ comando de domínio, se autorizado
```

Um webhook nunca altera diretamente tabelas de domínio.

## 14. Crédito externo — fronteira reservada

```text
sistema oficial de crédito
→ webhook/polling autenticado
→ external identity mapping
→ validação de estágio e versão
→ external.credit.stage.changed
→ projeções/intervenções autorizadas
```

Nenhum estado de crédito foi inventado. Até a definição da fonte oficial, IDs e taxonomia, o conector permanece desabilitado. O evento não autoriza uso do diagnóstico ou do score em crédito.

## 15. Features e score experimental

```text
eventos canônicos elegíveis
→ seleção por feature definition/version
→ cálculo com janela e qualidade
→ feature value append
→ validações de completude/linhagem
→ score run experimental
→ score result + explanation
```

A execução registra os IDs ou intervalos de eventos utilizados, código/definição da feature, versão, janela, tratamento de ausência e qualidade. Reprocessamento cria nova execução; não sobrescreve resultados históricos. Não há sincronização do score ao HubSpot ou sistema de crédito sem gate institucional posterior.

## 16. Administração e auditoria

Toda ação administrativa usa os mesmos casos de uso do domínio, com autorização adicional e evento de auditoria quando necessário. Não há edição direta de tabelas em produção. Operações destrutivas exigem motivo, correlação e, quando aplicável, aprovação dupla.

## 17. Privacidade e solicitações de titular

```text
solicitação autenticada
→ localizar dados por identity mapping
→ aplicar política por store/finalidade
→ exportar, corrigir, restringir, anonimizar ou excluir
→ preservar auditoria mínima aprovada
→ reconciliar projeções e integrações
```

O event store não deve depender de PII direta. Quando um vínculo precisa ser removido, a estratégia preferencial é anonimização/pseudonimização controlada, sujeita à política institucional e jurídica ainda pendente.
