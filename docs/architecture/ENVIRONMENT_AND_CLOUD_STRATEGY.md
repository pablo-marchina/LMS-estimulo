# Estratégia de ambientes

**Revisado em:** 2026-07-29  
**Status:** política de ambientes aprovada; arquitetura AWS pendente

## Ambientes

| Ambiente | Provider | Finalidade | Dados |
|---|---|---|---|
| `development` | `supabase` | desenvolvimento local | sintéticos |
| `test` | `supabase` | CI, integração e QA | sintéticos ou anonimizados aprovados |
| `preview` | `supabase` em Vercel | revisão controlada de interface e fluxos | somente teste |
| `staging` | `aws` | validação da futura arquitetura de produção | bloqueado até ADRs e implementação |
| `production` | `aws` | operação oficial | bloqueado até todos os gates |

Supabase e Vercel não são ambientes oficiais de produção e não podem receber dados ou tráfego oficial por mudança de nome, alias ou domínio.

## Política de provider

```text
APP_ENV=development|test|preview + PLATFORM_RUNTIME_PROVIDER=supabase  permitido
APP_ENV=staging|production        + PLATFORM_RUNTIME_PROVIDER=aws       obrigatório
APP_ENV=staging|production        + PLATFORM_RUNTIME_PROVIDER=supabase  rejeitado
```

A política é aplicada em toda consulta ao provider e pelos adapters Supabase. Um runtime AWS não pode usar Supabase como fallback.

## Promoção em duas etapas

### Release do software

```text
mudança revisada
→ instalação limpa
→ validações de fonte e contratos
→ replay do PostgreSQL desde zero
→ testes de aplicação, produto, integrações e banco
→ typecheck e build
→ imagem Lambda por digest
→ scans e manifesto
→ candidato de software aprovado
```

Esse resultado comprova que o código é um candidato reproduzível. Ele não autoriza produção.

### Release do ambiente de produção

```text
requisitos não funcionais aprovados
→ ADRs AWS aprovados
→ implementação da arquitetura
→ staging no mesmo SHA e digest
→ E2E transacional
→ isolamento e segurança
→ ramp, spike e soak
→ observabilidade e resposta a incidentes
→ backup, restore e rollback
→ aprovações de privacidade, conteúdo e acessibilidade
→ produção
```

## Paridade lógica

As decisões físicas da AWS ainda estão abertas, mas os seguintes contratos lógicos precisam permanecer invariáveis entre o provider de teste e o provider de produção:

- modelo de domínio;
- identidade interna, organizações e capacidades RBAC;
- migrations e contratos PostgreSQL portáveis;
- eventos, outbox, idempotência e reconciliação;
- regras de diagnóstico, jornada e credenciais;
- metadados, autorização e integridade de arquivos;
- contratos de integrações externas;
- auditabilidade e proteção de dados.

A escolha física de identidade, entrada pública, banco, conexão, armazenamento, filas, rede, segredos e observabilidade deve ser feita por ADR e não pode ser inferida do adapter Supabase.

## Estado do container

`Dockerfile.lambda` é o único artefato AWS aprovado. Ele define o empacotamento do monólito Next.js para Lambda, mas não define:

- front door, CDN, DNS, TLS ou WAF;
- identidade ou sessão;
- banco ou conexão;
- armazenamento ou uploads;
- processamento assíncrono;
- rede;
- segredos e chaves;
- observabilidade;
- pipeline de deploy, backup ou recuperação.

Enquanto essas decisões estiverem abertas, `/api/health/ready` deve responder `503` com `aws_architecture_pending`.

## Dados, segredos e isolamento

- desenvolvimento e preview usam dados sintéticos por padrão;
- cópias de dados reais exigem anonimização e aprovação;
- ambientes produtivos devem ser isolados conforme a arquitetura futura;
- segredos nunca entram em Git, argumentos de build, imagens ou logs;
- integrações externas usam sandbox antes da produção;
- migrations são executadas por identidade operacional separada da aplicação;
- toda decisão de armazenamento ou transferência deve considerar LGPD e retenção.

## Gate para staging AWS

Staging somente poderá existir após:

1. aprovação de [`AWS_ARCHITECTURE_STATUS.md`](AWS_ARCHITECTURE_STATUS.md) por meio dos ADRs correspondentes;
2. contrato legível por máquina atualizado;
3. adapters de produção implementados e fail-closed;
4. infraestrutura reproduzível e revisada;
5. modelo de ameaças e plano de operação;
6. capacidade, custo e SLOs definidos;
7. estratégia de observabilidade, backup, restore e rollback.
