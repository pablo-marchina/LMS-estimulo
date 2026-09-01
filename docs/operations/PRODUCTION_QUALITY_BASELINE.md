# Baseline de qualidade

Este documento define propriedades permanentes que um release da Plataforma Estímulo deve preservar.

## Reprodutibilidade

- instalação determinística por lockfile e toolchain versionada;
- source tree não é modificado pelo processo de instalação/build;
- PostgreSQL é reconstruível desde banco vazio;
- schema e contratos são comparados com baselines legíveis por máquina;
- mudança de baseline exige mudança executável intencional comprovada por replay.

## Correção funcional

- regras críticas são validadas no servidor ou banco, não apenas na UI;
- mutações são idempotentes quando podem sofrer retry;
- histórico necessário para reproduzir resultados não é reescrito;
- estados vazios, indisponibilidade e erro são distinguíveis;
- dados fictícios não aparecem como reais;
- integrações opcionais degradam sem corromper o estado central.

## Segurança e privacidade

- identidade e autorização antecedem acesso privilegiado;
- browser roles não executam facades server-only;
- administração exige identidade, membership e RBAC válidos;
- RLS/grants reforçam isolamento quando aplicável;
- PII é minimizada em eventos, ranking, logs e integrações;
- arquivos são privados e URLs assinadas não são persistidas como credencial;
- segredos não entram no cliente, Git ou artifacts.

## Experiência e acessibilidade

- fluxos centrais funcionam em viewports suportadas;
- conteúdo principal não depende de hover ou de alvo de clique ambíguo;
- foco, teclado, contraste e semântica são tratados como requisitos;
- carregamento, erro, bloqueio e retomada possuem feedback compreensível;
- preview administrativo não produz efeitos de participante.

## Observabilidade e confiabilidade

- liveness e readiness possuem significados distintos;
- logs e métricas evitam dados sensíveis desnecessários;
- filas e consumidores expõem backlog/falha suficientes para operação;
- backup, restore e rollback seguem os requisitos do ambiente;
- evidência visual e de deployment corresponde ao SHA avaliado.

## Produção

A qualidade do software não substitui a prontidão do ambiente. Produção exige os controles de [`../security/PRODUCTION_READINESS_GATE.md`](../security/PRODUCTION_READINESS_GATE.md).