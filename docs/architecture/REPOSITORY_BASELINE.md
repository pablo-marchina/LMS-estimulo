# Baseline público do repositório

**Status:** Preliminar; não substitui auditoria local.

## Evidências disponíveis

O README público declara:

- Next.js App Router;
- React e TypeScript;
- Tailwind CSS;
- Framer Motion;
- Supabase SSR/Auth/Postgres/RLS;
- TanStack Query;
- React Hook Form e Zod;
- rotas de marketing, autenticação, aluno e administração;
- módulos de jornada, gamificação e autenticação;
- schema SQL, RLS, grants e seed inicial;
- preparação para múltiplos cursos, parceiros, professores, trilhas, aulas, avaliações, pontos, selos e certificados.

O repositório público possui um único commit na baseline observada. Isso aumenta a importância de não presumir maturidade, cobertura de testes ou histórico de decisões.

## O que ainda não foi validado

- execução local;
- build e typecheck;
- vulnerabilidades;
- cobertura de testes;
- autenticação real versus mock;
- RLS e autorização por recurso;
- consistência do schema;
- suporte real a múltiplas jornadas;
- eventos comportamentais;
- versionamento editorial;
- integração HubSpot;
- observabilidade;
- acessibilidade;
- dados hardcoded;
- dívida técnica.

## Próximo passo obrigatório

Receber ZIP da branch principal e executar auditoria reproduzível em ambiente limpo.
