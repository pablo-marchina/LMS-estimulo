# Registro de decisões ativas

Este arquivo contém somente decisões vigentes do produto e da arquitetura. Histórico de análise, cobertura ou comparação de materiais externos não é mantido no repositório.

| ID | Data | Decisão | Estado | Consequência operacional |
|---|---|---|---|---|
| DEC-011 | 2026-07-08 | A aplicação começa como monólito modular com contextos delimitados. | Aprovada | Módulos possuem fronteiras e dependências explícitas; microserviços exigem necessidade comprovada. |
| DEC-012 | 2026-07-08 | Programa, jornada, trilha, curso, módulo e atividade são conceitos distintos. | Aprovada | O modelo e a UI preservam essas separações. |
| DEC-013 | 2026-07-08 | Definições usam definição–versão–instância e versões publicadas são imutáveis. | Aprovada | Mudanças editoriais criam novas versões e não alteram silenciosamente históricos. |
| DEC-014 | 2026-07-08 | Conta, empreendedor, negócio e organização operadora são entidades distintas. | Aprovada | Identidade, CRM e operação não são acoplados como relação permanente 1:1. |
| DEC-015 | 2026-07-08 | Participações ficam fixadas à versão da jornada usada. | Aprovada | Migração de participantes exige política explícita e evidência. |
| DEC-017 | 2026-07-08 | Administração compõe casos de uso dos domínios, sem acesso paralelo ao banco. | Aprovada | Telas administrativas usam contratos autorizados e auditáveis. |
| DEC-018 | 2026-07-08 | Autorização usa capacidades, escopo, validade e finalidade. | Aprovada | Papéis são agrupamentos RBAC revogáveis e temporais. |
| DEC-025 | 2026-07-08 | Conteúdo consumido, quick check, prática, feedback e conclusão são fatos separados. | Aprovada | Exposição não é tratada automaticamente como aprendizagem. |
| DEC-026 | 2026-07-08 | Pontos são derivados de ledger versionado e idempotente. | Aprovada | Ranking e recompensas usam fatos auditáveis, não números hardcoded. |
| DEC-027 | 2026-07-08 | Avaliações, regras de pontos, selos e certificados são versionados. | Aprovada | Tentativas e credenciais preservam o snapshot dos requisitos usados. |
| DEC-035 | 2026-07-08 | Diagnóstico e arquétipos são usados para personalização e pesquisa, não para crédito. | Aprovada | Uso em crédito permanece tecnicamente bloqueado sem governança específica. |
| DEC-043 | 2026-07-08 | Base legal não é atribuída automaticamente pelo código. | Aprovada | Tratamentos reais exigem aprovação jurídica e de privacidade. |
| DEC-047 | 2026-07-08 | Retenção não é inventada e políticas destrutivas começam desativadas. | Aprovada | Prazos e deleções dependem de aprovação e legal hold. |
| DEC-049 | 2026-07-08 | Logs e eventos são redigidos antes de persistência e hashing. | Aprovada | Segredos e dados brutos proibidos não entram na evidência física. |
| DEC-050 | 2026-07-08 | Tabelas de aplicação mantêm RLS, inclusive quando server-only. | Aprovada | Novas migrations precisam preservar defesa em profundidade. |
| DEC-051 | 2026-07-08 | Repositório e banco armazenam referências de secrets, nunca valores. | Aprovada | Valores ficam em secret manager ou ambiente gerenciado. |
| DEC-052 | 2026-07-08 | Produção depende de gates verificáveis, não apenas de código compilado. | Aprovada | Release permanece bloqueada enquanto requisitos de produto, operação ou segurança estiverem abertos. |
| DEC-055 | 2026-07-09 | A operação inicial usa quatro arquétipos configuráveis e versionados. | Aprovada | Perguntas, scoring, textos e ativações não podem ser hardcoded. |
| DEC-056 | 2026-07-09 | Formulários usam definição–versão–instância. | Aprovada | Drafts são editáveis e versões publicadas preservam histórico. |
| DEC-057 | 2026-07-09 | Conteúdo próprio e externo usa modelo unificado e adapters. | Aprovada | Direitos, disponibilidade, tracking, formato e fallback são metadados obrigatórios. |
| DEC-058 | 2026-07-09 | Toda ação relevante da interface gera evento estruturado. | Aprovada | Ações sem contrato, finalidade e teste não são consideradas concluídas. |
| DEC-059 | 2026-07-09 | Supabase é desenvolvimento/teste; AWS é staging/produção. | Aprovada | Provas no Supabase não são apresentadas como produção. |
| DEC-060 | 2026-07-09 | Código, testes, migrations e documentação operacional mudam juntos. | Aprovada | Manutenibilidade e CI fazem parte do aceite. |
| DEC-064 | 2026-07-14 | Sinais educacionais não decidem crédito sem validação e governança. | Aprovada | Integrações e interfaces mantêm a separação explícita. |
| DEC-067 | 2026-07-16 | Jornada OpenAI é a primeira jornada oficial; o núcleo continua extensível. | Aprovada | Segunda jornada produtiva não bloqueia a primeira release. |
| DEC-068 | 2026-07-16 | O LMS é desenvolvido e mantido internamente. | Aprovada | Serviços de infraestrutura e integração não substituem o produto. |
| DEC-069 | 2026-07-16 | Credenciais expostas são tratadas como comprometidas e rotacionadas externamente. | Aprovada | Valores literais não entram em Git, docs, issues ou logs. |
| DEC-070 | 2026-07-16 | HubSpot recebe somente `linking_identifier`, `engagement_signal` e `calculation_input_or_result`. | Aprovada | Todo o restante é `not_synced`; PostgreSQL preserva o detalhe operacional. |
| DEC-071 | 2026-07-21 | A entrada administrativa exige e-mail confirmado no domínio exato `@estimulo.org` e RBAC ativo. | Aprovada | O domínio habilita a área administrativa, mas não concede permissões sozinho. |
| DEC-072 | 2026-07-21 | CPF é obrigatório no cadastro e protegido por AES-256-GCM e HMAC independente. | Aprovada | CPF bruto não aparece em metadata, URL, logs ou eventos; mudança exige revisão de identidade. |
| DEC-073 | 2026-07-21 | Experiências existentes devem ser adaptadas sobre o runtime real antes de reconstruções parciais. | Aprovada | Painel, perfil, anúncios, recompensas, ranking e administração reutilizam capacidades já existentes no domínio. |
| DEC-074 | 2026-07-21 | Auditorias e cobertura de materiais externos permanecem fora do repositório. | Aprovada | O Git contém requisitos diretos, decisões ativas, implementação, testes e documentação operacional. |
