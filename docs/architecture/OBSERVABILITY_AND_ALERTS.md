# Observabilidade e alertas operacionais

**Revisado em:** 2026-07-30  
**Estado:** requisitos lógicos definidos; plataforma operacional AWS pendente

## Objetivo

Permitir detectar, explicar e responder a falhas do produto, do runtime e das dependências sem registrar dados pessoais, tokens, segredos ou conteúdo proibido.

Este documento não escolhe serviço de logs, métricas, tracing, alertas ou incidentes. Essas decisões dependem da futura arquitetura AWS.

## Estado atual

- aplicação e gateway emitem logs estruturados e correlação no ambiente de teste;
- headers e `Server-Timing` permitem observar partes do request;
- GitHub Actions preserva artefatos de build, replay, scan e capacidade;
- não existe plataforma de observabilidade de produção aprovada;
- métricas históricas do scheduler, fila de scan ou worker removido não representam o runtime atual.

## Sinais mínimos do runtime

### HTTP e aplicação

- volume por rota e operação;
- taxa de erro por classe e código público;
- latência p50, p95 e p99;
- rejeições por limite, timeout ou backpressure;
- liveness e readiness;
- versão, SHA e digest em execução;
- autenticação, autorização e revogação sem registrar credenciais.

### Banco e domínio

- latência, erro e timeout de comandos e consultas;
- conexões e saturação;
- conflitos de versão e idempotência;
- violações de constraint, RLS ou RBAC;
- eventos e outbox pendentes;
- falhas de reconciliação;
- crescimento anormal de tabelas ou índices críticos.

### Arquivos

- uploads iniciados, confirmados, abortados e órfãos;
- falhas de validação e autorização;
- emissão e uso de acessos temporários;
- divergência entre objeto físico e registro lógico;
- retenção e exclusão pendentes.

### Processamento assíncrono futuro

Quando houver provider aprovado:

- backlog e idade do trabalho mais antigo;
- trabalhos em voo, retries e dead letters;
- taxa de sucesso e duração por consumidor;
- deduplicação e redrive;
- saturação e backpressure;
- reconciliação e perda potencial.

## Logs e tracing

Todo registro deve:

- possuir timestamp, ambiente, serviço, versão e request/correlation ID;
- usar códigos de erro estáveis;
- evitar CPF, tokens, cookies, URLs assinadas e payload arbitrário;
- aplicar redaction antes da saída;
- permitir correlação entre request, transação, evento, outbox e integração;
- respeitar classificação, retenção e acesso.

## Alertas

Alertas devem representar sintomas acionáveis, não qualquer evento isolado. Categorias mínimas:

- indisponibilidade ou readiness fechada;
- aumento sustentado de erro ou latência;
- saturação de recurso ou dependência;
- backlog ou idade acima do limite;
- falha de integração ou reconciliação;
- violação de segurança ou isolamento;
- backup, restore ou rotação fora da política;
- divergência entre SHA/digest aprovado e implantado.

Thresholds finais serão definidos com SLOs, capacidade e operação. Valores de teste ficam nos artefatos da release, não neste documento.

## Operação

Antes do Gate B, devem existir:

1. dashboards por SLO e jornada crítica;
2. alertas com proprietário, severidade e janela;
3. on-call e escalonamento;
4. runbooks de diagnóstico, degradação e reconciliação;
5. retenção e acesso aprovados;
6. testes de alerta e resposta;
7. correlação com deploy e mudança;
8. revisão periódica de ruído e cobertura.

## Critério de aceite

A observabilidade de produção somente pode ser marcada como pronta quando falhas representativas forem injetadas no staging AWS e detectadas dentro dos tempos aprovados, com informação suficiente para triagem e sem vazamento de dados sensíveis.
