# Arquitetura de segurança, privacidade e governança

**Versão:** 2.0  
**Data:** 2026-07-08  
**Estado:** baseline técnico implementado; produção bloqueada por decisões e evidências externas

## Objetivo

Transformar segurança e LGPD em regras verificáveis do produto, do banco e da operação. Esta entrega não declara conformidade jurídica e não substitui análise da Estímulo, de seu encarregado ou de assessoria jurídica. Ela cria os registros, guardrails e gates necessários para que as decisões institucionais sejam tomadas com evidência e aplicadas sem depender de controles informais.

## Princípios adotados

1. **Finalidade e necessidade antes da coleta.** Um dado só pode ser vinculado a uma atividade de tratamento, finalidade, ativo e justificativa de necessidade.
2. **Consentimento não é base padrão.** O catálogo contém bases possíveis, mas nenhuma foi atribuída automaticamente às atividades.
3. **Rascunho não autoriza produção.** As sete finalidades, cinco políticas de retenção e sete atividades permanecem `draft`.
4. **Perfil comportamental e crédito têm gate reforçado.** Atividades de alto risco exigem RIPD efetivo; uso em crédito também exige governança específica aprovada.
5. **Backend por contrato, não acesso direto.** As RPCs operacionais são exclusivas de `service_role`; `anon` e `authenticated` não leem tabelas diretamente.
6. **Segredo não é dado de aplicação.** O inventário guarda somente metadados e referências ao secret manager.
7. **Evidência operacional.** Consentimentos, eventos de solicitações e incidentes têm trilhas append-only; logs estruturados são redigidos antes de persistir.
8. **Produção falha fechada.** O gate permanece `ready=false` enquanto qualquer controle bloqueante estiver aberto.

## Camadas

| Camada | Implementação |
|---|---|
| Catálogo jurídico | bases legais, classificações, políticas versionadas e designação do encarregado |
| ROPA técnico | atividades, ativos, partes, operações, titulares, destinatários e limitações |
| Direitos dos titulares | intake, verificação, escopo, eventos, evidências e resolução |
| Retenção | políticas, execuções, ações, anonimização e legal hold |
| Segurança | incidentes, timeline, inventário de segredos, revisão de acesso e restore tests |
| Observabilidade segura | redaction recursiva e recomputação do hash de payload |
| Autorização | RLS em 156/156 tabelas e nenhuma tabela diretamente legível pelo cliente |
| Gate de produção | 24 controles, somente dois comprovados e 22 ainda bloqueantes |

## Limites atuais

- o scanner de arquivos continua sendo uma prova técnica e não proteção antimalware de produção;
- não foram definidos controlador jurídico, encarregado/dispensa, bases legais finais ou prazos de retenção;
- não foi avaliado o contrato, região, DPA ou transferência internacional de Supabase, AWS e HubSpot;
- não foi comprovado backup, PITR, restore, KMS, TLS ou audit trail no ambiente AWS;
- a integração HubSpot continua sem inventário real;
- nenhum sinal comportamental pode produzir efeito em crédito.

## Estado verificável

- 156 tabelas com RLS;
- 0 tabelas sem policy;
- 0 tabelas legíveis diretamente por `anon` ou `authenticated`;
- 0 FKs sem índice;
- 6 RPCs do E13 exclusivas de `service_role`;
- 8/8 provas transacionais aprovadas e revertidas;
- 0 registros residuais de consentimento, solicitações ou incidentes;
- produção: `ready=false`, 2 controles aprovados, 22 bloqueantes.
