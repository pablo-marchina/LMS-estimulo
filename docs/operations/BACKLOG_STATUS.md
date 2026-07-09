# Status do backlog

**Data:** 2026-07-08

| Tarefa | Status | Resultado/impedimento |
|---|---|---|
| E00-T01 Estrutura documental | DONE | Estrutura inicial criada. |
| E00-T02 Decision Log | DONE | Decisões iniciais registradas. |
| E00-T03 Risk Register | DONE | Riscos iniciais registrados. |
| E00-T04 Glossário | DONE | Versão 0.1 criada. |
| E01-T01 Checklist de crédito | DONE | Solicitações de informação estruturadas. |
| E01-T02 Inventário HubSpot | BLOCKED | Aguardando informações/export do sandbox. |
| E01-T03 Inventário Jornada OpenAI | DONE V0.1 | PDF e código analisados; lacunas editoriais registradas. |
| E01-T04 Matriz de acessos | DONE V0.1 | Repositório atualizado para disponível. |
| E01-T05 Dados históricos | BLOCKED | Aguardando inventário interno. |
| E02 Contexto e requisitos | IN_PROGRESS | Baseline criada; será refinada com dados internos. |
| E03-T01 Executar fundação | PARTIAL | ZIP extraído; instalação/build bloqueados por indisponibilidade do registry no ambiente. |
| E03-T02 Mapear arquitetura | DONE V0.1 | Arquitetura estática e fluxos reais mapeados. |
| E03-T03 Dependências/segurança | IN_PROGRESS | Análise estática concluída; scan automatizado depende da instalação. |
| E03-T04 Autenticação/autorização | DONE V0.1 | Falhas de provisioning e proteção de rotas registradas. |
| E03-T05 Banco/migrations | DONE V0.1 | Schema auditado; recomendada substituição orientada ao domínio. |
| E03-T06 Testes/observabilidade | DONE V0.1 | Ambos ausentes. |
| E03-T07 Matriz de reaproveitamento | DONE V0.1 | Incluída na auditoria do repositório. |
| E04 Auditoria de mockups | DONE V0.1 | Código das telas auditado; screenshots do ZIP estavam brancos. |
| E05 Modelo de domínio | DONE V0.1 | Entidades, contextos, ciclos de vida, permissões e extensibilidade documentados. |
| E06-T01 Hierarquia formal | DONE V0.1 | Blocos, trilhas, unidades, práticas e avaliações estruturados. |
| E06-T02 Competências e objetivos | DONE V0.1 | 16 competências propostas e mapeadas a evidências. |
| E06-T03 Progressão e desbloqueio | DONE V0.1 | Grafo, estados e regras estruturadas definidos. |
| E06-T04 Avaliações e práticas | DONE STRUCTURE | Estrutura concluída; instrumentos editoriais permanecem pendentes. |
| E06-T05 Pontos, selos e certificados | DONE V0.1 | Regras, ledger e credenciais especificados. |
| E06-T06 Versionamento editorial | DONE V0.1 | Publicação, imutabilidade e migração documentadas. |
| E06-T07 Eventos por componente | DONE REQUIREMENTS | Requisitos semânticos preparados para E08. |
| E06 Especificação Jornada OpenAI | DONE V0.1 | Publicação permanece bloqueada pelas lacunas listadas em OPENAI_CONTENT_GAPS.md. |
| E07-T01 Finalidade do diagnóstico | DONE V0.1 | Usos permitidos, usos proibidos e guardrails definidos. |
| E07-T02 Dimensões candidatas | DONE V0.1 | Oito dimensões comportamentais, contexto e prontidão OpenAI separados. |
| E07-T03 Preparar pesquisa | DONE V0.1 | Protocolo, amostragem, roteiro e template de evidências concluídos. |
| E07-T04 Realizar entrevistas | DEFERRED OPTIONAL | Não bloqueia o MVP; executar posteriormente se a amostra se tornar disponível. |
| E07-T05 Sintetizar padrões | PLANNED FROM PILOT | Será executado com dados prospectivos do piloto e, se possível, entrevistas posteriores. |
| E07-T06 Propor arquétipos | DEFERRED | Arquétipos desabilitados no MVP; definição depende de evidência e teste de utilidade. |
| E07-T07 Diagnóstico do MVP | DONE V0.2 | Roteamento operacional, dimensões provisórias, incerteza e segmentos definidos; sem arquétipo e sem uso em crédito. |
| E07-T08 Momentos de intervenção | DONE STRUCTURE | Modelo genérico e candidatos OpenAI definidos; crédito e tempos finais pendentes. |
| E07-T09 Plano de validação | DONE V0.1 | Etapas qualitativa, cognitiva, fatorial, perfis, utilidade e equidade documentadas. |
| E07 Diagnóstico/personalização | DONE FOR MVP V0.2 | Arquétipos transferidos para validação posterior; piloto produzirá evidências. |
| E08 Eventos comportamentais | READY | Pode iniciar com base no domínio preliminar. |
| E08 Eventos comportamentais | DONE V0.1 | Envelope, catálogo, idempotência, qualidade e retenção documentados. |
| E09 Fluxos ponta a ponta | DONE V0.1 | Famílias de fluxo, linhagem, falhas, replay e reconciliação documentados. |
| E10 Modelo de dados e score | DONE BASELINE V0.2 | 122 tabelas lógicas, features e score experimental separados. |
| E11 HubSpot | BLOCKED EXTERNAL | Fluxo lógico pronto; inventário e sandbox reais permanecem pendentes. |
| E12-T01–T06 Banco/identidade/RLS/outbox | DONE LIVE | M00–M08 aplicados e validados no Supabase real. |
| E12-T07 Storage | DONE LIVE | M09, bucket privado, upload assinado, quarentena e release comprovados. |
| E12-T08 Queue/worker | DONE LIVE | M10, retry, visibility, DLQ, redrive e worker comprovados. |
| E12-T09 Scheduler/reconciliação | DONE LIVE | M11 e quatro cron jobs ativos. |
| E12-T10 Métricas/alertas | DONE LIVE | Snapshots e ciclo open/ack/resolved comprovados. |
| E12-T11 Concorrência | DONE LIVE | 20 jobs divididos entre quatro workers sem duplicidade. |
| E12 Supabase test foundation | DONE V1.9 | Ambiente de teste continuamente operacional; scanner ainda técnico. |
| E12 AWS staging parity | BLOCKED EXTERNAL | Requer conta, região, rede, domínios, orçamento e políticas AWS. |
| E13-T01 Classificação e inventário | DONE LIVE | 8 classes, 18 ativos e vínculos de necessidade implementados. |
| E13-T02 ROPA e bases legais | DONE TECHNICAL / BLOCKED APPROVAL | 7 atividades em draft; base legal não atribuída sem aprovação. |
| E13-T03 Consentimento e direitos | DONE TECHNICAL | Evidência append-only e workflow server-side validados; canal/exportação real pendentes. |
| E13-T04 Retenção e legal hold | DONE TECHNICAL / BLOCKED APPROVAL | Políticas draft, dry run e bloqueio por hold implementados; prazos pendentes. |
| E13-T05 Logging e redaction | DONE LIVE | Redaction recursiva e payload/hash consistentes comprovados. |
| E13-T06 RLS e acesso interno | DONE LIVE | 156/156 tabelas com RLS; zero acesso direto de cliente. |
| E13-T07 Incidentes | DONE TECHNICAL | Registro/timeline validados; playbook, contatos e exercício pendentes. |
| E13-T08 Secrets e chaves | DONE BASELINE / BLOCKED AWS | Inventário metadata-only; KMS, rotação e IAM AWS pendentes. |
| E13-T09 Backup e restore | DONE MODEL / BLOCKED EXTERNAL | Registro e critérios prontos; configuração e restore AWS não executados. |
| E13-T10 Fornecedores e transferências | DONE MODEL / BLOCKED EXTERNAL | Supabase, AWS e HubSpot cadastrados como draft; contratos/regiões pendentes. |
| E13-T11 Production-readiness gate | DONE LIVE | 24 controles; 2 passed, 22 blocking; produção `ready=false`. |
| E13 Segurança, LGPD e operação | DONE TECHNICAL V2.0 / PRODUCTION BLOCKED | M12 aplicada e validada; decisões institucionais e AWS/HubSpot continuam bloqueantes. |

