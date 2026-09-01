# Matriz de acessos

**Revisado em:** 2026-09-01

| ID | Recurso | Ambiente | Estado/regra |
|---|---|---|---|
| ACC-001 | GitHub | código/CI | mudanças por PR; `main` protegida pelo fluxo de gates |
| ACC-002 | Supabase PostgreSQL/Auth/Storage | dev/test/preview | projeto autorizado; schema vem de migrations, não edição manual |
| ACC-003 | Google OAuth | administração Supabase | provider Google inicia a sessão; callback valida usuário e vínculo interno |
| ACC-004 | Vercel | preview/validação | deploy do SHA revisado; não é produção institucional |
| ACC-005 | Provedor de IA | teste controlado | segredo server-only; ausência deve permitir fallback humano aplicável |
| ACC-006 | AWS | staging/produção futura | pendente de arquitetura/ADR; provider fail-closed |
| ACC-007 | Consumidor ETL | futuro | desabilitado por padrão e desacoplado por outbox |
| ACC-008 | E-mail Supabase | dev/test/preview | template versionado; configuração hospedada precisa ser sincronizada/verificada no projeto correto |

## Acesso administrativo

A entrada administrativa requer simultaneamente:

1. sessão de usuário válida e e-mail confirmado;
2. identidade Google reconhecida no registro autenticado;
3. identidade interna vinculada;
4. membership ativa na organização Estímulo;
5. capability RBAC para a operação específica.

`@estimulo.org` não é, sozinho, critério suficiente nem substituto de membership/RBAC. Ele continua sendo usado para distinguir conta corporativa em fluxos como recuperação/gestão de usuário.

## Segredos

Tokens, service roles, chaves de IA, cookies e secrets OAuth não entram em Git, docs, issue ou PR. Valores de ambientes diferentes devem ser segregados e rotacionáveis.