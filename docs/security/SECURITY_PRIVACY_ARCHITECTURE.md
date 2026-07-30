# Arquitetura de segurança, privacidade e governança

**Revisado em:** 2026-07-30  
**Estado:** guardrails de software versionados; conformidade e produção pendentes de decisões e evidências

## Objetivo

Transformar segurança e LGPD em regras verificáveis do produto, do banco e da operação. O repositório não declara conformidade jurídica nem substitui decisões institucionais; ele mantém contratos, registros e gates para que essas decisões sejam aplicadas com evidência.

## Princípios

1. **Finalidade e necessidade antes da coleta.** Todo dado possui finalidade, ativo, proprietário e justificativa.
2. **Base legal não é inferida pelo código.** Catálogos e drafts não autorizam tratamento real.
3. **Rascunho não autoriza produção.** Política, conteúdo ou formulário sem aprovação permanece inativo ou bloqueado.
4. **Dados educacionais não decidem crédito.** Qualquer uso futuro exige metodologia, base legal, revisão de vieses, governança humana e aprovação explícita.
5. **Backend por contrato.** Navegador não recebe acesso privilegiado ao banco, storage ou integrações.
6. **Segredo não é dado de aplicação.** Somente referências e metadados governados podem ser persistidos.
7. **Defesa em profundidade.** Autorização server-side, RLS, RBAC, constraints, idempotência e auditoria se complementam.
8. **Evidência append-only.** Consentimentos, solicitações, incidentes e ações administrativas preservam histórico.
9. **Redaction antes da saída.** Logs e eventos removem tokens, cookies, CPF e payload proibido antes de persistir.
10. **Produção falha fechada.** Ausência de arquitetura ou prova mantém readiness e deploy bloqueados.

## Camadas lógicas

| Camada | Responsabilidade |
|---|---|
| catálogo jurídico | bases legais, classificações, políticas e responsáveis |
| ROPA | atividades, ativos, operações, titulares, destinatários e transferências |
| direitos dos titulares | intake, verificação, escopo, evidência, prazo e resolução |
| retenção | políticas versionadas, legal hold, anonimização e exclusão |
| identidade e autorização | vínculo externo–interno, sessão, RLS, RBAC e auditoria |
| proteção de dados | criptografia, chaves, minimização e segregação |
| observabilidade segura | logs, métricas e tracing com redaction e acesso governado |
| incidentes e continuidade | detecção, resposta, backup, restore, rollback e comunicação |
| gate de produção | controles técnicos, jurídicos, operacionais, editoriais e de acessibilidade |

## Estado atual do software

O código e as migrations incluem estruturas para classificação, consentimento, direitos, retenção, legal hold, incidentes, RLS, RBAC, auditoria e proteção do CPF. A conformidade de cada SHA é comprovada pelos workflows e testes, não por números copiados neste documento.

O runtime atual não possui proteção antimalware de produção, plataforma operacional AWS ou integração externa aprovada. Estruturas históricas ou fixtures não constituem capacidade ativa.

## Limites e bloqueadores

- controlador, operadores, encarregado ou dispensa e canais públicos ainda exigem decisão institucional;
- bases legais, avisos, consentimentos e prazos finais precisam de aprovação;
- fornecedores, contratos, subprocessadores e transferências precisam de avaliação;
- custódia e rotação das chaves do CPF precisam de operação institucional;
- integração externa precisa de inventário, escopo e sandbox;
- proteção distribuída contra abuso depende da futura arquitetura;
- observabilidade, incidente, backup, restore e rollback precisam ser exercitados no ambiente AWS aprovado;
- conteúdo, diagnóstico, metodologia e acessibilidade precisam de homologação;
- nenhum sinal comportamental pode produzir efeito em crédito sem governança específica.

## Evidência

A evidência técnica pertence aos workflows e artefatos do SHA avaliado. A evidência operacional pertence ao staging e à produção aprovados. Documentos permanentes não mantêm contagens de tabelas, policies, RPCs, controles, testes ou resultados `passed`.

Consulte:

- [`PRODUCTION_READINESS_GATE.md`](PRODUCTION_READINESS_GATE.md);
- [`DELIVERY_BLOCKERS.md`](../implementation/DELIVERY_BLOCKERS.md);
- [`FINAL_RELEASE_RUNBOOK.md`](../operations/FINAL_RELEASE_RUNBOOK.md).
