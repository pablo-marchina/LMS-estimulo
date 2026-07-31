# Matriz de acessos

**Revisado em:** 2026-07-31

A matriz registra somente acessos necessários ao software atual ou dependências explicitamente aprovadas. Serviços AWS específicos permanecem fora do escopo até ADR de arquitetura.

| ID | Recurso | Ambiente | Nível necessário | Estado | Regra segura |
|---|---|---|---|---|---|
| ACC-001 | Repositório GitHub | Código/CI | leitura e escrita via PR | disponível | `main` somente por merge após gates verdes |
| ACC-002 | Supabase | desenvolvimento/teste/preview | administração restrita de projeto | disponível no projeto conectado | migrations vêm do repositório; não editar schema manualmente |
| ACC-003 | Supabase Auth | desenvolvimento/teste/preview | configuração de providers e URLs | disponível | service role somente no servidor/gateway |
| ACC-004 | Supabase Storage | desenvolvimento/teste/preview | buckets privados e políticas | disponível | arquivos por objetos opacos; URL assinada temporária |
| ACC-005 | Google OAuth corporativo | administração em teste/preview | client OAuth autorizado | configurado no ambiente | domínio e RBAC são validados no callback |
| ACC-006 | Provedor de IA | desenvolvimento/teste controlado | segredo restrito e orçamento limitado | opcional | sem segredo válido, entregas seguem para revisão humana |
| ACC-007 | Vercel | preview | deploy e leitura de logs | disponível com limites da conta | não é produção oficial |
| ACC-008 | AWS | staging/produção futura | contas e IAM segregados | pendente | somente AWS como destino e `Dockerfile.lambda` estão aprovados; serviços dependem de ADR |
| ACC-009 | DNS/domínio | staging/produção futura | gerenciamento limitado | futuro | configurar somente após arquitetura e ownership aprovados |
| ACC-010 | Consumidor ETL | ambiente futuro | identidade de workload e destino aprovado | não implementado | exportação permanece desabilitada por padrão |
| ACC-011 | Observabilidade | staging/produção futura | ingestão e leitura operacional | não definido | contrato lógico existe; provider depende de ADR |
| ACC-012 | E-mail/notificações | ambiente futuro | envio restrito | não definido | não inserir credenciais no frontend ou repositório |

## Segredos

- nunca enviar tokens, service roles, chaves de IA ou credenciais no chat, issue ou PR;
- nenhuma chave secreta pode usar prefixo `NEXT_PUBLIC_*`;
- ambientes devem ter credenciais distintas;
- rotação e revogação precisam de registro operacional;
- CI usa apenas segredos mínimos e escopados.

## Acesso administrativo

O acesso à interface administrativa exige simultaneamente:

1. sessão Google válida;
2. domínio corporativo aceito;
3. conta interna ativa;
4. membership organizacional ativa;
5. papel com a permissão necessária.

Concessões B2B não concedem acesso administrativo e links UTM não alteram permissões.
