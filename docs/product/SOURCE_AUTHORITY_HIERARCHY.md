# Hierarquia de autoridade documental

**Revisado em:** 2026-07-29  
**Status:** canônico

Este documento define como resolver divergências entre requisitos, decisões, documentação, código e evidências.

## Ordem de autoridade

1. [`premissas-desenvolvimento.md`](../../premissas-desenvolvimento.md) e materiais institucionais aprovados fora do Git;
2. decisões posteriores explicitamente aprovadas em [`DECISION_LOG.md`](../decisions/DECISION_LOG.md);
3. especificações de produto e jornada indexadas em [`PROJECT_INDEX.md`](../../PROJECT_INDEX.md);
4. issues aprovadas com critérios de aceite claros;
5. arquitetura, contratos, documentação de implementação, código, migrations e testes;
6. fixtures, exemplos e provas sintéticas.

Uma camada inferior não pode reduzir silenciosamente uma exigência superior.

## Tipos de documento

- **Requisito:** define o que precisa ser entregue.
- **Decisão:** resolve uma escolha e registra consequências.
- **Especificação:** organiza requisitos aprovados sem inventar lacunas.
- **Estado do repositório:** descreve apenas o que existe no código versionado.
- **Bloqueador:** registra o que ainda impede staging, produção ou usuários reais.
- **Contrato versionado:** fixa uma interface técnica verificável.
- **Runbook:** descreve uma operação já implementada e autorizada.

Planos de agentes, relatórios de execução, IDs de recursos temporários e histórico de brainstorming não são documentação canônica.

## Evidência

As expressões abaixo não são equivalentes:

```text
implementado no repositório
validado por teste local ou histórico
validado pelo CI atual
validado em ambiente implantado
aprovado para produção
```

Uma afirmação deve usar somente o nível comprovado. Mock, fixture, configuração sintética, migration declarada ou Terraform não aplicado não comprovam produção.

## Atualização

Toda mudança funcional deve atualizar, quando aplicável:

- requisito ou decisão afetada;
- contrato e migration;
- documentação de implementação;
- bloqueadores;
- testes;
- índice do projeto.

Migrations aplicadas e contratos versionados não são reescritos para “parecer atuais”; uma correção cria nova versão ou novo artefato.
