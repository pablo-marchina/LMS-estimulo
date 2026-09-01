# Registro de decisões ativas

**Revisado em:** 2026-09-01

Este arquivo contém somente decisões vigentes do produto e da arquitetura. Decisões superadas saem da lista ativa; o estado executável é comprovado por código, migrations e testes, não pela antiguidade de um ID.

| ID | Data | Decisão | Estado | Consequência operacional |
|---|---|---|---|---|
| DEC-011 | 2026-07-08 | A aplicação começa como monólito modular com contextos delimitados. | Aprovada | Módulos possuem fronteiras e dependências explícitas; microserviços exigem necessidade comprovada. |
| DEC-012 | 2026-07-08 | Programa, jornada, trilha, curso, módulo e atividade são conceitos distintos. | Aprovada | O modelo e a UI preservam essas separações. |
| DEC-017 | 2026-07-08 | Administração compõe casos de uso dos domínios, sem acesso paralelo ao banco. | Aprovada | Telas administrativas usam contratos autorizados e auditáveis. |
| DEC-018 | 2026-07-08 | Autorização usa capacidades, escopo, validade e finalidade. | Aprovada | Papéis são agrupamentos RBAC revogáveis e temporais. |
| DEC-025 | 2026-07-08 | Conteúdo consumido, quick check, prática, feedback e conclusão são fatos separados. | Aprovada | Exposição não é tratada automaticamente como aprendizagem. |
| DEC-026 | 2026-07-08 | Pontos são derivados de ledger idempotente. | Aprovada | Ranking e recompensas usam fatos auditáveis, não números hardcoded. |
| DEC-027 | 2026-07-08 | Avaliações, regras de pontos, selos e certificados preservam a regra/snapshot aplicável. | Aprovada | Tentativas e credenciais permanecem auditáveis mesmo quando a configuração muda. |
| DEC-035 | 2026-07-08 | Diagnóstico e arquétipos são usados para personalização e pesquisa, não para crédito. | Aprovada | Uso em crédito permanece tecnicamente bloqueado sem governança específica. |
| DEC-043 | 2026-07-08 | Base legal não é atribuída automaticamente pelo código. | Aprovada | Tratamentos reais exigem aprovação jurídica e de privacidade. |
| DEC-047 | 2026-07-08 | Retenção não é inventada e políticas destrutivas começam desativadas. | Aprovada | Prazos e deleções dependem de aprovação e legal hold. |
| DEC-049 | 2026-07-08 | Logs e eventos são redigidos antes de persistência e hashing. | Aprovada | Segredos e dados brutos proibidos não entram na evidência física. |
| DEC-050 | 2026-07-08 | Tabelas de aplicação mantêm RLS, inclusive quando server-only. | Aprovada | Novas migrations precisam preservar defesa em profundidade. |
| DEC-051 | 2026-07-08 | Repositório e banco armazenam referências de secrets, nunca valores. | Aprovada | Valores ficam no mecanismo institucional aprovado para cada ambiente. |
| DEC-052 | 2026-07-08 | Produção depende de gates verificáveis, não apenas de código compilado. | Aprovada | Release permanece bloqueada enquanto requisitos de produto, operação ou segurança estiverem abertos. |
| DEC-055 | 2026-07-09 | A operação inicial usa quatro arquétipos configuráveis e auditáveis. | Aprovada | Perguntas, scoring, textos e ativações não podem ser hardcoded como metodologia silenciosa. |
| DEC-056 | 2026-07-09 | Formulários diagnósticos usam definição–versão–instância. | Aprovada | Drafts são editáveis e versões publicadas de diagnóstico preservam histórico. |
| DEC-057 | 2026-07-09 | Conteúdo próprio e externo usa modelo unificado e adapters. | Aprovada | Direitos, disponibilidade, tracking, formato e fallback são metadados obrigatórios. |
| DEC-058 | 2026-07-09 | Toda ação relevante da interface gera evento estruturado quando possuir finalidade aprovada. | Aprovada | Captura sem finalidade/classificação não é considerada requisito cumprido. |
| DEC-059 | 2026-07-09 | Supabase e Vercel são restritos a desenvolvimento, teste, preview e validação controlada; AWS é o ambiente institucional definitivo de produção. | Aprovada | Nenhuma evidência do ambiente de teste autoriza produção e não existe fallback de produção para Supabase. |
| DEC-060 | 2026-07-09 | Código, testes, migrations e documentação operacional mudam juntos. | Aprovada | Manutenibilidade e CI fazem parte do aceite. |
| DEC-064 | 2026-07-14 | Sinais educacionais não decidem crédito sem validação e governança. | Aprovada | Integrações e interfaces mantêm a separação explícita. |
| DEC-067 | 2026-07-16 | Jornada OpenAI é a primeira jornada oficial; o núcleo continua extensível. | Aprovada | Segunda jornada produtiva não bloqueia a primeira release. |
| DEC-068 | 2026-07-16 | O LMS é desenvolvido e mantido internamente. | Aprovada | Serviços de infraestrutura e integração não substituem o produto. |
| DEC-069 | 2026-07-16 | Credenciais expostas são tratadas como comprometidas e rotacionadas externamente. | Aprovada | Valores literais não entram em Git, docs, issues ou logs. |
| DEC-070 | 2026-07-16 | Se HubSpot for usado como destino, somente `linking_identifier`, `engagement_signal` e `calculation_input_or_result` podem ser projetados. | Aprovada | PostgreSQL continua fonte operacional; exportação ocorre por outbox/consumidor desacoplado e HubSpot não é dependência síncrona do runtime. |
| DEC-072 | 2026-07-21 | CPF é obrigatório no cadastro e protegido por AES-256-GCM e HMAC independente. | Aprovada | CPF bruto não aparece em metadata, URL, logs ou eventos; mudança exige revisão de identidade. |
| DEC-073 | 2026-07-21 | Experiências existentes devem ser adaptadas sobre o runtime real antes de reconstruções parciais. | Aprovada | Painel, perfil, anúncios, recompensas, ranking e administração reutilizam capacidades já existentes no domínio. |
| DEC-074 | 2026-07-21 | Auditorias e cobertura de materiais externos permanecem fora da documentação canônica de estado. | Aprovada | O Git contém requisitos diretos, decisões ativas, implementação, testes e documentação operacional. |
| DEC-075 | 2026-07-29 | A AWS será o ambiente institucional definitivo e a aplicação será empacotada por `Dockerfile.lambda`; todas as demais decisões AWS permanecem abertas. | Parcialmente definida | Produção permanece `not_ready` até ADRs aprovarem identidade, dados, storage, rede, edge, assíncrono, observabilidade, deploy e continuidade. |
| DEC-076 | 2026-08-01 | Jornada possui um único registro operacional com estados visíveis `draft` e `published`; publicação/despublicação alteram o mesmo registro e publicação permite edição ao vivo. | Implementada | IDs/colunas com nome legado `journey_version*` são compatibilidade física 1:1, não versões editoriais navegáveis; fatos históricos continuam preservados em seus próprios stores. |
| DEC-077 | 2026-08-31 | Entrada administrativa Supabase exige sessão obtida por Google, e-mail confirmado, identidade interna vinculada e membership ativa na organização Estímulo; permissões são aplicadas por RBAC. | Implementada | Domínio de e-mail isoladamente não concede nem revoga acesso; o callback valida a identidade Google via registro do usuário e não depende de `getClaims()`/AMR para reconhecer o provider. |
| DEC-078 | 2026-08-31 | Correções de comportamento em legado congelado devem reutilizar a superfície já inventariada quando possível, com substituição semântica aprovada e replay. | Implementada | Nenhum novo helper opaco ou facade pública é criado para corrigir quick-check; registro de substituições e baselines legíveis por máquina permanecem a fonte de verdade. |

## Decisões explicitamente superadas

- `DEC-013` e `DEC-015` foram superadas para **jornadas** por `DEC-076`. O padrão definição–versão–instância continua válido onde o runtime atual o aplica, como diagnóstico, documentos legais e outras capacidades versionadas.
- `DEC-071` foi superada por `DEC-077`: `@estimulo.org` continua sendo uma classificação corporativa útil em fluxos de gestão de conta, mas não substitui identidade Google validada, vínculo interno, membership Estímulo e RBAC.

Quando houver conflito entre um documento conceitual antigo e uma decisão ativa, prevalecem este registro, a documentação de implementação vigente e as migrations executáveis.