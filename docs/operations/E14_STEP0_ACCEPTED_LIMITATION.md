# E14 — Passo 0 — limitação aceita

**Data:** 2026-07-09  
**Decisão:** avançar sem criar Supabase Preview Branch para replay completo em banco vazio.

O histórico local e remoto possui 76 migrations sincronizadas, o projeto de teste mantém 156 tabelas e o Supabase Branching registrou `All migrations are up to date`.

A prova independente de reconstrução em uma Preview Branch não será executada por decisão do responsável pelo produto. Essa ausência permanece registrada como limitação de evidência e não autoriza staging ou produção sem as validações posteriores previstas.

Também permanece registrado que o repositório atual contém banco, domínio, adapters, Edge Functions e documentação, mas não contém uma aplicação web Next.js executável. Os passos de conteúdo e contratos podem avançar; a integração de interface dependerá da disponibilização ou implementação da aplicação.
