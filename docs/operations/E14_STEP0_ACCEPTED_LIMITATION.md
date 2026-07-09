# E14 — Passo 0 — limitações aceitas

**Data:** 2026-07-09  
**Status estrito:** PARTIAL  
**Decisão:** continuar a vertical por exceção aceita, sem Supabase Preview Branch e antes da reconciliação completa da aplicação.

O histórico local e remoto possui 76 migrations sincronizadas, o projeto de teste mantém 156 tabelas e o Supabase Branching registrou `All migrations are up to date`.

A prova independente de reconstrução em uma Preview Branch não será executada por decisão do responsável pelo produto. Essa ausência permanece registrada como limitação de evidência e não autoriza staging ou produção sem as validações posteriores previstas.

O repositório privado operacional contém banco, domínio, adapters, Edge Functions, testes e documentação, mas sua árvore atual não contém a aplicação Next.js.

A auditoria de `Estimulo_all.md` confirmou, porém, que existem duas fontes de frontend fora dessa árvore:

- `denilsontorres2024/plataforma-estimulo`: fundação inicial Next.js/SaaS/LMS;
- `estimulo-hub.lovable.app`: protótipo do Dash Empreendedor.

Essas fontes não são a verdade operacional e não podem usar seu schema ou dados hardcoded contra o Supabase atual. Elas devem ser auditadas e reconciliadas com o domínio privado no Passo 3.

Assim, o Passo 0 não atende ao critério estrito de aplicação e infraestrutura sincronizadas em um único baseline reproduzível. Os Passos 1 e 2 avançaram por exceção explícita e continuam válidos como conteúdo técnico e contratos, mas não constituem prova de uma aplicação integrada.
