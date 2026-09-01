# Riscos da Plataforma Estímulo

Este registro reúne classes de risco duráveis. Probabilidade e exposição operacional variam por ambiente e release; por isso ficam nas avaliações de risco correspondentes, não neste catálogo permanente.

| ID | Risco | Controles permanentes | Indicadores |
|---|---|---|---|
| RSK-001 | Modelo de dados acoplado a telas ou a uma jornada específica. | Contextos delimitados, modelo multi-jornada e module boundaries. | Tabelas/condições nomeadas por uma única experiência. |
| RSK-002 | Exposição de conteúdo ser confundida com aprendizagem. | Fatos separados para consumo, avaliação, prática e conclusão. | Uma métrica única alimenta todas as interpretações. |
| RSK-003 | Diagnóstico usar metodologia não validada. | Configuração versionada, abstenção e requisitos externos de metodologia. | Pesos/cortes hardcoded sem fonte. |
| RSK-004 | Sinais educacionais influenciarem crédito sem governança. | Separação técnica, finalidade, revisão de vieses e gates jurídicos. | Score aparece em aprovação, limite, preço ou cobrança. |
| RSK-005 | Integração externa criar conflito, duplicidade ou indisponibilidade no domínio. | Outbox, idempotência, ownership, retry e reconciliação. | Escrita central depende de resposta externa ou alterna valores. |
| RSK-006 | Setup deixar de ser reproduzível. | Toolchain versionada, lockfile, migrations e validação em ambiente limpo. | Execução depende de passo manual não documentado. |
| RSK-007 | Dados pessoais excessivos em eventos/logs. | Minimização, schemas, redaction, classificação e retenção. | CPF, token, arquivo ou texto livre sem finalidade aparece na telemetria. |
| RSK-008 | Escopo funcional crescer sem preservar coerência arquitetural. | Princípios de produto, priorização e Definition of Done. | Capacidades paralelas ou atalhos específicos surgem no núcleo. |
| RSK-009 | Autorização administrativa ou participante ser apenas visual. | Guards server-side, RBAC, RLS/grants e testes negativos. | Rota/RPC acessível sem identidade e escopo válidos. |
| RSK-010 | Identidade Auth não possuir perfil/vínculo de domínio consistente. | Provisioning idempotente e linking explícito. | Usuário autenticado sem participante/membership correspondente. |
| RSK-011 | Conteúdo rascunho ser exposto. | Estado de publicação verificado no servidor e no banco. | Conteúdo não publicado aparece em leitura participante. |
| RSK-012 | Dados simulados serem interpretados como reais. | Estados vazios/erro honestos e proibição de mock operacional. | Métricas estáticas em ambiente real. |
| RSK-013 | Edição ao vivo de jornada surpreender participantes ativos. | Governança editorial, auditoria, compatibilidade e despublicação para mudanças disruptivas. | Regra essencial muda sem rastreabilidade ou análise de impacto. |
| RSK-014 | Regras executáveis virarem texto livre/código arbitrário. | DSL/predicados estruturados e allowlists. | `eval`, expressão não validada ou JSON sem schema controla autorização. |
| RSK-015 | Papéis globais concederem acesso excessivo. | Capabilities, escopo, validade, finalidade e RLS. | Papel genérico acessa PII/submissões sem necessidade. |
| RSK-016 | Avaliação ou prática ser publicada sem instrumento suficiente. | Versionamento de instrumento, validação editorial e critérios explícitos. | Prova sem respostas/rubrica/política de tentativa. |
| RSK-017 | Pontos incentivarem abuso ou contaminarem análise comportamental. | Ledger idempotente, limites e separação de features derivadas. | Repetição artificial para pontuação. |
| RSK-018 | Conteúdo financeiro/jurídico ser interpretado como aconselhamento conclusivo. | Linguagem de limites, revisão especializada e verificação humana. | Participante toma decisão material somente pela saída da IA. |
| RSK-019 | Ferramentas externas mudarem e desatualizarem aulas. | Metadata de revisão, conteúdo administrável e política de manutenção. | Passo a passo não corresponde à ferramenta disponível. |
| RSK-020 | Upload expor dado sensível ou conteúdo perigoso. | Minimização, autorização, isolamento, validação e controles definidos pelo threat model. | Arquivo acessível antes dos controles exigidos. |
| RSK-021 | Credencial comprovar mais do que a evidência sustenta. | Critérios explícitos e separação entre competência, aplicação e impacto. | Certificado afirma resultado não avaliado. |
| RSK-022 | Diagnóstico introduzir viés, estigma ou classificação forçada. | Pesquisa, equidade, resultado inconclusivo e linguagem neutra. | Perfis rígidos ou taxas de erro desiguais sem análise. |
| RSK-023 | Personalização usar o mesmo sinal como input e outcome. | Separação de features/outcomes e validação prospectiva. | Métrica circular sustenta eficácia aparente. |
| RSK-024 | Cliente emitir fato crítico sem validação do servidor. | Comandos no cliente; fatos canônicos no backend. | Pontos, conclusão ou aprovação originam diretamente do browser. |
| RSK-025 | Retry/replay duplicar efeitos. | Idempotency keys, inbox/outbox e modos de replay sem efeitos externos. | Duplicação de pontos, mensagem, certificado ou integração. |
| RSK-026 | Eventos fora de ordem ou schema incompatível corromperem projeções. | Versionamento, ordering, gap detection e compatibilidade em CI. | Consumidor aplica evento incompatível/fora de sequência. |
| RSK-027 | Projeções divergirem silenciosamente dos fatos. | Checkpoints, lag, reconciliação e alertas. | Event log avança e projeção não. |
| RSK-028 | Retenção indefinida ampliar risco e custo. | Políticas por classe, legal hold e revisão de tratamento. | Dados sem `retention_class` ou política aplicável. |
| RSK-029 | Contexto de usuário vazar entre requests. | Transação, contexto local, rollback e testes de reutilização de conexão. | Usuário B observa dados sob contexto de A. |
| RSK-030 | Backend contornar RLS por ownership/BYPASSRLS indevido. | Ownership separado, NOBYPASSRLS e verificação automática. | Teste passa apenas com privilégio excessivo. |
| RSK-031 | Drift entre providers aparecer somente na produção. | Ports/adapters, contratos comuns, staging e testes de paridade. | Regra funciona em um provider e falha em outro. |
| RSK-032 | Migration parcial criar drift de schema. | Arquivos imutáveis, replay desde zero e histórico validado. | Versão registrada sem todos os objetos esperados. |
| RSK-033 | Índices serem criados/removidos sem workload representativo. | Planos reais, estatísticas, benchmarks e migrations aditivas. | Mudança motivada somente por advisor em banco vazio. |
| RSK-034 | URL assinada ou secret vazar em log/analytics. | Redaction, TTL curto e proibição de persistência. | Token aparece em evento ou log. |
| RSK-035 | Worker/fila produzir corrida, duplicação ou job preso. | Lease, ownership, heartbeat, idempotência, DLQ e reconciliação. | Dois workers aplicam o mesmo efeito ou estado envelhece. |
| RSK-036 | Observabilidade divergir do estado real. | Métricas de origem, snapshots canônicos e reconciliação. | Dashboards discordam sobre backlog/readiness. |
| RSK-037 | Base legal/consentimento ser aplicado de forma genérica. | Finalidade separada, aprovação por tratamento e evidência versionada. | Uma autorização cobre usos materialmente diferentes. |
| RSK-038 | Direito do titular ignorar sistemas ou legal hold. | Inventário de sistemas, verificação, workflow ponta a ponta e holds. | Resposta cobre apenas o banco principal. |
| RSK-039 | Incidente não receber escalonamento adequado. | Registro, severidade, timeline, responsável e playbook. | Incidente encerra sem avaliação/documentação. |
| RSK-040 | Backup de banco ser confundido com recuperação completa. | Estratégia conjunta para banco, objetos, configuração e restore testado. | Banco volta, mas arquivos/configuração não. |
| RSK-041 | Controle de ambiente de teste ser considerado evidência de produção. | Gate por ambiente e evidência do provider definitivo. | Controle é marcado aprovado sem prova no ambiente real. |
| RSK-042 | Fornecedor/região/subprocessador operar sem avaliação. | Inventário, contrato, DPA e governança de transferência. | Parte processadora ou região desconhecida. |
| RSK-043 | Risco crítico ser aceito sem decisão formal. | Registro de exceção com escopo, proprietário, prazo e revisão. | Gate muda de estado sem referência governada. |