# Arquitetura de segurança, privacidade e governança

## Objetivo

Transformar segurança e proteção de dados em regras verificáveis do produto, banco e operação. O repositório não declara conformidade jurídica; ele fornece mecanismos e contratos para que decisões institucionais sejam aplicadas com evidência.

## Princípios

1. finalidade e necessidade antecedem coleta;
2. base legal não é inferida pelo código;
3. rascunho não autoriza tratamento real;
4. dados educacionais não decidem crédito por padrão;
5. navegador não recebe acesso privilegiado ao banco, storage ou integrações;
6. segredos são configuração de ambiente, não dados de aplicação;
7. autorização server-side, RLS, RBAC, constraints e auditoria formam defesa em profundidade;
8. consentimentos, solicitações e ações administrativas preservam evidência;
9. logs e eventos aplicam redaction/minimização antes da persistência;
10. produção falha fechada quando uma dependência ou controle obrigatório não está apto.

## Camadas

| Camada | Responsabilidade |
|---|---|
| governança jurídica | bases legais, classificações, políticas e responsáveis |
| ROPA | atividades, ativos, operações, titulares, destinatários e transferências |
| direitos dos titulares | intake, verificação, escopo, evidência e resolução |
| retenção | políticas, legal hold, anonimização e exclusão |
| identidade e autorização | vínculo externo–interno, sessão, RLS, RBAC e auditoria |
| proteção de dados | criptografia, chaves, minimização e segregação |
| observabilidade segura | logs, métricas e tracing com redaction e acesso governado |
| incidentes e continuidade | detecção, resposta, backup, restore, rollback e comunicação |
| gate de produção | controles técnicos, jurídicos, operacionais, editoriais e de acessibilidade |

## Identidade

Identidade externa é vinculada a uma conta interna por identificadores estáveis e fluxo auditável. E-mail ou domínio isolado não substituem prova de identidade e membership. Operações administrativas verificam capabilities no servidor.

## Dados sensíveis

CPF e demais identificadores protegidos são minimizados, criptografados conforme seu contrato e excluídos de URLs, eventos e logs não necessários. Identidade analítica deve permanecer separável da identidade pessoal.

## Eventos e logs

Eventos representam fatos necessários ao domínio ou à análise aprovada. Logs técnicos não são automaticamente tratados como comportamento. Payloads aplicam schemas, minimização e redaction; segredos e URLs assinadas não são persistidos.

## Arquivos

Objetos são privados por padrão. Upload, download, associação, retenção e exclusão exigem autorização. A necessidade de inspeção de conteúdo é determinada pelo threat model do ambiente e da capacidade.

## Integrações

Consumidores externos recebem apenas dados necessários à finalidade aprovada e usam outbox, idempotência e reconciliação. Um destino externo não recebe acesso implícito ao estado central.

## Governança

Ativação de tratamentos depende dos requisitos em [`../product/EXTERNAL_GOVERNANCE_REQUIREMENTS.md`](../product/EXTERNAL_GOVERNANCE_REQUIREMENTS.md). ROPA, base legal, retenção, fornecedores, direitos dos titulares e resposta a incidentes possuem documentos especializados neste diretório.

## Evidência

Evidência técnica pertence aos workflows e artifacts do SHA avaliado; evidência operacional pertence ao ambiente correspondente. Documentos permanentes definem requisitos e procedimentos, não resultados históricos.

Consulte [`PRODUCTION_READINESS_GATE.md`](PRODUCTION_READINESS_GATE.md) e [`../operations/RELEASE_RUNBOOK.md`](../operations/RELEASE_RUNBOOK.md).