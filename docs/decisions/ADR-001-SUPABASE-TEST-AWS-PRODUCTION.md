# ADR-001 — Supabase para testes e AWS para produção

**Status:** Aceita  
**Data:** 2026-07-08

## Contexto

O projeto precisa de velocidade para desenvolvimento e testes, mas a implantação final será operada na AWS. A fundação atual já utiliza conceitos do Supabase, enquanto o modelo alvo é PostgreSQL e deve permanecer portável.

## Decisão

- Supabase será usado em `local` e `test`.
- AWS será usada em `staging` e `production`.
- AWS staging será obrigatório antes de cada promoção produtiva.
- O núcleo usará PostgreSQL portátil e adapters de infraestrutura.
- O frontend não terá acesso direto irrestrito ao banco.
- A identidade interna será independente de Supabase Auth e Cognito.
- A aplicação será containerizada e executará o mesmo código em todos os ambientes.

## Consequências positivas

- desenvolvimento e testes mais rápidos;
- migrations e RLS verificáveis cedo;
- produção alinhada à infraestrutura institucional escolhida;
- menor lock-in;
- possibilidade de testar componentes por adapter;
- migração clara de dados e serviços.

## Consequências negativas

- dois provedores aumentam a matriz de testes;
- autenticação, storage e filas exigem adapters;
- staging AWS não pode ser eliminado;
- diferenças de PostgreSQL/extensões precisam de validação contínua;
- custo operacional maior que usar apenas um provedor.

## Alternativas rejeitadas

1. **Supabase também em produção:** diverge da decisão institucional de AWS.
2. **AWS em todos os ambientes:** reduz divergência, mas aumenta custo e fricção de desenvolvimento.
3. **Usar APIs proprietárias Supabase e migrar depois:** cria reescrita e risco inaceitáveis.

## Critérios de revisão

Revisar se:

- a matriz de portabilidade se tornar excessivamente cara;
- surgirem requisitos AWS incompatíveis com o Supabase de teste;
- a organização decidir consolidar todos os ambientes na AWS;
- testes demonstrarem divergências não controláveis.
