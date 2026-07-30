# Backup, restauração e recuperação de desastre

**Revisado em:** 2026-07-30  
**Estado:** requisitos definidos; estratégia e exercícios de produção pendentes

## Objetivo

Recuperar dados, objetos, configuração e operação dentro de objetivos aprovados, preservando integridade, segurança e auditabilidade.

Este documento não escolhe tecnologia de banco, armazenamento, backup, IaC, DNS ou observabilidade. Essas decisões dependem da futura arquitetura AWS.

## Princípios

- RPO e RTO são aprovados por jornada e criticidade;
- backup não é considerado válido sem restore exercitado;
- cópias críticas são protegidas contra exclusão pelo mesmo principal comprometido;
- restore ocorre primeiro em destino isolado;
- integridade é verificada por contratos, constraints, hashes e testes de aplicação;
- recuperação preserva segregação de ambientes e acesso mínimo;
- dados pessoais e segredos mantêm as mesmas regras de proteção durante o processo;
- toda execução registra responsável, horário, origem, destino, resultado e ações corretivas.

## Escopos

### Banco

- backup periódico e recuperação pontual conforme RPO;
- retenção suficiente para erro lógico e incidente tardio;
- restauração isolada;
- replay e compatibilidade de migrations;
- constraints, RLS, grants e contratos públicos;
- reconciliação de eventos, outbox e projeções;
- verificação de volume e amostras controladas sem expor dados.

### Arquivos

- versão, retenção e proteção contra exclusão em massa;
- inventário entre registro lógico e objeto físico;
- restauração de metadados e bytes;
- verificação de checksum e vínculo de domínio;
- tratamento de objetos órfãos ou ausentes;
- legal hold e exclusão conforme política.

### Configuração e operação

- configuração versionada e reproduzível;
- recuperação de segredos e chaves pelo mecanismo aprovado;
- identidade, rede, processamento assíncrono e observabilidade;
- dependências externas e ordem de restauração;
- runbooks, contatos e prioridades de serviço;
- reconstrução do ambiente a partir da fonte aprovada.

## Ambiente Supabase de teste

O ambiente de teste não é o plano de continuidade da produção. Backup de banco e objetos pode ter escopos diferentes; dados relevantes de teste devem ser descartáveis ou possuir procedimento próprio, sem ser apresentados como prova AWS.

## Exercício do Gate B

O staging AWS aprovado deve executar:

1. perda lógica de dados e recuperação pontual;
2. restauração do banco em destino isolado;
3. restauração ou reconciliação de arquivos;
4. reconstrução da configuração e dos segredos;
5. smoke e E2E transacional;
6. verificação de autorização e isolamento;
7. medição real de RPO e RTO;
8. failover ou substituição de componente, quando aplicável;
9. rollback de aplicação e estratégia de migrations;
10. relatório, ações corretivas e reteste.

## Evidência mínima

- política aprovada;
- inventário dos ativos cobertos;
- versão e SHA/digest da aplicação;
- início, fim e duração de cada etapa;
- dados perdidos ou recuperados;
- verificações de integridade e segurança;
- desvios de RPO/RTO;
- decisões e responsáveis;
- ações corretivas com novo exercício.

Produção permanece bloqueada enquanto restore, rollback e recuperação não forem comprovados no ambiente definitivo.
