# Runbook de releases

Este runbook define o processo permanente para validar e promover uma versão da Plataforma Estímulo.

## 1. Definir o candidato

- selecionar um SHA imutável;
- confirmar branch/base e conjunto de mudanças esperado;
- garantir que código, migrations, configuração, testes e documentação estejam sincronizados;
- não reutilizar evidência produzida por outro SHA.

## 2. Validar o software

Os workflows e comandos obrigatórios devem validar, conforme a mudança:

- governança do repositório;
- dependências e lockfile;
- reprodutibilidade;
- replay e equivalência do banco;
- contratos públicos e segurança de grants;
- testes de aplicação, produto e integração;
- lint, typecheck e build;
- secret scanning e auditoria de dependências.

Falha de um gate é tratada na causa; baseline ou workflow não é relaxado apenas para produzir verde.

## 3. Validar o ambiente

No ambiente de destino:

- aplicar migrations pela trilha suportada;
- configurar identity providers, secrets, storage e funções;
- validar health/readiness;
- executar smoke e E2E com dados de teste adequados;
- comprovar isolamento, autorização e comportamento de erro;
- validar integrações externas somente quando estiverem habilitadas naquele ambiente.

Supabase/Vercel seguem [`../deployments/SUPABASE_VERCEL_OPERATIONS.md`](../deployments/SUPABASE_VERCEL_OPERATIONS.md).

## 4. Validar experiência

Quando houver superfície visual alterada:

- capturar o deployment do SHA exato;
- validar viewports suportadas;
- verificar acessibilidade, overflow, estados de erro e conteúdo principal;
- não usar deployment de outro SHA como evidência.

Consulte [`../VISUAL_CAPTURE.md`](../VISUAL_CAPTURE.md).

## 5. Prontidão de produção

Produção só é elegível quando os requisitos de [`../security/PRODUCTION_READINESS_GATE.md`](../security/PRODUCTION_READINESS_GATE.md) estiverem satisfeitos no ambiente definitivo. Build verde ou preview funcional não substituem esse gate.

## 6. Promoção

- registrar versão/digest/SHA promovidos;
- preservar configuração por ambiente;
- aplicar mudanças de banco na ordem aprovada;
- observar health, erros, latência, filas e métricas de negócio essenciais;
- manter operador e rollback disponíveis durante a janela de promoção.

## 7. Rollback e recuperação

Se um critério de segurança, integridade ou disponibilidade falhar:

- interromper expansão de tráfego;
- reverter aplicação quando seguro;
- não reverter migration destrutivamente sem plano compatível;
- reconciliar efeitos assíncronos e estado de banco;
- registrar incidente no sistema operacional apropriado.

## Evidência

Resultados de um release pertencem ao workflow, deployment, release ou sistema de operação associado ao SHA. O runbook não acumula resultados históricos.