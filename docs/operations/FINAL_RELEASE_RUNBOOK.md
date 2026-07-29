# Runbook do release final

## Candidato único

O release só pode ser promovido a partir de um único commit da branch `release/2026-07-final`. O manifesto, as migrations, a função Edge, o deployment e os resultados dos testes devem registrar esse mesmo SHA.

## Ordem de promoção

1. executar `npm ci --ignore-scripts --no-audit --no-fund` com Node.js 22.23.1 e npm 10.9.8;
2. executar `npm run validate:release-candidate`;
3. executar testes de aplicação, produto, integrações e tooling;
4. reproduzir o PostgreSQL desde zero e executar todos os gates de banco;
5. aplicar somente as migrations ainda ausentes, preservando versões já registradas;
6. implantar `authenticated-rpc` com JWT obrigatório e verificar o hash remoto;
7. gerar o manifesto e o digest da imagem;
8. executar smoke, carga progressiva, spike e soak em homologação;
9. comprovar isolamento entre organizações e imutabilidade de versões publicadas;
10. exercitar restore e rollback antes da promoção.

## Gates de integridade

- Git, banco e replay limpo contêm o mesmo inventário de migrations.
- Toda RPC invocada pela aplicação está na allowlist da função autenticada.
- Nenhuma função temporária ou de smoke permanece ativa.
- O deployment contém o SHA aprovado e a imagem contém o digest do manifesto.
- A árvore de trabalho usada para gerar os artefatos está limpa.

## Gates de segurança

- secret scanning e audit de dependências aprovados;
- Trivy sem vulnerabilidade corrigível alta ou crítica;
- CSP, HSTS, `nosniff`, políticas de referência/permissões e proteção contra framing presentes;
- sessões inválidas removidas sem loop de refresh;
- payload, timeout, concorrência, fila e burst limitados;
- mensagens internas do PostgreSQL não são expostas;
- leaked-password protection habilitada no provedor de identidade;
- testes negativos entre organizações aprovados.

## Gates de performance e capacidade

SLOs iniciais de homologação:

- erro HTTP menor ou igual a 1%;
- p95 de rota dinâmica menor ou igual a 2 segundos;
- p99 menor ou igual a 5 segundos;
- nenhum crescimento sustentado do backlog crítico;
- readiness fecha quando uma dependência obrigatória falha;
- fila e backpressure rejeitam sobrecarga de forma controlada;
- soak test não apresenta crescimento contínuo de memória, conexões ou latência.

## Condições de NO-GO

Qualquer uma das condições abaixo interrompe a promoção:

- workflow ausente, cancelado antes dos steps ou não verde;
- migration aplicada sem arquivo idêntico no candidato;
- função Edge diferente da versão manifestada;
- backlog crítico sem worker, retry e reconciliação comprovados;
- erro de isolamento, autorização ou idempotência;
- restore ou rollback não exercitado;
- deployment diferente do SHA aprovado.

## Evidência mínima arquivada

- `release-manifest.json` e SHA-256;
- digest e scan da imagem;
- inventário e hash das migrations;
- resultados de replay e gates SQL;
- resultados de carga e soak;
- relatório dos testes de isolamento;
- IDs dos deployments e da versão da função Edge;
- registro de restore e rollback.
